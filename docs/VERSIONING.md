# Package Versioning & Upgrades - DeFi Hackathon Rehberi

Sui'de smart contract'ları upgrade etmek, evolving DeFi protokolleri için kritik bir özelliktir. Bu döküman, safe upgrade patterns ve versioned shared objects kullanımını açıklar.

---

## 1. Neden Package Upgrades?

### 1.1 Immutability vs Upgradeability

**Blockchain'de Immutability:**
- ✅ Security: Kod değiştirilemez
- ✅ Trust: Kullanıcılar kodu inceleyebilir
- ❌ Bug fixes: Hatalar düzeltilemez
- ❌ New features: Yeni özellikler eklenemez

**Sui's Solution: Controlled Upgrades**
- Kod immutable kalır (eski sürümler değişmez)
- Yeni versiyon publish edilir
- Kullanıcılar yeni versiyona migrate olur
- Eski version hala erişilebilir (transparency)

### 1.2 Real-World Use Cases

**DeFi Protokol Geliştirme:**
```
V1: Basic swap pool → Launch
V2: Add liquidity mining → Upgrade
V3: Add multi-hop routing → Upgrade
V4: Add oracle integration → Upgrade
```

**Bug Fixes:**
```
V1: Security vulnerability found → Emergency upgrade
V2: Fixed vulnerability + improved logic
```

---

## 2. Versioned Shared Objects Pattern

### 2.1 Version Shared Object

**`version.move`:**
```move
module my_protocol::version;

use sui::package::Publisher;

/// Shared object tracking current version
public struct Version has key {
    id: UID,
    version: u64,
}

const EInvalidPackageVersion: u64 = 0;
const EInvalidPublisher: u64 = 1;

// Current version constant
const VERSION: u64 = 2;

// Initialize version object
fun init(ctx: &mut TxContext) {
    transfer::share_object(Version {
        id: object::new(ctx),
        version: VERSION,
    })
}

// Check if using latest version
public fun check_is_valid(self: &Version) {
    assert!(self.version == VERSION, EInvalidPackageVersion);
}

// Migrate version object to new version
public fun migrate(publisher: &Publisher, version: &mut Version) {
    assert!(publisher.from_package<Version>(), EInvalidPublisher);
    version.version = VERSION;
}
```

### 2.2 Version Check in Functions

**Force users to use latest version:**
```move
module my_protocol::dex;

use my_protocol::version::Version;

public fun swap(
    pool: &mut Pool,
    version: &Version,  // ← Version check
    coin_in: Coin<TokenA>,
    ctx: &mut TxContext,
): Coin<TokenB> {
    // Abort if not latest version
    version.check_is_valid();

    // Swap logic
    // ...
}
```

**Benefits:**
- ✅ Users forced to use latest (safest) version
- ✅ Old functions automatically deprecated
- ✅ No need to manually deprecate each function

---

## 3. Upgrade Workflow

### 3.1 Step-by-Step Upgrade Process

**Step 1: Update VERSION constant**
```move
// version.move V1
const VERSION: u64 = 1;

// version.move V2
const VERSION: u64 = 2;  // ← Increment
```

**Step 2: Publish new package**
```bash
sui client upgrade --upgrade-capability UPGRADE_CAP_ID
```

**Step 3: Migrate Version object**
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${NEW_PACKAGE_ID}::version::migrate`,
  arguments: [
    tx.object(PUBLISHER_ID),
    tx.object(VERSION_OBJECT_ID),
  ],
});

await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
});
```

**Step 4: Users automatically use new version**
```move
// Old package V1 functions now abort
version.check_is_valid(); // ← Aborts because version=2 now

// New package V2 functions work
version.check_is_valid(); // ← Passes
```

### 3.2 Migration Example: Hero NFT

**V1: Free minting**
```move
module game::hero;

public fun mint_hero(version: &Version, ctx: &mut TxContext): Hero {
    version.check_is_valid();
    Hero {
        id: object::new(ctx),
        health: 100,
        stamina: 10,
    }
}
```

