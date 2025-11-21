# Örnek 5: Complete DEX Component

Bu örnek, tüm öğrenilenleri birleştiren tam bir DEX swap component'i gösterir.

## Kod

### types.ts

```typescript
export interface Pool {
  id: string;
  reserve_a: string;
  reserve_b: string;
  lp_supply: string;
  fee_percentage: number;
}

export interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  minimumReceived: bigint;
}
```

### hooks/useSwap.ts

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTransactionExecution } from "./useTransactionExecution";

const PACKAGE_ID = "0x...";

interface SwapParams {
  poolId: string;
  inputCoinIds: string[];
  outputAmount: bigint;
  slippage: number;
  tokenAType: string;
  tokenBType: string;
  isAtoB: boolean;
}

export function useSwap() {
  const account = useCurrentAccount();
  const executeTransaction = useTransactionExecution();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      if (!account?.address) throw new Error("Wallet not connected!");

      const tx = new Transaction();

      // 1. Merge coins if multiple
      const [primaryCoin, ...otherCoins] = params.inputCoinIds.map((id) =>
        tx.object(id)
      );

      if (otherCoins.length > 0) {
        tx.mergeCoins(primaryCoin, otherCoins);
      }

      // 2. Calculate minimum output with slippage
      const minOutput =
        params.outputAmount - (params.outputAmount * BigInt(params.slippage)) / 100n;

      // 3. Perform swap
      const target = params.isAtoB
        ? `${PACKAGE_ID}::dex::swap_a_to_b`
        : `${PACKAGE_ID}::dex::swap_b_to_a`;

      const [outputCoin] = tx.moveCall({
        target,
        arguments: [tx.object(params.poolId), primaryCoin],
        typeArguments: [params.tokenAType, params.tokenBType],
      });

      // 4. Transfer output to user
      tx.transferObjects([outputCoin], tx.pure.address(account.address));

      return executeTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool"] });
      queryClient.invalidateQueries({ queryKey: ["getCoins"] });
    },
  });
}
```

### hooks/usePoolData.ts

```typescript
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo } from "react";
import { Pool } from "../types";

export function usePoolData(poolId: string) {
  const { data, isLoading } = useSuiClientQuery(
    "getObject",
    {
      id: poolId,
      options: { showContent: true },
    },
    { enabled: !!poolId }
  );

  const pool = useMemo((): Pool | null => {
    if (!data?.data?.content || data.data.content.dataType !== "moveObject") {
      return null;
    }

    const fields = data.data.content.fields as any;
    return {
      id: poolId,
      reserve_a: fields.reserve_a,
      reserve_b: fields.reserve_b,
      lp_supply: fields.lp_supply,
      fee_percentage: Number(fields.fee_percentage),
    };
  }, [data, poolId]);

  return { pool, isLoading };
}
```

### hooks/useSwapQuote.ts

```typescript
import { useMemo } from "react";
import { usePoolData } from "./usePoolData";
import { SwapQuote } from "../types";

export function useSwapQuote(
  poolId: string,
  inputAmount: bigint,
  isAtoB: boolean
): SwapQuote | null {
  const { pool } = usePoolData(poolId);

  return useMemo(() => {
    if (!pool || inputAmount === 0n) return null;

    const reserveIn = isAtoB
      ? BigInt(pool.reserve_a)
      : BigInt(pool.reserve_b);
    const reserveOut = isAtoB
      ? BigInt(pool.reserve_b)
      : BigInt(pool.reserve_a);

    // Constant product formula: x * y = k
    // Output = (inputAmount * reserveOut) / (reserveIn + inputAmount)
    const outputAmount =
      (inputAmount * reserveOut) / (reserveIn + inputAmount);

    // Price impact calculation
    const priceImpact =
      Number((inputAmount * 10000n) / reserveIn) / 100;

    // Minimum received (with 0.5% slippage)
    const minimumReceived = (outputAmount * 995n) / 1000n;

    return {
      inputAmount,
      outputAmount,
      priceImpact,
      minimumReceived,
    };
  }, [pool, inputAmount, isAtoB]);
}
```

### components/SwapInterface.tsx

```tsx
import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useSwap } from "../hooks/useSwap";
import { useSwapQuote } from "../hooks/useSwapQuote";
import { usePoolData } from "../hooks/usePoolData";

const POOL_ID = "0x...";
const TOKEN_A_TYPE = "0x...::token_a::TOKEN_A";
const TOKEN_B_TYPE = "0x...::token_b::TOKEN_B";

