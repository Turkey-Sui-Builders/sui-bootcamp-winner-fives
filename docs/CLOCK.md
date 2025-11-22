# Clock & Timestamp - DeFi Hackathon Rehberi

Sui'de `Clock` object, on-chain timestamp yönetimi için kullanılır. Time-locked işlemler, vesting, auction deadlines ve daha fazlası için kritik bir özelliktir.

---

## 1. Clock Nedir?

### 1.1 Sui Clock Object

**`sui::clock::Clock`:**
- Sui network tarafından maintain edilen shared object
- Her epoch'ta güncellenir
- Millisecond precision (ms)
- Single source of truth for time

**Özellikler:**
- ✅ Deterministic: Aynı transaction her node'da aynı timestamp görür
- ✅ Monotonic: Timestamp asla geriye gitmez
- ✅ Shared object: Tüm module'lar kullanabilir
- ❌ Real-time değil: Epoch boundaries'de güncellenir

### 1.2 Clock Object ID

**Mainnet & Testnet:**
```move
const CLOCK_ID: address = @0x6;
```

**Accessing Clock:**
```move
use sui::clock::Clock;

public fun my_function(clock: &Clock, ...) {
    let timestamp_ms = clock.timestamp_ms();
    // Use timestamp
}
```

---

## 2. Basic Clock Usage

### 2.1 Get Current Timestamp

```move
use sui::clock::{Self, Clock};

public fun get_current_time(clock: &Clock): u64 {
    clock.timestamp_ms()
}

// Example usage
public fun example(clock: &Clock) {
    let now = clock.timestamp_ms();
    // now = 1735689600000 (milliseconds since epoch)
}
```

### 2.2 Time-based Conditions

```move
const ONE_DAY_MS: u64 = 86_400_000; // 24 * 60 * 60 * 1000

public struct TimeLock has key {
    id: UID,
    unlock_time: u64,
    amount: u64,
}

public fun create_timelock(
    amount: u64,
    lock_duration_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    let unlock_time = now + lock_duration_ms;

    let timelock = TimeLock {
        id: object::new(ctx),
        unlock_time,
        amount,
    };

    transfer::transfer(timelock, ctx.sender());
}

public fun unlock(
    timelock: TimeLock,
    clock: &Clock,
    ctx: &TxContext,
): u64 {
    let now = clock.timestamp_ms();

    // Check if unlocked
    assert!(now >= timelock.unlock_time, EStillLocked);

    let TimeLock { id, unlock_time: _, amount } = timelock;
    id.delete();

    amount
}
```

---

## 3. DeFi Use Cases

### 3.1 Vesting Schedule

```move
use sui::clock::Clock;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};

public struct VestingWallet has key {
    id: UID,
    beneficiary: address,
    total_amount: u64,
    released_amount: u64,
    start_time: u64,
    duration_ms: u64,
    balance: Balance<SUI>,
}

const EVESTING_NOT_STARTED: u64 = 0;
const ENO_TOKENS_TO_RELEASE: u64 = 1;

// Create vesting wallet
public fun create_vesting(
    beneficiary: address,
    vesting_amount: Coin<SUI>,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let total = vesting_amount.value();

    let wallet = VestingWallet {
        id: object::new(ctx),
        beneficiary,
        total_amount: total,
        released_amount: 0,
        start_time: clock.timestamp_ms(),
        duration_ms,
        balance: vesting_amount.into_balance(),
    };

    transfer::share_object(wallet);
}

// Calculate vested amount
public fun vested_amount(wallet: &VestingWallet, clock: &Clock): u64 {
    let now = clock.timestamp_ms();

    if (now < wallet.start_time) {
        return 0
    };

    let elapsed = now - wallet.start_time;

    if (elapsed >= wallet.duration_ms) {
        // Fully vested
        wallet.total_amount
    } else {
        // Linearly vested
        (wallet.total_amount * elapsed) / wallet.duration_ms
    }
}

// Release vested tokens
public fun release(
    wallet: &mut VestingWallet,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<SUI> {
    let now = clock.timestamp_ms();
    assert!(now >= wallet.start_time, EVESTING_NOT_STARTED);

    let vested = vested_amount(wallet, clock);
    let releasable = vested - wallet.released_amount;

    assert!(releasable > 0, ENO_TOKENS_TO_RELEASE);

    wallet.released_amount = wallet.released_amount + releasable;

    wallet.balance.split(releasable).into_coin(ctx)
}
```

### 3.2 Auction System

