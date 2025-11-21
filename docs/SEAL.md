# Seal - Decentralized Secrets Management for DeFi

Seal, Sui blockchain üzerinde access control policy'leri ile korunan, decentralized bir secrets management (gizli veri yönetimi) servisidir. DeFi uygulamalarında encrypted data için kullanılabilir.

---

## 1. Seal Nedir?

Seal, Identity-Based Encryption (IBE) kullanarak sensitive data'yı encrypt eder ve Sui smart contract'ları ile access control sağlar. Client-side encryption ile maximum privacy sunar.

### Temel Özellikler

- **Encryption/Decryption:** Secret sharing ile şifreleme
- **Sui Access Control:** Move package'ları ile yetkilendirme
- **Decentralized Key Servers:** Off-chain key server'lar
- **Threshold Encryption:** t-out-of-n güvenlik
- **Client-Side:** Uygulama data'yı encrypt/decrypt eder

### Cryptographic Primitives

**Şu anda desteklenenler:**
- **KEM:** Boneh-Franklin IBE (BLS12-381)
- **DEM:**
  - AES-256-GCM (hızlı, recommended)
  - HMAC-CTR (on-chain decryption için)

---

## 2. DeFi Kullanım Senaryoları

### 2.1 Secure Personal Data

**Senaryo:** Kullanıcı verilerini Walrus'ta güvenli saklama

```typescript
// User data encrypt et
const userData = {
  portfolio: [...],
  transactions: [...],
  preferences: {...}
};

const { encryptedObject } = await sealClient.encrypt({
  threshold: 2,
  packageId: fromHex(PACKAGE_ID),
  id: fromHex(userId),
  data: JSON.stringify(userData)
});

// Walrus'a yükle
const blobId = await walrus.store(encryptedObject);
```

**Access Control:**
```move
// Sadece owner erişebilir
entry fun seal_approve(id: vector<u8>, ctx: &TxContext) {
    let user_id = bcs::to_bytes(&ctx.sender());
    assert!(id == user_id, EUnauthorized);
}
```

### 2.2 Gated Content (Subscription Model)

**Senaryo:** Premium içerik için ödeme gerektir

```move
public struct Subscription has key {
    id: UID,
    user: address,
    expiry: u64,
    tier: u8
}

// Sadece aktif aboneler erişebilir
entry fun seal_approve(
    id: vector<u8>,
    sub: &Subscription,
    clock: &Clock,
    ctx: &TxContext
) {
    assert!(sub.user == ctx.sender(), ENotSubscriber);
    assert!(clock.timestamp_ms() < sub.expiry, EExpired);
    assert!(sub.tier >= decode_tier(id), EInsufficientTier);
}
```

**TypeScript:**
```typescript
// Premium content encrypt
const content = { videoUrl: "...", extras: [...] };
const { encryptedObject } = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: `premium_${contentId}`,
  data: JSON.stringify(content)
});

// Decrypt (requires active subscription)
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::content::seal_approve`,
  arguments: [
    tx.pure.vector("u8", fromHex(`premium_${contentId}`)),
    tx.object(SUBSCRIPTION_ID),
    tx.object(CLOCK_ID)
  ]
});

const decrypted = await seal.decrypt({
  data: encryptedBytes,
  sessionKey,
  txBytes: await tx.build({ client, onlyTransactionKind: true })
});
```

### 2.3 Time-Lock Encryption

**Senaryo:** Belirli zamandan sonra erişilebilir veri (MEV protection)

```move
// Belirli zamandan önce erişim yok
entry fun seal_approve(id: vector<u8>, clock: &Clock) {
    let mut bcs_reader = bcs::new(id);
    let unlock_time = bcs_reader.peel_u64();

    assert!(clock.timestamp_ms() >= unlock_time, ETooEarly);
}
```

**DeFi Uygulaması:**
```typescript
// Swap intent'i encrypt et (1 saat sonra açılsın)
const unlockTime = Date.now() + 3600000; // 1 hour
const swapIntent = {
  pool: POOL_ID,
  amountIn: 1000000,
  minOut: 950000
};

const id = bcs.ser(BCS.U64, unlockTime).toBytes();

const { encryptedObject } = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: toHex(id),
  data: JSON.stringify(swapIntent)
});