function SwapInterface() {
  const account = useCurrentAccount();
  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  const [isAtoB, setIsAtoB] = useState(true);

  const { pool, isLoading: poolLoading } = usePoolData(POOL_ID);
  const { mutate: swap, isPending } = useSwap();

  // Get user's coins
  const { data: coins } = useSuiClientQuery(
    "getCoins",
    {
      owner: account?.address!,
      coinType: isAtoB ? TOKEN_A_TYPE : TOKEN_B_TYPE,
    },
    { enabled: !!account }
  );

  // Calculate quote
  const inputAmountBigInt = inputAmount
    ? BigInt(Math.floor(parseFloat(inputAmount) * 1e9))
    : 0n;

  const quote = useSwapQuote(POOL_ID, inputAmountBigInt, isAtoB);

  // Calculate user balance
  const balance =
    coins?.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n) || 0n;

  const handleSwap = () => {
    if (!quote || !coins?.data.length) return;

    swap({
      poolId: POOL_ID,
      inputCoinIds: coins.data.map((c) => c.coinObjectId),
      outputAmount: quote.outputAmount,
      slippage,
      tokenAType: TOKEN_A_TYPE,
      tokenBType: TOKEN_B_TYPE,
      isAtoB,
    });
  };

  const handleFlip = () => {
    setIsAtoB(!isAtoB);
    setInputAmount("");
  };

  if (!account) {
    return (
      <div className="swap-interface">
        <p>Please connect your wallet to swap</p>
      </div>
    );
  }

  if (poolLoading) {
    return <div>Loading pool data...</div>;
  }

  return (
    <div className="swap-interface">
      <h2>Swap Tokens</h2>

      {/* Pool Info */}
      {pool && (
        <div className="pool-info">
          <p>Reserve A: {(Number(pool.reserve_a) / 1e9).toFixed(2)}</p>
          <p>Reserve B: {(Number(pool.reserve_b) / 1e9).toFixed(2)}</p>
          <p>Fee: {pool.fee_percentage / 100}%</p>
        </div>
      )}

      {/* Input */}
      <div className="swap-input">
        <label>{isAtoB ? "Token A" : "Token B"}</label>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="0.0"
        />
        <p className="balance">
          Balance: {(Number(balance) / 1e9).toFixed(4)}
        </p>
      </div>

      {/* Flip Button */}
      <button onClick={handleFlip} className="flip-btn">
        ↓ ↑
      </button>

      {/* Output */}
      <div className="swap-output">
        <label>{isAtoB ? "Token B" : "Token A"}</label>
        <input
          type="number"
          value={quote ? (Number(quote.outputAmount) / 1e9).toFixed(4) : "0"}
          disabled
          placeholder="0.0"
        />
      </div>

      {/* Quote Details */}
      {quote && (
        <div className="quote-details">
          <div className="detail">
            <span>Price Impact:</span>
            <span
              className={
                quote.priceImpact > 5 ? "high-impact" : ""
              }
            >
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="detail">
            <span>Minimum Received:</span>
            <span>{(Number(quote.minimumReceived) / 1e9).toFixed(4)}</span>
          </div>
          <div className="detail">
            <span>Slippage Tolerance:</span>
            <select
              value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
            >
              <option value={0.1}>0.1%</option>
              <option value={0.5}>0.5%</option>
              <option value={1}>1%</option>
              <option value={3}>3%</option>
            </select>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!quote || isPending || inputAmountBigInt === 0n}
        className="swap-btn"
      >
        {isPending ? "Swapping..." : "Swap"}
      </button>

      {/* Warnings */}
      {quote && quote.priceImpact > 5 && (
        <div className="warning">
          ⚠️ High price impact! Consider smaller amount.
        </div>
      )}
    </div>
  );
}

export default SwapInterface;
```

### styles.css

```css
.swap-interface {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pool-info {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.swap-input,
.swap-output {
  margin: 12px 0;
}

.swap-input input,
.swap-output input {
  width: 100%;
  padding: 16px;
  font-size: 24px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  margin-top: 8px;
}

.balance {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.flip-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  margin: 8px auto;
  display: block;
  font-size: 20px;
}

.quote-details {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

.detail {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  font-size: 14px;
}

.high-impact {
  color: #ff4444;
  font-weight: bold;
}

.swap-btn {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  background: #0066ff;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.swap-btn:hover:not(:disabled) {
  background: #0052cc;
}

.swap-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.warning {
  margin-top: 12px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  color: #856404;
  font-size: 14px;
}
```

## Özellikler

Bu component aşağıdaki özellikleri içerir:

1. ✅ **Wallet Bağlantısı Kontrolü**
2. ✅ **Pool Data Fetching**
3. ✅ **User Balance Gösterimi**
4. ✅ **Real-time Quote Calculation**
5. ✅ **Price Impact Warning**
6. ✅ **Slippage Tolerance**
7. ✅ **Multi-Coin Merge**
8. ✅ **Loading States**
9. ✅ **Error Handling**
10. ✅ **Responsive UI**

## Kullanım

```tsx
import SwapInterface from "./components/SwapInterface";

function App() {
  return (
    <div className="app">
      <SwapInterface />
    </div>
  );
}
```

## Genişletme Fikirleri

1. **Token Selector:** Birden fazla pool için token seçimi
2. **Transaction History:** Kullanıcının geçmiş swap'leri
3. **Price Chart:** Fiyat grafiği gösterimi
4. **Advanced Settings:** Gas fee, deadline
5. **Multi-hop Swap:** Birden fazla pool üzerinden routing
