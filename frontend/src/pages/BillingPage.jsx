import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, CreditCard, ExternalLink, Zap,
  Rocket, Crown, Building2, Star,
} from "lucide-react";
import toast from "react-hot-toast";

import { CardSkeleton } from "../components/PageSkeleton";
import PageHeader from "../components/ui/PageHeader";
import { billingApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../utils/billingState";

// ─── Plan definitions — sourced from pricing page screenshot ──────────────────
// soon:true = grayed-out "coming soon" feature (shown muted, not crossed out)
const PLANS = [
  {
    key: "basic",
    name: "Basic",
    sub: "Zum Ausprobieren",
    price: "Gratis",
    period: "",
    iconCls: "from-slate-400 to-slate-500",
    borderCls: "border-slate-700",
    badgeCls: "",
    btnCls: "border border-[#1f2937] text-slate-500 cursor-default bg-[#0b1220]",
    Icon: Star,
    features: [
      { label: "5 Lebenslauf-Analysen / Monat" },
      { label: "5 Motivationsschreiben / Monat" },
      { label: "2 Aktive Job-Alerts" },
      { label: "15 KI-Bewerbungsassistent-Nachrichten / Monat" },
      { label: "5 Jobsuche / Tag" },
      { label: "Lebenslauf hochladen",    soon: true },
      { label: "Job-Suche",               soon: true },
      { label: "Pipeline-Tracking",       soon: true },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    sub: "Für aktive Bewerber",
    price: "€4,99",
    period: "/ Monat",
    badge: "Beliebt",
    iconCls: "from-brand-500 to-accent-600",
    borderCls: "border-brand-400",
    glowCls: "shadow-[0_0_28px_rgba(91,79,232,0.35)] hover:shadow-[0_0_40px_rgba(91,79,232,0.55)]",
    badgeCls: "bg-gradient-to-r from-brand-500 to-accent-600 text-white",
    btnCls: "bg-gradient-to-r from-brand-500 to-accent-600 text-white hover:from-brand-400 hover:to-accent-500 shadow-md shadow-brand-500/30",
    Icon: Zap,
    features: [
      { label: "15 Lebenslauf-Analysen / Monat" },
      { label: "25 Motivationsschreiben / Monat" },
      { label: "10 Aktive Job-Alerts" },
      { label: "200 KI-Bewerbungsassistent-Nachrichten / Monat" },
      { label: "20 Jobsuche / Tag" },
      { label: "Prioritäts-Support",      soon: true },
      { label: "Alles aus Basic",         soon: true },
    ],
  },
  {
    key: "max",
    name: "Max",
    sub: "Unbegrenzte Power",
    price: "€7,99",
    period: "/ Monat",
    badge: "Bestes Angebot",
    iconCls: "from-brand-500 to-accent-600",
    borderCls: "border-brand-400",
    glowCls: "shadow-[0_0_28px_rgba(91,79,232,0.35)] hover:shadow-[0_0_40px_rgba(91,79,232,0.55)]",
    badgeCls: "bg-gradient-to-r from-brand-500 to-accent-600 text-white",
    btnCls: "bg-gradient-to-r from-brand-500 to-accent-600 text-white hover:from-brand-400 hover:to-accent-500 shadow-md shadow-brand-500/30",
    Icon: Crown,
    features: [
      { label: "Unbegrenzt Lebenslauf-Analysen / Monat" },
      { label: "Unbegrenzt Motivationsschreiben / Monat" },
      { label: "Unbegrenzt Aktive Job-Alerts" },
      { label: "Unbegrenzt KI-Bewerbungsassistent-Nachrichten / Monat" },
      { label: "Unbegrenzt Jobsuche / Tag" },
      { label: "24h Support",             soon: true },
      { label: "Alles aus Pro",           soon: true },
      { label: "Unbegrenzte Nutzung",     soon: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    sub: "Für Teams & Agenturen",
    price: "Auf Anfrage",
    period: "",
    iconCls: "from-slate-500 to-slate-700",
    borderCls: "border-[#374151]",
    badgeCls: "",
    btnCls: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    btnLabel: "Kontaktiere uns",
    Icon: Building2,
    features: [
      { label: "Unbegrenzt Lebenslauf-Analysen / Monat" },
      { label: "Unbegrenzt Motivationsschreiben / Monat" },
      { label: "Unbegrenzt Aktive Job-Alerts" },
      { label: "Unbegrenzt KI-Bewerbungsassistent-Nachrichten / Monat" },
      { label: "Unbegrenzt Jobsuche / Tag" },
      { label: "Dedizierter Manager",     soon: true },
      { label: "Custom Integrationen",    soon: true },
      { label: "SLA & Compliance",        soon: true },
    ],
  },
];

// ─── Short labels for x-axis ─────────────────────────────────────────────────
const FEATURE_SHORT = {
  cv_analysis:  "Analysen",
  cover_letter: "Motivationsschreiben",
  job_alerts:   "Alerts",
  ai_chat:      "KI-Bewerbungsassistent",
  job_search:   "Jobsuche",
};

// ─── SVG bar chart hero ───────────────────────────────────────────────────────
/**
 * SVG horizontal bar chart hero section showing per-feature usage vs. limits.
 * @param {object} props
 * @param {Array<{feature: string, used: number, limit: number}>} props.usage
 */
function UsageHeroChart({ usage }) {
  const items = usage.filter((u) => u.limit > 0 && u.limit !== -1);
  if (!items.length) return null;

  const vw = 560, vh = 180;
  const padL = 30, padR = 12, padT = 20, padB = 44;
  const chartW = vw - padL - padR;
  const chartH = vh - padT - padB;
  const n = items.length;
  const step = chartW / n;
  const barW = Math.min(44, step * 0.48);

  return (
    <div className="rounded-xl border border-[#1C2333] bg-[#0D1117] px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {/* Dashed grid lines */}
        {[25, 50, 75, 100].map((pct) => {
          const y = padT + chartH * (1 - pct / 100);
          return (
            <g key={pct}>
              <line x1={padL} x2={vw - padR} y1={y} y2={y} stroke="#1f2937" strokeWidth="1" strokeDasharray="3 4" />
              <text x={padL - 5} y={y + 3} textAnchor="end" fontSize="8" fill="#64748b">{pct}%</text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={padL} x2={vw - padR} y1={padT + chartH} y2={padT + chartH} stroke="#1f2937" strokeWidth="1" />

        {/* Bars */}
        {items.map((item, i) => {
          const { pct, unlimited } = getUsageBarState(item.feature, item.used, item.limit);
          const isAtLimit = !unlimited && pct >= 100;
          const isWarn    = !unlimited && pct >= 80 && !isAtLimit;
          const fillPct   = Math.min(100, pct);
          const barH      = (fillPct / 100) * chartH;
          const cx        = padL + step * i + step / 2;
          const x         = cx - barW / 2;
          const barY      = padT + chartH - barH;
          const gradId    = `hg-${item.feature}`;

          const c1 = isAtLimit ? "#fcd34d" : isWarn ? "#93c5fd" : "#93c5fd";
          const c2 = isAtLimit ? "#f59e0b" : isWarn ? "#3b82f6" : "#3b82f6";
          const valColor = isAtLimit ? "#fbbf24" : isWarn ? "#60a5fa" : "#60a5fa";
          const shortLabel = FEATURE_SHORT[item.feature] || item.feature;
          const labelY = padT + chartH + 14;

          return (
            <g key={item.feature}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
              {/* Track */}
              <rect x={x} y={padT} width={barW} height={chartH} rx="6" fill="#111827" />
              {/* Fill */}
              {!unlimited && barH > 1 && (
                <rect x={x} y={barY} width={barW} height={barH} rx="6" fill={`url(#${gradId})`} />
              )}
              {unlimited && (
                <rect x={x} y={padT} width={barW} height={chartH} rx="6" fill={`url(#${gradId})`} opacity="0.22" />
              )}
              {/* Value + limit on same baseline */}
              <text
                x={cx} y={Math.max(padT + 13, barY - 4)}
                textAnchor="middle" fontSize="9" fontWeight="700" fill={isAtLimit ? "#111827" : valColor}
              >
                {unlimited ? "∞" : `${item.used} / ${item.limit}`}
              </text>
              {/* Feature label */}
              <text x={cx} y={labelY} textAnchor="middle" fontSize="9" fill="#94a3b8">{shortLabel}</text>
              {/* Limit reached indicator — only shown at 100% */}
              {isAtLimit && (
                <text x={cx} y={labelY + 13} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fbbf24">
                  Aktion nötig
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Slim usage detail row ────────────────────────────────────────────────────
/**
 * Single slim usage row with a labelled progress bar used inside the billing overview.
 * @param {object} props
 * @param {string} props.feature
 * @param {number} props.used
 * @param {number} props.limit
 */
function UsageRow({ feature, used, limit }) {
  const { label, unlimited, pct, displayLimit } = getUsageBarState(feature, used, limit);
  const isAtLimit = !unlimited && pct >= 100;
  const isWarn    = !unlimited && pct >= 80 && !isAtLimit;

  const barGradient = isAtLimit
    ? "linear-gradient(90deg,#fcd34d,#f59e0b)"
    : isWarn
    ? "linear-gradient(90deg,#93c5fd,#3b82f6)"
    : "linear-gradient(90deg,#60a5fa,#3b82f6)";

  // Soft, neutral badges — color + label reflect usage level
  const badgeText = unlimited ? "Unbegrenzt" : isAtLimit ? "Voll" : isWarn ? "Fast voll" : pct < 60 ? "Optimal" : `${Math.round(pct)}%`;
  const badgeCls  = isAtLimit
    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
    : isWarn
    ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
    : pct < 60
    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
    : "bg-[#111827] text-slate-300 border border-[#1C2333]";

  const shortName = label.split(" (")[0];

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 sm:w-44 flex-shrink-0 truncate text-xs text-slate-300">{shortName}</span>
      <div className="relative flex-1 h-2.5 rounded-full bg-[#111827] overflow-hidden border border-[#1C2333]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: unlimited ? "100%" : `${Math.min(100, pct)}%`,
            background: unlimited ? "linear-gradient(90deg,#c7d2fe,#818cf8)" : barGradient,
            opacity: unlimited ? 0.35 : 1,
            boxShadow: unlimited ? "none" : "0 0 12px rgba(59,130,246,0.28)",
          }}
        />
      </div>
      <span className="w-14 flex-shrink-0 text-right text-[10px] tabular-nums text-slate-400">
        {unlimited ? "∞" : `${used} / ${displayLimit}`}
      </span>
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeCls}`}>
        {badgeText}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
/** Billing & subscription overview: plan card, usage chart, payment method, and invoice history. */
export default function BillingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    let didToast = false;
    if (params.get("success") === "true") {
      toast.success("Upgrade erfolgreich! Willkommen bei deinem neuen Plan.");
      didToast = true;
    }
    if (params.get("canceled") === "true") {
      toast("Checkout abgebrochen.");
      didToast = true;
    }
    if (didToast) {
      const cleanUrl = getCleanBillingUrl(window.location.pathname, window.location.hash);
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview().then((r) => {
      try { localStorage.setItem("billing", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("billing");
        return saved ? JSON.parse(saved) : undefined;
      } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const { data: initData } = useQuery({ queryKey: ["init"] });

  const handleManage = async () => {
    try {
      const res = await billingApi.createPortal();
      window.location.href = res.data.portal_url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Öffnen der Abonnement-Verwaltung"));
    }
  };

  if (isLoading && !initData) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <div className="mb-2 h-7 w-40 animate-pulse rounded bg-[#1f2937]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[#1a2235]" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  const sub      = data?.subscription;
  const usage    = initData?.usage || data?.usage || [];
  const planKey  = sub?.plan || initData?.plan || "basic";
  const planName = getPlanName(planKey);
  const isPaid   = planKey && planKey !== "basic";
  const isMax    = planKey === "max" || planKey === "enterprise";

  const currentPlan = PLANS.find((p) => p.key === planKey) || PLANS[0];

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Overall usage health: average pct across limited features
  const limitedItems = usage.filter((u) => u.limit > 0 && u.limit !== -1);
  const avgUsagePct  = limitedItems.length
    ? Math.round(limitedItems.reduce((s, u) => s + Math.min(100, (u.used / u.limit) * 100), 0) / limitedItems.length)
    : 0;
  const healthColor  = avgUsagePct >= 80 ? "text-amber-300" : avgUsagePct >= 60 ? "text-blue-300" : "text-emerald-300";
  const healthLabel  = avgUsagePct >= 80 ? "Aktion nötig" : avgUsagePct >= 60 ? "Hohe Nutzung" : "Optimal";
  const _comparisonRows = [
    { row: "Lebenslauf-Analysen / Monat", vals: ["5", "15", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Motivationsschreiben / Monat", vals: ["5", "25", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Aktive Job-Alerts", vals: ["2", "10", "Unbegrenzt", "Unbegrenzt"] },
    { row: "KI-Bewerbungsassistent / Monat", vals: ["15", "200", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Jobsuche / Tag", vals: ["5", "20", "Unbegrenzt", "Unbegrenzt"] },
  ];

  return (
    <div className={`space-y-8 animate-slide-up ${!isMax ? "pb-20 sm:pb-0" : ""}`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Konto"
        title="Abrechnung"
        description="Verwalte deinen Plan, deine Nutzung und den Ausbau deiner KI-Leistung."
      />

      {/* ── Plan hero card ───────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(91,79,232,0.10),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.55)_0%,rgba(0,0,0,0.55)_100%)] p-5 sm:p-6 backdrop-blur-sm ${currentPlan.borderCls}`}>
        {/* Gradient glow */}
        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${currentPlan.iconCls} opacity-10 blur-3xl`} />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentPlan.iconCls} shadow-md`}>
              <currentPlan.Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aktiver Plan</p>
              <h2 className="mt-0.5 text-2xl sm:text-3xl font-bold text-white">{planName}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isPaid && periodEnd
                  ? `Verlängert automatisch am ${periodEnd}`
                  : "Kostenloses Konto mit sicherem Einstieg. Keine Karte erforderlich."}
              </p>
              {usage.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Gesamtnutzung:</span>
                  <span className={`text-sm font-bold ${healthColor}`}>{avgUsagePct}% — {healthLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {isPaid && (
              <button
                onClick={handleManage}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1C2333] bg-[#111827] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-[#0f172a] whitespace-normal sm:whitespace-nowrap text-center leading-snug"
              >
                <ExternalLink className="h-4 w-4" />
                Abo verwalten
              </button>
            )}
            {!isMax && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500 hover:shadow-xl hover:shadow-brand-500/40 whitespace-normal sm:whitespace-nowrap text-center leading-snug"
              >
                <Zap className="h-4 w-4" />
                {planKey === "pro" ? "Auf Max upgraden" : "Auf Pro upgraden"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {isPaid && sub?.last4 && (
              <div className="flex items-center gap-2 rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2">
                <CreditCard className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">•••• {sub.last4}</span>
                <button onClick={handleManage} className="text-xs font-semibold text-brand-300 hover:text-brand-200 ml-1">Ändern</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Usage: donut gauges ───────────────────────────────────────────────── */}
      {usage.length > 0 && (
        <div className="rounded-2xl border border-[#1C2333] bg-[#0D1117]/60 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.28)] overflow-hidden">
          {/* Section header with health bar */}
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[#1C2333]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Deine Nutzung</h3>
                <p className="mt-0.5 text-xs text-slate-400">Verbrauch im aktuellen Abrechnungszeitraum</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                  avgUsagePct >= 80 ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" :
                  avgUsagePct >= 60 ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" :
                  "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                }`}>
                  {healthLabel}
                </span>
                <span className="text-[10px] text-slate-400">{avgUsagePct}% belegt</span>
              </div>
            </div>
            {/* Overall health bar */}
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#111827] border border-[#1C2333]">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${avgUsagePct}%`,
                  background: avgUsagePct >= 80
                    ? "linear-gradient(90deg,#fcd34d,#f59e0b)"
                    : avgUsagePct >= 60
                    ? "linear-gradient(90deg,#93c5fd,#3b82f6)"
                    : "linear-gradient(90deg,#6ee7b7,#10b981)",
                  boxShadow: avgUsagePct >= 60 ? "0 0 16px rgba(59,130,246,0.24)" : "0 0 16px rgba(16,185,129,0.18)",
                }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
          {/* Hero bar chart — scrollable on mobile so SVG renders at native size */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[420px] sm:min-w-[560px]">
              <UsageHeroChart usage={usage} />
            </div>
          </div>

          {/* Slim detail rows */}
          <div className="mt-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detail-Übersicht</p>
            {usage.map((item) => (
              <UsageRow key={item.feature} {...item} />
            ))}
          </div>

          {!isMax && (
            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-brand-500/10 border border-brand-500/20 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Rocket className="h-4 w-4 text-brand-300 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-brand-100 font-medium">
                  Upgrade für mehr Kapazität und unbegrenzte KI-Nutzung.
                </p>
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="flex-shrink-0 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500"
              >
                Mehr erfahren
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── Bottom: payment method only ───────────────────────────────── */}
      {/* `sub?.last4` guard avoids a crash for paid users whose Stripe
          payment-method metadata has not yet been hydrated (e.g. right after
          a fresh checkout, or a temporary Stripe outage). */}
      {isPaid && sub?.last4 && (
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-[#1C2333] bg-[#0D1117] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-bold text-white">Zahlungsmethode</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1C2333] bg-[#111827] px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border border-[#273244] bg-black px-2 py-1 text-[10px] font-bold text-slate-300 tracking-wider">VISA</span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">•••• •••• •••• {sub.last4}</p>
                  <p className="text-[11px] text-slate-400">Standardzahlungsmethode</p>
                </div>
              </div>
              <button onClick={handleManage} className="text-xs font-semibold text-brand-300 hover:text-brand-200 transition-colors">
                Bearbeiten
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Payment method */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-100">Zahlungsmethode</p>
          </div>
          {isPaid && sub?.last4 ? (
            <div className="flex items-center justify-between rounded-xl border border-[#1f2937] bg-[#050608] px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border border-[#1f2937] bg-[#08090c] px-2 py-1 text-[10px] font-bold text-slate-400 tracking-wider">VISA</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">•••• •••• •••• {sub.last4}</p>
                  <p className="text-[11px] text-slate-400">Standardzahlungsmethode</p>
                </div>
              </div>
              <button onClick={handleManage} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Bearbeiten
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#1f2937] bg-[#050608] px-4 py-4">
              <CreditCard className="h-5 w-5 text-slate-300" />
              <div>
                <p className="text-sm font-medium text-slate-500">Keine Zahlungsmethode</p>
                <p className="text-xs text-slate-400">Kostenloser Plan — keine Karte erforderlich.</p>
              </div>
            </div>
          )}
        </div>

        {/* Billing summary */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-100">Zusammenfassung</p>
          </div>
          <dl className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-semibold text-slate-100">{planName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd className={`font-semibold ${isPaid ? "text-emerald-400" : "text-slate-500"}`}>
                {isPaid ? "Aktiv" : "Kostenlos"}
              </dd>
            </div>
            {periodEnd && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Nächste Verlängerung</dt>
                <dd className="font-semibold text-slate-100">{periodEnd}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Monatlicher Betrag</dt>
              <dd className="font-semibold text-slate-100">
                {PLANS.find((p) => p.key === planKey)?.price || "0"}{" "}
                <span className="font-normal text-slate-400">{isPaid ? "/ Monat" : ""}</span>
              </dd>
            </div>
          </dl>
          {isPaid && (
            <button
              onClick={handleManage}
              className="mt-4 btn-secondary w-full justify-center"
            >
              <ExternalLink className="h-4 w-4" />
              Rechnungen & Verlauf
            </button>
          )}
        </div>
      </div>

      {/* Sticky upgrade footer — mobile only */}
      {!isMax && (
        <div className="sm:hidden fixed left-0 right-0 z-30 bg-black/95 backdrop-blur-sm border-t border-[#1C2333] px-3 py-2.5 shadow-lg" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => navigate("/pricing")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500 hover:shadow-xl hover:shadow-brand-500/40 min-h-[44px]"
          >
            <Zap className="h-4 w-4" />
            Jetzt auf Pro upgraden
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
