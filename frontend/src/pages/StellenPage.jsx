import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bookmark, Send, MessageCircle, CheckCircle2, Archive,
  Search, Plus, Loader2, AlertCircle, RefreshCw, MapPin,
  CalendarDays, MoreHorizontal, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

import useFetch from "../hooks/useFetch";
import useMutation from "../hooks/useMutation";
import { Skel, useDelayedSkeleton, usePageTitle } from "../hooks/usePageChrome";
import { useBootstrap } from "../context/BootstrapContext";
import { jobApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import Popover from "../components/ui/Popover";

/* ── Tokens ── */
function T(n) { return `var(--app-${n})`; }

const BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt",     icon: Bookmark,      color: "var(--status-saved-icon)",     soft: "var(--status-saved-soft)",     chip: "#B45309" },
  { key: "applied",      label: "Beworben",    icon: Send,          color: "var(--status-applied)",        soft: "var(--status-applied-soft)",   chip: "#2563EB" },
  { key: "interviewing", label: "Im Gespräch", icon: MessageCircle, color: "var(--status-interview)",      soft: "var(--status-interview-soft)", chip: "#7C3AED" },
  { key: "offered",      label: "Angebot",     icon: CheckCircle2,  color: "var(--status-offered)",        soft: "var(--status-offered-soft)",   chip: "#16A34A" },
  { key: "archived",     label: "Erledigt",    icon: Archive,       color: "var(--status-archived)",       soft: "var(--status-archived-soft)",  chip: "#64748B" },
];

const JOB_TYPES = [
  { value: "", label: "Alle" }, { value: "Vollzeit", label: "Vollzeit" },
  { value: "Teilzeit", label: "Teilzeit" }, { value: "Praktikum", label: "Praktikum" },
  { value: "Lehre", label: "Lehre" },
];

/** Search sources exposed in the Stellen-Finder. `alle` = backend default (Adzuna). */
const SEARCH_SOURCES = [
  { value: "alle", label: "Alle Quellen", desc: "Adzuna + mehr" },
  { value: "willhaben", label: "willhaben", desc: "Nebenjobs & Kleinanzeigen" },
  { value: "karriere", label: "karriere.at", desc: "Größte österreichische Jobbörse" },
  { value: "jooble", label: "Jooble", desc: "Aggregiert viele Börsen" },
  { value: "ams", label: "AMS", desc: "Öffentlicher Jobmarkt" },
];

/** Map the backend `rejected` status to the frontend `archived` bucket. */
function normalizeStatus(status) {
  return status === "rejected" ? "archived" : status || "bookmarked";
}

const BUCKET_BY_KEY = Object.fromEntries(BUCKETS.map((b) => [b.key, b]));

