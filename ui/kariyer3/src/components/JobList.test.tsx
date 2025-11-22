import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobList } from "./JobList";
import { TestProviders, createMockStore, mockJob } from "../test/mocks";

describe("JobList", () => {
  const renderJobList = (preloadedState = {}) => {
    const store = createMockStore(preloadedState);
    return render(
      <TestProviders store={store}>
        <JobList />
      </TestProviders>
    );
  };

  it("should render empty state when no jobs", () => {
    const state = {
      jobs: { jobs: [], loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("No jobs found")).toBeInTheDocument();
  });

  it("should render job cards when jobs exist", () => {
    const state = {
      jobs: { jobs: [mockJob], loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Senior Blockchain Developer")).toBeInTheDocument();
    expect(screen.getByText("Sui Labs")).toBeInTheDocument();
  });

  it("should filter jobs by category", () => {
    const jobs = [
      { ...mockJob, id: "1", category: "Engineering" },
      { ...mockJob, id: "2", category: "Design", title: "UI Designer" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: "Design",
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.queryByText("Senior Blockchain Developer")).not.toBeInTheDocument();
    expect(screen.getByText("UI Designer")).toBeInTheDocument();
  });

  it("should filter jobs by minimum salary", () => {
    const jobs = [
      { ...mockJob, id: "1", salary_range: [50000, 80000] as [number, number] },
      { ...mockJob, id: "2", salary_range: [90000, 120000] as [number, number], title: "High Salary Job" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: 85000,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.queryByText("Senior Blockchain Developer")).not.toBeInTheDocument();
    expect(screen.getByText("High Salary Job")).toBeInTheDocument();
  });

  it("should filter jobs by maximum salary", () => {
    const jobs = [
      { ...mockJob, id: "1", salary_range: [50000, 80000] as [number, number], title: "Low Salary Job" },
      { ...mockJob, id: "2", salary_range: [90000, 120000] as [number, number] },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: 85000,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Low Salary Job")).toBeInTheDocument();
    expect(screen.queryByText("Senior Blockchain Developer")).not.toBeInTheDocument();
  });

  it("should filter jobs by search query in title", () => {
    const jobs = [
      { ...mockJob, id: "1", title: "Frontend Developer" },
      { ...mockJob, id: "2", title: "Backend Engineer" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "frontend",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
  });

  it("should filter jobs by search query in company", () => {
    const jobs = [
      { ...mockJob, id: "1", company: "Mysten Labs" },
      { ...mockJob, id: "2", company: "Other Company" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "mysten",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Mysten Labs")).toBeInTheDocument();
    expect(screen.queryByText("Other Company")).not.toBeInTheDocument();
  });

  it("should filter jobs by status", () => {
    const jobs = [
      { ...mockJob, id: "1", status: 0, title: "Open Job" },
      { ...mockJob, id: "2", status: 1, title: "Closed Job" },
      { ...mockJob, id: "3", status: 2, title: "Hired Job" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: 0,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Open Job")).toBeInTheDocument();
    expect(screen.queryByText("Closed Job")).not.toBeInTheDocument();
    expect(screen.queryByText("Hired Job")).not.toBeInTheDocument();
  });

  it("should apply multiple filters simultaneously", () => {
    const jobs = [
      {
        ...mockJob,
        id: "1",
        category: "Engineering",
        salary_range: [100000, 150000] as [number, number],
        status: 0,
        title: "Blockchain Developer",
      },
      {
        ...mockJob,
        id: "2",
        category: "Design",
        salary_range: [60000, 90000] as [number, number],
        status: 0,
        title: "UI Designer",
      },
      {
        ...mockJob,
        id: "3",
        category: "Engineering",
        salary_range: [80000, 110000] as [number, number],
        status: 1,
        title: "Frontend Developer",
      },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: "Engineering",
        salaryMin: 95000,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: 0,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Blockchain Developer")).toBeInTheDocument();
    expect(screen.queryByText("UI Designer")).not.toBeInTheDocument();
    expect(screen.queryByText("Frontend Developer")).not.toBeInTheDocument();
  });

  it("should show all jobs when no filters applied", () => {
    const jobs = [
      { ...mockJob, id: "1", title: "Job 1" },
      { ...mockJob, id: "2", title: "Job 2" },
      { ...mockJob, id: "3", title: "Job 3" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Job 1")).toBeInTheDocument();
    expect(screen.getByText("Job 2")).toBeInTheDocument();
    expect(screen.getByText("Job 3")).toBeInTheDocument();
  });

  it("should handle case-insensitive search", () => {
    const jobs = [{ ...mockJob, id: "1", title: "Senior Blockchain Developer" }];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "BLOCKCHAIN",
        status: null,
      },
    };

    renderJobList(state);
    expect(screen.getByText("Senior Blockchain Developer")).toBeInTheDocument();
  });
});
