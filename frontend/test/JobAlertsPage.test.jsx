import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobAlertsPage from "../src/pages/JobAlertsPage.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRunNow = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  jobAlertsApi: {
    list: (...args) => mockList(...args),
    create: (...args) => mockCreate(...args),
    update: (...args) => mockUpdate(...args),
    delete: (...args) => mockDelete(...args),
    runNow: (...args) => mockRunNow(...args),
  },
}));

vi.mock("../src/hooks/useUsageGuard", () => ({
  default: () => ({
    guardedRun: (fn) => fn(),
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  },
}));

describe("JobAlertsPage", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockRunNow.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
  });

  it("creates a new alert and bumps cached usage", async () => {
    // The list endpoint now returns an object with alerts + per-day counters,
    // not a bare array. Match the live response shape.
    mockList.mockResolvedValue({
      data: {
        alerts: [
          {
            id: 1,
            keywords: "python",
            location: "Wien",
            job_type: "Full-time",
            email: "user@example.com",
            frequency: "daily",
            is_active: true,
            created_at: "2026-03-26T10:00:00.000Z",
            updated_at: "2026-03-26T10:00:00.000Z",
            last_sent_at: null,
          },
        ],
        daily_manual_run_count: 0,
        daily_manual_run_limit: 3,
        daily_creation_count: 0,
        daily_creation_limit: 3,
      },
    });
    mockCreate.mockResolvedValue({
      data: {
        id: 2,
        keywords: "golang",
        location: "Graz",
        job_type: "Part-time",
        email: "user@example.com",
        frequency: "weekly",
        is_active: true,
        created_at: "2026-03-26T11:00:00.000Z",
        updated_at: "2026-03-26T11:00:00.000Z",
        last_sent_at: null,
      },
    });

    const queryClient = createTestQueryClient();
    const initData = {
      me: { email: "user@example.com" },
      usage: [{ feature: "job_alerts", used: 1, limit: 2, remaining: 1 }],
    };
    const billingData = {
      usage: [{ feature: "job_alerts", used: 1, limit: 2, remaining: 1 }],
    };
    queryClient.setQueryData(["init"], initData);
    queryClient.setQueryData(["billing-overview"], billingData);

    renderWithProviders(<JobAlertsPage />, { queryClient });

    expect(await screen.findByText("python")).toBeInTheDocument();

    // The "Such-Agent einrichten" CTA replaces the old "Neuer Alert" text;
    // an exact-text match would be too brittle — match on the prefix.
    await userEvent.click(screen.getByRole("button", { name: /Such-Agent einrichten/i }));
    const textboxes = screen.getAllByRole("textbox");
    await userEvent.type(textboxes[0], "golang");
    await userEvent.type(textboxes[1], "Graz");
    await userEvent.click(screen.getByRole("radio", { name: "Wöchentlich" }));
    await userEvent.click(screen.getByRole("button", { name: "Alert erstellen" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      keywords: "golang",
      location: "Graz",
      frequency: "weekly",
    });

    // After create, "golang" appears both in the list sidebar (compact card)
    // and in the selected-alert detail header, so we expect ≥1 occurrence.
    expect((await screen.findAllByText("golang")).length).toBeGreaterThan(0);
    expect(mockSuccess).toHaveBeenCalledWith("Alert erstellt!");
    // bumpJobAlertUsageCaches bumps both billing-overview and init caches.
    expect(queryClient.getQueryData(["init"]).usage[0]).toMatchObject({ used: 2, remaining: 0 });
  });
});
