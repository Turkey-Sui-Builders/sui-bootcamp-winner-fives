# Örnek 3: Basit Token Swap

Bu örnek, iki token arasında basit bir swap (takas) işlemi yapmayı gösterir.

## Kod

```move
module examples::simple_swap;

use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};

/// Swap hatası: Yetersiz likidite
const EInsufficientLiquidity: u64 = 0;
/// Swap hatası: Sıfır input
const EZeroInput: u64 = 1;

/// Basit bir likidite havuzu
public struct Pool<phantom TokenA, phantom TokenB> has key {
    id: UID,
    token_a: Balance<TokenA>,
    token_b: Balance<TokenB>
}

/// Yeni bir pool oluştur ve share et
public fun create_pool<TokenA, TokenB>(
    token_a: Coin<TokenA>,
    token_b: Coin<TokenB>,
    ctx: &mut TxContext
) {
    let pool = Pool {
        id: object::new(ctx),
        token_a: coin::into_balance(token_a),
        token_b: coin::into_balance(token_b)
    };

    // Pool'u shared obje yap (herkes erişebilir)
    transfer::share_object(pool);
}

/// TokenA ile TokenB satın al
public fun swap_a_to_b<TokenA, TokenB>(
    pool: &mut Pool<TokenA, TokenB>,
    input: Coin<TokenA>,
    ctx: &mut TxContext
): Coin<TokenB> {
    let input_amount = coin::value(&input);
    assert!(input_amount > 0, EZeroInput);

    // Basit constant product formula: x * y = k
    let token_a_amount = balance::value(&pool.token_a);
    let token_b_amount = balance::value(&pool.token_b);

    // Output miktarını hesapla
    let output_amount = (input_amount * token_b_amount) /
                       (token_a_amount + input_amount);

    assert!(output_amount > 0, EInsufficientLiquidity);
    assert!(output_amount <= token_b_amount, EInsufficientLiquidity);

    // Input'u pool'a ekle
    balance::join(&mut pool.token_a, coin::into_balance(input));

    // Output'u pool'dan çıkar ve coin'e çevir
    let output_balance = balance::split(&mut pool.token_b, output_amount);
    coin::from_balance(output_balance, ctx)
}

/// TokenB ile TokenA satın al
public fun swap_b_to_a<TokenA, TokenB>(
    pool: &mut Pool<TokenA, TokenB>,
    input: Coin<TokenB>,
    ctx: &mut TxContext
): Coin<TokenA> {
    let input_amount = coin::value(&input);
    assert!(input_amount > 0, EZeroInput);

    let token_a_amount = balance::value(&pool.token_a);
    let token_b_amount = balance::value(&pool.token_b);

    let output_amount = (input_amount * token_a_amount) /
                       (token_b_amount + input_amount);

    assert!(output_amount > 0, EInsufficientLiquidity);
    assert!(output_amount <= token_a_amount, EInsufficientLiquidity);

    balance::join(&mut pool.token_b, coin::into_balance(input));

    let output_balance = balance::split(&mut pool.token_a, output_amount);
    coin::from_balance(output_balance, ctx)
}

/// Pool rezervlerini oku
public fun get_reserves<TokenA, TokenB>(
    pool: &Pool<TokenA, TokenB>
): (u64, u64) {
    (
        balance::value(&pool.token_a),
        balance::value(&pool.token_b)
    )
}
```

## Açıklama

### 1. Generic Pool Struct
```move
public struct Pool<phantom TokenA, phantom TokenB> has key
```
- `phantom` type parametreleri: Sadece tip kontrolü için, runtime'da kullanılmaz
- İki farklı token tipi için parametrize edilmiş

### 2. Balance Kullanımı
```move
token_a: Balance<TokenA>
```
- `Balance<T>` coin değerlerini saklamak için
- Obje değil, `store` ability var
- `Coin<T>` ile arasında dönüşüm:
  ```move
  coin::into_balance(coin)  // Coin -> Balance
  coin::from_balance(balance, ctx)  // Balance -> Coin
  ```

### 3. Swap Formülü
```move
let output_amount = (input_amount * token_b_amount) /
                   (token_a_amount + input_amount);
```
- Basit constant product (x * y = k) AMM formülü
- Gerçek uygulamada fee eklenmelidir

### 4. Balance İşlemleri
```move
// Ekle
balance::join(&mut pool.token_a, input_balance);

// Çıkar
let output = balance::split(&mut pool.token_b, amount);
```

## Kullanım Örneği

```move
// Pool oluştur
let token_a = coin::mint(&mut treasury_a, 1000000, ctx);
let token_b = coin::mint(&mut treasury_b, 2000000, ctx);
simple_swap::create_pool(token_a, token_b, ctx);

// Swap yap
let input = coin::mint(&mut treasury_a, 100000, ctx);
let output = simple_swap::swap_a_to_b(&mut pool, input, ctx);
```

## Geliştirmeler

Gerçek bir DEX için eklenebilecekler:
1. **Fee Mekanizması** (örn: %0.3)
2. **Slippage Koruması** (minimum output kontrolü)
3. **Liquidity Provider Tokens**
4. **Event Emission** (swap olaylarını kaydet)
5. **Flash Loan Desteği**