// 1 saat sonra herkes decrypt edebilir
```

**Use Cases:**
- MEV-resistant trading
- Sealed-bid auctions
- Commit-reveal voting

### 2.4 Secure Voting

**Senaryo:** Oylar encrypted, sadece voting period sonrası açılır

```move
public struct VotingRound has key {
    id: UID,
    end_time: u64,
    votes: VecMap<address, vector<u8>> // encrypted votes
}

// Oylama bitince decrypt edilebilir
entry fun seal_approve(
    id: vector<u8>,
    round: &VotingRound,
    clock: &Clock
) {
    assert!(clock.timestamp_ms() >= round.end_time, EVotingNotEnded);
}
```

### 2.5 Private Order Book

**Senaryo:** Order'lar gizli, sadece match olunca açılır

```move
// Sadece order owner veya matcher erişebilir
entry fun seal_approve(
    id: vector<u8>,
    order: &Order,
    ctx: &TxContext
) {
    let sender = ctx.sender();
    assert!(
        sender == order.owner || sender == order.matcher,
        EUnauthorized
    );
}
```

---

## 3. TypeScript SDK Kullanımı

### 3.1 Setup

```bash
npm install @mysten/seal
```

```typescript
import { SealClient, SessionKey } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });

// Key server'ları seç
const serverObjectIds = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8"
];

const sealClient = new SealClient({
  suiClient,
  serverConfigs: serverObjectIds.map(id => ({
    objectId: id,
    weight: 1 // Her server eşit ağırlık
  })),
  verifyKeyServers: false // İlk setup'ta true yapın
});
```

### 3.2 Encryption

```typescript
const data = JSON.stringify({
  secretValue: "my_private_data",
  amount: 1000000
});

const { encryptedObject, key: backupKey } = await sealClient.encrypt({
  threshold: 2, // 2 server'dan key gerekli
  packageId: fromHex(PACKAGE_ID),
  id: fromHex(userId), // Access policy için ID
  data: Buffer.from(data)
});

// encryptedObject → Walrus'a yükle
const blobId = await walrus.store(encryptedObject);

// backupKey → Disaster recovery için sakla (opsiyonel)
```

### 3.3 Session Key

```typescript
// Session key oluştur (kullanıcı bir kez onaylar)
const sessionKey = await SessionKey.create({
  address: account.address,
  packageId: fromHex(PACKAGE_ID),
  ttlMin: 60, // 60 dakika geçerli
  suiClient
});

// Kullanıcı imzalar (wallet'ta popup)
const message = sessionKey.getPersonalMessage();
const { signature } = await wallet.signPersonalMessage(message);
sessionKey.setPersonalMessageSignature(signature);

// Artık session key kullanılabilir
```

### 3.4 Decryption

```typescript
// Access policy transaction
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::my_module::seal_approve`,
  arguments: [
    tx.pure.vector("u8", fromHex(userId)),
    // Diğer gerekli argumentler (subscription, clock, vb.)
  ]
});

const txBytes = await tx.build({
  client: suiClient,
  onlyTransactionKind: true
});

// Decrypt
const decryptedBytes = await sealClient.decrypt({
  data: encryptedBytes,
  sessionKey,
  txBytes
});

const decryptedData = JSON.parse(decryptedBytes.toString());
```

### 3.5 Batch Decryption

```typescript
// Birden fazla key al (efficient)
await sealClient.fetchKeys({
  ids: [id1, id2, id3],
  txBytes: multiCallTxBytes, // Her ID için seal_approve
  sessionKey,
  threshold: 2
});

// Sonra ayrı ayrı decrypt et
const data1 = await sealClient.decrypt({ data: enc1, ... });
const data2 = await sealClient.decrypt({ data: enc2, ... });
```

---

## 4. Move Smart Contract Patterns

### 4.1 Owner-Only Access

```move
module my_package::private_data;

use sui::bcs;

const EUnauthorized: u64 = 1;

entry fun seal_approve(id: vector<u8>, ctx: &TxContext) {
    let sender = ctx.sender();
    let owner_bytes = bcs::to_bytes(&sender);

    // ID must be owner's address
    assert!(id == owner_bytes, EUnauthorized);
}
```

### 4.2 Allowlist Pattern

