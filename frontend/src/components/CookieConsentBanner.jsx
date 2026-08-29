import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

import { STORAGE_KEYS, readJson, writeJson } from "../storageKeys";
import { useTheme } from "../context/ThemeContext";

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
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie-Einstellungen"
      className={`fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md z-[60]
                 rounded-2xl border p-5 sm:p-6 shadow-2xl ${surface}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${dark ? "bg-[#E30613]/15 border border-[#E30613]/30" : "bg-[#fff0f1] border border-[#ffd9dc]"}`}>
          <Cookie className="w-5 h-5 text-[#e30613]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-[14px] font-semibold tracking-tight mb-1 ${dark ? "text-[#EEEEF2]" : "text-[#111]"}`}>
            Cookies &amp; Datenschutz
          </h2>
          <p className={`text-[12px] leading-relaxed ${dark ? "text-[#A0A0AB]" : "text-[#565656]"}`}>
            Wir verwenden technisch notwendige Cookies, damit Login und
            Sicherheitsfunktionen funktionieren. Optional erfassen wir mit{" "}
            <span className={dark ? "text-[#EEEEF2]" : "text-[#171717]"}>anonymisierten Analytics</span> Fehler &amp;
            Performance, um JobAssist zu verbessern. Du kannst jederzeit in den
            Einstellungen widerrufen.{" "}
            <Link
              to="/privacy"
              className={`underline decoration-dotted transition-colors ${dark ? "text-[#EEEEF2] hover:text-[#A0A0AB]" : "text-[#171717] hover:text-[#565656]"}`}
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          type="button"
          onClick={() => persist(false)}
          className={`flex-1 px-4 py-2 text-[12.5px] font-semibold rounded-lg border transition-colors
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
          className="flex-1 px-4 py-2 text-[12.5px] font-semibold rounded-lg
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
