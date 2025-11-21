# Sui On-Chain Randomness - DeFi Hackathon Rehberi

Sui blockchain, native on-chain randomness sağlar. Bu, DeFi ve gaming uygulamalarında güvenli, trustless rastgele sayı üretimi için kullanılabilir. Bu döküman Satoshi Coin Flip projesinden öğrenilen gerçek bilgileri içerir.

---

## 1. On-Chain Randomness Nedir?

Sui'nin `random::Random` modülü, cryptographically secure rastgele sayılar üretir. Backend VRF servisi veya oracle gerekmez - tamamen on-chain ve trustless.

### Temel Özellikler

- **Trustless:** Backend key management gerektirmez
- **Verifiable:** Tüm randomness transaction effects'te kaydedilir
- **MEV Resistant:** Randomness commit edildikten sonra üretilir
- **Native:** Sui framework'ün parçası

### v1 (Backend VRF) vs v2 (On-Chain)

| Özellik | Backend VRF | On-Chain Randomness |
|---------|-------------|---------------------|
| Randomness Source | Backend BLS signature | Sui `random::Random` |
| Backend Service | Gerekli | Opsiyonel |
| Trust Model | Backend'e güven | Trustless |
| MEV Risk | Var (2-step flow) | Yok |
| Key Management | Private key güvenliği | Gerekli değil |

---

## 2. DeFi Kullanım Senaryoları

### 2.1 Coin Flip / Dice Games

**Satoshi Coin Flip Örneği:**
```move
// Player H veya T seçer, stake koyar
public fun start_game(
    guess: String,
    coin: Coin<SUI>,
    house_data: &mut HouseData,
    ctx: &mut TxContext
): ID {
    // Game oluştur
    let game = Game {
        id: object::new(ctx),
        guess_placed_epoch: ctx.epoch(),
        total_stake: ...,
        guess,
        player: ctx.sender(),
        fee_bp
    };

    // Game'i dynamic field olarak sakla
    dof::add(house_data.borrow_mut(), game_id, game);
    game_id
}

// Randomness ile sonucu belirle
entry fun finish_game(
    game_id: ID,
    house_data: &mut HouseData,
    random_state: &Random,
    ctx: &mut TxContext
) {
    // Game'i al
    let Game { guess, player, total_stake, ... } =
        dof::remove(house_data.borrow_mut(), game_id);

    // Secure randomness üret
    let mut generator = random::new_generator(random_state, ctx);
    let random_result = random::generate_bool(&mut generator);

    // Kazananı belirle
    let player_won = (guess == "H") == random_result;

    // Ödül dağıt
    if (player_won) {
        transfer::public_transfer(total_stake.into_coin(ctx), player);
    } else {
        house_data.borrow_balance_mut().join(total_stake);
    }
}
```

### 2.2 Lottery / Raffle

```move
public struct Lottery has key {
    id: UID,
    participants: vector<address>,
    ticket_price: u64,
    prize_pool: Balance<SUI>
}

entry fun draw_winner(
    lottery: &mut Lottery,
    random_state: &Random,
    ctx: &mut TxContext
) {
    let mut generator = random::new_generator(random_state, ctx);

    // 0 ile participant sayısı arası random seç
    let winner_index = random::generate_u64_in_range(
        &mut generator,
        0,
        vector::length(&lottery.participants)
    );

    let winner = *vector::borrow(&lottery.participants, winner_index);

    // Prize gönder
    let prize = lottery.prize_pool.withdraw_all();
    transfer::public_transfer(prize.into_coin(ctx), winner);
}
```

### 2.3 Random NFT Minting