```move
public struct Allowlist has key {
    id: UID,
    version: u64,
    members: VecSet<address>
}

entry fun seal_approve(
    id: vector<u8>,
    allowlist: &Allowlist,
    ctx: &TxContext
) {
    let sender = ctx.sender();
    assert!(allowlist.members.contains(&sender), ENotAllowed);
}

// Admin allowlist'i update edebilir
public fun add_member(
    _: &AdminCap,
    allowlist: &mut Allowlist,
    member: address
) {
    allowlist.members.insert(member);
    allowlist.version = allowlist.version + 1;
}
```

### 4.3 NFT-Gated Access

```move
use sui::dynamic_field as df;

public struct ContentPass has key, store {
    id: UID,
    tier: u8
}

entry fun seal_approve(
    id: vector<u8>,
    pass: &ContentPass,
    ctx: &TxContext
) {
    // Decode required tier from ID
    let mut bcs_reader = bcs::new(id);
    let required_tier = bcs_reader.peel_u8();

    assert!(pass.tier >= required_tier, EInsufficientTier);
}
```

### 4.4 Time-Based Access

```move
use sui::clock::Clock;

entry fun seal_approve(
    id: vector<u8>,
    clock: &Clock
) {
    let mut bcs_reader = bcs::new(id);
    let unlock_time = bcs_reader.peel_u64();

    assert!(clock.timestamp_ms() >= unlock_time, ETooEarly);
}
```

---

## 5. On-Chain Decryption

Seal, on-chain HMAC-CTR decryption destekler (küçük data için):

```move
use seal::bf_hmac_encryption;

// Public key'leri on-chain sakla
public struct KeyServerRegistry has key {
    id: UID,
    public_keys: vector<PublicKey>
}

// Decrypt on-chain
public fun decrypt_and_use(
    encrypted_bytes: vector<u8>,
    derived_keys: vector<VerifiedDerivedKey>,
    registry: &KeyServerRegistry
): Option<vector<u8>> {
    bf_hmac_encryption::decrypt(
        &encrypted_bytes,
        derived_keys,
        &registry.public_keys
    )
}
```

**Use Case:** Secure voting, sealed auctions

---

## 6. DeFi Application Patterns

### 6.1 Private Portfolio

```typescript
// Portfolio data encrypt
const portfolio = {
  positions: [
    { token: "SUI", amount: 1000 },
    { token: "USDC", amount: 5000 }
  ],
  pnl: 15.5,
  lastUpdated: Date.now()
};

const encrypted = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: userAddress,
  data: JSON.stringify(portfolio)
});

// Store on Walrus
await walrus.store(encrypted.encryptedObject);
```

### 6.2 Subscription Content

```typescript
// Content tiers
const TIERS = {
  BASIC: 1,
  PREMIUM: 2,
  ENTERPRISE: 3
};

// Tier-specific content ID
const contentId = bcs.ser("u8", TIERS.PREMIUM).toBytes();

const encrypted = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: toHex(contentId),
  data: premiumContent
});
```

### 6.3 MEV Protection

```typescript
// Swap intent - 10 dakika sonra açılabilir
const unlockTime = Date.now() + 600000;
const swapOrder = {
  action: "swap",
  pool: POOL_ID,
  amountIn: 1000000,
  slippage: 0.5
};

const id = bcs.ser(BCS.U64, unlockTime).toBytes();

const encrypted = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: toHex(id),
  data: JSON.stringify(swapOrder)
});

// Submit encrypted order
await contract.submitEncryptedOrder(encrypted.encryptedObject);
```

---

## 7. Performance Optimization

### 7.1 AES vs HMAC-CTR

**AES-256-GCM (Önerilen):**
- Çok hızlı
- Büyük dosyalar için ideal
- Off-chain decryption

**HMAC-CTR:**
- Yavaş
- Sadece on-chain decryption için
- Küçük data (<1KB)

```typescript
// AES kullan (default)
await seal.encrypt({ ... }); // Fast

// HMAC-CTR (on-chain için)
await seal.encrypt({
  ...,
  algorithm: "HMAC_CTR"
}); // Slow, but on-chain decodable
```

### 7.2 Envelope Encryption

Büyük dosyalar için:

