import { useState, FormEvent, ChangeEvent } from "react";
import Swal from "sweetalert2";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useEnokiFlow, useZkLogin } from "@mysten/enoki/react";
import { useWalrusUpload } from "../hooks/useWalrusUpload";
import { PACKAGE_ID, JOB_BOARD_ID, CLOCK_ID } from "../config/constants";
import { useAuth } from "../providers/AuthProvider";

interface ApplyFormProps {
  jobId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplyForm({ jobId, onSuccess, onCancel }: ApplyFormProps) {
  const { address, isConnected, isUsingZkLogin } = useAuth();
  const [coverMessage, setCoverMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { uploadFile, uploading, error: uploadError } = useWalrusUpload();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const enokiFlow = useEnokiFlow();
  const { address: zkLoginAddress } = useZkLogin();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!address) {
      Swal.fire({
        icon: "warning",
        title: "Connect wallet",
        text: "Please connect your wallet to apply.",
      });
      return;
    }

    if (!cvFile) {
      Swal.fire({
        icon: "info",
        title: "Add your CV",
        text: "Please select a CV file before submitting.",
      });
      return;
    }

    if (!coverMessage.trim()) {
      Swal.fire({
        icon: "info",
        title: "Add a cover message",
        text: "Tell the employer why you're a great fit.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Upload CV to Walrus
      const uploadResult = await uploadFile(cvFile);

      if (!uploadResult) {
        throw new Error(uploadError || "Failed to upload CV");
      }

      // Step 2: Submit application transaction
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::job_board::apply`,
        arguments: [
          tx.object(JOB_BOARD_ID),
          tx.object(jobId),
          tx.pure.string(coverMessage),
          tx.pure.string(uploadResult.blobId), // Walrus blob ID
          tx.object(CLOCK_ID),
        ],
      });

      // Use zkLogin (Enoki) or regular wallet based on auth method
      if (isUsingZkLogin && zkLoginAddress) {
        const result = await enokiFlow.sponsorAndExecuteTransaction({
          transaction: tx as any,
          client: suiClient as any,
          network: "testnet",
        });
        Swal.fire({
          icon: "success",
          title: "Application submitted",
          text: "Your application has been sent.",
          timer: 2000,
          showConfirmButton: false,
          position: "top-end",
          toast: true,
        });
        onSuccess();
        setSubmitting(false);
      } else {
        console.log("Executing with regular wallet...");
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: () => {
              Swal.fire({
                icon: "success",
                title: "Application submitted",
                text: "Your application has been sent.",
                timer: 2000,
                showConfirmButton: false,
                position: "top-end",
                toast: true,
              });
              onSuccess();
            },
            onError: (error) => {
              console.error("Transaction failed:", error);
              Swal.fire({
                icon: "error",
                title: "Submission failed",
                text: error.message || "Failed to submit application",
              });
              setSubmitting(false);
            },
          }
        );
      }
    } catch (error) {
      console.error("Application failed:", error);
      Swal.fire({
        icon: "error",
        title: "Submission failed",
        text: error instanceof Error ? error.message : "Failed to submit application",
      });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 surface rounded-2xl border border-white/10">
      <h2 className="text-3xl font-bold text-main">Apply for this Position</h2>

      {/* Cover Message */}
      <div>
        <label htmlFor="cover" className="block text-sm font-semibold text-main mb-2">
          Cover Message
        </label>
        <textarea
          id="cover"
          value={coverMessage}
          onChange={(e) => setCoverMessage(e.target.value)}
          rows={6}
          className="input-soft min-h-[140px]"
          placeholder="Tell us why you're a great fit..."
          required
        />
      </div>

      {/* CV Upload */}
      <div>
        <label htmlFor="cv" className="block text-sm font-semibold text-main mb-2">
          Upload CV (Walrus Storage)
        </label>
        <input
          id="cv"
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx"
          className="input-soft"
          required
        />
        {cvFile && (
          <p className="mt-2 text-sm text-muted">Selected: {cvFile.name}</p>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-500">Upload error: {uploadError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : uploading ? "Uploading CV..." : "Submit Application"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || uploading}
          className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
