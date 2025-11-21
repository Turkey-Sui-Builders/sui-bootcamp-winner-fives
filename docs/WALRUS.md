# Walrus - Decentralized Storage for DeFi

Walrus, Sui blockchain üzerinde çalışan, düşük maliyetli, yüksek dayanıklılı bir decentralized storage (dağıtık depolama) sistemidir. DeFi uygulamalarında büyük veri depolamak için kullanılabilir.

---

## 1. Walrus Nedir?

Walrus, bloblari (binary large objects) saklamak ve okumak için geliştirilmiş bir sistemdir. Gelişmiş erasure coding ile veriyi ~5x boyutunda kodlayarak, geleneksel blockchain'lerdeki 100x+ replication maliyetinin çok altında bir fiyatla depolama sunar.

### Temel Özellikler

- **Düşük Maliyet:** Erasure coding sayesinde Sui object storage'a göre ~20x daha ucuz
- **Yüksek Dayanıklılık:** Byzantine fault tolerant, veri kaybına karşı korumalı
- **Büyük Dosyalar:** Birkaç GiB'a kadar dosya depolama
- **Sui Entegrasyonu:** Storage Sui objesi olarak yönetilir
- **HTTP/CDN Uyumlu:** Web2 teknolojileriyle kolayca erişilebilir

### Maliyetler

Walrus'ta 4 maliyet kaynağı vardır:

1. **Storage Resources (WAL):** Blob için kapasite satın alma
2. **Upload Costs (WAL):** Veri yükleme maliyeti
3. **Sui Transactions (SUI):** On-chain işlemler
4. **Sui Objects (SUI):** Blob metadata objeleri

**Önemli:** Encoded size = Original size × 5 + Metadata (~64MB sabit)
- Küçük dosyalar (<10MB) için metadata dominant
- Büyük dosyalar için size dominant

---

## 2. DeFi Kullanım Senaryoları

### 2.1 NFT Media Storage

**Problem:** NFT'ler için media (resim, video, 3D model) blockchain'de çok pahalı

**Çözüm:**
```typescript
// Media'yı Walrus'a yükle
const blobId = await walrus.store(imageFile);

// NFT'de sadece blob ID'yi sakla
const nft = {
  name: "My NFT",
  image: `https://walrus-cache.com/${blobId}`
};
```

**Faydalar:**
- On-chain maliyeti minimal
- Kalıcı ve değiştirilemez storage
- CDN üzerinden hızlı erişim

### 2.2 DeFi Protocol Metadata

**Senaryolar:**
- Lending protocol'ler için risk raporları
- DEX için token listesi ve logoları
- Yield farming APY geçmişi
- Audit raporları ve dokümantasyon

```move
// Sui'de sadece referans sakla
public struct ProtocolData has key {
    id: UID,
    audit_report_blob_id: vector<u8>,
    whitepaper_blob_id: vector<u8>
}
```

### 2.3 Historical Data Archive

**Problem:** Blockchain historical data çok büyük

**Çözüm:**
- Checkpoint history
- Transaction logs
- State snapshots
- Price feed history

**DeFi Uygulaması:**
```typescript
// Her gün price data'yı Walrus'a yaz
const dailyPrices = await fetchPriceHistory();
const blobId = await walrus.store(JSON.stringify(dailyPrices));

// On-chain sadece blob ID
await contract.updatePriceArchive(blobId, timestamp);
```

### 2.4 Large Dataset Storage

**AI ve Analytics:**
- Training datasets
- Model weights
- Backtest sonuçları
- Market data feeds

---

## 3. Walrus CLI Kullanımı

### 3.1 Kurulum

```bash
# Walrus CLI indir
# Binary'yi PATH'e ekle
walrus --version
```

### 3.2 Temel Komutlar

**Store (Yükleme):**
```bash
# Dosya yükle
walrus store myfile.json --epochs 5

# Dry run (maliyet tahmini)
walrus store myfile.json --dry-run

# Output:
# Blob ID: bafybeig...
# Encoded size: 52428800 bytes
# Storage cost: 123 WAL
# Upload cost: 45 WAL
```

**Read (Okuma):**
```bash
# Blob ID ile dosya indir
walrus read <BLOB_ID> --output myfile.json

# HTTP üzerinden:
curl https://walrus-cache.com/<BLOB_ID>
```

**Info:**
```bash
# Mevcut fiyatları göster
walrus info

