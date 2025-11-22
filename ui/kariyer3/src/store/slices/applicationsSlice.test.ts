import { describe, it, expect } from "vitest";
import applicationsReducer, {
  setApplications,
  setLoading,
  setError,
  addApplication,
  Application,
} from "./applicationsSlice";

describe("applicationsSlice", () => {
  const initialState = {
    applications: [],
    loading: false,
    error: null,
  };

  const mockApplication: Application = {
    id: "0xapp123",
    job_id: "0xjob123",
    applicant: "0xapplicant123",
    cover_message: "I am very interested in this position.",
    cv_blob_id: "blob-id-456",
    applied_at: 1640000000000,
    ai_score: null,
    ai_analysis: null,
  };

  it("should return initial state", () => {
    expect(applicationsReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setApplications", () => {
    const applications = [mockApplication];
    const actual = applicationsReducer(initialState, setApplications(applications));
    expect(actual.applications).toEqual(applications);
    expect(actual.loading).toBe(false);
  });

  it("should handle setLoading", () => {
    const actual = applicationsReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
  });

  it("should handle setError", () => {
    const error = "Failed to load applications";
    const actual = applicationsReducer(initialState, setError(error));
    expect(actual.error).toBe(error);
    expect(actual.loading).toBe(false);
  });

  it("should handle addApplication", () => {
    const actual = applicationsReducer(initialState, addApplication(mockApplication));
    expect(actual.applications).toHaveLength(1);
    expect(actual.applications[0]).toEqual(mockApplication);
  });

  it("should add multiple applications", () => {
    let state = applicationsReducer(initialState, addApplication(mockApplication));

    const secondApplication = {
      ...mockApplication,
      id: "0xapp456",
      job_id: "0xjob456",
    };

    state = applicationsReducer(state, addApplication(secondApplication));
    expect(state.applications).toHaveLength(2);
  });

  it("should handle application with AI review", () => {
    const applicationWithAI = {
      ...mockApplication,
      ai_score: 85,
      ai_analysis: "Strong candidate with relevant experience",
    };

    const actual = applicationsReducer(initialState, addApplication(applicationWithAI));
    expect(actual.applications[0].ai_score).toBe(85);
    expect(actual.applications[0].ai_analysis).toBe("Strong candidate with relevant experience");
  });

  it("should clear error when setting loading to true", () => {
    const stateWithError = {
      ...initialState,
      error: "Previous error",
    };

    const actual = applicationsReducer(stateWithError, setLoading(true));
    expect(actual.error).toBeNull();
    expect(actual.loading).toBe(true);
  });

  it("should replace all applications when calling setApplications", () => {
    const stateWithApps = {
      ...initialState,
      applications: [mockApplication],
    };

    const newApplications = [
      { ...mockApplication, id: "0xnew1" },
      { ...mockApplication, id: "0xnew2" },
    ];

    const actual = applicationsReducer(stateWithApps, setApplications(newApplications));
    expect(actual.applications).toHaveLength(2);
    expect(actual.applications).toEqual(newApplications);
  });
});
