import { useDispatch, useSelector } from "react-redux";
import { setCategory, setSalaryRange, setSearchQuery, setStatus, resetFilters } from "../store/slices/filtersSlice";
import { RootState, AppDispatch } from "../store";
import { JOB_CATEGORIES, JOB_STATUS } from "../config/constants";

export function FilterBar() {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.filters);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-6 space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search jobs..."
        value={filters.searchQuery}
        onChange={(e) => dispatch(setSearchQuery(e.target.value))}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Filters Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Category */}
        <select
          value={filters.category || ""}
          onChange={(e) => dispatch(setCategory(e.target.value || null))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {JOB_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Min Salary */}
        <input
          type="number"
          placeholder="Min Salary (SUI)"
          value={filters.salaryMin || ""}
          onChange={(e) =>
            dispatch(setSalaryRange({ min: e.target.value ? parseInt(e.target.value) : null, max: filters.salaryMax }))
          }
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Max Salary */}
        <input
          type="number"
          placeholder="Max Salary (SUI)"
          value={filters.salaryMax || ""}
          onChange={(e) =>
            dispatch(setSalaryRange({ min: filters.salaryMin, max: e.target.value ? parseInt(e.target.value) : null }))
          }
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Status */}
        <select
          value={filters.status ?? ""}
          onChange={(e) => dispatch(setStatus(e.target.value ? parseInt(e.target.value) : null))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value={JOB_STATUS.OPEN}>Open</option>
          <option value={JOB_STATUS.CLOSED}>Closed</option>
          <option value={JOB_STATUS.HIRED}>Hired</option>
        </select>
      </div>

      {/* Reset */}
      <button
        onClick={() => dispatch(resetFilters())}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Reset Filters
      </button>
    </div>
  );
}
