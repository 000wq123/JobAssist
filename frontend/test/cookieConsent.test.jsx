import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CookieConsentBanner, { getAnalyticsConsent } from "../src/components/CookieConsentBanner";
import { renderWithProviders } from "./render";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    localStorage.removeItem("cookie_consent_v1");
  });

  it("renders a labelled non-modal dialog when no consent was recorded", () => {
    renderWithProviders(<CookieConsentBanner />);
    const dialog = screen.getByRole("dialog", { name: "Cookie-Einstellungen" });
    expect(dialog).toHaveAttribute("aria-modal", "false");
    expect(dialog).toHaveAttribute("data-cookie-consent-banner");
    expect(screen.getByRole("button", { name: "Nur notwendige" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Alle akzeptieren" })).toBeVisible();
  });

  it("keeps the mobile position anchored to the bottom safe area (no phantom bottom-nav offset)", () => {
    renderWithProviders(<CookieConsentBanner />);
    const dialog = screen.getByRole("dialog", { name: "Cookie-Einstellungen" });
    // The old class pinned the banner 5rem above the bottom — as if the
    // authenticated bottom navigation existed on the public landing page.
    // The safe-area inset now pads the buttons themselves, so the inset can
    // never add dead space below the actions.
    expect(dialog.className).not.toContain("bottom-[calc(5rem");
    expect(dialog.className).toContain("bottom-0");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      // Buttons keep a flat 44px height — the safe-area inset pads the
      // banner container, not the buttons.
      expect(btn.className).toContain("h-[44px]");
      expect(btn.className).not.toContain("safe-area");
    }
    // The inset is routed through --ja-safe-area-bottom so non-zero notch
    // geometry can be exercised deterministically in tests.
    expect(dialog.getAttribute("style")).toContain("--ja-safe-area-bottom");
  });

  it("gives both consent buttons at least a 44px hit area on phones", () => {
    // Simulate the phone media query that min-height responds to.
    Object.defineProperty(window, "innerWidth", { value: 320, configurable: true });
    renderWithProviders(<CookieConsentBanner />);
    for (const label of ["Nur notwendige", "Alle akzeptieren"]) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn.className).toContain("h-[44px]");
      expect(btn.className).toContain("flex-1");
    }
  });

  it("persists essential-only consent and hides the banner", () => {
    renderWithProviders(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Nur notwendige" }));
    expect(screen.queryByRole("dialog", { name: "Cookie-Einstellungen" })).toBeNull();
    expect(getAnalyticsConsent()).toBe(false);
  });

  it("persists analytics consent on accept", () => {
    renderWithProviders(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Alle akzeptieren" }));
    expect(getAnalyticsConsent()).toBe(true);
  });

  it("stays hidden once consent was already recorded", () => {
    localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: 1 }));
    render(<CookieConsentBanner />);
    expect(screen.queryByRole("dialog", { name: "Cookie-Einstellungen" })).toBeNull();
  });
});
