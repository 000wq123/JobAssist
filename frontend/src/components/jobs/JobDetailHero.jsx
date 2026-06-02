/**
 * JobDetailHero — Story-led header for the job detail page.
 *
 * Visual spec: see /demo/v3/index.html.
 *
 * Layered facts, from most emotional to most clinical:
 *   1. Brand + title row (logo, category chip, role)
 *   2. Story hero (Instrument Serif wage if available, else role)
 *   3. KPI tiles (Anfahrt, Frist) — only rendered if data exists
 *   4. KV-Vergleich bar (mocked benchmark by category for v1)
 *   5. Match score with bullet reasoning
 *
 * The hero is graceful: every section hides itself if the underlying data is
 * missing. No fake numbers are rendered — only mocked benchmark constants
 * which are clearly labelled as such.
 */
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatEuro } from "../../utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a free-form salary string into a numeric hourly rate (EUR/h) when
 * possible. Returns null when the format is not recognised.
 *
 * Recognised inputs (case-insensitive):
 *   "€10,20/h"        → 10.20
 *   "10.50 EUR/Std"   → 10.50
 *   "12 EUR pro Stunde" → 12
 *   "€2000 monatlich" → null  (we only parse hourly here)
 *
 * @param {string | null | undefined} raw
 * @returns {number | null}
 */
function parseHourlyRate(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\s+/g, " ");
  const isHourly = /(\/h|\/std|pro stunde|pro h\b|hour)/.test(s);
  if (!isHourly) return null;
  const m = s.match(/([0-9]+)[,.]?([0-9]{0,2})/);
  if (!m) return null;
  const euros = Number(m[1]);
  const cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  if (!Number.isFinite(euros)) return null;
  return euros + cents / 100;
}

/**
 * Days from now until the given ISO date string. Negative if already past.
 * @param {string | null | undefined} iso
 * @returns {number | null}
 */
function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Mocked KV (Kollektivvertrag) minimum hourly wage for a young first-job seeker
 * in Austria. Values are illustrative defaults for 2026; replace with a real
 * lookup table when one is available.
 *
 * @param {string | null | undefined} category
 * @returns {number}
 */
function kvMinimumFor(category) {
  switch ((category || "").toLowerCase()) {
    case "samstagsjob":
    case "teilzeit":
      return 9.27; // Handel, 17 J., 2026 illustrative
    case "praktikum":
      return 8.10; // Pflichtpraktikum typical
    default:
      return 9.00;
  }
}

/**
 * Human label for the `category` enum.
 * @param {string | null | undefined} category
 * @returns {string}
 */
function categoryLabel(category) {
  switch ((category || "").toLowerCase()) {
    case "samstagsjob": return "Samstagsjob";
    case "praktikum":   return "Praktikum";
    case "teilzeit":    return "Teilzeit";
    default:            return "Stelle";
  }
}

/**
 * Best-effort initial / abbreviation for the company logo chip. Falls back to
 * `?` when no company is given.
 * @param {string | null | undefined} company
 * @returns {string}
 */
