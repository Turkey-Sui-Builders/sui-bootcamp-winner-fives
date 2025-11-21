# Nautilus - Verifiable Off-Chain Computation for DeFi

Nautilus, AWS Nitro Enclaves kullanarak Sui blockchain üzerinde güvenli ve doğrulanabilir off-chain hesaplamalar yapmanızı sağlayan bir framework'tür. DeFi uygulamalarında yoğun hesaplamalar için kullanılabilir.

---

## 1. Nautilus Nedir?

Nautilus, Trusted Execution Environment (TEE) kullanarak off-chain hesaplamalar yapar ve sonuçları on-chain doğrulanabilir şekilde imzalar. AWS Nitro Enclaves üzerinde çalışır ve reproducible builds destekler.

### Temel Özellikler

- **Verifiable Computation:** Enclave attestation ile doğrulama
- **Reproducible Builds:** Aynı source code → aynı PCR
- **AWS Nitro Enclaves:** Hardware-backed security
- **Sui Integration:** On-chain verification ve registration
- **Lightweight:** Hesaplama logic'e odaklanın, scaffolding hazır

### Trust Model

**Güven Kaynakları:**
1. **AWS Root Certificate:** On-chain'de saklanır
2. **PCR Values:** Binary'nin hash'i
3. **Reproducible Builds:** Herkes verify edebilir
4. **Attestation Document:** Enclave'in doğruluğunu kanıtlar

---

## 2. DeFi Kullanım Senaryoları

### 2.1 Price Oracle (External API)

**Problem:** Blockchain off-chain API'lere erişemez

**Çözüm:** Nautilus enclave API çağrısı yapar, imzalar

```rust
// Enclave içinde
pub async fn fetch_price(token: String) -> Result<PriceData> {
    // External API call
    let price = api.get_price(&token).await?;

    let response = EnclaveResponse {
        intent: 0,
        timestamp_ms: current_time(),
        data: PriceData {
            token,
            price,
            source: "CoinGecko"
        }
    };

    // Enclave key ile imzala
    let signature = sign_response(&response);

    Ok((response, signature))
}
```

**On-Chain:**
```move
// Enclave response'u verify et ve kullan
public fun update_price(
    enclave: &Enclave,
    signature: vector<u8>,
    timestamp: u64,
    token: String,
    price: u64,
    ctx: &TxContext
) {
    // Signature verify
    enclave::verify_signature(
        enclave,
        signature,
        bcs::to_bytes(&(0u8, timestamp, token, price))
    );

    // Price'ı kullan
    update_oracle_price(token, price, timestamp);
}
```

### 2.2 Complex Calculations

**Problem:** On-chain gas maliyeti çok yüksek

**Senaryolar:**
- AMM için optimal route calculation
- Portfolio rebalancing
- Risk scoring
- Yield optimization

```rust
// Enclave: Heavy calculation
pub fn calculate_optimal_route(
    pools: Vec<Pool>,
    amount_in: u64,
    token_in: String,
    token_out: String
) -> OptimalRoute {
    // Graph traversal, dynamic programming, etc.
    let route = expensive_calculation(pools, amount_in, token_in, token_out);

    EnclaveResponse {
        intent: 1,
        timestamp_ms: current_time(),
        data: route
    }
}
```

### 2.3 Private Computation

**Problem:** On-chain data public'tir

**Çözüm:** Sensitive data enclave içinde işlenir

```rust
// User'ların private data'sını process et
pub async fn calculate_credit_score(
    user_data: EncryptedUserData
) -> Result<CreditScore> {
    // Decrypt inside enclave
    let data = decrypt(user_data);

    // Private calculation
    let score = analyze_financial_history(data);

    // Sadece score döndür, data dışarı çıkmaz
    Ok(score)
}
```

**DeFi Örnek:** Under-collateralized lending için credit scoring

### 2.4 MEV Protection

**Senaryo:** Trade intent'leri enclave içinde execute et

```rust
// Encrypted trade intent'i al
pub async fn execute_trade(
    encrypted_intent: Vec<u8>
) -> Result<TradeResult> {
    let intent = decrypt_intent(encrypted_intent);

    // Market'i analyze et
    let optimal_execution = calculate_best_execution(&intent);

    // Execute
    let result = submit_trade(optimal_execution).await?;

    Ok(result)
}
```

### 2.5 AI Model Inference

**Problem:** AI models büyük, on-chain çalışamaz

```rust
pub async fn predict_price(
    market_data: MarketData,
    model_path: String
) -> Prediction {
    // Model enclave içinde
    let model = load_model(&model_path);

    // Inference
    let prediction = model.predict(&market_data);

    EnclaveResponse {
        intent: 2,
        timestamp_ms: current_time(),
        data: prediction
    }
}
```

