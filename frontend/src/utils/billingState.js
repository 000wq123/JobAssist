export const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen (Diesen Monat)",
  cover_letter: "Anschreiben (Diesen Monat)",
  job_alerts: "Job-Alerts (Diesen Monat)",
  ai_chat: "KI-Nachrichten (Diesen Monat)",
  job_search: "Jobsuchen (Heute)",
};

export const PLAN_NAMES = {
  basic: "Basic",
  pro: "Pro",
  max: "Max",
  enterprise: "Enterprise",
};

export function getUsageBarState(feature, used, limit) {
  const label = FEATURE_LABELS[feature] || feature;
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = !unlimited && pct >= 80;

  return {
    label,
    unlimited,
    pct,
    isNearLimit,
    displayLimit: unlimited ? "∞" : limit,
  };
}

export function getPlanName(plan) {
  return PLAN_NAMES[plan] || "Basic";
}

export function getCleanBillingUrl(pathname, hash = "") {
  return `${pathname}${hash || ""}`;
}
