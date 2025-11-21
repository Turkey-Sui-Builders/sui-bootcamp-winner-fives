# Örnek 4: Event Kullanımı

Bu örnek, DeFi protokollerinde önemli işlemleri kaydetmek için event'lerin nasıl kullanılacağını gösterir.

## Kod

```move
module examples::swap_with_events;

use sui::event;
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};

/// Havuz oluşturuldu eventi
public struct PoolCreated<phantom TokenA, phantom TokenB> has copy, drop {
    pool_id: ID,
    token_a_amount: u64,
    token_b_amount: u64,
    creator: address
}

/// Swap yapıldı eventi
public struct SwapExecuted<phantom TokenA, phantom TokenB> has copy, drop {
    pool_id: ID,
    input_amount: u64,
    output_amount: u64,
    is_a_to_b: bool,
    trader: address
}

/// Likidite eklendi eventi
public struct LiquidityAdded<phantom TokenA, phantom TokenB> has copy, drop {
    pool_id: ID,
    token_a_added: u64,
    token_b_added: u64,
    provider: address
}

public struct Pool<phantom TokenA, phantom TokenB> has key {
    id: UID,
    token_a: Balance<TokenA>,
    token_b: Balance<TokenB>
}

/// Yeni pool oluştur ve event emit et
public fun create_pool<TokenA, TokenB>(
    token_a: Coin<TokenA>,
    token_b: Coin<TokenB>,
    ctx: &mut TxContext
) {
    let token_a_amount = coin::value(&token_a);
    let token_b_amount = coin::value(&token_b);

    let pool = Pool {
        id: object::new(ctx),
        token_a: coin::into_balance(token_a),
        token_b: coin::into_balance(token_b)
    };

    let pool_id = object::id(&pool);

    // Event emit et
    event::emit(PoolCreated<TokenA, TokenB> {
        pool_id,
        token_a_amount,
        token_b_amount,
        creator: ctx.sender()
    });

    transfer::share_object(pool);
}

/// Swap yap ve event emit et
public fun swap_a_to_b<TokenA, TokenB>(
    pool: &mut Pool<TokenA, TokenB>,
    input: Coin<TokenA>,
    ctx: &mut TxContext
): Coin<TokenB> {
    let input_amount = coin::value(&input);

    let token_a_amount = balance::value(&pool.token_a);
    let token_b_amount = balance::value(&pool.token_b);

    let output_amount = (input_amount * token_b_amount) /
                       (token_a_amount + input_amount);

    balance::join(&mut pool.token_a, coin::into_balance(input));
    let output_balance = balance::split(&mut pool.token_b, output_amount);

    // Swap event emit et
    event::emit(SwapExecuted<TokenA, TokenB> {
        pool_id: object::id(pool),
        input_amount,
        output_amount,
        is_a_to_b: true,
        trader: ctx.sender()
    });

    coin::from_balance(output_balance, ctx)
}

/// Likidite ekle ve event emit et
public fun add_liquidity<TokenA, TokenB>(
    pool: &mut Pool<TokenA, TokenB>,
    token_a: Coin<TokenA>,
    token_b: Coin<TokenB>,
    ctx: &mut TxContext
) {
    let token_a_amount = coin::value(&token_a);
    let token_b_amount = coin::value(&token_b);

    balance::join(&mut pool.token_a, coin::into_balance(token_a));
    balance::join(&mut pool.token_b, coin::into_balance(token_b));

    // Likidite ekleme event
    event::emit(LiquidityAdded<TokenA, TokenB> {
        pool_id: object::id(pool),
        token_a_added: token_a_amount,
        token_b_added: token_b_amount,
        provider: ctx.sender()
    });
}
```

## Açıklama

### 1. Event Struct Tanımı
```move
public struct SwapExecuted<phantom TokenA, phantom TokenB> has copy, drop {
    pool_id: ID,
    input_amount: u64,
    output_amount: u64,
    is_a_to_b: bool,
    trader: address
}
```

**Gereksinimler:**
- `copy` ve `drop` abilities zorunlu
- Generic parametreler event'te kullanılabilir
- Modülün kendi tanımladığı tip olmalı

### 2. Event Emit Etme
```move
event::emit(SwapExecuted<TokenA, TokenB> {
    pool_id: object::id(pool),
    input_amount,
    output_amount,
    is_a_to_b: true,
    trader: ctx.sender()
});
```

### 3. Event Metadata
Event'ler otomatik olarak şu bilgileri içerir:
- `sender`: Transaction gönderen adres
- `timestamp`: Block timestamp'i
- `transaction_digest`: Transaction hash
- `event_type`: Event'in tam tipi

## Off-Chain Event Dinleme

### TypeScript SDK ile
```typescript
import { SuiClient } from '@mysten/sui.js/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

// Event'leri dinle
const events = await client.queryEvents({
    query: {
        MoveEventType: `${PACKAGE_ID}::swap_with_events::SwapExecuted<${TOKEN_A}, ${TOKEN_B}>`
    }
});

events.data.forEach(event => {
    console.log('Swap:', event.parsedJson);
    // {
    //   pool_id: '0x...',
    //   input_amount: '100000',
    //   output_amount: '98500',
    //   is_a_to_b: true,
    //   trader: '0x...'
    // }
});

// Real-time event subscription
await client.subscribeEvent({
    filter: {
        MoveEventType: `${PACKAGE_ID}::swap_with_events::SwapExecuted`
    },
    onMessage: (event) => {
        console.log('New swap:', event.parsedJson);
    }
});
```

## Kullanım Senaryoları

### 1. DEX Frontend
Event'leri dinleyerek:
- Gerçek zamanlı fiyat güncellemeleri
- Transaction history
- Volume tracking

### 2. Analytics
- Toplam swap hacmi
- Aktif kullanıcı sayısı
- En popüler pair'ler

### 3. Bot Trading
- Arbitraj fırsatlarını tespit
- Büyük swap'leri takip (whale tracking)

## Best Practices

1. **Önemli Bilgileri Kaydet:** ID'ler, miktarlar, adresler
2. **Generic Parametreler:** Token tiplerini event'te belirt
3. **Tutarlı İsimlendirme:** `PascalCase` event isimleri
4. **Minimal Data:** Sadece gerekli bilgileri kaydet (gas tasarrufu)
