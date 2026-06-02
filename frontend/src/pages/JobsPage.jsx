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

const C = { ...DARK };

const FILTER_CHIPS = [
  { key: "alle",         label: "Alle",        dot: "#6B6B72" },
  { key: "interviewing", label: "Gespräch",    dot: "#7c7df0" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80" },
  { key: "applied",      label: "Beworben",    dot: "#60a5fa" },
  { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b" },
  { key: "rejected",     label: "Erledigt",    dot: "#9A9AA0" },
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
 * JobCard — clean card row: logo · title · company · status pill.
 */
function JobCard({ job, onOpen, onStatusChange }) {
  const role     = job.role || job.title || "Stelle";
  const company  = job.company || "";
  const location = job.location ? job.location.split(",")[0] : null;
  const timeLabel = timeAgoShort(job.updated_at || job.created_at);

  const statusConfig = ALL_STATUSES.find((s) => s.key === job.status) || ALL_STATUSES[0];

  return (
    <div
      onClick={() => onOpen()}
      className="group flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] cursor-pointer transition-all hover:border-[var(--color-accent-400)] hover:shadow-sm"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-fg-muted)] flex-shrink-0">
        {company.slice(0, 2).toUpperCase() || "JB"}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold text-[var(--color-fg)] truncate">{role}</h3>
        <p className="text-[12px] text-[var(--color-fg-muted)] mt-0.5">
          {company}{location ? ` · ${location}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: statusConfig.dot + "18", color: statusConfig.dot }}
        >
          {statusConfig.label}
        </span>
        {timeLabel && (
          <span className="text-[11px] text-[var(--color-fg-faint)]">{timeLabel}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: totalCached }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
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

  const { activeJobs, rejectedJobs } = useMemo(() => {
    const active = [];
    const rejected = [];
    savedJobs.forEach((j) => {
      if (j.status === "rejected") rejected.push(j);
      else active.push(j);
    });
    const sortByDate = (a, b) => {
      const da = new Date(a.updated_at || a.created_at).getTime() || 0;
      const db = new Date(b.updated_at || b.created_at).getTime() || 0;
      return db - da;
    };
    active.sort(sortByDate);
    rejected.sort(sortByDate);
    return { activeJobs: active, rejectedJobs: rejected };
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

  const filteredActive = activeFilter === "alle" || activeFilter === "rejected"
    ? activeJobs
    : activeJobs.filter((j) => j.status === activeFilter);
  const filteredRejected = activeFilter === "alle" || activeFilter === "rejected"
    ? rejectedJobs
    : [];
  const hasAnyVisible = filteredActive.length > 0 || filteredRejected.length > 0;

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

      {/* ── Filter chips ───────────────────────────── */}
      {total >= 10 && (
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map(({ key, label, dot }) => {
            const count = key === "alle" ? total : (grouped[key]?.length ?? 0);
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all border ${isActive ? "border-[var(--color-accent-400)] text-[var(--color-accent-600)] bg-[var(--color-accent-50)]" : "border-[var(--color-border)] text-[var(--color-fg-dim)] hover:border-[var(--color-border-strong)]"}`}
              >
                <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: dot }} />
                {label}
                <span className="text-[10.5px] font-semibold tabular-nums">{count}</span>
              </button>
            );
          })}
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
        <div className="flex flex-col gap-6">

          {/* Aktiv */}
          {filteredActive.length > 0 && (
            <div>
              <SectionLabel
                label={activeFilter === "alle" ? "Aktiv" : FILTER_CHIPS.find(c => c.key === activeFilter)?.label || "Aktiv"}
                count={filteredActive.length}
                dot={activeFilter === "alle" ? "#7c7df0" : FILTER_CHIPS.find(c => c.key === activeFilter)?.dot || "#7c7df0"}
                collapsible={false}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {filteredActive.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onOpen={() => openJob(job.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Erledigt */}
          {filteredRejected.length > 0 && (
            <div>
              <SectionLabel
                label="Erledigt"
                count={filteredRejected.length}
                dot="#9A9AA0"
                collapsible={activeFilter === "alle"}
                collapsed={activeFilter === "alle" ? !showDone : false}
                onToggle={() => setShowDone((v) => !v)}
              />
              {(showDone || activeFilter === "rejected") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {filteredRejected.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onOpen={() => openJob(job.id)}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
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
