import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

import { STORAGE_KEYS, readJson, writeJson } from "../storageKeys";
import { useTheme } from "../context/ThemeContext";

/**
 * Bottom inset below the fixed banner. `env(safe-area-inset-bottom)` cannot
 * be simulated in a deterministic test environment (it always renders 0 in
 * Chromium), so the value is routed through the `--ja-safe-area-bottom`
 * custom property: the stylesheet sets it to `env(safe-area-inset-bottom)`,
 * while E2E tests may override the property to exercise real notch geometry
 * (e.g. 34px on notched iPhones). The inset pads the banner container —
 * transparent space that cannot cover page content — and never stretches
 * the buttons.
 */
export const COOKIE_BANNER_SAFE_AREA_VAR = "--ja-safe-area-bottom";

/**
 * GDPR-compliant cookie consent banner.
 *
 * We split storage into two categories:
 *  - **essential** — login cookie + access token + auth-store state.
 *    These are required for the site to work and the user cannot opt out
 *    (per ePrivacy Directive, strictly necessary cookies don't need consent
 *    but we still surface them for transparency).
 *  - **analytics** — Sentry session replay / performance traces. The user
 *    can opt out; this just sets a flag we read elsewhere.
 *
 * Once consent is recorded (either choice), the banner stays dismissed.
 *
 * @returns {JSX.Element|null}
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const { resolved } = useTheme();
  const dark = resolved === "dark";

  useEffect(() => {
    const existing = readJson(STORAGE_KEYS.COOKIE_CONSENT);
    if (!existing || typeof existing.ts !== "number") {
      setVisible(true);
    }
  }, []);

  const persist = (analytics) => {
    writeJson(STORAGE_KEYS.COOKIE_CONSENT, {
      essential: true,
      analytics,
      ts: Date.now(),
    });
    // Surface the choice as a custom event so analytics modules can react.
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", {
        detail: { analytics },
      }),
    );
    setVisible(false);
  };

  if (!visible) return null;

  // The consent banner renders on the (always light) landing page but is
  // mounted app-wide, so it follows the app theme: light palette on the
  // landing, dark elevated surface when the user browses in dark mode.
  const surface = dark
    ? "border-white/10 bg-[#1B1B22] text-[#EEEEF2] shadow-black/60"
    : "border-[#e8e8e5] bg-[#ffffff] text-[#171717] shadow-black/20";
  // Mobile: anchored to the bottom safe area. The public landing page has no
  // bottom navigation, so the banner sits at the viewport edge instead of
  // floating ~5rem above it (where it covered the hero CTA on phones).
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie-Einstellungen"
      data-cookie-consent-banner
      className={`fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md z-[60]
                 rounded-t-2xl sm:rounded-2xl border shadow-2xl ${surface}`}
      style={{ paddingBottom: "var(--ja-safe-area-bottom, env(safe-area-inset-bottom))" }}
    >
      {/* Compact on phones: a one-line heading row, no disclosure
          paragraph (screen readers get it via .sr-only), and the two actions
          side by side — the banner must never grow tall enough to cover the
          hero CTA, even with a real 34px notch inset (asserted in
          mobile-compat.spec.js with the inset simulated via
          --ja-safe-area-bottom). Desktop keeps the roomy two-row layout. */}
      <div className="flex items-center gap-2.5 mb-1.5 px-3 pt-2.5 sm:items-start sm:gap-3 sm:mb-3 sm:px-5 sm:pt-4 sm:p-0">
        <div className={`grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl shrink-0 ${dark ? "bg-[#E30613]/15 border border-[#E30613]/30" : "bg-[#fff0f1] border border-[#ffd9dc]"}`}>
          <Cookie className="w-4 h-4 sm:w-5 sm:h-5 text-[#e30613]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          {/* One line at every phone width: the title truncates (ellipsis)
              rather than wrapping, and the privacy link keeps its full
              wording next to it. The h2's accessible name carries the full
              phrase so truncation never hides information from screen
              readers. Asserted by the one-line check in
              mobile-compat.spec.js. */}
          <h2
            className={`text-[12px] xs:text-[12.5px] sm:text-[14px] font-semibold tracking-tight mb-0 sm:mb-1 ${dark ? "text-[#EEEEF2]" : "text-[#111]"}`}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">Cookies &amp; Datenschutz</span>
              <span aria-hidden="true" className="sm:hidden shrink-0 text-[#e30613]">·</span>
              <Link
                to="/privacy"
                data-tap-inline
                className={`sm:hidden underline decoration-dotted whitespace-nowrap shrink-0 ${dark ? "text-[#EEEEF2]" : "text-[#171717]"}`}
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
              >
                Datenschutzerklärung
              </Link>
            </span>
          </h2>
          <p className={`hidden sm:block text-[12px] leading-relaxed ${dark ? "text-[#A0A0AB]" : "text-[#565656]"}`}>
            Notwendige Cookies für Login &amp; Sicherheit. Optional anonymisierte Analytics für Fehler &amp; Performance — jederzeit widerrufbar.{" "}
            <Link
              to="/privacy"
              className={`underline decoration-dotted transition-colors ${dark ? "text-[#EEEEF2] hover:text-[#A0A0AB]" : "text-[#171717] hover:text-[#565656]"}`}
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
          {/* Screen readers get the full disclosure on phones too. */}
          <p className={`sr-only sm:hidden`}>
            Notwendige Cookies für Login &amp; Sicherheit. Optional anonymisierte Analytics — jederzeit widerrufbar.
          </p>
        </div>
      </div>

      {/* ≥44px hit areas on phones (sm keeps the compact desktop size);
          side-by-side with tighter phone sizing. The safe-area inset pads
          the banner container (below) — never the buttons themselves — so
          button height stays a flat 44px and the inset adds transparent
          space that cannot cover page content. */}
      <div className="flex flex-row gap-2 sm:mt-4 px-3 sm:px-0 pb-0 sm:pb-0">
        <button
          type="button"
          onClick={() => persist(false)}
          className={`flex-1 h-[44px] sm:h-auto sm:min-h-0 px-1.5 sm:px-4 py-2 sm:pb-2 text-[11.5px] sm:text-[12.5px] whitespace-nowrap font-semibold rounded-lg border transition-colors
                     focus:outline-none focus-visible:ring-2 ${
            dark
              ? "border-white/12 text-[#A0A0AB] hover:text-[#EEEEF2] hover:bg-white/5 focus-visible:ring-white/30"
              : "border-[#e8e8e5] text-[#565656] hover:text-[#111] hover:bg-[#faf9f7] focus-visible:ring-[#dcdcd8]"
          }`}
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => persist(true)}
          className="flex-1 h-[44px] sm:h-auto sm:min-h-0 px-1.5 sm:px-4 py-2 sm:pb-2 text-[11.5px] sm:text-[12.5px] whitespace-nowrap font-semibold rounded-lg
                     bg-[#e30613] hover:bg-[#c9000b]
                     text-white
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e30613] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                     transition-colors"
        >
          Alle akzeptieren
        </button>
      </div>
    </div>
  );
}

/**
 * Read the persisted analytics preference. Returns `null` if the user
 * hasn't decided yet, otherwise `true`/`false`.
 */
export function getAnalyticsConsent() {
  const stored = readJson(STORAGE_KEYS.COOKIE_CONSENT);
  if (!stored) return null;
  return Boolean(stored.analytics);
}
