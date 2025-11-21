# Ornek 7: One Time Witness (OTW)

Bu ornek, module adiyla ayni isimdeki alan/ability kurallarina uyan OTW ile benzersiz kurulum yapmayi, `sui::types::is_one_time_witness` ile dogrulamayi ve `coin_registry::new_currency_with_otw` uzerinden coin cikarmayi gosterir.

## Kod

```move
module examples::one_time_witness;

use sui::coin::{Self, Coin, TreasuryCap};
use sui::coin_registry;
use sui::types;
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// OTW: drop ability, alan yok, module ismiyle ayni ve BUYUK
public struct MY_COIN has drop {}

/// Tek seferlik mint yetkisini saklar
public struct CoinStore has key {
    id: UID,
    treasury: TreasuryCap<MY_COIN>,
}

const ENotOTW: u64 = 0;

/// Publish sirasinda sadece bir kez cagrilir
public entry fun init(otw: MY_COIN, ctx: &mut TxContext) {
    // 1) OTW kurallarini zincir tarafinda teyit et
    assert!(types::is_one_time_witness(&otw), ENotOTW);

    // 2) OTW ile benzersiz coin tanimi olustur
    let (builder, mut treasury) = coin_registry::new_currency_with_otw(
        otw,
        9,                               // decimals
        b"MYC".to_string(),              // symbol
        b"My Coin".to_string(),          // name
        b"Sample OTW coin".to_string(),  // description
        b"https://example.com/icon.png".to_string(),
        ctx,
    );

    // 3) Metadatayi finalize et (OTW yolu: registry adresine transfer edilir)
    let metadata_cap = coin_registry::finalize(builder, ctx);

    // 4) Ilk arz
    let initial = coin::mint(&mut treasury, 1_000_000_000, ctx);

    // 5) Objeleri paylas / dagit
    let store = CoinStore { id: object::new(ctx), treasury };

    transfer::public_transfer(metadata_cap, ctx.sender());
    transfer::transfer(initial, ctx.sender());
    transfer::share_object(store);
}

/// Ek mint islemleri (treasury shared store icinde tutuluyor)
public entry fun mint_more(store: &mut CoinStore, amount: u64, ctx: &mut TxContext): Coin<MY_COIN> {
    coin::mint(&mut store.treasury, amount, ctx)
}
```

## Aciklama

### 1. OTW kurallari
- `public struct MY_COIN has drop {}`: alan yok, sadece `drop`, generic degil, isim module ile ayni/buyuk
- OTW instance init fonksiyonunun *ilk* parametresi olarak gelir; init yalnizca publish sirasinda bir kez kosar
- `types::is_one_time_witness(&otw)` zincir tarafinda dogrulama yaparak sahte struct kullanimini engeller

### 2. Neden OTW?
- Aynı tipten yalnizca tek witness uretilir; ikinci kez instantiate edilemez
- TreasuryCap, MetadataCap, Publisher gibi kritik yetkilerin cogaltilmasini onler
- Sui framework (coin_registry, package, publisher) OTW icin native guard kullanir

### 3. Akis
1) Module publish edilirken `init(otw, ctx)` OTW’yi alir
2) `new_currency_with_otw` OTW’yi parametre olarak ister ve diger witness’lari reddeder
3) `finalize` metadata objesini olusturur, Currency<T>’yi registry adresine tasir (OTW path)
4) TreasuryCap store icinde saklanir; mint fonksiyonlari bu store referansina baglanir

### 4. is_one_time_witness kullanimi
- Her OTW bekleyen API’de `assert!(types::is_one_time_witness(&w), ENotOTW);` seklinde guard eklenir
- Bu check, koddaki naming/ability kurallariyla birlikte tekil olusturmayi garanti eder

## TypeScript ornegi

```typescript
import { Transaction } from '@mysten/sui.js/transactions';

// Ilk mint islinden sonra fazladan arz
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::one_time_witness::mint_more`,
  arguments: [
    tx.object(COIN_STORE_ID),
    tx.pure.u64(500_000_000),
  ],
});
```

## Best Practices

1. OTW struct adini module ismiyle ayni ve buyuk harf ver (MY_COIN, COUNTER, WEATHER)
2. Yalnizca `drop` ability birak; alansiz/generic olmayan tanim kullandir
3. `is_one_time_witness` guard’ini koy; aksi halde sahte witness’lar compile edilebilir
4. OTW ile uretilen capability (TreasuryCap/Publisher) gibi nesneleri seedingten sonra paylas veya kilitle
5. Upgrade’lerde OTW init fonksiyonunu degistirmemeye dikkat et; init sadece ilk publish’te calisir