---

## 3. Architecture

### 3.1 Flow

```
1. Developer Actions:
   ├─ Create Rust server code
   ├─ Build enclave (reproducible)
   ├─ Publish source code (GitHub)
   ├─ Register PCRs on-chain
   ├─ Deploy to AWS Nitro Enclave
   └─ Register enclave with attestation

2. User Actions:
   ├─ (Optional) Verify PCRs locally
   ├─ Send request to enclave
   ├─ Receive signed response
   └─ Submit response on-chain for verification
```

### 3.2 Components

**Off-Chain:**
- **Nautilus Server:** Rust server in enclave
- **Enclave Key:** Ephemeral, generated in enclave
- **External APIs:** HTTP forwarding via parent EC2

**On-Chain:**
- **EnclaveConfig:** PCR values
- **Enclave Object:** Public key registry
- **Verification:** Signature verification

---

## 4. Setup and Deployment

### 4.1 Prerequisites

```bash
# AWS CLI setup
export AWS_ACCESS_KEY_ID=<key>
export AWS_SECRET_ACCESS_KEY=<secret>
export AWS_SESSION_TOKEN=<token>
export KEY_PAIR=<key-pair-name>
```

### 4.2 Configure Enclave

```bash
# Clone repo
git clone https://github.com/MystenLabs/nautilus
cd nautilus

# Configure (interactive)
sh configure_enclave.sh weather-example

# Prompts:
# - Instance name
# - Secret (API keys, etc.)
# - Allowed endpoints
```

**allowed_endpoints.yaml:**
```yaml
- host: api.coingecko.com
  port: 443
- host: api.binance.com
  port: 443
```

### 4.3 Deploy to AWS

```bash
# Connect to EC2 instance
ssh -i <key-pair>.pem ec2-user@<public-ip>

# Build enclave
cd nautilus
make build ENCLAVE_APP=my-app

# Run enclave
make run

# Expose port 3000
sh expose_enclave.sh
```

### 4.4 Test Endpoints

```bash
# Health check
curl http://<PUBLIC_IP>:3000/health_check

# Get attestation
curl http://<PUBLIC_IP>:3000/get_attestation

# Process data
curl -X POST http://<PUBLIC_IP>:3000/process_data \
  -H 'Content-Type: application/json' \
  -d '{"payload": {"token": "SUI"}}'
```

---

## 5. Building Your App

### 5.1 Rust Server

**Directory Structure:**
```
src/nautilus-server/src/apps/my_app/
├── mod.rs                    # Your logic
├── allowed_endpoints.yaml    # External APIs
```

**mod.rs:**
```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct RequestPayload {
    pub token: String,
    pub amount: u64,
}

#[derive(Serialize)]
pub struct ResponseData {
    pub token: String,
    pub price: f64,
    pub optimal_route: Vec<String>,
}

pub async fn process_data(
    payload: RequestPayload
) -> Result<(EnclaveResponse<ResponseData>, String)> {
    // Your computation logic
    let price = fetch_price(&payload.token).await?;
    let route = calculate_route(&payload.token, payload.amount).await?;

    let response = EnclaveResponse {
        intent: 0,
        timestamp_ms: current_timestamp(),
        data: ResponseData {
            token: payload.token,
            price,
            optimal_route: route,
        },
    };

    // Sign with enclave key
    let signature = sign_response(&response)?;

    Ok((response, signature))
}
```

### 5.2 Move Contract

**Directory Structure:**
```
move/my_app/
├── sources/
│   └── my_app.move
└── Move.toml
```

**my_app.move:**
```move
module my_package::price_oracle;

use nautilus::enclave::{Self, Enclave, EnclaveConfig};
use sui::bcs;

const EInvalidSignature: u64 = 1;

public struct PriceData has key {
    id: UID,
    token: String,
    price: u64,
    timestamp: u64,
    enclave_id: ID
}

public fun update_price(
    enclave: &Enclave,
    signature: vector<u8>,
    timestamp: u64,
    token: String,
    price: u64,
    ctx: &mut TxContext
) {
    // Construct signing payload (must match Rust)
    let intent: u8 = 0;
    let mut signing_bytes = vector::empty();
    vector::append(&mut signing_bytes, bcs::to_bytes(&intent));
    vector::append(&mut signing_bytes, bcs::to_bytes(&timestamp));
    vector::append(&mut signing_bytes, bcs::to_bytes(&token));
    vector::append(&mut signing_bytes, bcs::to_bytes(&price));

    // Verify signature
    enclave::verify_signature(
        enclave,
        &signature,
        &signing_bytes
    );

    // Create price data object
    let price_data = PriceData {
        id: object::new(ctx),
        token,
        price,
        timestamp,
        enclave_id: object::id(enclave)
    };

    transfer::share_object(price_data);
}
```

