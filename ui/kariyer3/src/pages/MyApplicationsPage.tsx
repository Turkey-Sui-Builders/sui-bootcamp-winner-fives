import { useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useAuth } from "../providers/AuthProvider";
import { WALRUS_AGGREGATOR } from "../config/constants";

interface Job {
  id: string;
  employer: string;
  title: string;
  company: string;
  location: string;
  category: string;
  salary_range: [number, number];
  status: number;
}

interface ApplicationWithJob {
  id: string;
  job_id: string;
  applicant: string;
  cover_message: string;
  cv_blob_id: string;
  applied_at: number;
  ai_score: number | null;
  ai_analysis: string | null;
  job: Job | null;
}

export function MyApplicationsPage() {
  const { address, isConnected } = useAuth();
  const client = useSuiClient();

  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      loadMyApplications();
    }
  }, [isConnected, address]);

  const loadMyApplications = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // Get all Job objects
      const result = await client.getOwnedObjects({
        owner: import.meta.env.VITE_JOB_BOARD_ID || "0x...",
        options: {
          showContent: true,
          showType: true,
        },
      });

      const jobs = result.data
        .filter((obj) => obj.data?.type?.includes("::job_board::Job"))
        .map((obj: any) => {
          const fields = obj.data?.content?.fields;
          return {
            id: fields.id.id,
            employer: fields.employer,
            title: fields.title,
            company: fields.company,
            location: fields.location,
            category: fields.category,
            salary_range: fields.salary_range,
            status: parseInt(fields.status),
          };
        });

      // In production, you would query dynamic object fields to find applications by current user
      // For now, this is a placeholder structure
      // SEAL Pattern: Applications are stored as Dynamic Object Fields, accessible only to employer + applicant
      const myApplications: ApplicationWithJob[] = [];

      setApplications(myApplications);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load applications:", error);
      setLoading(false);
    }
  };

  const getCVUrl = (blobId: string) => {
    return `${WALRUS_AGGREGATOR}/v1/${blobId}`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Open - Under Review";
      case 1:
        return "Closed";
      case 2:
        return "Position Filled";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "text-blue-600 dark:text-blue-400";
      case 1:
        return "text-gray-600 dark:text-gray-400";
      case 2:
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-500">Please connect your wallet to view your applications</p>
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
        <h1 className="text-5xl font-bold mb-2">My Applications</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Track your job applications and their status</p>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-4">You haven't applied to any jobs yet</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Jobs
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => {
            if (!app.job) return null;

            const [minSalary, maxSalary] = app.job.salary_range;

            return (
              <div key={app.id} className="border-b border-gray-200 dark:border-gray-800 pb-6">
                {/* Job Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        <a href={`/job/${app.job.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                          {app.job.title}
                        </a>
                      </h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{app.job.company}</p>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(app.job.status)}`}>
                      {getStatusText(app.job.status)}
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{app.job.location}</span>
                    <span>•</span>
                    <span>{app.job.category}</span>
                    <span>•</span>
                    <span>
                      {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
                    </span>
                  </div>

                  {/* Application Details */}
                  <div className="mt-4 pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-2">
                    <p className="text-sm text-gray-500">Applied on {formatDate(app.applied_at)}</p>

                    {/* Cover Message */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Cover Message:</p>
                      <p className="text-gray-600 dark:text-gray-400">{app.cover_message}</p>
                    </div>

                    {/* AI Score Badge */}
                    {app.ai_score !== null && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Assessment:</p>
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
                            Score: {app.ai_score}/100
                          </span>
                          {app.ai_analysis && <span className="text-sm text-gray-600 dark:text-gray-400">{app.ai_analysis}</span>}
                        </div>
                      </div>
                    )}

                    {/* CV Link */}
                    <div>
                      <a
                        href={getCVUrl(app.cv_blob_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Your CV (Walrus Storage)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
