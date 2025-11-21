# React + TypeScript + Sui SDK - DeFi Hackathon Rehberi

Bu döküman, Sui blockchain üzerinde React ve TypeScript kullanarak DeFi frontend uygulamaları geliştirmek için gereken bilgileri içerir.

---

## 1. Kurulum ve Başlangıç

### 1.1 Gerekli Paketler

```bash
npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query
```

**Ana Paketler:**
- `@mysten/dapp-kit`: React hooks ve wallet bağlantısı
- `@mysten/sui`: Sui TypeScript SDK (transaction, client)
- `@tanstack/react-query`: Data fetching ve cache yönetimi

### 1.2 Proje Setup

```tsx
// main.tsx
import { getFullnodeUrl } from "@mysten/sui/client";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <WalletProvider autoConnect>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);
```

**Provider Sırası Önemli:**
1. `QueryClientProvider` - En dışta
2. `SuiClientProvider` - Network ayarları
3. `WalletProvider` - Wallet bağlantısı

---

## 2. Wallet Bağlantısı

### 2.1 Connect Button

```tsx
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

function Header() {
  const account = useCurrentAccount();

  return (
    <div>
      {account ? (
        <p>Connected: {account.address}</p>
      ) : (
        <p>Not connected</p>
      )}
      <ConnectButton />
    </div>
  );
}
```

### 2.2 Custom Wallet Connection

```tsx
import { useConnectWallet, useDisconnectWallet } from "@mysten/dapp-kit";

function CustomWalletButton() {
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const account = useCurrentAccount();

  if (account) {
    return (
      <button onClick={() => disconnect()}>
        Disconnect: {account.address.slice(0, 6)}...
      </button>
    );
  }

  return (
    <button onClick={() => connect({ wallet: "Sui Wallet" })}>
      Connect Wallet
    </button>
  );
}
```

---

## 3. Transaction Oluşturma ve Gönderme

### 3.1 Transaction Builder

```tsx
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";

function SwapComponent() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();

  const handleSwap = async () => {
    const tx = new Transaction();

    // Move call ekle
    tx.moveCall({
      target: `${PACKAGE_ID}::dex::swap`,
      arguments: [
        tx.object(POOL_ID),
        tx.object(INPUT_COIN_ID),
        tx.pure.u64(MIN_OUTPUT)
      ],
      typeArguments: [TOKEN_A_TYPE, TOKEN_B_TYPE]
    });

    // Transaction'ı gönder
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log("Success:", result.digest);
        },
        onError: (error) => {
          console.error("Error:", error.message);
        }
      }
    );
  };

  return <button onClick={handleSwap}>Swap</button>;
}
```

### 3.2 Advanced Transaction Execution

```tsx
import { useSuiClient, useSignTransaction } from "@mysten/dapp-kit";

function useTransactionExecution() {
  const client = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const executeTransaction = async (tx: Transaction) => {
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

      return result;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  return executeTransaction;
}
```

---

## 4. Data Fetching (Veri Çekme)

### 4.1 Object Query

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";

