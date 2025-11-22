# Dynamic Fields - DeFi Hackathon Rehberi

Dynamic Fields, Sui'de object'lere runtime'da dinamik olarak field eklemenizi sağlar. Bu, NFT attributes, user mappings, ve on-chain collections için kritik bir özelliktir.

---

## 1. Dynamic Fields Neden Gerekli?

### 1.1 Regular Fields'ın Sınırlamaları

**Problem 1: Fixed Schema**
```move
// ❌ Module publish edildikten sonra field ekleyemezsiniz
public struct User has key {
    id: UID,
    name: String,
    age: u8,
    // Yeni field eklemek için contract upgrade gerekir
}
```

**Problem 2: Large Objects = High Gas**
```move
// ❌ Çok fazla wrapped object -> büyük object size -> yüksek gas
public struct Vault has key {
    id: UID,
    nft1: NFT,
    nft2: NFT,
    nft3: NFT,
    // ... 100 NFT daha
}
```

**Problem 3: Heterogeneous Collections**
```move
// ❌ vector sadece tek tip destekler
vector<NFT>         // ✅ Sadece NFT
vector<Coin<SUI>>   // ✅ Sadece SUI Coin
vector<???>         // ❌ NFT + Coin karışık olamaz
```

### 1.2 Dynamic Fields Çözümü

✅ **Runtime'da field ekleme/silme**
✅ **Gas sadece erişildiğinde ödenir**
✅ **Heterogeneous değerler** (farklı tipler)
✅ **Arbitrary field names** (sadece identifier değil)

---

## 2. Dynamic Field Types

### 2.1 Regular Dynamic Fields

**`sui::dynamic_field`**

```move
use sui::dynamic_field as df;

// Field ekle
df::add<Name, Value>(&mut object.id, name, value);

// Field oku
let value_ref = df::borrow<Name, Value>(&object.id, name);

// Field güncelle
let value_mut = df::borrow_mut<Name, Value>(&mut object.id, name);

// Field sil
let value = df::remove<Name, Value>(&mut object.id, name);
```

