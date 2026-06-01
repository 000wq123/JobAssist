import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Bookmark, FileText, Bell, SendHorizonal } from "lucide-react";
import { authApi, jobApi, resumeApi, jobAlertsApi } from "../services/api";
import { DARK as C } from "../utils/colors";

// ─── Constants ────────────────────────────────────────────────────────
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

const DAY = 86400 * 1000;

// Platform-wide benchmark shown alongside the user's numbers. Hardcoded
// for v1 — replace with real telemetry once backend tracking lands.
const BENCHMARK_RESPONSE_DAYS = 8;


/**
 * Context-aware greeting. Varies by last-visit gap, time of day, weekday,
 * and actual saved-job data (company names, scores).
 * @param {number} hour
 * @param {string} name
 * @param {{ weekday?: number, daysSinceVisit?: number, jobsCount?: number, bestBookmarked?: object|null }} ctx
 */
function pickGreeting(hour, name, { weekday = 0, daysSinceVisit = 0, jobsCount = 0, bestBookmarked = null } = {}) {
  const co = bestBookmarked?.company || null;
  const sc = bestBookmarked?.match_score ? Math.round(bestBookmarked.match_score) : null;

  // Long absence
  if (daysSinceVisit >= 7) {
    return name ? `${name} — lange nicht da.` : "Lange nicht mehr reingeschaut.";
  }
  if (daysSinceVisit >= 3) {
    const v = [
      "Wieder da.",
      co ? `${co} wartet noch auf dich.` : "Schön, dass du wieder reinschaust.",
      "Bereit weiterzumachen?",
    ];
    return name ? `Willkommen zurück, ${name}.` : v[weekday % v.length];
  }

  // Night
  if (hour >= 23 || hour < 5) {
    const v = [
      "Noch so spät hier.",
      "Spät noch aktiv.",
      co ? `${co} wartet noch.` : "Morgen weiter.",
      "Auch nachts dabei — gut so.",
    ];
    return v[(weekday + (jobsCount > 0 ? 1 : 0)) % v.length];
  }

  // Morning
  if (hour < 12) {
    const opts = [
      name ? `Guten Morgen, ${name}.` : "Guten Morgen.",
      "Früh dran — gut so.",
      name ? `Morgen, ${name}.` : "Guten Morgen.",
      jobsCount > 0 ? "Die Liste wartet." : "Bereit loszulegen?",
      co && sc ? `${co} — ${sc} % Passung. Jetzt bewerben?` : "Morgens bewerben ist effektiver.",
      co ? `${co} wartet auf deine Bewerbung.` : "Was steht heute an?",
      "Frischer Start — was machst du heute?",
      sc && sc >= 80 ? `${sc} % bei ${co || "einer Stelle"}. Noch nicht beworben?` : "Ein guter Start in den Tag.",
    ];
    return opts[(weekday + Math.min(jobsCount, 4)) % opts.length];
  }

  // Afternoon
  if (hour < 17) {
    const opts = [
      name ? `Hey, ${name}.` : "Kurz reingeschaut.",
      "Nachmittag — kurzer Überblick.",
      "Ein guter Moment für die Liste.",
      name ? `${name}, alles im Blick?` : "Alles im Blick?",
      co ? `${co} — hast du dich schon beworben?` : "Was hat sich getan?",
      co && sc ? `${sc} % bei ${co}. Noch nicht beworben?` : "Kurze Pause? Schau rein.",
      "Heute noch was erledigen?",
    ];
    return opts[(weekday + Math.min(jobsCount, 2)) % opts.length];
  }

  // Evening
  const opts = [
    name ? `Guten Abend, ${name}.` : "Guten Abend.",
    "Ende des Tages — was hat sich getan?",
    name ? `${name} — noch ein letzter Blick.` : "Noch ein kurzer Blick.",
    "Abends in Ruhe durchgehen.",
    co ? `${co} — heute noch entscheiden?` : "Gut gemacht heute.",
    co && sc ? `${co} wartet — ${sc} % Passung.` : "Abend. Noch schnell checken?",
    "Ende des Tages. Kurz durchgehen.",
  ];
  return opts[(weekday + Math.min(jobsCount, 3)) % opts.length];
}


