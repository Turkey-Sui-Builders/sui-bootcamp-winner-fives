# Kariyer3 - Testnet Setup Guide

Sui blockchain üzerinde çalışan, SEAL Pattern ile gizlilik korumalı, zkLogin entegrasyonlu ve Walrus storage kullanan merkezi olmayan iş ilanı platformu.

## 🚀 Özellikler

- **SEAL Pattern Privacy:** Başvurular Dynamic Object Fields olarak saklanır, sadece işveren ve başvuran görüntüleyebilir
- **zkLogin Authentication:** Google hesabıyla blockchain'e giriş (wallet gerektirmez)
- **Walrus Storage:** CV dosyaları merkezi olmayan Walrus ağında saklanır
- **AI-Ready:** Gelecekte AI değerlendirme entegrasyonu için hazır veri modeli
- **Upgradable Contracts:** Move contract'ları güncelleme desteği ile deploy edilir

## 📋 Gereksinimler

- **Node.js** >= 18.0.0
- **Sui CLI** >= 1.0.0
- **Sui Wallet** (opsiyonel - zkLogin ile gerekmez)

## 🛠️ Kurulum

### 1. Depoyu Klonlayın
```bash
cd hackathon/ui/kariyer3
npm install
```

### 2. Environment Variables Ayarlayın
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
VITE_NETWORK=testnet
VITE_ENOKI_API_KEY=your_enoki_api_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Move Contract'ı Deploy Edin
```bash
cd ../../move/kariyer3

# Devnet'e geçin
sui client switch --env devnet

# Devnet faucet'ten SUI alın
sui client faucet

# Contract'ı deploy edin
sui client publish --gas-budget 100000000
```

Deploy çıktısından aşağıdaki değerleri kopyalayın:
- **Package ID:** `0xabc123...`
- **JobBoard Object ID:** `0xdef456...`
- **UpgradeCap Object ID:** `0xupgrade789...`

Bu değerleri `.env` dosyasına ekleyin:
```env
VITE_PACKAGE_ID=0xabc123...
VITE_JOB_BOARD_ID=0xdef456...
VITE_UPGRADE_CAP_ID=0xupgrade789...
```

### 4. Uygulamayı Başlatın
```bash
cd ../../ui/kariyer3
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## 🔑 API Key'leri Alma

### Enoki (zkLogin) API Key
1. [enoki.mystenlabs.com](https://enoki.mystenlabs.com/) adresine gidin
2. GitHub ile giriş yapın
3. "Create New App" → App adı verin → Network: **Devnet**
4. API Key'i kopyalayın

### Google OAuth Client ID
1. [console.cloud.google.com](https://console.cloud.google.com/) adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
4. Application type: **Web application**
5. Authorized redirect URIs:
   - `http://localhost:5173/auth`
   - `https://yourdomain.com/auth`
6. Client ID'yi kopyalayın

### Walrus (Devnet)
Walrus devnet public ve ücretsizdir, API key gerektirmez. Endpoints otomatik yapılandırılmıştır:
- Publisher: `https://publisher-devnet.walrus.space`
- Aggregator: `https://aggregator-devnet.walrus.space`

## 📦 Devnet Test SUI Alma

```bash
# Sui CLI ile
sui client faucet

# Discord faucet
# 1. discord.gg/sui adresine katılın
# 2. #devnet-faucet kanalına gidin
# 3. !faucet <WALLET_ADDRESS> yazın
```

## 🧪 Testleri Çalıştırma

### Move Contract Testleri
```bash
cd hackathon/move/kariyer3
sui move test
```

### Frontend Testleri
```bash
cd hackathon/ui/kariyer3
npm test                # Testleri çalıştır
npm run test:ui         # UI ile çalıştır
npm run test:coverage   # Coverage raporu oluştur
```

## 🔄 Contract Upgrade

```bash
cd hackathon/move/kariyer3

# Kod değişikliği yaptıktan sonra
sui client upgrade --gas-budget 100000000

# Veya UpgradeCap ile
sui client upgrade --upgrade-capability <UPGRADE_CAP_ID> --gas-budget 100000000
```

## 📁 Proje Yapısı