**V2: Paid minting**
```move
module game::hero;

use sui::coin::{Self, Coin};
use sui::sui::SUI;

const EUseMintHeroV2Instead: u64 = 2;
const EInvalidPrice: u64 = 3;
const HERO_PRICE: u64 = 5_000_000_000; // 5 SUI

// V1 function deprecated
public fun mint_hero(version: &Version, ctx: &mut TxContext): Hero {
    abort(EUseMintHeroV2Instead)
}

// V2 function with payment
public fun mint_hero_v2(
    version: &Version,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
): Hero {
    version.check_is_valid();

    // Check payment
    assert!(payment.value() == HERO_PRICE, EInvalidPrice);

    // Transfer payment to protocol
    transfer::public_transfer(payment, TREASURY_ADDRESS);

    // Mint hero
    Hero {
        id: object::new(ctx),
        health: 100,
        stamina: 10,
    }
}
```

---

## 4. DeFi Upgrade Patterns

### 4.1 Pool Parameter Updates

**V1: Fixed fees**
```move
public struct Pool has key {
    id: UID,
    fee: u64, // Fixed at 30 bps
}

const FEE_BPS: u64 = 30;

public fun swap(pool: &mut Pool, version: &Version, ...) {
    version.check_is_valid();
    let fee = calculate_fee(amount, FEE_BPS);
    // ...
}
```

**V2: Configurable fees**
```move
public struct Pool has key {
    id: UID,
    fee_bps: u64, // ← Now stored in pool
}

// Admin function to update fees
public fun update_fee(
    pool: &mut Pool,
    admin_cap: &AdminCap,
    new_fee_bps: u64,
) {
    pool.fee_bps = new_fee_bps;
}

public fun swap(pool: &mut Pool, version: &Version, ...) {
    version.check_is_valid();
    let fee = calculate_fee(amount, pool.fee_bps);
    // ...
}
```

### 4.2 New Feature: Liquidity Mining

**V1: No rewards**
```move
public fun add_liquidity(
    pool: &mut Pool,
    version: &Version,
    coin_a: Coin<A>,
    coin_b: Coin<B>,
    ctx: &mut TxContext,
): LPToken {
    version.check_is_valid();
    // Add liquidity logic
    // No rewards
}
```

**V2: With rewards tracking**
```move
use sui::dynamic_field as df;

public struct UserRewards has store {
    lp_amount: u64,
    reward_debt: u64,
}

public fun add_liquidity_v2(
    pool: &mut Pool,
    version: &Version,
    coin_a: Coin<A>,
    coin_b: Coin<B>,
    ctx: &mut TxContext,
): LPToken {
    version.check_is_valid();

    let lp_amount = calculate_lp_amount(coin_a.value(), coin_b.value());
    let user = ctx.sender();

    // Track user rewards
    if (df::exists_(&pool.id, user)) {
        let rewards = df::borrow_mut<address, UserRewards>(&mut pool.id, user);
        rewards.lp_amount = rewards.lp_amount + lp_amount;
        rewards.reward_debt = calculate_reward_debt(rewards.lp_amount);
    } else {
        df::add(&mut pool.id, user, UserRewards {
            lp_amount,
            reward_debt: 0,
        });
    };

    // Add liquidity
    // ...
}

// New function in V2
public fun claim_rewards(
    pool: &mut Pool,
    version: &Version,
    ctx: &mut TxContext,
): Coin<REWARD_TOKEN> {
    version.check_is_valid();

    let user = ctx.sender();
    let rewards = df::borrow_mut<address, UserRewards>(&mut pool.id, user);

    let pending = calculate_pending_rewards(rewards);
    rewards.reward_debt = calculate_reward_debt(rewards.lp_amount);

    mint_rewards(pending, ctx)
}
```

### 4.3 Security Fix Example

**V1: Reentrancy vulnerability**
```move
public fun withdraw(
    vault: &mut Vault,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    // ❌ Vulnerable: External call before state update
    let coin = vault.balance.split(amount).into_coin(ctx);

    // State update after external call
    vault.user_balance[ctx.sender()] -= amount;

    coin
}
```

**V2: Fixed vulnerability**
```move
public fun withdraw_v2(
    vault: &mut Vault,
    version: &Version,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    version.check_is_valid();

    // ✅ State update first
    vault.user_balance[ctx.sender()] -= amount;

    // Then external call
    vault.balance.split(amount).into_coin(ctx)
}

// Deprecate old function
public fun withdraw(vault: &mut Vault, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    abort(EUseWithdrawV2Instead)
}
```

---

## 5. Publisher & UpgradeCap

### 5.1 Publisher Object

