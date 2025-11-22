import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PostJobPage } from "./PostJobPage";
import { TestProviders, mockAuthContext, mockSignAndExecute } from "../test/mocks";

// Mock hooks
vi.mock("../providers/AuthProvider", () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock("@mysten/dapp-kit", () => ({
  useSignAndExecuteTransaction: () => mockSignAndExecute,
}));

describe("PostJobPage", () => {
  const renderPostJobPage = () => {
    return render(
      <TestProviders>
        <PostJobPage />
      </TestProviders>
    );
  };

  it("should render form when connected", () => {
    renderPostJobPage();
    expect(screen.getByText("Post a Job")).toBeInTheDocument();
    expect(screen.getByLabelText("Job Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
  });

  it("should render all form fields", () => {
    renderPostJobPage();

    expect(screen.getByLabelText("Job Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Min Salary (SUI)")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Salary (SUI)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags (comma-separated)")).toBeInTheDocument();
    expect(screen.getByLabelText("Job Description")).toBeInTheDocument();
  });

  it("should render category select with options", () => {
    renderPostJobPage();

    const categorySelect = screen.getByLabelText("Category");
    expect(categorySelect).toBeInTheDocument();

    // Should have Engineering as default
    expect(screen.getByRole("option", { name: "Engineering" })).toBeInTheDocument();
  });

  it("should update form fields on change", () => {
    renderPostJobPage();

    const titleInput = screen.getByLabelText("Job Title");
    const companyInput = screen.getByLabelText("Company Name");
    const locationInput = screen.getByLabelText("Location");

    fireEvent.change(titleInput, { target: { value: "Senior Developer" } });
    fireEvent.change(companyInput, { target: { value: "Test Company" } });
    fireEvent.change(locationInput, { target: { value: "Remote" } });

    expect(titleInput).toHaveValue("Senior Developer");
    expect(companyInput).toHaveValue("Test Company");
    expect(locationInput).toHaveValue("Remote");
  });

  it("should update salary fields on change", () => {
    renderPostJobPage();

    const minSalaryInput = screen.getByLabelText("Min Salary (SUI)");
    const maxSalaryInput = screen.getByLabelText("Max Salary (SUI)");

    fireEvent.change(minSalaryInput, { target: { value: "100000" } });
    fireEvent.change(maxSalaryInput, { target: { value: "150000" } });

    expect(minSalaryInput).toHaveValue(100000);
    expect(maxSalaryInput).toHaveValue(150000);
  });

  it("should update description on change", () => {
    renderPostJobPage();

    const descriptionInput = screen.getByLabelText("Job Description");

    fireEvent.change(descriptionInput, { target: { value: "Test job description" } });

    expect(descriptionInput).toHaveValue("Test job description");
  });

  it("should handle tags input", () => {
    renderPostJobPage();

    const tagsInput = screen.getByLabelText("Tags (comma-separated)");

    fireEvent.change(tagsInput, { target: { value: "Rust, Blockchain, Remote" } });

    expect(tagsInput).toHaveValue("Rust, Blockchain, Remote");
  });

  it("should show submit button", () => {
    renderPostJobPage();

    const submitButton = screen.getByRole("button", { name: "Post Job" });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it("should disable submit button when submitting", async () => {
    renderPostJobPage();

    const titleInput = screen.getByLabelText("Job Title");
    const companyInput = screen.getByLabelText("Company Name");
    const locationInput = screen.getByLabelText("Location");
    const minSalaryInput = screen.getByLabelText("Min Salary (SUI)");
    const maxSalaryInput = screen.getByLabelText("Max Salary (SUI)");
    const descriptionInput = screen.getByLabelText("Job Description");

    fireEvent.change(titleInput, { target: { value: "Test Job" } });
    fireEvent.change(companyInput, { target: { value: "Test Company" } });
    fireEvent.change(locationInput, { target: { value: "Remote" } });
    fireEvent.change(minSalaryInput, { target: { value: "100000" } });
    fireEvent.change(maxSalaryInput, { target: { value: "150000" } });
    fireEvent.change(descriptionInput, { target: { value: "Test description" } });

    const form = screen.getByRole("button", { name: "Post Job" }).closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Posting.../i });
      expect(submitButton).toBeDisabled();
    });
  });

  it("should show required attribute on required fields", () => {
    renderPostJobPage();

    expect(screen.getByLabelText("Job Title")).toBeRequired();
    expect(screen.getByLabelText("Company Name")).toBeRequired();
    expect(screen.getByLabelText("Location")).toBeRequired();
    expect(screen.getByLabelText("Min Salary (SUI)")).toBeRequired();
    expect(screen.getByLabelText("Max Salary (SUI)")).toBeRequired();
    expect(screen.getByLabelText("Job Description")).toBeRequired();
  });

  it("should not show required on optional fields", () => {
    renderPostJobPage();

    expect(screen.getByLabelText("Tags (comma-separated)")).not.toBeRequired();
  });

  it("should have correct input types", () => {
    renderPostJobPage();

    expect(screen.getByLabelText("Job Title")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Company Name")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Location")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Min Salary (SUI)")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Max Salary (SUI)")).toHaveAttribute("type", "number");
  });

  it("should show placeholder for tags", () => {
    renderPostJobPage();

    const tagsInput = screen.getByLabelText("Tags (comma-separated)");
    expect(tagsInput).toHaveAttribute("placeholder", "Rust, Blockchain, Remote");
  });
});
