# Örnek 3: Transaction Gönderme

Bu örnek, Sui'de transaction oluşturma ve gönderme işlemlerini gösterir.

## Kod

### useTransactionExecution.ts (Custom Hook)

```tsx
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import toast from "react-hot-toast";

export function useTransactionExecution() {
  const client = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const executeTransaction = async (
    tx: Transaction
  ): Promise<SuiTransactionBlockResponse | void> => {
    try {
      // Transaction'ı imzala
      const signature = await signTransaction({ transaction: tx });

      // Execute et
      const result = await client.executeTransactionBlock({
        transactionBlock: signature.bytes,
        signature: signature.signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      toast.success("Transaction successful!");
      return result;
    } catch (error: any) {
      toast.error(`Transaction failed: ${error.message}`);
      throw error;
    }
  };

  return executeTransaction;
}
```

### SwapComponent.tsx (Swap Mutation)

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTransactionExecution } from "./useTransactionExecution";

const PACKAGE_ID = "0x...";
const POOL_ID = "0x...";

interface SwapParams {
  inputCoinId: string;
  inputAmount: number;
  minOutput: number;
  tokenAType: string;
  tokenBType: string;
}

function useSwapMutation() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected!");
      }

      const tx = new Transaction();

      // Swap fonksiyonunu çağır
      const [outputCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::dex::swap_a_to_b`,
        arguments: [
          tx.object(POOL_ID),
          tx.object(params.inputCoinId),
        ],
        typeArguments: [params.tokenAType, params.tokenBType],
      });

      // Output coin'i kullanıcıya transfer et
      tx.transferObjects([outputCoin], tx.pure.address(account.address));

      return executeTransaction(tx);
    },
    onSuccess: () => {
      // Cache'i invalidate et
      queryClient.invalidateQueries({ queryKey: ["pool"] });
      queryClient.invalidateQueries({ queryKey: ["getCoins"] });
    },
  });
}

// Component
function SwapForm() {
  const { mutate: swap, isPending } = useSwapMutation();

  const handleSwap = () => {
    swap({
      inputCoinId: "0x...",
      inputAmount: 1000000,
      minOutput: 950000,
      tokenAType: "0x...::token_a::TOKEN_A",
      tokenBType: "0x...::token_b::TOKEN_B",
    });
  };

  return (
    <div>
      <button onClick={handleSwap} disabled={isPending}>
        {isPending ? "Swapping..." : "Swap"}
      </button>
    </div>
  );
}

export default SwapForm;
```

### MintToken.tsx (Simple Transaction)

```tsx
import { useMutation } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTransactionExecution } from "./useTransactionExecution";

const PACKAGE_ID = "0x...";
const TREASURY_CAP_ID = "0x...";

function useMintMutation() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!account?.address) throw new Error("Wallet not connected!");

      const tx = new Transaction();

      // Mint fonksiyonunu çağır
      tx.moveCall({
        target: `${PACKAGE_ID}::my_coin::mint`,
        arguments: [
          tx.object(TREASURY_CAP_ID),
          tx.pure.u64(amount),
          tx.pure.address(account.address),
        ],
      });

      return executeTransaction(tx);
    },
  });
}

function MintButton() {
  const { mutate: mint, isPending } = useMintMutation();

  return (
    <button onClick={() => mint(1000000)} disabled={isPending}>
      {isPending ? "Minting..." : "Mint 1 Token"}
    </button>
  );
}

export default MintButton;
```

### ComplexTransaction.tsx (PTB - Programmable Transaction Block)

```tsx
import { useMutation } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTransactionExecution } from "./useTransactionExecution";

function useAddLiquidityAndStake() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async ({
      amountA,
      amountB,
    }: {
      amountA: number;
      amountB: number;
    }) => {
      const tx = new Transaction();

      // 1. Gas coin'den split et
      const [coinA] = tx.splitCoins(tx.gas, [tx.pure.u64(amountA)]);
      const [coinB] = tx.splitCoins(tx.gas, [tx.pure.u64(amountB)]);

      // 2. Liquidity ekle ve LP token al
      const [lpToken] = tx.moveCall({
        target: `${PACKAGE_ID}::dex::add_liquidity`,
        arguments: [tx.object(POOL_ID), coinA, coinB],
        typeArguments: [TOKEN_A_TYPE, TOKEN_B_TYPE],
      });

      // 3. LP token'ı stake et
      tx.moveCall({
        target: `${PACKAGE_ID}::farming::stake`,
        arguments: [tx.object(FARM_ID), lpToken],
      });

      return executeTransaction(tx);
    },
  });
}

function AddLiquidityButton() {
  const { mutate, isPending } = useAddLiquidityAndStake();

  return (
    <button
      onClick={() => mutate({ amountA: 1000000, amountB: 2000000 })}
      disabled={isPending}
    >
      {isPending ? "Processing..." : "Add Liquidity & Stake"}
    </button>
  );
}

export default AddLiquidityButton;
```

## Açıklama

### 1. Transaction Builder

```tsx
const tx = new Transaction();
```

**Methods:**
- `tx.moveCall()`: Move fonksiyon çağır
- `tx.splitCoins()`: Coin böl
- `tx.mergeCoins()`: Coin birleştir
- `tx.transferObjects()`: Obje transfer
- `tx.object()`: Object referans
- `tx.pure.u64()`: Pure value
- `tx.gas`: Gas coin referansı

### 2. Move Call

```tsx
tx.moveCall({
  target: `${PACKAGE_ID}::module::function`,
  arguments: [
    tx.object(OBJECT_ID),
    tx.pure.u64(1000),
    tx.pure.address(ADDRESS)
  ],
  typeArguments: [TYPE_A, TYPE_B]
});
```

**Arguments Tipleri:**
- `tx.object()`: Object reference
- `tx.pure.u64()`: u64 değer
- `tx.pure.u128()`: u128 değer
- `tx.pure.address()`: Address değer
- `tx.pure.bool()`: Boolean değer
- `tx.pure.string()`: String değer

### 3. Transaction Execution Flow

```
1. Transaction oluştur (new Transaction())
2. Move call'ları ekle
3. İmzala (signTransaction)
4. Execute et (executeTransactionBlock)
5. Result döner
```

### 4. Split ve Merge Coins

```tsx
// Split
const [coin1, coin2] = tx.splitCoins(tx.gas, [
  tx.pure.u64(1000),
  tx.pure.u64(2000)
]);

// Merge
tx.mergeCoins(primaryCoin, [coin1, coin2, coin3]);
```

### 5. Transaction Options

```tsx
client.executeTransactionBlock({
  transactionBlock: signature.bytes,
  signature: signature.signature,
  options: {
    showEffects: true,         // Effects göster
    showObjectChanges: true,   // Object değişiklikleri
    showEvents: true,          // Event'leri göster
    showInput: true,           // Input'ları göster
    showRawInput: false,
  },
});
```

## Multi-Coin Merge Örneği

```tsx
function useMergeCoins() {
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async (coinIds: string[]) => {
      const tx = new Transaction();

      // İlk coin primary
      const [primaryCoin, ...otherCoins] = coinIds.map((id) => tx.object(id));

      // Diğerlerini primary'ye merge et
      if (otherCoins.length > 0) {
        tx.mergeCoins(primaryCoin, otherCoins);
      }

      // Primary coin ile işlem yap
      const [output] = tx.moveCall({
        target: `${PACKAGE_ID}::dex::swap`,
        arguments: [tx.object(POOL_ID), primaryCoin],
      });

      tx.transferObjects([output], tx.pure.address(account.address));

      return executeTransaction(tx);
    },
  });
}
```

## Error Handling

```tsx
function useSwapWithErrorHandling() {
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      try {
        const tx = new Transaction();
        // ... transaction logic

        return await executeTransaction(tx);
      } catch (error: any) {
        // Custom error handling
        if (error.message.includes("InsufficientBalance")) {
          throw new Error("Not enough balance for swap");
        }
        if (error.message.includes("SlippageTooHigh")) {
          throw new Error("Price changed too much, try again");
        }
        throw error;
      }
    },
    onError: (error) => {
      console.error("Swap failed:", error);
    },
    onSuccess: (result) => {
      console.log("Swap successful:", result.digest);
    },
  });
}
```

## Best Practices

1. **Custom Hook:** Transaction logic'i hook'a ayırın
2. **Error Handling:** Try-catch ve onError kullanın
3. **Loading States:** isPending state'i gösterin
4. **Cache Invalidation:** Mutation sonrası invalidate edin
5. **Type Safety:** TypeScript interface'leri kullanın
6. **Transaction Options:** showEffects ve showObjectChanges açın
7. **Toast Notifications:** Kullanıcıyı bilgilendirin
