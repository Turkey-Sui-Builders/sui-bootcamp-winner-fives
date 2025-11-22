import { Link } from "react-router-dom";
import { Job } from "../store/slices/jobsSlice";
import { JOB_STATUS } from "../config/constants";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const [minSalary, maxSalary] = job.salary_range;

  // AI Score Badge Color Logic
  const getAIBadgeColor = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const statusLabel = {
    [JOB_STATUS.OPEN]: "Open",
    [JOB_STATUS.CLOSED]: "Closed",
    [JOB_STATUS.HIRED]: "Hired",
  }[job.status];

  return (
    <Link to={`/job/${job.id}`} className="block group">
      <div className="border-b border-gray-200 dark:border-gray-800 py-6 px-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Title & Company - Font-Driven */}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {job.title}
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{job.company}</p>

            {/* Location & Category */}
            <div className="flex gap-4 mt-3 text-sm text-gray-500 dark:text-gray-500">
              <span>{job.location}</span>
              <span>•</span>
              <span>{job.category}</span>
            </div>

            {/* Salary Range */}
            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
              {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
            </p>

            {/* Tags - Minimal */}
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="ml-4">
            <span
              className={`text-xs px-3 py-1 ${
                job.status === JOB_STATUS.OPEN
                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
