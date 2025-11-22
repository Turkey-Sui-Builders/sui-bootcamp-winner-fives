import { createContext, useContext, ReactNode } from "react";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useZkLogin, useEnokiFlow } from "@mysten/enoki/react";

export interface AuthContextType {
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
  const { mutate: disconnectWallet } = useDisconnectWallet();

  const isUsingZkLogin = !!zkLoginAddress;
  const address = zkLoginAddress || currentAccount?.address || null;
  const isConnected = !!address;

  // Debug logging
  console.log("AuthProvider - zkLoginAddress:", zkLoginAddress);
  console.log("AuthProvider - currentAccount:", currentAccount?.address);
  console.log("AuthProvider - final address:", address);
  console.log("AuthProvider - isConnected:", isConnected);

  const logout = () => {
    if (isUsingZkLogin) {
      enokiFlow.logout();
      window.location.href = "/"; // Redirect to home after zkLogin logout
    } else if (currentAccount) {
      disconnectWallet();
    }
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