```move
public struct Auction has key {
    id: UID,
    item: Item,
    seller: address,
    highest_bid: u64,
    highest_bidder: Option<address>,
    end_time: u64,
    ended: bool,
}

const EAUCTION_ENDED: u64 = 0;
const EAUCTION_NOT_ENDED: u64 = 1;
const EBID_TOO_LOW: u64 = 2;

// Create auction
public fun create_auction(
    item: Item,
    starting_bid: u64,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let end_time = clock.timestamp_ms() + duration_ms;

    let auction = Auction {
        id: object::new(ctx),
        item,
        seller: ctx.sender(),
        highest_bid: starting_bid,
        highest_bidder: option::none(),
        end_time,
        ended: false,
    };

    transfer::share_object(auction);
}

// Place bid
public fun bid(
    auction: &mut Auction,
    bid_amount: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();

    // Check auction not ended
    assert!(now < auction.end_time, EAUCTION_ENDED);
    assert!(!auction.ended, EAUCTION_ENDED);

    // Check bid amount
    let amount = bid_amount.value();
    assert!(amount > auction.highest_bid, EBID_TOO_LOW);

    // Return previous bid if exists
    if (auction.highest_bidder.is_some()) {
        let prev_bidder = *auction.highest_bidder.borrow();
        // Transfer previous bid back
        // (In real implementation, store bids in dynamic fields)
    };

    // Update highest bid
    auction.highest_bid = amount;
    auction.highest_bidder = option::some(ctx.sender());

    // Store bid (simplified - use dynamic fields in production)
    transfer::public_transfer(bid_amount, @treasury);
}

// End auction
public fun end_auction(
    auction: &mut Auction,
    clock: &Clock,
    ctx: &TxContext,
): Item {
    let now = clock.timestamp_ms();

    // Check auction ended
    assert!(now >= auction.end_time, EAUCTION_NOT_ENDED);
    assert!(!auction.ended, EAUCTION_ENDED);

    // Only seller can end
    assert!(ctx.sender() == auction.seller, 0);

    auction.ended = true;

    // Transfer item to winner or back to seller
    if (auction.highest_bidder.is_some()) {
        let winner = *auction.highest_bidder.borrow();
        // Transfer to winner (simplified)
    };

    // Return item (in production, handle differently)
    // This is simplified for example
    abort 0
}
```

### 3.3 Staking Rewards with Time

```move
use sui::dynamic_field as df;

public struct StakingPool has key {
    id: UID,
    total_staked: u64,
    reward_per_second: u64,
    last_update_time: u64,
    accumulated_reward_per_token: u64,
}

public struct UserStake has store {
    amount: u64,
    reward_debt: u64,
    stake_time: u64,
}

const ENOTHING_TO_CLAIM: u64 = 0;

// Stake tokens
public fun stake(
    pool: &mut StakingPool,
    amount: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    let user = ctx.sender();
    let now = clock.timestamp_ms();

    // Update pool rewards
    update_pool(pool, clock);

    if (df::exists_<address>(&pool.id, user)) {
        // Add to existing stake
        let stake = df::borrow_mut<address, UserStake>(&mut pool.id, user);
        stake.amount = stake.amount + amount;
        stake.reward_debt = (stake.amount * pool.accumulated_reward_per_token) / 1e18;
    } else {
        // New stake
        df::add(&mut pool.id, user, UserStake {
            amount,
            reward_debt: (amount * pool.accumulated_reward_per_token) / 1e18,
            stake_time: now,
        });
    };

    pool.total_staked = pool.total_staked + amount;
}

// Update pool rewards based on time
fun update_pool(pool: &mut StakingPool, clock: &Clock) {
    let now = clock.timestamp_ms();

    if (pool.total_staked == 0) {
        pool.last_update_time = now;
        return
    };

    let time_elapsed = now - pool.last_update_time;
    let reward = (time_elapsed * pool.reward_per_second) / 1000; // Convert ms to seconds

    pool.accumulated_reward_per_token =
        pool.accumulated_reward_per_token + (reward * 1e18) / pool.total_staked;

    pool.last_update_time = now;
}

// Calculate pending rewards
public fun pending_rewards(
    pool: &StakingPool,
    user: address,
    clock: &Clock,
): u64 {
    if (!df::exists_<address>(&pool.id, user)) {
        return 0
    };

    let stake = df::borrow<address, UserStake>(&pool.id, user);

    // Calculate time-based rewards
    let now = clock.timestamp_ms();
    let time_staked = now - stake.stake_time;

    let accumulated = if (pool.total_staked > 0) {
        let time_elapsed = now - pool.last_update_time;
        let reward = (time_elapsed * pool.reward_per_second) / 1000;
        pool.accumulated_reward_per_token + (reward * 1e18) / pool.total_staked
    } else {
        pool.accumulated_reward_per_token
    };

    ((stake.amount * accumulated) / 1e18) - stake.reward_debt
}

// Claim rewards
public fun claim_rewards(
    pool: &mut StakingPool,
    clock: &Clock,
    ctx: &TxContext,
): u64 {
    let user = ctx.sender();

    update_pool(pool, clock);

    let stake = df::borrow_mut<address, UserStake>(&mut pool.id, user);
    let pending = ((stake.amount * pool.accumulated_reward_per_token) / 1e18) - stake.reward_debt;

    assert!(pending > 0, ENOTHING_TO_CLAIM);

    stake.reward_debt = (stake.amount * pool.accumulated_reward_per_token) / 1e18;

    pending
}
```