**Claim publisher in init:**
```move
module my_protocol::main;

public struct MAIN has drop {}

fun init(otw: MAIN, ctx: &mut TxContext) {
    // Claim publisher
    package::claim_and_keep(otw, ctx);
    // Publisher transferred to sender
}
```

**Verify package ownership:**
```move
use sui::package::Publisher;

public fun migrate(
    publisher: &Publisher,
    version: &mut Version,
) {
    // Verify publisher belongs to this package
    assert!(publisher.from_package<Version>(), EInvalidPublisher);

    // Update version
    version.version = VERSION;
}
```

### 5.2 UpgradeCap

**Stored after initial publish:**
```move
// After `sui client publish`
// UpgradeCap is transferred to publisher address
```

**Use for upgrades:**
```bash
# Upgrade package
sui client upgrade \
  --upgrade-capability UPGRADE_CAP_ID \
  --gas-budget 100000000
```

---

## 6. TypeScript Integration

### 6.1 Check Package Version

```typescript
import { SuiClient } from "@mysten/sui/client";

async function checkVersion(client: SuiClient, versionObjectId: string) {
  const versionObj = await client.getObject({
    id: versionObjectId,
    options: { showContent: true },
  });

  const version = (versionObj.data?.content as any).fields.version;
  console.log("Current version:", version);

  return version;
}
```

### 6.2 Migrate Version Object

```typescript
import { Transaction } from "@mysten/sui/transactions";

async function migrateVersion(
  publisherId: string,
  versionObjectId: string,
  newPackageId: string,
) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${newPackageId}::version::migrate`,
    arguments: [
      tx.object(publisherId),
      tx.object(versionObjectId),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  console.log("Migration digest:", result.digest);
}
```

### 6.3 Call Versioned Functions

```typescript
async function swapWithVersion(
  poolId: string,
  versionObjectId: string,
  coinIn: string,
) {
  const tx = new Transaction();

  // Version object passed as argument
  const [coinOut] = tx.moveCall({
    target: `${PACKAGE_ID}::dex::swap`,
    arguments: [
      tx.object(poolId),
      tx.object(versionObjectId),  // ← Version check
      tx.object(coinIn),
    ],
    typeArguments: [TOKEN_A, TOKEN_B],
  });

  tx.transferObjects([coinOut], tx.pure.address(address));

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  return result;
}
```

---

## 7. Best Practices

### 7.1 Version Management

**✅ Do:**
```move
// Always increment VERSION
const VERSION: u64 = 3; // V1 → V2 → V3

// Use semantic versioning in comments
// V1.0.0 → V2.0.0 (breaking changes)
// V2.0.0 → V2.1.0 (new features)
// V2.1.0 → V2.1.1 (bug fixes)
```

**❌ Don't:**
```move
// Never decrement or skip versions
const VERSION: u64 = 1; // V2 → V1 ❌
const VERSION: u64 = 5; // V2 → V5 (skip 3, 4) ❌
```

### 7.2 Migration Safety

**✅ Safe migration:**
```move
// Verify publisher
assert!(publisher.from_package<Version>(), EInvalidPublisher);

// Update version atomically
version.version = VERSION;

// Emit migration event
event::emit(VersionMigrated {
    old_version: old_version,
    new_version: VERSION,
    timestamp: clock.timestamp_ms(),
});
```

**❌ Unsafe:**
```move
// No publisher check ❌
version.version = VERSION;

// No event ❌
```

### 7.3 Deprecation Strategy

**Explicit deprecation:**
```move
const EDeprecated: u64 = 999;

public fun old_function(...) {
    abort(EDeprecated)
}
```

**Graceful deprecation:**
```move
const EUseNewFunction: u64 = 100;

