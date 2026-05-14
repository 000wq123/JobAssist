import React, { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplicationsList from "../src/components/ApplicationsList.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockResumeList = vi.fn();
const mockDelete = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  resumeApi: {
    list: (...args) => mockResumeList(...args),
  },
  jobApi: {
    delete: (...args) => mockDelete(...args),
    updateStatus: vi.fn(),
    updateNotes: vi.fn(),
    updateDeadline: vi.fn(),
    updateUrl: vi.fn(),
    generateMatch: vi.fn(),
    generateCoverLetter: vi.fn(),
    generateInterviewPrep: vi.fn(),
    saveResearch: vi.fn(),
  },
  motivationsschreibenApi: {
    generate: vi.fn(),
  },
  researchApi: {
    research: vi.fn(),
  },
}));

vi.mock("../src/components/ResearchModal", () => ({
  default: () => null,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  },
}));

function StatefulApplicationsList({ initialJobs }) {
  const [jobs, setJobs] = useState(initialJobs);
  return <ApplicationsList jobs={jobs} onJobsUpdate={setJobs} />;
}

describe("ApplicationsList", () => {
  beforeEach(() => {
    mockResumeList.mockReset();
    mockDelete.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
  });

  it("removes a job after delete", async () => {
    mockResumeList.mockResolvedValue({ data: [] });
    mockDelete.mockResolvedValue({ status: 204 });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], {
      me: { email: "user@example.com", full_name: "Max Mustermann" },
    });

    renderWithProviders(
      <StatefulApplicationsList
        initialJobs={[
          {
            id: 1,
            role: "Frontend Engineer",
            company: "ACME",
            status: "bookmarked",
            description: "React role",
            created_at: "2026-03-26T10:00:00.000Z",
            updated_at: "2026-03-26T10:00:00.000Z",
          },
        ]}
      />,
      { queryClient },
    );

    // The list view renders a compact card for each job; clicking it opens
    // the detail panel where the trash icon lives.
    const jobCard = await screen.findByRole("button", { name: /Frontend Engineer/ });
    await userEvent.click(jobCard);

    // The trash button inside the detail panel is identified by its
    // `title` attribute. The component renders both a desktop and a
    // mobile-overlay variant of the panel, so we click the first match.
    // The "no-resume hint" copy moved into the same panel and is
    // exercised separately by the JobDetailPage tests.
    const deleteButtons = await screen.findAllByTitle("Stelle löschen");
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
    });

    expect(mockSuccess).toHaveBeenCalledWith("Stelle entfernt");
  });
});