### 3.4 Time-locked Governance

```move
public struct Proposal has key {
    id: UID,
    proposer: address,
    description: String,
    voting_start: u64,
    voting_end: u64,
    execution_delay: u64,
    votes_for: u64,
    votes_against: u64,
    executed: bool,
}

const EVOTING_NOT_STARTED: u64 = 0;
const EVOTING_ENDED: u64 = 1;
const EEXECUTION_DELAY_NOT_PASSED: u64 = 2;

// Create proposal
public fun create_proposal(
    description: String,
    voting_duration_ms: u64,
    execution_delay_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();

    let proposal = Proposal {
        id: object::new(ctx),
        proposer: ctx.sender(),
        description,
        voting_start: now,
        voting_end: now + voting_duration_ms,
        execution_delay: execution_delay_ms,
        votes_for: 0,
        votes_against: 0,
        executed: false,
    };

    transfer::share_object(proposal);
}

// Vote on proposal
public fun vote(
    proposal: &mut Proposal,
    support: bool,
    voting_power: u64,
    clock: &Clock,
) {
    let now = clock.timestamp_ms();

    // Check voting period
    assert!(now >= proposal.voting_start, EVOTING_NOT_STARTED);
    assert!(now < proposal.voting_end, EVOTING_ENDED);

    if (support) {
        proposal.votes_for = proposal.votes_for + voting_power;
    } else {
        proposal.votes_against = proposal.votes_against + voting_power;
    }
}

// Execute proposal (after delay)
public fun execute(
    proposal: &mut Proposal,
    clock: &Clock,
    ctx: &TxContext,
) {
    let now = clock.timestamp_ms();

    // Check voting ended
    assert!(now >= proposal.voting_end, EVOTING_ENDED);

    // Check execution delay passed
    let execution_time = proposal.voting_end + proposal.execution_delay;
    assert!(now >= execution_time, EEXECUTION_DELAY_NOT_PASSED);

    // Check not already executed
    assert!(!proposal.executed, 0);

    // Check proposal passed
    assert!(proposal.votes_for > proposal.votes_against, 0);

    proposal.executed = true;

    // Execute proposal logic
    // ...
}
```

---

## 4. Time Calculations

### 4.1 Duration Constants

```move
const ONE_SECOND_MS: u64 = 1_000;
const ONE_MINUTE_MS: u64 = 60_000;
const ONE_HOUR_MS: u64 = 3_600_000;
const ONE_DAY_MS: u64 = 86_400_000;
const ONE_WEEK_MS: u64 = 604_800_000;
const ONE_MONTH_MS: u64 = 2_592_000_000; // 30 days
const ONE_YEAR_MS: u64 = 31_536_000_000; // 365 days
```

### 4.2 Time Utilities

```move
// Check if time has passed
public fun has_passed(deadline: u64, clock: &Clock): bool {
    clock.timestamp_ms() >= deadline
}

// Calculate remaining time
public fun time_remaining(deadline: u64, clock: &Clock): u64 {
    let now = clock.timestamp_ms();
    if (now >= deadline) {
        0
    } else {
        deadline - now
    }
}

// Add duration to timestamp
public fun add_duration(timestamp: u64, duration_ms: u64): u64 {
    timestamp + duration_ms
}

// Check if in time range
public fun is_in_range(
    start: u64,
    end: u64,
    clock: &Clock,
): bool {
    let now = clock.timestamp_ms();
    now >= start && now < end
}
```

---

## 5. TypeScript Integration

### 5.1 Get Current Timestamp

```typescript
import { SuiClient } from "@mysten/sui/client";

const CLOCK_OBJECT_ID = "0x6";

async function getCurrentTimestamp(client: SuiClient): Promise<number> {
  const clock = await client.getObject({
    id: CLOCK_OBJECT_ID,
    options: { showContent: true },
  });

  const timestamp = (clock.data?.content as any).fields.timestamp_ms;
  return Number(timestamp);
}

// Usage
const now = await getCurrentTimestamp(client);
console.log("Current timestamp:", now);
console.log("Current date:", new Date(now));
```

### 5.2 Transaction with Clock

