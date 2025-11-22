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
      // Check file size (max 10MB for testnet)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Max size is ${maxSize / 1024 / 1024}MB`);
      }

      // Use 5 epochs (~30 seconds) for testnet
      const epochs = 5;

      const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
        method: "PUT",
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Walrus upload error:", errorText);
        throw new Error(`Upload failed (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();

      // Extract blob ID from response
      let blobId: string;
      if (data.newlyCreated?.blobObject?.blobId) {
        blobId = data.newlyCreated.blobObject.blobId;
      } else if (data.alreadyCertified?.blobObject?.blobId) {
        blobId = data.alreadyCertified.blobObject.blobId;
      } else if (data.alreadyCertified?.blobId) {
        blobId = data.alreadyCertified.blobId;
      } else {
        console.error("Walrus response:", data);
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
