import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuth } from "../providers/AuthProvider";
import { ApplyForm } from "../components/ApplyForm";
import { Job } from "../store/slices/jobsSlice";
import { WALRUS_AGGREGATOR } from "../config/constants";

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const client = useSuiClient();
  const { address, isConnected } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  const loadJob = async (jobId: string) => {
    setLoading(true);
    try {
      const result = await client.getObject({
        id: jobId,
        options: { showContent: true },
      });

      const fields = (result.data?.content as any)?.fields;

      setJob({
        id: fields.id.id,
        employer: fields.employer,
        title: fields.title,
        description: fields.description,
        company: fields.company,
        location: fields.location,
        category: fields.category,
        salary_range: fields.salary_range,
        tags: fields.tags,
        created_at: parseInt(fields.created_at),
        status: parseInt(fields.status),
        hired_candidate: fields.hired_candidate?.vec?.[0] || null,
      });

      setLoading(false);
    } catch (error) {
      console.error("Failed to load job:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Job not found</p>
      </div>
    );
  }

  const [minSalary, maxSalary] = job.salary_range;

  return (
    <div className="space-y-8">
      {/* Job Details */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-8">
        <h1 className="text-5xl font-bold mb-4">{job.title}</h1>
        <p className="text-2xl text-gray-600 dark:text-gray-400 mb-4">{job.company}</p>

        <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500 mb-6">
          <span>{job.location}</span>
          <span>•</span>
          <span>{job.category}</span>
          <span>•</span>
          <span>
            {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
          </span>
        </div>

        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {job.tags.map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.description}</p>
      </div>

      {/* Apply Section */}
      {!showApplyForm ? (
        <div>
          {!isConnected ? (
            <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to apply</p>
          ) : address === job.employer ? (
            <p className="text-gray-600 dark:text-gray-400">This is your job posting</p>
          ) : job.status !== 0 ? (
            <p className="text-gray-600 dark:text-gray-400">This position is no longer accepting applications</p>
          ) : (
            <button
              onClick={() => setShowApplyForm(true)}
              className="px-8 py-3 bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Now
            </button>
          )}
        </div>
      ) : (
        <ApplyForm
          jobId={job.id}
          onSuccess={() => {
            setShowApplyForm(false);
            alert("Application submitted successfully!");
          }}
          onCancel={() => setShowApplyForm(false)}
        />
      )}
    </div>
  );
}
