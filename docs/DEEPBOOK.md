# DeepBook V3 - DeFi Hackathon Rehberi

DeepBook V3, Sui blockchain üzerinde çalışan merkezi olmayan bir Central Limit Order Book (CLOB) sistemidir. Yüksek performanslı, düşük latency'li ve düşük fee'li bir on-chain exchange sağlar.

---

## 1. DeepBook V3 Nedir?

### 1.1 Temel Özellikler

**Central Limit Order Book (CLOB):**
- Geleneksel borsa mantığı: Limit ve market emirleri
- Price-time priority matching
- Maker-taker fee modeli
- Stablecoin ve volatile pair destegi

**Sui'ye Özgü Avantajlar:**
- Parallel execution: Aynı anda binlerce emir işlenebilir
- Düşük gas fees
- Sub-second finality

**V3 Yenilikleri:**
- **Flashloans**: Instant liquidity borrowing
- **DEEP Token Governance**: Pool parametrelerini oylama
- **Enhanced Account Abstraction**: BalanceManager + TradeCap sistemi
- **Maker Rebates**: Staked maker'lar fee yerine rebate alır

### 1.2 Fee Yapısı

**DEEP Token ile Trading:**
```
Staked Taker Fees:
- Stable pairs: 0.25 bps (0.0025%)
- Volatile pairs: 2.5 bps (0.025%)

Maker Rebates:
- Yeterli DEEP stake varsa maker rebate alır
- Her epoch sonunda dağıtılır
```

**Whitelisted Pools (DEEP/SUI, DEEP/USDC):**
- 0% trading fees
- DEEP token almanın kolay yolu

---

## 2. DeepBook Mimarisi

### 2.1 Temel Bileşenler

```
┌─────────────────────────────────────────────┐
│              Pool<Base, Quote>              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  Book   │  │  State  │  │  Vault  │     │
│  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────┘
                    ▲
                    │
            ┌───────┴────────┐
            │ BalanceManager │
            │  + TradeProof  │
            └────────────────┘
```

**Pool Components:**

1. **Book**: Order book yönetimi
   - Limit order yerleştirme ve eşleştirme
   - Price-time priority
   - Bid/Ask order tracking

2. **State**: Kullanıcı ve volume verileri
   - User volumes (maker/taker)
   - Historic volumes
   - Governance state (proposals, votes)
   - DEEP staking

3. **Vault**: Asset settlement
   - Base ve quote asset balances
   - Trading fees collection
   - Fund settlement after matches

### 2.2 BalanceManager

**BalanceManager shared object:**
- Tek bir hesabın tüm asset'lerini tutar
- 1 owner + max 1000 trader
- Tüm pool'larda kullanılabilir

```move
public struct BalanceManager has key, store {
    id: UID,
    owner: address,
    balances: Bag,
    allow_listed: VecSet<ID>,
}
```

**Owner Capabilities:**
- Deposit/Withdraw
- Place orders
- Stake DEEP
- Mint TradeCap/DepositCap/WithdrawCap

**Trader Capabilities (TradeCap ile):**
- Place/modify/cancel orders
- Stake DEEP
- Governance voting
- ❌ Deposit/Withdraw yapamaz

---

## 3. Move Contract Kullanımı

### 3.1 BalanceManager Oluşturma

**Basit oluşturma:**
```move
use deepbook::balance_manager;

public fun create_balance_manager(ctx: &mut TxContext) {
    let balance_manager = balance_manager::new(ctx);
    transfer::public_share_object(balance_manager);
}
```

**Custom owner ile oluşturma:**
```move
public fun create_for_user(user: address, ctx: &mut TxContext) {
    let balance_manager = balance_manager::new_with_custom_owner(user, ctx);
    transfer::public_share_object(balance_manager);
}
```