```typescript
// 1. Symmetric key ile encrypt
import { generateKey, encryptAES } from "./crypto";

const symmetricKey = generateKey();
const encryptedData = encryptAES(largeFile, symmetricKey);

// 2. Symmetric key'i Seal ile encrypt
const { encryptedObject } = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: fileId,
  data: symmetricKey
});

// 3. Encrypted data Walrus'ta, key Seal'da
await walrus.store(encryptedData);
// Store encryptedObject reference on-chain
```

### 7.3 Session Key Reuse

```typescript
// Session key'i 1 saat boyunca kullan
const sessionKey = await SessionKey.create({
  address,
  packageId,
  ttlMin: 60
});

// Her decrypt için tekrar sign gerekmez
for (const encData of encryptedItems) {
  const decrypted = await seal.decrypt({
    data: encData,
    sessionKey, // Reuse
    txBytes
  });
}
```

---

## 8. Security Best Practices

### 8.1 Threshold Selection

```typescript
// 2-out-of-3 (Recommended)
const sealClient = new SealClient({
  serverConfigs: [
    { objectId: server1, weight: 1 },
    { objectId: server2, weight: 1 },
    { objectId: server3, weight: 1 }
  ]
});

await seal.encrypt({ threshold: 2, ... });
```

**Trade-offs:**
- Threshold = 1: Low security, high availability
- Threshold = n: High security, low availability
- Threshold = n/2 + 1: Balanced

### 8.2 Key Server Verification

```typescript
// İlk setup'ta verify et
const sealClient = new SealClient({
  serverConfigs: [...],
  verifyKeyServers: true // İlk kullanımda
});

// Runtime'da false (performance)
```

### 8.3 Package Upgrade Safety

```move
// Versioned shared object pattern
public struct GlobalConfig has key {
    id: UID,
    version: u64
}

entry fun seal_approve(
    id: vector<u8>,
    config: &GlobalConfig,
    ctx: &TxContext
) {
    assert!(config.version == 1, EWrongVersion);
    // Access control logic
}
```

---

## 9. Limitations

### Move Function Constraints

`seal_approve` fonksiyonları:
- **Side-effect free** olmalı (state değiştirmez)
- **dry_run_transaction_block** ile evaluate edilir
- **Full node'un local state'i** kullanılır
- **Atomik değil** (farklı key server'lar farklı state görebilir)

**Kaçının:**
```move
// ❌ Frequently changing state'e bağlı
entry fun seal_approve(counter: &Counter, ...) {
    assert!(counter.value == 100, ...); // Race condition
}

// ❌ Random kullanımı
entry fun seal_approve(...) {
    let random = random::generate(); // Non-deterministic
}
```

**Yapın:**
```move
// ✅ Stable state
entry fun seal_approve(allowlist: &Allowlist, ...) {
    assert!(allowlist.members.contains(&sender), ...);
}

// ✅ Time-based
entry fun seal_approve(clock: &Clock, ...) {
    assert!(clock.timestamp_ms() >= unlock_time, ...);
}
```

---

## 10. Example: Complete DeFi Flow

```typescript
// 1. Setup
const seal = new SealClient({ ... });
const sessionKey = await SessionKey.create({ ... });

// 2. Encrypt user portfolio
const portfolio = { positions: [...], value: 10000 };
const { encryptedObject } = await seal.encrypt({
  threshold: 2,
  packageId: PACKAGE_ID,
  id: userAddress,
  data: JSON.stringify(portfolio)
});

// 3. Store on Walrus
const blobId = await walrus.store(encryptedObject);

// 4. Save reference on-chain
await contract.savePortfolio(blobId);

// 5. Decrypt when needed
const encData = await walrus.read(blobId);

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::portfolio::seal_approve`,
  arguments: [
    tx.pure.vector("u8", fromHex(userAddress))
  ]
});

const txBytes = await tx.build({ client, onlyTransactionKind: true });
const decrypted = await seal.decrypt({
  data: encData,
  sessionKey,
  txBytes
});

const portfolio = JSON.parse(decrypted.toString());
```

---

## Kaynaklar

- Seal Docs: https://seal.mystenlabs.com
- TypeScript SDK: @mysten/seal (npm)
- GitHub: https://github.com/MystenLabs/seal
- Discord: Sui Discord #seal channel