```
hackathon/
├── move/kariyer3/              # Sui Move contracts
│   ├── sources/
│   │   └── job_board.move     # Ana contract (SEAL Pattern)
│   ├── tests/
│   │   └── job_board_tests.move
│   └── Move.toml              # Devnet configuration
│
└── ui/kariyer3/               # React frontend
    ├── src/
    │   ├── components/        # UI bileşenleri
    │   ├── pages/            # Sayfa bileşenleri
    │   ├── store/            # Redux store
    │   ├── hooks/            # Custom hooks (Walrus upload)
    │   ├── providers/        # Auth provider (zkLogin + wallet)
    │   ├── config/           # Devnet configuration
    │   └── test/             # Test dosyaları
    ├── .env.example          # Devnet environment template
    └── package.json
```

## 🌐 Network Endpoints (Devnet)

### Sui Devnet
- RPC: `https://fullnode.devnet.sui.io:443`
- Faucet: `https://faucet.devnet.sui.io/gas`
- Explorer: `https://suiexplorer.com/?network=devnet`

### Walrus Devnet
- Publisher: `https://publisher-devnet.walrus.space`
- Aggregator: `https://aggregator-devnet.walrus.space`

## 🔒 Güvenlik

- **SEAL Pattern:** Application verileri private, sadece işveren ve başvuran erişebilir
- **zkLogin:** Private key gerektirmez, Google OAuth ile güvenli giriş
- **Walrus:** CV dosyaları merkezi olmayan storage'da saklanır
- **Upgradable:** Contract güvenlik güncellemeleri için upgrade edilebilir

## 📝 Kullanım

### İşveren Olarak
1. Google ile giriş yapın veya wallet bağlayın
2. "Post Job" sayfasına gidin
3. İş ilanı detaylarını doldurun (kategori, maaş aralığı, etiketler)
4. İlanı yayınlayın
5. "My Jobs" sayfasından başvuruları görüntüleyin
6. Uygun adayı işe alın

### İş Arayan Olarak
1. Google ile giriş yapın veya wallet bağlayın
2. İş ilanlarını filtreleyin (kategori, maaş, arama)
3. İlgilendiğiniz ilana başvurun
4. CV'nizi yükleyin (Walrus'a otomatik upload)
5. Başvuru durumunuzu "My Applications" sayfasından takip edin

## ⚙️ Devnet Yapılandırması

Proje **devnet** için önceden yapılandırılmıştır:

### Move Contract (`Move.toml`)
```toml
[package]
name = "kariyer3"
edition = "2024.beta"
published-at = "0x0"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/devnet" }

[addresses]
kariyer3 = "0x0"
```

### Frontend (`constants.ts`)
```typescript
export const NETWORK = "devnet";
export const WALRUS_AGGREGATOR = "https://aggregator-devnet.walrus.space";
export const WALRUS_PUBLISHER = "https://publisher-devnet.walrus.space";
```

### Environment Variables (`.env`)
```env
VITE_NETWORK=devnet
VITE_PACKAGE_ID=0x...          # Deploy sonrası
VITE_JOB_BOARD_ID=0x...        # Deploy sonrası
VITE_CLOCK_ID=0x6
VITE_ENOKI_API_KEY=enoki_apikey_xxxxxxxxxxxxx
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

## 🐛 Sorun Giderme

### Contract Deploy Hatası
```bash
# Error: Insufficient gas
# Çözüm: Faucet'ten daha fazla SUI alın
sui client faucet
```

### Walrus Upload Hatası
```bash
# Error: Failed to upload to Walrus
# Çözüm: Devnet endpoints'lerin doğru olduğunu kontrol edin
# constants.ts dosyasında:
# WALRUS_PUBLISHER = "https://publisher-devnet.walrus.space"
```

### zkLogin Hatası
```bash
# Error: Invalid redirect URI
# Çözüm: Google OAuth Console'da redirect URI'yi ekleyin
# http://localhost:5173/auth
```

### Network Mismatch Hatası
```bash
# Error: Network mismatch
# Çözüm: Sui CLI ve frontend network'ünün aynı olduğundan emin olun
sui client switch --env devnet
# .env dosyasında: VITE_NETWORK=devnet
```

## 📞 Destek

Proje Sui Hackathon için geliştirilmiştir.

## 📄 Lisans

MIT