**Capability'ler ile oluşturma (authorized apps için):**
```move
use deepbook::registry::Registry;

public fun create_with_caps<App: drop>(
    registry: &Registry,
    owner: address,
    ctx: &mut TxContext,
): (BalanceManager, DepositCap, WithdrawCap, TradeCap) {
    balance_manager::new_with_custom_owner_caps<App>(
        registry,
        owner,
        ctx,
    )
}
```

### 3.2 Deposit ve Withdraw

**Owner deposit:**
```move
use deepbook::balance_manager;
use sui::coin::Coin;

public fun deposit_usdc(
    balance_manager: &mut BalanceManager,
    usdc: Coin<USDC>,
    ctx: &mut TxContext,
) {
    balance_manager::deposit(balance_manager, usdc, ctx);
}
```

**DepositCap ile deposit:**
```move
public fun deposit_with_cap_usdc(
    balance_manager: &mut BalanceManager,
    deposit_cap: &DepositCap,
    usdc: Coin<USDC>,
    ctx: &TxContext,
) {
    balance_manager::deposit_with_cap(
        balance_manager,
        deposit_cap,
        usdc,
        ctx,
    );
}
```

**Withdraw (owner only):**
```move
public fun withdraw_usdc(
    balance_manager: &mut BalanceManager,
    amount: u64,
    ctx: &mut TxContext,
): Coin<USDC> {
    balance_manager::withdraw<USDC>(balance_manager, amount, ctx)
}

// Withdraw all
public fun withdraw_all_usdc(
    balance_manager: &mut BalanceManager,
    ctx: &mut TxContext,
): Coin<USDC> {
    balance_manager::withdraw_all<USDC>(balance_manager, ctx)
}
```

### 3.3 Limit Order Yerleştirme

```move
use deepbook::pool::{Self, Pool};
use deepbook::balance_manager::{BalanceManager, TradeProof};
use sui::clock::Clock;

public fun place_bid_order(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    price: u64,          // Price in quote terms (USDC per SUI)
    quantity: u64,       // Quantity in base terms (SUI amount)
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // Generate TradeProof (owner için)
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    // Place limit order
    pool::place_limit_order(
        pool,
        balance_manager,
        &trade_proof,
        0,                          // client_order_id
        constants::no_restriction(),// order_type
        constants::cancel_oldest(), // self_matching_option
        price,
        quantity,
        true,                       // is_bid (true = buy, false = sell)
        true,                       // pay_with_deep
        0,                          // expire_timestamp (0 = no expiry)
        clock,
        ctx,
    );
}
```

**TradeCap ile order:**
```move
public fun place_order_with_cap(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    price: u64,
    quantity: u64,
    is_bid: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // TradeCap ile TradeProof oluştur
    let trade_proof = balance_manager::generate_proof_as_trader(
        balance_manager,
        trade_cap,
        ctx,
    );

    pool::place_limit_order(
        pool,
        balance_manager,
        &trade_proof,
        0,
        constants::no_restriction(),
        constants::cancel_oldest(),
        price,
        quantity,
        is_bid,
        true,
        0,
        clock,
        ctx,
    );
}
```

### 3.4 Market Order

```move
public fun place_market_buy(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    quantity: u64,       // SUI amount to buy
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    pool::place_market_order(
        pool,
        balance_manager,
        &trade_proof,
        0,                          // client_order_id
        constants::cancel_oldest(), // self_matching_option
        quantity,
        true,                       // is_bid (buy)
        true,                       // pay_with_deep
        clock,
        ctx,
    );
}
```

### 3.5 Direct Swap (BalanceManager olmadan)

**Swap exact base for quote:**
```move
use sui::coin::Coin;
use token::deep::DEEP;

public fun swap_sui_for_usdc(
    pool: &mut Pool<SUI, USDC>,
    sui_in: Coin<SUI>,
    deep_for_fees: Coin<DEEP>,
    min_usdc_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<SUI>, Coin<USDC>, Coin<DEEP>) {
    pool::swap_exact_base_for_quote(
        pool,
        sui_in,
        deep_for_fees,
        min_usdc_out,
        clock,
        ctx,
    )
}
```

