import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

export function OwnedObjects() {
  const account = useCurrentAccount();
  const { data, isPending, error } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
    },
    {
      enabled: !!account,
    },
  );

  if (!account) {
    return null;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isPending || !data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-2 my-4">
      {data.data.length === 0 ? (
        <p>No objects owned by the connected wallet</p>
      ) : (
        <h4 className="text-lg font-semibold">Objects owned by the connected wallet</h4>
      )}
      {data.data.map((object) => (
        <div key={object.data?.objectId}>
          <p className="text-sm">Object ID: {object.data?.objectId}</p>
        </div>
      ))}
    </div>
  );
}
