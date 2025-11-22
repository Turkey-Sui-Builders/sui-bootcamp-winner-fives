import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { useAuth } from "../providers/AuthProvider";
import { PACKAGE_ID, JOB_BOARD_ID, CLOCK_ID, JOB_CATEGORIES } from "../config/constants";

export function PostJobPage() {
  const { address, isConnected } = useAuth();
  const navigate = useNavigate();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    company: "",
    location: "",
    category: "Engineering",
    salaryMin: "",
    salaryMax: "",
    tags: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet");
      return;
    }

    setSubmitting(true);

    try {
      const tx = new Transaction();

      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      tx.moveCall({
        target: `${PACKAGE_ID}::job_board::post_job`,
        arguments: [
          tx.object(JOB_BOARD_ID),
          tx.pure.string(formData.title),
          tx.pure.string(formData.description),
          tx.pure.string(formData.company),
          tx.pure.string(formData.location),
          tx.pure.string(formData.category),
          tx.pure.u64(parseInt(formData.salaryMin) || 0),
          tx.pure.u64(parseInt(formData.salaryMax) || 0),
          tx.pure(bcs.vector(bcs.string()).serialize(tags)),
          tx.object(CLOCK_ID),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            alert("Job posted successfully!");
            navigate("/");
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            alert(`Failed to post job: ${error.message}`);
            setSubmitting(false);
          },
        }
      );
    } catch (error) {
      console.error("Failed to post job:", error);
      alert(error instanceof Error ? error.message : "Failed to post job");
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Please connect your wallet to post a job</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-5xl font-bold mb-8">Post a Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Title
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Company */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name
          </label>
          <input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Salary Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Salary (SUI)
            </label>
            <input
              id="salaryMin"
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Salary (SUI)
            </label>
            <input
              id="salaryMax"
              type="number"
              value={formData.salaryMax}
              onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Rust, Blockchain, Remote"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={8}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Posting..." : "Post Job"}
        </button>
      </form>
    </div>
  );
}