**Swap exact quote for base:**
```move
public fun swap_usdc_for_sui(
    pool: &mut Pool<SUI, USDC>,
    usdc_in: Coin<USDC>,
    deep_for_fees: Coin<DEEP>,
    min_sui_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<SUI>, Coin<USDC>, Coin<DEEP>) {
    pool::swap_exact_quote_for_base(
        pool,
        usdc_in,
        deep_for_fees,
        min_sui_out,
        clock,
        ctx,
    )
}
```

**Return values:**
- First coin: Leftover base (SUI)
- Second coin: Received quote (USDC)
- Third coin: Leftover DEEP

---

## 4. TypeScript SDK Kullanımı

### 4.1 Setup

**Installation:**
```bash
npm install @mysten/deepbook-v3 @mysten/sui
```

**Client oluşturma:**
```typescript
import { DeepBookClient } from "@mysten/deepbook-v3";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

const env = "mainnet"; // or "testnet"

const dbClient = new DeepBookClient({
  address: "0x0", // Your wallet address
  env: env,
  client: new SuiClient({
    url: getFullnodeUrl(env),
  }),
});
```

### 4.2 BalanceManager İşlemleri

**BalanceManager oluşturma:**
```typescript
import { Transaction } from "@mysten/sui/transactions";

const tx = new Transaction();

dbClient.balanceManager.createBalanceManager()(tx);

// Execute
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

**Deposit:**
```typescript
const tx = new Transaction();

dbClient.balanceManager.deposit({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
  coinKey: "USDC",
  amount: 1000000000, // 1000 USDC (6 decimals)
})(tx);

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

**Withdraw:**
```typescript
const tx = new Transaction();

dbClient.balanceManager.withdraw({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
  coinKey: "SUI",
  amount: 1000000000, // 1 SUI (9 decimals)
})(tx);

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### 4.3 Trading

**Place limit order:**
```typescript
const tx = new Transaction();

dbClient.trade.placeLimitOrder({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
  poolKey: "SUI_USDC", // Pool identifier
  clientOrderId: Date.now(),
  price: 2.5,          // 2.5 USDC per SUI
  quantity: 100,       // 100 SUI
  isBid: true,         // Buy order
  expirationTimestamp: 0, // No expiry
})(tx);

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

**Place market order:**
```typescript
const tx = new Transaction();

dbClient.trade.placeMarketOrder({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
  poolKey: "SUI_USDC",
  clientOrderId: Date.now(),
  quantity: 50,     // 50 SUI
  isBid: false,     // Sell order
})(tx);

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

**Direct swap:**
```typescript
const tx = new Transaction();

// Swap 10 SUI for USDC
const [leftoverSui, receivedUsdc, leftoverDeep] = dbClient.trade.swapExactBaseForQuote({
  poolKey: "SUI_USDC",
  baseCoinKey: "SUI",
  quoteCoinKey: "USDC",
  deepCoinKey: "DEEP",
  amount: 10000000000, // 10 SUI
  minOut: 20000000,    // Minimum 20 USDC
})(tx);

// Transfer received USDC to yourself
tx.transferObjects([receivedUsdc], tx.pure.address(address));

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### 4.4 Query Functions

**Get pool info:**
```typescript
const poolInfo = await dbClient.getPool({
  baseCoinKey: "SUI",
  quoteCoinKey: "USDC",
});

console.log("Tick size:", poolInfo.tickSize);
console.log("Lot size:", poolInfo.lotSize);
console.log("Taker fee:", poolInfo.takerFee);
console.log("Maker fee:", poolInfo.makerFee);
```

**Get order book:**
```typescript
const orderBook = await dbClient.getLevel2Range({
  poolKey: "SUI_USDC",
  priceLow: 2.0,
  priceHigh: 3.0,
  isBid: true, // Get buy orders
});

orderBook.forEach((level) => {
  console.log(`Price: ${level.price}, Quantity: ${level.quantity}`);
});
```

