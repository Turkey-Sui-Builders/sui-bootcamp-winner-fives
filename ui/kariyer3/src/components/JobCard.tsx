import { Link } from "react-router-dom";
import { Job } from "../store/slices/jobsSlice";
import { JOB_STATUS } from "../config/constants";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const [minSalary, maxSalary] = job.salary_range;

  const statusLabel = {
    [JOB_STATUS.OPEN]: "Open",
    [JOB_STATUS.CLOSED]: "Closed",
    [JOB_STATUS.HIRED]: "Hired",
  }[job.status];

  const statusColor = {
    [JOB_STATUS.OPEN]: "text-teal-300 bg-teal-400/10 border-teal-400/40",
    [JOB_STATUS.CLOSED]: "text-gray-300 bg-white/5 border-white/10",
    [JOB_STATUS.HIRED]: "text-amber-300 bg-amber-400/10 border-amber-400/40",
  }[job.status];

  return (
    <Link to={`/job/${job.id}`} className="block group">
      <div className="surface rounded-2xl p-6 md:p-7 border border-white/10 hover:border-teal-400/50 transition-smooth hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white group-hover:text-teal-200 transition-smooth">
              {job.title}
            </h3>
            <p className="text-lg font-semibold text-gray-300">{job.company}</p>
          </div>
          <span className={`pill border ${statusColor}`}>{statusLabel}</span>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-gray-400 mt-4">
          <span className="chip">{job.location}</span>
          <span className="chip">{job.category}</span>
          <span className="chip font-semibold text-gray-100">
            {minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI
          </span>
        </div>

        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {job.tags.map((tag) => (
              <span key={tag} className="chip text-gray-200">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
