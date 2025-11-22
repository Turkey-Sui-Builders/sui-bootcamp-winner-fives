import { useEffect, useState } from "react";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useAuth } from "../providers/AuthProvider";
import { PACKAGE_ID, JOB_BOARD_ID, WALRUS_AGGREGATOR } from "../config/constants";

interface Job {
  id: string;
  employer: string;
  title: string;
  description: string;
  company: string;
  location: string;
  category: string;
  salary_range: [number, number];
  tags: string[];
  created_at: number;
  status: number;
  hired_candidate: string | null;
}

interface Application {
  id: string;
  job_id: string;
  applicant: string;
  cover_message: string;
  cv_blob_id: string;
  applied_at: number;
  ai_score: number | null;
  ai_analysis: string | null;
}

export function MyJobsPage() {
  const { address, isConnected } = useAuth();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadMyJobs();
    }
  }, [isConnected, address]);

  const loadMyJobs = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // Query JobPosted events to get all job IDs
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::job_board::JobPosted`,
        },
        limit: 100,
        order: "descending",
      });

      // Fetch each job and filter by current user
      const jobPromises = events.data.map(async (event: any) => {
        const jobId = event.parsedJson.job_id;
        const employer = event.parsedJson.employer;

        if (employer !== address) return null;

        try {
          const jobObject = await client.getObject({
            id: jobId,
            options: { showContent: true },
          });

          if (jobObject.data?.content && "fields" in jobObject.data.content) {
            const fields = jobObject.data.content.fields as any;
            return {
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
            };
          }
          return null;
        } catch (err) {
          console.error(`Failed to fetch job ${jobId}:`, err);
          return null;
        }
      });

      const myJobs = (await Promise.all(jobPromises)).filter((job) => job !== null);
      setJobs(myJobs as Job[]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setLoading(false);
    }
  };

  const loadApplicationsForJob = async (jobId: string) => {
    try {
      // Placeholder for dynamic fields fetching (SEAL pattern)
      await client.getObject({
        id: jobId,
        options: { showContent: true },
      });

      setApplications((prev) => ({ ...prev, [jobId]: [] }));
      setSelectedJob(jobId);
    } catch (error) {
      console.error("Failed to load applications:", error);
    }
  };

  const handleHireCandidate = async (jobId: string, applicationId: string, applicant: string) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::job_board::hire_candidate`,
      arguments: [
        tx.object(JOB_BOARD_ID),
        tx.object(jobId),
        tx.pure.id(applicationId),
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("Candidate hired successfully!");
          loadMyJobs();
        },
        onError: (error) => {
          console.error("Transaction failed:", error);
          alert(`Failed to hire candidate: ${error.message}`);
        },
      }
    );
  };

  const getCVUrl = (blobId: string) => {
    return `${WALRUS_AGGREGATOR}/v1/${blobId}`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Open";
      case 1:
        return "Closed";
      case 2:
        return "Hired";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "text-teal-300 bg-teal-400/10 border-teal-400/40";
      case 1:
        return "text-gray-300 bg-white/5 border-white/10";
      case 2:
        return "text-amber-300 bg-amber-400/10 border-amber-400/40";
      default:
        return "text-gray-300 bg-white/5 border-white/10";
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="surface rounded-3xl p-10 border border-white/10 text-center space-y-3">
          <h2 className="text-2xl font-bold text-main">Connect your wallet</h2>
          <p className="text-muted">View and manage the roles you have posted.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="surface rounded-3xl p-8 border border-white/10">
        <p className="pill w-fit text-amber-200/90">Employer console</p>
        <h1 className="text-4xl md:text-5xl font-black mb-2 text-main">My Job Postings</h1>
        <p className="text-lg text-muted">Manage your job listings and review applications.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 surface rounded-3xl border border-white/10">
          <p className="text-xl text-muted mb-4">You haven't posted any jobs yet</p>
          <a
            href="/post"
            className="btn-primary"
          >
            Post Your First Job
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {jobs.map((job) => {
            const [minSalary, maxSalary] = job.salary_range;
            const isExpanded = selectedJob === job.id;
            const jobApplications = applications[job.id] || [];

            return (
              <div key={job.id} className="surface rounded-2xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-main">{job.title}</h3>
                    <p className="text-lg text-muted">{job.company}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted">
                      <span className="chip">{job.location}</span>
                      <span className="chip">{job.category}</span>
                      <span className="chip font-semibold text-main">
                        {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
                      </span>
                    </div>
                    {job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="chip"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`pill border ${getStatusColor(job.status)}`}>{getStatusText(job.status)}</span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => (isExpanded ? setSelectedJob(null) : loadApplicationsForJob(job.id))}
                    className="text-sm font-semibold text-teal-600 dark:text-teal-200 hover:text-main transition-smooth"
                  >
                    {isExpanded ? "Hide Applications" : "View Applications"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
                    {jobApplications.length === 0 ? (
                      <p className="text-muted">No applications yet</p>
                    ) : (
                      jobApplications.map((app) => (
                        <div key={app.id} className="panel rounded-xl p-4 border border-white/10">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <p className="text-sm text-muted">
                                Applicant: <span className="font-mono text-xs">{app.applicant.slice(0, 20)}...</span>
                              </p>
                              <p className="text-main">{app.cover_message}</p>

                              {app.ai_score !== null && (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full text-white ${
                                      app.ai_score >= 80
                                        ? "bg-green-500"
                                        : app.ai_score >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                  >
                                    AI Score: {app.ai_score}/100
                                  </span>
                                  {app.ai_analysis && (
                                    <span className="text-xs text-muted">{app.ai_analysis}</span>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-4">
                                <a
                                  href={getCVUrl(app.cv_blob_id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-teal-600 dark:text-teal-200 hover:text-main transition-smooth"
                                >
                                  View CV (Walrus)
                                </a>
                              </div>
                            </div>

                            {job.status === 0 && !job.hired_candidate && (
                              <button
                                onClick={() => handleHireCandidate(job.id, app.id, app.applicant)}
                                className="btn-primary text-sm"
                              >
                                Hire
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