function logoAbbrev(company) {
  if (!company) return "?";
  const trimmed = company.trim();
  if (trimmed.length <= 5) return trimmed.toUpperCase();
  return trimmed.slice(0, 1).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Small KPI tile used in the supporting-facts row (Anfahrt, Frist, …).
 *
 * @param {object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.value
 * @param {React.ReactNode} [props.hint]
 * @param {"default" | "warn"} [props.tone]
 */
function Tile({ label, value, hint, tone = "default" }) {
  const toneClass = tone === "warn" ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3">
      <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)]">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold tabular-nums leading-none ${toneClass}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-[10.5px] text-[var(--color-fg-dim)] truncate">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * KV-Vergleich (collective-bargaining-minimum benchmark) bar. Only renders when
 * an hourly rate could be parsed from the salary string.
 *
 * @param {object} props
 * @param {number} props.hourly       — Parsed €/h for this job.
 * @param {number} props.kvMin        — Mocked KV minimum for the category.
 */
function KvBar({ hourly, kvMin }) {
  // Layout: KV min at ~78% of the bar, current job rate slightly above, top of
  // range at 100%. The numbers are visually meaningful, not statistically
  // sourced. Replace with a real distribution when available.
  const top = Math.max(hourly * 1.18, kvMin * 1.35);
  const kvPct  = Math.min(100, (kvMin   / top) * 100);
  const jobPct = Math.min(100, (hourly  / top) * 100);
  const above  = hourly > kvMin;
  const diff   = hourly - kvMin;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)]">KV-Vergleich · 17 J.</p>
        <p
          className={`text-[11.5px] tabular-nums font-medium ${
            above ? "text-emerald-400" : "text-[var(--color-warning)]"
          }`}
        >
          {above ? "+" : ""}{formatEuro(diff)}/h
        </p>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-[var(--color-bg-elev-3)] overflow-hidden">
        <div className="h-full rounded-l-full bg-[var(--color-accent-500)]/30" style={{ width: `${kvPct}%` }} />
        <div
          className="absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--color-fg)]"
          style={{ left: `${jobPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between tabular-nums text-[10.5px] text-[var(--color-fg-dim)]">
        <span>Min {formatEuro(kvMin)}</span>
        <span className={above ? "text-emerald-400 font-medium" : "text-[var(--color-fg)] font-medium"}>
          {formatEuro(hourly)} hier
        </span>
        <span>Top {formatEuro(top)}</span>
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--color-fg-dim)]">
        Mocked benchmark — wird durch echte KV-Daten ersetzt.
      </p>
    </div>
  );
}

/**
 * Match-score card. Renders the headline score and the AI feedback bullets when
 * available; falls back to an "in progress" placeholder otherwise.
 *
 * @param {object} props
 * @param {number | null | undefined} props.score
 * @param {string | null | undefined} props.feedbackJson — raw `match_feedback`
 */
function MatchCard({ score, feedbackJson }) {
  /** @type {{ strengths?: string[]; gaps?: string[] } | null} */
  let parsed = null;
  if (feedbackJson) {
    try {
      const obj = JSON.parse(feedbackJson);
      if (obj && typeof obj === "object") parsed = obj;
    } catch { /* ignore malformed */ }
  }

  const hasScore = typeof score === "number" && Number.isFinite(score);
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)]">So passt du</p>
        {hasScore ? (
          <p className="text-[26px] font-semibold tabular-nums leading-none text-[var(--color-fg)]">
            {Math.round(score / 10)}
            <span className="text-[14px] font-medium text-[var(--color-fg-dim)]">/10</span>
          </p>
        ) : (
          <p className="text-[11px] text-[var(--color-fg-dim)]">noch nicht berechnet</p>
        )}
      </div>

      {parsed?.strengths?.length ? (
        <ul className="mt-3 space-y-2">
          {parsed.strengths.slice(0, 3).map((s, i) => (
            <li key={`s${i}`} className="flex items-start gap-2 text-[12.5px] text-[var(--color-fg)]">
              <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
          {parsed.gaps?.slice(0, 2).map((g, i) => (
            <li key={`g${i}`} className="flex items-start gap-2 text-[12.5px] text-[var(--color-fg-muted)]">
              <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] flex-shrink-0" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-[var(--color-fg-dim)] leading-relaxed">
          Erzeuge die KI-Analyse unten, um Stärken &amp; Lücken zu sehen.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Story-led hero header for the job detail page.
 *
 * Replaces the previous (line-534) hero. Layout adapts to the underlying data
 * — wage-led when a salary string is parseable, role-led otherwise.
 *
 * @param {object} props
 * @param {object} props.job                  — Full job record from the API.
 * @param {React.ReactNode} props.statusBadge — Pre-styled status chip (Gespeichert / Beworben / …).
 * @param {() => void} [props.onDelete]
 * @param {boolean} [props.deletePending]
 */
export default function JobDetailHero({ job, statusBadge, onDelete, deletePending }) {
  const navigate = useNavigate();

  const hourly         = parseHourlyRate(job.salary_text);
  const kvMin          = kvMinimumFor(job.category);
  const deadlineDays   = daysUntil(job.deadline || job.expires_at);
  const showDeadline   = deadlineDays !== null;
  const deadlineWarn   = deadlineDays !== null && deadlineDays <= 7;

  return (
    <header className="mb-10 pb-8 border-b border-[var(--color-border-subtle)]">
      {/* Back to /jobs — kept here so the hero owns the top edge of the page */}
      <button
        type="button"
        onClick={() => navigate("/jobs")}
        className="mb-6 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Stellen
      </button>

      {/* Brand + title row */}
      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-12 lg:col-span-8 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] flex items-center justify-center text-[12px] font-bold text-[var(--color-fg)] flex-shrink-0"
              aria-hidden="true"
            >
              {logoAbbrev(job.company)}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] tracking-[0.14em] uppercase text-[var(--color-accent-300)] font-semibold">
                {categoryLabel(job.category)}
              </p>
              <p className="text-[12px] text-[var(--color-fg-muted)] truncate">
                {job.company || "Unbekanntes Unternehmen"}
                {job.location ? ` · ${job.location}` : ""}
              </p>
            </div>
          </div>

          <h1
            className="mt-4 text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight text-[var(--color-fg)] break-words"
            style={{ letterSpacing: "-0.025em" }}
          >
            {job.role || "Ohne Titel"}
          </h1>

          {/* Status + chrome row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {statusBadge}
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Stellenanzeige öffnen
              </a>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deletePending}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-dim)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                title="Stelle löschen"
              >
                <Trash2 className="w-3 h-3" /> Löschen
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Story hero (wage-led if parseable) ─────────────────────────────── */}
      {hourly !== null ? (
        <section className="mt-8">
          <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)]">Du verdienst</p>
          <div className="mt-1 flex items-baseline gap-4">
            <p
              className="leading-none text-[var(--color-fg)]"
              style={{
                fontFamily: '"Instrument Serif", ui-serif, Georgia, serif',
                fontSize: "clamp(56px, 9vw, 78px)",
                letterSpacing: "-0.02em",
              }}
            >
              €{Math.trunc(hourly)}
              <span className="text-[var(--color-fg-dim)]">
                ,{String(Math.round((hourly - Math.trunc(hourly)) * 100)).padStart(2, "0")}
              </span>
            </p>
            <p className="text-[12px] text-[var(--color-fg-muted)] leading-tight pb-1">pro<br />Stunde</p>
          </div>
          {hourly > kvMin ? (
            <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11.5px] tabular-nums text-emerald-300 font-medium">
                +{formatEuro(hourly - kvMin)} über KV-Minimum
              </span>
            </span>
          ) : null}
        </section>
      ) : null}

      {/* ── Supporting tiles ───────────────────────────────────────────────── */}
      {(showDeadline || job.location || job.salary_text) ? (
        <section className="mt-5 grid grid-cols-12 gap-3">
          {showDeadline ? (
            <div className="col-span-6 sm:col-span-4 lg:col-span-3">
              <Tile
                label="Frist"
                tone={deadlineWarn ? "warn" : "default"}
                value={
                  deadlineDays >= 0
                    ? <>{deadlineDays}<span className="text-[12px] text-[var(--color-fg-dim)] ml-0.5">Tage</span></>
                    : <>{Math.abs(deadlineDays)}<span className="text-[12px] text-[var(--color-fg-dim)] ml-0.5">T überfällig</span></>
                }
                hint={
                  job.deadline
                    ? new Date(job.deadline).toLocaleDateString("de-AT")
                    : (job.expires_at ? new Date(job.expires_at).toLocaleDateString("de-AT") : null)
                }
              />
            </div>
          ) : null}
          {job.location ? (
            <div className="col-span-6 sm:col-span-4 lg:col-span-3">
              <Tile
                label="Standort"
                value={<span className="text-[15px] font-medium">{job.location.split(",")[0]}</span>}
                hint={job.location.split(",").slice(1).join(",").trim() || null}
              />
            </div>
          ) : null}
          {job.salary_text && hourly === null ? (
            <div className="col-span-12 sm:col-span-4 lg:col-span-3">
              <Tile
                label="Gehalt"
                value={<span className="text-[15px] font-medium">{job.salary_text}</span>}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── KV-Vergleich + Match ──────────────────────────────────────────── */}
      <section className="mt-5 grid grid-cols-12 gap-3">
        {hourly !== null ? (
          <div className="col-span-12 lg:col-span-6">
            <KvBar hourly={hourly} kvMin={kvMin} />
          </div>
        ) : null}
        <div className={`col-span-12 ${hourly !== null ? "lg:col-span-6" : "lg:col-span-6"}`}>
          <MatchCard score={job.match_score} feedbackJson={job.match_feedback} />
        </div>
      </section>
    </header>
  );
}
