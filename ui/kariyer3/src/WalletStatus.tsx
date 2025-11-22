import { useCurrentAccount } from "@mysten/dapp-kit";
import { OwnedObjects } from "./OwnedObjects";

export function WalletStatus() {
  const account = useCurrentAccount();

  return (
    <div className="my-4">
      <h2 className="text-2xl font-bold mb-4">Wallet Status</h2>

      {account ? (
        <div className="space-y-2">
          <p>Wallet connected</p>
          <p>Address: {account.address}</p>
        </div>
      ) : (
        <p>Wallet not connected</p>
      )}
      <OwnedObjects />
    </div>
  );
}
