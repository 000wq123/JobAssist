/**
 * JobsPage — Meine Stellen / Liste.
 *
 * v5b synthesis (see /demo/v5b/index.html). Three zoom levels on one screen:
 *   1. Heute-Karte — the single most urgent action, highlighted purple.
 *   2. Urgency sections — Diese Woche, Bereit zu bewerben, Geparkt, Abgeschlossen.
 *   3. Thread-style rows — logo + name + last activity preview + time + indicator.
 *
 * The discovery surface (search) was extracted into FindenPage.jsx and lives
 * at /finden.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, Sparkles, VolumeX, ChevronDown, MoreHorizontal, Plus, ArrowUpDown } from "lucide-react";

import { jobApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import BottomSheet from "../components/ui/BottomSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUTED_KEY = "muted-jobs";

const STATUS_BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt" },
  { key: "applied",      label: "Beworben" },
  { key: "interviewing", label: "Im Gespräch" },
  { key: "offered",      label: "Angebot" },
  { key: "rejected",     label: "Erledigt" },
];

const STATUS_GROUPS = [
  { key: "interviewing", label: "Im Gespräch", dot: "#7c7df0" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80" },
  { key: "applied",      label: "Beworben",    dot: "#60a5fa" },
  { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b" },
];

const C = {
  surface1:   "#111113",
  surface2:   "#18181b",
  surface3:   "#27272a",
  line:       "rgba(255,255,255,0.10)",
  lineSubtle: "rgba(255,255,255,0.06)",
  ink:        "#fafafa",
  inkMuted:   "#a1a1aa",
  inkDim:     "#71717a",
  inkFaint:   "#52525b",
};

const FILTER_CHIPS = [
  { key: "alle",         label: "Alle",        dot: "#71717a", activeBg: "#18181b",                    activeBorder: "rgba(255,255,255,0.10)" },
  { key: "interviewing", label: "Im Gespräch", dot: "#7c7df0", activeBg: "rgba(124,125,240,0.10)",    activeBorder: "rgba(124,125,240,0.30)" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80", activeBg: "rgba(74,222,128,0.08)",     activeBorder: "rgba(74,222,128,0.25)" },
  { key: "applied",      label: "Beworben",    dot: "#60a5fa", activeBg: "rgba(96,165,250,0.08)",     activeBorder: "rgba(96,165,250,0.25)" },
  { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b", activeBg: "rgba(245,158,11,0.08)",     activeBorder: "rgba(245,158,11,0.30)" },
];

const loadStored = (key) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
};
const saveStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Days from now until the given date. Negative if already past. Null if no date.
 * @param {string | Date | null | undefined} input
 * @returns {number | null}
 */
function daysUntil(input) {
  if (!input) return null;
  const target = new Date(input);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Whole days elapsed since the given date. 0 if today.
 * @param {string | Date | null | undefined} input
 * @returns {number | null}
 */
function daysSince(input) {
  if (!input) return null;
  const since = new Date(input);
  if (Number.isNaN(since.getTime())) return null;
  return Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compact German relative-time label (heute, gestern, vor 3T, vor 2Wo.).
 * @param {string | Date | null | undefined} input
 * @returns {string | null}
 */
function timeAgoShort(input) {
  const d = daysSince(input);
  if (d === null) return null;
  if (d <= 0) return "heute";
  if (d === 1) return "gestern";
  if (d < 7) return `vor ${d}T`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `vor ${w}Wo.`;
  }
  const m = Math.floor(d / 30);
  return `vor ${m}M`;
}


/**
 * Pick the single most urgent saved job to render as the Heute-Karte.
 * Priority: overdue/near deadline → applied 10+ days no response → interview.
 *
 * @param {Array<object>} jobs
 * @param {Set<number>} mutedIds
 * @returns {{ job: object, action: string, sub: string } | null}
 */
function pickHeuteAction(jobs, mutedIds) {
  const candidates = jobs.filter((j) =>
    !mutedIds.has(j.id) && j.status !== "offered" && j.status !== "rejected",
  );

  const byDeadline = candidates
    .map((j) => ({ j, d: daysUntil(j.deadline || j.expires_at) }))
    .filter((x) => x.d !== null && x.d <= 3)
    .sort((a, b) => a.d - b.d);
  if (byDeadline.length) {
    const { j, d } = byDeadline[0];
    return {
      job: j,
      action: j.status === "bookmarked" ? "Bewerbung schreiben." : "Schritt erledigen.",
      sub: d < 0
        ? `Frist vor ${Math.abs(d)} Tagen abgelaufen.`
        : d === 0 ? "Frist heute." : `Frist in ${d} ${d === 1 ? "Tag" : "Tagen"}.`,
    };
  }

  const stale = candidates
    .filter((j) => j.status === "applied")
    .map((j) => ({ j, days: daysSince(j.updated_at || j.created_at) }))
    .filter((x) => x.days !== null && x.days >= 10)
    .sort((a, b) => b.days - a.days);
  if (stale.length) {
    const { j, days } = stale[0];
    return {
      job: j,
      action: "Nachfragen.",
      sub: `${days} Tage seit deiner Bewerbung.`,
    };
  }

  const interviews = candidates.filter((j) => j.status === "interviewing");
  if (interviews.length) {
    const best = [...interviews].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))[0];
    return {
      job: best,
      action: "Vorstellung vorbereiten.",
      sub: best.match_score != null ? `${Math.round(best.match_score)} % Passung` : null,
    };
  }

  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * HeuteCard — prominent serif action card at the top of the list.
 */
