import { useState, FormEvent } from "react";
import Swal from "sweetalert2";
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
      Swal.fire({
        icon: "warning",
        title: "Connect wallet",
        text: "Please connect your wallet to post a job.",
      });
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
          onSuccess: () => {
            Swal.fire({
              icon: "success",
              title: "Job posted",
              text: "Your role is now live.",
              timer: 2000,
              showConfirmButton: false,
              position: "top-end",
              toast: true,
            });
            navigate("/");
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            Swal.fire({
              icon: "error",
              title: "Post failed",
              text: error.message || "Failed to post job",
            });
            setSubmitting(false);
          },
        }
      );
    } catch (error) {
      console.error("Failed to post job:", error);
      Swal.fire({
        icon: "error",
        title: "Post failed",
        text: error instanceof Error ? error.message : "Failed to post job",
      });
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="surface rounded-3xl p-10 border border-white/10 text-center space-y-4">
          <h2 className="text-2xl font-bold text-main">Connect your wallet</h2>
          <p className="text-muted">You need to authenticate to publish a new role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-3">
        <p className="pill w-fit text-amber-200/90">Employer console</p>
        <h1 className="text-4xl md:text-5xl font-black text-main">Post a Job</h1>
        <p className="text-lg text-muted">Describe your role clearly so candidates can self-select fast.</p>
      </div>

      <form onSubmit={handleSubmit} className="surface rounded-3xl p-8 border border-white/10 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-main mb-2">
            Job Title
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="input-soft"
          />
        </div>

        {/* Company & Location */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-main mb-2">
              Company Name
            </label>
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
              className="input-soft"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-main mb-2">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              className="input-soft"
            />
          </div>
        </div>

        {/* Category */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-main mb-2">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="input-soft"
            >
              {JOB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-semibold text-main mb-2">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Rust, Blockchain, Remote"
              className="input-soft"
            />
          </div>
        </div>

        {/* Salary Range */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="salaryMin" className="block text-sm font-semibold text-main mb-2">
              Min Salary ($)
            </label>
            <input
              id="salaryMin"
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
              required
              className="input-soft"
            />
          </div>
          <div>
            <label htmlFor="salaryMax" className="block text-sm font-semibold text-main mb-2">
              Max Salary ($)
            </label>
            <input
              id="salaryMax"
              type="number"
              value={formData.salaryMax}
              onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
              required
              className="input-soft"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-main mb-2">
            Job Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={8}
            required
            className="input-soft min-h-[180px]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Posting..." : "Post Job"}
        </button>
      </form>
    </div>
  );
}
