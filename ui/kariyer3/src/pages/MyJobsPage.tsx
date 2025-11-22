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

        // Only fetch jobs posted by current user
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
      // Get job object with dynamic fields
      const job = await client.getObject({
        id: jobId,
        options: {
          showContent: true,
        },
      });

      // In production, you would iterate through dynamic object fields
      // For now, this is a placeholder for the application loading logic
      // Applications are stored as Dynamic Object Fields (SEAL Pattern for Privacy)
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
        return "text-green-600 dark:text-green-400";
      case 1:
        return "text-gray-600 dark:text-gray-400";
      case 2:
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Please connect your wallet to view your jobs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header - Font-Driven */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 className="text-5xl font-bold mb-2">My Job Postings</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Manage your job listings and applications</p>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-4">You haven't posted any jobs yet</p>
          <a
            href="/post"
            className="inline-block px-6 py-3 bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Post Your First Job
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => {
            const [minSalary, maxSalary] = job.salary_range;
            const isExpanded = selectedJob === job.id;
            const jobApplications = applications[job.id] || [];

            return (
              <div key={job.id} className="border-b border-gray-200 dark:border-gray-800 pb-6">
                {/* Job Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{job.title}</h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{job.company}</p>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                      {getStatusText(job.status)}
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{job.location}</span>
                    <span>•</span>
                    <span>{job.category}</span>
                    <span>•</span>
                    <span>
                      {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
                    </span>
                  </div>

                  {job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={() => (isExpanded ? setSelectedJob(null) : loadApplicationsForJob(job.id))}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                    >
                      {isExpanded ? "Hide Applications" : "View Applications"}
                    </button>
                  </div>
                </div>

                {/* Applications List - SEAL Pattern: Only employer can view */}
                {isExpanded && (
                  <div className="mt-6 pl-6 space-y-4 border-l-2 border-gray-200 dark:border-gray-800">
                    {jobApplications.length === 0 ? (
                      <p className="text-gray-500">No applications yet</p>
                    ) : (
                      jobApplications.map((app) => (
                        <div key={app.id} className="border-b border-gray-200 dark:border-gray-800 pb-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">
                                Applicant: <span className="font-mono text-xs">{app.applicant.slice(0, 20)}...</span>
                              </p>
                              <p className="text-gray-700 dark:text-gray-300">{app.cover_message}</p>

                              {/* AI Score Badge */}
                              {app.ai_score !== null && (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-1 ${
                                      app.ai_score >= 80
                                        ? "bg-green-500 text-white"
                                        : app.ai_score >= 60
                                        ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                    }`}
                                  >
                                    AI Score: {app.ai_score}/100
                                  </span>
                                  {app.ai_analysis && (
                                    <span className="text-xs text-gray-500">{app.ai_analysis}</span>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-4">
                                <a
                                  href={getCVUrl(app.cv_blob_id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  View CV (Walrus)
                                </a>
                              </div>
                            </div>

                            {job.status === 0 && !job.hired_candidate && (
                              <button
                                onClick={() => handleHireCandidate(job.id, app.id, app.applicant)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
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
