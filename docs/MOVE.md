# Move Dili - DeFi Hackathon Rehberi

Bu döküman, Sui blockchain üzerinde Move dili kullanarak DeFi (Decentralized Finance) uygulamaları geliştirmek için gereken temel bilgileri içerir.

---

## 1. Temel Kavramlar

### 1.1 Struct (Özel Tipler)

Struct, Move'da özel veri tipleri tanımlamak için kullanılır. DeFi uygulamalarında token, likidite havuzu, vb. yapıları temsil eder.

```move
public struct LiquidityPool has key {
    id: UID,
    balance_a: Balance<TokenA>,
    balance_b: Balance<TokenB>,
    lp_supply: Supply<LP_TOKEN>
}
```

**Önemli Noktalar:**
- Struct'lar varsayılan olarak private'dır
- Alanlar (fields) sadece tanımlayan modülden erişilebilir
- Struct oluşturmak için tüm alanlar doldurulmalıdır

### 1.2 Fonksiyonlar

Fonksiyonlar `fun` anahtar kelimesiyle tanımlanır. Entry fonksiyonlar transaction'lardan doğrudan çağrılabilir.

```move
public fun swap(
    pool: &mut LiquidityPool,
    input: Coin<TokenA>,
    ctx: &mut TxContext
): Coin<TokenB> {
    // swap logic
}
```

**İsimlendirme:**
- `snake_case` kullanılır: `add_liquidity`, `get_balance`
- Açıklayıcı isimler: `swap_token_a_for_b`

**Çoklu Dönüş Değerleri:**
```move
public fun remove_liquidity(
    pool: &mut LiquidityPool,
    lp_token: Coin<LP>
): (Coin<TokenA>, Coin<TokenB>) {
    // return two coins
}
```

---

## 2. Abilities (Yetenekler)

Abilities, bir tipin hangi özelliklere sahip olduğunu belirtir.

### 2.1 `key` Ability

Obje olarak saklanabilir. Her `key` ability'ye sahip struct için `id: UID` zorunludur.

```move
public struct Vault has key {
    id: UID,
    balance: Balance<SUI>
}
```

### 2.2 `store` Ability

Diğer struct'ların içinde saklanabilir veya public transfer yapılabilir.

```move
public struct Token has key, store {
    id: UID,
    value: u64
}
```

### 2.3 `copy` ve `drop` Abilities

Event'ler için gereklidir:

```move
public struct SwapEvent has copy, drop {
    amount_in: u64,
    amount_out: u64
}
```

---

## 3. Storage (Depolama) Fonksiyonları

### 3.1 Transfer

Objeyi bir adrese gönderir (address-owned):

```move
transfer::transfer(admin_cap, ctx.sender());
```

**Public Transfer** (`store` gerektirir):
```move
transfer::public_transfer(coin, recipient);
```

### 3.2 Share

Objeyi shared state'e koyar, herkes erişebilir:

```move
transfer::share_object(pool);
```

### 3.3 Freeze

Objeyi immutable yapar, değiştirilemez hale gelir:

```move
transfer::freeze_object(config);
```

**Önemli:**
- Frozen objeler sadece immutable reference ile okunabilir
- Shared objeler silinebilir ama transfer/freeze edilemez

---

## 4. Coin ve Token Oluşturma

### 4.1 Currency (Coin) Oluşturma

One-Time Witness (OTW) pattern ile:

```move
public struct MY_COIN has drop {}

fun init(witness: MY_COIN, ctx: &mut TxContext) {
    let (builder, treasury_cap) = coin_registry::new_currency_with_otw(
        witness,
        6,  // decimals
        b"MYCOIN".to_string(),  // symbol
        b"My Coin".to_string(),  // name
        b"Description".to_string(),
        b"https://icon.url".to_string(),
        ctx
    );

    let metadata_cap = builder.finalize(ctx);

    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_transfer(metadata_cap, ctx.sender());
}
```

**TreasuryCap:** Token mint/burn yetkisi sağlar.

### 4.2 Coin Mint Etme

```move
use sui::coin::{Self, Coin, TreasuryCap};

public fun mint(
    treasury: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    ctx: &mut TxContext
): Coin<MY_COIN> {
    coin::mint(treasury, amount, ctx)
}
```

### 4.3 Closed-Loop Token (Oyun İçi Para)

Sadece belirli yerlerde kullanılabilen tokenler:

```move
use sui::token::{Self, Token, ActionRequest};

public fun buy_gems(
    store: &mut GemStore,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): (Token<GEM>, ActionRequest<GEM>) {
    let amount = coin::value(&payment);
    coin::put(&mut store.profits, payment);

    let gems = token::mint(&mut store.gem_treasury, amount, ctx);
    let req = token::new_request(buy_action(), amount, none(), none(), ctx);

    (gems, req)
}
```

---

## 5. Balance Modülü

`Balance<T>` coin değerlerini saklamak için kullanılır.

```move
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};

public struct Pool has key {
    id: UID,
    token_a: Balance<TokenA>,
    token_b: Balance<TokenB>
}

// Coin'den Balance'a
let balance = coin::into_balance(coin_obj);

// Balance'dan Coin'e
let coin_obj = coin::from_balance(balance, ctx);

// Balance birleştirme
balance::join(&mut pool.token_a, balance);

// Balance ayırma
let split = balance::split(&mut pool.token_a, amount);
```