/** "vor 2 Tagen", "vor 3 Std.", "gerade eben". Returns null for invalid. */
function relativeShort(when, now) {
  if (!when) return null;
  const ms = typeof when === "number" ? when : new Date(when).getTime();
  if (!Number.isFinite(ms)) return null;
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 5) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
  const w = Math.floor(d / 7);
  if (w < 5) return w === 1 ? "vor 1 Woche" : `vor ${w} Wochen`;
  return `vor ${Math.floor(d / 30)} Mon.`;
}

/**
 * Pick the hero serif sentence based on real signals + time-of-day.
 * Priority order is anxiety-aware: urgent calendar events first, then
 * encouragement, then calm fallbacks. Never generic if data exists.
 */
function pickHeroAnchor(ctx) {
  const { hasOffer, hasInterviewSoon, hasResume, hour, weekday, freshHighMatch, lastAppliedDays, jobsCount, name } = ctx;

  // ── Highest-signal events ──────────────────────────────────────
  if (hasOffer) {
    const variants = [
      "Ein Angebot ist reingekommen — sehr gut.",
      "Du hast ein Angebot. Lies es in Ruhe durch.",
      "Angebot da. Kein Druck — schau's dir an.",
    ];
    return variants[(weekday + hour) % variants.length];
  }
  if (hasInterviewSoon) {
    const co = hasInterviewSoon.company;
    return co ? `Gespräch bei ${co} steht an.` : "Ein Gespräch steht an — du bist vorbereitet.";
  }
  if (!hasResume) return "Leg los — dein nächster Job wartet auf dich.";

  // ── Night / very early ─────────────────────────────────────────
  if (hour >= 23 || hour < 5) {
    return ["Gute Nacht. Morgen weiter.", "Schlaf gut — wir sind morgen wieder da."][weekday % 2];
  }

  // ── Fresh matches ──────────────────────────────────────────────
  if (freshHighMatch >= 3) return `${freshHighMatch} neue Treffer warten auf dich.`;
  if (freshHighMatch === 2) return "Zwei neue Treffer — könnte sich lohnen.";
  if (freshHighMatch === 1) return "Ein neuer Treffer — schau kurz rein.";

  // ── Recent activity signals ────────────────────────────────────
  if (lastAppliedDays === 0) return "Bewerbung raus — jetzt abwarten.";
  if (lastAppliedDays === 1) return "Gestern beworben. Antworten kommen meist in 5–10 Tagen.";
  if (lastAppliedDays != null && lastAppliedDays <= 3) return "Gut gemacht. Gib dir und dem Unternehmen etwas Zeit.";
  if (lastAppliedDays != null && lastAppliedDays >= 14) return "Schon eine Weile nichts Neues — vielleicht Zeit für einen neuen Versuch.";
  if (lastAppliedDays != null && lastAppliedDays >= 7) return `Vor ${lastAppliedDays} Tagen beworben. Nachfragen ist nach 2 Wochen okay.`;

  // ── Morning ────────────────────────────────────────────────────
  if (hour < 10) {
    const mornings = [
      name ? `Guten Morgen, ${name}.` : "Guten Morgen.",
      "Morgens bewerben — viele Unternehmen lesen morgens.",
      "Frischer Start — was machst du heute?",
      name ? `Morgen, ${name}. Was kommt heute dran?` : "Was steht heute an?",
    ];
    return mornings[weekday % mornings.length];
  }

  // ── Afternoon ──────────────────────────────────────────────────
  if (hour >= 12 && hour < 17) {
    const afternoons = [
      "Nachmittag — kurz reinschauen schadet nie.",
      "Ein guter Moment, die Liste durchzugehen.",
      "Kurze Pause? Schau, ob was Neues da ist.",
      "Gut läuft's — bleib dran.",
    ];
    return afternoons[weekday % afternoons.length];
  }

  // ── Evening ────────────────────────────────────────────────────
  if (hour >= 17) {
    const evenings = [
      "Abends in Ruhe entscheiden — kein Stress.",
      "Guter Moment für einen ruhigen Überblick.",
      "Ende des Tages — was hat sich getan?",
      "Abend. Heute noch was erledigen?",
    ];
    return evenings[weekday % evenings.length];
  }

  // ── Day-of-week fallbacks ──────────────────────────────────────
  const dayFallbacks = [
    "Sonntag — kein Druck, trotzdem ein Blick.",
    "Neuer Start in die Woche.",
    "Dienstag — ruhige Zeit zum Bewerben.",
    "Mitte der Woche — wie läuft's?",
    "Donnerstag. Bewerbungen jetzt, Wochenende frei.",
    "Freitag — noch schnell etwas erledigen?",
    "Samstag. Kurz reinschauen, dann genießen.",
  ];
  if (jobsCount === 0) return "Bereit? Dein nächster Job ist einen Klick entfernt.";
  return dayFallbacks[weekday];
}

