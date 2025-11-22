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
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Primary: Google zkLogin */}
      <button
        onClick={handleGoogleLogin}
        className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Sign in with Google
      </button>

      {/* Fallback: Wallet Connect */}
      <DappKitConnectButton className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" />
    </div>
  );
}
