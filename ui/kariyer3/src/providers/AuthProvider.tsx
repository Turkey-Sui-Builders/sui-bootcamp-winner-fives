import { createContext, useContext, ReactNode } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useZkLogin, useEnokiFlow } from "@mysten/enoki/react";

interface AuthContextType {
  address: string | null;
  isConnected: boolean;
  isUsingZkLogin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  address: null,
  isConnected: false,
  isUsingZkLogin: false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hybrid Auth Strategy: zkLogin (Primary) + WalletConnect (Fallback)
  const { address: zkLoginAddress } = useZkLogin();
  const enokiFlow = useEnokiFlow();
  const currentAccount = useCurrentAccount();

  const isUsingZkLogin = !!zkLoginAddress;
  const address = zkLoginAddress || currentAccount?.address || null;
  const isConnected = !!address;

  const logout = () => {
    if (isUsingZkLogin) {
      enokiFlow.logout();
    }
    // For wallet, user disconnects manually via wallet UI
  };

  return (
    <AuthContext.Provider
      value={{
        address,
        isConnected,
        isUsingZkLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
