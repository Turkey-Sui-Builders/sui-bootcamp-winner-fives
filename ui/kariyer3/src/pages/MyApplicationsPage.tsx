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

      // Placeholder: dynamic fields would be queried in production
      const myApplications: ApplicationWithJob[] = [];

      setApplications(myApplications);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load applications:", error);
      setLoading(false);
    }
  };

  const getCVUrl = (blobId: string) => `${WALRUS_AGGREGATOR}/v1/${blobId}`;

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
        return "text-teal-300 bg-teal-400/10 border-teal-400/40";
      case 1:
        return "text-gray-300 bg-white/5 border-white/10";
      case 2:
        return "text-amber-300 bg-amber-400/10 border-amber-400/40";
      default:
        return "text-gray-300 bg-white/5 border-white/10";
    }
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="surface rounded-3xl p-10 border border-white/10 text-center space-y-3">
          <h2 className="text-2xl font-bold text-white">Connect your wallet</h2>
          <p className="text-gray-400">Track the roles you have applied to in one place.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-xl text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="surface rounded-3xl p-8 border border-white/10">
        <p className="pill w-fit text-teal-200/90">Candidate view</p>
        <h1 className="text-4xl md:text-5xl font-black mb-2">My Applications</h1>
        <p className="text-lg text-gray-300">Track your job applications and their status.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 surface rounded-3xl border border-white/10">
          <p className="text-xl text-gray-300 mb-4">You haven't applied to any jobs yet</p>
          <a
            href="/"
            className="btn-primary"
          >
            Browse Jobs
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {applications.map((app) => {
            if (!app.job) return null;

            const [minSalary, maxSalary] = app.job.salary_range;

            return (
              <div key={app.id} className="surface rounded-2xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">
                      <a href={`/job/${app.job.id}`} className="hover:text-teal-200 transition-smooth">
                        {app.job.title}
                      </a>
                    </h3>
                    <p className="text-lg text-gray-300">{app.job.company}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                      <span className="chip">{app.job.location}</span>
                      <span className="chip">{app.job.category}</span>
                      <span className="chip font-semibold text-gray-100">
                        {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
                      </span>
                    </div>
                  </div>
                  <span className={`pill border ${getStatusColor(app.job.status)}`}>{getStatusText(app.job.status)}</span>
                </div>

                <div className="mt-4 panel rounded-xl p-4 border border-white/10 space-y-3">
                  <p className="text-sm text-gray-400">Applied on {formatDate(app.applied_at)}</p>
                  <div>
                    <p className="text-sm font-semibold text-gray-200 mb-1">Your Cover Message</p>
                    <p className="text-gray-300">{app.cover_message}</p>
                  </div>

                  {app.ai_score !== null && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-200">AI Assessment</p>
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
                          Score: {app.ai_score}/100
                        </span>
                        {app.ai_analysis && <span className="text-sm text-gray-400">{app.ai_analysis}</span>}
                      </div>
                    </div>
                  )}

                  <div>
                    <a
                      href={getCVUrl(app.cv_blob_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-200 hover:text-white transition-smooth"
                    >
                      View Your CV (Walrus Storage)
                    </a>
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