---

## 6. Registration

### 6.1 Build Locally (Get PCRs)

```bash
cd nautilus
make ENCLAVE_APP=my-app

# Get PCR values
cat out/nitro.pcrs

# Save as env vars
PCR0=14245f411c034ca453c7afcc666007919ca618da943e5a78823819e9bcee2084...
PCR1=14245f411c034ca453c7afcc666007919ca618da943e5a78823819e9bcee2084...
PCR2=21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c...
```

**Reproducible Build:** Aynı source code → aynı PCR

### 6.2 Deploy Contracts

```bash
# Deploy enclave package
cd move/enclave
sui client publish
# Save ENCLAVE_PACKAGE_ID

# Deploy your app
cd ../my_app
sui client publish
# Save APP_PACKAGE_ID, CAP_OBJECT_ID, ENCLAVE_CONFIG_OBJECT_ID
```

### 6.3 Register PCRs

```bash
# Update PCRs on-chain
sui client call \
  --function update_pcrs \
  --module enclave \
  --package $ENCLAVE_PACKAGE_ID \
  --type-args "$APP_PACKAGE_ID::my_app::MY_APP" \
  --args $ENCLAVE_CONFIG_OBJECT_ID $CAP_OBJECT_ID \
         0x$PCR0 0x$PCR1 0x$PCR2
```

### 6.4 Register Enclave

```bash
# Get attestation and register
sh register_enclave.sh \
  $ENCLAVE_PACKAGE_ID \
  $APP_PACKAGE_ID \
  $ENCLAVE_CONFIG_OBJECT_ID \
  $ENCLAVE_URL \
  my_app \
  MY_APP

# Save ENCLAVE_OBJECT_ID from output
```

---

## 7. Frontend Integration

### 7.1 Call Enclave

```typescript
// Request to enclave
const response = await fetch(`${ENCLAVE_URL}/process_data`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: {
      token: "SUI",
      amount: 1000000
    }
  })
});

const { response: enclaveResponse, signature } = await response.json();
```

### 7.2 Submit On-Chain

```typescript
import { Transaction } from "@mysten/sui/transactions";

const tx = new Transaction();

// Call Move function with enclave response
tx.moveCall({
  target: `${APP_PACKAGE_ID}::price_oracle::update_price`,
  arguments: [
    tx.object(ENCLAVE_OBJECT_ID),
    tx.pure.vector("u8", fromHex(signature)),
    tx.pure.u64(enclaveResponse.timestamp_ms),
    tx.pure.string(enclaveResponse.data.token),
    tx.pure.u64(enclaveResponse.data.price)
  ]
});

// Execute
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair
});
```

---

## 8. DeFi Examples

### 8.1 Price Aggregator

```rust
// Enclave: Fetch from multiple sources
pub async fn get_aggregated_price(token: String) -> AggregatedPrice {
    let binance = fetch_binance_price(&token).await?;
    let coingecko = fetch_coingecko_price(&token).await?;
    let kraken = fetch_kraken_price(&token).await?;

    let median = calculate_median(vec![binance, coingecko, kraken]);

    AggregatedPrice {
        token,
        price: median,
        sources: vec!["Binance", "CoinGecko", "Kraken"],
        timestamp: current_time()
    }
}
```

### 8.2 Liquidation Calculator

```rust
// Enclave: Complex risk calculation
pub fn should_liquidate(
    position: Position,
    market_prices: Vec<Price>
) -> LiquidationDecision {
    let collateral_value = calculate_collateral_value(&position, &market_prices);
    let debt_value = calculate_debt_value(&position, &market_prices);

    let health_factor = collateral_value / debt_value;

    LiquidationDecision {
        should_liquidate: health_factor < 1.0,
        health_factor,
        collateral_value,
        debt_value,
        recommendation: generate_recommendation(health_factor)
    }
}
```

### 8.3 Optimal Swap Route

```rust
// Enclave: Graph traversal
pub fn find_optimal_route(
    pools: Vec<PoolData>,
    amount_in: u64,
    token_in: String,
    token_out: String
) -> OptimalRoute {
    // Build graph
    let graph = build_pool_graph(&pools);

    // Dijkstra's algorithm
    let routes = find_all_routes(&graph, &token_in, &token_out);

    // Calculate output for each route
    let best = routes.into_iter()
        .map(|route| (route.clone(), simulate_swap(&route, amount_in)))
        .max_by(|(_, out1), (_, out2)| out1.cmp(out2))
        .unwrap();

    OptimalRoute {
        path: best.0,
        estimated_output: best.1,
        gas_estimate: estimate_gas(&best.0),
        price_impact: calculate_impact(&best.0, amount_in)
    }
}
```

