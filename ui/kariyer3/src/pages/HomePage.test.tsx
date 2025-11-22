import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { TestProviders, createMockStore, mockSuiClient, mockJob } from "../test/mocks";

// Mock @mysten/dapp-kit
vi.mock("@mysten/dapp-kit", () => ({
  useSuiClient: () => mockSuiClient,
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHomePage = (preloadedState = {}) => {
    const store = createMockStore(preloadedState);
    return render(
      <TestProviders store={store}>
        <HomePage />
      </TestProviders>
    );
  };

  it("should render hero section", () => {
    renderHomePage();
    expect(screen.getByText("Find Your Next Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Decentralized job board powered by Sui blockchain")).toBeInTheDocument();
  });

  it("should render filter bar", () => {
    renderHomePage();
    expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
  });

  it("should show loading state initially", () => {
    const state = {
      jobs: { jobs: [], loading: true, error: null },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderHomePage(state);
    expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
  });

  it("should render job list when loaded", async () => {
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

    renderHomePage(state);

    await waitFor(() => {
      expect(screen.queryByText("Loading jobs...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Senior Blockchain Developer")).toBeInTheDocument();
  });

  it("should load jobs on mount", async () => {
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

    renderHomePage(state);

    await waitFor(() => {
      expect(mockSuiClient.getOwnedObjects).toHaveBeenCalled();
    });
  });

  it("should handle error state", () => {
    const state = {
      jobs: { jobs: [], loading: false, error: "Failed to load jobs" },
      filters: {
        category: null,
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderHomePage(state);
    // Even with error, the page should render with empty job list
    expect(screen.getByText("Find Your Next Opportunity")).toBeInTheDocument();
  });

  it("should show empty state when no jobs available", () => {
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

    renderHomePage(state);
    expect(screen.getByText("No jobs found")).toBeInTheDocument();
  });

  it("should filter jobs using FilterBar", () => {
    const jobs = [
      { ...mockJob, id: "1", category: "Engineering" },
      { ...mockJob, id: "2", category: "Design", title: "UI Designer" },
    ];

    const state = {
      jobs: { jobs, loading: false, error: null },
      filters: {
        category: "Engineering",
        salaryMin: null,
        salaryMax: null,
        tags: [],
        searchQuery: "",
        status: null,
      },
    };

    renderHomePage(state);
    expect(screen.getByText("Senior Blockchain Developer")).toBeInTheDocument();
    expect(screen.queryByText("UI Designer")).not.toBeInTheDocument();
  });
});
