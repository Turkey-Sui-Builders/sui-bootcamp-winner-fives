import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "./FilterBar";
import { TestProviders, createMockStore } from "../test/mocks";

describe("FilterBar", () => {
  const renderFilterBar = (preloadedState = {}) => {
    const store = createMockStore(preloadedState);
    return render(
      <TestProviders store={store}>
        <FilterBar />
      </TestProviders>
    );
  };

  it("should render search input", () => {
    renderFilterBar();
    expect(screen.getByPlaceholderText("Search jobs...")).toBeInTheDocument();
  });

  it("should render category filter", () => {
    renderFilterBar();
    expect(screen.getByRole("combobox", { name: /category/i })).toBeInTheDocument();
  });

  it("should render salary range inputs", () => {
    renderFilterBar();
    expect(screen.getByPlaceholderText("Min Salary (SUI)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max Salary (SUI)")).toBeInTheDocument();
  });

  it("should render status filter", () => {
    renderFilterBar();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(2); // Category + Status
  });

  it("should render reset button", () => {
    renderFilterBar();
    expect(screen.getByText("Reset Filters")).toBeInTheDocument();
  });

  it("should update search query on input change", () => {
    renderFilterBar();
    const searchInput = screen.getByPlaceholderText("Search jobs...");

    fireEvent.change(searchInput, { target: { value: "blockchain developer" } });

    expect(searchInput).toHaveValue("blockchain developer");
  });

  it("should update min salary on input change", () => {
    renderFilterBar();
    const minSalaryInput = screen.getByPlaceholderText("Min Salary (SUI)");

    fireEvent.change(minSalaryInput, { target: { value: "50000" } });

    expect(minSalaryInput).toHaveValue(50000);
  });

  it("should update max salary on input change", () => {
    renderFilterBar();
    const maxSalaryInput = screen.getByPlaceholderText("Max Salary (SUI)");

    fireEvent.change(maxSalaryInput, { target: { value: "100000" } });

    expect(maxSalaryInput).toHaveValue(100000);
  });

  it("should display all job categories", () => {
    renderFilterBar();
    const categorySelect = screen.getByRole("combobox", { name: /category/i });

    fireEvent.click(categorySelect);

    // Check for "All Categories" option
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  it("should display status options", () => {
    renderFilterBar();

    // Status options should be available
    expect(screen.getByText("All Status")).toBeInTheDocument();
  });

  it("should show current filter values", () => {
    const preloadedState = {
      filters: {
        category: "Engineering",
        salaryMin: 60000,
        salaryMax: 120000,
        tags: [],
        searchQuery: "developer",
        status: 0,
      },
    };

    renderFilterBar(preloadedState);

    const searchInput = screen.getByPlaceholderText("Search jobs...");
    const minSalaryInput = screen.getByPlaceholderText("Min Salary (SUI)");
    const maxSalaryInput = screen.getByPlaceholderText("Max Salary (SUI)");

    expect(searchInput).toHaveValue("developer");
    expect(minSalaryInput).toHaveValue(60000);
    expect(maxSalaryInput).toHaveValue(120000);
  });

  it("should handle reset filters click", () => {
    const preloadedState = {
      filters: {
        category: "Design",
        salaryMin: 50000,
        salaryMax: 100000,
        tags: ["Figma"],
        searchQuery: "designer",
        status: 1,
      },
    };

    renderFilterBar(preloadedState);

    const resetButton = screen.getByText("Reset Filters");
    fireEvent.click(resetButton);

    // After reset, inputs should be cleared
    const searchInput = screen.getByPlaceholderText("Search jobs...");
    expect(searchInput).toHaveValue("");
  });

  it("should handle empty salary inputs", () => {
    renderFilterBar();

    const minSalaryInput = screen.getByPlaceholderText("Min Salary (SUI)");
    const maxSalaryInput = screen.getByPlaceholderText("Max Salary (SUI)");

    fireEvent.change(minSalaryInput, { target: { value: "" } });
    fireEvent.change(maxSalaryInput, { target: { value: "" } });

    expect(minSalaryInput).toHaveValue(null);
    expect(maxSalaryInput).toHaveValue(null);
  });
});