---

## 9. Security Considerations

### 9.1 Reproducible Builds

**Verify PCRs:**
```bash
# Build locally
make ENCLAVE_APP=my-app

# Compare with on-chain PCRs
cat out/nitro.pcrs
sui client object $ENCLAVE_CONFIG_OBJECT_ID
```

### 9.2 Signature Verification

**Critical:** Signing payload Rust ve Move'da aynı olmalı

```rust
// Rust
let payload = bcs::to_bytes(&(
    intent,
    timestamp,
    token,
    price
));
let signature = sign(payload);
```

```move
// Move
let mut signing_bytes = vector::empty();
vector::append(&mut signing_bytes, bcs::to_bytes(&intent));
vector::append(&mut signing_bytes, bcs::to_bytes(&timestamp));
vector::append(&mut signing_bytes, bcs::to_bytes(&token));
vector::append(&mut signing_bytes, bcs::to_bytes(&price));

enclave::verify_signature(enclave, &signature, &signing_bytes);
```

**Test Compatibility:**
```rust
#[test]
fn test_serde() {
    let data = (0u8, 123456789u64, "SUI".to_string(), 100u64);
    let rust_bytes = bcs::to_bytes(&data).unwrap();

    // Compare with Move BCS encoding
    assert_eq!(rust_bytes, expected_move_bytes);
}
```

### 9.3 PCR Updates

Enclave code değiştiğinde:

```bash
# 1. Rebuild
make ENCLAVE_APP=my-app

# 2. Update PCRs on-chain
sui client call --function update_pcrs ...

# 3. Register new enclave
sh register_enclave.sh ...
```

---

## 10. Best Practices

### 10.1 API Key Management

```bash
# AWS Secrets Manager kullan
aws secretsmanager create-secret \
  --name my-api-key \
  --secret-string "abc123..."

# Enclave environment variable olarak alır
export API_KEY=$(aws secretsmanager get-secret-value ...)
```

### 10.2 Rate Limiting

```rust
// Enclave içinde rate limit
static RATE_LIMITER: Lazy<RateLimiter> = Lazy::new(|| {
    RateLimiter::new(100, Duration::from_secs(60)) // 100 req/min
});

pub async fn process_data(payload: Payload) -> Result<Response> {
    RATE_LIMITER.check()?;

    // Process...
}
```

### 10.3 Error Handling

```rust
// Enclave error'ları log'la ama user'a detay verme
pub async fn fetch_price(token: String) -> Result<Price> {
    match api_call(&token).await {
        Ok(price) => Ok(price),
        Err(e) => {
            error!("API error: {:?}", e);
            Err(Error::ExternalAPIError) // Generic error
        }
    }
}
```

### 10.4 Monitoring

```bash
# CloudWatch logs
aws logs tail /aws/nitro-enclaves/my-app --follow

# Metrics
curl http://<IP>:3000/health_check
```

---

## 11. Limitations

### Current Constraints

- **TEE Provider:** Sadece AWS Nitro Enclaves
- **Internet Access:** Parent EC2 üzerinden HTTP forwarding
- **Deployment:** Manual EC2 setup
- **Secrets:** AWS Secrets Manager

### Non-Goals

- **General purpose compute:** Specific use cases için
- **High throughput:** Scalability sınırlı
- **Real-time:** Latency var (API calls, attestation)

---

## 12. Example: Complete Flow

```bash
# 1. Develop
# - Write Rust server logic (src/nautilus-server/src/apps/my_app/)
# - Write Move contract (move/my_app/)
# - Define allowed_endpoints.yaml

# 2. Configure
sh configure_enclave.sh my-app

# 3. Deploy to AWS
make build ENCLAVE_APP=my-app
make run
sh expose_enclave.sh

# 4. Get PCRs
make ENCLAVE_APP=my-app
cat out/nitro.pcrs

# 5. Deploy contracts
cd move/enclave && sui client publish
cd ../my_app && sui client publish

# 6. Register
sui client call --function update_pcrs ...
sh register_enclave.sh ...

# 7. Use in Frontend
fetch(`${ENCLAVE_URL}/process_data`, ...)
tx.moveCall({ target: `${PKG}::my_app::verify_and_use`, ... })
```

---

## Kaynaklar

- Nautilus Docs: https://docs.sui.io/concepts/cryptography/nautilus
- GitHub: https://github.com/MystenLabs/nautilus
- Example App: https://github.com/MystenLabs/nautilus-twitter
- AWS Nitro: https://aws.amazon.com/ec2/nitro/nitro-enclaves/
- Discord: Sui Discord #nautilus channel
