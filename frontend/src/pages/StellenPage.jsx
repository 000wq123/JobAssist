import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bookmark, Send, MessageCircle, CheckCircle2, Archive,
  Search, Plus, Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

import useUsageGuard from "../hooks/useUsageGuard";
import useFetch from "../hooks/useFetch";
import useMutation from "../hooks/useMutation";
import { Skel, useDelayedSkeleton, usePageTitle } from "../hooks/usePageChrome";
import { useBootstrap } from "../context/BootstrapContext";
import { jobApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

/* ── Tokens ── */
function T(n) { return `var(--app-${n})`; }

const BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt",    icon: Bookmark,      color: "#f59e0b" },
  { key: "applied",      label: "Beworben",   icon: Send,          color: "#3b82f6" },
  { key: "interviewing", label: "Im Gespräch", icon: MessageCircle, color: "#8b5cf6" },
  { key: "offered",      label: "Angebot",    icon: CheckCircle2,  color: "#22c55e" },
  { key: "archived",     label: "Erledigt",   icon: Archive,       color: "#6b7280" },
];

const JOB_TYPES = [
  { value: "", label: "Alle" }, { value: "Vollzeit", label: "Vollzeit" },
  { value: "Teilzeit", label: "Teilzeit" }, { value: "Praktikum", label: "Praktikum" },
  { value: "Lehre", label: "Lehre" },
];

/* ── JobCard ── */
function JobCard({ job, onStatusChange }) {
  const navigate = useNavigate();
  const role = job.role || job.title || "Stelle";
  const company = job.company || "";
  const date = job.updated_at || job.created_at;
  const dateStr = date ? new Date(date).toLocaleDateString("de-AT", { day: "numeric", month: "short" }) : "";

  return (
    <div
      className="rounded-lg border p-3.5 mb-2.5 cursor-pointer transition-colors hover:border-[var(--app-border-strong)]"
      style={{ borderColor: T("border"), background: T("surface") }}
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: T("text") }}>{role}</p>       <p className="text-[11.5px] mb-2.5" style={{ color: T("text-muted") }}>{company}{dateStr ? ` · ${dateStr}` : ""}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {BUCKETS.filter(b => b.key !== (job.status || "bookmarked")).slice(0, 3).map(b => (
          <button
            key={b.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, b.key); }}
            className="h-7 w-7 grid place-items-center rounded-md transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            title={b.label}
            style={{ color: T("text-faint") }}
          >
            <b.icon className="w-3 h-3" style={{ color: b.color }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── KanbanColumn ── */
function KanbanColumn({ bucket, jobs, onStatusChange }) {
  return (
    <div className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <bucket.icon className="w-[14px] h-[14px]" style={{ color: bucket.color }} />
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: T("text-secondary") }}>
          {bucket.label}
        </h3>
        <span className="text-[11px] font-medium ml-auto px-1.5 py-0.5 rounded" style={{ color: T("text-muted"), background: T("surface-hover") }}>
          {jobs.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 px-3 text-center" style={{ borderColor: T("border") }}>
            <p className="text-[11px]" style={{ color: T("text-faint") }}>Keine</p>
          </div>
        ) : (
          jobs.map(job => <JobCard key={job.id} job={job} onStatusChange={onStatusChange} />)
        )}
      </div>
    </div>
  );
}

