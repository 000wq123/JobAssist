import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobApi, resumeApi, settingsApi, jobAlertsApi } from '../services/api';
import {
  Search,
  Sparkles,
  Mic,
  FileText,
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
  Plus,
  Bot,
  Bell,
  Briefcase,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  indigo:     '#5B4FE8',
  indigoMid:  '#7B72F0',
  indigoSoft: 'rgba(91,79,232,0.12)',
  indigoGlow: 'rgba(91,79,232,0.40)',

  emerald:     '#2DD4BF',
  emeraldSoft: 'rgba(45,212,191,0.10)',
  emeraldGlow: 'rgba(45,212,191,0.30)',

  violet:     '#8B5CF6',
  violetSoft: 'rgba(139,92,246,0.10)',
  violetGlow: 'rgba(139,92,246,0.40)',

  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.10)',

  // Zero / warning state
  warn:     '#F97316',
  warnGlow: 'rgba(249,115,22,0.35)',

  textPrimary: '#F0F0F5',
  textSub:     '#B0B0C0',  // was #999999 — improved WCAG contrast on dark bg
  textDim:     '#888898',  // was #666666 — improved WCAG contrast on dark bg
  textMeta:    '#555568',  // was #3A3A3A

  // Deep-black elevation system
  bgBase:    '#0A0A0A',
  bgWidget:  '#161616',
  bgCard:    '#1E1E1E',
  bgElevated:'#252525',
};

// Widget shadow — heavier depth, no border
const CARD_SHADOW = `0 8px 40px rgba(0,0,0,0.70), 0 2px 8px rgba(0,0,0,0.50)`;

// ─── Widget (elevation-based, no hard border) ──────────────────────────────────
function Widget({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: C.bgWidget, boxShadow: CARD_SHADOW, ...style }}
    >
      {children}
    </div>
  );
}

// ─── Label ─────────────────────────────────────────────────────────────────────
/**
 * Section label rendered in the dashboard. Supports an optional `tooltip` that
 * is attached as a native `title` attribute (and as `aria-label` for SR users).
 * @param {{children: React.ReactNode, className?: string, tooltip?: string}} props
 */
function Label({ children, className = '', tooltip }) {
  return (
    <span
      className={`block text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8888A0] ${className}`}
      title={tooltip || undefined}
      aria-label={tooltip || undefined}
    >
      {children}
    </span>
  );
}

// ─── GlowIcon ──────────────────────────────────────────────────────────────────
function GlowIcon({ icon: Icon, glowColor = C.indigoSoft, iconColor = C.textPrimary, size = 30, iconSize = 13 }) {
  return (
    <div
      className="grid place-items-center rounded-xl flex-shrink-0"
      style={{
        width: size, height: size,
        background: glowColor,
        boxShadow: `0 0 18px ${glowColor}`,
      }}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={1.7} />
    </div>
  );
}

// ─── Next-Step Hero ───────────────────────────────────────────────────────────
// Action-first onboarding card shown above the KPI bar until all setup steps
// are completed. Highlights the single most important next action and shows
// progress on the remaining setup checklist.
/**
 * @param {object} props
 * @param {{ id: string, label: string, icon: Function, glow: string, iconColor: string, cta: string, headline: string, sub: string, path: string }} props.next - The current next step.
 * @param {Array<{ id: string, label: string, done: boolean }>} props.steps - All setup steps with completion state.
 * @param {(path: string) => void} props.onNavigate - Router navigate function.
 */
