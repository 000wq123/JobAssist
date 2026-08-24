import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

import { STORAGE_KEYS, readJson, writeJson } from "../storageKeys";

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

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie-Einstellungen"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md z-[60]
                 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/95 backdrop-blur-sm
                 shadow-2xl shadow-black/40 p-5 sm:p-6
                 text-[var(--color-fg)]"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 shrink-0">
          <Cookie className="w-5 h-5 text-[var(--color-warning)]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)] mb-1">
            Cookies &amp; Datenschutz
          </h2>
          <p className="text-[12px] text-[var(--color-fg-muted)] leading-relaxed">
            Wir verwenden technisch notwendige Cookies, damit Login und
            Sicherheitsfunktionen funktionieren. Optional erfassen wir mit{" "}
            <span className="text-[var(--color-fg)]">anonymisierten Analytics</span> Fehler &amp;
            Performance, um JobAssist zu verbessern. Du kannst jederzeit in den
            Einstellungen widerrufen.{" "}
            <Link
              to="/privacy"
              className="underline decoration-dotted text-[var(--color-fg)] hover:text-[var(--color-fg-muted)] transition-colors"
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
          className="flex-1 px-4 py-2 text-[12.5px] font-semibold rounded-lg
                     border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]
                     transition-colors"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => persist(true)}
          className="flex-1 px-4 py-2 text-[12.5px] font-semibold rounded-lg
                     bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-400)]
                     text-white
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elev-1)]
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