const STATUS_BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt",     match: (s) => !s || s === "bookmarked" },
  { key: "applied",      label: "Beworben",    match: (s) => s === "applied" },
  { key: "interviewing", label: "Gespräch",    match: (s) => s === "interviewing" },
  { key: "offered",      label: "Angebot",     match: (s) => s === "offered" },
  { key: "rejected",     label: "Erledigt",    match: (s) => s === "rejected" },
];

const DISMISSED_KEY = "heute_dismissed_v1";
const LAST_VISIT_KEY  = "ja:last_visit_ts";

function readDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}

const SERIF = '"Instrument Serif", ui-serif, Georgia, serif';

/**
 * DashboardPage — light, data-rich "Heute" overview.
 *
 * Four sections, in order:
 *   1. Hero (serif anchor + time-of-day greeting)
 *   2. Vorschläge — never empty, prioritized by urgency
 *   3. Deine Liste — 5-status strip with last-touched stamp
 *   4. Schnellzugriff widgets + Zuletzt aktiv list
 *
 * Surface colors are scoped here (NOT global). AppShell flips its right-column
 * background to {@link C.bg} for `/dashboard`; everything else stays dark.
 */
export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => {
      console.time("[perf] /jobs list");
      return jobApi.list(1, 100).then((r) => {
        console.timeEnd("[perf] /jobs list");
        const items = r.data?.items ?? r.data ?? [];
        try {
          localStorage.setItem("jobs", JSON.stringify(items));
          localStorage.setItem("jobs_ts", String(Date.now()));
        } catch { /* quota */ }
        return items;
      });
    },
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try {
        const r = localStorage.getItem("jobs");
        if (r) {
          console.log("[perf] jobs initialData from localStorage");
          return JSON.parse(r);
        }
      } catch {}
      return undefined;
    },
    initialDataUpdatedAt: () => {
      try { return parseInt(localStorage.getItem("jobs_ts") || "0", 10); } catch { return 0; }
    },
  });

  const { data: resumes = [], isLoading: resumesLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try { const r = localStorage.getItem("dashboard_resumes"); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });

  useEffect(() => {
    try { localStorage.setItem("dashboard_resumes", JSON.stringify(resumes)); } catch { /* quota */ }
  }, [resumes]);

  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authApi.me().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    initialData: () => {
      try { const r = localStorage.getItem("auth_me"); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });
  useEffect(() => {
    try { localStorage.setItem("auth_me", JSON.stringify(me)); } catch { /* quota */ }
  }, [me]);

  const { data: jobAlertsData } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () =>
      jobAlertsApi.list().then((r) => {
        try { localStorage.setItem("job_alerts", JSON.stringify(r.data)); } catch { /* quota */ }
        return r.data;
      }),
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try {
        const raw = localStorage.getItem("job_alerts");
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? { alerts: parsed } : parsed;
      } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });
  const jobAlerts = useMemo(() => jobAlertsData?.alerts ?? [], [jobAlertsData?.alerts]);

  // ─── Dismissed-suggestion persistence ───────────────────────────
  const [dismissed, setDismissed] = useState(readDismissed);
  useEffect(() => {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)); } catch { /* quota */ }
  }, [dismissed]);
  const dismiss = (id) => setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));

  // ─── Time anchor (stable per mount) ──────────────────────────────
  const [now] = useState(() => Date.now());
  const today = useMemo(() => new Date(now), [now]);
  const hour = today.getHours();
  const weekday = today.getDay();
  const hasResume = resumesLoading ? true : resumes.length > 0;
  const userName = me?.full_name?.split(" ")[0] || "";

  // Track last visit; compute gap once on mount.
  const daysSinceVisit = useMemo(() => {
    try {
      const last = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
      const gap  = last > 0 ? Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)) : 0;
      localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
      return gap;
    } catch { return 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Status counts ──────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_BUCKETS.forEach((b) => { counts[b.key] = jobs.filter((j) => b.match(j.status)).length; });
    return counts;
  }, [jobs]);

  // ─── Last-touched per bucket (for status strip) ─────────────────
  const lastTouched = useMemo(() => {
    const out = {};
    STATUS_BUCKETS.forEach((b) => {
      const inBucket = jobs.filter((j) => b.match(j.status));
      let max = 0;
      inBucket.forEach((j) => {
        const t = new Date(j.updated_at || j.created_at).getTime();
        if (Number.isFinite(t) && t > max) max = t;
      });
      out[b.key] = max || null;
    });
    return out;
  }, [jobs]);



  // ─── Nearest deadline within next 30 days ─────────────────────────
  const nextDeadline = useMemo(() => {
    const candidates = jobs
      .map((j) => {
        const raw = j.expires_at || j.deadline;
        if (!raw) return null;
        const t = new Date(raw).getTime();
        if (!Number.isFinite(t) || t < now) return null;
        if (t - now > 30 * DAY) return null;
        return { job: j, ms: t, days: Math.ceil((t - now) / DAY) };
      })
      .filter(Boolean)
      .sort((a, b) => a.ms - b.ms);
    return candidates[0] || null;
  }, [jobs, now]);

  // ─── Best bookmarked job for greeting ────────────────────────────
  const bestBookmarked = useMemo(() => {
    const candidates = jobs.filter((j) => (!j.status || j.status === "bookmarked") && j.match_score != null);
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => b.match_score - a.match_score)[0];
  }, [jobs]);

  // ─── Hero anchor signals ────────────────────────────────────────
  const freshHighMatch = useMemo(() => jobs.filter((j) => {
    if (j.match_score == null || j.match_score < 70) return false;
    if (!j.created_at) return false;
    return now - new Date(j.created_at).getTime() < 2 * DAY;
  }).length, [jobs, now]);

  const lastAppliedDays = useMemo(() => {
    const applied = jobs.filter((j) => j.status === "applied");
    if (applied.length === 0) return null;
    const latest = applied.reduce((m, j) => {
      const t = new Date(j.updated_at || j.created_at).getTime();
      return Number.isFinite(t) && t > m ? t : m;
    }, 0);
    return latest ? Math.floor((now - latest) / DAY) : null;
  }, [jobs, now]);

  const hasInterviewSoon = useMemo(() => {
    const interviewing = jobs.filter((j) => j.status === "interviewing");
    if (!interviewing.length) return null;
    return [...interviewing].sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )[0];
  }, [jobs]);

  const heroAnchor = pickHeroAnchor({
    hasOffer: statusCounts.offered > 0,
    hasInterviewSoon,
    hasResume,
    hour,
    weekday,
    freshHighMatch,
    lastAppliedDays,
    jobsCount: jobs.length,
    name: userName,
  });

  // ─── Suggestions ────────────────────────────────────────────────
  const suggestions = (() => {
    const out = [];

    // 0. Nearest deadline (HIGHEST URGENCY).
    if (nextDeadline && nextDeadline.days <= 7) {
      const { job, days } = nextDeadline;
      out.push({
        id: `deadline-${job.id}`,
        kind: "warn",
        eyebrow: "Frist",
        title: `${job.company || "Bewerbung"} — Frist läuft in ${days === 1 ? "1 Tag" : `${days} Tagen`} ab.`,
        body: job.role || job.title ? `${job.role || job.title}.` : "Bewerbung jetzt absenden.",
        primary: { label: "Stelle öffnen", onClick: () => navigate(`/jobs/${job.id}`) },
      });
    }

    // 1. No resume yet — foundational blocker.
    if (!hasResume) {
      out.push({
        id: "upload-resume",
        kind: "accent",
        eyebrow: "Lebenslauf",
        title: "Lade deinen Lebenslauf hoch.",
        body: "Damit die KI Matches berechnen und passende Stellen vorschlagen kann.",
        primary: { label: "Hochladen", onClick: () => navigate("/settings") },
      });
    }

    // 2. Stale "Beworben" — anxiety-reducing nudge with real baseline.
    const stale = jobs
      .filter((j) => j.status === "applied")
      .map((j) => {
        const stamp = new Date(j.updated_at || j.created_at);
        const ms = stamp.getTime();
        return { job: j, days: Number.isFinite(ms) ? Math.floor((now - ms) / DAY) : -1 };
      })
      .filter((x) => x.days >= 7)
      .sort((a, b) => b.days - a.days);
    if (stale.length >= 1) {
      const { job, days } = stale[0];
      out.push({
        id: `followup-${job.id}`,
        kind: "neutral",
        eyebrow: "Nachfragen",
        title: `${job.company || "Bewerbung"} — vor ${days} Tagen beworben.`,
        body: `Schnitt sind ${BENCHMARK_RESPONSE_DAYS} Tage. Eine kurze, freundliche Nachfrage ist okay.`,
        primary: { label: "Stelle öffnen", onClick: () => navigate(`/jobs/${job.id}`) },
      });
    }

    // 3. Decision overdue — bookmarked >= 14 days, untouched.
    const overdue = jobs.filter((j) => {
      if (j.status && j.status !== "bookmarked") return false;
      const t = new Date(j.updated_at || j.created_at).getTime();
      return Number.isFinite(t) && (now - t) > 14 * DAY;
    });
    if (overdue.length >= 3) {
      out.push({
        id: "decision-overdue",
        kind: "neutral",
        eyebrow: "Aufräumen",
        title: `${overdue.length} gemerkte Stellen warten auf eine Entscheidung.`,
        body: "Liegen seit über 14 Tagen unangetastet. Kurz durchsehen — bewerben oder weg?",
        primary: { label: "Durchgehen", onClick: () => navigate("/jobs") },
      });
    }

    // 4. Fresh strong matches in the last 48 h.
    if (freshHighMatch >= 1) {
      out.push({
        id: "fresh-matches",
        kind: "accent",
        eyebrow: "Neu",
        title: freshHighMatch === 1 ? "1 starker Treffer seit gestern." : `${freshHighMatch} starke Treffer seit gestern.`,
        body: "Über 70 % Match — schau sie dir an, solange sie aktuell sind.",
        primary: { label: "Ansehen", onClick: () => navigate("/jobs") },
      });
    }

    // 5. Has resume + jobs + no alerts → suggest alerts.
    if (hasResume && jobs.length >= 1 && jobAlerts.length === 0) {
      out.push({
        id: "create-alert",
        kind: "neutral",
        eyebrow: "Alerts",
        title: "Richte einen Alert ein.",
        body: "Bekomme neue passende Stellen automatisch per E-Mail.",
        primary: { label: "Alert anlegen", onClick: () => navigate("/job-alerts") },
      });
    }

    return out.filter((s) => !dismissed.includes(s.id)).slice(0, 2);
  })();


  const isEmpty = !jobsLoading && jobs.length === 0 && suggestions.length === 0;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-slide-up" style={{ color: C.ink }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header>
        <p className="text-[12px] tracking-[0.14em] uppercase font-semibold" style={{ color: C.inkDim }}>
          {WEEKDAYS[weekday]}, {today.getDate()}. {MONTHS[today.getMonth()]}
        </p>
        <h1
          className="mt-3 text-[44px] sm:text-[56px] lg:text-[64px] font-normal leading-[1.05]"
          style={{ fontFamily: SERIF, letterSpacing: "-0.025em", color: C.ink }}
        >
          {pickGreeting(hour, userName, { weekday, daysSinceVisit, jobsCount: jobs.length, bestBookmarked })}
        </h1>
      </header>

      {/* ── VORSCHLÄGE ────────────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: C.inkDim }}>
              Vorschläge
            </p>
            <p className="text-[11px] tabular-nums" style={{ color: C.inkDim }}>
              {suggestions.length} offen
            </p>
          </div>
          <div className="rounded-xl divide-y divide-[rgba(24,24,27,0.06)]" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
            {suggestions.map((s) => (
              <SuggestionRow key={s.id} suggestion={s} onDismiss={() => dismiss(s.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── DEINE LISTE (full width) ──────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: C.inkDim }}>Deine Liste</p>
          <button type="button" onClick={() => navigate("/jobs")} className="text-[12px] hover:underline" style={{ color: C.inkMuted }}>
            Alle ansehen →
          </button>
        </div>
        <div className="grid grid-cols-5 rounded-xl overflow-hidden overflow-x-auto" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
          {STATUS_BUCKETS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => navigate(`/jobs?status=${b.key}`)}
              className="px-3 py-4 sm:px-5 sm:py-5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <p
                className="text-[22px] sm:text-[28px] tabular-nums leading-none font-semibold"
                style={{ color: statusCounts[b.key] > 0 ? C.ink : C.inkMuted }}
              >
                {statusCounts[b.key] ?? 0}
              </p>
              <p className="mt-2 text-[10px] sm:text-[12px]" style={{ color: C.inkMuted }}>{b.label}</p>
              {lastTouched[b.key] && (
                <p className="hidden sm:block mt-0.5 text-[11px] tabular-nums truncate whitespace-nowrap" style={{ color: C.inkFaint }}>
                  {relativeShort(lastTouched[b.key], now)}
                </p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── WIDGETS (left) + ZULETZT AKTIV (right) ───────────────────────── */}
      {(jobs.length > 0 || jobsLoading) && (() => {
        // Deterministic daily shuffle: stable within a day, varied across days.
        const daySeed = today.getDate() + today.getMonth() * 31;
        const shuffle = (arr) => {
          const out = [...arr];
          let s = daySeed;
          for (let i = out.length - 1; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647; // LCG
            const j = s % (i + 1);
            [out[i], out[j]] = [out[j], out[i]];
          }
          return out;
        };
        const recent = shuffle(
          [...jobs].sort(
            (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
          )
        ).slice(0, 5);
        const STATUS_LABEL = { bookmarked: "Gemerkt", applied: "Beworben", interviewing: "Im Gespräch", offered: "Angebot", rejected: "Erledigt" };
        const STATUS_COLOR = { bookmarked: "#f59e0b", applied: C.accent, interviewing: "#60a5fa", offered: C.ok, rejected: C.warn };
        const active = (statusCounts.applied || 0) + (statusCounts.interviewing || 0);
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Widgets 2×2 */}
            <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col content-start">
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: C.inkDim }}>Schnellzugriff</p>
              </div>
            <div className="grid grid-cols-2 gap-4">

              {/* Noch bewerben */}
              <div className="rounded-xl p-4 sm:p-5 flex flex-col" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bookmark className="w-4 h-4 shrink-0" style={{ color: C.accent }} />
                  <p className="text-[11px] font-medium" style={{ color: C.inkDim }}>Noch bewerben</p>
                </div>
                {statusCounts.bookmarked > 0 ? (
                  <>
                    <p className="text-[26px] tabular-nums leading-none font-semibold" style={{ color: C.ink }}>{statusCounts.bookmarked}</p>
                    <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: C.inkMuted }}>{statusCounts.bookmarked === 1 ? "Stelle wartet" : "Stellen warten"} auf deine Bewerbung</p>
                    <button type="button" onClick={() => navigate("/jobs?status=bookmarked")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Jetzt bewerben →</button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] leading-snug" style={{ color: C.inkMuted }}>Keine gespeicherten Stellen ohne Bewerbung.</p>
                    <button type="button" onClick={() => navigate("/finden")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Stelle finden →</button>
                  </>
                )}
              </div>

              {/* Aktiv beworben */}
              <div className="rounded-xl p-4 sm:p-5 flex flex-col" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <SendHorizonal className="w-4 h-4 shrink-0" style={{ color: active > 0 ? C.accent : C.inkDim }} />
                  <p className="text-[11px] font-medium" style={{ color: C.inkDim }}>Aktiv beworben</p>
                </div>
                {active > 0 ? (
                  <>
                    <p className="text-[26px] tabular-nums leading-none font-semibold" style={{ color: C.ink }}>{active}</p>
                    <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: C.inkMuted }}>{active === 1 ? "läuft noch" : "laufen noch"} — Status prüfen</p>
                    <button type="button" onClick={() => navigate("/jobs?status=applied")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Status ansehen →</button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] leading-snug" style={{ color: C.inkMuted }}>Noch keine laufenden Bewerbungen.</p>
                    <button type="button" onClick={() => navigate("/jobs")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Stellen ansehen →</button>
                  </>
                )}
              </div>

              {/* Lebenslauf */}
              <div className="rounded-xl p-4 sm:p-5 flex flex-col" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: hasResume ? C.ok : C.warn }} />
                  <p className="text-[11px] font-medium" style={{ color: C.inkDim }}>Lebenslauf</p>
                </div>
                {hasResume ? (
                  <>
                    <p className="text-[14px] font-semibold" style={{ color: C.ok }}>Bereit</p>
                    <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: C.inkMuted }}>{resumes.length === 1 ? "1 Lebenslauf" : `${resumes.length} Lebensläufe`} hinterlegt</p>
                    <button type="button" onClick={() => navigate("/lebenslauf")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Ansehen →</button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] leading-snug" style={{ color: C.inkMuted }}>Noch kein Lebenslauf angelegt.</p>
                    <button type="button" onClick={() => navigate("/lebenslauf")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Jetzt anlegen →</button>
                  </>
                )}
              </div>

              {/* Job-Alerts */}
              <div className="rounded-xl p-4 sm:p-5 flex flex-col" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 shrink-0" style={{ color: jobAlerts.length > 0 ? C.ok : C.inkDim }} />
                  <p className="text-[11px] font-medium" style={{ color: C.inkDim }}>Job-Alerts</p>
                </div>
                {jobAlerts.length > 0 ? (
                  <>
                    <p className="text-[26px] tabular-nums leading-none font-semibold" style={{ color: C.ink }}>{jobAlerts.length}</p>
                    <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: C.inkMuted }}>{jobAlerts.length === 1 ? "Alert aktiv" : "Alerts aktiv"}</p>
                    <button type="button" onClick={() => navigate("/job-alerts")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Verwalten →</button>
                  </>
                ) : (
                  <>
                    <p className="text-[12px] leading-snug" style={{ color: C.inkMuted }}>Kein Alert aktiv — du verpasst passende Stellen.</p>
                    <button type="button" onClick={() => navigate("/job-alerts")} className="mt-auto pt-4 text-[11.5px] hover:underline text-left" style={{ color: C.accentLight }}>Alert einrichten →</button>
                  </>
                )}
              </div>

            </div>{/* end grid grid-cols-2 */}
            </div>{/* end flex-col wrapper */}

            {/* Zuletzt aktiv */}
            <section className="order-1 lg:order-2 lg:col-span-7">
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: C.inkDim }}>Zuletzt aktiv</p>
                <button type="button" onClick={() => navigate("/jobs")} className="text-[12px] hover:underline" style={{ color: C.inkMuted }}>Alle ansehen →</button>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
                {recent.map((job, i) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full grid grid-cols-[1fr_auto] gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${C.lineSubtle}` }}
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: C.ink }}>{job.company || job.role || "Stelle"}</p>
                      {job.company && job.role && <p className="mt-0.5 text-[12px] truncate" style={{ color: C.inkMuted }}>{job.role}</p>}
                    </div>
                    <span
                      className="self-center text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-full"
                      style={{
                        color: STATUS_COLOR[job.status] || C.inkDim,
                        background: `${STATUS_COLOR[job.status] || C.inkDim}22`,
                        border: `1px solid ${STATUS_COLOR[job.status] || C.inkDim}45`,
                      }}
                    >
                      {STATUS_LABEL[job.status] || job.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>

          </div>
        );
      })()}

      {/* ── EMPTY-STATE FALLBACK ──────────────────────────────────────────── */}
      {isEmpty && (
        <section className="rounded-2xl p-6 sm:p-8" style={{ background: C.surface1, border: `1px solid ${C.lineSubtle}` }}>
          <p className="text-[16px] font-medium leading-snug" style={{ color: C.ink }}>
            Hier wird's lebendig, sobald du deine erste Stelle speicherst.
          </p>
          <p className="mt-2 text-[13px] max-w-md leading-relaxed" style={{ color: C.inkMuted }}>
            Such dir eine Stelle, die dich interessiert
            {hasResume ? "" : " — oder lade vorher deinen Lebenslauf hoch, damit die KI Matches berechnen kann"}.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium"
              style={{ background: C.ink, color: C.bg }}
            >
              Stellen finden
            </button>
            {!hasResume && (
              <button
                type="button"
                onClick={() => navigate("/lebenslauf")}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium"
                style={{ border: `1px solid ${C.line}`, color: C.ink }}
              >
                Lebenslauf hochladen
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


/**
 * SuggestionRow — single Vorschläge entry. Has a colored eyebrow dot per
 * `kind` (warn, accent, neutral), title, body, and dismiss + primary action.
 */
function SuggestionRow({ suggestion: s, onDismiss }) {
  const dotColor = s.kind === "warn" ? C.warn : s.kind === "accent" ? C.accent : C.inkFaint;
  const eyebrowColor = s.kind === "warn" ? C.warn : s.kind === "accent" ? C.accent : C.inkDim;
  return (
    <article className="grid grid-cols-12 items-center gap-4 px-5 py-4">
      <div className="col-span-12 sm:col-span-8 min-w-0 flex items-start gap-3">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        <div className="min-w-0">
          {s.eyebrow && (
            <p className="text-[10.5px] tracking-[0.14em] uppercase font-semibold" style={{ color: eyebrowColor }}>
              {s.eyebrow}
            </p>
          )}
          <p className="mt-0.5 text-[14.5px] font-medium leading-snug" style={{ color: C.ink }}>{s.title}</p>
          {s.body && <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: C.inkMuted }}>{s.body}</p>}
        </div>
      </div>
      <div className="col-span-12 sm:col-span-4 flex items-center sm:justify-end gap-3 flex-wrap">
        <button type="button" onClick={onDismiss} className="text-[12px] hover:underline" style={{ color: C.inkDim }}>
          Ignorieren
        </button>
        {s.primary && (
          <button
            type="button"
            onClick={s.primary.onClick}
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
            style={{ background: C.ink, color: C.bg }}
          >
            {s.primary.label}
          </button>
        )}
      </div>
    </article>
  );
}






