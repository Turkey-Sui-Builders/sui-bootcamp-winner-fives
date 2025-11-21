# Örnek 1: Temel Coin Oluşturma

Bu örnek, Sui üzerinde basit bir coin (para birimi) nasıl oluşturulur gösterir.

## Kod

```move
module examples::my_coin;

use sui::coin_registry;

// One-Time Witness pattern
// Struct ismi modül ismiyle aynı olmalı (BÜYÜK HARF)
public struct MY_COIN has drop {}

// init fonksiyonu modül publish edildiğinde otomatik çalışır
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    // Yeni bir currency oluştur
    let (builder, treasury_cap) = coin_registry::new_currency_with_otw(
        witness,
        6,  // Decimals (virgülden sonra 6 hane)
        b"MYCOIN".to_string(),  // Symbol
        b"My Coin".to_string(),  // Name
        b"My first coin on Sui".to_string(),  // Description
        b"https://example.com/icon.png".to_string(),  // Icon URL
        ctx
    );

    // Metadata capability'yi finalize et
    let metadata_cap = builder.finalize(ctx);

    // TreasuryCap'i publisher'a gönder (mint/burn yetkisi)
    transfer::public_transfer(treasury_cap, ctx.sender());

    // MetadataCap'i publisher'a gönder (metadata güncelleme yetkisi)
    transfer::public_transfer(metadata_cap, ctx.sender());
}
```

## Açıklama

### 1. One-Time Witness (OTW)
```move
public struct MY_COIN has drop {}
```
- Struct ismi modül ismiyle aynı olmalı (BÜYÜK HARFLE)
- Sadece `drop` ability
- `init` fonksiyonunda otomatik olarak oluşturulur

### 2. Init Fonksiyonu
```move
fun init(witness: MY_COIN, ctx: &mut TxContext)
```
- Modül publish edildiğinde bir kez çalışır
- Witness parametresi otomatik verilir

### 3. Currency Oluşturma
```move
let (builder, treasury_cap) = coin_registry::new_currency_with_otw(...)
```
- `builder`: Metadata ayarlarını yapmak için
- `treasury_cap`: Mint ve burn yetkisi

### 4. Yetkiler
- **TreasuryCap**: Coin mint/burn etme yetkisi
- **MetadataCap**: Coin metadata güncelleme yetkisi

## Kullanım

```bash
# Modülü publish et
sui client publish --gas-budget 100000000

# Başarılı olursa TreasuryCap ve MetadataCap objelerini alırsınız
```
