import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { jobApi, resumeApi } from "../services/api";
import { DARK } from "../utils/colors";

// ─── Constants ─────────────────────────────────────────────────────
const DAY = 86400 * 1000;
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

// Tone references for the closing line + week sentence are in /demo/heute-mobile.
// Hardcoded baseline; replace with real telemetry once backend tracking lands.
const BENCHMARK_RESPONSE_DAYS = 8;

// Dark Cron-deep palette — matches /demo/heute-mobile/index.html
const C = { ...DARK, surface3: "#1f1f23", accentSoft: "rgba(124,125,240,0.14)", ok: "#86efac", okSoft: "rgba(134,239,172,0.10)" };

const SERIF = '"Instrument Serif", ui-serif, Georgia, serif';
const MONO  = '"JetBrains Mono", ui-monospace, monospace';

// ─── Helpers ───────────────────────────────────────────────────────

/** "morgen", "in 3 Tagen", "heute" — for short countdown sub-lines. */
function relativeDay(ms, now) {
  const d = Math.ceil((ms - now) / DAY);
  if (d <= 0) return "heute";
  if (d === 1) return "morgen";
  return `in ${d} Tagen`;
}

/** "vor 3 Tagen", "vor 11 Tagen", "gerade eben". */
function relativePast(when, now) {
  if (!when) return null;
  const ms = typeof when === "number" ? when : new Date(when).getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Math.floor((now - ms) / DAY);
  if (days <= 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
}

/** Hour from a ms timestamp formatted as "23:59 Uhr". */
function fmtHourMin(ms) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} Uhr`;
}

/** Status → German label + chip color class. */
function statusLabel(s) {
  switch (s) {
    case "interviewing": return { label: "Gespräch", kind: "ok" };
    case "applied":      return { label: "Beworben", kind: "mute" };
    case "offered":      return { label: "Angebot", kind: "ok" };
    case "rejected":     return { label: "Erledigt", kind: "mute" };
    case "bookmarked":
    default:             return { label: "Neu", kind: "accent" };
  }
}

/**
 * Brand-tinted square logo derived from company name. First letter (or first two
 * if uppercase initials) on a deterministic gradient. Real brand logos can replace
 * this later (see /demo/heute-mobile for the curated set).
 */
function logoTint(company) {
  const name = (company || "").trim();
  if (!name) return { initials: "?", bg: "linear-gradient(135deg,#3f3f46,#09090b)", color: C.ink, border: C.line2 };

  // Curated brand colors that already appear in the demo.
  const lower = name.toLowerCase();
  if (lower.includes("bitpanda"))   return { initials: "B",  bg: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a1a0a", border: "rgba(251,191,36,0.35)" };
  if (lower.includes("volksbank"))  return { initials: "V",  bg: "#dc2626", color: "white", border: "rgba(220,38,38,0.4)" };
  if (lower.includes("a1"))         return { initials: "A1", bg: "#e30613", color: "white", border: "rgba(227,6,19,0.4)" };
  if (lower.includes("gms"))        return { initials: "GM", bg: "linear-gradient(135deg,#84cc16,#4d7c0f)", color: "white", border: "rgba(132,204,22,0.4)" };
  if (lower.includes("thematik"))   return { initials: "TH", bg: "#27272a", color: "#fafafa", border: "rgba(255,255,255,0.22)" };
  if (lower.includes("mooons"))     return { initials: "MO", bg: "linear-gradient(135deg,#3f3f46,#09090b)", color: "#fafafa", border: "rgba(255,255,255,0.18)" };

  // Fallback: hash → hue.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    initials: name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || name[0].toUpperCase(),
    bg: `linear-gradient(135deg, hsl(${hue} 55% 38%), hsl(${(hue + 30) % 360} 55% 22%))`,
    color: "#fafafa",
    border: "rgba(255,255,255,0.16)",
  };
}

/** Format an integer salary in EUR, German locale (1.200). */
function fmtEUR(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return new Intl.NumberFormat("de-AT", { maximumFractionDigits: 0 }).format(Math.round(Number(n)));
}

/**
 * Pick the single "now-playing" hero job. Priority:
 *   1. Saved-but-not-applied job whose deadline is within 7 days.
 *   2. Highest match_score saved job created in last 48 h.
 *   3. null → caller renders the empty state.
 */
function pickHeroJob(jobs, now) {
  const candidates = jobs.filter((j) => !j.status || j.status === "bookmarked");

  const dl = candidates
    .map((j) => {
      const raw = j.expires_at || j.deadline;
      if (!raw) return null;
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t) || t < now || t - now > 14 * DAY) return null;
      return { job: j, deadlineMs: t, days: Math.ceil((t - now) / DAY) };
    })
    .filter(Boolean)
    .sort((a, b) => a.deadlineMs - b.deadlineMs);

  if (dl.length > 0) return dl[0];

  const fresh = candidates
    .filter((j) => j.match_score != null && j.match_score >= 70)
    .filter((j) => j.created_at && now - new Date(j.created_at).getTime() < 2 * DAY)
    .sort((a, b) => b.match_score - a.match_score);

  if (fresh.length > 0) return { job: fresh[0], deadlineMs: null, days: null };
  return null;
}

/** Hero serif sentence — factual, no validation. State the fact, nothing more. */
function pickHeroSentence({ heroJob, freshCount, hasResume, jobsCount, interviewingCount }) {
  if (heroJob && heroJob.days != null) {
    const company = heroJob.job.company || "Bewerbung";
    if (heroJob.days <= 0) return `Bei ${company} ist heute Frist.`;
    if (heroJob.days === 1) return `Bei ${company} ist morgen Frist.`;
    if (heroJob.days <= 3)  return `Bei ${company} läuft die Frist in ${heroJob.days} Tagen.`;
    return `Bei ${company} läuft eine Frist.`;
  }
  if (heroJob) {
    return `${heroJob.job.company || "Stelle"} — ${heroJob.job.match_score}% Match.`;
  }
  if (!hasResume) return "Kein Lebenslauf — kein Match-Score.";
  if (freshCount >= 2) return `${freshCount} neue Treffer in der Liste.`;
  if (freshCount === 1) return "1 neuer Treffer in der Liste.";
  if (interviewingCount >= 2) return `${interviewingCount} Gespräche laufen.`;
  if (interviewingCount === 1) return "1 Gespräch läuft.";
  if (jobsCount > 0) return `${jobsCount} Stelle${jobsCount === 1 ? "" : "n"} gespeichert.`;
  return "Noch keine Stelle gespeichert.";
}

// ─── Sub-components ────────────────────────────────────────────────

/** Eyebrow caps text — uppercase, 0.18em tracking. */
function Eyebrow({ children, color = C.dim, style }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color, fontWeight: 600, ...style }}>
      {children}
    </p>
  );
}

/** Brand logo square — large or small. */
function Logo({ company, size = "lg" }) {
  const t = logoTint(company);
  const dim = size === "lg" ? 46 : 36;
  const radius = size === "lg" ? 13 : 10;
  const fontSize = size === "lg" ? 17 : 13;
  return (
    <div
      style={{
        width: dim, height: dim, borderRadius: radius, background: t.bg,
        border: `1px solid ${t.border}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 700, color: t.color, fontSize,
        flexShrink: 0, letterSpacing: "-0.02em",
      }}
    >
      {t.initials}
    </div>
  );
}