# Output:
# Storage price: 10 WAL per MB per epoch
# Upload price: 2 WAL per MB
```

**Burn (Silme):**
```bash
# Blob objesini yak (storage resource geri kazan)
walrus burn-blobs --object-ids <BLOB_OBJECT_ID>
```

### 3.3 Storage Management

```bash
# Storage resource satın al
walrus reserve-space --size 1000000000 --epochs 10

# Mevcut storage'ları listele
walrus list-storage

# Storage split/merge
# CLI otomatik yapar ama manuel de yapılabilir
```

---

## 4. TypeScript SDK

### 4.1 Upload

```typescript
import { WalrusClient } from "@mysten/walrus";

const client = new WalrusClient({
  network: "testnet",
  walletAddress: account.address,
});

// Dosya yükle
const file = new File([data], "data.json");
const result = await client.store(file, {
  epochs: 5,
  deletable: true, // Silinebilir yap
});

console.log("Blob ID:", result.blobId);
console.log("Storage cost:", result.cost);
```

### 4.2 Read

```typescript
// Blob ID ile oku
const data = await client.read(blobId);

// HTTP ile direkt
const url = `https://aggregator.walrus.site/v1/${blobId}`;
const response = await fetch(url);
const data = await response.blob();
```

### 4.3 Quilt (Batch Storage)

**Problem:** Küçük dosyalar için metadata overhead çok yüksek

**Çözüm:** Quilt ile birden fazla blob'u batch olarak yükle

```typescript
import { QuiltClient } from "@mysten/walrus/quilt";

const quilt = new QuiltClient();

// Birden fazla küçük dosyayı birlikte yükle
const files = [
  { name: "token1.json", data: token1Data },
  { name: "token2.json", data: token2Data },
  { name: "token3.json", data: token3Data },
];

const result = await quilt.store(files, { epochs: 5 });

// Her dosya için ayrı ID
console.log(result.blobIds); // ['blob1', 'blob2', 'blob3']

// Tek metadata maliyeti ödenir
```

**Faydalar:**
- Metadata maliyeti paylaşılır
- Sui gas maliyeti düşer
- Küçük dosyalar için ideal

---

## 5. Sui Integration

### 5.1 Blob Metadata On-Chain

```move
// Walrus blob reference
public struct BlobReference has store, copy, drop {
    blob_id: vector<u8>,
    size: u64,
    epochs: u64,
    storage_rebate: u64
}

// Protocol'de kullan
public struct ProtocolAsset has key {
    id: UID,
    name: String,
    media: BlobReference,
    metadata: BlobReference
}
```

### 5.2 Availability Proof

Walrus, blob'un available olduğunu on-chain kanıtlayabilir:

```move
// Availability kontrolü
public fun verify_blob_availability(
    blob_object: &Blob,
    clock: &Clock
) {
    assert!(blob_object.expiry > clock.timestamp_ms(), EExpired);
    // Blob object existence = availability kanıtı
}
```

### 5.3 Storage Extension

```move
// Blob storage süresini uzat
public fun extend_blob_storage(
    blob: &mut Blob,
    additional_epochs: u64,
    payment: Coin<WAL>,
    ctx: &mut TxContext
) {
    // Extend logic
}
```

---

## 6. DeFi Application Pattern

### 6.1 Token Metadata Pattern

```typescript
// Token metadata Walrus'ta
interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  icon: string; // Walrus blob ID
  website: string;
  whitepaper: string; // Walrus blob ID
  audit_report: string; // Walrus blob ID
}

// Upload
const metadata = { /* ... */ };
const blobId = await walrus.store(JSON.stringify(metadata));

// On-chain sadece blob ID
tx.moveCall({
  target: `${PACKAGE}::token::create`,
  arguments: [
    tx.pure.string("MyToken"),
    tx.pure.vector("u8", fromHex(blobId))
  ]
});
```

### 6.2 Price Oracle Archive

```typescript
// Historical price data
interface PriceArchive {
  pair: string;
  data: Array<{ timestamp: number; price: number }>;
  period: string;
}

// Her gün arşivle
async function archiveDailyPrices() {
  const prices = await fetchDailyPrices();
  const blobId = await walrus.store(JSON.stringify(prices));

  // On-chain reference
  await contract.recordPriceArchive(blobId, Date.now());
}