**Characteristics:**
- Value `store` ability'ye sahip olmalı
- Wrapped object ID ile erişilemez (explorer'da görünmez)
- Herhangi bir value türü olabilir

### 2.2 Dynamic Object Fields

**`sui::dynamic_object_field`**

```move
use sui::dynamic_object_field as ofield;

// Object field ekle
ofield::add<Name, Value>(&mut object.id, name, value);

// Object field oku
let obj_ref = ofield::borrow<Name, Value>(&object.id, name);

// Object field sil
let obj = ofield::remove<Name, Value>(&mut object.id, name);
```

**Characteristics:**
- Value `key + store` ability'ye sahip olmalı (object)
- Object ID ile erişilebilir (explorer'da görünür)
- Sadece object'ler için

### 2.3 Karşılaştırma

| Feature | Dynamic Field | Dynamic Object Field |
|---------|---------------|---------------------|
| Value type | Any `store` | Must have `key + store` |
| External access | ❌ Wrapped, ID ile erişilemez | ✅ ID ile erişilebilir |
| Module | `sui::dynamic_field` | `sui::dynamic_object_field` |
| Use case | Primitive data, collections | NFTs, Coins, Objects |

---

## 3. Field Names

### 3.1 Name Requirements

Field name `copy + drop + store` ability'ye sahip olmalı:

**✅ Valid Names:**
```move
// Primitives
let name1: u64 = 123;
let name2: vector<u8> = b"user_balance";
let name3: address = @0x123;
let name4: bool = true;

// Custom struct
public struct UserKey has copy, drop, store {
    user: address,
    token_type: String,
}
```

**❌ Invalid Names:**
```move
// Object (has key, cannot be name)
public struct NFT has key, store { id: UID }

// No abilities
public struct BadKey { value: u64 }
```

### 3.2 Composite Keys

```move
use std::string::String;

public struct BalanceKey has copy, drop, store {
    owner: address,
    token: String,
}

public fun deposit<T>(
    pool: &mut Pool,
    owner: address,
    coin: Coin<T>,
) {
    let key = BalanceKey {
        owner,
        token: type_name::get<T>().into_string(),
    };

    if (df::exists_(&pool.id, key)) {
        let balance = df::borrow_mut<BalanceKey, Balance<T>>(&mut pool.id, key);
        balance.join(coin.into_balance());
    } else {
        df::add(&mut pool.id, key, coin.into_balance());
    }
}
```

---

## 4. Basic Usage Patterns

### 4.1 Add Dynamic Field

```move
use sui::dynamic_field as df;

public struct Container has key {
    id: UID,
}

public struct Data has store {
    value: u64,
}

public fun add_field(container: &mut Container, name: vector<u8>, data: Data) {
    df::add(&mut container.id, name, data);
}

// Usage
public fun example(container: &mut Container, ctx: &mut TxContext) {
    let data = Data { value: 100 };
    add_field(container, b"my_data", data);
}
```

### 4.2 Borrow Field (Immutable)

```move
public fun read_field(container: &Container, name: vector<u8>): u64 {
    let data = df::borrow<vector<u8>, Data>(&container.id, name);
    data.value
}

// Usage
public fun example(container: &Container) {
    let value = read_field(container, b"my_data");
    assert!(value == 100);
}
```

### 4.3 Borrow Field (Mutable)

```move
public fun increment_field(container: &mut Container, name: vector<u8>) {
    let data = df::borrow_mut<vector<u8>, Data>(&mut container.id, name);
    data.value = data.value + 1;
}

// Usage
public fun example(container: &mut Container) {
    increment_field(container, b"my_data");
    // Now value is 101
}
```

### 4.4 Remove Field

```move
public fun remove_field(container: &mut Container, name: vector<u8>): Data {
    df::remove<vector<u8>, Data>(&mut container.id, name)
}

// Usage
public fun example(container: &mut Container) {
    let Data { value } = remove_field(container, b"my_data");
    assert!(value == 101);
}
```

### 4.5 Check Field Exists

```move
public fun field_exists(container: &Container, name: vector<u8>): bool {
    df::exists_<vector<u8>>(&container.id, name)
}

// Safe read with default
public fun read_or_default(container: &Container, name: vector<u8>): u64 {
    if (field_exists(container, name)) {
        read_field(container, name)
    } else {
        0 // Default value
    }
}
```

---

## 5. DeFi Use Cases

### 5.1 User Balance Tracking

```move
use sui::dynamic_field as df;
use sui::balance::{Self, Balance};
use sui::coin::Coin;

public struct Pool has key {
    id: UID,
    total_deposits: u64,
}

public struct UserBalanceKey has copy, drop, store {
    user: address,
}

// Deposit
public fun deposit<T>(
    pool: &mut Pool,
    user_coin: Coin<T>,
    ctx: &TxContext,
) {
    let user = ctx.sender();
    let key = UserBalanceKey { user };
    let amount = user_coin.value();

    if (df::exists_(&pool.id, key)) {
        // User has existing balance
        let balance = df::borrow_mut<UserBalanceKey, Balance<T>>(&mut pool.id, key);
        balance.join(user_coin.into_balance());
    } else {
        // First deposit
        df::add(&mut pool.id, key, user_coin.into_balance());
    };

    pool.total_deposits = pool.total_deposits + amount;
}

// Withdraw
public fun withdraw<T>(
    pool: &mut Pool,
    amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    let user = ctx.sender();
    let key = UserBalanceKey { user };

    let balance = df::borrow_mut<UserBalanceKey, Balance<T>>(&mut pool.id, key);
    let withdrawn = balance.split(amount);

    pool.total_deposits = pool.total_deposits - amount;

    withdrawn.into_coin(ctx)
}

// Get user balance
public fun get_balance<T>(pool: &Pool, user: address): u64 {
    let key = UserBalanceKey { user };

    if (df::exists_(&pool.id, key)) {
        let balance = df::borrow<UserBalanceKey, Balance<T>>(&pool.id, key);
        balance.value()
    } else {
        0
    }
}
```

### 5.2 NFT Attributes (Metadata)

```move
use sui::dynamic_field as df;
use std::string::String;

public struct NFT has key, store {
    id: UID,
    name: String,
}

// Add attributes dynamically
public fun add_attribute(
    nft: &mut NFT,
    key: String,
    value: String,
) {
    df::add(&mut nft.id, key, value);
}

// Read attribute
public fun get_attribute(nft: &NFT, key: String): String {
    if (df::exists_(&nft.id, key)) {
        *df::borrow<String, String>(&nft.id, key)
    } else {
        b"".to_string()
    }
}

// Example: Level-up system
public fun level_up(nft: &mut NFT) {
    let level_key = b"level".to_string();

    if (df::exists_(&nft.id, level_key)) {
        let level = df::borrow_mut<String, u64>(&mut nft.id, level_key);
        *level = *level + 1;
    } else {
        df::add(&mut nft.id, level_key, 1);
    }
}

// Usage
public fun example(nft: &mut NFT) {
    add_attribute(nft, b"rarity".to_string(), b"legendary".to_string());
    add_attribute(nft, b"power".to_string(), b"9000".to_string());
    level_up(nft);

    let rarity = get_attribute(nft, b"rarity".to_string());
    assert!(rarity == b"legendary".to_string());
}
```

### 5.3 Multi-Token Vault

```move
use sui::dynamic_object_field as ofield;
use sui::coin::Coin;

public struct Vault has key {
    id: UID,
    owner: address,
}

// Deposit any coin type
public fun deposit_coin<T>(
    vault: &mut Vault,
    coin: Coin<T>,
    ctx: &TxContext,
) {
    assert!(vault.owner == ctx.sender(), 0);

    let coin_type = type_name::get<T>().into_string();

    if (ofield::exists_<String>(&vault.id, coin_type)) {
        // Merge with existing coin
        let existing_coin = ofield::borrow_mut<String, Coin<T>>(&mut vault.id, coin_type);
        existing_coin.join(coin);
    } else {
        // First deposit of this type
        ofield::add(&mut vault.id, coin_type, coin);
    }
}

// Withdraw specific coin type
public fun withdraw_coin<T>(
    vault: &mut Vault,
    amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    assert!(vault.owner == ctx.sender(), 0);

    let coin_type = type_name::get<T>().into_string();
    let coin = ofield::borrow_mut<String, Coin<T>>(&mut vault.id, coin_type);

    coin.split(amount, ctx)
}

// Get coin balance
public fun get_coin_balance<T>(vault: &Vault): u64 {
    let coin_type = type_name::get<T>().into_string();

    if (ofield::exists_<String>(&vault.id, coin_type)) {
        let coin = ofield::borrow<String, Coin<T>>(&vault.id, coin_type);
        coin.value()
    } else {
        0
    }
}
```

### 5.4 Order Book Implementation

```move
use sui::dynamic_field as df;

public struct OrderBook has key {
    id: UID,
    next_order_id: u64,
}

public struct Order has store {
    owner: address,
    price: u64,
    quantity: u64,
    is_buy: bool,
}

public fun place_order(
    book: &mut OrderBook,
    price: u64,
    quantity: u64,
    is_buy: bool,
    ctx: &TxContext,
) {
    let order_id = book.next_order_id;
    book.next_order_id = order_id + 1;

    let order = Order {
        owner: ctx.sender(),
        price,
        quantity,
        is_buy,
    };

    df::add(&mut book.id, order_id, order);
}

public fun cancel_order(
    book: &mut OrderBook,
    order_id: u64,
    ctx: &TxContext,
) {
    let order = df::borrow<u64, Order>(&book.id, order_id);
    assert!(order.owner == ctx.sender(), 0);

    let Order { owner: _, price: _, quantity: _, is_buy: _ } =
        df::remove<u64, Order>(&mut book.id, order_id);
}

public fun get_order(book: &OrderBook, order_id: u64): (address, u64, u64, bool) {
    let order = df::borrow<u64, Order>(&book.id, order_id);
    (order.owner, order.price, order.quantity, order.is_buy)
}
```

### 5.5 Staking Rewards Per User

```move
use sui::dynamic_field as df;

public struct StakingPool has key {
    id: UID,
    total_staked: u64,
    reward_per_token: u64,
}

public struct UserStake has store {
    amount: u64,
    reward_debt: u64,
}

public fun stake(
    pool: &mut StakingPool,
    amount: u64,
    ctx: &TxContext,
) {
    let user = ctx.sender();

    if (df::exists_<address>(&pool.id, user)) {
        let stake = df::borrow_mut<address, UserStake>(&mut pool.id, user);
        stake.amount = stake.amount + amount;
        stake.reward_debt = stake.amount * pool.reward_per_token;
    } else {
        df::add(&mut pool.id, user, UserStake {
            amount,
            reward_debt: amount * pool.reward_per_token,
        });
    };

    pool.total_staked = pool.total_staked + amount;
}

public fun claim_rewards(
    pool: &mut StakingPool,
    ctx: &TxContext,
): u64 {
    let user = ctx.sender();
    let stake = df::borrow_mut<address, UserStake>(&mut pool.id, user);

    let pending = (stake.amount * pool.reward_per_token) - stake.reward_debt;
    stake.reward_debt = stake.amount * pool.reward_per_token;

    pending
}
```

---

## 6. Parent-Child Relationships

### 6.1 Parent Object with Child Objects

```move
use sui::dynamic_object_field as ofield;

public struct Parent has key {
    id: UID,
}

public struct Child has key, store {
    id: UID,
    value: u64,
}

// Add child to parent
public fun add_child(parent: &mut Parent, child: Child) {
    ofield::add(&mut parent.id, b"child", child);
}

// Mutate child via parent
public fun increment_child(parent: &mut Parent) {
    let child = ofield::borrow_mut<vector<u8>, Child>(&mut parent.id, b"child");
    child.value = child.value + 1;
}

// Remove child from parent
public fun remove_child(parent: &mut Parent): Child {
    ofield::remove<vector<u8>, Child>(&mut parent.id, b"child")
}

// Delete parent (child must be removed first!)
public fun delete_parent(parent: Parent) {
    let Parent { id } = parent;
    id.delete();
    // ⚠️ If child still exists, it becomes inaccessible!
}
```

### 6.2 Safe Deletion Pattern

```move
public fun safe_delete_parent(parent: Parent) {
    // Remove child first
    if (ofield::exists_<vector<u8>>(&parent.id, b"child")) {
        let child = remove_child(&mut parent);
        delete_child(child);
    };

    // Now safe to delete parent
    let Parent { id } = parent;
    id.delete();
}

public fun delete_child(child: Child) {
    let Child { id, value: _ } = child;
    id.delete();
}
```

---

## 7. Tables and Bags

Sui provides higher-level collections built on dynamic fields:

### 7.1 Table

**`sui::table::Table<K, V>`**

```move
use sui::table::{Self, Table};

public struct Registry has key {
    id: UID,
    users: Table<address, UserData>,
}

public fun create_registry(ctx: &mut TxContext): Registry {
    Registry {
        id: object::new(ctx),
        users: table::new(ctx),
    }
}

public fun register_user(
    registry: &mut Registry,
    user: address,
    data: UserData,
) {
    registry.users.add(user, data);
}

public fun get_user(registry: &Registry, user: address): &UserData {
    &registry.users[user]
}

// Safe deletion (aborts if not empty)
public fun delete_registry(registry: Registry) {
    let Registry { id, users } = registry;
    users.destroy_empty(); // ⚠️ Aborts if table not empty
    id.delete();
}
```

**Features:**
- Homogeneous key-value pairs
- Tracks entry count
- `destroy_empty()` prevents accidental deletion

### 7.2 Bag

**`sui::bag::Bag`**

```move
use sui::bag::{Self, Bag};

public struct Inventory has key {
    id: UID,
    items: Bag,
}

public fun create_inventory(ctx: &mut TxContext): Inventory {
    Inventory {
        id: object::new(ctx),
        items: bag::new(ctx),
    }
}

// Add different types
public fun add_sword(inventory: &mut Inventory, sword: Sword) {
    inventory.items.add(b"sword", sword);
}

public fun add_potion(inventory: &mut Inventory, potion: Potion) {
    inventory.items.add(b"potion", potion);
}

// Borrow different types
public fun use_sword(inventory: &mut Inventory) {
    let sword = inventory.items.borrow_mut<vector<u8>, Sword>(b"sword");
    sword.durability = sword.durability - 1;
}
```

**Features:**
- Heterogeneous values (farklı tipler)
- Tracks entry count
- `destroy_empty()` protection

### 7.3 ObjectTable & ObjectBag

Same as Table/Bag but for storing objects (accessible by ID):

```move
use sui::object_table::{Self, ObjectTable};
use sui::object_bag::{Self, ObjectBag};

public struct NFTCollection has key {
    id: UID,
    nfts: ObjectTable<u64, NFT>,
}

public struct MultiTypeCollection has key {
    id: UID,
    items: ObjectBag,
}
```

---

## 8. Best Practices

### 8.1 Error Handling

```move
// Always check existence before borrow
public fun safe_read(container: &Container, name: vector<u8>): Option<u64> {
    if (df::exists_<vector<u8>>(&container.id, name)) {
        option::some(df::borrow<vector<u8>, Data>(&container.id, name).value)
    } else {
        option::none()
    }
}

// Or use assert with custom error
const EFieldNotFound: u64 = 1;

public fun read_or_abort(container: &Container, name: vector<u8>): u64 {
    assert!(df::exists_<vector<u8>>(&container.id, name), EFieldNotFound);
    df::borrow<vector<u8>, Data>(&container.id, name).value
}
```

### 8.2 Type Safety

```move
// ❌ Wrong type = transaction abort
df::add(&mut obj.id, b"key", Data { value: 100 });
let wrong = df::borrow<vector<u8>, WrongType>(&obj.id, b"key"); // ABORT!

// ✅ Always match exact type
let correct = df::borrow<vector<u8>, Data>(&obj.id, b"key"); // OK
```

### 8.3 Gas Considerations

```move
// ✅ Good: Only load what you need
public fun increment_single(container: &mut Container, name: vector<u8>) {
    let data = df::borrow_mut<vector<u8>, Data>(&mut container.id, name);
    data.value = data.value + 1;
}

// ❌ Bad: Loading all fields
public fun increment_all(container: &mut Container, names: vector<vector<u8>>) {
    let mut i = 0;
    while (i < names.length()) {
        let data = df::borrow_mut<vector<u8>, Data>(&mut container.id, names[i]);
        data.value = data.value + 1;
        i = i + 1;
    }
    // High gas if many fields!
}
```

### 8.4 Deletion Safety

```move
// ✅ Use Table/Bag for collections
public struct SafeCollection has key {
    id: UID,
    items: Table<u64, Item>,
}

public fun safe_delete(collection: SafeCollection) {
    let SafeCollection { id, items } = collection;
    items.destroy_empty(); // Aborts if not empty
    id.delete();
}

// ❌ Raw dynamic fields can leak
public struct UnsafeCollection has key {
    id: UID,
}

public fun unsafe_delete(collection: UnsafeCollection) {
    let UnsafeCollection { id } = collection;
    id.delete(); // Fields become inaccessible!
}
```

---

## 9. Common Patterns

### 9.1 Registry Pattern

```move
public struct Registry has key {
    id: UID,
    items: Table<address, Item>,
}

public fun register(registry: &mut Registry, item: Item, ctx: &TxContext) {
    registry.items.add(ctx.sender(), item);
}

public fun unregister(registry: &mut Registry, ctx: &TxContext): Item {
    registry.items.remove(ctx.sender())
}
```

### 9.2 Escrow Pattern

```move
public struct Escrow has key {
    id: UID,
    arbiter: address,
}

public fun deposit<T: key + store>(
    escrow: &mut Escrow,
    item: T,
    buyer: address,
) {
    ofield::add(&mut escrow.id, buyer, item);
}

public fun release<T: key + store>(
    escrow: &mut Escrow,
    buyer: address,
    ctx: &TxContext,
): T {
    assert!(ctx.sender() == escrow.arbiter, 0);
    ofield::remove<address, T>(&mut escrow.id, buyer)
}
```

### 9.3 Lazy Initialization

```move
public fun get_or_create(
    container: &mut Container,
    name: vector<u8>,
): &mut Data {
    if (!df::exists_<vector<u8>>(&container.id, name)) {
        df::add(&mut container.id, name, Data { value: 0 });
    };
    df::borrow_mut<vector<u8>, Data>(&mut container.id, name)
}
```

---

## 10. TypeScript SDK Usage

```typescript
import { Transaction } from "@mysten/sui/transactions";

// Add dynamic field
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::module::add_field`,
  arguments: [
    tx.object(CONTAINER_ID),
    tx.pure.string("my_field"),
    tx.pure.u64(100),
  ],
});

// Read dynamic field (query on-chain state)
const dynamicFields = await client.getDynamicFields({
  parentId: CONTAINER_ID,
});

console.log("Dynamic fields:", dynamicFields.data);

// Get specific dynamic field
const fieldObject = await client.getDynamicFieldObject({
  parentId: CONTAINER_ID,
  name: {
    type: "vector<u8>",
    value: "my_field",
  },
});

console.log("Field value:", fieldObject.data?.content);
```

---

## Özet

Dynamic Fields, Sui'nin en güçlü özelliklerinden biri:

✅ **Flexibility**: Runtime'da field ekleme/silme
✅ **Gas Efficiency**: Sadece erişildiğinde gas öde
✅ **Heterogeneous**: Farklı tipler aynı object'te
✅ **Scalability**: Sınırsız field sayısı
✅ **DeFi Ready**: User balances, NFT metadata, vaults

Hackathon projelerinizde dynamic fields kullanarak esnek ve scalable DeFi uygulamaları yazabilirsiniz!
