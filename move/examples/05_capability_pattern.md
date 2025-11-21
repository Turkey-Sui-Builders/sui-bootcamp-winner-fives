# Örnek 5: Capability Pattern (Yetkilendirme)

Bu örnek, DeFi protokollerinde admin yetkilerini ve kullanıcı kontrollerini yönetmek için capability pattern'in nasıl kullanılacağını gösterir.

## Kod

```move
module examples::managed_pool;

use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};

/// Hata: Yetkisiz erişim
const EUnauthorized: u64 = 0;
/// Hata: Pool dondurulmuş
const EPoolFrozen: u64 = 1;

/// Admin yetkisi - sadece bir tane var
public struct AdminCap has key, store {
    id: UID
}

/// Pool yönetim yetkisi - birden fazla olabilir
public struct PoolManagerCap has key, store {
    id: UID,
    pool_id: ID
}

/// Yönetilebilir pool
public struct ManagedPool<phantom TokenA, phantom TokenB> has key {
    id: UID,
    token_a: Balance<TokenA>,
    token_b: Balance<TokenB>,
    fee_percentage: u64,  // Basis points (1% = 100)
    is_frozen: bool
}

/// Fee toplama için treasury
public struct FeeTreasury<phantom TokenA, phantom TokenB> has key {
    id: UID,
    collected_a: Balance<TokenA>,
    collected_b: Balance<TokenB>
}

/// Modül initialization
fun init(ctx: &mut TxContext) {
    // AdminCap oluştur ve publisher'a gönder
    let admin_cap = AdminCap {
        id: object::new(ctx)
    };
    transfer::transfer(admin_cap, ctx.sender());
}

/// Pool oluştur (sadece admin)
public fun create_pool<TokenA, TokenB>(
    _: &AdminCap,  // Admin yetkisi kontrolü
    token_a: Coin<TokenA>,
    token_b: Coin<TokenB>,
    fee_percentage: u64,
    ctx: &mut TxContext
): PoolManagerCap {
    let pool = ManagedPool {
        id: object::new(ctx),
        token_a: coin::into_balance(token_a),
        token_b: coin::into_balance(token_b),
        fee_percentage,
        is_frozen: false
    };

    let pool_id = object::id(&pool);

    // Fee treasury oluştur
    let treasury = FeeTreasury<TokenA, TokenB> {
        id: object::new(ctx),
        collected_a: balance::zero(),
        collected_b: balance::zero()
    };

    // Manager capability oluştur
    let manager_cap = PoolManagerCap {
        id: object::new(ctx),
        pool_id
    };

    transfer::share_object(pool);
    transfer::share_object(treasury);

    manager_cap
}

/// Fee'yi güncelle (sadece manager)
public fun update_fee<TokenA, TokenB>(
    _: &PoolManagerCap,  // Manager yetkisi kontrolü
    pool: &mut ManagedPool<TokenA, TokenB>,
    new_fee_percentage: u64
) {
    pool.fee_percentage = new_fee_percentage;
}

/// Pool'u dondur (sadece admin)
public fun freeze_pool<TokenA, TokenB>(
    _: &AdminCap,  // Admin yetkisi kontrolü
    pool: &mut ManagedPool<TokenA, TokenB>
) {
    pool.is_frozen = true;
}

/// Pool'u aktifleştir (sadece admin)
public fun unfreeze_pool<TokenA, TokenB>(
    _: &AdminCap,
    pool: &mut ManagedPool<TokenA, TokenB>
) {
    pool.is_frozen = false;
}

/// Swap yap (herkese açık ama kontroller var)
public fun swap_with_fee<TokenA, TokenB>(
    pool: &mut ManagedPool<TokenA, TokenB>,
    treasury: &mut FeeTreasury<TokenA, TokenB>,
    input: Coin<TokenA>,
    ctx: &mut TxContext
): Coin<TokenB> {
    // Pool kontrolleri
    assert!(!pool.is_frozen, EPoolFrozen);

    let input_amount = coin::value(&input);

    // Fee hesapla (basis points)
    let fee_amount = (input_amount * pool.fee_percentage) / 10000;
    let swap_amount = input_amount - fee_amount;

    // Output hesapla
    let token_a_amount = balance::value(&pool.token_a);
    let token_b_amount = balance::value(&pool.token_b);

    let output_amount = (swap_amount * token_b_amount) /
                       (token_a_amount + swap_amount);

    // Input'u parçala: fee + swap
    let input_balance = coin::into_balance(input);
    let fee_balance = balance::split(&mut input_balance, fee_amount);

    // Fee'yi treasury'ye ekle
    balance::join(&mut treasury.collected_a, fee_balance);

    // Swap'i gerçekleştir
    balance::join(&mut pool.token_a, input_balance);
    let output_balance = balance::split(&mut pool.token_b, output_amount);

    coin::from_balance(output_balance, ctx)
}

/// Fee'leri çek (sadece manager)
public fun withdraw_fees<TokenA, TokenB>(
    _: &PoolManagerCap,
    treasury: &mut FeeTreasury<TokenA, TokenB>,
    ctx: &mut TxContext
): (Coin<TokenA>, Coin<TokenB>) {
    let amount_a = balance::value(&treasury.collected_a);
    let amount_b = balance::value(&treasury.collected_b);

    let balance_a = balance::split(&mut treasury.collected_a, amount_a);
    let balance_b = balance::split(&mut treasury.collected_b, amount_b);

    (
        coin::from_balance(balance_a, ctx),
        coin::from_balance(balance_b, ctx)
    )
}

/// Manager capability'yi transfer et
public fun transfer_manager_cap(
    cap: PoolManagerCap,
    recipient: address
) {
    transfer::transfer(cap, recipient);
}
```

