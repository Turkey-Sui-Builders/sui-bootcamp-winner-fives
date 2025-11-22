import { describe, it, expect } from "vitest";
import filtersReducer, {
  setCategory,
  setSalaryRange,
  setTags,
  setSearchQuery,
  setStatus,
  resetFilters,
} from "./filtersSlice";

describe("filtersSlice", () => {
  const initialState = {
    category: null,
    salaryMin: null,
    salaryMax: null,
    tags: [],
    searchQuery: "",
    status: null,
  };

  it("should return initial state", () => {
    expect(filtersReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setCategory", () => {
    const actual = filtersReducer(initialState, setCategory("Engineering"));
    expect(actual.category).toBe("Engineering");
  });

  it("should handle setCategory with null", () => {
    const stateWithCategory = { ...initialState, category: "Engineering" };
    const actual = filtersReducer(stateWithCategory, setCategory(null));
    expect(actual.category).toBeNull();
  });

  it("should handle setSalaryRange with both min and max", () => {
    const actual = filtersReducer(initialState, setSalaryRange({ min: 50000, max: 100000 }));
    expect(actual.salaryMin).toBe(50000);
    expect(actual.salaryMax).toBe(100000);
  });

  it("should handle setSalaryRange with only min", () => {
    const actual = filtersReducer(initialState, setSalaryRange({ min: 50000, max: null }));
    expect(actual.salaryMin).toBe(50000);
    expect(actual.salaryMax).toBeNull();
  });

  it("should handle setSalaryRange with only max", () => {
    const actual = filtersReducer(initialState, setSalaryRange({ min: null, max: 100000 }));
    expect(actual.salaryMin).toBeNull();
    expect(actual.salaryMax).toBe(100000);
  });

  it("should handle setTags", () => {
    const tags = ["Rust", "Blockchain", "Remote"];
    const actual = filtersReducer(initialState, setTags(tags));
    expect(actual.tags).toEqual(tags);
  });

  it("should handle setSearchQuery", () => {
    const actual = filtersReducer(initialState, setSearchQuery("blockchain developer"));
    expect(actual.searchQuery).toBe("blockchain developer");
  });

  it("should handle setStatus", () => {
    const actual = filtersReducer(initialState, setStatus(0));
    expect(actual.status).toBe(0);
  });

  it("should handle setStatus with null", () => {
    const stateWithStatus = { ...initialState, status: 0 };
    const actual = filtersReducer(stateWithStatus, setStatus(null));
    expect(actual.status).toBeNull();
  });

  it("should handle resetFilters", () => {
    const modifiedState = {
      category: "Engineering",
      salaryMin: 50000,
      salaryMax: 100000,
      tags: ["Rust"],
      searchQuery: "developer",
      status: 0,
    };

    const actual = filtersReducer(modifiedState, resetFilters());
    expect(actual).toEqual(initialState);
  });

  it("should handle multiple filter changes", () => {
    let state = filtersReducer(initialState, setCategory("Design"));
    state = filtersReducer(state, setSalaryRange({ min: 60000, max: 120000 }));
    state = filtersReducer(state, setSearchQuery("UI designer"));
    state = filtersReducer(state, setTags(["Figma", "UI/UX"]));

    expect(state).toEqual({
      category: "Design",
      salaryMin: 60000,
      salaryMax: 120000,
      tags: ["Figma", "UI/UX"],
      searchQuery: "UI designer",
      status: null,
    });
  });
});