```move
public struct NFTCollection has key {
    id: UID,
    available_traits: vector<Trait>,
    minted: u64
}

public fun mint_random_nft(
    collection: &mut NFTCollection,
    random_state: &Random,
    ctx: &mut TxContext
): NFT {
    let mut generator = random::new_generator(random_state, ctx);

    // Random trait'ler seç
    let trait1_index = random::generate_u8_in_range(
        &mut generator,
        0,
        vector::length(&collection.available_traits) as u8
    );

    let trait1 = *vector::borrow(&collection.available_traits, trait1_index as u64);

    NFT {
        id: object::new(ctx),
        trait: trait1,
        rarity: calculate_rarity(trait1)
    }
}
```

### 2.4 DeFi Liquidation Lottery

**Senaryo:** Liquidation'dan elde edilen bonus'u random liquidator'lara dağıt

```move
public struct LiquidationPool has key {
    id: UID,
    participants: vector<address>,
    bonus_pool: Balance<SUI>
}

entry fun distribute_bonus(
    pool: &mut LiquidationPool,
    random_state: &Random,
    ctx: &mut TxContext
) {
    let participant_count = vector::length(&pool.participants);
    let mut generator = random::new_generator(random_state, ctx);

    // 3 random kazanan seç
    let mut i = 0;
    while (i < 3 && i < participant_count) {
        let winner_idx = random::generate_u64_in_range(
            &mut generator,
            0,
            participant_count
        );

        let winner = *vector::borrow(&pool.participants, winner_idx);
        let bonus = pool.bonus_pool.split(pool.bonus_pool.value() / 3);

        transfer::public_transfer(bonus.into_coin(ctx), winner);
        i = i + 1;
    }
}
```

---

## 3. Random Module API

### 3.1 Core Functions

```move
use sui::random::{Self, Random};

// Random generator oluştur
let mut generator = random::new_generator(random_state, ctx);

// Boolean (50/50)
let coin_flip = random::generate_bool(&mut generator);

// u8 (0-255)
let dice = random::generate_u8(&mut generator);

// u64
let random_num = random::generate_u64(&mut generator);

// u128
let big_random = random::generate_u128(&mut generator);

// u256
let very_big_random = random::generate_u256(&mut generator);
```

### 3.2 Range Functions

```move
// u8 range (inclusive start, exclusive end)
let dice_roll = random::generate_u8_in_range(
    &mut generator,
    1,  // min (inclusive)
    7   // max (exclusive) -> 1-6
);

// u64 range
let lottery_number = random::generate_u64_in_range(
    &mut generator,
    0,
    1000000
);

// u128 range
let big_range = random::generate_u128_in_range(
    &mut generator,
    min_value,
    max_value
);
```

### 3.3 Bytes Generation

```move
// Random bytes üret
let random_bytes = random::generate_bytes(
    &mut generator,
    32  // byte count
);
```

---

## 4. Implementation Patterns

### 4.1 House vs Player Pattern

**Satoshi Coin Flip'ten:**

```move
// HouseData: Singleton treasury object
public struct HouseData has key {
    id: UID,
    balance: Balance<SUI>,  // House bankası
    house: address,         // House admin
    max_stake: u64,
    min_stake: u64,
    fees: Balance<SUI>,
    base_fee_in_bp: u16
}

// Game: Dynamic field olarak saklanır
public struct Game has key, store {
    id: UID,
    guess_placed_epoch: u64,
    total_stake: Balance<SUI>,
    guess: String,
    player: address,
    fee_bp: u16
}

// Game'i HouseData altında sakla
dof::add(house_data.borrow_mut(), game_id, game);

// Finish'te çıkar
let game = dof::remove(house_data.borrow_mut(), game_id);
```

**Faydaları:**
- Tüm game'ler merkezi HouseData altında
- House balance yönetimi kolay
- Dynamic field ile efficient storage

### 4.2 Fee Calculation

