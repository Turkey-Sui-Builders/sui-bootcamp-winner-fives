# Örnek 1: Provider Setup ve Wallet Bağlantısı

Bu örnek, Sui dApp'i için gerekli provider setup'ını ve wallet bağlantısını gösterir.

## Kod

### main.tsx (Provider Setup)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "@mysten/dapp-kit/dist/index.css";

import { getFullnodeUrl } from "@mysten/sui/client";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

// React Query client oluştur
const queryClient = new QueryClient();

// Network konfigürasyonu
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl("localnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

### App.tsx (Wallet Connection)

```tsx
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

function App() {
  const account = useCurrentAccount();

  return (
    <div className="App">
      <header>
        <h1>My DeFi dApp</h1>
        <ConnectButton />
      </header>

      {account ? (
        <main>
          <p>Connected: {account.address}</p>
          <p>Welcome to the dApp!</p>
        </main>
      ) : (
        <main>
          <p>Please connect your wallet to continue</p>
        </main>
      )}
    </div>
  );
}

export default App;
```

## Açıklama

### 1. Provider Hiyerarşisi

Provider'ların sırası **çok önemli**:

```
QueryClientProvider (En dışta)
  └─ SuiClientProvider (Network config)
      └─ WalletProvider (Wallet bağlantısı)
          └─ App
```

**Neden bu sıra?**
- `QueryClientProvider`: Data fetching ve cache için
- `SuiClientProvider`: Sui RPC bağlantısı için
- `WalletProvider`: Wallet bağlantısı için

### 2. Network Configuration

```tsx
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});
```

**Network'ler:**
- `localnet`: Yerel development
- `devnet`: Development network
- `testnet`: Test network (hackathon için ideal)
- `mainnet`: Production network

### 3. QueryClient Configuration

```tsx
const queryClient = new QueryClient();
```

**Özelleştirme Örneği:**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 dakika
      cacheTime: 300000, // 5 dakika
      refetchOnWindowFocus: false,
    },
  },
});
```

### 4. ConnectButton

```tsx
<ConnectButton />
```

**Pre-built component:**
- Otomatik wallet detection
- Modal UI
- Disconnect fonksiyonu
- Styling yapılabilir

### 5. useCurrentAccount Hook

```tsx
const account = useCurrentAccount();
```

**Dönen Değer:**
```typescript
{
  address: string;        // "0x..."
  publicKey: Uint8Array;
  chains: string[];
}
```

## Custom Connect Button

Kendi button'unuzu yapmak için:

```tsx
import {
  useConnectWallet,
  useDisconnectWallet,
  useCurrentAccount
} from "@mysten/dapp-kit";

function CustomConnectButton() {
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const account = useCurrentAccount();

  if (account) {
    return (
      <button onClick={() => disconnect()}>
        Disconnect: {account.address.slice(0, 6)}...
        {account.address.slice(-4)}
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

## package.json

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mysten/dapp-kit": "latest",
    "@mysten/sui": "latest",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

## Styling

```css
/* ConnectButton styling */
@import "@mysten/dapp-kit/dist/index.css";

/* Custom overrides */
.wallet-button {
  background: blue;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
}
```

## Best Practices

1. **Provider Order:** Doğru sırada wrapper'layın
2. **Network Selection:** Development için testnet
3. **Auto Connect:** `autoConnect` prop'u kullanın
4. **Error Handling:** Wallet bağlantı hatalarını handle edin
5. **Loading States:** Connection loading state'i gösterin