function HeuteCard({ heute, onOpen }) {
  const { job, action, sub } = heute;
  const company = job.company || job.role || "Stelle";
  const roleName = company !== (job.role || "") ? (job.role || "") : "";
  const meta = [company, roleName].filter(Boolean).join(" \u00b7 ");
  return (
    <div
      className="overflow-hidden"
      style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 12, display: "grid", gridTemplateColumns: "3px 1fr" }}
    >
      <div style={{ background: "#fbbf24" }} />
      <div className="flex flex-col gap-3 px-5 py-[18px]">
        <div className="min-w-0">
          <p className="text-[11.5px] mb-1.5 truncate" style={{ color: C.inkDim }}>
            <strong style={{ color: C.inkMuted, fontWeight: 500 }}>{meta}</strong>
            {sub ? ` \u2014 ${sub}` : ""}
          </p>
          <p className="text-[19px] sm:text-[22px] leading-[1.2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: C.ink, letterSpacing: "-0.015em" }}>
            {action}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(job.id)}
          className="self-start text-[12.5px] font-bold px-4 py-2 rounded-lg transition-all hover:-translate-y-px"
          style={{ background: "#fbbf24", color: "#000", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Stelle öffnen →
        </button>
      </div>
    </div>
  );
}


/**
 * SectionLabel — minimal flat section header: dot · LABEL · count badge · hairline.
 */
function SectionLabel({ label, count, dot, collapsible, collapsed, onToggle }) {
  const inner = (
    <>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <span className="text-[11px] font-semibold tracking-[0.07em] uppercase" style={{ color: C.inkMuted }}>{label}</span>
      <span className="ml-auto text-[10.5px] font-medium tabular-nums px-1.5 py-px rounded" style={{ background: C.surface2, color: C.inkFaint }}>{count}</span>
    </>
  );
  const shared = { borderBottom: `1px solid ${C.lineSubtle}` };
  if (collapsible) {
    return (
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-1.5 pb-1.5 mb-0.5" style={shared}>
        <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 transition-transform"
          style={{ color: C.inkDim, transform: collapsed ? "rotate(-90deg)" : "none" }} />
        {inner}
      </button>
    );
  }
  return <div className="flex items-center gap-1.5 pb-1.5 mb-0.5" style={shared}>{inner}</div>;
}

/**
 * ThreadRow — flat grid row: 2px accent bar · content · meta+⋯.
 * No urgency pills; urgency is surfaced in HeuteCard instead.
 */