```move
// Fee hesaplama (basis points)
public fun fee_amount(game_stake: u64, fee_in_bp: u16): u64 {
    // Sadece player stake üzerinden fee al
    let player_stake = game_stake / 2;  // Total stake = player + house
    ((((player_stake as u128) * (fee_in_bp as u128) / 10_000) as u64)
}

// Kazanınca fee kes
if (player_won) {
    let stake_amount = total_stake.value();
    let fee_amount = fee_amount(stake_amount, fee_bp);
    let fees = total_stake.split(fee_amount);

    // Fee'yi house'a
    house_data.borrow_fees_mut().join(fees);

    // Kalan ödülü player'a
    transfer::public_transfer(total_stake.into_coin(ctx), player);
}
```

### 4.3 Dispute Mechanism

**7 Epoch Timeout:**

```move
const EPOCHS_CANCEL_AFTER: u64 = 7;

public fun dispute_and_win(
    house_data: &mut HouseData,
    game_id: ID,
    ctx: &mut TxContext
) {
    let Game { guess_placed_epoch, total_stake, player, ... } =
        dof::remove(house_data.borrow_mut(), game_id);

    let current_epoch = ctx.epoch();
    let cancel_epoch = guess_placed_epoch + EPOCHS_CANCEL_AFTER;

    // 7 epoch geçmişse player kazanır
    assert!(cancel_epoch <= current_epoch, ECanNotChallengeYet);

    // Full stake player'a (fee yok)
    transfer::public_transfer(total_stake.into_coin(ctx), player);
}
```

**Neden Önemli:**
- Game stuck kalırsa player fonlarını kurtarabilir
- House exploit edemez (game'i asla finish etmeme)
- Fairness garantisi

---

## 5. Events

```move
/// Game başladı
public struct NewGame has copy, drop {
    game_id: ID,
    player: address,
    guess: String,
    user_stake: u64,
    fee_bp: u16
}

/// Game bitti
public struct Outcome has copy, drop {
    game_id: ID,
    status: u8  // 1=Player Won, 2=House Won, 3=Challenged
}

// Emit
emit(NewGame { ... });
emit(Outcome { game_id, status: PLAYER_WON_STATE });
```

**Frontend'de Kullanım:**
```typescript
// Event listen
const { data: games } = useSuiClientQuery("queryEvents", {
  query: {
    MoveEventType: `${PACKAGE}::single_player_satoshi::NewGame`
  }
});

// Game results
const { data: outcomes } = useSuiClientQuery("queryEvents", {
  query: {
    MoveEventType: `${PACKAGE}::single_player_satoshi::Outcome`
  }
});
```

---

## 6. TypeScript Integration

### 6.1 Transaction Builder

```typescript
import { Transaction } from "@mysten/sui/transactions";

// Start game
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::single_player_satoshi::start_game`,
  arguments: [
    tx.pure.string("H"),  // Guess (H or T)
    tx.object(coinId),    // Stake coin
    tx.object(HOUSE_DATA_ID)
  ]
});

const result = await signAndExecute({ transaction: tx });
const gameId = result.effects.created[0].reference.objectId;
```

### 6.2 Finish Game

```typescript
// Finish game transaction
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::single_player_satoshi::finish_game`,
  arguments: [
    tx.pure.id(gameId),
    tx.object(HOUSE_DATA_ID),
    tx.object("0x8")  // Random shared object
  ]
});

await signAndExecute({ transaction: tx });
```

### 6.3 Query Active Games

```typescript
// HouseData'dan game'leri oku
const { data: houseData } = useSuiClientQuery("getObject", {
  id: HOUSE_DATA_ID,
  options: {
    showContent: true,
    showDynamicFields: true
  }
});

// Dynamic field'leri parse et
const games = houseData.data?.content?.fields?.games || [];
```

---

## 7. Security Considerations

### 7.1 Randomness Guarantees

**Güvenli:**
- ✅ Cryptographically secure
- ✅ Unpredictable
- ✅ Cannot be manipulated
- ✅ Verifiable on-chain

**Dikkat:**
- ⚠️ `random::Random` shared object gerekli
- ⚠️ Generator her kullanımda yeni oluşturulmalı
- ⚠️ Range'ler dikkatli seçilmeli (0-len için len > 0)