**Get account balances:**
```typescript
const balances = await dbClient.getBalances({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
});

balances.forEach((balance) => {
  console.log(`${balance.asset}: ${balance.amount}`);
});
```

**Get open orders:**
```typescript
const orders = await dbClient.getOpenOrders({
  balanceManagerKey: "YOUR_BALANCE_MANAGER_ID",
  poolKey: "SUI_USDC",
});

orders.forEach((order) => {
  console.log(`Order ID: ${order.orderId}`);
  console.log(`Price: ${order.price}, Quantity: ${order.quantity}`);
  console.log(`Is Bid: ${order.isBid}`);
});
```

---

## 5. Pool Creation

### 5.1 Permissionless Pool Creation

**Move contract:**
```move
use deepbook::pool;
use deepbook::registry::Registry;
use token::deep::DEEP;

public fun create_token_usdc_pool(
    registry: &mut Registry,
    creation_fee: Coin<DEEP>, // Pool creation fee
    ctx: &mut TxContext,
): ID {
    pool::create_permissionless_pool<TOKEN, USDC>(
        registry,
        100,           // tick_size (0.01 USDC precision)
        1000000000,    // lot_size (1 TOKEN minimum)
        1000000000,    // min_size (1 TOKEN minimum)
        creation_fee,
        ctx,
    )
}
```

**TypeScript SDK:**
```typescript
const tx = new Transaction();

dbClient.deepBookAdmin.createPoolAdmin({
  baseCoinKey: "TOKEN",    // 9 decimals
  quoteCoinKey: "USDC",    // 6 decimals
  tickSize: 0.01,          // 0.01 USDC precision
  lotSize: 1,              // 1 TOKEN minimum
  minSize: 1,              // 1 TOKEN minimum order
  whitelisted: false,
  stablePool: false,
})(tx);

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

### 5.2 Pool Parameters

**Tick Size:**
- Minimum price increment
- Example: tick_size = 0.01 → prices like 2.50, 2.51, 2.52

**Lot Size:**
- Minimum quantity increment (in base asset)
- Example: lot_size = 1 SUI → quantities must be multiples of 1 SUI

**Min Size:**
- Minimum order size
- Example: min_size = 10 SUI → orders must be at least 10 SUI

**Stable Pool:**
- true: Stablecoin pairs (USDC/USDT)
- false: Volatile pairs (SUI/USDC)
- Lower fees for stable pools

---

## 6. DEEP Token & Governance

### 6.1 DEEP Staking

**Stake DEEP in a pool:**
```move
use deepbook::pool::Pool;
use deepbook::balance_manager::BalanceManager;
use token::deep::DEEP;

public fun stake_deep(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    deep_amount: Coin<DEEP>,
    ctx: &mut TxContext,
) {
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    pool::stake(
        pool,
        balance_manager,
        &trade_proof,
        deep_amount,
        ctx,
    );
}
```

**Benefits:**
- Staked taker fees: 0.25 bps (stable) / 2.5 bps (volatile)
- Maker rebates (if stake > stake_required)
- Governance voting rights

### 6.2 Governance Proposals

**Submit proposal:**
```move
public fun propose_fee_change(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    new_taker_fee: u64,
    new_maker_fee: u64,
    new_stake_required: u64,
    ctx: &mut TxContext,
) {
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    pool::submit_proposal(
        pool,
        balance_manager,
        &trade_proof,
        new_taker_fee,
        new_maker_fee,
        new_stake_required,
        ctx,
    );
}
```

**Vote on proposal:**
```move
public fun vote_on_proposal(
    pool: &mut Pool<SUI, USDC>,
    balance_manager: &mut BalanceManager,
    proposal_id: u64,
    ctx: &mut TxContext,
) {
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    pool::vote(
        pool,
        balance_manager,
        &trade_proof,
        proposal_id,
        ctx,
    );
}
```

**Quorum:**
- Proposal geçmesi için 1/2 of total staked DEEP gerekir
- Geçen proposal next epoch'tan itibaren aktif olur

---

## 7. DeFi Use Cases

### 7.1 DEX Aggregator

DeepBook'u routing algoritmanıza dahil edin:

```typescript
// Price comparison
const deepbookPrice = await dbClient.getLevel2Range({
  poolKey: "SUI_USDC",
  priceLow: 0,
  priceHigh: 999999,
  isBid: false, // Ask orders
});

