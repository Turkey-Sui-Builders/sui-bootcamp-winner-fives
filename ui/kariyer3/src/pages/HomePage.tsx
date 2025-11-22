import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSuiClient } from "@mysten/dapp-kit";
import { JobList } from "../components/JobList";
import { FilterBar } from "../components/FilterBar";
import { setJobs, setLoading, setError } from "../store/slices/jobsSlice";
import { AppDispatch, RootState } from "../store";
import { JOB_BOARD_ID } from "../config/constants";

export function HomePage() {
  const dispatch = useDispatch<AppDispatch>();
  const client = useSuiClient();
  const { loading } = useSelector((state: RootState) => state.jobs);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    dispatch(setLoading(true));

    try {
      // Get all Job objects (shared objects)
      const result = await client.getOwnedObjects({
        owner: JOB_BOARD_ID,
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
        });

      dispatch(setJobs(jobs));
    } catch (error) {
      console.error("Failed to load jobs:", error);
      dispatch(setError(error instanceof Error ? error.message : "Failed to load jobs"));
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section - Font-Driven */}
      <div className="py-12 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-6xl font-bold mb-4">Find Your Next Opportunity</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Decentralized job board powered by Sui blockchain
        </p>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Job Listings */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">Loading jobs...</p>
          </div>
        ) : (
          <JobList />
        )}
      </div>
    </div>
  );
}