**Önemli:** Balance obje değildir, `store` ability'ye sahiptir ve başka struct'larda saklanır.

---

## 6. Transaction Context (TxContext)

Her transaction'da mevcut olan context bilgisi:

```move
// Sender adresi
let sender = ctx.sender();

// Yeni UID oluşturma
let id = object::new(ctx);

// Epoch bilgisi
let epoch = ctx.epoch();

// Timestamp
let timestamp = ctx.epoch_timestamp_ms();
```

**Önemli:** `TxContext` fonksiyon parametrelerinin sonuncusu olmalıdır.

---

## 7. Events (Olaylar)

Off-chain dinleyiciler için event yayınlama:

```move
use sui::event;

public struct LiquidityAdded has copy, drop {
    pool_id: ID,
    amount_a: u64,
    amount_b: u64,
    lp_tokens: u64
}

public fun add_liquidity(...) {
    // ... logic

    event::emit(LiquidityAdded {
        pool_id: object::id(pool),
        amount_a: 1000,
        amount_b: 2000,
        lp_tokens: 500
    });
}
```

**Gereksinimler:**
- Event struct'ı `copy` ve `drop` ability'lerine sahip olmalı
- Modülün kendi tanımladığı tip olmalı

---

## 8. Capability Pattern (Yetkilendirme)

Admin yetkilerini kontrol etmek için:

```move
public struct AdminCap has key, store {
    id: UID
}

// Sadece AdminCap sahibi çağırabilir
public fun set_fee(
    _: &AdminCap,
    pool: &mut Pool,
    new_fee: u64
) {
    pool.fee = new_fee;
}
```

**Init fonksiyonunda oluştur:**
```move
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx)
    };
    transfer::transfer(admin_cap, ctx.sender());
}
```

---

## 9. Witness Pattern

Tip ownership'i kanıtlamak için:

```move
public struct Witness has drop {}

public fun create_with_witness(_witness: Witness): Pool {
    // Sadece Witness oluşturabilen modül çağırabilir
}
```

**One-Time Witness (OTW):**
- Struct ismi modül ismiyle aynı (BÜYÜK HARF)
- Sadece `drop` ability
- `init` fonksiyonunda bir kez oluşturulur

```move
public struct MY_COIN has drop {}

fun init(witness: MY_COIN, ctx: &mut TxContext) {
    // Witness burada otomatik olarak geçilir
}
```

---

## 10. DeFi İçin Önemli Noktalar

### 10.1 Coin Management

**Gas Smashing:** Birden fazla coin'i otomatik birleştirme
```move
// Transaction'da birden fazla coin gas olarak verilebilir
// Otomatik olarak ilk coin'e birleştirilir
```

**Manuel Birleştirme:**
```move
use sui::pay;

// Coin'leri birleştir
pay::join(coin1, coin2);

// Coin'i böl
let split_coin = coin::split(coin, amount, ctx);
```

### 10.2 Owned vs Shared Objects

**Owned Objects:**
- Tek bir adrese ait
- Paralel işlem hızlı
- Transfer edilebilir

**Shared Objects:**
- Herkes erişebilir
- Consensus gerektirir (daha yavaş)
- DeFi pool'ları için ideal

### 10.3 Güvenlik

**Assert ile Kontrol:**
```move
const EInsufficientBalance: u64 = 0;
const ESlippageTooHigh: u64 = 1;

public fun swap(...) {
    assert!(balance >= amount, EInsufficientBalance);
    assert!(output >= min_output, ESlippageTooHigh);
}
```

**Overflow Kontrolü:**
```move
use std::u64;

assert!(value < u64::max_value() - addition, EOverflow);
```

---

## 11. Hızlı Referans

### Module Yapısı
```move
module package_name::module_name;

use sui::coin::{Self, Coin};
use sui::balance::Balance;

// Constants
const ERROR_CODE: u64 = 0;

// Structs
public struct MyStruct has key { id: UID }

// Functions
public fun my_function() {}

// Init (opsiyonel)
fun init(ctx: &mut TxContext) {}
```

### Sık Kullanılan İmportlar
```move
use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::event;
```

### Temel Tipler
- `u8`, `u16`, `u32`, `u64`, `u128`, `u256`: Unsigned integers
- `bool`: true/false
- `address`: Blockchain adresi
- `vector<T>`: Dinamik array
- `Option<T>`: null olabilir değer

---

## 12. Test Yazma

```move
#[test]
fun test_swap() {
    let mut ctx = tx_context::dummy();

    // Test kodu
    let pool = create_pool(&mut ctx);

    // Assert kontrolü
    assert!(pool.balance == 1000, 0);
}

#[test]
#[expected_failure(abort_code = EInsufficientBalance)]
fun test_insufficient_balance() {
    // Hata vermesi beklenen test
}
```

---

## Kaynaklar

- Move Book: https://move-book.com
- Sui Docs: https://docs.sui.io
- Sui Framework: https://github.com/MystenLabs/sui/tree/main/crates/sui-framework
