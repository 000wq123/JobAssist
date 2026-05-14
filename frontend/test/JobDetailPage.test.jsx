import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobDetailPage from "../src/pages/JobDetailPage.jsx";
import { createTestQueryClient } from "./render.jsx";

const mockJobGet = vi.fn();
const mockInterviewGenerate = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  jobApi: {
    get: (...args) => mockJobGet(...args),
    delete: vi.fn(),
    match: vi.fn(),
  },
  interviewApi: {
    generate: (...args) => mockInterviewGenerate(...args),
  },
  coverLetterApi: {
    generate: vi.fn(),
  },
  researchApi: {
    research: vi.fn(),
  },
  resumeApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ id: 7, filename: "resume.pdf" }] })),
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

describe("JobDetailPage", () => {
  beforeEach(() => {
    mockJobGet.mockReset();
    mockInterviewGenerate.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
  });

  it("generates interview prep and updates the visible job state immediately", async () => {
    mockJobGet.mockResolvedValue({
      data: {
        id: 42,
        role: "Backend Engineer",
        company: "Acme",
        description: "Build APIs",
        cover_letter: null,
        interview_qa: null,
        match_feedback: null,
      },
    });

    mockInterviewGenerate.mockResolvedValue({
      data: {
        id: 42,
        role: "Backend Engineer",
        company: "Acme",
        description: "Build APIs",
        cover_letter: null,
        match_feedback: null,
        interview_qa: JSON.stringify([
          {
            question: "Wie gehst du mit Datenbankmigrationen um?",
            answer: "Mit Rollback-Plan und Tests.",
            type: "technical",
            tip: "Nenne ein konkretes Beispiel.",
          },
        ]),
      },
    });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], { me: { email: "user@example.com" } });
    queryClient.setQueryData(["resumes"], [{ id: 7, filename: "resume.pdf" }]);

    const ui = (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/jobs/42"]}>
          <Routes>
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { container } = render(ui);

    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();

    // The action button that triggers the interview mutation is now labelled
    // "Gespräch erstellen". A button called "Gesprächsvorbereitung" still
    // exists but it's the (disabled-while-empty) results tab, not the action.
    await userEvent.click(screen.getByRole("button", { name: "Gespräch erstellen" }));

    await waitFor(() => {
      expect(mockInterviewGenerate).toHaveBeenCalledWith(42, 7);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(["jobs", "42"]) ?? queryClient.getQueryData(["jobs", 42])).toMatchObject({
        id: 42,
        interview_qa: expect.any(String),
      });
    });
    expect(mockSuccess).toHaveBeenCalledWith("Gesprächsvorbereitung fertig!");
    expect(container).toBeTruthy();
  });
});
