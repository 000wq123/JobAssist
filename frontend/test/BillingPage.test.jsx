import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BillingPage from "../src/pages/BillingPage.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockOverview = vi.fn();
const mockCreatePortal = vi.fn();
const mockSuccess = vi.fn();
const mockToast = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  billingApi: {
    overview: (...args) => mockOverview(...args),
    createPortal: (...args) => mockCreatePortal(...args),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
    ...((...args) => mockToast(...args)),
  },
}));

describe("BillingPage", () => {
  beforeEach(() => {
    mockOverview.mockReset();
    mockCreatePortal.mockReset();
    mockSuccess.mockReset();
    mockToast.mockReset();
    mockError.mockReset();
    window.history.replaceState({}, "", "/billing?success=true#usage");
  });

  it("renders usage from init cache and clears success query params after toast", async () => {
    mockOverview.mockResolvedValue({
      data: {
        subscription: { plan: "pro", current_period_end: "2026-05-01T00:00:00.000Z" },
        usage: [{ feature: "cv_analysis", used: 0, limit: 5 }],
      },
    });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], {
      plan: "pro",
      usage: [
        { feature: "job_search", used: 3, limit: 10 },
        { feature: "ai_chat", used: 4, limit: -1 },
      ],
    });
    renderWithProviders(<BillingPage />, { route: "/billing?success=true#usage", queryClient });

    expect(await screen.findByText("Abrechnung")).toBeInTheDocument();
    // UsageRow renders only the prefix of the localized label (everything
    // before " ("), so we assert on the short form rather than the full
    // "Jobsuchen (Heute)" / "KI-Nachrichten (Diesen Monat)" strings.
    expect(await screen.findByText("Jobsuchen")).toBeInTheDocument();
    expect(screen.getByText("KI-Nachrichten")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith("Upgrade erfolgreich! Willkommen bei deinem neuen Plan.");
    });

    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#usage");
  });
});