const bestAsk = deepbookPrice[0]?.price;

// Compare with other DEXes and route to best price
if (bestAsk < otherDexPrice) {
  // Route to DeepBook
  await executeDeepBookSwap();
} else {
  // Route to other DEX
  await executeOtherDexSwap();
}
```

### 7.2 Market Making Bot

```typescript
import { Transaction } from "@mysten/sui/transactions";

async function marketMakingStrategy() {
  // Get current mid price
  const bids = await dbClient.getLevel2Range({
    poolKey: "SUI_USDC",
    priceLow: 0,
    priceHigh: 999999,
    isBid: true,
  });

  const asks = await dbClient.getLevel2Range({
    poolKey: "SUI_USDC",
    priceLow: 0,
    priceHigh: 999999,
    isBid: false,
  });

  const midPrice = (bids[0].price + asks[0].price) / 2;

  // Place orders on both sides
  const tx = new Transaction();

  // Buy order 0.5% below mid
  dbClient.trade.placeLimitOrder({
    balanceManagerKey: BALANCE_MANAGER_ID,
    poolKey: "SUI_USDC",
    clientOrderId: Date.now(),
    price: midPrice * 0.995,
    quantity: 100,
    isBid: true,
    expirationTimestamp: 0,
  })(tx);

  // Sell order 0.5% above mid
  dbClient.trade.placeLimitOrder({
    balanceManagerKey: BALANCE_MANAGER_ID,
    poolKey: "SUI_USDC",
    clientOrderId: Date.now() + 1,
    price: midPrice * 1.005,
    quantity: 100,
    isBid: false,
    expirationTimestamp: 0,
  })(tx);

  await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
}

// Run every 10 seconds
setInterval(marketMakingStrategy, 10000);
```

### 7.3 Arbitrage Bot

```typescript
async function arbitrageStrategy() {
  // Get DeepBook price
  const dbAsks = await dbClient.getLevel2Range({
    poolKey: "SUI_USDC",
    priceLow: 0,
    priceHigh: 999999,
    isBid: false,
  });

  const dbPrice = dbAsks[0].price;

  // Get external CEX price (e.g., Binance)
  const cexPrice = await getBinancePrice("SUIUSDC");

  // Arbitrage opportunity
  if (cexPrice > dbPrice * 1.005) {
    // Buy on DeepBook, sell on CEX
    const tx = new Transaction();

    dbClient.trade.placeMarketOrder({
      balanceManagerKey: BALANCE_MANAGER_ID,
      poolKey: "SUI_USDC",
      clientOrderId: Date.now(),
      quantity: 1000, // 1000 SUI
      isBid: true,    // Buy
    })(tx);

    await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    // Then sell on CEX...
  }
}
```

### 7.4 Lending Protocol Integration

DeepBook'u liquidation için kullanın:

```move
use deepbook::pool::{Self, Pool};