/* ── PipelineRow — one compact, useful job row ── */
function PipelineRow({ job, onStatusChange, isLast }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const statusKey = normalizeStatus(job.status);
  const bucket = BUCKET_BY_KEY[statusKey] || BUCKETS[0];
  const StatusIcon = bucket.icon;
  const role = job.role || job.title || "Stelle";
  const company = job.company || "";
  const location = job.location || "";
  const date = job.updated_at || job.created_at;
  const dateStr = date
    ? new Date(date).toLocaleDateString("de-AT", { day: "numeric", month: "short" })
    : "";

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={`${role} bei ${company || "Unbekannt"}, ${bucket.label}`}
      className="interactive-row group flex items-center gap-3.5 py-3 px-3 sm:px-4 rounded-lg focus:outline-none cursor-pointer"
      style={{
        borderBottom: isLast ? "none" : `1px solid ${T("border-subtle")}`,
      }}
      onClick={() => navigate(`/jobs/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/jobs/${job.id}`); }
      }}
    >
      {/* Semantic icon chip */}
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bucket.soft }}
      >
        <StatusIcon className="w-[17px] h-[17px]" style={{ color: bucket.color }} />
      </span>

      {/* Identity */}
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-medium truncate" style={{ color: T("text") }}>{role}</span>
        <span className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[12px] mt-0.5" style={{ color: T("text-muted") }}>
          {company && <span className="truncate">{company}</span>}
          {location && (
            <span className="inline-flex items-center gap-0.5 min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          )}
          {dateStr && (
            <span className="inline-flex items-center gap-0.5 flex-shrink-0">
              <CalendarDays className="w-3 h-3" />
              {dateStr}
            </span>
          )}
        </span>
      </span>

      {/* Status badge */}
      <span
        className="hidden sm:inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium flex-shrink-0"
        style={{ color: bucket.chip, background: bucket.soft }}
      >
        {bucket.label}
      </span>

      {/* Quick status change */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          ref={menuBtnRef}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="h-8 w-8 grid place-items-center rounded-md transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
          style={{ color: T("text-faint") }}
          aria-label={`Status ändern: ${bucket.label}`}
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <Popover open={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={menuBtnRef} align="right" className="rounded-lg border py-1.5 min-w-[168px] animate-slide-up">
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: T("text-faint") }}>
            Status ändern
          </p>
          {BUCKETS.map((b) => {
            const isCurrent = statusKey === b.key;
            const Icon = b.icon;
            return (
              <button
                key={b.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onStatusChange(job.id, b.key); }}
                disabled={isCurrent}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12.5px] text-left transition-colors disabled:opacity-40"
                style={{ color: isCurrent ? T("text") : T("text-secondary") }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isCurrent ? b.chip : b.color }} />
                {b.label}
                {isCurrent && <ChevronDown className="w-3 h-3 ml-auto rotate-180" style={{ color: T("text-faint") }} />}
              </button>
            );
          })}
        </Popover>
      </div>
    </div>
  );
}

function PipelineRowSkeleton({ isLast }) {
  return (
    <div
      className="flex items-center gap-3.5 py-3 px-3 sm:px-4"
      style={{ borderBottom: isLast ? "none" : `1px solid ${T("border-subtle")}` }}
    >
      <Skel className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1">
        <Skel className="w-52 h-4 mb-1.5" />
        <Skel className="w-36 h-3" />
      </div>
      <Skel className="w-20 h-6 rounded-full flex-shrink-0" />
      <Skel className="w-8 h-8 rounded-md flex-shrink-0" />
    </div>
  );
}

