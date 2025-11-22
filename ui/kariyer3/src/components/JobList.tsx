import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { JobCard } from "./JobCard";

export function JobList() {
  const { items: jobs, loading, error } = useSelector((state: RootState) => state.jobs);
  const filters = useSelector((state: RootState) => state.filters);

  // Client-side filtering
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Category filter
      if (filters.category && job.category !== filters.category) {
        return false;
      }

      // Salary filter
      const [minSalary, maxSalary] = job.salary_range;
      if (filters.salaryMin !== null && maxSalary < filters.salaryMin) {
        return false;
      }
      if (filters.salaryMax !== null && minSalary > filters.salaryMax) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasAllTags = filters.tags.every((tag) => job.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesCompany = job.company.toLowerCase().includes(query);
        const matchesDescription = job.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCompany && !matchesDescription) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== null && job.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [jobs, filters]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-xl text-gray-500">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-xl text-gray-500">No jobs found</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {filteredJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