public fun liquidate_position<Collateral, Debt>(
    pool: &mut Pool<Collateral, Debt>,
    balance_manager: &mut BalanceManager,
    seized_collateral: Coin<Collateral>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<Debt> {
    // Generate proof
    let trade_proof = balance_manager::generate_proof_as_owner(
        balance_manager,
        ctx,
    );

    // Market sell seized collateral
    let order_info = pool::place_market_order(
        pool,
        balance_manager,
        &trade_proof,
        0,
        constants::cancel_oldest(),
        seized_collateral.value(),
        false, // Sell
        true,
        clock,
        ctx,
    );

    // Withdraw received debt tokens
    balance_manager::withdraw<Debt>(
        balance_manager,
        order_info.base_quantity_filled(),
        ctx,
    )
}
```

### 7.5 Stop-Loss / Take-Profit Orders

Frontend'de conditional order logic:

```typescript
async function monitorStopLoss(
  targetPrice: number,
  quantity: number,
  isBid: boolean,
) {
  while (true) {
    const currentPrice = await getCurrentPrice();

    if (
      (isBid && currentPrice <= targetPrice) ||
      (!isBid && currentPrice >= targetPrice)
    ) {
      // Trigger stop-loss
      const tx = new Transaction();

      dbClient.trade.placeMarketOrder({
        balanceManagerKey: BALANCE_MANAGER_ID,
        poolKey: "SUI_USDC",
        clientOrderId: Date.now(),
        quantity: quantity,
        isBid: isBid,
      })(tx);

      await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
      });

      break;
    }

    await sleep(1000); // Check every second
  }
}
```

---

## 8. Constants & Order Types

### 8.1 Order Types

```move
use deepbook::constants;

// POST_ONLY: Only maker order, never taker
constants::post_only()

// IMMEDIATE_OR_CANCEL: Fill immediately or cancel
constants::immediate_or_cancel()

// FILL_OR_KILL: Fill completely or cancel entirely
constants::fill_or_kill()

// NO_RESTRICTION: Can be both maker and taker
constants::no_restriction()
```

### 8.2 Self-Matching Options

```move
// CANCEL_MAKER: Cancel the maker order
constants::cancel_maker()

// CANCEL_TAKER: Cancel the taker order
constants::cancel_taker()

// CANCEL_BOTH: Cancel both orders
constants::cancel_both()

// CANCEL_OLDEST: Cancel the older order
constants::cancel_oldest()
```

### 8.3 Price Limits

```move
// Maximum price
constants::max_price()

// Minimum price
constants::min_price()
```

---

## 9. Events

### 9.1 Order Events

DeepBook emits events for tracking:

**OrderPlaced:**
```typescript
{
  pool_id: string,
  order_id: string,
  client_order_id: number,
  trader: string,
  price: number,
  quantity: number,
  is_bid: boolean,
  timestamp: number,
}
```

**OrderFilled:**
```typescript
{
  pool_id: string,
  maker_order_id: string,
  taker_order_id: string,
  maker_address: string,
  taker_address: string,
  price: number,
  quantity: number,
  maker_fee: number,
  taker_fee: number,
  timestamp: number,
}
```

**OrderCancelled:**
```typescript
{
  pool_id: string,
  order_id: string,
  trader: string,
  timestamp: number,
}
```

### 9.2 Event Listening

```typescript
import { SuiClient } from "@mysten/sui/client";

const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

// Subscribe to events
const unsubscribe = await client.subscribeEvent({
  filter: {
    MoveEventType: `${DEEPBOOK_PACKAGE_ID}::pool::OrderFilled`,
  },
  onMessage: (event) => {
    console.log("Order filled:", event.parsedJson);

    // Your trading logic
    handleOrderFilled(event.parsedJson);
  },
});
```

---

## 10. Best Practices

### 10.1 Gas Optimization

**Batch operations in PTB:**
```typescript
const tx = new Transaction();

// Multiple deposits in one transaction
dbClient.balanceManager.deposit({
  balanceManagerKey: BM_ID,
  coinKey: "SUI",
  amount: 1000000000,
})(tx);

dbClient.balanceManager.deposit({
  balanceManagerKey: BM_ID,
  coinKey: "DEEP",
  amount: 5000000000,
})(tx);

// Place multiple orders
dbClient.trade.placeLimitOrder({
  balanceManagerKey: BM_ID,
  poolKey: "SUI_USDC",
  price: 2.5,
  quantity: 100,
  isBid: true,
})(tx);

dbClient.trade.placeLimitOrder({
  balanceManagerKey: BM_ID,
  poolKey: "SUI_USDC",
  price: 2.6,
  quantity: 100,
  isBid: false,
})(tx);

