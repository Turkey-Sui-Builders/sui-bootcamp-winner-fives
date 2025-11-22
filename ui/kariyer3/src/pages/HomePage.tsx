import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSuiClient } from "@mysten/dapp-kit";
import { JobList } from "../components/JobList";
import { FilterBar } from "../components/FilterBar";
import { setJobs, setLoading, setError } from "../store/slices/jobsSlice";
import { AppDispatch, RootState } from "../store";
import { PACKAGE_ID } from "../config/constants";

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
      // Query JobPosted events to get all job IDs
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::job_board::JobPosted`,
        },
        limit: 50,
        order: "descending",
      });

      // Fetch each job object
      const jobPromises = events.data.map(async (event: any) => {
        const jobId = event.parsedJson.job_id;
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

      const jobs = (await Promise.all(jobPromises)).filter((job) => job !== null);
      dispatch(setJobs(jobs));
    } catch (error) {
      console.error("Failed to load jobs:", error);
      dispatch(setError(error instanceof Error ? error.message : "Failed to load jobs"));
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="surface rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute -top-16 right-10 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute bottom-[-140px] left-10 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        </div>
        <div className="relative max-w-3xl space-y-5">
          <p className="pill text-amber-200/90 w-fit">On-chain careers</p>
          <h1 className="text-5xl md:text-6xl font-black leading-tight">
            Find roles that match your ambition.
          </h1>
          <p className="text-lg text-muted max-w-2xl">
            Curated opportunities posted and verified on Sui. Search transparently, apply with confidence,
            and get hired without gatekeepers.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/post" className="btn-primary">Post a role</a>
            <a href="/my-applications" className="btn-ghost">Track my applications</a>
          </div>
        </div>

        <div className="relative mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Open roles", value: "Live & on-chain" },
            { label: "Secure storage", value: "Walrus powered CVs" },
            { label: "Trustless hiring", value: "Wallet-native offers" },
          ].map((stat) => (
            <div key={stat.label} className="panel rounded-2xl p-4">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="text-xl font-semibold text-main mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Job Listings */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted">Loading jobs...</p>
          </div>
        ) : (
          <JobList />
        )}
      </div>
    </div>
  );
}
