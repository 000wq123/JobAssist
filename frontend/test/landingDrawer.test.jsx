import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import LandingPage from "../src/pages/LandingPage";
import { renderWithProviders } from "./render";
import useAuthStore, { setAuthStateForTests } from "../src/hooks/useAuthStore.testHelpers";

// IntersectionObserver is unavailable in jsdom; the landing page must treat
// that as "reveal everything immediately" (fail-visible, not fail-blank).
describe("LandingPage without IntersectionObserver", () => {
  it("marks all reveal elements visible when IntersectionObserver is missing", () => {
    renderWithProviders(<LandingPage />);
    const reveals = document.querySelectorAll(".lv5-reveal");
    expect(reveals.length).toBeGreaterThan(0);
    for (const el of reveals) {
      expect(el.classList.contains("lv5-visible")).toBe(true);
    }
  });
});

describe("LandingPage mobile drawer", () => {
  beforeEach(() => {
    setAuthStateForTests({ token: null, user: null, isHydrated: true, isBooting: false });
  });

  async function openDrawer() {
    renderWithProviders(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Menü öffnen" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Navigationsmenü" })).toBeVisible());
    return screen.getByRole("dialog", { name: "Navigationsmenü" });
  }

  it("renders an aria-modal dialog and locks body scroll", async () => {
    const drawer = await openDrawer();
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("keeps every drawer link at least 44px tall (min-h class)", async () => {
    const drawer = await openDrawer();
    for (const link of drawer.querySelectorAll("a")) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("closes on Escape and restores body scroll", async () => {
    await openDrawer();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Navigationsmenü" })).toBeNull(),
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes when the close button is pressed", async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Menü schließen" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Navigationsmenü" })).toBeNull(),
    );
  });

  it("hides the drawer on desktop breakpoints", async () => {
    const drawer = await openDrawer();
    expect(drawer.className).toContain("lg:hidden");
    expect(screen.getByRole("button", { name: "Menü öffnen" }).className).not.toContain("lg:hidden");
  });
});