## Açıklama

### 1. Capability Struct'ları

**AdminCap:**
```move
public struct AdminCap has key, store { id: UID }
```
- En üst seviye yetki
- Pool oluşturma, dondurma
- Genelde tek bir tane

**PoolManagerCap:**
```move
public struct PoolManagerCap has key, store {
    id: UID,
    pool_id: ID
}
```
- Pool özelinde yetki
- Fee güncelleme, fee çekme
- Her pool için ayrı

### 2. Yetki Kontrolü

```move
public fun update_fee(_: &PoolManagerCap, ...)
```
- Fonksiyon parametresinde capability iste
- Sadece capability sahibi çağırabilir
- Underscore (`_`) = değer kullanılmaz, sadece tip kontrolü

### 3. Init Pattern

```move
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, ctx.sender());
}
```
- Module publish edildiğinde admin capability oluştur
- Publisher'a otomatik gönder

### 4. Hiyerarşik Yetkiler

```
AdminCap (En üst)
    ↓
PoolManagerCap (Pool seviyesi)
    ↓
Public functions (Herkes)
```

## Kullanım Örneği

```typescript
// 1. Admin pool oluşturur
const createTx = new Transaction();
createTx.moveCall({
    target: `${PACKAGE}::managed_pool::create_pool`,
    arguments: [
        createTx.object(ADMIN_CAP_ID),
        createTx.object(TOKEN_A_ID),
        createTx.object(TOKEN_B_ID),
        createTx.pure.u64(30)  // 0.3% fee
    ],
    typeArguments: [TOKEN_A_TYPE, TOKEN_B_TYPE]
});

// 2. Manager fee'yi günceller
const updateTx = new Transaction();
updateTx.moveCall({
    target: `${PACKAGE}::managed_pool::update_fee`,
    arguments: [
        updateTx.object(MANAGER_CAP_ID),
        updateTx.object(POOL_ID),
        updateTx.pure.u64(25)  // 0.25% fee
    ]
});

// 3. Herhangi biri swap yapabilir
const swapTx = new Transaction();
swapTx.moveCall({
    target: `${PACKAGE}::managed_pool::swap_with_fee`,
    arguments: [
        swapTx.object(POOL_ID),
        swapTx.object(TREASURY_ID),
        swapTx.object(INPUT_COIN_ID)
    ]
});
```

## Best Practices

1. **Minimum Yetki Prensibi:** Her capability sadece gerekli fonksiyonlara erişsin
2. **Transfer Edilebilir:** `store` ability ekleyerek ownership transfer'ı sağla
3. **Açıklayıcı İsimler:** `AdminCap`, `ManagerCap`, `MinterCap` gibi
4. **Init Pattern:** Önemli capability'leri init'te oluştur
5. **Reference Kontrolü:** `&Cap` yeterli, `&mut` gerekmez (sadece tip kontrolü)
