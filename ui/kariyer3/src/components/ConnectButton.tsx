import { useEnokiFlow } from "@mysten/enoki/react";
import { ConnectButton as DappKitConnectButton } from "@mysten/dapp-kit";
import { useAuth } from "../providers/AuthProvider";
import { GOOGLE_CLIENT_ID, NETWORK } from "../config/constants";

export function ConnectButton() {
  const { address, isConnected, isUsingZkLogin, logout } = useAuth();
  const enokiFlow = useEnokiFlow();

  const handleGoogleLogin = async () => {
    try {
      const protocol = window.location.protocol;
      const host = window.location.host;
      const redirectUrl = `${protocol}//${host}/auth`;

      const authUrl = await enokiFlow.createAuthorizationURL({
        provider: "google",
        network: NETWORK,
        clientId: GOOGLE_CLIENT_ID,
        redirectUrl,
        extraParams: {
          scope: ["openid", "email", "profile"],
        },
      });

      window.location.href = authUrl;
    } catch (error) {
      console.error("Google login failed:", error);
      alert("Failed to initiate Google login");
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="chip font-mono text-xs text-gray-100">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button onClick={logout} className="text-sm font-semibold text-gray-300 hover:text-white transition-smooth">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Primary: Google zkLogin */}
      <button onClick={handleGoogleLogin} className="btn-primary">
        Sign in with Google
      </button>

      {/* Fallback: Wallet Connect */}
      <DappKitConnectButton />
    </div>
  );
}