function PoolInfo({ poolId }: { poolId: string }) {
  const { data, isLoading, error } = useSuiClientQuery(
    "getObject",
    {
      id: poolId,
      options: {
        showContent: true,
        showType: true,
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const fields = data.data?.content?.fields;

  return (
    <div>
      <p>Reserve A: {fields.reserve_a}</p>
      <p>Reserve B: {fields.reserve_b}</p>
    </div>
  );
}
```

### 4.2 Owned Objects (Kullanıcının Coin'leri)

```tsx
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

function MyCoins() {
  const account = useCurrentAccount();

  const { data: coins } = useSuiClientQuery(
    "getCoins",
    {
      owner: account?.address!,
      coinType: "0x2::sui::SUI",
    },
    { enabled: !!account }
  );

  return (
    <div>
      {coins?.data.map((coin) => (
        <div key={coin.coinObjectId}>
          Balance: {coin.balance}
        </div>
      ))}
    </div>
  );
}
```

### 4.3 Infinite Scroll Query

```tsx
import { useSuiClientInfiniteQuery } from "@mysten/dapp-kit";

function AllObjects() {
  const account = useCurrentAccount();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuiClientInfiniteQuery(
      "getOwnedObjects",
      {
        owner: account?.address!,
        options: {
          showDisplay: true,
          showType: true,
        },
      },
      {
        enabled: !!account,
        select: (data) => data.pages.flatMap((page) => page.data),
      }
    );

  return (
    <div>
      {data?.map((obj) => (
        <ObjectCard key={obj.data?.objectId} object={obj} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

---

## 5. Mutation Patterns (State Değiştirme)

### 5.1 Basic Mutation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useMintToken() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!account?.address) throw new Error("Wallet not connected!");

      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::my_coin::mint`,
        arguments: [
          tx.object(TREASURY_CAP_ID),
          tx.pure.u64(amount),
          tx.pure.address(account.address)
        ]
      });

      return executeTransaction(tx);
    },
    onSuccess: () => {
      // Cache'i invalidate et (yeniden fetch etsin)
      queryClient.invalidateQueries({ queryKey: ["getCoins"] });
    },
  });
}

// Kullanım
function MintButton() {
  const { mutate: mint, isPending } = useMintToken();

  return (
    <button onClick={() => mint(1000000)} disabled={isPending}>
      {isPending ? "Minting..." : "Mint 1 Token"}
    </button>
  );
}
```

### 5.2 DeFi Swap Mutation

```tsx
function useSwapMutation() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      inputCoinId,
      minOutput,
      tokenAType,
      tokenBType,
    }: SwapParams) => {
      if (!account?.address) throw new Error("Wallet not connected!");

      const tx = new Transaction();

      const outputCoin = tx.moveCall({
        target: `${PACKAGE_ID}::dex::swap_a_to_b`,
        arguments: [
          tx.object(poolId),
          tx.object(inputCoinId),
        ],
        typeArguments: [tokenAType, tokenBType],
      });

      // Output coin'i kullanıcıya transfer et
      tx.transferObjects([outputCoin], tx.pure.address(account.address));

      return executeTransaction(tx);
    },
    onSuccess: () => {
      // Pool ve coin verilerini yenile
      queryClient.invalidateQueries({ queryKey: ["pool"] });
      queryClient.invalidateQueries({ queryKey: ["getCoins"] });
    },
  });
}
```

---

## 6. Event Listening (Olay Dinleme)

### 6.1 Past Events Query

```tsx
function useSwapEvents(poolId: string) {
  return useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::dex::SwapExecuted`,
      },
      limit: 50,
    }
  );
}

function SwapHistory({ poolId }: { poolId: string }) {
  const { data: events } = useSwapEvents(poolId);

  return (
    <div>
      {events?.data.map((event) => (
        <div key={event.id.txDigest}>
          <p>Amount In: {event.parsedJson.amount_in}</p>
          <p>Amount Out: {event.parsedJson.amount_out}</p>
        </div>
      ))}
    </div>
  );
}
```

### 6.2 Real-time Event Subscription

```tsx
import { useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

function useRealtimeSwaps(packageId: string) {
  const client = useSuiClient();
  const [swaps, setSwaps] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = client.subscribeEvent({
      filter: {
        MoveEventType: `${packageId}::dex::SwapExecuted`,
      },
      onMessage: (event) => {
        setSwaps((prev) => [event, ...prev].slice(0, 10));
      },
    });

    return () => {
      unsubscribe.then((unsub) => unsub());
    };
  }, [client, packageId]);

  return swaps;
}

function LiveSwapFeed() {
  const swaps = useRealtimeSwaps(PACKAGE_ID);

  return (
    <div>
      <h3>Live Swaps</h3>
      {swaps.map((swap, i) => (
        <div key={i}>
          New swap: {swap.parsedJson.amount_in} tokens
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Transaction Builder Patterns

### 7.1 Complex PTB (Programmable Transaction Block)

```tsx
function useAddLiquidityAndStake() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async ({ amountA, amountB }: LiquidityParams) => {
      const tx = new Transaction();

      // 1. Split coins
      const [coinA] = tx.splitCoins(tx.gas, [tx.pure.u64(amountA)]);
      const [coinB] = tx.splitCoins(tx.gas, [tx.pure.u64(amountB)]);

      // 2. Add liquidity, LP token döner
      const [lpToken] = tx.moveCall({
        target: `${PACKAGE_ID}::dex::add_liquidity`,
        arguments: [tx.object(POOL_ID), coinA, coinB],
        typeArguments: [TOKEN_A, TOKEN_B],
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
```

### 7.2 Multi-Coin Handling

```tsx
function useMergeAndSwap() {
  const client = useSuiClient();
  const executeTransaction = useTransactionExecution();

  return useMutation({
    mutationFn: async (coinIds: string[]) => {
      const tx = new Transaction();

      // İlk coin'i primary olarak al
      const [primaryCoin, ...otherCoins] = coinIds.map((id) => tx.object(id));

      // Diğer coin'leri primary'ye birleştir
      if (otherCoins.length > 0) {
        tx.mergeCoins(primaryCoin, otherCoins);
      }

      // Birleşik coin ile swap yap
      const outputCoin = tx.moveCall({
        target: `${PACKAGE_ID}::dex::swap_a_to_b`,
        arguments: [tx.object(POOL_ID), primaryCoin],
        typeArguments: [TOKEN_A, TOKEN_B],
      });

      tx.transferObjects([outputCoin], tx.pure.address(account.address));

      return executeTransaction(tx);
    },
  });
}
```

---

## 8. Custom Hooks Pattern

### 8.1 usePoolReserves

```tsx
function usePoolReserves<TokenA, TokenB>(poolId: string) {
  const { data, isLoading } = useSuiClientQuery(
    "getObject",
    {
      id: poolId,
      options: { showContent: true },
    }
  );

  const reserves = useMemo(() => {
    if (!data?.data?.content) return null;

    const fields = data.data.content.fields;
    return {
      reserveA: BigInt(fields.reserve_a),
      reserveB: BigInt(fields.reserve_b),
      lpSupply: BigInt(fields.lp_supply),
    };
  }, [data]);

  return { reserves, isLoading };
}
```

### 8.2 useTokenPrice

```tsx
function useTokenPrice(poolId: string) {
  const { reserves } = usePoolReserves(poolId);

  const price = useMemo(() => {
    if (!reserves) return null;

    // Price = reserveB / reserveA
    return Number(reserves.reserveB) / Number(reserves.reserveA);
  }, [reserves]);

  return price;
}

// Kullanım
function PriceDisplay() {
  const price = useTokenPrice(POOL_ID);

  return <div>Price: {price?.toFixed(4)} TOKEN_B per TOKEN_A</div>;
}
```

---

## 9. Error Handling

### 9.1 Transaction Error Handling

```tsx
import toast from "react-hot-toast";

function useTransactionExecution() {
  const client = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const executeTransaction = async (tx: Transaction) => {
    try {
      const signature = await signTransaction({ transaction: tx });

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

### 9.2 Query Error Boundary

```tsx
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

---

## 10. Best Practices

### 10.1 Type Safety

```typescript
// types.ts
export interface Pool {
  id: string;
  reserve_a: string;
  reserve_b: string;
  lp_supply: string;
}

export interface SwapParams {
  poolId: string;
  inputAmount: bigint;
  minOutput: bigint;
  slippage: number; // 0.01 = 1%
}
```

### 10.2 Constants Management

```typescript
// constants.ts
export const CONTRACTS = {
  DEX_PACKAGE: "0x...",
  FARMING_PACKAGE: "0x...",
  POOLS: {
    SUI_USDC: "0x...",
    SUI_USDT: "0x...",
  },
} as const;

export const TOKENS = {
  SUI: "0x2::sui::SUI",
  USDC: "0x...::usdc::USDC",
} as const;
```

### 10.3 Loading States

```tsx
function SwapButton() {
  const { mutate: swap, isPending } = useSwapMutation();

  return (
    <button onClick={() => swap(params)} disabled={isPending}>
      {isPending ? (
        <>
          <Spinner />
          Swapping...
        </>
      ) : (
        "Swap"
      )}
    </button>
  );
}
```

---

## 11. Hızlı Referans

### Sık Kullanılan Hooks

```tsx
// Wallet
useCurrentAccount()           // Bağlı hesap
useAccounts()                // Tüm hesaplar
useConnectWallet()           // Wallet bağlan
useDisconnectWallet()        // Wallet ayır

// Client
useSuiClient()               // Sui client instance
useSuiClientQuery()          // RPC query
useSuiClientInfiniteQuery()  // Paginated query

// Transactions
useSignTransaction()         // Transaction imzala
useSignAndExecuteTransaction() // İmzala ve çalıştır

// Query
useQuery()                   // React Query
useMutation()                // React Query mutation
useQueryClient()             // Cache yönetimi
```

### Transaction Methods

```typescript
tx.moveCall()                // Move fonksiyon çağır
tx.splitCoins()              // Coin böl
tx.mergeCoins()              // Coin birleştir
tx.transferObjects()         // Obje transfer
tx.object()                  // Object referans
tx.pure.u64()               // Pure value (u64)
tx.pure.address()           // Pure value (address)
tx.gas                      // Gas coin
```

---

## Kaynaklar

- Sui TypeScript SDK: https://sdk.mystenlabs.com/typescript
- Sui dApp Kit: https://sdk.mystenlabs.com/dapp-kit
- TanStack Query: https://tanstack.com/query
- Trading Example: sui/examples/trading/
