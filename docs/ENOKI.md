# Sui Enoki - DeFi Hackathon Rehberi

Enoki, Mysten Labs tarafından geliştirilen bir authentication ve sponsored transaction servisidir. zkLogin ile passwordless authentication sağlar ve gas fees'i sponsor ederek kullanıcı deneyimini iyileştirir.

---

## 1. Enoki Nedir?

Enoki, iki ana özellik sunar:

### 1.1 zkLogin (Passwordless Authentication)

- **Google/Facebook/Apple Sign-In**: Kullanıcılar wallet extension'a gerek kalmadan sosyal medya hesaplarıyla giriş yapar
- **Zero-Knowledge Proof**: Private key kullanıcının tarayıcısında oluşturulur, hiçbir backend'de saklanmaz
- **Sui Address Generation**: Her kullanıcı için unique Sui address oluşturulur
- **Session Management**: JWT token ile session yönetimi

### 1.2 Sponsored Transactions

- **Gas-Free Transactions**: Backend gas fee'leri sponsor eder
- **Allow List**: Belirli move call target'ları ve address'leri whitelist'e alabilirsiniz
- **Developer Flexibility**: Backend'de veya frontend'de sponsorship yapılabilir

---

## 2. Enoki Dev Portal Setup

### 2.1 API Keys Oluşturma

