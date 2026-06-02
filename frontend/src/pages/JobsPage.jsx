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
import { Search, Sparkles, Plus, ChevronDown } from "lucide-react";

import { jobApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { DARK } from "../utils/colors";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import BottomSheet from "../components/ui/BottomSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const MUTED_KEY = "muted-jobs";
const COLLAPSED_KEY = "collapsed-groups";

const STATUS_GROUPS = [
  { key: "interviewing", label: "Gespräch",    dot: "#7c7df0" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80" },
  { key: "applied",      label: "Antwort ausständig", dot: "#60a5fa" },
  { key: "bookmarked",   label: "Bewerben",    dot: "#f59e0b" },
];

const ALL_STATUSES = [
  { key: "bookmarked", label: "Bewerben", dot: "#f59e0b" },
  { key: "applied", label: "Antwort ausständig", dot: "#60a5fa" },
  { key: "interviewing", label: "Gespräch", dot: "#7c7df0" },
  { key: "offered", label: "Angebot", dot: "#4ade80" },
  { key: "rejected", label: "Erledigt", dot: "#52525b" },
];

const C = { ...DARK, surface3: "#27272a", inkFaint: "#52525b" };

const FILTER_CHIPS = [
  { key: "alle",         label: "Alle",        dot: "#71717a", activeBg: "#18181b",                    activeBorder: "rgba(255,255,255,0.10)" },
  { key: "interviewing", label: "Gespräch",    dot: "#7c7df0", activeBg: "rgba(124,125,240,0.10)",    activeBorder: "rgba(124,125,240,0.30)" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80", activeBg: "rgba(74,222,128,0.08)",     activeBorder: "rgba(74,222,128,0.25)" },
  { key: "applied",      label: "Antwort ausständig", dot: "#60a5fa", activeBg: "rgba(96,165,250,0.08)",     activeBorder: "rgba(96,165,250,0.25)" },
  { key: "bookmarked",   label: "Bewerben",    dot: "#f59e0b", activeBg: "rgba(245,158,11,0.08)",     activeBorder: "rgba(245,158,11,0.30)" },
  { key: "rejected",     label: "Erledigt",    dot: "#52525b", activeBg: "rgba(82,82,91,0.10)",      activeBorder: "rgba(82,82,91,0.25)" },
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


// ─── Sub-components ───────────────────────────────────────────────────────────

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
 * ThreadRow — flat grid row: 2px accent bar · content · meta.
 * Supports multi-select via Shift+click (desktop) or long-press (mobile).
 */
function ThreadRow({ job, muted = false, isFirst = false, onOpen, onStatusChange }) {
  const role     = job.role || job.title || "Stelle";
  const company  = job.company || "";
  const location = job.location ? job.location.split(",")[0] : null;
  const meta     = [company, location].filter(Boolean).join(" \u00b7 ");
  const timeLabel = timeAgoShort(job.updated_at || job.created_at);

  const statusGroup = STATUS_GROUPS.find((g) => g.key === job.status);
  const statusDot = statusGroup?.dot ?? C.inkDim;
  const statusLabel = statusGroup?.label ?? job.status ?? "Unbekannt";

  const rawScore   = Number.isFinite(job.match_score) ? Math.round(job.match_score) : null;
  const matchScore = rawScore !== null ? rawScore : null;
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
        role="img"
        aria-label={`Status: ${statusLabel}`}
      />
      <button
        type="button"
        aria-label={`${role} bei ${company || "Unbekannt"} — ${statusLabel}`}
        onClick={() => onOpen()}
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
        {/* Mobile-only status chip — opens bottom sheet */}
        {onStatusChange && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, null); }}
            className="sm:hidden text-[10px] font-medium px-1.5 py-0.5 rounded border"
            style={{ borderColor: statusDot + "55", color: statusDot, background: statusDot + "15" }}
          >
            {statusLabel}
          </button>
        )}
        {timeLabel && (
          <span className="text-[11px] tabular-nums" style={{ color: C.inkFaint, minWidth: 36, textAlign: "right" }}>{timeLabel}</span>
        )}
      </div>
    </div>
  );
}