// Execute all in one transaction
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

### 10.2 Error Handling

```typescript
try {
  const tx = new Transaction();

  dbClient.trade.placeMarketOrder({
    balanceManagerKey: BALANCE_MANAGER_ID,
    poolKey: "SUI_USDC",
    quantity: 1000,
    isBid: true,
  })(tx);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  console.log("Success:", result.digest);
} catch (error) {
  if (error.message.includes("EBalanceManagerBalanceTooLow")) {
    console.error("Insufficient balance in BalanceManager");
  } else if (error.message.includes("EMinimumQuantityOutNotMet")) {
    console.error("Slippage too high");
  } else {
    console.error("Unknown error:", error);
  }
}
```

### 10.3 Price Precision

```typescript
// Always use proper decimal precision
const USDC_DECIMALS = 6;
const SUI_DECIMALS = 9;

// Price: 2.5 USDC per SUI
const price = 2.5;

// Convert to native units for contract
const priceInNative = price * Math.pow(10, USDC_DECIMALS - SUI_DECIMALS);
// = 2.5 * 10^-3 = 0.0025 (in contract terms)
```

### 10.4 Slippage Protection

```typescript
// For swaps, always set minOut
const expectedOutput = 100 * 2.5; // 100 SUI * 2.5 USDC/SUI = 250 USDC
const slippageTolerance = 0.01;   // 1%
const minOut = expectedOutput * (1 - slippageTolerance);

dbClient.trade.swapExactBaseForQuote({
  poolKey: "SUI_USDC",
  baseCoinKey: "SUI",
  quoteCoinKey: "USDC",
  deepCoinKey: "DEEP",
  amount: 100000000000,
  minOut: minOut * Math.pow(10, 6), // Convert to USDC decimals
})(tx);
```

---

## 11. Testnet Resources

### 11.1 Testnet Adresleri

**DeepBook Package:**
```
Testnet: 0x...
Mainnet: Check official docs
```

**DEEP Token:**
```
Testnet: 0x...
Mainnet: Check official docs
```

### 11.2 Faucet

**SUI Faucet:**
```bash
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'
```

**DEEP Token Faucet:**
- DeepBook Discord: Testnet faucet kanalı

### 11.3 Test Pools

```
SUI/USDC: 0x...
DEEP/SUI: 0x...
DEEP/USDC: 0x...
```

---

## 12. Kaynaklar

**Resmi Dökümanlar:**
- Contract Documentation: https://docs.sui.io/standards/deepbookv3
- SDK Documentation: https://docs.sui.io/standards/deepbookv3-sdk
- Whitepaper: https://cdn.prod.website-files.com/65fdccb65290aeb1c597b611/66059b44041261e3fe4a330d_deepbook_whitepaper.pdf

**GitHub:**
- Main Repo: https://github.com/MystenLabs/deepbookv3
- SDK Examples: https://github.com/MystenLabs/ts-sdks/tree/main/packages/deepbook-v3/examples
- Unofficial Rust SDK: https://github.com/hoh-zone/sui-deepbookv3

**Community:**
- DeepBook Discord
- Sui Developer Forum

---

## Özet

DeepBook V3, Sui üzerinde profesyonel seviyede bir DEX altyapısı sunar:

✅ **Central Limit Order Book**: Geleneksel exchange deneyimi
✅ **Düşük Fees**: DEEP staking ile 0.25-2.5 bps
✅ **Maker Rebates**: Likidite sağlayıcılar kazanır
✅ **BalanceManager**: Tek hesapla tüm pool'larda trade
✅ **Direct Swaps**: BalanceManager olmadan da kullanılabilir
✅ **Governance**: DEEP holder'lar pool parametrelerini kontrol eder
✅ **TypeScript SDK**: Kolay entegrasyon

Hackathon projelerinizde DeepBook'u kullanarak güçlü trading özellikleri ekleyebilirsiniz!
