import { useState, FormEvent, ChangeEvent } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useWalrusUpload } from "../hooks/useWalrusUpload";
import { PACKAGE_ID, JOB_BOARD_ID, CLOCK_ID } from "../config/constants";
import { useAuth } from "../providers/AuthProvider";

interface ApplyFormProps {
  jobId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplyForm({ jobId, onSuccess, onCancel }: ApplyFormProps) {
  const { address } = useAuth();
  const [coverMessage, setCoverMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { uploadFile, uploading, error: uploadError } = useWalrusUpload();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!address) {
      alert("Please connect your wallet");
      return;
    }

    if (!cvFile) {
      alert("Please select a CV file");
      return;
    }

    if (!coverMessage.trim()) {
      alert("Please write a cover message");
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

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            alert("Application submitted successfully!");
            onSuccess();
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            alert(`Failed to submit application: ${error.message}`);
            setSubmitting(false);
          },
        }
      );
    } catch (error) {
      console.error("Application failed:", error);
      alert(error instanceof Error ? error.message : "Failed to submit application");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white dark:bg-gray-900">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Apply for this Position</h2>

      {/* Cover Message */}
      <div>
        <label htmlFor="cover" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cover Message
        </label>
        <textarea
          id="cover"
          value={coverMessage}
          onChange={(e) => setCoverMessage(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell us why you're a great fit..."
          required
        />
      </div>

      {/* CV Upload */}
      <div>
        <label htmlFor="cv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload CV (Walrus Storage)
        </label>
        <input
          id="cv"
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {cvFile && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Selected: {cvFile.name}</p>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">Upload error: {uploadError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : uploading ? "Uploading CV..." : "Submit Application"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || uploading}
          className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
