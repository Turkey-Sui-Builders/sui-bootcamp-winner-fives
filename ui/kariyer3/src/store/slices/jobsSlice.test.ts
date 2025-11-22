import { describe, it, expect } from "vitest";
import jobsReducer, { setJobs, setLoading, setError, addJob, updateJob, Job } from "./jobsSlice";

describe("jobsSlice", () => {
  const initialState = {
    jobs: [],
    loading: false,
    error: null,
  };

  const mockJob: Job = {
    id: "0x123",
    employer: "0xemployer123",
    title: "Senior Blockchain Developer",
    description: "Test job description",
    company: "Sui Labs",
    location: "Remote",
    category: "Engineering",
    salary_range: [100000, 150000],
    tags: ["Rust", "Blockchain"],
    created_at: 1640000000000,
    status: 0,
    hired_candidate: null,
  };

  it("should return initial state", () => {
    expect(jobsReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setJobs", () => {
    const jobs = [mockJob];
    const actual = jobsReducer(initialState, setJobs(jobs));
    expect(actual.jobs).toEqual(jobs);
    expect(actual.loading).toBe(false);
  });

  it("should handle setLoading", () => {
    const actual = jobsReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
  });

  it("should handle setError", () => {
    const error = "Failed to load jobs";
    const actual = jobsReducer(initialState, setError(error));
    expect(actual.error).toBe(error);
    expect(actual.loading).toBe(false);
  });

  it("should handle addJob", () => {
    const actual = jobsReducer(initialState, addJob(mockJob));
    expect(actual.jobs).toHaveLength(1);
    expect(actual.jobs[0]).toEqual(mockJob);
  });

  it("should handle updateJob", () => {
    const stateWithJob = {
      ...initialState,
      jobs: [mockJob],
    };

    const updatedJob = {
      ...mockJob,
      status: 1,
      hired_candidate: "0xcandidate123",
    };

    const actual = jobsReducer(stateWithJob, updateJob(updatedJob));
    expect(actual.jobs[0].status).toBe(1);
    expect(actual.jobs[0].hired_candidate).toBe("0xcandidate123");
  });

  it("should not update non-existent job", () => {
    const nonExistentJob = {
      ...mockJob,
      id: "0xnonexistent",
    };

    const actual = jobsReducer(initialState, updateJob(nonExistentJob));
    expect(actual.jobs).toHaveLength(0);
  });

  it("should clear error when setting loading to true", () => {
    const stateWithError = {
      ...initialState,
      error: "Previous error",
    };

    const actual = jobsReducer(stateWithError, setLoading(true));
    expect(actual.error).toBeNull();
    expect(actual.loading).toBe(true);
  });
});