function ThreadRow({ job, muted = false, isFirst = false, onOpen, onChangeStatus }) {
  const role     = job.role || job.title || "Stelle";
  const company  = job.company || "";
  const location = job.location ? job.location.split(",")[0] : null;
  const meta     = [company, location].filter(Boolean).join(" \u00b7 ");
  const timeLabel = timeAgoShort(job.updated_at || job.created_at);

  const statusDot = STATUS_GROUPS.find((g) => g.key === job.status)?.dot ?? C.inkDim;

  const rawScore   = Number.isFinite(job.match_score) ? Math.round(job.match_score) : null;
  const matchScore = (rawScore !== null && job.match_feedback) ? rawScore : null;
  const matchColor = matchScore !== null
    ? (matchScore >= 80 ? "#34d399" : matchScore >= 65 ? "#2dd4bf" : matchScore >= 45 ? "#94a3b8" : "#52525b") : null;
  const matchBg = matchScore !== null
    ? (matchScore >= 80 ? "rgba(52,211,153,0.13)" : matchScore >= 65 ? "rgba(45,212,191,0.11)" : matchScore >= 45 ? "rgba(148,163,184,0.09)" : "rgba(82,82,91,0.06)") : null;

  return (
    <div
      className={`group grid cursor-pointer transition-colors hover:bg-white/[0.03] ${muted ? "opacity-40" : ""}`}
      style={{ gridTemplateColumns: "2px minmax(0, 1fr) auto", borderTop: isFirst ? "none" : `1px solid ${C.lineSubtle}` }}
    >
      <div
        className="self-stretch transition-opacity opacity-[0.22] group-hover:opacity-90"
        style={{ background: statusDot }}
      />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 text-left px-3 py-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-400)] rounded-sm"
      >
        <p className="text-[13.5px] font-semibold leading-snug truncate" style={{ color: C.ink }}>{role}</p>
        {meta && <p className="mt-0.5 text-[11.5px] truncate" style={{ color: C.inkMuted }}>{meta}</p>}
      </button>
      <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
        {matchScore !== null && (
          <span className="text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{ color: matchColor, background: matchBg }}>{matchScore}%</span>
        )}
        {timeLabel && (
          <span className="text-[11px] tabular-nums" style={{ color: C.inkFaint, minWidth: 36, textAlign: "right" }}>{timeLabel}</span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChangeStatus(); }}
          aria-label={`Optionen für ${role}`}
          className="w-[22px] h-[22px] rounded flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: C.inkDim }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Loading skeleton — flat section + rows style. */
function RowSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="flex items-center gap-1.5 pb-1.5 mb-0.5" style={{ borderBottom: `1px solid ${C.lineSubtle}` }}>
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          {[0, 1, 2].map((r) => (
            <div key={r} className="px-3 py-3" style={{ borderTop: r > 0 ? `1px solid ${C.lineSubtle}` : "none" }}>
              <Skeleton className="h-3 w-2/3 mb-1.5" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * JobsPage — Meine Stellen.
 * Grouped by status: Im Gespräch → Angebot → Beworben → Gemerkt → Erledigt (collapsible).
 */
export default function JobsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: savedJobs = [], isFetching: savedFetching } = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      jobApi.list().then((r) => {
        const items = r.data?.items ?? r.data ?? [];
        saveStored("jobs", items);
        return items;
      }),
    initialData: () => loadStored("jobs") || [],
    initialDataUpdatedAt: 0,
    staleTime: 0,
    retry: 2,
  });

  const [mutedIds, setMutedIds] = useState(() => new Set(loadStored(MUTED_KEY) || []));
  useEffect(() => {
    saveStored(MUTED_KEY, Array.from(mutedIds));
  }, [mutedIds]);

  useEffect(() => {
    if (mutedIds.size === 0) return;
    const liveIds = new Set(savedJobs.map((j) => j.id));
    let dirty = false;
    const next = new Set();
    mutedIds.forEach((id) => {
      if (liveIds.has(id)) next.add(id);
      else dirty = true;
    });
    if (dirty) setMutedIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedJobs]);

  // ── Auto-remove expired bookmarked jobs ─────────────────────────────────────
  // Runs once per mount after the first real API fetch resolves.
  // Only removes "bookmarked" jobs (user has not yet acted) whose expires_at /
  // deadline is in the past. Applied / Gespräch / Angebot / Erledigt are
  // intentionally kept so the user can track their application outcomes.
  const expiredCleanupRef = useRef(false);
  useEffect(() => {
    if (savedFetching || savedJobs.length === 0 || expiredCleanupRef.current) return;
    expiredCleanupRef.current = true;

    const now = Date.now();
    const expired = savedJobs.filter((j) => {
      if (j.status !== "bookmarked") return false;
      const raw = j.expires_at || j.deadline;
      if (!raw) return false;
      const t = new Date(raw).getTime();
      return Number.isFinite(t) && t < now;
    });
    if (!expired.length) return;

    const ids = new Set(expired.map((e) => e.id));
    qc.setQueryData(["jobs"], (old = []) => old.filter((j) => !ids.has(j.id)));

    Promise.allSettled(expired.map((j) => jobApi.delete(j.id))).then(() => {
      const fresh = qc.getQueryData(["jobs"]) || [];
      saveStored("jobs", fresh);
    });

    const companies = [...new Set(expired.map((j) => j.company).filter(Boolean))].slice(0, 3);
    const noun = expired.length === 1 ? "Stelle" : "Stellen";
    const coStr = companies.length ? ` — ${companies.join(", ")}` : "";
    toast(`${expired.length} abgelaufene ${noun} entfernt${coStr}. Frist bereits vorbei.`, { duration: 7000 });
  }, [savedJobs, savedFetching, qc]);

  // Group by status, sorted by most recently updated
  const [sortBy, setSortBy] = useState("date");

  const grouped = useMemo(() => {
    const out = { interviewing: [], offered: [], applied: [], bookmarked: [], rejected: [] };
    savedJobs.forEach((j) => {
      const key = j.status in out ? j.status : "bookmarked";
      out[key].push(j);
    });
    Object.values(out).forEach((arr) =>
      arr.sort((a, b) => {
        if (sortBy === "score") {
          const sa = b.match_score ?? -1;
          const sb = a.match_score ?? -1;
          return sa - sb;
        }
        const da = new Date(a.updated_at || a.created_at).getTime() || 0;
        const db = new Date(b.updated_at || b.created_at).getTime() || 0;
        return db - da;
      }),
    );
    return out;
  }, [savedJobs, sortBy]);

  const heute = useMemo(() => pickHeuteAction(savedJobs, mutedIds), [savedJobs, mutedIds]);

  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(() => {
    const s = searchParams.get("status");
    return FILTER_CHIPS.some((c) => c.key === s) ? s : "alle";
  });
  const [sheetJob, setSheetJob] = useState(null);
  const closeSheet = () => setSheetJob(null);

  const statusMutation = useMutation({
    mutationFn: ({ jobId, status }) => jobApi.updateStatus(jobId, status),
    onMutate: async ({ jobId, status }) => {
      await qc.cancelQueries({ queryKey: ["jobs"] });
      const prev = qc.getQueryData(["jobs"]);
      qc.setQueryData(["jobs"], (old = []) =>
        old.map((j) => (j.id === jobId ? { ...j, status, updated_at: new Date().toISOString() } : j)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(["jobs"], ctx?.prev);
      toast.error(getApiErrorMessage(err, "Status konnte nicht geändert werden"));
    },
    onSuccess: () => toast.success("Status aktualisiert"),
  });

  const handleStatusPick = (status) => {
    if (!sheetJob) return;
    if (status !== sheetJob.status) statusMutation.mutate({ jobId: sheetJob.id, status });
    closeSheet();
  };

  const handleToggleMute = () => {
    if (!sheetJob) return;
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sheetJob.id)) next.delete(sheetJob.id);
      else next.add(sheetJob.id);
      return next;
    });
    closeSheet();
  };

  const scrollSaveRef = useRef(false);
  useEffect(() => {
    const savedY = sessionStorage.getItem("jobsPageScrollY");
    if (savedY) requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedY, 10), behavior: "instant" }));
    return () => {
      if (scrollSaveRef.current) sessionStorage.setItem("jobsPageScrollY", String(window.scrollY));
    };
  }, []);

  const openJob = (jobId) => { scrollSaveRef.current = true; navigate(`/jobs/${jobId}`); };

  const total = savedJobs.length;
  const [showDone, setShowDone] = useState(false);

  const visibleGroups = activeFilter === "alle"
    ? STATUS_GROUPS
    : STATUS_GROUPS.filter((g) => g.key === activeFilter);

  return (
    <div className="flex flex-col gap-5 animate-slide-up">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[34px] font-semibold leading-[1.1] text-[var(--color-fg)]" style={{ letterSpacing: "-0.025em" }}>
            Stellen
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)]">
            {total === 0 ? "Speichere deine erste Stelle." : `${total} gespeichert`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/finden")}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[12.5px] font-semibold transition-all hover:-translate-y-px"
          style={{ background: "#7c7df0", color: "#fff", boxShadow: "0 0 0 1px rgba(124,125,240,.4), 0 4px 14px rgba(124,125,240,.25)" }}
        >
          <Plus className="w-3 h-3" />
          Neue Stelle
        </button>
      </header>

      {/* ── Filter chips + sort toggle ───────────────────────────── */}
      {total > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {FILTER_CHIPS.map(({ key, label, dot, activeBg, activeBorder }) => {
              const count = key === "alle" ? total : (grouped[key]?.length ?? 0);
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all"
                  style={isActive
                    ? { background: activeBg, border: `1px solid ${activeBorder}`, color: C.ink }
                    : { background: "transparent", border: `1px solid ${C.lineSubtle}`, color: C.inkDim }}
                >
                  <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: dot }} />
                  {label}
                  <span
                    className="text-[10.5px] font-semibold tabular-nums px-1 rounded"
                    style={{ background: isActive ? "rgba(255,255,255,0.08)" : C.surface3, color: isActive ? C.inkMuted : C.inkFaint }}
                  >{count}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSortBy((s) => s === "date" ? "score" : "date")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0"
            style={sortBy === "score"
              ? { background: "rgba(124,125,240,0.14)", border: "1px solid rgba(124,125,240,0.35)", color: "#a5b4fc" }
              : { background: "transparent", border: `1px solid ${C.lineSubtle}`, color: C.inkDim }}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortBy === "score" ? "Passung" : "Datum"}
          </button>
        </div>
      )}

      {/* ── Urgent card ─────────────────────────────────────────────── */}
      {heute ? <HeuteCard heute={heute} onOpen={openJob} /> : null}

      {/* ── Loading / Empty / Lists ─────────────────────────────────── */}
      {savedFetching && total === 0 ? (
        <RowSkeleton />
      ) : total === 0 ? (
        <EmptyState
          tone="subtle"
          title="Noch keine Stellen gespeichert"
          description="Starte mit Empfehlungen oder einer eigenen Suche."
          icon={Sparkles}
          action={<Button onClick={() => navigate("/finden")}><Search className="w-3.5 h-3.5" />Stelle finden</Button>}
        />
      ) : (
        <div className="flex flex-col gap-5">

          {visibleGroups.map(({ key, label, dot }) => {
            const jobs = grouped[key];
            if (!jobs || jobs.length === 0) return null;
            return (
              <div key={key}>
                <SectionLabel label={label} count={jobs.length} dot={dot} />
                {jobs.map((job, i) => (
                  <ThreadRow
                    key={job.id}
                    job={job}
                    isFirst={i === 0}
                    muted={mutedIds.has(job.id)}
                    onOpen={() => openJob(job.id)}
                    onChangeStatus={() => setSheetJob(job)}
                  />
                ))}
              </div>
            );
          })}

          {activeFilter === "alle" && grouped.rejected.length > 0 && (
            <div>
              <SectionLabel
                label="Erledigt"
                count={grouped.rejected.length}
                dot={C.inkFaint}
                collapsible
                collapsed={!showDone}
                onToggle={() => setShowDone((v) => !v)}
              />
              {showDone && grouped.rejected.map((job, i) => (
                <ThreadRow
                  key={job.id}
                  job={job}
                  isFirst={i === 0}
                  muted
                  onOpen={() => openJob(job.id)}
                  onChangeStatus={() => setSheetJob(job)}
                />
              ))}
            </div>
          )}

        </div>
      )}

      {/* ── Bottom sheet: status changer ────────────────────────────── */}
      <BottomSheet open={!!sheetJob} onClose={closeSheet} title="Status ändern">
        {sheetJob && (
          <>
            <p className="text-[14px] font-medium text-[var(--color-fg)] truncate">{sheetJob.company || "Stelle"}</p>
            <p className="text-[12.5px] text-[var(--color-fg-muted)] truncate mt-0.5">{sheetJob.role || "-"}</p>
            <ul className="mt-4 flex flex-col">
              {STATUS_BUCKETS.map((b, i) => {
                const isCurrent = sheetJob.status === b.key;
                return (
                  <li key={b.key} className={i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}>
                    <button
                      type="button"
                      onClick={() => handleStatusPick(b.key)}
                      className="w-full flex items-center justify-between py-3.5 text-left hover:text-[var(--color-fg)] transition-colors"
                    >
                      <span className={`text-[14.5px] ${isCurrent ? "text-[var(--color-fg)] font-medium" : "text-[var(--color-fg-muted)]"}`}>
                        {b.label}
                      </span>
                      {isCurrent && <span className="text-[12px] text-[var(--color-fg-faint)]">aktuell</span>}
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="w-full flex items-center justify-between py-3.5 text-left hover:text-[var(--color-fg)] transition-colors"
                >
                  <span className="flex items-center gap-2 text-[14.5px] text-[var(--color-fg-muted)]">
                    <VolumeX className="w-3.5 h-3.5" />
                    {mutedIds.has(sheetJob.id) ? "Wiederaufnehmen" : "Parken"}
                  </span>
                </button>
              </li>
            </ul>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