public fun old_function(...) {
    // Allow for 30 days
    if (clock.timestamp_ms() > DEPRECATION_DATE) {
        abort(EUseNewFunction);
    };

    // Old logic still works temporarily
    // ...
}
```

### 7.4 Testing Upgrades

```move
#[test]
fun test_version_upgrade() {
    let mut scenario = test_scenario::begin(@admin);

    // V1: Deploy version 1
    {
        version::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(@user);

    // V1: Use version 1
    {
        let version = scenario.take_shared<Version>();
        assert!(version.version() == 1);
        test_scenario::return_shared(version);
    };

    scenario.next_tx(@admin);

    // V2: Migrate to version 2
    {
        let mut version = scenario.take_shared<Version>();
        let publisher = scenario.take_from_sender<Publisher>();

        version::migrate(&publisher, &mut version);
        assert!(version.version() == 2);

        test_scenario::return_shared(version);
        test_scenario::return_to_sender(&scenario, publisher);
    };

    scenario.next_tx(@user);

    // V2: Check new version works
    {
        let version = scenario.take_shared<Version>();
        version.check_is_valid(); // Should pass
        test_scenario::return_shared(version);
    };

    scenario.end();
}
```

---

## 8. Common Patterns

### 8.1 Feature Flags

```move
public struct PoolConfig has store {
    liquidity_mining_enabled: bool,
    flashloans_enabled: bool,
    oracle_integration_enabled: bool,
}

public fun enable_feature(
    pool: &mut Pool,
    admin_cap: &AdminCap,
    feature: u8,
) {
    if (feature == LIQUIDITY_MINING) {
        pool.config.liquidity_mining_enabled = true;
    } else if (feature == FLASHLOANS) {
        pool.config.flashloans_enabled = true;
    }
    // ...
}
```

### 8.2 Gradual Rollout

```move
public struct RolloutConfig has store {
    enabled_for: VecSet<address>,
    public_launch_date: u64,
}

public fun new_feature(
    config: &RolloutConfig,
    clock: &Clock,
    ctx: &TxContext,
) {
    let user = ctx.sender();
    let now = clock.timestamp_ms();

    // Check if feature available
    let available = config.enabled_for.contains(&user)
        || now >= config.public_launch_date;

    assert!(available, EFeatureNotAvailable);

    // New feature logic
    // ...
}
```

### 8.3 Emergency Pause

```move
public struct Pool has key {
    id: UID,
    paused: bool,
}

public fun pause(pool: &mut Pool, admin_cap: &AdminCap) {
    pool.paused = true;
}

public fun unpause(pool: &mut Pool, admin_cap: &AdminCap) {
    pool.paused = false;
}

public fun swap(pool: &mut Pool, version: &Version, ...) {
    version.check_is_valid();
    assert!(!pool.paused, EPoolPaused);

    // Swap logic
    // ...
}
```

---

## 9. Upgrade Checklist

### Pre-Upgrade
- [ ] Increment VERSION constant
- [ ] Test all new functions
- [ ] Test migration function
- [ ] Review breaking changes
- [ ] Document changes
- [ ] Prepare migration script

### During Upgrade
- [ ] Publish new package
- [ ] Verify package ID
- [ ] Call migrate() on Version object
- [ ] Verify version updated
- [ ] Test new functions on testnet
- [ ] Monitor for errors

### Post-Upgrade
- [ ] Announce upgrade to users
- [ ] Update frontend to use new package
- [ ] Deprecate old documentation
- [ ] Monitor adoption metrics
- [ ] Prepare for next upgrade

---

## 10. Example: Full Upgrade Flow

**Initial Deploy (V1):**
```bash
# Publish V1
sui client publish --gas-budget 100000000

# Note: Package ID, UpgradeCap ID, Version Object ID
```

**Upgrade to V2:**

1. **Update code:**
```move
// version.move
const VERSION: u64 = 2; // Was 1

// dex.move
public fun swap_v2(...) { /* new logic */ }
```

2. **Upgrade package:**
```bash
sui client upgrade --upgrade-capability UPGRADE_CAP_ID --gas-budget 100000000
```

3. **Migrate version:**
```typescript
const tx = new Transaction();
tx.moveCall({
  target: `${NEW_PACKAGE_ID}::version::migrate`,
  arguments: [tx.object(PUBLISHER_ID), tx.object(VERSION_ID)],
});
await client.signAndExecuteTransaction({ transaction: tx, signer: keypair });
```

4. **Verify:**
```typescript
const version = await checkVersion(client, VERSION_ID);
console.log("Version:", version); // Should be 2
```

---

## Özet

Package versioning, DeFi protokollerinin evriminde kritik:

✅ **Versioned Shared Objects**: Version tracking
✅ **Safe Migration**: Publisher verification
✅ **Automatic Deprecation**: Old functions abort
✅ **Controlled Upgrades**: User migration flow
✅ **Backward Compatibility**: Old objects still work

Hackathon'da versioning kullanarak sürdürülebilir DeFi protokolleri yazabilirsiniz!
