# Access On-Chain Time

URL: https://docs.sui.io/guides/developer/sui-101/access-time

You have several options for accessing network-based time for your transactions. If you need a near real-time measurement (within a few seconds), use the immutable reference of time provided by the `Clock` module in Move. The reference value from this module updates with every network checkpoint. If you don't need as current a time slice, use the `epoch_timestamp_ms` function to capture the precise moment the current epoch started.

## The `sui::clock::Clock` module

To access a current timestamp, you must pass a read-only reference of `sui::clock::Clock` as an entry function parameter in your transactions. Sui provides an instance of `Clock` at address `0x6` . You cannot create new instances.

Use the `timestamp_ms` function from the `sui::clock` module to extract a unix timestamp in milliseconds.

[crates/sui-framework/packages/sui-framework/sources/clock.move](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/clock.move)

```move
public fun timestamp_ms(clock: &Clock): u64 {
    clock.timestamp_ms
}
```

The example below demonstrates an entry function that emits an event containing a timestamp from the `Clock` :

[examples/move/basics/sources/clock.move](https://github.com/MystenLabs/sui/blob/main/examples/move/basics/sources/clock.move)

```move
module basics::clock;

use sui::clock::Clock;
use sui::event;

public struct TimeEvent has copy, drop, store {
    timestamp_ms: u64,
}

entry fun access(clock: &Clock) {
    event::emit(TimeEvent { timestamp_ms: clock.timestamp_ms() });
}
```

Call the previous entry function with the following format, passing `0x6` as the address for the `Clock` parameter:

tip
Beginning with the Sui `v1.24.1`[release](https://github.com/MystenLabs/sui/releases/tag/mainnet-v1.24.1) , the `--gas-budget` option is no longer required for CLI commands.

```sh
$ sui client call --package <EXAMPLE> --module 'clock' --function 'access' --args '0x6' --gas-budget <GAS-AMOUNT>
```

Expect the `Clock` timestamp to change at the rate the network generates checkpoints, which is about **every 1/4 second** with Mysticeti consensus. Find the current network checkpoint rate on this [public dashboard](https://metrics.sui.io/public-dashboards/4ceb11cc210d4025b122294586961169) .

Successive calls to `sui::clock::timestamp_ms` in the same transaction always produce the same result (transactions take effect instantly), but timestamps from `Clock` are otherwise monotonic across transactions that touch the same shared objects. Successive transactions see a greater or equal timestamp to their predecessors.

Any transaction that requires access to a `Clock` must go through consensus because the only available instance is a shared object. As a result, this technique is not suitable for transactions that must use the single-owner fastpath (see Epoch timestamps for a single-owner-compatible source of timestamps).

Transactions that use the clock must accept it as an **immutable reference** (not a mutable reference or value). This prevents contention, as transactions that access the `Clock` can only read it, so do not need to be sequenced relative to each other. Validators refuse to sign transactions that do not meet this requirement and packages that include entry functions that accept a `Clock` or `&mut Clock` fail to publish.

The following functions test `Clock` -dependent code by manually creating a `Clock` object and manipulating its timestamp. This is possible only in test code:

[crates/sui-framework/packages/sui-framework/sources/clock.move](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/clock.move)

```move
#[test_only]
public fun create_for_testing(ctx: &mut TxContext): Clock {
    Clock {
        id: object::new(ctx),
        timestamp_ms: 0,
    }
}

#[test_only]
public fun share_for_testing(clock: Clock) {
    transfer::share_object(clock)
}

#[test_only]
public fun increment_for_testing(clock: &mut Clock, tick: u64) {
    clock.timestamp_ms = clock.timestamp_ms + tick;
}

#[test_only]
public fun set_for_testing(clock: &mut Clock, timestamp_ms: u64) {
    assert!(timestamp_ms >= clock.timestamp_ms);
    clock.timestamp_ms = timestamp_ms;
}

#[test_only]
public fun destroy_for_testing(clock: Clock) {
    let Clock { id, timestamp_ms: _ } = clock;
    id.delete();
}
```

The next example presents a basic test that creates a `Clock` , increments it, and then checks its value:

[crates/sui-framework/packages/sui-framework/tests/clock_tests.move](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/tests/clock_tests.move)

```move
#[test_only]
module sui::clock_tests;

use sui::clock;

#[test]
fun creating_a_clock_and_incrementing_it() {
    let mut ctx = tx_context::dummy();
    let mut clock = clock::create_for_testing(&mut ctx);

    clock.increment_for_testing(42);
    assert!(clock.timestamp_ms() == 42);

    clock.set_for_testing(50);
    assert!(clock.timestamp_ms() == 50);

    clock.destroy_for_testing();
}
```

## Epoch timestamps

Use the following function from the `sui::tx_context` module to access the timestamp for the start of the current epoch for all transactions (including ones that do not go through consensus):

[crates/sui-framework/packages/sui-framework/sources/tx_context.move](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/tx_context.move)

```move
public fun epoch_timestamp_ms(_self: &TxContext): u64 {
    native_epoch_timestamp_ms()
}
```

This function returns the point in time when the current epoch started, as a millisecond granularity unix timestamp in a `u64` . This value changes roughly **once every 24 hours** , when the epoch changes.

Tests based on `sui::test_scenario` can use `later_epoch` (following code), to exercise time-sensitive code that uses `epoch_timestamp_ms` (previous code):

[crates/sui-framework/packages/sui-framework/sources/test/test_scenario.move](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/test/test_scenario.move)

```move
public fun later_epoch(
    scenario: &mut Scenario,
    delta_ms: u64,
    sender: address,
): TransactionEffects {
    scenario.ctx.increment_epoch_timestamp(delta_ms);
    next_epoch(scenario, sender)
}
```

`later_epoch` behaves like `sui::test_scenario::next_epoch` (finishes the current transaction and epoch in the test scenario), but also increments the timestamp by `delta_ms` milliseconds to simulate the progress of time.