**1. Portal'a Giriş:**
- [Enoki Dev Portal](https://portal.enoki.mystenlabs.com)'a gidin
- Email ile giriş yapın
- İlk girişte proje bilgilerinizi girin

**2. İki Ayrı API Key Oluşturun:**

**zkLogin Key (Public):**
```
API key type: Public
Enabled networks: Testnet
Enabled features: zkLogin
```

**Sponsored Transactions Key (Private):**
```
API key type: Private
Enabled networks: Testnet
Enabled features: Sponsored transactions
```

**3. .env Dosyasına Ekleyin:**

```env
# .env (Public - Git'e commit edilebilir)
NEXT_PUBLIC_ENOKI_API_KEY=enoki_public_aa763a9d36bb6aa1e41062dd67df2518
NEXT_PUBLIC_GOOGLE_CLIENT_ID=277348171272-epn1s82k6bmumooapalnsdq0lu19d27t.apps.googleusercontent.com
```

```env
# .env.local (Private - Git'e commit EDİLMEMELİ)
ENOKI_SECRET_KEY=enoki_private_905204de81012fd7422a9902907f112c
PACKAGE_ID=0x7b6a8f5782e57cd948dc75ee098b73046a79282183d51eefb83d31ec95c312aa
```

### 2.2 Auth Provider Setup (Google)

**1. Google Console:**
- [Google Developers Console](https://console.cloud.google.com/apis/credentials)'a gidin
- `+ Create Credentials` → `OAuth client ID` seçin
- Application type: `Web application`
- Authorized redirect URIs: `http://localhost:3000/auth`

**2. Client ID'yi Enoki Portal'a Ekleyin:**
- Enoki Portal → Auth Providers → + New Auth Provider
- Provider: Google
- Client ID'yi yapıştırın

### 2.3 Sponsored Transactions Allow List

**Enoki Portal → Sponsored Transactions bölümünde:**

**Move Call Targets Ekleyin:**
```
{PACKAGE_ID}::counter::create
{PACKAGE_ID}::counter::increment
{PACKAGE_ID}::dex::swap_a_to_b
{PACKAGE_ID}::pool::add_liquidity
```

**Not:** `{PACKAGE_ID}`'yi deploy ettiğiniz package ID ile değiştirin.

**Allowed Addresses:** (Opsiyonel)
- Specific user address'leri ekleyebilirsiniz
- Boş bırakırsanız tüm address'ler sponsor edilebilir

---

## 3. Backend Setup (Next.js API Routes)

### 3.1 Enoki Client Oluşturma

**`app/api/EnokiClient.ts`:**
```typescript
import { EnokiClient } from "@mysten/enoki";

export const enokiClient = new EnokiClient({
  apiKey: process.env.ENOKI_SECRET_KEY!, // Private key
});
```

### 3.2 Sponsor API Route

**`app/api/sponsor/route.ts`:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";

export const POST = async (request: NextRequest) => {
  const { network, txBytes, sender, allowedAddresses } = await request.json();

  return enokiClient
    .createSponsoredTransaction({
      network,
      transactionKindBytes: txBytes,
      sender,
      allowedAddresses,
    })
    .then((resp) => {
      return NextResponse.json(resp, { status: 200 });
    })
    .catch((error) => {
      console.error(error);
      return NextResponse.json(
        { error: "Could not create sponsored transaction block." },
        { status: 500 }
      );
    });
};
```

### 3.3 Execute API Route

**`app/api/execute/route.ts`:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { enokiClient } from "../EnokiClient";

export const POST = async (request: NextRequest) => {
  const { digest, signature } = await request.json();

  return enokiClient
    .executeSponsoredTransaction({
      digest,
      signature,
    })
    .then(({ digest }) => {
      return NextResponse.json({ digest }, { status: 200 });
    })
    .catch((error) => {
      console.error(error);
      return NextResponse.json(
        { error: "Could not execute sponsored transaction block." },
        { status: 500 }
      );
    });
};
```

---

## 4. Frontend Setup (React + TypeScript)

### 4.1 Provider Hierarchy

**`app/ProvidersAndLayout.tsx`:**
```typescript
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClientProvider } from "@tanstack/react-query";

export const ProvidersAndLayout = ({ children }) => {
  const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl("testnet") },
    mainnet: { url: getFullnodeUrl("mainnet") },
  });

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>
          <EnokiFlowProvider apiKey={ENOKI_API_KEY}>
            <CustomWalletProvider>
              {children}
            </CustomWalletProvider>
          </EnokiFlowProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};
```

**Provider Sırası Önemli:**
1. QueryClientProvider (en dış)
2. SuiClientProvider
3. WalletProvider
4. EnokiFlowProvider
5. CustomWalletProvider (kendi wrapper'ınız)

### 4.2 Custom Wallet Context

**`contexts/CustomWallet.tsx`:**
```typescript
import { useEnokiFlow, useZkLogin, useZkLoginSession } from "@mysten/enoki/react";
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";

export const CustomWalletContext = createContext({
  isConnected: false,
  isUsingEnoki: false,
  address: undefined,
  jwt: undefined,
  sponsorAndExecuteTransactionBlock: async () => {},
  logout: () => {},
  redirectToAuthUrl: () => {},
});

export default function CustomWalletProvider({ children }) {
  const { address: enokiAddress } = useZkLogin();
  const zkLoginSession = useZkLoginSession();
  const enokiFlow = useEnokiFlow();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransactionBlock } = useSignTransaction();

  const isConnected = !!enokiAddress || !!currentAccount;
  const isUsingEnoki = !!enokiAddress;
  const address = enokiAddress || currentAccount?.address;

  const logout = () => {
    if (isUsingEnoki) {
      enokiFlow.logout();
    } else {
      disconnect();
    }
  };

  return (
    <CustomWalletContext.Provider
      value={{
        isConnected,
        isUsingEnoki,
        address,
        jwt: zkLoginSession?.jwt,
        sponsorAndExecuteTransactionBlock,
        logout,
        redirectToAuthUrl,
      }}
    >
      {children}
    </CustomWalletContext.Provider>
  );
}

export const useCustomWallet = () => useContext(CustomWalletContext);
```

### 4.3 Google Login Flow

**Google Login Başlatma:**
```typescript
const redirectToAuthUrl = () => {
  const protocol = window.location.protocol;
  const host = window.location.host;
  const customRedirectUri = `${protocol}//${host}/auth`;

  enokiFlow
    .createAuthorizationURL({
      provider: "google",
      network: "testnet",
      clientId: GOOGLE_CLIENT_ID,
      redirectUrl: customRedirectUri,
      extraParams: {
        scope: ["openid", "email", "profile"],
      },
    })
    .then((url) => {
      router.push(url);
    });
};

// Button'da kullanım
<button onClick={redirectToAuthUrl}>
  Sign in with Google
</button>
```

**Auth Callback Page:**
```typescript
// app/auth/page.tsx
import { useAuthCallback } from "@mysten/enoki/react";

export default function AuthPage() {
  const { handled } = useAuthCallback(); // Callback'i otomatik handle eder

  useEffect(() => {
    if (handled) {
      // Redirect to home page
      router.push("/");
    }
  }, [handled]);

  return <Loading />;
}
```

---

## 5. Sponsored Transactions Implementation

### 5.1 Backend Sponsorship Flow

**Custom Wallet Context'te:**
```typescript
const sponsorAndExecuteTransactionBlock = async ({
  tx,
  network,
  options,
  allowedAddresses = [],
}) => {
  // Step 1: Build transaction bytes
  const txBytes = await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  // Step 2: Request sponsorship from backend
  const sponsorResponse = await axios.post("/api/sponsor", {
    network,
    txBytes: toB64(txBytes),
    sender: address,
    allowedAddresses,
  });

  const { bytes, digest } = sponsorResponse.data;

  // Step 3: Sign transaction
  const signature = await signTransaction(fromB64(bytes));

  // Step 4: Execute sponsored transaction
  const executeResponse = await axios.post("/api/execute", {
    signature,
    digest,
  });

  // Step 5: Wait for transaction
  const finalDigest = executeResponse.data.digest;
  await suiClient.waitForTransaction({ digest: finalDigest });

  return suiClient.getTransactionBlock({ digest: finalDigest, options });
};
```

### 5.2 Frontend Sponsorship (Enoki Flow)

**Enoki kullanıcıları için direct sponsorship:**
```typescript
const sponsorAndExecuteTransactionBlock = async ({ tx }) => {
  if (isUsingEnoki) {
    // Frontend'de direct sponsor
    const response = await enokiFlow.sponsorAndExecuteTransaction({
      network: "testnet",
      transaction: tx,
      client: suiClient,
    });

    return response;
  } else {
    // Backend üzerinden sponsor (wallet kullanıcıları için)
    // ... backend flow
  }
};
```

### 5.3 Hook Example: Create Counter

**`hooks/useCreateCounterTransaction.ts`:**
```typescript
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction } from "@mysten/sui/transactions";

export const useCreateCounterTransaction = () => {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const handleExecute = async () => {
    const txb = new Transaction();

    txb.moveCall({
      target: `${PACKAGE_ID}::counter::create`,
    });

    return await sponsorAndExecuteTransactionBlock({
      tx: txb,
      network: "testnet",
      includesTransferTx: true,
      allowedAddresses: [address],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  };

  return { handleExecute };
};
```

**Component'te kullanım:**
```typescript
import { useCreateCounterTransaction } from "@/hooks/useCreateCounterTransaction";

export function CreateCounter({ onCreated }) {
  const { handleExecute } = useCreateCounterTransaction();
  const [waiting, setWaiting] = useState(false);

  async function create() {
    setWaiting(true);
    const txn = await handleExecute();
    const objectId = txn.effects?.created?.[0]?.reference?.objectId;

    if (objectId) {
      onCreated(objectId);
    }
    setWaiting(false);
  }

  return (
    <button onClick={create} disabled={waiting}>
      {waiting ? "Creating..." : "Create Counter"}
    </button>
  );
}
```

---

## 6. DeFi Use Cases

### 6.1 Gas-Free DEX Swaps

```typescript
// hooks/useSwapTransaction.ts
export const useSwapTransaction = () => {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const handleSwap = async (poolId: string, inputCoin: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::dex::swap_a_to_b`,
      arguments: [tx.object(poolId), tx.object(inputCoin)],
      typeArguments: [TOKEN_A_TYPE, TOKEN_B_TYPE],
    });

    return await sponsorAndExecuteTransactionBlock({
      tx,
      network: "testnet",
      includesTransferTx: false,
      allowedAddresses: [address],
      options: { showEffects: true },
    });
  };

  return { handleSwap };
};
```

### 6.2 Free Liquidity Provision

```typescript
export const useAddLiquidityTransaction = () => {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const handleAddLiquidity = async (
    poolId: string,
    coinA: string,
    coinB: string
  ) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::pool::add_liquidity`,
      arguments: [
        tx.object(poolId),
        tx.object(coinA),
        tx.object(coinB),
      ],
      typeArguments: [TOKEN_A_TYPE, TOKEN_B_TYPE],
    });

    return await sponsorAndExecuteTransactionBlock({
      tx,
      network: "testnet",
      includesTransferTx: false,
      allowedAddresses: [address],
      options: { showEffects: true },
    });
  };

  return { handleAddLiquidity };
};
```

### 6.3 Passwordless NFT Minting

```typescript
export const useMintNFT = () => {
  const { sponsorAndExecuteTransactionBlock, address } = useCustomWallet();

  const mint = async (collectionId: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::nft::mint`,
      arguments: [tx.object(collectionId)],
    });

    return await sponsorAndExecuteTransactionBlock({
      tx,
      network: "testnet",
      includesTransferTx: true,
      allowedAddresses: [address],
      options: { showEffects: true, showObjectChanges: true },
    });
  };

  return { mint };
};
```

---

## 7. Move Contract Example

**Simple Counter (Enoki Example App'ten):**

```move
module counter::counter {
  /// A shared counter.
  public struct Counter has key {
    id: UID,
    owner: address,
    value: u64
  }

  /// Create and share a Counter object.
  public fun create(ctx: &mut TxContext) {
    transfer::share_object(Counter {
      id: object::new(ctx),
      owner: ctx.sender(),
      value: 0
    })
  }

  /// Increment a counter by 1.
  public fun increment(counter: &mut Counter) {
    counter.value = counter.value + 1;
  }

  /// Set value (only runnable by the Counter owner)
  public fun set_value(counter: &mut Counter, value: u64, ctx: &TxContext) {
    assert!(counter.owner == ctx.sender(), 0);
    counter.value = value;
  }
}
```

**Enoki Portal'da Allow List:**
```
{PACKAGE_ID}::counter::create
{PACKAGE_ID}::counter::increment
{PACKAGE_ID}::counter::set_value
```

---

## 8. Security Considerations

### 8.1 Allow List Best Practices

**Production'da:**
```typescript
// ❌ Kötü: Tüm address'lere izin verme
allowedAddresses: []

// ✅ İyi: Sadece sender'a izin ver
allowedAddresses: [address]
```

**Backend Validation (Recommended):**
```typescript
export const POST = async (request: NextRequest) => {
  const { network, txBytes, sender, allowedAddresses } = await request.json();

  // JWT token validation
  const token = request.headers.get("Authorization");
  const decoded = jwtDecode(token);

  // Sender address doğrulama
  if (decoded.address !== sender) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Transaction commands sayısını sınırla
  const tx = Transaction.from(fromB64(txBytes));
  if (tx.getData().commands.length > 5) {
    return NextResponse.json({ error: "Too many commands" }, { status: 400 });
  }

  // Sponsor et
  return enokiClient.createSponsoredTransaction({
    network,
    transactionKindBytes: txBytes,
    sender,
    allowedAddresses: [sender], // Force sender only
  });
};
```

### 8.2 zkLogin Security

**Private Key Yönetimi:**
- Private key browser'da oluşturulur
- Hiçbir backend'de saklanmaz
- Session storage'da ephemeral keypair tutulur

**Session Storage:**
```typescript
const sessionStorageAdapter = {
  getItem: async (key) => sessionStorage.getItem(key),
  setItem: async (key, value) => sessionStorage.setItem(key, value),
  removeItem: async (key) => sessionStorage.removeItem(key),
};
```

### 8.3 Rate Limiting

**Backend'de rate limiting ekleyin:**
```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
});

export const POST = limiter(async (request: NextRequest) => {
  // Sponsorship logic
});
```

---

## 9. Testing

### 9.1 Local Development

**1. Backend'i Başlat:**
```bash
cd app
npm install
npm run dev
```

**2. Test Kullanıcısı:**
- Google Sign-In ile giriş yapın
- Browser DevTools → Application → Session Storage
- `enoki_zklogin_session` key'ine bakın

**3. Transaction Test:**
```typescript
// Console'da test
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::counter::create`,
});

const result = await sponsorAndExecuteTransactionBlock({
  tx,
  network: "testnet",
  includesTransferTx: true,
  allowedAddresses: [address],
  options: { showEffects: true },
});

console.log(result);
```

### 9.2 Testnet Deployment

**Vercel Deploy:**
```bash
vercel --prod
```

**Environment Variables (Vercel Dashboard):**
```
ENOKI_SECRET_KEY=enoki_private_...
NEXT_PUBLIC_ENOKI_API_KEY=enoki_public_...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_PACKAGE_ID=...
```

---

## 10. Complete Example Flow

**1. User Journey:**
```
User clicks "Sign in with Google"
  ↓
redirectToAuthUrl() creates auth URL
  ↓
Google OAuth flow
  ↓
Redirect to /auth
  ↓
useAuthCallback() handles callback
  ↓
zkLogin session created
  ↓
User redirected to home page
  ↓
User clicks "Create Counter"
  ↓
Transaction built
  ↓
Backend sponsors transaction
  ↓
User signs transaction
  ↓
Backend executes transaction
  ↓
Counter created (gas-free for user)
```

**2. Code Flow:**
```typescript
// 1. Login
<button onClick={redirectToAuthUrl}>Sign in with Google</button>

// 2. Create transaction
const { handleExecute } = useCreateCounterTransaction();

// 3. Execute
const txn = await handleExecute();

// 4. Backend sponsorship (automatic)
// - /api/sponsor creates sponsored tx
// - User signs in browser
// - /api/execute executes tx

// 5. Result
const objectId = txn.effects?.created?.[0]?.reference?.objectId;
```

---

## 11. Best Practices

### For DeFi Protocols

1. **Selective Sponsorship**: Sadece kritik işlemleri sponsor edin (swap, liquidity provision)
2. **User Onboarding**: İlk işlemi sponsor ederek onboarding'i kolaylaştırın
3. **Rate Limiting**: Abuse'i önlemek için rate limiting ekleyin
4. **Analytics**: Sponsored transaction metrics takip edin

### For Developers

1. **Error Handling**: Network errors, insufficient balance, rejected transactions
2. **Loading States**: Transaction pending durumunda UI feedback
3. **Transaction Tracking**: Digest'leri kaydedin ve kullanıcıya gösterin
4. **Fallback**: Sponsorship fail olursa normal transaction flow'a geç

---

## Kaynaklar

- Enoki Dev Portal: https://portal.enoki.mystenlabs.com
- Enoki Example App: https://github.com/sui-foundation/enoki-example-app
- @mysten/enoki: https://www.npmjs.com/package/@mysten/enoki
- Google OAuth Setup: https://console.cloud.google.com/apis/credentials
