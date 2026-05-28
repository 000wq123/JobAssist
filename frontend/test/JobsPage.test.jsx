import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobsPage from "../src/pages/JobsPage.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockJobList = vi.fn();
const mockJobCreate = vi.fn();
const mockSearchCustom = vi.fn();
const mockResumeList = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockToast = vi.fn();

vi.mock("../src/services/api", () => ({
  jobApi: {
    list: (...args) => mockJobList(...args),
    create: (...args) => mockJobCreate(...args),
    searchCustom: (...args) => mockSearchCustom(...args),
    searchRecommended: vi.fn(() => Promise.resolve({ data: { jobs: [] } })),
  },
  aiAssistantApi: {
    analyzeJob: vi.fn(),
  },
  motivationsschreibenApi: {
    generate: vi.fn(),
  },
  resumeApi: {
    list: (...args) => mockResumeList(...args),
  },
  researchApi: {
    research: vi.fn(),
  },
}));

vi.mock("../src/hooks/useUsageGuard", () => ({
  default: () => ({
    guardedRun: (fn) => fn(),
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign((...args) => mockToast(...args), {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  }),
}));

describe("JobsPage", () => {
  beforeEach(() => {
    mockJobList.mockReset();
    mockJobCreate.mockReset();
    mockSearchCustom.mockReset();
    mockResumeList.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockToast.mockReset();
  });

  it("searches custom jobs and marks a saved result immediately", async () => {
    mockJobList.mockResolvedValue({ data: [] });
    mockResumeList.mockResolvedValue({ data: [] });
    mockSearchCustom.mockResolvedValue({
      data: {
        jobs: [
          {
            source_id: "job-1",
            title: "QA Engineer",
            company: "Acme",
            description: "Testing web apps",
            location: "Wien",
            updated: "2026-03-26T10:00:00.000Z",
            full_url: "https://example.com/job-1",
          },
        ],
      },
    });
    mockJobCreate.mockResolvedValue({ data: { id: 91 } });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], {
      me: { email: "user@example.com", full_name: "Max Mustermann" },
      usage: [],
    });

    renderWithProviders(<JobsPage />, { queryClient });

    // Switch to the "Eigene Suche" tab — Tabs component renders these as buttons.
    await userEvent.click(await screen.findByRole("tab", { name: /Eigene Suche/i }));

    await userEvent.type(
      screen.getByPlaceholderText(/React, Verkauf, Praktikum/i),
      "qa",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Suchen$/i }));

    // The result row's bookmark icon button is labelled "Speichern".
    await userEvent.click(await screen.findByRole("button", { name: /^Speichern$/ }));

    await waitFor(() => {
      expect(mockJobCreate).toHaveBeenCalledTimes(1);
    });

    expect(mockJobCreate.mock.calls[0][0]).toMatchObject({
      company: "Acme",
      role: "QA Engineer",
      url: "https://example.com/job-1",
    });
    // Save-success toast was simplified.
    expect(mockSuccess).toHaveBeenCalledWith("Stelle gespeichert");
  });
});
