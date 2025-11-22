import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams } from "react-router-dom";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuth } from "../providers/AuthProvider";
import { ApplyForm } from "../components/ApplyForm";
import { Job } from "../store/slices/jobsSlice";

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
        <p className="text-xl text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-300">Job not found</p>
      </div>
    );
  }

  const [minSalary, maxSalary] = job.salary_range;

  return (
    <div className="space-y-8">
      {/* Job Details */}
      <div className="surface rounded-3xl p-8 md:p-10 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-3">
            <p className="pill w-fit text-amber-200/90">On-chain role</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight text-main">{job.title}</h1>
            <p className="text-xl text-muted">{job.company}</p>

            <div className="flex flex-wrap gap-3 text-sm text-muted">
              <span className="chip">{job.location}</span>
              <span className="chip">{job.category}</span>
              <span className="chip font-semibold text-main">
                {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} $
              </span>
            </div>
          </div>
        </div>

        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {job.tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-lg text-main leading-relaxed whitespace-pre-wrap">{job.description}</p>
      </div>

      {/* Apply Section */}
      {!showApplyForm ? (
        <div className="surface rounded-3xl p-6 border border-white/10">
          {!isConnected ? (
            <p className="text-muted">Please connect your wallet to apply</p>
          ) : address === job.employer ? (
            <p className="text-muted">This is your job posting</p>
          ) : job.status !== 0 ? (
            <p className="text-muted">This position is no longer accepting applications</p>
          ) : (
            <button
              onClick={() => setShowApplyForm(true)}
              className="btn-primary text-lg"
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
            Swal.fire({
              icon: "success",
              title: "Application submitted",
              text: "Your application has been sent.",
              timer: 2000,
              showConfirmButton: false,
              position: "top-end",
              toast: true,
            });
          }}
          onCancel={() => setShowApplyForm(false)}
        />
      )}
    </div>
  );
}
