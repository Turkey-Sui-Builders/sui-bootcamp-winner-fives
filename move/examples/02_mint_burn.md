# Örnek 2: Coin Mint ve Burn

Bu örnek, oluşturduğunuz coin'i nasıl mint (basma) ve burn (yakma) edeceğinizi gösterir.

## Kod

```move
module examples::my_coin;

use sui::coin::{Self, Coin, TreasuryCap};

public struct MY_COIN has drop {}

// ... init fonksiyonu (Örnek 1'deki gibi)

/// Yeni coin mint et ve belirtilen adrese gönder
public fun mint(
    treasury: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // Coin oluştur
    let coin = coin::mint(treasury, amount, ctx);

    // Alıcıya transfer et
    transfer::public_transfer(coin, recipient);
}

/// Coin'i yak (supply'dan düş)
public fun burn(
    treasury: &mut TreasuryCap<MY_COIN>,
    coin: Coin<MY_COIN>
) {
    coin::burn(treasury, coin);
}

/// Toplam supply'ı oku
public fun total_supply(
    treasury: &TreasuryCap<MY_COIN>
): u64 {
    coin::total_supply(treasury)
}
```

## Açıklama

### 1. Mint Fonksiyonu
```move
public fun mint(treasury: &mut TreasuryCap<MY_COIN>, ...)
```
- `treasury`: Mint yetkisi için gerekli
- Mutable reference (`&mut`) çünkü supply değişir
- Sadece TreasuryCap sahibi çağırabilir

**Coin Oluşturma:**
```move
let coin = coin::mint(treasury, amount, ctx);
```
- `amount`: Mint edilecek miktar (decimals dahil)
- Örnek: 1.5 coin için `1500000` (6 decimals)

### 2. Burn Fonksiyonu
```move
public fun burn(treasury: &mut TreasuryCap<MY_COIN>, coin: Coin<MY_COIN>)
```
- Coin'i yakarak supply'dan düşürür
- Coin objesi by-value alınır (transfer edilir ve yok edilir)

### 3. Total Supply
```move
coin::total_supply(treasury)
```
- Immutable reference yeterli
- Dolaşımdaki toplam coin miktarını döner

## Transaction Örneği

```typescript
// TypeScript SDK ile
const tx = new Transaction();

// Mint işlemi
tx.moveCall({
    target: `${PACKAGE_ID}::my_coin::mint`,
    arguments: [
        tx.object(TREASURY_CAP_ID),
        tx.pure.u64(1000000),  // 1 coin (6 decimals)
        tx.pure.address(RECIPIENT_ADDRESS)
    ]
});

await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair
});
```

## Önemli Notlar

1. **Decimals:** Amount belirtirken decimals'i hesaba katın
   - 6 decimals için: 1 coin = 1_000_000
   - 9 decimals için: 1 coin = 1_000_000_000

2. **Yetkilendirme:** Sadece TreasuryCap sahibi mint/burn yapabilir

3. **Supply Kontrolü:** Overflow/underflow kontrolü coin modülü tarafından yapılır
