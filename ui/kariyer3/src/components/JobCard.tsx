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

  return (
    <Link to={`/job/${job.id}`} className="block group py-8 interactive">
      {/* Borderless, Cardless - Pure Typography */}
      <div className="space-y-3">
        {/* Title - Large, Bold */}
        <h3 className="text-3xl font-black tracking-tight text-gray-900">
          {job.title}
        </h3>

        {/* Company - Medium Weight */}
        <p className="text-xl font-semibold text-gray-600">{job.company}</p>

        {/* Metadata - Light, Spaced */}
        <div className="flex gap-3 text-sm text-gray-500">
          <span>{job.location}</span>
          <span>·</span>
          <span>{job.category}</span>
          <span>·</span>
          <span className="font-medium">{minSalary.toLocaleString()} - {maxSalary.toLocaleString()} SUI</span>
        </div>

        {/* Tags - No Background, Just Text */}
        {job.tags.length > 0 && (
          <div className="flex gap-3 text-sm text-gray-400">
            {job.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Status - Simple Text, No Badge */}
        <p className={`text-xs font-medium ${job.status === JOB_STATUS.OPEN ? "text-green-600" : "text-gray-400"}`}>
          {statusLabel}
        </p>
      </div>
    </Link>
  );
}