```typescript
import { Transaction } from "@mysten/sui/transactions";

const CLOCK_OBJECT_ID = "0x6";

async function createVesting(
  beneficiary: string,
  amount: number,
  durationDays: number,
) {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);

  tx.moveCall({
    target: `${PACKAGE_ID}::vesting::create_vesting`,
    arguments: [
      tx.pure.address(beneficiary),
      coin,
      tx.pure.u64(durationDays * 24 * 60 * 60 * 1000), // Convert to ms
      tx.object(CLOCK_OBJECT_ID), // ← Clock argument
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  return result;
}
```

### 5.3 Calculate Time-based Values

```typescript
// Calculate vested amount client-side
function calculateVestedAmount(
  totalAmount: number,
  startTime: number,
  durationMs: number,
  currentTime: number,
): number {
  if (currentTime < startTime) {
    return 0;
  }

  const elapsed = currentTime - startTime;

  if (elapsed >= durationMs) {
    return totalAmount;
  }

  return (totalAmount * elapsed) / durationMs;
}

// Usage
const total = 1000000000; // 1 SUI
const start = 1735689600000;
const duration = 30 * 24 * 60 * 60 * 1000; // 30 days
const now = await getCurrentTimestamp(client);

const vested = calculateVestedAmount(total, start, duration, now);
console.log("Vested amount:", vested);
```

---

## 6. Best Practices

### 6.1 Always Use Clock Reference

```move
// ✅ Good: Use Clock
public fun my_function(clock: &Clock, ...) {
    let now = clock.timestamp_ms();
}

// ❌ Bad: Never use block.timestamp or similar
// Sui doesn't have block.timestamp!
```

### 6.2 Handle Edge Cases

```move
// ✅ Good: Handle edge cases
public fun calculate_elapsed(start: u64, clock: &Clock): u64 {
    let now = clock.timestamp_ms();

    if (now < start) {
        // Handle future start time
        return 0
    };

    now - start
}

// ❌ Bad: Underflow if now < start
public fun bad_calculate(start: u64, clock: &Clock): u64 {
    let now = clock.timestamp_ms();
    now - start // ❌ Underflow error if now < start
}
```

### 6.3 Use Constants for Durations

```move
// ✅ Good: Named constants
const VESTING_DURATION: u64 = 30 * 24 * 60 * 60 * 1000; // 30 days

// ❌ Bad: Magic numbers
let duration = 2592000000; // What is this?
```

### 6.4 Emit Events with Timestamps

```move
public struct VestingCreated has copy, drop {
    beneficiary: address,
    amount: u64,
    start_time: u64,
    end_time: u64,
}

public fun create_vesting(..., clock: &Clock, ...) {
    let start = clock.timestamp_ms();
    let end = start + duration;

    event::emit(VestingCreated {
        beneficiary,
        amount,
        start_time: start,
        end_time: end,
    });

    // ...
}
```

---

## 7. Common Patterns

### 7.1 Cooldown Period

```move
use sui::dynamic_field as df;

public struct Pool has key {
    id: UID,
    cooldown_duration: u64,
}

public fun set_cooldown(pool: &mut Pool, user: address, clock: &Clock) {
    let cooldown_end = clock.timestamp_ms() + pool.cooldown_duration;
    df::add(&mut pool.id, user, cooldown_end);
}

public fun check_cooldown(pool: &Pool, user: address, clock: &Clock): bool {
    if (!df::exists_<address>(&pool.id, user)) {
        return true // No cooldown
    };

    let cooldown_end = *df::borrow<address, u64>(&pool.id, user);
    clock.timestamp_ms() >= cooldown_end
}
```

### 7.2 Expirable Offers

```move
public struct Offer has key {
    id: UID,
    item: Item,
    price: u64,
    expires_at: u64,
}

public fun create_offer(
    item: Item,
    price: u64,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let offer = Offer {
        id: object::new(ctx),
        item,
        price,
        expires_at: clock.timestamp_ms() + duration_ms,
    };

    transfer::share_object(offer);
}

public fun accept_offer(
    offer: Offer,
    payment: Coin<SUI>,
    clock: &Clock,
) {
    // Check not expired
    assert!(clock.timestamp_ms() < offer.expires_at, EOfferExpired);

    // Accept logic
    // ...
}
```

---

## Özet

Clock, Sui'de time-based logic için essential:

✅ **Timestamp Access**: `clock.timestamp_ms()`
✅ **Time-locked Contracts**: Vesting, auctions
✅ **Cooldown Periods**: Rate limiting
✅ **Governance Delays**: Security timelock
✅ **Staking Rewards**: Time-based calculations

Hackathon'da Clock kullanarak sophisticated time-based DeFi mekanizmaları yazabilirsiniz!
