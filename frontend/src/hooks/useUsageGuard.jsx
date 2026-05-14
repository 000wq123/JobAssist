import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertCircle, ArrowRight } from "lucide-react";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Jobsuchen",
};

const FEATURE_PERIODS = {
  cv_analysis: "diesen Monat",
  cover_letter: "diesen Monat",
  job_alerts: "diesen Monat",
  ai_chat: "diesen Monat",
  job_search: "heute",
};

/**
 * Hook that checks whether the user has remaining quota for a feature.
 * Returns a `guard()` function that shows the UpgradeModal when the limit is hit.
 * @param {'cv_analysis'|'cover_letter'|'job_alerts'|'ai_chat'|'job_search'} feature
 * @returns {{ guard: () => boolean, remaining: number|null }}
 */
export default function useUsageGuard(feature) {
  const navigate = useNavigate();
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: billingData } = useQuery({ queryKey: ["billing-overview"], staleTime: 1000 * 60 * 2 });

  const usageList = billingData?.usage || initData?.usage || [];
  const entry = usageList.find((u) => u.feature === feature);

  const used = entry?.used ?? 0;
  const limit = entry?.limit ?? 0;
  const remaining = entry?.remaining ?? 0;
  const unlimited = limit === -1;
  const atLimit = !unlimited && remaining <= 0;
  const nearLimit = !unlimited && !atLimit && limit > 0 && remaining <= Math.max(1, Math.ceil(limit * 0.2));
  const label = FEATURE_LABELS[feature] || feature;
  const periodLabel = FEATURE_PERIODS[feature] || "diesen Monat";

  const guardedRun = (fn) => {
    if (atLimit) {
      toast(
        (t) => (
          <div className="w-full max-w-md rounded-2xl bg-[#0D1117] border border-[#1C2333] p-5 shadow-2xl shadow-black/60">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">Limit erreicht</p>
                <p className="mt-1 text-sm text-slate-400">
                  Du hast {used}/{limit} {label} {periodLabel} verbraucht.
                  Upgrade auf Pro oder Max für mehr Kapazität.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { toast.dismiss(t.id); navigate("/pricing"); }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500"
                  >
                    Upgrade <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="rounded-xl border border-[#1C2333] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 10000, style: { maxWidth: "448px", padding: 0, background: "transparent", boxShadow: "none" } }
      );
      return;
    }

    if (nearLimit) {
      toast(`Noch ${remaining} ${label} übrig ${periodLabel}`, {
        icon: "⚠️",
        duration: 4000,
        id: `usage-warning-${feature}`,
      });
    }

    return fn();
  };

  return { canUse: !atLimit, remaining, used, limit, unlimited, atLimit, nearLimit, guardedRun, label };
}
