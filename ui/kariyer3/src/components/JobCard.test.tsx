import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { JobCard } from "./JobCard";
import { mockJob } from "../test/mocks";

describe("JobCard", () => {
  const renderJobCard = (job = mockJob) => {
    return render(
      <BrowserRouter>
        <JobCard job={job} />
      </BrowserRouter>
    );
  };

  it("should render job title and company", () => {
    renderJobCard();
    expect(screen.getByText("Senior Blockchain Developer")).toBeInTheDocument();
    expect(screen.getByText("Sui Labs")).toBeInTheDocument();
  });

  it("should render job location and category", () => {
    renderJobCard();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("should render salary range", () => {
    renderJobCard();
    expect(screen.getByText(/100,000 - 150,000 \$/)).toBeInTheDocument();
  });

  it("should render job tags", () => {
    renderJobCard();
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.getByText("Blockchain")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
  });

  it("should render status badge for open jobs", () => {
    const openJob = { ...mockJob, status: 0 };
    renderJobCard(openJob);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("should render status badge for closed jobs", () => {
    const closedJob = { ...mockJob, status: 1 };
    renderJobCard(closedJob);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("should render status badge for hired jobs", () => {
    const hiredJob = { ...mockJob, status: 2, hired_candidate: "0xcandidate123" };
    renderJobCard(hiredJob);
    expect(screen.getByText("Hired")).toBeInTheDocument();
  });

  it("should link to job detail page", () => {
    renderJobCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/job/${mockJob.id}`);
  });

  it("should render truncated description", () => {
    const longDescJob = {
      ...mockJob,
      description: "A".repeat(200),
    };
    renderJobCard(longDescJob);
    const description = screen.getByText(/A+/);
    expect(description.textContent?.length).toBeLessThanOrEqual(153); // 150 chars + "..."
  });

  it("should render job without tags", () => {
    const noTagsJob = { ...mockJob, tags: [] };
    renderJobCard(noTagsJob);
    expect(screen.queryByText("Rust")).not.toBeInTheDocument();
  });

  it("should handle jobs with very low salary", () => {
    const lowSalaryJob = {
      ...mockJob,
      salary_range: [0, 1000] as [number, number],
    };
    renderJobCard(lowSalaryJob);
    expect(screen.getByText(/0 - 1,000 \$/)).toBeInTheDocument();
  });

  it("should handle jobs with very high salary", () => {
    const highSalaryJob = {
      ...mockJob,
      salary_range: [1000000, 5000000] as [number, number],
    };
    renderJobCard(highSalaryJob);
    expect(screen.getByText(/1,000,000 - 5,000,000 \$/)).toBeInTheDocument();
  });
});
