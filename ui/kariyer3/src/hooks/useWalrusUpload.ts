import { useState } from "react";
import { WALRUS_PUBLISHER } from "../config/constants";

interface UploadResult {
  blobId: string;
  mediaType: string;
}

export function useWalrusUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      // Calculate epochs (30 days = ~4320 epochs at 6s per epoch)
      const epochs = 4320;

      const response = await fetch(`${WALRUS_PUBLISHER}/v1/store?epochs=${epochs}`, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract blob ID from response
      let blobId: string;
      if (data.newlyCreated?.blobObject?.blobId) {
        blobId = data.newlyCreated.blobObject.blobId;
      } else if (data.alreadyCertified?.blobId) {
        blobId = data.alreadyCertified.blobId;
      } else {
        throw new Error("Invalid response format from Walrus");
      }

      setUploading(false);
      return {
        blobId,
        mediaType: file.type,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      setUploading(false);
      return null;
    }
  };

  return { uploadFile, uploading, error };
}
