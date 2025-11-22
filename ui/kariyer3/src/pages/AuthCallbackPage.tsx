import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthCallback } from "@mysten/enoki/react";

/**
 * AuthCallbackPage - Handles zkLogin OAuth callback
 *
 * Flow:
 * 1. User clicks "Sign in with Google" in ConnectButton
 * 2. Redirected to Google OAuth
 * 3. Google redirects back to this page with auth code
 * 4. useAuthCallback() processes the code and establishes zkLogin session
 * 5. User is redirected to home page
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Enoki hook to handle OAuth callback
  const { handled } = useAuthCallback();

  useEffect(() => {
    // Wait for Enoki to process the callback
    if (handled) {
      // Check if authentication was successful
      const params = new URLSearchParams(window.location.search);
      const authError = params.get("error");

      if (authError) {
        setError(`Authentication failed: ${authError}`);
        // Redirect to home after 3 seconds
        setTimeout(() => navigate("/"), 3000);
      } else {
        // Success - redirect to home
        navigate("/");
      }
    }
  }, [handled, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      {error ? (
        <>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Failed</p>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to home page...</p>
          </div>
        </>
      ) : (
        <>
          {/* Loading State - Font-Driven */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Completing Sign In</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Processing your authentication...</p>
          </div>

          {/* Minimal Loading Indicator */}
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-150"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-300"></div>
          </div>
        </>
      )}
    </div>
  );
}