// Read
async function getPriceHistory(blobId: string) {
  const data = await walrus.read(blobId);
  return JSON.parse(data) as PriceArchive;
}
```

### 6.3 Large Report Storage

```typescript
// Risk raporları, analytics
const report = {
  protocol: "MyDeFi",
  timestamp: Date.now(),
  tvl_history: [...], // Büyük array
  user_positions: [...], // Binlerce kayıt
  risk_metrics: { ... }
};

// Walrus'a yükle
const blobId = await walrus.store(
  JSON.stringify(report),
  { epochs: 100 } // Uzun süre sakla
);

// Frontend'de kullan
const reportUrl = `https://walrus.site/v1/${blobId}`;
```

---

## 7. Cost Optimization

### 7.1 Küçük Dosyalar İçin

**Problem:** <10MB dosyalar metadata overhead'den etkilenir

**Çözüm:**
1. **Quilt kullan:** Batch upload
2. **Combine files:** Birden fazla küçük dosyayı tek JSON'da birleştir
3. **Compress:** Gzip ile sıkıştır

```typescript
// Önce compress
import pako from 'pako';

const compressed = pako.gzip(JSON.stringify(data));
const blobId = await walrus.store(compressed);

// Read sırasında decompress
const compressedData = await walrus.read(blobId);
const data = JSON.parse(pako.ungzip(compressedData, { to: 'string' }));
```

### 7.2 Storage Resource Yönetimi

```typescript
// Büyük storage bir kere al
const storage = await walrus.reserveSpace({
  size: 10_000_000_000, // 10GB
  epochs: 100
});

// Split et ve kullan
// CLI otomatik yapar, manuel de yapılabilir

// Deletable blob'lar ile reuse
const result = await walrus.store(file, {
  deletable: true,
  reuseStorage: true // Mevcut storage kullan
});
```

### 7.3 Burn Unused Blobs

```typescript
// Artık kullanılmayan blob'ları yak
const unusedBlobs = await findUnusedBlobs();

for (const blobId of unusedBlobs) {
  await walrus.burn(blobId); // Storage rebate al
}
```

---

## 8. Security Considerations

### 8.1 Encryption

Walrus data public'tir. Private data için encrypt edin:

```typescript
import { encrypt, decrypt } from './crypto';

// Encrypt before upload
const encrypted = await encrypt(sensitiveData, userKey);
const blobId = await walrus.store(encrypted);

// Decrypt after read
const encryptedData = await walrus.read(blobId);
const data = await decrypt(encryptedData, userKey);
```

**DeFi Örnek:** User portfolio data

### 8.2 Access Control

Walrus'ta native access control yok. Sui smart contract ile kontrol edin:

```move
public struct PrivateDocument has key {
    id: UID,
    owner: address,
    blob_id: vector<u8>,
    allowed_readers: VecSet<address>
}

public fun read_document(
    doc: &PrivateDocument,
    ctx: &TxContext
): vector<u8> {
    let sender = ctx.sender();
    assert!(
        sender == doc.owner || doc.allowed_readers.contains(&sender),
        EUnauthorized
    );

    doc.blob_id // Return blob ID if authorized
}
```

---

## 9. Best Practices

### DeFi Applications

1. **Metadata Storage:**
   - Token metadata → Walrus
   - NFT media → Walrus
   - Protocol docs → Walrus

2. **Historical Data:**
   - Daily snapshots → Walrus
   - Transaction logs → Walrus
   - Analytics reports → Walrus

3. **Cost Management:**
   - Küçük dosyalar için Quilt
   - Compress large data
   - Burn unused blobs
   - Reuse storage resources

4. **Security:**
   - Sensitive data encrypt et
   - Access control on-chain
   - Verify blob availability

5. **Performance:**
   - CDN kullan (walrus-cache)
   - Lazy load büyük dosyalar
   - Cache frequently accessed data

---

## 10. Limits and Considerations

### Current Limits

- **Max blob size:** Birkaç GiB
- **Epoch duration:** Mainnet'te ~2 hafta
- **Minimum epochs:** 1 epoch
- **Metadata overhead:** ~64MB (worst case)

### Non-Goals

Walrus şunları **DEĞİLDİR:**
- CDN replacement (CDN ile kullanılır)
- Smart contract platform (Sui ile entegre)
- Key management (encryption ayrı yönetilir)

---

## Kaynaklar

- Walrus Docs: https://docs.walrus.site
- Walrus CLI: https://github.com/MystenLabs/walrus-docs
- TypeScript SDK: @mysten/walrus
- Network: https://walrus.xyz
