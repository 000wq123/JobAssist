/**
 * JobDetailPage — pure v7 detail surface.
 *
 * Visual spec: see /demo/v7/index.html.
 * Sub-components live in ../components/job-detail/ to keep this file focused
 * on data fetching, state management, and page-level layout.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ChevronLeft, ChevronRight, ExternalLink, Trash2,
  FileText, MessageSquare, SearchCheck, BarChart2,
  MoreHorizontal, Edit3, ChevronDown,
} from "lucide-react";

import {
  coverLetterApi, jobApi, kvWageApi, researchApi, resumeApi,
} from "../services/api";
import ResearchModal from "../components/ResearchModal";
import {
  parseSalary, daysUntil, kvMinimumFor, categoryLabel,
} from "../components/job-detail/domain";
import { formatEuro } from "../utils/format";

/** Lookup cached KV wage for a category. Falls back to hardcoded floor. */
function useKvWage(category) {
  const { data } = useQuery({
    queryKey: ["kv-wages"],
    queryFn: () => kvWageApi.list().then((r) => r.data),
    staleTime: Infinity,
  });
  const found = data?.find((w) => w.category === (category || "").toLowerCase());
  return found ? { min: found.hourly_min, max: found.hourly_max, kv: found.kollektivvertrag } : { min: kvMinimumFor(category), max: null, kv: "KV" };
}
import {
  Spinner, ToolBtn, KpiTile, DescriptionBody,
} from "../components/job-detail/ui";
import CompanyLogo from "../components/job-detail/CompanyLogo";
import KvBar from "../components/job-detail/KvBar";
import SimilarJobsCard from "../components/job-detail/SimilarJobsCard";
import SalaryCompareModal from "../components/job-detail/SalaryCompareModal";
import MatchCard from "../components/job-detail/MatchCard";
import BearbeitenSheet from "../components/job-detail/BearbeitenSheet";
import InterviewSheet from "../components/job-detail/InterviewSheet";
import CoverLetterModal from "../components/job-detail/CoverLetterModal";
import CoursesCard from "../components/job-detail/CoursesCard";
import Popover from "../components/ui/Popover";

// ─── Local storage helpers ───────────────────────────────────────────────────

const loadStored = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; } };
const saveStored = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ } };

/** Lightweight click-outside hook for the toolbar dropdowns. */
function useClickOutside(ref, onClose, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onClose, active]);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedResume, setSelectedResume] = useState(null);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [salaryCompareOpen, setSalaryCompareOpen] = useState(false);
  const [desktopStatusOpen, setDesktopStatusOpen] = useState(false);
  const matchCardRef = useRef(null);
  const mobileToolBtnRef = useRef(null);
  const desktopStatusBtnRef = useRef(null);

  const { data: initData } = useQuery({ queryKey: ["init"], enabled: false });

  const updateJobCaches = (nextJob) => {
    if (!nextJob) return;
    queryClient.setQueryData(["jobs", jobId], nextJob);
    queryClient.setQueryData(["jobs", Number(jobId)], nextJob);
    queryClient.setQueryData(["jobs"], (old = []) => old.map((e) => String(e.id) === String(nextJob.id) ? nextJob : e));
    const allJobs = loadStored("jobs") || [];
    const merged = allJobs.some((e) => String(e.id) === String(nextJob.id))
      ? allJobs.map((e) => String(e.id) === String(nextJob.id) ? nextJob : e)
      : [nextJob, ...allJobs];
    saveStored("jobs", merged);
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId).then((res) => { updateJobCaches(res.data); return res.data; }),
    placeholderData: () =>
      queryClient.getQueryData(["jobs"])?.find((e) => String(e.id) === String(jobId)) ||
      loadStored("jobs")?.find((e) => String(e.id) === String(jobId)),
  });

  const { data: resumesQuery = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((res) => { saveStored("resumes", res.data); return res.data; }),
    initialData: () => queryClient.getQueryData(["resumes"]) || initData?.resumes || loadStored("resumes"),
  });

  const resumes = resumesQuery?.length ? resumesQuery : initData?.resumes || loadStored("resumes") || [];
  const resumeId = selectedResume ?? resumes[0]?.id;
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["jobs"], exact: true });

  useEffect(() => {
    const rid = searchParams.get("resumeId");
    if (rid && selectedResume == null) setSelectedResume(Number(rid));
  }, [searchParams, selectedResume]);

  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); setCoverLetterOpen(true); toast.success("Anschreiben erstellt"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Anschreiben konnte nicht erstellt werden"),
  });

  const interviewMutation = useMutation({
    mutationFn: () => jobApi.generateInterviewPrep(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches({ ...(queryClient.getQueryData(["jobs", jobId]) || job || {}), ...res.data });
      invalidateJobs();
      toast.success("Gesprächsvorbereitung erstellt");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Gesprächsvorbereitung fehlgeschlagen"),
  });

  const matchMutation = useMutation({
    mutationFn: () => {
      if (!resumeId) throw new Error("Kein Lebenslauf ausgewählt");
      return jobApi.match(Number(jobId), resumeId);
    },
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); toast.success("Passung berechnet"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Passung konnte nicht berechnet werden"),
  });

  const coursesMutation = useMutation({
    mutationFn: () => jobApi.courses(Number(jobId), resumeId ?? null),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); toast.success("Kursvorschläge erstellt"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Kursvorschläge konnten nicht erstellt werden"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { toast.success("Stelle gelöscht"); navigate("/jobs"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Löschen fehlgeschlagen"),
  });

  const updateMetaMutation = useMutation({
    mutationFn: async (data) => {
      const calls = [];
      if ("deadline" in data) calls.push(jobApi.updateDeadline(jobId, data.deadline));
      if ("notes"    in data) calls.push(jobApi.updateNotes(jobId, data.notes));
      const results = await Promise.all(calls);
      return results[results.length - 1];
    },
    onSuccess: (res) => { if (res?.data) updateJobCaches(res.data); toast.success("Aktualisiert"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Aktualisierung fehlgeschlagen"),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => jobApi.updateStatus(jobId, status),
    onMutate: (status) => {
      const prev = queryClient.getQueryData(["jobs", jobId]);
      const prevList = queryClient.getQueryData(["jobs"]);
      const optimistic = { ...(prev || job || {}), status };
      queryClient.setQueryData(["jobs", jobId], optimistic);
      queryClient.setQueryData(["jobs", Number(jobId)], optimistic);
      queryClient.setQueryData(["jobs"], (old = []) => old.map((e) => String(e.id) === String(jobId) ? optimistic : e));
      return { prev, prevList };
    },
    onSuccess: (res) => { if (res?.data) updateJobCaches(res.data); },
    onError: (err, _status, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["jobs", jobId], ctx.prev);
        queryClient.setQueryData(["jobs", Number(jobId)], ctx.prev);
      }
      if (ctx?.prevList) queryClient.setQueryData(["jobs"], ctx.prevList);
      toast.error(err.response?.data?.detail || "Status konnte nicht aktualisiert werden");
    },
  });

  const handleResearch = async () => {
    if (job?.research_data) { setResearchData(JSON.parse(job.research_data)); setResearchOpen(true); return; }
    setResearchData(null); setResearchOpen(true); setResearchLoading(true);
    try {
      const res = await researchApi.research(job?.company || "", job?.description || "");
      setResearchData(res.data);
      updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
    } catch (err) {
      if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
        toast.error(err.response?.data?.detail || "Recherche fehlgeschlagen");
      }
      setResearchOpen(false);
    } finally { setResearchLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-[var(--color-fg-dim)] gap-2">
        <Spinner /> <span className="text-[13px]">Wird geladen…</span>
      </div>
    );
  }
  if (!job) {
    return <div className="py-16 text-center text-[var(--color-error)] font-medium">Stelle nicht gefunden.</div>;
  }

  const allJobs = queryClient.getQueryData(["jobs"]) || loadStored("jobs") || [];
  const salary       = parseSalary(job.salary_text);
  const hourly       = salary?.unit === "hour" ? salary.amount : null;
  const kvData       = useKvWage(job.category);
  const kvMin        = kvData.min;
  const kvMax        = kvData.max;
  const kvName       = kvData.kv;
  const monthlyEst   = hourly ? Math.round(hourly * 8 * 4.3) : null;
  const deadlineDays = daysUntil(job.deadline || job.expires_at);
  const showDeadline = deadlineDays !== null;
  const deadlineWarn = deadlineDays !== null && deadlineDays <= 7;
  const urlExpired   = deadlineDays !== null && deadlineDays < 0;
  const [city, ...rest] = (job.location || "").split(",");
  const locRest        = rest.join(",").trim();

  const kpiCount =
    (job.location ? 1 : 0) +
    (job.category ? 1 : 0) +
    (showDeadline ? 1 : 0) +
    (job.salary_text && !salary ? 1 : 0);
  const showKpis = kpiCount >= 2;

  const savedAt   = job.created_at;
  const daysSaved = savedAt ? Math.max(0, Math.floor((Date.now() - new Date(savedAt).getTime()) / (1000 * 60 * 60 * 24))) : null;
  const kvMonthly = !salary ? Math.round(kvMin * 15 * 4.3) : null;
  const kvCeiling = kvMax || kvMin * 1.2;


  return (
    <>
      <div key={jobId} className="animate-slide-up">
        {/* Sticky toolbar */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 py-2.5 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-7 sm:col-span-7 min-w-0 grid grid-cols-[auto_auto_1fr] items-center gap-2">
              <button onClick={() => navigate("/jobs")} className="grid grid-cols-[auto_auto] items-center gap-1 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]">
                <ChevronLeft className="w-3.5 h-3.5" /><span>Stellen</span>
              </button>
              <ChevronRight className="w-3 h-3 text-[var(--color-fg-faint)]" aria-hidden="true" />
              <p className="text-[12px] text-[var(--color-fg-muted)] truncate">{job.company || "Stelle"}</p>
            </div>
            <div className="col-span-5 sm:col-span-5 justify-self-end flex items-center gap-0.5">
              <div className="sm:hidden">
                <button type="button" onClick={() => setMobileToolOpen((o) => !o)} aria-label="Mehr Aktionen" className="inline-flex flex-col items-center justify-center gap-0.5 h-10 px-2 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors min-w-[32px]" ref={mobileToolBtnRef}>
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" /><span className="text-[9px] font-medium leading-none">Mehr</span>
                </button>
                <Popover open={mobileToolOpen} onClose={() => setMobileToolOpen(false)} anchorRef={mobileToolBtnRef} align="right" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] shadow-xl shadow-black/40 py-1 min-w-[180px] animate-slide-up">
                  <div className="px-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)] font-medium">Status ändern</p>
                    {[
                      { key: "interviewing", label: "Im Gespräch", dot: "#7c7df0" },
                      { key: "offered",      label: "Angebot",     dot: "#4ade80" },
                      { key: "applied",      label: "Beworben",    dot: "#60a5fa" },
                      { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b" },
                      { key: "rejected",     label: "Erledigt",    dot: "#52525b" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => { statusMutation.mutate(s.key); setMobileToolOpen(false); }}
                        disabled={statusMutation.isPending || job?.status === s.key}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] disabled:opacity-40"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="mx-3 my-1 h-px bg-[var(--color-border-subtle)]" />
                  <button type="button" onClick={() => { setEditOpen(true); setMobileToolOpen(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)]"><Edit3 className="w-3.5 h-3.5 flex-shrink-0" /> Bearbeiten</button>
                  <div className="mx-3 my-1 h-px bg-[var(--color-border-subtle)]" />
                  <button type="button" onClick={() => { if (window.confirm("Stelle wirklich löschen?")) { setMobileToolOpen(false); deleteMutation.mutate(); } }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-bg-elev-3)]"><Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Stelle löschen</button>
                </Popover>
              </div>
              <div className="hidden sm:block w-px h-4 mx-1 bg-[var(--color-border-subtle)]" aria-hidden="true" />
              <div className="hidden sm:flex items-center gap-0.5">
                <button
                  ref={desktopStatusBtnRef}
                  type="button"
                  onClick={() => setDesktopStatusOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: { interviewing: "#7c7df0", offered: "#4ade80", applied: "#60a5fa", bookmarked: "#f59e0b", rejected: "#52525b" }[job?.status] || "#a1a1aa" }} />
                  Status ändern
                  <ChevronDown className="w-3 h-3" />
                </button>
                <Popover open={desktopStatusOpen} onClose={() => setDesktopStatusOpen(false)} anchorRef={desktopStatusBtnRef} align="right" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] shadow-xl shadow-black/40 py-1 min-w-[180px] animate-slide-up">
                  <div className="px-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)] font-medium">Status ändern</p>
                    {[
                      { key: "interviewing", label: "Im Gespräch", dot: "#7c7df0" },
                      { key: "offered",      label: "Angebot",     dot: "#4ade80" },
                      { key: "applied",      label: "Beworben",    dot: "#60a5fa" },
                      { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b" },
                      { key: "rejected",     label: "Erledigt",    dot: "#52525b" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => { statusMutation.mutate(s.key); setDesktopStatusOpen(false); }}
                        disabled={statusMutation.isPending || job?.status === s.key}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] disabled:opacity-40"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Popover>
                <ToolBtn icon={Edit3} label="Notizen & Lebenslauf" shortLabel="Bearbeiten" onClick={() => setEditOpen(true)} />
                <ToolBtn icon={Trash2} label="Stelle löschen" shortLabel="Löschen" onClick={() => { if (window.confirm("Stelle wirklich löschen?")) deleteMutation.mutate(); }} danger disabled={deleteMutation.isPending} />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-[760px] mx-auto pt-8 pb-16">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <CompanyLogo company={job.company} url={job.url} />
            <div className="min-w-0 flex-1">
              {job.category ? <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-accent-300)] font-semibold">{categoryLabel(job.category)}{job.job_type ? ` · ${job.job_type}` : ""}</p> : null}
              <h1 className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)] break-words" style={{ letterSpacing: "-0.025em" }}>{job.role || "Ohne Titel"}</h1>
              <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)] leading-snug">{job.company || "—"}{job.location ? ` · ${job.location}` : ""}{job.salary_text && !salary ? ` · ${job.salary_text}` : ""}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-2">
            <button type="button" onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) coverLetterMutation.mutate(); else { toast("Lebenslauf hochladen, um ein Anschreiben zu erstellen."); navigate("/lebenslauf"); } }} disabled={coverLetterMutation.isPending} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 w-full border hover:bg-white/[0.08]" style={{ background: "rgba(124,125,240,0.07)", borderColor: "rgba(124,125,240,0.22)", color: "var(--color-accent-300)" }}><FileText className="w-3 h-3" />{coverLetterMutation.isPending ? "Wird erstellt…" : job.cover_letter ? "Anschreiben ansehen" : "Anschreiben erstellen"}</button>
            <button type="button" onClick={() => setInterviewOpen(true)} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]" style={{ background: "rgba(96,165,250,0.07)", borderColor: "rgba(96,165,250,0.22)", color: "#93c5fd" }}><MessageSquare className="w-3 h-3" />Vorbereitung</button>
            <button type="button" onClick={() => { if (resumeId) matchMutation.mutate(); else toast.error("Wähle zuerst einen Lebenslauf"); }} disabled={matchMutation.isPending} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 w-full border hover:bg-white/[0.08]" style={{ background: "rgba(74,222,128,0.07)", borderColor: "rgba(74,222,128,0.22)", color: "#86efac" }}>{matchMutation.isPending ? <span className="animate-spin inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : <SearchCheck className="w-3 h-3" />}{matchMutation.isPending ? "Wird berechnet…" : "Passung prüfen"}</button>
            <button type="button" onClick={() => setEditOpen(true)} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]" style={{ background: "rgba(167,139,250,0.07)", borderColor: "rgba(167,139,250,0.22)", color: "#c4b5fd" }}><FileText className="w-3 h-3" />Lebenslauf wählen</button>
            <button type="button" onClick={handleResearch} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]" style={{ background: "rgba(56,189,248,0.07)", borderColor: "rgba(56,189,248,0.22)", color: "#7dd3fc" }}><SearchCheck className="w-3 h-3" />Recherche</button>
            <button type="button" onClick={() => setSalaryCompareOpen(true)} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]" style={{ background: "rgba(251,191,36,0.07)", borderColor: "rgba(251,191,36,0.22)", color: "#fde68a" }}><BarChart2 className="w-3 h-3" />Gehaltsvergleich</button>
          </div>

          {/* Story hero */}
          {salary ? (
            <section className="mt-7">
              <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">{salary.unit === "hour" ? "Verdienst pro Stunde" : salary.unit === "month" ? "Verdienst pro Monat" : "Jahresgehalt"}</p>
              <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <p className="leading-none text-[var(--color-fg)]" style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif', fontSize: "clamp(48px, 8.5vw, 84px)", letterSpacing: "-0.02em" }}>
                  {salary.unit === "hour" ? <>€{Math.trunc(salary.amount)}<span className="text-[var(--color-fg-dim)]">,{String(Math.round((salary.amount - Math.trunc(salary.amount)) * 100)).padStart(2, "0")}</span></> : salary.max ? <>{Math.round(salary.amount / 1000)}k<span className="text-[var(--color-fg-dim)]"> – </span>{Math.round(salary.max / 1000)}k</> : <>{Math.round(salary.amount / 1000)}k</>}
                </p>
                <p className="text-[14px] text-[var(--color-fg-muted)] pb-2">{salary.unit === "hour" ? `/Stunde · KV ${categoryLabel(job.category)}` : salary.unit === "month" ? "/Monat brutto" : "/Jahr brutto"}</p>
              </div>
              {salary.unit === "hour" && monthlyEst ? <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-md">Bei <span className="text-[var(--color-fg)]">8 Stunden pro Woche</span> sind das rund <span className="text-[var(--color-fg)]">{monthlyEst} im Monat</span> — ohne Sonn- oder Feiertagszuschlag.</p> : salary.unit === "year" && salary.hourly ? <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-md">Entspricht ungefähr <span className="text-[var(--color-fg)]">{salary.hourly.toFixed(2)}/Stunde</span> bei 38,5 h/Woche.</p> : null}
            </section>
          ) : null}

          {/* KPI tiles */}
          {showKpis ? (
            <section className="mt-6 flex flex-wrap gap-3">
              {job.location ? <KpiTile label="Standort" value={city || job.location} hint={locRest || null} /> : null}
              {job.category ? <KpiTile label="Typ" value={categoryLabel(job.category)} hint={job.job_type || null} /> : null}
              {showDeadline ? <KpiTile label="Frist" tone={deadlineWarn ? "warn" : "default"} value={deadlineDays >= 0 ? <>{deadlineDays}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1.5 align-middle">Tage</span></> : <>{Math.abs(deadlineDays)}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1.5 align-middle">T überfällig</span></>} hint={job.deadline ? new Date(job.deadline).toLocaleDateString("de-AT") : (job.expires_at ? new Date(job.expires_at).toLocaleDateString("de-AT") : null)} /> : null}
              {job.salary_text && !salary ? <KpiTile label="Gehalt" value={job.salary_text} /> : null}
              {daysSaved !== null ? <KpiTile label="Gespeichert" value={<>{daysSaved}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1">T</span></>} hint={savedAt ? `am ${new Date(savedAt).toLocaleDateString("de-AT", { day: "2-digit", month: "numeric" })}` : null} /> : null}
            </section>
          ) : null}

          {/* KV bar */}
          {salary?.hourly ? (
            <section className="mt-4">
              <KvBar hourly={salary.hourly} kvMin={kvMin} kvMax={kvMax} kvName={kvName} category={job.category} />
            </section>
          ) : null}

          {/* Ähnliche Stellen */}
          {salary?.hourly ? <section className="mt-4"><SimilarJobsCard currentHourly={salary.hourly} jobs={allJobs} currentId={jobId} /></section> : null}

          {/* KV estimate */}
          {!salary && (
            <section className="mt-4">
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                  <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Gehalt · Einschätzung</p>
                  <span className="text-[11px] text-[var(--color-fg-dim)]">{kvName} 2025</span>
                </div>
                <div className="px-5 py-5">
                  <p className="text-[12px] text-[var(--color-fg-dim)] mb-4">Kein Gehalt angegeben — Richtwert laut {kvName}:</p>
                  <div className="flex items-end gap-5 mb-5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
                    <p className="leading-none" style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif', fontSize: "52px", letterSpacing: "-0.02em", color: "var(--color-warning)" }}>{kvMin.toFixed(2)}<span className="text-[20px] text-[var(--color-fg-dim)] ml-1.5">/h</span></p>
                    {kvMonthly ? <div className="pb-1 max-sm:pb-0"><p className="text-[14px] font-semibold text-[var(--color-fg)]">~ {kvMonthly} / Monat</p><p className="text-[12px] text-[var(--color-fg-dim)] mt-0.5">bei 15 h / Woche</p></div> : null}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--color-fg-dim)] tabular-nums">
                    <span>{formatEuro(kvMin)} KV-Min.</span>
                    <span className="inline-block w-px h-3 bg-[var(--color-border-subtle)]" />
                    <span className="text-[var(--color-fg)] font-medium">{formatEuro(kvMin)} Richtwert</span>
                    <span className="inline-block w-px h-3 bg-[var(--color-border-subtle)]" />
                    <span>{formatEuro(kvCeiling)} KV-Max.</span>
                  </div>
                  <p className="mt-3 text-[10.5px] text-[var(--color-fg-faint)] flex items-center gap-1">Schätzung auf Basis des {kvName} (2025) — keine Firmenangabe.</p>
                </div>
              </div>
            </section>
          )}

          {/* Match card */}
          {job.match_feedback && <section ref={matchCardRef} className="mt-4"><MatchCard score={job.match_score} feedbackJson={job.match_feedback} onCheckFit={() => resumeId ? matchMutation.mutate() : setEditOpen(true)} onCheckFitPending={matchMutation.isPending} resumeId={resumeId} /></section>}

          {/* Courses */}
          <section className="mt-4"><CoursesCard job={job} resumeId={resumeId} onOpenEdit={() => setEditOpen(true)} onGenerate={() => coursesMutation.mutate()} generating={coursesMutation.isPending} /></section>

          {/* Kontext footer */}
          <section className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5">
            <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Einschätzung</p>
            <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">Rückmeldungen dauern bei {job.company || "den meisten Betrieben"} erfahrungsgemäß <span className="text-[var(--color-fg)]">7–14 Werktage</span>. Keine Antwort in dieser Zeit ist häufig und sagt nichts über deine Bewerbung aus.</p>
          </section>

          {/* Notizen */}
          {job.notes ? (
            <section className="mt-4">
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                  <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Notizen</p>
                  <button type="button" onClick={() => setEditOpen(true)} className="text-[11.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors">Bearbeiten</button>
                </div>
                <div className="px-5 py-4"><p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed italic">{job.notes}</p></div>
              </div>
            </section>
          ) : null}

          {/* Beschreibung */}
          {job.description ? (
            <section className="mt-4">
              <details className="group rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]">
                <summary className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-5 py-3.5 cursor-pointer list-none">
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-fg-dim)] group-open:rotate-90 transition-transform" aria-hidden="true" />
                  <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Stellenbeschreibung</p>
                  <span className="text-[11px] text-[var(--color-fg-dim)]">Einblenden</span>
                </summary>
                <DescriptionBody text={job.description} />
              </details>
            </section>
          ) : null}

          {/* Primary actions */}
          <section className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) coverLetterMutation.mutate(); else setEditOpen(true); }} disabled={coverLetterMutation.isPending} className="flex-1 min-w-[200px] h-11 px-5 rounded-xl bg-[var(--color-accent-500)] text-white font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {coverLetterMutation.isPending ? <><Spinner />Wird erstellt…</> : job.cover_letter ? <><FileText className="w-4 h-4" />Anschreiben ansehen</> : <><FileText className="w-4 h-4" />Bewerbung schreiben</>}
            </button>
            {job.url ? (
              <button type="button" onClick={() => { window.open(job.url, "_blank", "noopener,noreferrer"); }} className={`h-11 px-5 rounded-xl border text-[13.5px] inline-flex items-center justify-center gap-1.5 transition-colors ${urlExpired ? "border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)]" : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]"}`}>
                <ExternalLink className="w-3.5 h-3.5" />{urlExpired ? "Abgelaufen — Anzeige oeffnen" : "Stellenanzeige"}
              </button>
            ) : null}
          </section>
        </div>
      </div>

      {/* Modals & sheets */}
      <BearbeitenSheet open={editOpen} onClose={() => setEditOpen(false)} job={job} resumes={resumes} selectedResume={resumeId} onChangeResume={setSelectedResume} onSaveMeta={(payload) => updateMetaMutation.mutate(payload)} savingMeta={updateMetaMutation.isPending} />
      <InterviewSheet open={interviewOpen} onClose={() => setInterviewOpen(false)} job={job} mutate={interviewMutation.mutate} pending={interviewMutation.isPending} resumeId={resumeId} />
      <CoverLetterModal open={coverLetterOpen} onClose={() => setCoverLetterOpen(false)} job={job} />
      {researchOpen ? <ResearchModal companyName={job.company || ""} data={researchData} loading={researchLoading} jobId={job.id} onRefresh={handleResearch} onClose={() => { setResearchOpen(false); setResearchData(null); }} /> : null}
      <SalaryCompareModal open={salaryCompareOpen} onClose={() => setSalaryCompareOpen(false)} currentJob={job} allJobs={allJobs} />
    </>
  );
}
