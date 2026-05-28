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
import { getCvGenState } from "../cv/storage";

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
    borderCls: "border-white/10",
    badgeCls: "",
    btnStyle: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'var(--color-surface-input)', color: 'var(--color-ink-dim)', cursor: 'default' },
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
    iconCls: "",
    borderCls: "border-[var(--color-accent-500)]/40",
    glowStyle: { boxShadow: 'var(--shadow-glow-brand)' },
    badgeStyle: { background: 'var(--color-accent-500)', color: 'white' },
    btnStyle: { background: 'var(--color-accent-500)', color: 'white', boxShadow: 'var(--shadow-brand)' },
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
    iconCls: "",
    borderCls: "border-[var(--color-accent-500)]/40",
    glowStyle: { boxShadow: 'var(--shadow-glow-brand)' },
    badgeStyle: { background: 'var(--color-accent-500)', color: 'white' },
    btnStyle: { background: 'var(--color-accent-500)', color: 'white', boxShadow: 'var(--shadow-brand)' },
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
    borderCls: "border-white/10",
    badgeCls: "",
    btnStyle: { backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-ink-primary)', boxShadow: 'var(--shadow-tile)' },
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
  cv_pdf:       "Lebenslauf-PDF",
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

  const vw = 360, vh = 180;
  const padL = 28, padR = 8, padT = 14, padB = 42;
  const chartW = vw - padL - padR;
  const chartH = vh - padT - padB;
  const n = items.length;
  const step = chartW / n;
  const barW = Math.min(58, step * 0.72);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 220 }} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
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
          const isHigh    = !unlimited && pct >= 80 && !isAtLimit;
          const fillPct   = Math.min(100, pct);
          const barH      = (fillPct / 100) * chartH;
          const cx        = padL + step * i + step / 2;
          const x         = cx - barW / 2;
          const barY      = padT + chartH - barH;

          const fillColor = isAtLimit ? "#f87171" : isHigh ? "#fb923c" : "#7c7df0";
          const fillOpacity = 1;
          const valColor = "#fafafa";
          const shortLabel = FEATURE_SHORT[item.feature] || item.feature;
          const labelY = padT + chartH + 14;

          return (
            <g key={item.feature}>
              {/* Track */}
              <rect x={x} y={padT} width={barW} height={chartH} rx="6" fill="rgba(255,255,255,0.05)" />
              {/* Fill */}
              {!unlimited && barH > 1 && (
                <rect x={x} y={barY} width={barW} height={barH} rx="6" fill={fillColor} fillOpacity={fillOpacity} />
              )}
              {unlimited && (
                <rect x={x} y={padT} width={barW} height={chartH} rx="6" fill="#7c7df0" fillOpacity="0.25" />
              )}
              {/* Value + limit on same baseline */}
              <text
                x={cx} y={Math.max(padT + 14, barY - 5)}
                textAnchor="middle" fontSize="10" fontWeight="600" fill={valColor}
              >
                {unlimited ? "∞" : `${item.used}/${item.limit}`}
              </text>
              {/* Feature label */}
              <text x={cx} y={labelY} textAnchor="middle" fontSize="10" fill="#94a3b8">{shortLabel}</text>
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
function _UsageRow({ feature, used, limit }) {
  const { label, unlimited, pct, displayLimit } = getUsageBarState(feature, used, limit);
  const isAtLimit = !unlimited && pct >= 100;
  const isWarn    = !unlimited && pct >= 80 && !isAtLimit;

  const barGradient = isAtLimit
    ? "linear-gradient(90deg,#fcd34d,#f59e0b)"
    : isWarn
    ? "linear-gradient(90deg,#93c5fd,#3b82f6)"
    : "linear-gradient(90deg,#60a5fa,#3b82f6)";

  // Calm: state the fact, no value judgments. Color only signals limit reached.
  const badgeText = unlimited ? "Unbegrenzt" : isAtLimit ? "Limit erreicht" : `${Math.round(pct)}%`;
  const badgeCls  = isAtLimit
    ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/20"
    : "bg-[var(--color-bg-elev-1)] text-[var(--color-fg-muted)] border border-[var(--color-border)]";

  const shortName = label.split(" (")[0];

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 sm:w-44 flex-shrink-0 truncate text-xs text-[var(--color-fg-muted)]">{shortName}</span>
      <div className="relative flex-1 h-2.5 rounded-full bg-[var(--color-bg-elev-1)] overflow-hidden border border-[var(--color-border)]">
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
      <span className="w-14 flex-shrink-0 text-right text-[10px] tabular-nums text-[var(--color-fg-muted)]">
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
      toast.success("Plan aktiviert. Willkommen.");
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

  const { data: initData } = useQuery({ queryKey: ["init"], enabled: false });

  const handleManage = async () => {
    try {
      const res = await billingApi.createPortal();
      window.location.href = res.data.portal_url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Abonnement-Verwaltung konnte nicht geöffnet werden"));
    }
  };

  if (isLoading && !initData) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <div className="mb-2 h-7 w-40 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
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
  const cvGenState = getCvGenState(planKey);

  const _currentPlan = PLANS.find((p) => p.key === planKey) || PLANS[0];

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Overall usage health: average pct across limited features
  const limitedItems = usage.filter((u) => u.limit > 0 && u.limit !== -1);
  const avgUsagePct  = limitedItems.length
    ? Math.round(limitedItems.reduce((s, u) => s + Math.min(100, (u.used / u.limit) * 100), 0) / limitedItems.length)
    : 0;
  const healthColor  = avgUsagePct >= 80 ? "text-[#ef4444]" : "text-[#7c7df0]";
  const healthBarColor = avgUsagePct >= 80 ? "#ef4444" : "#7c7df0";
  const healthLabel  = `${avgUsagePct}% belegt`;
  const _comparisonRows = [
    { row: "Lebenslauf-Analysen / Monat", vals: ["5", "15", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Motivationsschreiben / Monat", vals: ["5", "25", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Aktive Job-Alerts", vals: ["2", "10", "Unbegrenzt", "Unbegrenzt"] },
    { row: "KI-Bewerbungsassistent / Monat", vals: ["15", "200", "Unbegrenzt", "Unbegrenzt"] },
    { row: "Jobsuche / Tag", vals: ["5", "20", "Unbegrenzt", "Unbegrenzt"] },
  ];

  return (
    <div className={`space-y-5 animate-slide-up ${!isMax ? "pb-20 sm:pb-0" : ""}`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Abrechnung & Plan"
        description="Verwalte deinen Plan, deine Nutzung und den Ausbau deiner KI-Leistung."
      />

      {/* ── Plan hero card ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]/60 p-5 sm:p-6">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] text-[var(--color-fg-dim)]">Aktiver Plan</p>
            <h2
              className="mt-1 text-[28px] sm:text-[34px] font-semibold tracking-tight text-[var(--color-fg)] leading-none"
              style={{ letterSpacing: "-0.025em" }}
            >{planName}</h2>
            <p className="mt-3 text-[13.5px] text-[var(--color-fg-muted)]">
              {isPaid && periodEnd
                ? `Verlängert automatisch am ${periodEnd}`
                : "Kostenloses Konto mit sicherem Einstieg. Keine Karte erforderlich."}
            </p>
            {usage.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[12.5px] text-[var(--color-fg-dim)]">Gesamtnutzung</span>
                <span className={`text-[13px] font-semibold ${healthColor}`}>{healthLabel}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {isPaid && (
              <button
                onClick={handleManage}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-2.5 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-elev-1)] whitespace-normal sm:whitespace-nowrap text-center leading-snug"
              >
                <ExternalLink className="h-4 w-4" />
                Abo verwalten
              </button>
            )}
            {!isMax && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-400)] whitespace-normal sm:whitespace-nowrap text-center leading-snug"
              >
                <Zap className="h-4 w-4" />
                {planKey === "pro" ? "Auf Max upgraden" : "Auf Pro upgraden"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {isPaid && sub?.last4 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2">
                <CreditCard className="h-4 w-4 text-[var(--color-fg-muted)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-fg-muted)]">•••• {sub.last4}</span>
                <button onClick={handleManage} className="text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] ml-1 transition-colors">Ändern</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Usage: donut gauges ───────────────────────────────────────────────── */}
      {usage.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-input)]/60 backdrop-blur-sm shadow-[0_20px_60px_rgba(0,0,0,0.28)] overflow-hidden">
          {/* Section header with health bar */}
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Deine Nutzung</h3>
                <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">Verbrauch im aktuellen Abrechnungszeitraum</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`whitespace-nowrap text-xs font-semibold ${healthColor}`}>
                  {healthLabel}
                </span>
              </div>
            </div>
            {/* Overall progress bar — single neutral fg colour, opacity reflects intensity */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
              <div
                className="h-full rounded-full transition-[width] duration-1000"
                style={{ width: `${avgUsagePct}%`, backgroundColor: healthBarColor }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
          {/* Hero bar chart — includes locally-tracked cv_pdf */}
          <UsageHeroChart usage={[
            ...usage,
            { feature: "cv_pdf", used: cvGenState.count, limit: cvGenState.unlimited ? -1 : cvGenState.limit },
          ]} />

          {!isMax && (
            <div
              className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl px-5 py-4"
              style={{
                background: "linear-gradient(135deg, rgba(124,125,240,0.18) 0%, rgba(167,139,250,0.12) 100%)",
                border: "1px solid rgba(124,125,240,0.40)",
                boxShadow: "0 0 24px rgba(124,125,240,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center" style={{ background: "rgba(124,125,240,0.20)" }}>
                  <Rocket className="h-4 w-4 text-[var(--color-accent-300)]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-[var(--color-fg)]">Mehr aus JobAssist herausholen</p>
                  <p className="text-[12px] text-[var(--color-accent-300)]">Unbegrenzte KI-Nutzung, mehr Alerts und PDF-Exporte.</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="flex-shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: "var(--color-accent-500)", color: "#fff", boxShadow: "0 2px 12px rgba(124,125,240,0.35)" }}
              >
                Auf Pro upgraden →
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
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[var(--color-fg-muted)]" />
              <p className="text-sm font-bold text-white">Zahlungsmethode</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border border-[var(--color-border)] bg-black px-2 py-1 text-[10px] font-bold text-[var(--color-fg-muted)] tracking-wider">VISA</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-fg)]">•••• •••• •••• {sub.last4}</p>
                  <p className="text-[11px] text-[var(--color-fg-muted)]">Standardzahlungsmethode</p>
                </div>
              </div>
              <button onClick={handleManage} className="text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors">
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
            <CreditCard className="h-4 w-4 text-[var(--color-fg-muted)]" />
            <p className="text-sm font-bold text-[var(--color-fg)]">Zahlungsmethode</p>
          </div>
          {isPaid && sub?.last4 ? (
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 py-1 text-[10px] font-bold text-[var(--color-fg-muted)] tracking-wider">VISA</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-fg)]">•••• •••• •••• {sub.last4}</p>
                  <p className="text-[11px] text-[var(--color-fg-muted)]">Standardzahlungsmethode</p>
                </div>
              </div>
              <button onClick={handleManage} className="text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors">
                Bearbeiten
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
              <CreditCard className="h-5 w-5 text-[var(--color-fg-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-fg-dim)]">Keine Zahlungsmethode</p>
                <p className="text-xs text-[var(--color-fg-muted)]">Kostenloser Plan — keine Karte erforderlich.</p>
              </div>
            </div>
          )}
        </div>

        {/* Billing summary */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--color-fg-muted)]" />
            <p className="text-sm font-bold text-[var(--color-fg)]">Zusammenfassung</p>
          </div>
          <dl className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-fg-dim)]">Plan</dt>
              <dd className="font-semibold text-[var(--color-fg)]">{planName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-fg-dim)]">Status</dt>
              <dd className={`font-semibold ${isPaid ? "text-emerald-400" : "text-[var(--color-fg-dim)]"}`}>
                {isPaid ? "Aktiv" : "Kostenlos"}
              </dd>
            </div>
            {periodEnd && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-fg-dim)]">Nächste Verlängerung</dt>
                <dd className="font-semibold text-[var(--color-fg)]">{periodEnd}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-fg-dim)]">Monatlicher Betrag</dt>
              <dd className="font-semibold text-[var(--color-fg)]">
                {PLANS.find((p) => p.key === planKey)?.price || "0"}{" "}
                <span className="font-normal text-[var(--color-fg-muted)]">{isPaid ? "/ Monat" : ""}</span>
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

    </div>
  );
}
