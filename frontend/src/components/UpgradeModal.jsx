import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Zap } from "lucide-react";
import toast from "react-hot-toast";

import Button from "./ui/Button";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Jobsuche / Tag",
};

/**
 * Portal-rendered modal that prompts the user to upgrade when a feature limit is hit.
 * Reads global upgrade-modal state from the Zustand store.
 */
export default function UpgradeModal() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => setData(e.detail);
    window.addEventListener("usage-limit", handler);
    return () => window.removeEventListener("usage-limit", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => toast.error(e.detail.message, { duration: 5000, id: "rate-limit-toast" });
    window.addEventListener("rate-limited", handler);
    return () => window.removeEventListener("rate-limited", handler);
  }, []);

  if (!data) return null;

  const featureLabel = FEATURE_LABELS[data.feature] || data.feature;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "16px",
      }}
      onClick={() => setData(null)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "rgba(124,125,240,0.22)", border: "1px solid rgba(124,125,240,0.38)" }}>
            <Zap className="h-5 w-5 text-[var(--color-accent-300)]" />
          </div>
          <button
            onClick={() => setData(null)}
            aria-label="Schließen"
            className="rounded-lg p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <h2 className="mb-2 text-[18px] font-semibold tracking-tight text-[var(--color-fg)]">Limit erreicht</h2>
        <p className="mb-4 text-[13px] text-[var(--color-fg-muted)]">
          Du hast <strong className="text-[var(--color-fg)]">{data.used}/{data.limit}</strong> {featureLabel} in deinem{" "}
          <strong className="text-[var(--color-fg)]">{data.plan === "basic" ? "Basic" : data.plan}</strong>-Plan verwendet.
        </p>
        <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
          Upgrade auf Pro oder Max, um mehr Funktionen freizuschalten.
        </p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={() => {
              setData(null);
              navigate("/pricing");
            }}
          >
            Pläne ansehen
          </Button>
          <Button variant="ghost" size="md" onClick={() => setData(null)}>
            Später
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
