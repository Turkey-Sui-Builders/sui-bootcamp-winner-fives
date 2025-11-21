# Örnek 2: Data Fetching (Veri Çekme)

Bu örnek, Sui blockchain'den veri çekme işlemlerini gösterir.

## Kod

### PoolInfo.tsx (Object Query)

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";

interface PoolInfoProps {
  poolId: string;
}

function PoolInfo({ poolId }: PoolInfoProps) {
  const { data, isLoading, error, refetch } = useSuiClientQuery(
    "getObject",
    {
      id: poolId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    }
  );

  if (isLoading) {
    return <div>Loading pool data...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  // Parse pool data
  const content = data.data?.content;
  if (!content || content.dataType !== "moveObject") {
    return <div>Invalid pool data</div>;
  }

  const fields = content.fields as any;

  return (
    <div className="pool-info">
      <h2>Pool Information</h2>
      <div className="reserves">
        <p>Reserve A: {fields.reserve_a}</p>
        <p>Reserve B: {fields.reserve_b}</p>
        <p>LP Supply: {fields.lp_supply}</p>
      </div>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}

export default PoolInfo;
```

### MyBalance.tsx (User Coins)

```tsx
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

function MyBalance() {
  const account = useCurrentAccount();

  // SUI balance
  const { data: suiCoins } = useSuiClientQuery(
    "getCoins",
    {
      owner: account?.address!,
      coinType: "0x2::sui::SUI",
    },
    {
      enabled: !!account,
    }
  );

  // Calculate total balance
  const totalBalance = suiCoins?.data.reduce(
    (sum, coin) => sum + BigInt(coin.balance),
    0n
  );

  if (!account) {
    return <div>Connect wallet to see balance</div>;
  }

  return (
    <div className="balance">
      <h3>My SUI Balance</h3>
      <p>{totalBalance?.toString()} MIST</p>
      <p>{Number(totalBalance) / 1e9} SUI</p>
      <div className="coins">
        <h4>Coin Objects ({suiCoins?.data.length})</h4>
        {suiCoins?.data.map((coin) => (
          <div key={coin.coinObjectId}>
            <span>ID: {coin.coinObjectId.slice(0, 8)}...</span>
            <span>Balance: {coin.balance}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyBalance;
```

### AllObjects.tsx (Infinite Scroll)

```tsx
import {
  useCurrentAccount,
  useSuiClientInfiniteQuery
} from "@mysten/dapp-kit";

function AllObjects() {
  const account = useCurrentAccount();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useSuiClientInfiniteQuery(
    "getOwnedObjects",
    {
      owner: account?.address!,
      options: {
        showDisplay: true,
        showType: true,
        showContent: true,
      },
    },
    {
      enabled: !!account,
      select: (data) => data.pages.flatMap((page) => page.data),
    }
  );

  if (!account) {
    return <div>Please connect wallet</div>;
  }

  if (isLoading) {
    return <div>Loading objects...</div>;
  }

  return (
    <div className="objects-list">
      <h2>My Objects ({data?.length})</h2>
      <div className="grid">
        {data?.map((obj) => {
          const display = obj.data?.display?.data;
          return (
            <div key={obj.data?.objectId} className="object-card">
              {display?.image_url && (
                <img src={display.image_url} alt={display.name} />
              )}
              <h3>{display?.name || "Unknown"}</h3>
              <p>{display?.description}</p>
              <small>{obj.data?.objectId.slice(0, 10)}...</small>
            </div>
          );
        })}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}

export default AllObjects;
```

## Açıklama

### 1. useSuiClientQuery

```tsx
useSuiClientQuery("getObject", { id, options }, { enabled })
```

**RPC Methods:**
- `getObject`: Object bilgisi
- `getCoins`: Coin'leri getir
- `getBalance`: Balance getir
- `getOwnedObjects`: Owned objeler
- `queryEvents`: Event'leri query et

**Options:**
```typescript
{
  showContent: boolean;    // Field'ları göster
  showType: boolean;       // Type bilgisi
  showOwner: boolean;      // Owner bilgisi
  showDisplay: boolean;    // Display metadata
}
```

### 2. Query States

```tsx
const { data, isLoading, error, refetch } = useSuiClientQuery(...)
```

**States:**
- `isLoading`: İlk yükleme
- `isFetching`: Background fetch
- `isError`: Hata durumu
- `isSuccess`: Başarılı
- `data`: Dönen veri
- `error`: Hata mesajı

### 3. Conditional Query (enabled)

```tsx
{
  enabled: !!account  // Sadece account varsa çalış
}
```

**Ne Zaman Kullanılır:**
- Wallet bağlı değilken query yapma
- Gerekli parametreler yokken
- Conditional rendering

### 4. Data Selection

```tsx
{
  select: (data) => data.pages.flatMap((page) => page.data)
}
```

**Faydası:**
- Data transform
- Memory optimization
- Gereksiz re-render'ları önle

### 5. Infinite Query

```tsx
useSuiClientInfiniteQuery("getOwnedObjects", params, options)
```

**Methods:**
- `fetchNextPage()`: Sonraki sayfa
- `hasNextPage`: Daha sayfa var mı?
- `isFetchingNextPage`: Sayfa yükleniyor mu?

## Custom Hook Örneği

```tsx
// hooks/usePoolData.ts
import { useSuiClientQuery } from "@mysten/dapp-kit";

export function usePoolData(poolId: string) {
  const query = useSuiClientQuery(
    "getObject",
    { id: poolId, options: { showContent: true } },
    { enabled: !!poolId }
  );

  const reserves = useMemo(() => {
    if (!query.data?.data?.content) return null;

    const fields = query.data.data.content.fields as any;
    return {
      tokenA: BigInt(fields.reserve_a),
      tokenB: BigInt(fields.reserve_b),
      lpSupply: BigInt(fields.lp_supply),
    };
  }, [query.data]);

  return {
    ...query,
    reserves,
  };
}

// Kullanım
function PoolDisplay({ poolId }: { poolId: string }) {
  const { reserves, isLoading } = usePoolData(poolId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>Token A: {reserves?.tokenA.toString()}</p>
      <p>Token B: {reserves?.tokenB.toString()}</p>
    </div>
  );
}
```

## Type Safety

```typescript
// types.ts
interface PoolContent {
  reserve_a: string;
  reserve_b: string;
  lp_supply: string;
  fee_percentage: string;
}

interface SuiPoolObject {
  data: {
    objectId: string;
    content: {
      dataType: "moveObject";
      type: string;
      fields: PoolContent;
    };
  };
}

// Hook ile kullanım
function useTypedPoolData(poolId: string) {
  return useSuiClientQuery<SuiPoolObject>(
    "getObject",
    { id: poolId, options: { showContent: true } }
  );
}
```

## Best Practices

1. **Enable Guard:** `enabled: !!dependency` kullanın
2. **Refetch:** Mutation sonrası `refetch()` çağırın
3. **Loading States:** Her durumu handle edin
4. **Error Handling:** Error state'i gösterin
5. **Data Transformation:** `select` ile optimize edin
6. **Type Safety:** TypeScript typeleri tanımlayın
