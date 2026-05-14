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
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md z-[60]
                 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur
                 shadow-2xl shadow-black/30 p-5 sm:p-6
                 text-slate-200"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Cookies &amp; Datenschutz
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Wir verwenden technisch notwendige Cookies, damit Login und
            Sicherheitsfunktionen funktionieren. Optional erfassen wir mit{" "}
            <span className="text-slate-300">anonymisierten Analytics</span> Fehler &amp;
            Performance, um JobAssist zu verbessern. Du kannst jederzeit in den
            Einstellungen widerrufen.{" "}
            <Link
              to="/privacy"
              className="underline decoration-dotted hover:text-slate-200 transition-colors"
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
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                     border border-slate-700 text-slate-200 hover:bg-slate-800
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
                     transition-colors"
        >
          Nur notwendige
        </button>
        <button
          type="button"
          onClick={() => persist(true)}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                     bg-gradient-to-r from-brand-500 to-accent-600 hover:from-brand-400 hover:to-accent-500
                     text-white shadow-md shadow-brand-500/30
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                     transition-all"
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