/* ── FindenTab ── */
function FindenTab({ onSaved }) {
  const [keywords, setKeywords] = useState("");
  const [jobType, setJobType] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const searchIdRef = useRef(0);

  const results = useMemo(() => {
    const d = searchData?.items ?? searchData?.results ?? searchData ?? [];
    return Array.isArray(d) ? d : [];
  }, [searchData]);

  const runSearch = async (kw, jt) => {
    const id = ++searchIdRef.current;
    setIsFetching(true);
    try {
      const res = await jobApi.searchCustom(kw, "", jt, 1);
      if (id !== searchIdRef.current) return; // stale — a newer search won
      setSearchData(res.data);
      setIsFetching(false);
    } catch {
      if (id !== searchIdRef.current) return;
      setSearchData(null);
      setIsFetching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setSubmitted({ keywords: keywords.trim(), jobType });
    runSearch(keywords.trim(), jobType);
  };

  const { guardedRun } = useUsageGuard("job_search");

  const saveMutation = useMutation((job) => jobApi.create({
    role: job.title || job.role,
    company: job.company || "",
    description: job.description || "",
    url: job.full_url || job.url || "",
    status: "bookmarked",
  }));

  const handleSave = (job) => {
    guardedRun(async () => {
      try {
        await saveMutation.mutate(job);
        toast.success("Stelle gespeichert");
        onSaved();
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Speichern fehlgeschlagen"));
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
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
            className="h-8 px-3 rounded-full text-[12px] font-medium border transition-colors"
            style={{
              color: jobType === t.value ? T("accent") : T("text-muted"),
              borderColor: jobType === t.value ? "var(--app-brand)" : T("border"),
              background: jobType === t.value ? "color-mix(in srgb, var(--app-brand) 8%, transparent)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="flex flex-col">
          {results.map((job, i) => {
            const title = job.title || job.role || "Stelle";
            const company = job.company || "";
            const type = job.job_type || "";
            return (
              <div
                key={job.source_id || i}
                className="flex items-center gap-4 py-3.5"
                style={{ borderBottom: `1px solid ${T("border")}` }}
              >
                <div className="w-9 h-9 rounded-md flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ color: T("text-muted"), background: T("surface-hover") }}>
                  {company.slice(0, 2).toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: T("text") }}>{title}</p>
                  <p className="text-[11.5px] truncate mt-0.5" style={{ color: T("text-muted") }}>
                    {company}{type ? ` · ${type}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(job)}
                  className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border transition-colors flex-shrink-0"
                  style={{ borderColor: T("border"), color: T("text-secondary") }}
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Merken
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!submitted && !isFetching && (
        <div className="flex flex-col items-center justify-center py-16">
          <img src="/illustrations/job-search.png" alt="" className="w-[180px] h-[180px] object-contain mb-6 pointer-events-none" />
          <h2 className="text-[17px] font-semibold mb-2" style={{ color: T("text") }}>Wonach suchst du?</h2>
          <p className="text-[13px] max-w-[340px] text-center" style={{ color: T("text-muted") }}>
            Gib einen Jobtitel, ein Stichwort oder eine Firma ein und wir durchsuchen die wichtigsten österreichischen Jobbörsen für dich.
          </p>
        </div>
      )}

      {submitted && !isFetching && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
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

  // Sync tab from URL when browser back/forward changes searchParams.
  useEffect(() => {
    const urlTab = searchParams.get("tab") === "finden" ? "finden" : "meine";
    setTab(urlTab);
  }, [searchParams]);

  const { data: jobsRaw, loading, error, reload } = useFetch(
    () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    { cacheKey: "jobs:list" }
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

  const bucketJobs = useMemo(() => {
    const grouped = {};
    BUCKETS.forEach(b => { grouped[b.key] = []; });
    let filtered = jobs;
    if (statusFilter) filtered = jobs.filter(j => (j.status || "bookmarked") === statusFilter);
    filtered.forEach(j => {
      const key = j.status || "bookmarked";
      if (grouped[key]) grouped[key].push(j);
    });
    return grouped;
  }, [jobs, statusFilter]);

  const switchTab = (t) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: T("text") }}>
            {tab === "finden" ? "Jobs finden" : "Stellen"}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: T("text-muted") }}>
            {tab === "finden"
              ? "Durchsuche karriere.at, willhaben.at, AMS und mehr"
              : hasJobs
                ? `${jobs.length} Stellen gespeichert`
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
              className="h-8 px-3.5 rounded-md text-[13px] font-medium transition-colors"
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
          <div className="flex gap-4 overflow-x-auto pb-4">
            {BUCKETS.map(b => (
              <KanbanColumn
                key={b.key}
                bucket={b}
                jobs={bucketJobs[b.key] || []}
                onStatusChange={handleStatusChange}
              />
            ))}
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
          <div className="flex flex-col items-center justify-center py-16">
            <img src="/illustrations/job-search.png" alt="" className="w-[200px] h-[200px] object-contain mb-6 pointer-events-none" />
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: T("text") }}>Noch keine Stellen</h2>
            <p className="text-[14px] max-w-[360px] text-center mb-6" style={{ color: T("text-muted") }}>
              Nutze die Suche, um passende Stellen zu finden und zu speichern.
            </p>
            <button
              type="button"
              onClick={() => switchTab("finden")}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-[14px] font-semibold"
              style={{ background: T("brand"), color: "#fff" }}
            >
              <Search className="w-4 h-4" /> Jobs finden
            </button>
          </div>
        ) : showSkeleton ? (
          /* ── Kanban-frame skeleton — page structure visible immediately ── */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {BUCKETS.map(b => (
              <div key={b.key} className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Skel className="w-[14px] h-[14px] rounded" />
                  <Skel className="w-20 h-3" />
                  <Skel className="w-6 h-4 rounded ml-auto" />
                </div>
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-lg border p-3.5 mb-2.5" style={{ borderColor: T("border"), background: T("surface") }}>
                    <Skel className="w-[80%] h-4 mb-2" />
                    <Skel className="w-[60%] h-3 mb-2.5" />
                    <div className="flex gap-1.5">
                      <Skel className="w-7 h-7 rounded-md" />
                      <Skel className="w-7 h-7 rounded-md" />
                      <Skel className="w-7 h-7 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
