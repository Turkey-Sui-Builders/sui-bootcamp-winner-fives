# Örnek 6: Versionlama ve Paket Upgrade'leri

Bu örnek, upgrade edilebilir Move paketleri için `UpgradeCap` ile versiyon takibi, policy kısıtlaması ve modül içi guard'ları gÇôsterir.

## Kod

```move
module examples::versioning;

use sui::package::{Self, UpgradeCap};
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// Yanlış UpgradeCap kullanımı
const EWrongCap: u64 = 0;
/// Versiyon gÇüncellenmedi
const EOldVersion: u64 = 1;
/// Yetersiz bakiye
const EInsufficientBalance: u64 = 2;

/// Paylaşılan versiyon kaydı
public struct VersionRegistry has key {
    id: UID,
    package: ID,
    cap_id: ID,
    version: u64,
}

/// Uygulama durumu (örnek bir kasa)
public struct Vault has key {
    id: UID,
    funds: Balance<SUI>,
}

/// On-chain upgrade event'i
public struct UpgradeRecorded has copy, drop {
    new_package: ID,
    new_version: u64,
}

/// İlk publish sonrası çağrılır
public entry fun init(cap: UpgradeCap, ctx: &mut TxContext) {
    let cap_id = object::id(&cap);

    let registry = VersionRegistry {
        id: object::new(ctx),
        package: package::upgrade_package(&cap),
        cap_id,
        version: package::version(&cap),
    };

    let vault = Vault {
        id: object::new(ctx),
        funds: balance::zero<SUI>(),
    };

    transfer::share_object(registry);
    transfer::share_object(vault);

    // UpgradeCap'i admin'e geri ver (gelecek upgrade'ler için gerekiyor)
    transfer::transfer(cap, ctx.sender());
}

/// Kod değişikliklerini sadece additive upgrade'lerle sınırla
public entry fun restrict_to_additive(cap: &mut UpgradeCap) {
    package::only_additive_upgrades(cap);
}

/// Upgrade sonrası güncel paketi ve versiyonu işaretle
public entry fun record_upgrade(registry: &mut VersionRegistry, cap: &UpgradeCap) {
    assert!(registry.cap_id == object::id(cap), EWrongCap);

    let new_package = package::upgrade_package(cap);
    let new_version = package::version(cap);

    assert!(new_version > registry.version, EOldVersion);

    registry.package = new_package;
    registry.version = new_version;

    event::emit(UpgradeRecorded {
        new_package,
        new_version,
    });
}

/// Çağrıların minimum versiyonla kısıtlanması
public fun assert_supported(registry: &VersionRegistry, min_version: u64) {
    assert!(registry.version >= min_version, EOldVersion);
}

/// Sadece desteklenen versiyonlarda kasa'ya para yatır
public entry fun deposit(
    registry: &VersionRegistry,
    vault: &mut Vault,
    coin: Coin<SUI>,
    min_version: u64,
) {
    assert_supported(registry, min_version);
    balance::join(&mut vault.funds, coin::into_balance(coin));
}

/// Versiyon kontrolü ile para Çõek
public entry fun withdraw(
    registry: &VersionRegistry,
    vault: &mut Vault,
    amount: u64,
    min_version: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    assert_supported(registry, min_version);
    assert!(balance::value(&vault.funds) >= amount, EInsufficientBalance);

    let portion = balance::split(&mut vault.funds, amount);
    coin::from_balance(portion, ctx)
}
```

## Açıklama

### 1. UpgradeCap ve policy
- `UpgradeCap` publish ile gelir; bu cap olmadan upgrade yapılamaz
- `package::only_additive_upgrades` / `only_dep_upgrades` / `make_immutable` ile policy kısıtlanabilir
- `package::version(cap)` her başarılı upgrade'de +1 artar; `package::upgrade_package(cap)` güncel package ID'yi verir

### 2. Versiyon kaydı (VersionRegistry)
- `package` ve `version` bilgisini shared object'te tutar; front/back bu objeden okur
- `cap_id` alanı, yanlış cap ile güncelleme yapılmasını engeller
- `UpgradeRecorded` event'i indexer'lar için upgrade geçmişini loglar

### 3. Upgrade akışı
1) Cap policy'sini kısıtla (opsiyonel): `sui client call --package <PKG> --module package --function only_additive_upgrades --args <UPGRADE_CAP>`
2) Yeni bytecode'u upgrade et: `sui client upgrade --upgrade-cap <UPGRADE_CAP> --gas-budget 200000000`
3) Upgrade tamamlandıktan sonra `record_upgrade` çağır; shared state ve event güncellenir

### 4. Versiyon guard'ları
- `assert_supported` ile API'yi minimum versiyona kilitleyebilirsin (örn. breaking change sonrası `min_version = 2`)
- İş mantığı versiyon numarasına göre davranış değiştirebilir (örn. `if registry.version >= 3 { ... }`)

## TypeScript entegrasyonu

```typescript
import { Transaction } from '@mysten/sui.js/transactions';

// Upgrade sonrası kaydı güncelle
const recordTx = new Transaction();
recordTx.moveCall({
  target: `${PACKAGE_ID}::versioning::record_upgrade`,
  arguments: [
    recordTx.object(VERSION_REGISTRY_ID),
    recordTx.object(UPGRADE_CAP_ID),
  ],
});

// Versiyon guard'lı bir kullanım (deposit)
const appTx = new Transaction();
appTx.moveCall({
  target: `${PACKAGE_ID}::versioning::deposit`,
  arguments: [
    appTx.object(VERSION_REGISTRY_ID),
    appTx.object(VAULT_ID),
    appTx.object(SUI_COIN_ID),
    appTx.pure.u64(2), // min_version
  ],
});
```

## Best Practices

1. UpgradeCap'i multisig ya da safe içinde sakla, tek anahtar kaybına bırakma
2. Policy'yi mümkün olan en kısıtlı seviyede tut (additive ya da dep-only)
3. Upgrade sonrası mutlaka `record_upgrade` çağır; UI/SDK'lar doğru pakete bağlansın
4. Breaking change'ler için minimum versiyon guard'ı koy; eski client'ları fail-fast yap
5. `UpgradeRecorded` event'lerini indexleyerek versiyon geçişlerini izlenebilir kıl
