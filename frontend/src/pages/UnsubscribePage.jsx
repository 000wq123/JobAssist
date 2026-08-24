import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Bell, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { jobAlertsApi } from "../services/api";

/** One-click unsubscribe page — consumes a token from the URL and calls the alerts API. */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Kein gültiger Abmelde-Token gefunden.");
      return;
    }
    jobAlertsApi.unsubscribe(token)
      .then(() => {
        setStatus("success");
        setMessage("Du wirst keine weiteren Job-Alerts von diesem Alert erhalten.");
      })
      .catch((err) => {
        setStatus("error");
        const detail = err?.response?.data?.detail;
        setMessage(typeof detail === "string" ? detail : "Der Link ist ungültig oder bereits abgelaufen.");
      });
  }, [token]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--color-bg)] flex items-center justify-center px-4">
      {/* Page-level radial glow — matches AuthLayout/LegalLayout chrome */}
      <div
        aria-hidden="true"
        // eslint-disable-next-line no-restricted-syntax -- decorative glow, not layout
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,92,255,0.20), transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-sm w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-8 text-center">
        {status === "loading" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] mx-auto mb-5">
              <Loader2 className="w-6 h-6 text-[var(--app-brand)] animate-spin" />
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-2">Abmeldung wird verarbeitet…</h1>
            <p className="text-[13px] text-[var(--color-fg-muted)]">Bitte warte einen Moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/25 mx-auto mb-5">
              <CheckCircle2 className="w-6 h-6 text-[var(--color-success)]" />
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-2">Erfolgreich abgemeldet</h1>
            <p className="text-[13px] text-[var(--color-fg-muted)] mb-6 leading-relaxed">{message}</p>
            <Link
              to="/job-alerts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--app-brand)] text-white text-[13px] font-semibold transition-colors hover:bg-[var(--app-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              <Bell className="w-4 h-4" /> Alerts verwalten
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/25 mx-auto mb-5">
              <AlertCircle className="w-6 h-6 text-[var(--color-error)]" />
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-2">Abmeldung fehlgeschlagen</h1>
            <p className="text-[13px] text-[var(--color-fg-muted)] mb-6 leading-relaxed">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-fg)] text-[13px] font-semibold hover:bg-[var(--color-bg-elev-3)] hover:border-[var(--color-border-strong)] transition-colors"
            >
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