### 7.2 MEV Resistance

**V1 Problem (Backend VRF):**
```
1. Player creates game + commitment
2. Backend sees commitment
3. Backend can choose to sign or not
4. MEV opportunity
```

**V2 Solution (On-Chain Randomness):**
```
1. Player creates game + guess (on-chain)
2. Anyone calls finish_game
3. Random value generated on-chain
4. No MEV opportunity
```

### 7.3 Front-Running Protection

Guess on-chain commit ediliyor:

```move
// Guess game creation'da commit edilir
public struct Game has key, store {
    guess: String,  // "H" or "T" - on-chain commit
    player: address,
    ...
}

// finish_game'de guess değiştirilemez
let Game { guess, ... } = dof::remove(...);
let player_won = (guess == "H") == random_result;
```

---

## 8. Gas Optimization

### 8.1 Single Transaction Flow

```move
// ❌ Kötü: Her game için new object
public struct Game has key {
    id: UID,
    ...
}

// ✅ İyi: Dynamic field ile efficient
dof::add(house_data.borrow_mut(), game_id, game);
```

### 8.2 Balance vs Coin

```move
// ✅ Balance kullan (internal)
public struct HouseData has key {
    balance: Balance<SUI>  // Efficient
}

// ❌ Coin kullanma (external)
public struct HouseData has key {
    balance: Coin<SUI>  // Less efficient
}
```

---

## 9. Best Practices

### For Game Developers

1. **Random Shared Object:** Her transaction'da `0x8` objesini pass et
2. **Generator per Use:** Her random ihtiyacında yeni generator
3. **Dispute Mechanism:** Timeout ile player protection
4. **Event Emission:** Her önemli state change için event
5. **Fee Transparency:** Fee calculation açık ve anlaşılır

### For DeFi Protocols

1. **Liquidation Lotteries:** Fair liquidator seçimi
2. **Prize Distribution:** Random winner selection
3. **Airdrop Allocation:** Fair distribution
4. **Governance Sampling:** Random delegate selection

---

## 10. Complete Example

```move
module my_game::lottery;

use sui::random::{Self, Random};
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::event;

const ENoParticipants: u64 = 0;

public struct Lottery has key {
    id: UID,
    participants: vector<address>,
    prize_pool: Balance<SUI>,
    min_ticket_price: u64
}

public struct WinnerSelected has copy, drop {
    lottery_id: ID,
    winner: address,
    prize: u64
}

// Buy ticket
public fun buy_ticket(
    lottery: &mut Lottery,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    assert!(payment.value() >= lottery.min_ticket_price, 1);

    lottery.participants.push_back(ctx.sender());
    coin::put(&mut lottery.prize_pool, payment);
}

// Draw winner
entry fun draw_winner(
    lottery: &mut Lottery,
    random_state: &Random,
    ctx: &mut TxContext
) {
    let count = vector::length(&lottery.participants);
    assert!(count > 0, ENoParticipants);

    // Generate random index
    let mut generator = random::new_generator(random_state, ctx);
    let winner_idx = random::generate_u64_in_range(
        &mut generator,
        0,
        count
    );

    let winner = *vector::borrow(&lottery.participants, winner_idx);
    let prize_amount = lottery.prize_pool.value();

    // Transfer prize
    let prize = lottery.prize_pool.withdraw_all();
    transfer::public_transfer(prize.into_coin(ctx), winner);

    // Emit event
    event::emit(WinnerSelected {
        lottery_id: object::id(lottery),
        winner,
        prize: prize_amount
    });

    // Reset
    lottery.participants = vector::empty();
}
```

---

## Kaynaklar

- Satoshi Coin Flip: https://github.com/MystenLabs/satoshi-coin-flip
- Sui Random Module: https://docs.sui.io/references/framework/sui/random
- Random Object ID: `0x8` (mainnet/testnet)
