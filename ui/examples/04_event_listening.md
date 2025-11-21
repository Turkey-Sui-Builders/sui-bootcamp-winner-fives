# Örnek 4: Event Listening (Olay Dinleme)

Bu örnek, Sui blockchain'den event'leri dinleme ve gösterme işlemlerini gösterir.

## Kod

### SwapHistory.tsx (Past Events)

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";

const PACKAGE_ID = "0x...";

interface SwapEvent {
  pool_id: string;
  input_amount: string;
  output_amount: string;
  is_a_to_b: boolean;
  trader: string;
}

function SwapHistory() {
  const { data, isLoading } = useSuiClientQuery("queryEvents", {
    query: {
      MoveEventType: `${PACKAGE_ID}::dex::SwapExecuted`,
    },
    limit: 50,
    order: "descending",
  });

  if (isLoading) return <div>Loading history...</div>;

  return (
    <div className="swap-history">
      <h2>Recent Swaps</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Trader</th>
            <th>Amount In</th>
            <th>Amount Out</th>
            <th>Direction</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((event) => {
            const swap = event.parsedJson as SwapEvent;
            const timestamp = new Date(
              Number(event.timestampMs)
            ).toLocaleString();

            return (
              <tr key={event.id.txDigest}>
                <td>{timestamp}</td>
                <td>{swap.trader.slice(0, 6)}...</td>
                <td>{swap.input_amount}</td>
                <td>{swap.output_amount}</td>
                <td>{swap.is_a_to_b ? "A → B" : "B → A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SwapHistory;
```

### LiveSwaps.tsx (Real-time Events)

```tsx
import { useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

const PACKAGE_ID = "0x...";

interface SwapEvent {
  pool_id: string;
  input_amount: string;
  output_amount: string;
  trader: string;
}

function LiveSwaps() {
  const client = useSuiClient();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => Promise<boolean>) | null = null;

    const subscribe = async () => {
      try {
        unsubscribe = await client.subscribeEvent({
          filter: {
            MoveEventType: `${PACKAGE_ID}::dex::SwapExecuted`,
          },
          onMessage: (event) => {
            console.log("New swap event:", event);
            setSwaps((prev) => [event, ...prev].slice(0, 10)); // Son 10 swap
          },
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error("Subscription failed:", error);
      }
    };

    subscribe();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [client]);

  return (
    <div className="live-swaps">
      <h2>Live Swaps {isSubscribed && "🟢"}</h2>
      <div className="swap-feed">
        {swaps.length === 0 ? (
          <p>Waiting for swaps...</p>
        ) : (
          swaps.map((swap, index) => {
            const data = swap.parsedJson as SwapEvent;
            return (
              <div key={index} className="swap-item">
                <span className="new-badge">NEW</span>
                <p>
                  Trader: {data.trader.slice(0, 6)}...{data.trader.slice(-4)}
                </p>
                <p>Amount In: {data.input_amount}</p>
                <p>Amount Out: {data.output_amount}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default LiveSwaps;
```

### usePoolEvents.ts (Custom Hook)

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo } from "react";

const PACKAGE_ID = "0x...";

interface PoolEventData {
  totalSwaps: number;
  totalVolume: bigint;
  lastSwapTime: number;
}

export function usePoolEvents(poolId: string) {
  const { data, isLoading } = useSuiClientQuery("queryEvents", {
    query: {
      MoveEventType: `${PACKAGE_ID}::dex::SwapExecuted`,
    },
    limit: 100,
  });

  const analytics = useMemo((): PoolEventData => {
    if (!data?.data) {
      return {
        totalSwaps: 0,
        totalVolume: 0n,
        lastSwapTime: 0,
      };
    }

    const events = data.data;
    const poolEvents = events.filter(
      (e) => e.parsedJson.pool_id === poolId
    );

    const totalVolume = poolEvents.reduce((sum, event) => {
      return sum + BigInt(event.parsedJson.input_amount);
    }, 0n);

    const lastSwap = poolEvents[0];
    const lastSwapTime = lastSwap ? Number(lastSwap.timestampMs) : 0;

    return {
      totalSwaps: poolEvents.length,
      totalVolume,
      lastSwapTime,
    };
  }, [data, poolId]);

  return {
    analytics,
    isLoading,
  };
}

// Kullanım
function PoolAnalytics({ poolId }: { poolId: string }) {
  const { analytics, isLoading } = usePoolEvents(poolId);

  if (isLoading) return <div>Loading analytics...</div>;

  return (
    <div className="pool-analytics">
      <h3>Pool Analytics</h3>
      <p>Total Swaps: {analytics.totalSwaps}</p>
      <p>Total Volume: {analytics.totalVolume.toString()}</p>
      <p>Last Swap: {new Date(analytics.lastSwapTime).toLocaleString()}</p>
    </div>
  );
}
```

### EventFilter.tsx (Filtered Events)

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useState } from "react";

const PACKAGE_ID = "0x...";

type EventType = "SwapExecuted" | "LiquidityAdded" | "LiquidityRemoved";

function EventFilter() {
  const [eventType, setEventType] = useState<EventType>("SwapExecuted");

  const { data, isLoading } = useSuiClientQuery("queryEvents", {
    query: {
      MoveEventType: `${PACKAGE_ID}::dex::${eventType}`,
    },
    limit: 20,
  });

  return (
    <div>
      <div className="filters">
        <button onClick={() => setEventType("SwapExecuted")}>Swaps</button>
        <button onClick={() => setEventType("LiquidityAdded")}>
          Add Liquidity
        </button>
        <button onClick={() => setEventType("LiquidityRemoved")}>
          Remove Liquidity
        </button>
      </div>

      {isLoading ? (
        <div>Loading events...</div>
      ) : (
        <div className="events">
          <h3>{eventType} Events</h3>
          {data?.data.map((event) => (
            <div key={event.id.txDigest}>
              <pre>{JSON.stringify(event.parsedJson, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EventFilter;
```

## Açıklama

### 1. Query Events

```tsx
useSuiClientQuery("queryEvents", {
  query: { MoveEventType: EVENT_TYPE },
  limit: 50,
  order: "descending"
})
```

**Query Options:**
- `MoveEventType`: Event tipi filtresi
- `Sender`: Event gönderen adres
- `TimeRange`: Zaman aralığı
- `limit`: Maksimum event sayısı
- `order`: Sıralama (ascending/descending)

### 2. Event Structure

```typescript
{
  id: {
    txDigest: string;
    eventSeq: string;
  };
  packageId: string;
  transactionModule: string;
  sender: string;
  type: string;
  parsedJson: any;
  timestampMs: string;
}
```

### 3. Subscribe Events (Real-time)

```tsx
await client.subscribeEvent({
  filter: { MoveEventType: EVENT_TYPE },
  onMessage: (event) => {
    // Event geldiğinde çalışır
  }
})
```

**Filter Types:**
- `MoveEventType`: Belirli event tipi
- `Sender`: Belirli sender
- `All`: Tüm event'ler

### 4. Event Parsing

```tsx
const eventData = event.parsedJson as YourEventType;
```

**Type Safety:**
```typescript
interface SwapExecutedEvent {
  pool_id: string;
  input_amount: string;
  output_amount: string;
  is_a_to_b: boolean;
  trader: string;
}

const data = event.parsedJson as SwapExecutedEvent;
```

### 5. Cleanup (Unsubscribe)

```tsx
useEffect(() => {
  const unsubscribe = client.subscribeEvent({ ... });

  return () => {
    unsubscribe.then(fn => fn());
  };
}, [client]);
```

## Advanced Pattern: Event Aggregation

```tsx
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo } from "react";

function usePoolStatistics(poolId: string) {
  const { data } = useSuiClientQuery("queryEvents", {
    query: { MoveEventType: `${PACKAGE_ID}::dex::SwapExecuted` },
    limit: 1000,
  });

  const stats = useMemo(() => {
    if (!data?.data) return null;

    const poolSwaps = data.data.filter(
      (e) => e.parsedJson.pool_id === poolId
    );

    // 24 saat içindeki swap'ler
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = poolSwaps.filter(
      (e) => Number(e.timestampMs) > last24h
    );

    // Volume hesapla
    const volume24h = recent.reduce(
      (sum, e) => sum + BigInt(e.parsedJson.input_amount),
      0n
    );

    // Unique trader sayısı
    const uniqueTraders = new Set(
      recent.map((e) => e.parsedJson.trader)
    ).size;

    return {
      swapCount24h: recent.length,
      volume24h,
      uniqueTraders,
      avgSwapSize: volume24h / BigInt(recent.length || 1),
    };
  }, [data, poolId]);

  return stats;
}
```

## Best Practices

1. **Limit:** Event query'lerinde limit kullanın (performance)
2. **Cleanup:** Subscribe'ı unmount'ta cleanup edin
3. **Type Safety:** Event data için type tanımlayın
4. **Pagination:** Çok event varsa pagination kullanın
5. **Filtering:** Client-side filter minimal tutun
6. **State Management:** useState ile event listesi yönetin
7. **Error Handling:** Subscription error'larını handle edin

## Styling Örneği

```css
.live-swaps {
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
}

.swap-feed {
  max-height: 400px;
  overflow-y: auto;
}

.swap-item {
  padding: 10px;
  margin: 5px 0;
  background: #f5f5f5;
  border-radius: 4px;
  animation: slideIn 0.3s ease-in;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.new-badge {
  background: #ff4444;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
```