/** Empty state when a filter has zero results. */
function FilterEmptyState({ filter }) {
  const copy = {
    alle: { title: "Keine Stellen", desc: "Speichere eine Stelle, um sie hier zu sehen." },
    interviewing: { title: "Keine Gespräche", desc: "Markiere eine Bewerbung als Gespräch, sobald du eingeladen wirst." },
    offered: { title: "Noch kein Angebot", desc: "Bewirb dich auf eine gespeicherte Stelle." },
    applied: { title: "Noch keine Antworten ausständig", desc: "Speichere eine Stelle und markiere sie als Beworben." },
    bookmarked: { title: "Nichts zu bewerben", desc: "Finde Stellen über Empfehlungen oder eigene Suche." },
    rejected: { title: "Noch keine erledigten Stellen", desc: "Markiere abgelehnte oder zurückgezogene Stellen hier." },
  };
  const { title, desc } = copy[filter] || copy.alle;
  return (
    <div className="py-10 text-center">
      <p className="text-[14px] font-medium text-[var(--color-fg-muted)]">{title}</p>
      <p className="mt-1 text-[12.5px] text-[var(--color-fg-dim)]">{desc}</p>
    </div>
  );
}

/** Loading skeleton — flat section + rows style. Derives shape from cache. */
function RowSkeleton() {
  const cached = loadStored("jobs") || [];
  const groups = ["interviewing", "offered", "applied", "bookmarked", "rejected"];
  const counts = {};
  let totalCached = 0;
  cached.forEach((j) => {
    const key = groups.includes(j.status) ? j.status : "bookmarked";
    counts[key] = (counts[key] || 0) + 1;
    totalCached++;
  });

  if (totalCached === 0) {
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

  const activeGroups = groups.filter((g) => counts[g]);
  return (
    <div className="flex flex-col gap-5">
      {activeGroups.map((g) => (
        <div key={g}>
          <div className="flex items-center gap-1.5 pb-1.5 mb-0.5" style={{ borderBottom: `1px solid ${C.lineSubtle}` }}>
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          {Array.from({ length: counts[g] }).map((_, r) => (
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
        try { localStorage.setItem("jobs_ts", String(Date.now())); } catch { /* quota */ }
        return items;
      }),
    initialData: () => loadStored("jobs") || [],
    initialDataUpdatedAt: () => {
      try { return parseInt(localStorage.getItem("jobs_ts") || "0", 10); } catch { return 0; }
    },
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

  // ── Warn about expired bookmarked jobs (non-destructive) ────────────────────
  // Shows a calm toast when bookmarked jobs have a past deadline / expires_at.
  // We do NOT delete them automatically — the user may still want to apply,
  // follow up, or keep the record for reference.
  const expiredWarnRef = useRef(false);
  useEffect(() => {
    if (savedFetching || savedJobs.length === 0 || expiredWarnRef.current) return;
    expiredWarnRef.current = true;

    const now = Date.now();
    const expired = savedJobs.filter((j) => {
      if (j.status !== "bookmarked") return false;
      const raw = j.expires_at || j.deadline;
      if (!raw) return false;
      const t = new Date(raw).getTime();
      return Number.isFinite(t) && t < now;
    });
    if (!expired.length) return;

    const companies = [...new Set(expired.map((j) => j.company).filter(Boolean))].slice(0, 3);
    const noun = expired.length === 1 ? "Stelle" : "Stellen";
    const coStr = companies.length ? ` — ${companies.join(", ")}` : "";
    toast(`${expired.length} ${noun} mit abgelaufener Frist${coStr}. Status ändern, falls du dich bereits beworben hast.`, { duration: 7000 });
  }, [savedJobs, savedFetching]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(() => {
    const s = searchParams.get("status");
    return FILTER_CHIPS.some((c) => c.key === s) ? s : "alle";
  });

  const setFilter = (key) => {
    setActiveFilter(key);
    const next = new URLSearchParams(searchParams);
    if (key === "alle") next.delete("status");
    else next.set("status", key);
    setSearchParams(next, { replace: true });
  };

  const grouped = useMemo(() => {
    const out = { interviewing: [], offered: [], applied: [], bookmarked: [], rejected: [] };
    savedJobs.forEach((j) => {
      const key = j.status in out ? j.status : "bookmarked";
      out[key].push(j);
    });
    Object.values(out).forEach((arr) =>
      arr.sort((a, b) => {
        const da = new Date(a.updated_at || a.created_at).getTime() || 0;
        const db = new Date(b.updated_at || b.created_at).getTime() || 0;
        return db - da;
      }),
    );
    return out;
  }, [savedJobs]);

  const scrollSaveRef = useRef(false);
  useEffect(() => {
    const savedY = sessionStorage.getItem("jobsPageScrollY");
    if (savedY) requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedY, 10), behavior: "instant" }));
    return () => {
      if (scrollSaveRef.current) sessionStorage.setItem("jobsPageScrollY", String(window.scrollY));
    };
  }, []);

  const openJob = (jobId) => { scrollSaveRef.current = true; navigate(`/jobs/${jobId}`); };

  const total = visibleJobs.length;
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set(loadStored(COLLAPSED_KEY) || []));
  useEffect(() => {
    saveStored(COLLAPSED_KEY, Array.from(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [showDone, setShowDone] = useState(false);

  // ── Mobile status bottom sheet ────────────────────────────────────────────
  const [statusSheet, setStatusSheet] = useState({ open: false, jobId: null });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => jobApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["jobs"] });
      const prev = qc.getQueryData(["jobs"]);
      qc.setQueryData(["jobs"], (old = []) =>
        old.map((j) => (j.id === id ? { ...j, status, updated_at: new Date().toISOString() } : j))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["jobs"], ctx.prev);
      toast.error(getApiErrorMessage(err, "Status ändern fehlgeschlagen"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"], exact: true });
    },
  });

  const handleStatusChange = (jobId, nextStatus) => {
    if (!nextStatus) {
      setStatusSheet({ open: true, jobId });
      return;
    }
    statusMutation.mutate({ id: jobId, status: nextStatus });
  };

  const visibleGroups = activeFilter === "alle"
    ? STATUS_GROUPS
    : STATUS_GROUPS.filter((g) => g.key === activeFilter);

  const hasVisibleRejected = (activeFilter === "alle" || activeFilter === "rejected") && grouped.rejected.length > 0;
  const hasAnyVisible = visibleGroups.some((g) => grouped[g.key]?.length > 0)
    || (hasVisibleRejected && (showDone || activeFilter === "rejected"));

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

      {/* ── Near-capacity notice ──────────────────────────────────── */}
      {total >= 480 && total < 500 && (
        <div className="rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] px-4 py-3 text-[12.5px] text-[var(--color-fg-muted)]">
          Deine Liste hat {total} Stellen. Bei 500 ist das Limit erreicht.
        </div>
      )}

      {/* ── Filter chips + sort toggle ───────────────────────────── */}
      {total > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {FILTER_CHIPS.map(({ key, label, dot, activeBg, activeBorder }) => {
              const count = key === "alle" ? total : (grouped[key]?.length ?? 0);
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilter(key)}
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
        </div>
      )}

      {/* ── Loading / Empty / Lists ─────────────────────────────────── */}
      {savedFetching && total === 0 ? (
        <RowSkeleton />
      ) : total === 0 ? (
        <EmptyState
          tone="subtle"
          title="Speichere eine Stelle, um sie hier zu sehen."
          description="Starte mit Empfehlungen oder einer eigenen Suche."
          icon={Sparkles}
          action={<Button onClick={() => navigate("/finden")}><Search className="w-3.5 h-3.5" />Stelle finden</Button>}
        />
      ) : (
        <div className="flex flex-col gap-5">

          {visibleGroups.map(({ key, label, dot }) => {
            const jobs = grouped[key];
            if (!jobs || jobs.length === 0) return null;
            const isCollapsed = collapsedGroups.has(key);
            return (
              <div key={key}>
                <SectionLabel
                  label={label}
                  count={jobs.length}
                  dot={dot}
                  collapsible
                  collapsed={isCollapsed}
                  onToggle={() => toggleGroup(key)}
                />
                {!isCollapsed && jobs.map((job, i) => (
                  <ThreadRow
                    key={job.id}
                    job={job}
                    isFirst={i === 0}
                    muted={mutedIds.has(job.id)}
                    onOpen={() => openJob(job.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            );
          })}

          {(activeFilter === "alle" || activeFilter === "rejected") && grouped.rejected.length > 0 && (
            <div>
              <SectionLabel
                label="Erledigt"
                count={grouped.rejected.length}
                dot={C.inkFaint}
                collapsible={activeFilter === "alle"}
                collapsed={activeFilter === "alle" ? !showDone : false}
                onToggle={() => setShowDone((v) => !v)}
              />
              {(showDone || activeFilter === "rejected") && grouped.rejected.map((job, i) => (
                <ThreadRow
                  key={job.id}
                  job={job}
                  isFirst={i === 0}
                  muted={mutedIds.has(job.id)}
                  onOpen={() => openJob(job.id)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}

          {!hasAnyVisible && <FilterEmptyState filter={activeFilter} />}

        </div>
      )}

      {/* ── Mobile status bottom sheet ───────────────────────────── */}
      <BottomSheet
        open={statusSheet.open}
        onClose={() => setStatusSheet({ open: false, jobId: null })}
        title="Status ändern"
      >
        <div className="flex flex-col gap-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                handleStatusChange(statusSheet.jobId, s.key);
                setStatusSheet({ open: false, jobId: null });
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
              <span style={{ color: C.ink }}>{s.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

    </div>
  );
}