function NextStepHero({ next, steps, onNavigate }) {
  const doneCount = steps.filter(s => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const NextIcon = next.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${C.bgWidget} 0%, #0e0e10 100%)`,
        boxShadow: `0 0 60px ${next.glow}, 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 ${next.glow}`,
        border: `1px solid ${next.glow}`,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 sm:p-6">
        {/* Left: Headline + CTA */}
        <div className="md:col-span-8 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: next.iconColor }}>
              Nächster Schritt
            </span>
            <span className="text-[10px]" style={{ color: C.textMeta }}>
              · {doneCount}/{steps.length} erledigt
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="grid place-items-center rounded-xl flex-shrink-0"
              style={{
                width: 44, height: 44,
                background: next.glow,
                boxShadow: `0 0 24px ${next.glow}`,
              }}
            >
              <NextIcon size={20} color={next.iconColor} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] sm:text-[20px] font-semibold leading-tight text-white" style={{ letterSpacing: '-0.02em' }}>
                {next.headline}
              </h2>
              <p className="mt-1 text-[12px] sm:text-[13px] leading-relaxed" style={{ color: C.textSub }}>
                {next.sub}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate(next.path)}
            aria-label={next.cta}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-[13px] text-white transition-all active:scale-[0.98] w-full sm:w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            style={{
              background: `linear-gradient(135deg, ${next.iconColor} 0%, ${C.indigo} 100%)`,
              boxShadow: `0 4px 22px ${next.glow}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {next.cta} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Right: Progress checklist */}
        <div className="md:col-span-4 flex flex-col gap-2 md:border-l md:pl-5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <Label>Einrichtung</Label>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textPrimary }}>
              {progress}%
            </span>
          </div>
          <div className="h-[6px] w-full rounded-full overflow-hidden" style={{ background: C.bgElevated }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${C.emerald}BB, ${C.emerald})`,
                boxShadow: `0 0 10px ${C.emeraldGlow}`,
              }}
            />
          </div>
          <ul className="mt-1 flex flex-col gap-1.5">
            {steps.map(s => (
              <li key={s.id} className="flex items-center gap-2 text-[11.5px]">
                {s.done ? (
                  <CheckCircle2 size={13} strokeWidth={2} style={{ color: C.emerald, flexShrink: 0 }} />
                ) : (
                  <span
                    className="block rounded-full flex-shrink-0"
                    style={{ width: 11, height: 11, border: `1.5px solid ${s.id === next.id ? next.iconColor : 'rgba(255,255,255,0.18)'}` }}
                  />
                )}
                <span style={{ color: s.done ? C.textSub : s.id === next.id ? C.textPrimary : C.textDim }}>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Chart ────────────────────────────────────────────────────────────
function ActivityChart({ data }) {
  const W = 676;
  const H = 120;
  const padT = 12;
  const padB = 6;
  const padL = 8;
  const padR = 8;
  const avail = H - padT - padB;
  const max = Math.max(...data.map(d => d.val), 1);
  const n = data.length;

  const pts = data.map((d, i) => ({
    x: parseFloat((padL + (i / (n - 1)) * (W - padL - padR)).toFixed(2)),
    y: parseFloat((H - padB - (d.val / max) * avail).toFixed(2)),
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(2);
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="chartClip2">
          <rect x={-padL} y="0" width={W + padL + padR} height={H} />
        </clipPath>
        <filter id="lineGlow2" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComponentTransfer in="blur" result="blurFast">
            <feFuncA type="gamma" amplitude="1" exponent="2.5" offset="0" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="blurFast" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nodeGlow2" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feComponentTransfer in="blur" result="blurFast">
            <feFuncA type="gamma" amplitude="1" exponent="2" offset="0" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="blurFast" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g clipPath="url(#chartClip2)">
        <path d={linePath} fill="none" stroke={C.indigo} strokeWidth="1.4" filter="url(#lineGlow2)" />
        <path d={linePath} fill="none" stroke="#D1C4FF" strokeWidth="1" opacity="0.85" />
        {pts.map((p, i) =>
          data[i].val > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r="2.8" fill="#D1C4FF" filter="url(#nodeGlow2)" />
          ) : null
        )}
      </g>
    </svg>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobApi.list().then(r => r.data?.items ?? r.data ?? []),
    staleTime: 1000 * 60 * 2,
    initialData: () => { try { const r = localStorage.getItem('jobs'); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
    initialDataUpdatedAt: 0,
  });
  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumeApi.list().then(r => r.data),
    staleTime: 1000 * 60 * 2,
    initialData: () => { try { const r = localStorage.getItem('dashboard_resumes'); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
    initialDataUpdatedAt: 0,
  });
  useEffect(() => { try { localStorage.setItem('dashboard_resumes', JSON.stringify(resumes)); } catch {} }, [resumes]);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => settingsApi.getProfile().then(r => r.data),
    staleTime: 1000 * 60 * 2,
    initialData: () => { try { const r = localStorage.getItem('profile'); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
    initialDataUpdatedAt: 0,
  });
  const { data: jobAlertsData } = useQuery({
    queryKey: ['job-alerts'],
    queryFn: () => jobAlertsApi.list().then(r => {
      try { localStorage.setItem('job_alerts', JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try {
        const raw = localStorage.getItem('job_alerts');
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? { alerts: parsed } : parsed;
      } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });
  const jobAlerts = jobAlertsData?.alerts ?? [];

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const analyzed          = jobs.filter(j => j.match_score != null).length;
  const total             = jobs.length;
  const appliedStatuses   = ['applied', 'interviewing', 'offered', 'rejected'];
  const appliedCount      = jobs.filter(j => appliedStatuses.includes(j.status)).length;
  const interviewingCount = jobs.filter(j => ['interviewing', 'offered'].includes(j.status)).length;
  const topMatches        = jobs.filter(j => j.match_score != null && j.match_score >= 70).length;
  const hasResume         = resumes.length > 0;

  // Current-week activity
  const today  = new Date();
  const dow    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const dailyActivity = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => {
    const from  = new Date(monday); from.setDate(monday.getDate() + i);
    const to    = new Date(from);   to.setDate(from.getDate() + 1);
    const count = jobs.filter(j => {
      if (!j.created_at) return false;
      const d = new Date(j.created_at);
      return d >= from && d < to;
    }).length;
    return { day, val: Math.min(count, 3), max: 3, label: count > 0 ? `${count} Job${count !== 1 ? 's' : ''}` : '—' };
  });
  const weekTotal   = dailyActivity.reduce((s, d) => s + d.val, 0);
  const accountWeek = profile?.created_at
    ? Math.max(1, Math.ceil((today - new Date(profile.created_at)) / (7 * 24 * 60 * 60 * 1000)))
    : null;
  const todayIdx       = dow === 0 ? 6 : dow - 1;
  const todayCount     = dailyActivity[todayIdx]?.val ?? 0;
  const dailyGoalFilled = Math.min(todayCount, 3);

  // ─── Real, defensible KPIs (no vanity scores) ──────────────────────────────
  // 1) Average match score across analyzed jobs — actionable, derived from real LLM output.
  const avgMatchScore = analyzed > 0
    ? Math.round(jobs.filter(j => j.match_score != null).reduce((s, j) => s + j.match_score, 0) / analyzed)
    : 0;
  const prevAvgMatchScore = analyzed > 1
    ? Math.round(jobs.filter(j => j.match_score != null).slice(0, -1).reduce((s, j) => s + j.match_score, 0) / (analyzed - 1))
    : 0;
  const matchDelta = analyzed > 1 ? avgMatchScore - prevAvgMatchScore : 0;

  // 2) Response rate — the most important job-search metric: % of applications that got any reply.
  //    We count anything past "Beworben" (interview / offer / rejection) as a response.
  const rejectedCount   = jobs.filter(j => j.status === 'rejected').length;
  const respondedCount  = interviewingCount + rejectedCount;
  const responseRate    = appliedCount > 0 ? Math.round((respondedCount / appliedCount) * 100) : 0;

  // ─── Funnel — Analysiert → Beworben → Rücklauf → Interview ────────────────
  const analyzedBase    = analyzed || total;
  const applyRateFunnel = analyzedBase > 0 ? Math.round((appliedCount / analyzedBase) * 100) : 0;
  const interviewPct    = appliedCount > 0 ? Math.round((interviewingCount / appliedCount) * 100) : 0;
  const funnelStages = [
    { label: 'Analysiert', value: String(analyzedBase),                                 barWidth: 100,             color: C.textDim, glow: 'rgba(136,136,160,0.5)' },
    { label: 'Beworben',   value: `${appliedCount}/${analyzedBase}`,                    barWidth: applyRateFunnel, color: C.indigo,  glow: C.indigoGlow },
    { label: 'Rücklauf',   value: appliedCount > 0 ? `${responseRate}%` : '—',         barWidth: responseRate,    color: C.violet,  glow: C.violetGlow },
    { label: 'Interview',  value: String(interviewingCount),                            barWidth: interviewPct,    color: C.amber,   glow: 'rgba(245,158,11,0.35)', note: interviewingCount > 0 ? 'Aktiv' : undefined },
  ];

  const hasJobAlert = jobAlerts.length > 0;
  // (Profile-strength badge was retired — it always showed 100% once setup was complete and added no value.)

  // Weekly progress chips (factual counts, not arbitrary "missions")
  const weeklyGoals = [
    { label: `${analyzed} Stellen analysiert`,   complete: analyzed >= 5,     icon: Search     },
    { label: `${topMatches} Top-Treffer (≥70%)`, complete: topMatches > 0,    icon: TrendingUp },
    { label: `${appliedCount} Bewerbungen`,      complete: appliedCount >= 3, icon: Sparkles   },
  ];

  // ─── Action-first onboarding — pick the single most important next step ───
  const setupSteps = [
    { id: 'resume',  label: 'Lebenslauf hochladen',     done: hasResume },
    { id: 'jobs',    label: 'Erste Stellen speichern',  done: total > 0 },
    { id: 'analyze', label: 'Match-Scores berechnen',   done: analyzed > 0 },
    { id: 'apply',   label: 'Erste Bewerbung starten',  done: appliedCount > 0 },
    { id: 'alert',   label: 'Job-Alert aktivieren',     done: hasJobAlert },
  ];
  const STEP_DETAILS = {
    resume: {
      icon: FileText, iconColor: C.indigo, glow: C.indigoSoft,
      headline: 'Lade deinen Lebenslauf hoch',
      sub: 'Damit die KI Match-Scores berechnen und passende Stellen vorschlagen kann.',
      cta: 'Jetzt hochladen', path: '/resume',
    },
    jobs: {
      icon: Search, iconColor: C.violet, glow: C.violetSoft,
      headline: 'Finde deine ersten Stellen',
      sub: 'Entdecke Jobs in ganz Österreich oder lass die KI passende Stellen für dich kuratieren.',
      cta: 'Stellen entdecken', path: '/jobs',
    },
    analyze: {
      icon: Sparkles, iconColor: C.violet, glow: C.violetSoft,
      headline: 'Berechne deinen Match-Score',
      sub: 'Sieh in Sekunden, wie gut du zu jeder gespeicherten Stelle passt.',
      cta: 'Match analysieren', path: '/jobs',
    },
    apply: {
      icon: Briefcase, iconColor: C.emerald, glow: C.emeraldSoft,
      headline: 'Starte deine erste Bewerbung',
      sub: 'Erstelle ein KI-Anschreiben und bereite dich auf das Gespräch vor — alles an einem Ort.',
      cta: 'Bewerbung vorbereiten', path: '/jobs',
    },
    alert: {
      icon: Bell, iconColor: C.amber, glow: C.amberSoft,
      headline: 'Aktiviere einen Job-Alert',
      sub: 'Bekomme täglich oder wöchentlich passende neue Stellen direkt per E-Mail.',
      cta: 'Alert einrichten', path: '/job-alerts',
    },
  };
  const nextStepId = setupSteps.find(s => !s.done)?.id;
  const nextStep = nextStepId ? { id: nextStepId, ...STEP_DETAILS[nextStepId] } : null;

  return (
    <div
      className="animate-slide-up flex flex-col gap-3"
      style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <h1 className="text-[20px] font-semibold tracking-tight leading-none text-[#EEEEF5]" style={{ letterSpacing: '-0.02em' }}>
          {nextStep ? 'Willkommen bei JobAssist' : 'JobAssist'}
        </h1>
        <p className="mt-0.5 text-[11px] font-medium tracking-[0.18em] uppercase text-[#8888A0]">
          {nextStep ? 'Erste Schritte' : 'Bewerbungsübersicht'}
        </p>
      </div>

      {/* ── Next-Step Hero (only while setup is incomplete) ─────────────────── */}
      {nextStep && (
        <NextStepHero next={nextStep} steps={setupSteps} onNavigate={navigate} />
      )}

      {/* ── KPI Bar — three honest metrics, no vanity scores ────────────────── */}
      <Widget className="px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y divide-white/[0.05] sm:divide-y-0 sm:divide-x">

          {/* Ø Match-Score — average LLM match across analyzed jobs */}
          <div className="pb-5 sm:pb-0 sm:pr-6">
            <Label className="mb-2" tooltip="Durchschnittlicher KI-Match-Score über alle analysierten Stellen.">
              Ø Match-Score
            </Label>
            <div className="flex items-baseline gap-1">
              <span
                className="text-[40px] font-bold leading-none tabular-nums"
                style={{ letterSpacing: '-0.05em', color: analyzed === 0 ? C.textDim : '#FFFFFF' }}
              >
                {analyzed === 0 ? '—' : avgMatchScore}
              </span>
              {analyzed > 0 && (
                <span className="text-[20px] font-medium leading-none" style={{ color: C.textDim }}>%</span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              {analyzed === 0 ? (
                <button
                  onClick={() => navigate('/jobs')}
                  className="text-[11px] transition-all active:scale-95"
                  style={{ color: C.violet, background: 'none', border: 'none', padding: 0 }}
                >
                  + Erste Analyse starten →
                </button>
              ) : (
                <>
                  {analyzed > 1 && (
                    <span className="text-[12px] font-semibold" style={{ color: matchDelta >= 0 ? C.emerald : C.amber }}>
                      {matchDelta >= 0 ? '▲' : '▼'} {Math.abs(matchDelta)}%
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: C.textMeta }}>
                    {topMatches} Top-Treffer · {analyzed} analysiert
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Rücklaufquote — response rate over applications */}
          <div className="py-5 sm:py-0 sm:px-6">
            <Label className="mb-2" tooltip="Anteil deiner Bewerbungen mit einer Rückmeldung (Interview, Angebot oder Absage).">
              Rücklaufquote
            </Label>
            <div className="flex items-baseline gap-1">
              <span
                className="text-[40px] font-bold leading-none tabular-nums"
                style={{ letterSpacing: '-0.05em', color: appliedCount === 0 ? C.textDim : '#FFFFFF' }}
              >
                {appliedCount === 0 ? '—' : responseRate}
              </span>
              {appliedCount > 0 && (
                <span className="text-[20px] font-medium leading-none" style={{ color: C.textDim }}>%</span>
              )}
            </div>
            <div className="mt-2.5">
              {appliedCount === 0 ? (
                <button
                  onClick={() => navigate('/jobs')}
                  className="text-[11px] transition-all active:scale-95"
                  style={{ color: C.violet, background: 'none', border: 'none', padding: 0 }}
                >
                  + Bewerbungen erfassen →
                </button>
              ) : (
                <span className="text-[11px]" style={{ color: C.textMeta }}>
                  {respondedCount} von {appliedCount} Bewerbungen
                </span>
              )}
            </div>
          </div>

          {/* Aktiv im Prozess — open interviews + offers */}
          <div className="pt-5 sm:pt-0 sm:pl-6">
            <Label className="mb-2" tooltip="Stellen, bei denen du aktuell im Gespräch oder Angebotsprozess bist.">
              Aktiv im Prozess
            </Label>
            <div className="flex items-baseline gap-1">
              <span
                className="text-[40px] font-bold leading-none tabular-nums"
                style={{ letterSpacing: '-0.05em', color: interviewingCount === 0 ? C.textDim : '#FFFFFF' }}
              >
                {interviewingCount}
              </span>
            </div>
            <div className="mt-2.5">
              {interviewingCount === 0 ? (
                <span className="text-[11px]" style={{ color: C.textMeta }}>
                  Noch kein laufendes Gespräch
                </span>
              ) : (
                <button
                  onClick={() => navigate('/jobs')}
                  className="text-[11px] transition-all active:scale-95"
                  style={{ color: C.violet, background: 'none', border: 'none', padding: 0 }}
                >
                  Pipeline öffnen →
                </button>
              )}
            </div>
          </div>
        </div>
      </Widget>

      {/* ── Main Grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

        {/* ── LEFT COLUMN (8/12) ─────────────────────────────────────────────── */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-3">

          {/* Erfolgs-Pipeline — horizontal connected */}
          <Widget className="p-4">
            <Label className="mb-3">Erfolgs-Pipeline</Label>
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-1.5">
              {funnelStages.map((stage, i) => {
                const isFirstEmpty = i === 0 && analyzedBase === 0;
                const isOtherEmpty = i > 0 && stage.barWidth === 0;
                const isEmpty = isFirstEmpty || isOtherEmpty;
                const valueColor = stage.color === C.textDim ? C.textPrimary : stage.color;

                return (
                  <div key={stage.label} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div
                      className="flex-1 rounded-xl p-3 flex flex-col gap-2 min-h-[80px]"
                      style={{
                        background: isEmpty ? 'transparent' : C.bgCard,
                        border: isEmpty
                          ? `1px dashed rgba(255,255,255,0.08)`
                          : `1px solid rgba(255,255,255,0.04)`,
                      }}
                    >
                      <span
                        className="text-[10px] font-semibold tracking-[0.14em] uppercase"
                        style={{ color: isEmpty ? C.textDeep : stage.color }}
                      >
                        {stage.label}
                      </span>

                      {isEmpty ? (
                        <button
                          onClick={() => navigate('/jobs')}
                          className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] transition-all active:scale-95 mt-auto"
                          style={{ border: `1px solid rgba(255,255,255,0.09)`, color: C.textDim, background: C.bgElevated }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; e.currentTarget.style.color = C.textSub; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = C.textDim; }}
                        >
                          <Plus size={10} strokeWidth={2.5} /> Starten
                        </button>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="text-[24px] font-bold tabular-nums leading-none"
                              style={{ color: valueColor, letterSpacing: '-0.03em' }}
                            >
                              {stage.value}
                            </span>
                            {stage.note && (
                              <span className="text-[10px] font-semibold" style={{ color: stage.glow }}>
                                {stage.note}
                              </span>
                            )}
                          </div>
                          <div className="h-[10px] rounded-full overflow-hidden" style={{ background: C.bgElevated }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stage.barWidth}%`, background: stage.color, boxShadow: `0 0 6px ${stage.glow}` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {i < funnelStages.length - 1 && (
                      <span className="hidden sm:flex items-center flex-shrink-0">
                        <ChevronRight size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.12)' }} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Widget>

          {/* Aktivität — kompakt, sekundär */}
          <Widget className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Label>Aktivität</Label>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: C.textDim }}>
                  <span>
                    Heute:{' '}
                    <b className="font-semibold" style={{ color: C.textPrimary }}>{todayCount}</b>
                  </span>
                  <span style={{ color: C.textDeep }}>·</span>
                  <span>
                    Ziel:{' '}
                    <b className="font-semibold" style={{ color: dailyGoalFilled >= 3 ? C.emerald : C.textPrimary }}>
                      {dailyGoalFilled}/3
                    </b>
                  </span>
                </div>
              </div>
              {accountWeek && (
                <span className="text-[11px]" style={{ color: C.textDim }}>Woche {accountWeek}</span>
              )}
            </div>

            {/* Chart — reduzierte Höhe (sekundärer Wert) */}
            {weekTotal === 0 ? (
              <button
                onClick={() => navigate('/jobs')}
                className="flex w-full items-center justify-center gap-2 rounded-xl transition-colors hover:bg-white/[0.04]"
                style={{ height: '64px', background: C.bgCard, border: `1px dashed rgba(255,255,255,0.07)` }}
              >
                <Plus size={12} strokeWidth={2} style={{ color: C.textMeta }} />
                <span className="text-[11px]" style={{ color: C.textMeta }}>
                  Erste Stelle analysieren, um deine Aktivität hier zu sehen
                </span>
              </button>
            ) : (
              <div style={{ height: '90px', clipPath: 'inset(0)' }}>
                <ActivityChart data={dailyActivity} />
              </div>
            )}

            <div className="flex justify-between mt-2 px-0.5">
              {dailyActivity.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-[10px]"
                    style={{ color: d.val > 0 ? C.textSub : 'rgba(136,136,160,0.28)' }}
                  >
                    {d.day}
                  </span>
                  {d.val > 0 && (
                    <div className="w-1 h-1 rounded-full" style={{ background: C.indigo, opacity: 0.55 }} />
                  )}
                </div>
              ))}
            </div>
          </Widget>

          {/* Diese Woche — factual counters, not "missions" */}
          <Widget className="p-4">
            <Label className="mb-3">Diese Woche</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {weeklyGoals.map((goal) => (
                <div
                  key={goal.label}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-h-[44px]"
                  style={{
                    background: goal.complete
                      ? `linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(45,212,191,0.02) 100%)`
                      : C.bgCard,
                    border: goal.complete
                      ? `1px solid rgba(45,212,191,0.20)`
                      : `1px solid rgba(255,255,255,0.04)`,
                    boxShadow: goal.complete ? `0 0 18px rgba(45,212,191,0.07)` : 'none',
                  }}
                >
                  <GlowIcon
                    icon={goal.complete ? CheckCircle2 : goal.icon}
                    glowColor={goal.complete ? C.emeraldSoft : 'rgba(136,136,160,0.07)'}
                    iconColor={goal.complete ? C.emerald : C.textMeta}
                    size={28}
                    iconSize={12}
                  />
                  <span
                    className="text-[11px] font-medium flex-1 min-w-0"
                    style={{ color: goal.complete ? C.textSub : C.textDim }}
                  >
                    {goal.label}
                  </span>
                  {goal.complete && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: C.emerald, boxShadow: `0 0 8px ${C.emeraldGlow}` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Widget>
        </div>

        {/* ── RIGHT: KI CO-PILOT COMMAND PANEL (4/12) ──────────────────────── */}
        <div
          className="col-span-1 md:col-span-4 rounded-2xl flex flex-col gap-4 p-5"
          style={{
            background: C.bgWidget,
            boxShadow: `0 0 60px rgba(139,92,246,0.18), 0 8px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(139,92,246,0.14)`,
            border: `1px solid rgba(139,92,246,0.20)`,
          }}
        >
          {/* Panel Header */}
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center rounded-xl flex-shrink-0"
              style={{
                width: 38, height: 38,
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.28)',
                boxShadow: `0 0 18px rgba(139,92,246,0.22)`,
              }}
            >
              <Bot size={17} color={C.violet} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold text-[#EEEEF5]">KI Co-Pilot</span>
              <span className="block text-[11px]" style={{ color: C.textDim }}>Karriere-Assistent</span>
            </div>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: C.emerald, boxShadow: `0 0 8px ${C.emeraldGlow}` }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(139,92,246,0.12)' }} />

          {/* Quick Actions */}
          <div className="flex flex-col gap-1.5">
            <Label className="mb-1">Schnellaktionen</Label>
            {[
              { label: 'Lebenslauf verbessern',  icon: FileText,   color: C.indigo  },
              { label: 'Interview vorbereiten',   icon: Mic,        color: C.amber   },
              { label: 'Stärken analysieren',     icon: Sparkles,   color: C.violet  },
              { label: 'Strategie planen',        icon: TrendingUp, color: C.emerald },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate('/ai-assistant')}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-95"
                style={{ background: C.bgCard, border: `1px solid rgba(255,255,255,0.05)` }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${item.color}12`;
                  e.currentTarget.style.borderColor = `${item.color}28`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = C.bgCard;
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                <item.icon size={13} color={item.color} strokeWidth={1.8} />
                <span className="text-[12px] font-medium" style={{ color: C.textSub }}>{item.label}</span>
                <ChevronRight size={12} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>

          {/* Mini Stats */}
          <div
            className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
            style={{ background: C.bgCard, border: `1px solid rgba(255,255,255,0.04)` }}
          >
            {[
              { label: 'Jobs analysiert', value: analyzedBase, color: C.textPrimary },
              { label: 'Beworben',        value: appliedCount,      color: C.indigo      },
              { label: 'Top-Treffer',     value: topMatches,        color: C.emerald     },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: C.textDim }}>{stat.label}</span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: stat.color, letterSpacing: '-0.02em' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* CTA — "Jobs entdecken" */}
          <button
            onClick={() => navigate('/jobs')}
            className="mt-auto w-full rounded-xl py-3 px-4 font-semibold text-[13px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${C.violet} 0%, ${C.indigo} 100%)`,
              boxShadow: `0 4px 22px rgba(139,92,246,0.40)`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = `0 6px 30px rgba(139,92,246,0.55)`;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = `0 4px 22px rgba(139,92,246,0.40)`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Search size={14} strokeWidth={2} />
            Jobs entdecken
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>

      </div>
    </div>
  );
}
