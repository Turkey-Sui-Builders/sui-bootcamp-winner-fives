import { useDispatch, useSelector } from "react-redux";
import { setCategory, setSalaryRange, setSearchQuery, setStatus, resetFilters } from "../store/slices/filtersSlice";
import { RootState, AppDispatch } from "../store";
import { JOB_CATEGORIES, JOB_STATUS } from "../config/constants";

export function FilterBar() {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.filters);

  return (
    <div className="panel rounded-2xl p-6 space-y-5">
      {/* Search */}
      <input
        type="text"
        placeholder="Search jobs..."
        value={filters.searchQuery}
        onChange={(e) => dispatch(setSearchQuery(e.target.value))}
        className="input-soft"
      />

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Category */}
        <select
          value={filters.category || ""}
          onChange={(e) => dispatch(setCategory(e.target.value || null))}
          className="input-soft"
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
          placeholder="Min Salary ($)"
          value={filters.salaryMin || ""}
          onChange={(e) =>
            dispatch(setSalaryRange({ min: e.target.value ? parseInt(e.target.value) : null, max: filters.salaryMax }))
          }
          className="input-soft"
        />

        {/* Max Salary */}
        <input
          type="number"
          placeholder="Max Salary ($)"
          value={filters.salaryMax || ""}
          onChange={(e) =>
            dispatch(setSalaryRange({ min: filters.salaryMin, max: e.target.value ? parseInt(e.target.value) : null }))
          }
          className="input-soft"
        />

        {/* Status */}
        <select
          value={filters.status ?? ""}
          onChange={(e) => dispatch(setStatus(e.target.value ? parseInt(e.target.value) : null))}
          className="input-soft"
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
        className="text-sm font-semibold text-teal-600 dark:text-teal-200 hover:text-main transition-smooth"
      >
        Reset Filters
      </button>
    </div>
  );
}
