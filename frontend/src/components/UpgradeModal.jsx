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
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-lg shadow-brand-500/30">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <button
            onClick={() => setData(null)}
            aria-label="Schließen"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">Limit erreicht</h2>
        <p className="mb-4 text-slate-300">
          Du hast <strong className="text-white">{data.used}/{data.limit}</strong> {featureLabel} in deinem{" "}
          <strong className="text-white">{data.plan === "basic" ? "Basic" : data.plan}</strong>-Plan verwendet.
        </p>
        <p className="mb-6 text-sm text-slate-400">
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