/** Status chip — compact pill with semantic color. */
function Chip({ label, kind = "mute" }) {
  const styles = {
    hot:    { background: C.hotSoft, color: C.hot, border: `1px solid ${C.hotBorder}` },
    accent: { background: C.accentSoft, color: C.accent, border: "1px solid transparent" },
    ok:     { background: C.okSoft, color: C.ok, border: "1px solid transparent" },
    mute:   { background: "rgba(255,255,255,0.04)", color: C.mute, border: `1px solid ${C.line}` },
  };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
        lineHeight: 1, fontWeight: 600, letterSpacing: "0.02em",
        flexShrink: 0,
        ...styles[kind],
      }}
    >
      {label}
    </span>
  );
}

/** Single feed-card row in "Deine Liste". */
function JobRow({ job, onClick }) {
  const status = statusLabel(job.status);
  const company = job.company || "—";
  const title = job.role || job.title || "Stelle";
  const updated = relativePast(job.updated_at || job.created_at, Date.now());
  const salary =
    job.salary_min || job.salary_max
      ? `€ ${fmtEUR(job.salary_min || job.salary_max)}${job.salary_period === "hour" ? "/h" : "/Monat"}`
      : null;
  const meta = job.match_score != null ? `${job.match_score}%` : updated;

  return (
    <article
      onClick={onClick}
      style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
        padding: 16, cursor: "pointer", transition: "border-color 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.line2; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Logo company={company} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <p style={{
              fontSize: 14.5, color: C.ink, fontWeight: 500, lineHeight: 1.2,
              letterSpacing: "0.025em",
              display: "-webkit-box", WebkitLineClamp: 2, lineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {title}
            </p>
            <Chip label={status.label} kind={status.kind} />
          </div>
          <p style={{ fontSize: 11.5, color: C.mute, marginTop: 3 }}>
            {company}
            {meta && <> · <span style={{ color: C.mute }}>{meta}</span></>}
            {salary && <> · <span style={{ fontFamily: MONO }}>{salary}</span></>}
          </p>
        </div>
      </div>
    </article>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

/**
 * HeuteMobilePage — dark, mobile-first "Heute" overview.
 *
 * Single-job-as-hero pattern (Cron-deep palette). One urgent job in the first
 * fold, statistic-as-sentence below, compact feed under that, anti-ghosting
 * closing pill. Mobile is canonical (390 px); desktop stretches to 760 px.
 *
 * Source design: /demo/heute-mobile/index.html (v5+ typo pass).
 */
export default function HeuteMobilePage() {
  const navigate = useNavigate();

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try { const r = localStorage.getItem("jobs"); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
    initialData: () => {
      try { const r = localStorage.getItem("dashboard_resumes"); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
    },
    initialDataUpdatedAt: 0,
  });

  const now = useMemo(() => Date.now(), []);
  const hasResume = resumes.length > 0;

  // ─── Hero job + sentence ────────────────────────────────────────
  const heroJob = useMemo(() => pickHeroJob(jobs, now), [jobs, now]);
  const freshCount = useMemo(
    () => jobs.filter((j) => j.created_at && now - new Date(j.created_at).getTime() < 2 * DAY).length,
    [jobs, now],
  );
  const interviewingCount = useMemo(
    () => jobs.filter((j) => j.status === "interviewing").length,
    [jobs],
  );
  const heroSentence = pickHeroSentence({ heroJob, freshCount, hasResume, jobsCount: jobs.length, interviewingCount });

  // ─── Feed (Deine Liste) — exclude the hero job, show top N by relevance. ─
  const feedJobs = useMemo(() => {
    const heroId = heroJob?.job?.id;
    const priority = { interviewing: 0, offered: 1, applied: 2, bookmarked: 3, rejected: 4 };
    return jobs
      .filter((j) => j.id !== heroId)
      .sort((a, b) => (priority[a.status ?? "bookmarked"] ?? 99) - (priority[b.status ?? "bookmarked"] ?? 99))
      .slice(0, 5);
  }, [jobs, heroJob]);
  const feedRemainder = Math.max(0, jobs.length - feedJobs.length - (heroJob ? 1 : 0));

  // ─── Week sentence — count actions in last 7 days ───────────────
  const weekSentence = useMemo(() => {
    const since = now - 7 * DAY;
    const recent = jobs.filter((j) => {
      const t = new Date(j.updated_at || j.created_at).getTime();
      return Number.isFinite(t) && t >= since;
    });
    const interviews = recent.filter((j) => j.status === "interviewing").length;
    const applied = recent.filter((j) => j.status === "applied").length;
    const total = recent.length;
    if (total === 0) return null;
    return {
      head: `${total === 1 ? "Eine Aktion" : `${total === 2 ? "Zweimal" : total === 3 ? "Dreimal" : total === 4 ? "Viermal" : `${total}-mal`} gehandelt`} diese Woche.`,
      tail:
        interviews > 0
          ? `${interviews} ${interviews === 1 ? "Gespräch" : "Gespräche"}, ${applied} ${applied === 1 ? "Bewerbung" : "Bewerbungen"} raus.`
          : applied > 0
          ? `${applied} ${applied === 1 ? "Bewerbung" : "Bewerbungen"} raus. Schnitt: ${BENCHMARK_RESPONSE_DAYS} Tage bis zur Antwort.`
          : `${total} ${total === 1 ? "Stelle" : "Stellen"} aktualisiert.`,
    };
  }, [jobs, now]);

  // ─── New-treffer pill ───────────────────────────────────────────
  const newTrefferLabel = useMemo(() => {
    const since = now - 1 * DAY;
    const fresh = jobs.filter((j) => j.created_at && new Date(j.created_at).getTime() >= since).length;
    if (fresh === 0) return null;
    return `${fresh} ${fresh === 1 ? "neuer Treffer" : "neue Treffer"}`;
  }, [jobs, now]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        color: C.ink,
        fontFamily: '"Inter", system-ui, sans-serif',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── HERO ZONE ─────────────────────────────────────────── */}
        <div style={{ paddingTop: 8 }}>
          {newTrefferLabel && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: C.surface, border: `1px solid ${C.line}`,
              padding: "5px 11px", borderRadius: 999,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent }} />
              <span style={{ fontSize: 11.5, color: C.mute }}>
                Seit gestern · <span style={{ color: C.ink, fontWeight: 500 }}>{newTrefferLabel}</span>
              </span>
            </div>
          )}

          <p style={{
            marginTop: 18, fontSize: 28, lineHeight: 1.18, color: C.ink,
            fontFamily: SERIF, letterSpacing: "0.08em",
          }}>
            {heroSentence}
          </p>
          <p style={{ marginTop: 6, fontSize: 14, color: C.mute, lineHeight: 1.5 }}>
            {heroJob ? "Der Rest kann warten." : (hasResume ? "Speichere eine Stelle, um sie hier zu sehen." : "Ohne Lebenslauf berechnet die KI keinen Match-Score.")}
          </p>
        </div>

        {/* ── NOW-PLAYING URGENT JOB CARD ────────────────────────── */}
        {heroJob && <UrgentJobCard hero={heroJob} now={now} onOpen={() => navigate(`/jobs/${heroJob.job.id}`)} />}

        {/* ── EMPTY-STATE CTA (no hero job) ──────────────────────── */}
        {!heroJob && (
          <div style={{
            marginTop: 18, padding: 18, borderRadius: 18,
            background: `linear-gradient(180deg, #14141a 0%, ${C.surface} 100%)`,
            border: `1px solid ${C.line2}`,
          }}>
            <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, letterSpacing: "0.01em" }}>
              {hasResume
                ? "Keine offene Frist."
                : "Kein Lebenslauf hochgeladen."}
            </p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate(hasResume ? "/jobs" : "/lebenslauf")}
                style={{
                  background: C.ink, color: "#000", padding: "11px 16px", borderRadius: 10,
                  fontSize: 13.5, fontWeight: 600, width: "100%", textAlign: "center",
                  letterSpacing: "0.04em", border: 0, cursor: "pointer",
                }}
              >
                {hasResume ? "Stellen ansehen" : "Lebenslauf hochladen"}
              </button>
            </div>
          </div>
        )}

        {/* ── DEINE WOCHE (statistic-as-sentence) ────────────────── */}
        {weekSentence && (
          <div style={{ paddingTop: 28 }}>
            <Eyebrow>Deine Woche</Eyebrow>
            <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.55, color: C.ink, letterSpacing: "0.015em" }}>
              {weekSentence.head}{" "}
              <span style={{ color: C.mute }}>{weekSentence.tail}</span>
            </p>
          </div>
        )}

        {/* ── DEINE LISTE (compact feed) ─────────────────────────── */}
        {feedJobs.length > 0 && (
          <div style={{ paddingTop: 26 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <Eyebrow>Deine Liste · {jobs.length}</Eyebrow>
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                style={{ fontSize: 11.5, color: C.mute, fontWeight: 500, background: "transparent", border: 0, cursor: "pointer" }}
              >
                filtern ›
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {feedJobs.map((j) => (
                <JobRow key={j.id} job={j} onClick={() => navigate(`/jobs/${j.id}`)} />
              ))}
              {feedRemainder > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  style={{
                    marginTop: 6, padding: 11, border: `1px dashed ${C.line2}`,
                    background: "transparent", color: C.mute, borderRadius: 12,
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  {feedRemainder} weitere ↓
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── BENCHMARK CLOSING PILL ──────────────────────────────── */}
        <p style={{
          marginTop: 30, padding: "14px 16px", background: C.surface,
          border: `1px solid ${C.line}`, borderRadius: 12,
          fontSize: 12.5, color: C.mute, lineHeight: 1.55,
        }}>
          <span style={{ color: C.ink }}>Schnitt bis zur ersten Antwort: {BENCHMARK_RESPONSE_DAYS} Tage.</span>
          {" "}Keine Rückmeldung nach 14 Tagen — Stelle öffnen und nachfragen.
        </p>
      </div>
    </div>
  );
}

// ─── Urgent job card (now-playing) ─────────────────────────────────

/**
 * UrgentJobCard — the single first-fold "now-playing" card. Big serif
 * countdown left, salary right, two-button CTA stack below. The card
 * is the only place the hot color shows up at scale.
 */
function UrgentJobCard({ hero, now, onOpen }) {
  const { job, deadlineMs, days } = hero;
  const company = job.company || "—";
  const role = job.role || job.title || "Stelle";
  const cityLine = [job.location, job.employment_type].filter(Boolean).join(" · ");
  const periodLine = job.period || (job.start_date ? `ab ${job.start_date}` : null);

  const salaryAmt =
    job.salary_min || job.salary_max ? fmtEUR(job.salary_min || job.salary_max) : null;
  const salaryPeriod = job.salary_period === "hour" ? "/h" : "/Monat";

  // Big countdown date — "19. Mai" style.
  const countdown = useMemo(() => {
    if (!deadlineMs) return null;
    const d = new Date(deadlineMs);
    return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  }, [deadlineMs]);
  const countdownSub = useMemo(() => {
    if (!deadlineMs) return null;
    return `${relativeDay(deadlineMs, now)} · ${fmtHourMin(deadlineMs)}`;
  }, [deadlineMs, now]);

  return (
    <div style={{ paddingTop: 18 }}>
      <article style={{
        background: `linear-gradient(180deg, #14141a 0%, ${C.surface} 100%)`,
        border: `1px solid ${C.line2}`, borderRadius: 18, padding: 18,
        boxShadow: "0 24px 40px -24px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Logo company={company} size="lg" />
            <div>
              <p style={{ fontSize: 10.5, color: "#fbbf24", letterSpacing: "0.08em", fontWeight: 600 }}>
                {(company + (job.location ? ` · ${job.location}` : "")).toUpperCase()}
              </p>
              <p style={{
                fontFamily: SERIF, fontSize: 21, lineHeight: 1.18, color: C.ink,
                marginTop: 2, letterSpacing: "0.08em",
              }}>
                {role}
              </p>
              {job.match_score != null && (
                <p style={{ fontSize: 11, color: C.accent, fontWeight: 500, marginTop: 3 }}>
                  {job.match_score}% Match
                </p>
              )}
            </div>
          </div>
        </div>

        {/* countdown + meta */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            {countdown ? (
              <>
                <Eyebrow style={{ color: C.hot }}>Frist</Eyebrow>
                <p style={{
                  fontFamily: SERIF, fontSize: 38, lineHeight: 0.95, color: C.hot,
                  marginTop: 4, letterSpacing: "0.01em",
                }}>
                  {countdown}
                </p>
                <p style={{ fontSize: 11.5, color: C.mute, marginTop: 10, letterSpacing: "0.05em" }}>
                  {countdownSub}
                </p>
              </>
            ) : (
              <>
                <Eyebrow style={{ color: C.accent }}>Match</Eyebrow>
                <p style={{
                  fontFamily: SERIF, fontSize: 38, lineHeight: 0.95, color: C.accent,
                  marginTop: 4, letterSpacing: "0.01em",
                }}>
                  {job.match_score}%
                </p>
                <p style={{ fontSize: 11.5, color: C.mute, marginTop: 10, letterSpacing: "0.05em" }}>
                  neu seit gestern
                </p>
              </>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {salaryAmt ? (
              <p style={{ fontFamily: MONO, fontSize: 22, color: C.ink, fontWeight: 600, lineHeight: 1 }}>
                € {salaryAmt}
                <span style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>{salaryPeriod}</span>
              </p>
            ) : (
              <p style={{ fontFamily: SERIF, fontSize: 22, color: C.dim, lineHeight: 1, letterSpacing: "0.05em" }}>
                offen
              </p>
            )}
            {cityLine && (
              <p style={{ fontSize: 11.5, color: C.mute, marginTop: 8 }}>{cityLine}</p>
            )}
            {periodLine && (
              <p style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{periodLine}</p>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              background: C.ink, color: "#000", padding: "11px 16px", borderRadius: 10,
              fontSize: 13.5, fontWeight: 600, width: "100%", textAlign: "center",
              letterSpacing: "0.04em", border: 0, cursor: "pointer",
            }}
          >
            {job.status === "applied" ? "Status öffnen" : "Jetzt bewerben"}
          </button>
          <button
            type="button"
            onClick={onOpen}
            style={{
              background: "transparent", color: C.ink, padding: "11px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: 500, border: `1px solid ${C.line2}`,
              width: "100%", textAlign: "center", letterSpacing: "0.04em", cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent }} />
              Mit Assistent vorbereiten
            </span>
          </button>
        </div>
      </article>
    </div>
  );
}