/* ── FindenTab ── */
function FindenTab({ onSaved }) {
  const [keywords, setKeywords] = useState("");
  const [jobType, setJobType] = useState("");
  const [source, setSource] = useState("alle");
  const [submitted, setSubmitted] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const searchIdRef = useRef(0);

  const results = useMemo(() => {
    const d = searchData?.items ?? searchData?.results ?? searchData ?? [];
    return Array.isArray(d) ? d : [];
  }, [searchData]);

  const runSearch = async (kw, jt) => {
    const id = ++searchIdRef.current;
    setIsFetching(true);
    setSearchError(null);
    try {
      const call = (fn) => fn(kw, "", 1);
      const res = await (source === "willhaben" ? call(jobApi.searchWillhaben)
        : source === "karriere" ? call(jobApi.searchKarriere)
        : source === "jooble" ? call(jobApi.searchJooble)
        : source === "ams" ? call(jobApi.searchAms)
        : jobApi.searchCustom(kw, "", jt, 1));
      if (id !== searchIdRef.current) return; // stale — a newer search won
      setSearchData(res.data);
      setIsFetching(false);
    } catch {
      if (id !== searchIdRef.current) return;
      setSearchData(null);
      setSearchError("Die Suche ist fehlgeschlagen. Bitte prüfe deine Verbindung und versuche es erneut.");
      setIsFetching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setSubmitted({ keywords: keywords.trim(), jobType, source });
    runSearch(keywords.trim(), jobType);
  };

  const saveMutation = useMutation((job) => jobApi.create({
    role: job.title || job.role,
    company: job.company || "",
    description: job.description || "",
    url: job.full_url || job.url || "",
    status: "bookmarked",
  }));

  const handleSave = async (job) => {
    try {
      await saveMutation.mutate(job);
      toast.success("Stelle gespeichert");
      onSaved();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Speichern fehlgeschlagen"));
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T("text-faint") }} />
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Stichwort, Firma, Beruf…"
            className="w-full h-11 pl-10 pr-4 rounded-lg border text-[14px] outline-none transition-colors focus:ring-2 focus:ring-[var(--app-focus-ring)]/30"
            style={{ borderColor: T("border"), background: T("surface"), color: T("text") }}
          />
        </div>
        <button
          type="submit"
          disabled={isFetching || !keywords.trim()}
          className="btn btn-primary h-11 px-6 rounded-lg text-[14px] gap-2 flex-shrink-0"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isFetching ? "Suche…" : "Suchen"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {JOB_TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setJobType(t.value)}
            className="h-8 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer"
            style={{
              color: jobType === t.value ? "#b30010" : T("text-muted"),
              borderColor: jobType === t.value ? "var(--app-brand)" : T("border"),
              background: jobType === t.value ? "color-mix(in srgb, var(--app-brand) 8%, transparent)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide mr-1" style={{ color: T("text-faint") }}>Quelle</span>
        {SEARCH_SOURCES.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSource(s.value)}
            title={s.desc}
            aria-pressed={source === s.value}
            className="h-7 px-3 rounded-md text-[12px] font-medium border transition-colors cursor-pointer"
            style={{
              color: source === s.value ? "#b30010" : T("text-muted"),
              borderColor: source === s.value ? "var(--app-brand)" : T("border"),
              background: source === s.value ? "color-mix(in srgb, var(--app-brand) 8%, transparent)" : "transparent",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!submitted && !isFetching && (
        <div className="rounded-xl border overflow-hidden grid grid-cols-12" style={{ borderColor: T("border"), background: T("surface") }}>
          <div className="col-span-12 md:col-span-7 px-7 py-10 flex flex-col justify-center">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] mb-2" style={{ color: T("text") }}>Wonach suchst du?</h2>
            <p className="text-[13.5px] leading-relaxed max-w-md" style={{ color: T("text-secondary") }}>
              Gib einen Jobtitel, ein Stichwort oder eine Firma ein und wir durchsuchen die wichtigsten österreichischen Jobbörsen für dich.
            </p>
            <p className="mt-4 text-[11.5px]" style={{ color: T("text-faint") }}>
              Quellen: Adzuna (Standard), willhaben.at, karriere.at, Jooble, AMS
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 min-h-[140px] flex items-center justify-center px-5 py-5"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--app-brand) 6%, var(--app-surface)) 0%, color-mix(in srgb, var(--app-border-subtle) 75%, var(--app-surface)) 100%)",
              borderLeft: "1px solid var(--app-border-subtle)",
            }}>
            <img src="/illustrations/job-search.png" alt="" className="w-[150px] h-[150px] object-contain pointer-events-none" />
          </div>
        </div>
      )}

      {/* In-flight search: skeleton result rows, not a blank page */}
      {submitted && isFetching && (
        <div className="flex flex-col">
          <p className="text-[12px] mb-2" style={{ color: T("text-muted") }}>
            Suche nach „{submitted.keywords}“… {submitted.jobType ? `(${JOB_TYPES.find((t) => t.value === submitted.jobType)?.label})` : ""}
            {submitted.source && submitted.source !== "alle" ? ` · ${SEARCH_SOURCES.find((s) => s.value === submitted.source)?.label || ""}` : ""}
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: T("border"), background: T("surface") }}>
            {[0, 1, 2, 3].map((i) => (
              <PipelineRowSkeleton key={i} isLast={i === 3} />
            ))}
          </div>
        </div>
      )}

      {submitted && !isFetching && results.length > 0 && (
        <div className="flex flex-col">
          <p className="text-[12px] mb-2" style={{ color: T("text-muted") }}>
            <span className="font-semibold" style={{ color: T("text") }}>{results.length}</span>{" "}
            Treffer
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: T("border"), background: T("surface") }}>
            {results.map((job, i) => {
              const title = job.title || job.role || "Stelle";
              const company = job.company || "";
              const type = job.job_type || "";
              return (
                <div
                  key={job.source_id || i}
                  className="flex items-center gap-4 py-3.5 px-4 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  style={{ borderBottom: `1px solid ${T("border-subtle")}` }}
                  onClick={() => { if (job.full_url || job.url) window.open(job.full_url || job.url, "_blank", "noopener,noreferrer"); }}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ color: T("text-muted"), background: T("surface-hover") }}>
                    {company.slice(0, 2).toUpperCase() || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: T("text") }}>{title}</p>
                    <p className="text-[11.5px] truncate mt-0.5" style={{ color: T("text-muted") }}>
                      {company}{type ? ` · ${type}` : ""}{job.location ? ` · ${job.location}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSave(job); }}
                    className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border transition-colors flex-shrink-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    style={{ borderColor: T("border"), color: T("text-secondary") }}
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    Merken
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submitted && !isFetching && searchError && (
        <div
          className="flex items-center gap-4 rounded-lg px-4 py-3 mb-3"
          role="alert"
          style={{ background: T("error-soft"), borderLeft: `3px solid ${T("error")}` }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: T("error") }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: T("text") }}>
              Suche fehlgeschlagen.
            </p>
            <p className="text-[12px]" style={{ color: T("text-muted") }}>{searchError}</p>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="btn btn-secondary h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {submitted && !isFetching && !searchError && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border" style={{ borderColor: T("border"), background: T("surface") }}>
          <Search className="w-7 h-7 mb-3" style={{ color: T("text-faint") }} />
          <h2 className="text-[16px] font-semibold mb-2" style={{ color: T("text") }}>Keine passenden Stellen gefunden</h2>
          <p className="text-[13px] max-w-[340px] text-center" style={{ color: T("text-muted") }}>
            Versuche andere Suchbegriffe oder einen breiteren Jobtyp.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── StellenPage ── */
export default function StellenPage() {
  usePageTitle("Stellen");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "finden" ? "finden" : "meine";
  const [tab, setTab] = useState(initialTab);
  const [rowSearch, setRowSearch] = useState("");

  // Sync tab from URL when browser back/forward changes searchParams.
  useEffect(() => {
    const urlTab = searchParams.get("tab") === "finden" ? "finden" : "meine";
    setTab(urlTab);
  }, [searchParams]);

  const { data: jobsRaw, loading, error, reload } = useFetch(
    () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    { cacheKey: "jobs:list", maxAge: 30_000 }
  );

  const jobs = useMemo(() => (Array.isArray(jobsRaw) ? jobsRaw : []), [jobsRaw]);
  const jobsLoading = loading && jobs.length === 0;

  // Bootstrap job count — lets the empty state render immediately (no skeleton
  // flash) when the user genuinely has 0 jobs.
  const { init } = useBootstrap();
  const bootstrapEmpty = init?.jobs_total === 0;

  const hasJobs = jobs.length > 0;
  const settledEmpty = !loading && !error && jobs.length === 0;
  const failed = error && jobs.length === 0 && !bootstrapEmpty;
  const showSkeleton = useDelayedSkeleton(!bootstrapEmpty && jobsLoading);

  const statusMutation = useMutation(({ id, status }) => jobApi.updateStatus(id, status));

  const handleStatusChange = async (id, status) => {
    try {
      await statusMutation.mutate({ id, status });
      reload();
    } catch {
      toast.error("Status-Änderung fehlgeschlagen");
    }
  };

  const statusFilter = searchParams.get("status");

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (statusFilter) result = result.filter((j) => normalizeStatus(j.status) === statusFilter);
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      result = result.filter((j) =>
        (j.role || "").toLowerCase().includes(q) ||
        (j.company || "").toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q)
      );
    }
    return [...result].sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
  }, [jobs, statusFilter, rowSearch]);

  const switchTab = (t) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    next.delete("status");
    setSearchParams(next, { replace: true });
  };

  const selectStatus = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("status");
    else next.set("status", key);
    next.set("tab", "meine");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: T("text") }}>
            {tab === "finden" ? "Jobs finden" : "Meine Stellen"}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: T("text-muted") }}>
            {tab === "finden"
              ? "Durchsuche karriere.at, willhaben.at, AMS und mehr"
              : hasJobs
                ? `${jobs.length} ${jobs.length === 1 ? "Stelle" : "Stellen"} gespeichert`
                : settledEmpty || bootstrapEmpty
                  ? "0 Stellen gespeichert"
                  : "Stellen werden geladen…"
            }
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: T("border"), background: T("surface-hover") }}>
          {[
            { key: "meine", label: "Meine Stellen" },
            { key: "finden", label: "Finden" },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className="h-8 px-3.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer"
              style={{
                color: tab === t.key ? T("text") : T("text-muted"),
                background: tab === t.key ? T("surface") : "transparent",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "finden" ? <FindenTab onSaved={reload} /> : (
        hasJobs ? (
          <div className="flex flex-col gap-5">
            {/* Status filter chips — read from ?status=, drive the URL */}
            <div className="flex flex-wrap items-center gap-2">
              {[{ key: "all", label: "Alle" }, ...BUCKETS].map((b) => {
                const active = (statusFilter ?? "all") === b.key;
                const count = b.key === "all"
                  ? jobs.length
                  : jobs.filter((j) => normalizeStatus(j.status) === b.key).length;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => selectStatus(b.key)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer"
                    style={{
                      borderColor: active ? (b.key === "all" ? "var(--app-brand)" : b.chip) : T("border"),
                      background: active
                        ? (b.key === "all" ? "var(--app-brand-soft)" : `${b.chip}14`)
                        : "transparent",
                      color: active ? (b.key === "all" ? "#b30010" : b.chip) : T("text-muted"),
                    }}
                  >
                    {b.label}
                    <span className="text-[11px] tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* In-list search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T("text-faint") }} />
              <input
                type="text"
                value={rowSearch}
                onChange={(e) => setRowSearch(e.target.value)}
                placeholder="In gespeicherten Stellen suchen…"
                className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] border outline-none transition-colors focus:ring-2 focus:ring-[var(--app-focus-ring)]/30"
                style={{ borderColor: T("border"), background: T("surface"), color: T("text") }}
              />
            </div>

            {/* Pipeline list — one surface */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: T("border-subtle"), background: T("surface") }}>
              {showSkeleton ? (
                [0, 1, 2, 3].map((i) => <PipelineRowSkeleton key={i} isLast={i === 3} />)
              ) : filteredJobs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[14px] mb-1.5" style={{ color: T("text-muted") }}>
                    {rowSearch ? "Keine Treffer für deine Suche." : "Keine Stellen in dieser Kategorie."}
                  </p>
                  {!rowSearch && statusFilter && (
                    <button
                      type="button"
                      onClick={() => selectStatus("all")}
                      className="btn btn-link text-[13px]"
                    >
                      Alle anzeigen
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col px-1.5 py-1.5" role="list">
                  {filteredJobs.map((job, i) => (
                    <PipelineRow
                      key={job.id || i}
                      job={job}
                      isLast={i === filteredJobs.length - 1}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : failed ? (
          <div
            className="flex items-center gap-4 rounded-lg px-4 py-3"
            style={{ background: T("error-soft"), borderLeft: `3px solid ${T("error")}` }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: T("error") }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: T("text") }}>Stellen konnten nicht geladen werden.</p>
              <p className="text-[12px]" style={{ color: T("text-muted") }}>Überprüfe deine Verbindung und versuche es erneut.</p>
            </div>
            <button
              type="button"
              onClick={() => reload()}
              className="btn btn-secondary h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Erneut versuchen
            </button>
          </div>
        ) : settledEmpty || bootstrapEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border" style={{ borderColor: T("border"), background: T("surface") }}>
            <img src="/illustrations/job-search.png" alt="" className="w-[180px] h-[180px] object-contain mb-6 pointer-events-none" />
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: T("text") }}>Noch keine Stellen gespeichert</h2>
            <p className="text-[14px] max-w-[360px] text-center mb-6" style={{ color: T("text-muted") }}>
              Finde passende Stellen und behalte interessante Positionen hier im Blick.
            </p>
            <button
              type="button"
              onClick={() => switchTab("finden")}
              className="btn btn-primary btn-lg gap-2"
            >
              <Search className="w-4 h-4" /> Jobs finden
            </button>
          </div>
        ) : null
      )}
    </div>
  );
}
