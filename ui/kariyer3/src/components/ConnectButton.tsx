import { useState } from "react";
import Swal from "sweetalert2";
import { useEnokiFlow } from "@mysten/enoki/react";
import { ConnectButton as DappKitConnectButton } from "@mysten/dapp-kit";
import { useAuth } from "../providers/AuthProvider";
import { GOOGLE_CLIENT_ID, NETWORK } from "../config/constants";

export function ConnectButton() {
  const { address, isConnected, isUsingZkLogin, logout } = useAuth();
  const enokiFlow = useEnokiFlow();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

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
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: "Failed to initiate Google login",
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="chip font-mono text-xs inline-flex items-center gap-2">
          {address?.slice(0, 6)}...{address?.slice(-4)}
          <button
            onClick={handleCopy}
            className="text-muted hover:text-main transition-smooth"
            title="Copy address"
            aria-label="Copy wallet address"
          >
            {copied ? "✔" : "⧉"}
          </button>
        </span>
        <button onClick={logout} className="text-sm font-semibold text-muted hover:text-main transition-smooth">
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
