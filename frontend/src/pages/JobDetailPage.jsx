/**
 * JobDetailPage — simple, calm detail surface.
 *
 * Design rules (approved reference):
 * - No KPI dashboard, no display-serif numbers, no percentage score.
 * - Whitespace + dividers over cards; cards only where grouping helps.
 * - Hierarchy from size/weight/spacing/muted color, not font changes.
 * - Every clickable element: pointer cursor, hover, focus-visible, hit area.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bookmark, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ExternalLink, FileText, MoreHorizontal, Edit3, Trash2,
} from "lucide-react";

import {
  coverLetterApi, jobApi, kvWageApi,
} from "../services/api";
import useFetch from "../hooks/useFetch";
import useMutation from "../hooks/useMutation";
import useConfirmDialog from "../components/ui/ConfirmDialog";
import { useBootstrap } from "../context/BootstrapContext";
import {
  parseSalary, daysUntil, kvMinimumFor, categoryLabel,
} from "../components/job-detail/domain";
import { formatEuro } from "../utils/format";

/** Fetch KV wage for a category (direct endpoint). Falls back to hardcoded floor. */
function useKvWage(category) {
  const { data } = useFetch(
    () => kvWageApi.get((category || "").toLowerCase(), 2025).then((r) => r.data),
    { enabled: !!category, deps: [(category || "").toLowerCase()] }
  );
  return data
    ? { min: data.hourly_min, max: data.hourly_max, kv: data.kollektivvertrag, url: data.source_url }
    : { min: kvMinimumFor(category), max: null, kv: "KV", url: null };
}

import { Spinner, DescriptionBody } from "../components/job-detail/ui";
import CompanyLogo from "../components/job-detail/CompanyLogo";
import FitSection from "../components/job-detail/FitSection";
import BearbeitenSheet from "../components/job-detail/BearbeitenSheet";
import CoverLetterModal from "../components/job-detail/CoverLetterModal";
import Popover from "../components/ui/Popover";

const STATUS_DOTS = {
  interviewing: "#7c7df0",
  offered: "#4ade80",
  applied: "#60a5fa",
  bookmarked: "#f59e0b",
  rejected: "#52525b",
};

const STATUS_OPTIONS = [
  { key: "interviewing", label: "Im Gespräch", dot: "#7c7df0" },
  { key: "offered",      label: "Angebot",     dot: "#4ade80" },
  { key: "applied",      label: "Beworben",    dot: "#60a5fa" },
  { key: "bookmarked",   label: "Gemerkt",     dot: "#f59e0b" },
  { key: "rejected",     label: "Erledigt",    dot: "#52525b" },
];

/** Shared focus ring for every interactive element on this page. */
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] cursor-pointer";

// ─── Main page ───────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { confirm: confirmDelete, element: confirmElement } = useConfirmDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedResume, setSelectedResume] = useState(null);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const statusBtnRef = useRef(null);

  const { init } = useBootstrap();

  const { data: baselines } = useFetch(() => jobApi.getResponseBaselines().then((r) => r.data));
  // Share the list cache with Stellen/Dashboard — no duplicate full-list fetch
  // when navigating job-detail → list and back within the freshness window.
  const { data: jobsListRaw } = useFetch(
    () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    { cacheKey: "jobs:list", maxAge: 30_000 }
  );

  // The job itself — refetch + reset whenever the route id changes.
  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setJobLoading(true);
    setJob(null);
    jobApi
      .get(jobId)
      .then((res) => {
        if (!cancelled) { setJob(res.data); setJobLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setJob(null); setJobLoading(false); }
      });
    return () => { cancelled = true; };
  }, [jobId]);

  // Resumes come from the bootstrap payload (id + filename).
  const resumes = init?.resumes || [];
  const resumeId = selectedResume ?? resumes[0]?.id;

  // Must be called before any early return to keep hook order stable.
  const kvData = useKvWage(job?.category);

  useEffect(() => {
    const rid = searchParams.get("resumeId");
    if (rid && selectedResume == null) setSelectedResume(Number(rid));
  }, [searchParams, selectedResume]);

  const coverLetterMutation = useMutation(() => coverLetterApi.generate(Number(jobId), resumeId));
  const handleCoverLetter = async () => {
    try {
      const res = await coverLetterMutation.mutate();
      setJob(res.data);
      setCoverLetterOpen(true);
      toast.success("Anschreiben erstellt");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Anschreiben konnte nicht erstellt werden");
    }
  };

  const matchMutation = useMutation(() => {
    if (!resumeId) throw new Error("Kein Lebenslauf ausgewählt");
    return jobApi.match(Number(jobId), resumeId);
  });
  const handleMatch = async () => {
    try {
      const res = await matchMutation.mutate();
      setJob(res.data);
      toast.success("Passung berechnet");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Passung konnte nicht berechnet werden");
    }
  };

  const deleteMutation = useMutation(() => jobApi.delete(jobId));
  const askDelete = () => confirmDelete({
    title: "Stelle löschen?",
    body: "Die Stelle wird aus deiner Liste entfernt. Das kann nicht rückgängig gemacht werden.",
    confirmLabel: "Löschen",
    danger: true,
  });
  const handleDelete = async () => {
    try {
      await deleteMutation.mutate();
      toast.success("Stelle gelöscht");
      navigate("/jobs");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Löschen fehlgeschlagen");
    }
  };

  const updateMetaMutation = useMutation(async (data) => {
    const calls = [];
    if ("deadline" in data) calls.push(jobApi.updateDeadline(jobId, data.deadline));
    if ("notes" in data) calls.push(jobApi.updateNotes(jobId, data.notes));
    const results = await Promise.all(calls);
    return results[results.length - 1];
  });
  const handleSaveMeta = async (payload) => {
    try {
      const res = await updateMetaMutation.mutate(payload);
      if (res?.data) setJob(res.data);
      toast.success("Aktualisiert");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Aktualisierung fehlgeschlagen");
    }
  };

  const statusMutation = useMutation((status) => jobApi.updateStatus(jobId, status));
  const handleStatusChange = async (status) => {
    try {
      const res = await statusMutation.mutate(status);
      if (res?.data) setJob(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Status konnte nicht aktualisiert werden");
    }
  };

  if (jobLoading) {
    return (
      <div className="grid place-items-center py-24 text-[var(--color-fg-dim)] gap-2">
        <Spinner /> <span className="text-[13px]">Wird geladen…</span>
      </div>
    );
  }
  if (!job) {
    return <div className="py-16 text-center text-[var(--color-error)] font-medium">Stelle nicht gefunden.</div>;
  }

  const salary       = parseSalary(job.salary_text);
  const kvMin        = kvData.min;
  const kvMax        = kvData.max;
  const kvName       = kvData.kv;
  const deadlineDays = daysUntil(job.deadline || job.expires_at);
  const urlExpired   = deadlineDays !== null && deadlineDays < 0;
  const deadlineWarn = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7;

  const savedAt   = job.created_at;
  // eslint-disable-next-line react-hooks/purity -- Date.now() is a clock snapshot; staleness within a render pass is acceptable
  const daysSaved = savedAt ? Math.max(0, Math.floor((Date.now() - new Date(savedAt).getTime()) / (1000 * 60 * 60 * 24))) : null;
  // Same clock-snapshot pattern for the applied-at age shown in the Einschätzung section.
  // eslint-disable-next-line react-hooks/purity -- Date.now() is a clock snapshot; staleness within a render pass is acceptable
  const daysApplied = job.applied_at ? Math.max(0, Math.floor((Date.now() - new Date(job.applied_at).getTime()) / (1000 * 60 * 60 * 24))) : null;

  // Salary section data — resolved independently of the main record where possible.
  const showSalaryFromKv = !salary;
  const kvMonthly = showSalaryFromKv ? Math.round(kvMin * 15 * 4.3) : null;
  const kvCeiling = kvMax || kvMin * 1.2;

  const statusDot = STATUS_DOTS[job.status] || "#a1a1aa";

  return (
    <>
      {confirmElement}
      <div key={jobId} className="animate-slide-up">
        {/* ── 1. Quiet header: breadcrumb + status + overflow ─────────────── */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 py-2.5 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-12 items-center gap-2">
            <nav className="col-span-7 min-w-0 flex items-center gap-1.5 text-[12px]" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className={`inline-flex items-center gap-1 h-7 px-1.5 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors ${FOCUS}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Stellen
              </button>
              <ChevronRight className="w-3 h-3 text-[var(--color-fg-faint)] flex-shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className={`h-7 px-1.5 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors truncate ${FOCUS}`}
              >
                {job.company || "Stelle"}
              </button>
              <ChevronRight className="w-3 h-3 text-[var(--color-fg-faint)] flex-shrink-0" aria-hidden="true" />
              <span className="text-[var(--color-fg-muted)] truncate" aria-current="page">{job.role || "Stelle"}</span>
            </nav>

            <div className="col-span-5 justify-self-end flex items-center gap-1">
              {/* Status — quiet control with dropdown */}
              <button
                ref={statusBtnRef}
                type="button"
                onClick={() => setStatusOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={statusOpen}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors ${FOCUS}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusDot }} aria-hidden="true" />
                Status ändern
                <ChevronDown className={`w-3 h-3 transition-transform ${statusOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <Popover open={statusOpen} onClose={() => setStatusOpen(false)} anchorRef={statusBtnRef} align="right" className="rounded-xl py-1 min-w-[180px] animate-slide-up">
                <div className="px-1">
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)] font-medium">Status ändern</p>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      role="menuitem"
                      onClick={() => { handleStatusChange(s.key); setStatusOpen(false); }}
                      disabled={statusMutation.loading || job.status === s.key}
                      className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] disabled:opacity-40 cursor-pointer ${FOCUS}`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} aria-hidden="true" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </Popover>

              {/* Bookmark — preserved saved-state affordance */}
              <button
                type="button"
                onClick={() => handleStatusChange(job.status === "bookmarked" ? "applied" : "bookmarked")}
                aria-pressed={job.status === "bookmarked"}
                aria-label={job.status === "bookmarked" ? "Aus Gemerkt entfernen" : "Merken"}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${job.status === "bookmarked" ? "text-[var(--color-warning)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"} hover:bg-[var(--color-bg-elev-1)] ${FOCUS}`}
              >
                <Bookmark className={`w-4 h-4 ${job.status === "bookmarked" ? "fill-current" : ""}`} aria-hidden="true" />
              </button>

              {/* Overflow — edit + destructive delete live here, not screaming in the header */}
              <button
                ref={menuBtnRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Mehr Aktionen"
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors ${FOCUS}`}
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>
              <Popover open={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={menuBtnRef} align="right" className="rounded-xl py-1 min-w-[180px] animate-slide-up">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] ${FOCUS}`}
                >
                  <Edit3 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> Bearbeiten
                </button>
                <div className="mx-3 my-1 h-px bg-[var(--color-border-subtle)]" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => { setMenuOpen(false); if (await askDelete()) handleDelete(); }}
                  disabled={deleteMutation.loading}
                  className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-bg-elev-3)] disabled:opacity-40 ${FOCUS}`}
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> Stelle löschen
                </button>
              </Popover>
            </div>
          </div>
        </div>

        {/* ── Body: centered readable column ──────────────────────────────── */}
        <div className="max-w-[1100px] mx-auto pt-8 pb-16">
          {/* ── 2. Job identity — hero, no card ─────────────────────────────── */}
          <header className="flex items-start gap-4">
            <CompanyLogo company={job.company} url={job.url} />
            <div className="min-w-0 flex-1">
              {job.category ? (
                <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-accent-500)] font-semibold">
                  {categoryLabel(job.category)}{job.job_type ? ` · ${job.job_type}` : ""}
                </p>
              ) : null}
              <h1 className="mt-1.5 text-[24px] sm:text-[30px] font-semibold tracking-tight leading-[1.12] text-[var(--color-fg)] break-words" style={{ letterSpacing: "-0.025em" }}>
                {job.role || "Ohne Titel"}
              </h1>
              <p className="mt-2 text-[13.5px] text-[var(--color-fg-muted)] leading-snug">
                {job.company || "—"}{job.location ? ` · ${job.location}` : ""}
              </p>
            </div>
          </header>

          {/* ── 3. Quick facts — one horizontal metadata row, no boxes ──────── */}
          <section className="mt-6" aria-label="Kurzinfo">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
              {job.location ? (
                <div className="flex items-start gap-2.5 min-w-0">
                  <CalendarDays className="w-4 h-4 mt-0.5 text-[var(--color-fg-dim)] flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-dim)]">Standort</p>
                    <p className="text-[13.5px] text-[var(--color-fg)] truncate">{job.location}</p>
                  </div>
                </div>
              ) : null}
              {job.category ? (
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 mt-0.5 text-[var(--color-fg-dim)] flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-dim)]">Typ</p>
                    <p className="text-[13.5px] text-[var(--color-fg)] truncate">{categoryLabel(job.category)}{job.job_type ? ` · ${job.job_type}` : ""}</p>
                  </div>
                </div>
              ) : null}
              {deadlineDays !== null ? (
                <div className="flex items-start gap-2.5 min-w-0">
                  <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: deadlineWarn ? "var(--color-warning)" : "var(--color-fg-dim)" }} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-dim)]">Frist</p>
                    <p className={`text-[13.5px] truncate ${deadlineWarn ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]"}`}>
                      {deadlineDays >= 0 ? `${deadlineDays} Tage übrig` : `${Math.abs(deadlineDays)} Tage überfällig`}
                      {job.deadline || job.expires_at ? (
                        <span className="text-[var(--color-fg-dim)]"> · bis {new Date(job.deadline || job.expires_at).toLocaleDateString("de-AT")}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}
              {daysSaved !== null ? (
                <div className="flex items-start gap-2.5 min-w-0">
                  <Bookmark className="w-4 h-4 mt-0.5 text-[var(--color-fg-dim)] flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-dim)]">Gespeichert</p>
                    <p className="text-[13.5px] text-[var(--color-fg)] truncate">
                      {daysSaved} Tage · seit {new Date(savedAt).toLocaleDateString("de-AT", { day: "numeric", month: "numeric" })}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <hr className="my-7 border-[var(--color-border-subtle)]" />

          {/* ── 4. Salary — restrained, divider-separated ──────────────────── */}
          {salary ? (
            <section aria-label="Gehaltsangabe">
              <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Gehaltsangabe</p>
              <div className="mt-2.5 flex items-baseline gap-4 flex-wrap">
                <p className="text-[28px] sm:text-[32px] font-semibold leading-none tracking-tight text-[var(--color-accent-500)] tabular-nums">
                  {salary.unit === "hour"
                    ? <>€{salary.amount.toFixed(2)} <span className="text-[15px] font-medium text-[var(--color-fg-muted)]">/ h</span></>
                    : salary.unit === "month"
                      ? <>€{Math.round(salary.amount).toLocaleString("de-AT")} <span className="text-[15px] font-medium text-[var(--color-fg-muted)]">/ Monat</span></>
                      : <>€{Math.round(salary.amount / 1000)}k{salary.max ? ` – €${Math.round(salary.max / 1000)}k` : ""} <span className="text-[15px] font-medium text-[var(--color-fg-muted)]">/ Jahr</span></>}
                </p>
                {salary.unit === "hour" && (
                  <p className="text-[13.5px] text-[var(--color-fg-muted)]">
                    ~ €{Math.round(salary.amount * 15 * 4.3).toLocaleString("de-AT")} / Monat <span className="text-[var(--color-fg-dim)]">bei 15 h / Woche</span>
                  </p>
                )}
                {salary.unit === "year" && salary.hourly ? (
                  <p className="text-[13.5px] text-[var(--color-fg-muted)]">≈ {salary.hourly.toFixed(2)} €/h bei 38,5 h/Woche</p>
                ) : null}
              </div>
              {salary.unit === "hour" && kvName ? (
                <p className="mt-2.5 text-[12px] text-[var(--color-fg-dim)] tabular-nums">
                  {formatEuro(kvMin)} KV-Min. · {formatEuro(kvMin)} Richtwert · {formatEuro(kvCeiling)} KV-Max.
                </p>
              ) : null}
              <p className="mt-1.5 text-[11.5px] text-[var(--color-fg-faint)]">
                {salary.unit === "hour" && kvName
                  ? `Firmenangabe. Vergleich mit ${kvName} (2025).`
                  : "Angabe des Arbeitgebers."}
              </p>
            </section>
          ) : showSalaryFromKv ? (
            <section aria-label="Gehaltseinschätzung">
              <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Gehaltseinschätzung</p>
              <div className="mt-2.5 flex items-baseline gap-4 flex-wrap">
                <p className="text-[28px] sm:text-[32px] font-semibold leading-none tracking-tight text-[var(--color-accent-500)] tabular-nums">
                  €{kvMin.toFixed(2)} <span className="text-[15px] font-medium text-[var(--color-fg-muted)]">/ h</span>
                </p>
                {kvMonthly ? (
                  <p className="text-[13.5px] text-[var(--color-fg-muted)]">~ €{kvMonthly.toLocaleString("de-AT")} / Monat <span className="text-[var(--color-fg-dim)]">bei 15 h / Woche</span></p>
                ) : null}
              </div>
              <p className="mt-2.5 text-[12px] text-[var(--color-fg-dim)] tabular-nums">
                {formatEuro(kvMin)} KV-Min. · {formatEuro(kvMin)} Richtwert · {formatEuro(kvCeiling)} KV-Max.
              </p>
              <p className="mt-1.5 text-[11.5px] text-[var(--color-fg-faint)]">
                Schätzung auf Basis des {kvName} (2025) — keine Firmenangabe.
              </p>
            </section>
          ) : null}

          <hr className="my-7 border-[var(--color-border-subtle)]" />

          {/* ── 5. Why it could fit — replaces the percentage score ────────── */}
          <FitSection
            feedbackJson={job.match_feedback}
            onRecheck={resumeId ? handleMatch : () => setEditOpen(true)}
            recheckPending={matchMutation.loading}
            resumeId={resumeId}
          />

          <hr className="my-7 border-[var(--color-border-subtle)]" />

          {/* ── 7. Description — prose, not a boxed panel ──────────────────── */}
          {job.description ? (
            <section aria-label="Beschreibung">
              <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Worum geht&apos;s?</p>
              <div className="mt-2.5">
                <DescriptionBody text={job.description} />
              </div>
            </section>
          ) : null}

          {job.notes ? (
            <section className="mt-6" aria-label="Notizen">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">Notizen</p>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className={`text-[12px] text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] transition-colors ${FOCUS}`}
                >
                  Bearbeiten
                </button>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-wrap">{job.notes}</p>
            </section>
          ) : null}

          <hr className="my-7 border-[var(--color-border-subtle)]" />

          {/* ── 8. Response-time estimate — supporting info row ────────────── */}
          <section className="flex items-start gap-2.5" aria-label="Einschätzung">
            <span className="text-[14px] leading-[1.4] flex-shrink-0" aria-hidden="true">🕘</span>
            <p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
              {job.status === "applied" && job.applied_at ? (
                <>
                  <span className="text-[var(--color-fg)] font-medium">Einschätzung:</span> vor {daysApplied} Tagen beworben.
                  Rückmeldungen dauern bei {job.company || "den meisten Betrieben"} erfahrungsgemäß {" "}
                  <span className="text-[var(--color-fg)]">{Math.round(baselines?.median_days ?? 8)}–{Math.round(baselines?.p75_days ?? 14)} Werktage</span>.
                  Keine Antwort in dieser Zeit ist häufig und sagt nichts über deine Bewerbung aus.
                </>
              ) : (
                <>
                  <span className="text-[var(--color-fg)] font-medium">Einschätzung:</span> Rückmeldungen dauern bei {job.company || "den meisten Betrieben"} erfahrungsgemäß {" "}
                  <span className="text-[var(--color-fg)]">{Math.round(baselines?.median_days ?? 8)}–{Math.round(baselines?.p75_days ?? 14)} Werktage</span>.
                  Keine Antwort in dieser Zeit ist häufig und sagt nichts über deine Bewerbung aus.
                </>
              )}
            </p>
          </section>

          {/* ── 9. Actions ──────────────────────────────────────────────────── */}
          <section className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) handleCoverLetter(); else setEditOpen(true); }}
              disabled={coverLetterMutation.loading}
              className={`flex-1 min-w-[200px] h-11 px-5 rounded-xl bg-[var(--color-accent-500)] text-white font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 hover:bg-[var(--color-accent-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${FOCUS}`}
            >
              {coverLetterMutation.loading
                ? <><Spinner />Wird erstellt…</>
                : job.cover_letter ? <><FileText className="w-4 h-4" aria-hidden="true" />Anschreiben ansehen</>
                  : <><FileText className="w-4 h-4" aria-hidden="true" />Bewerbung schreiben</>}
            </button>
            {job.url ? (
              <button
                type="button"
                onClick={() => { window.open(job.url, "_blank", "noopener,noreferrer"); }}
                className={`h-11 px-5 rounded-xl border text-[13.5px] inline-flex items-center justify-center gap-1.5 transition-colors ${urlExpired
                  ? "border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]"} ${FOCUS}`}
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                {urlExpired ? "Abgelaufen — Anzeige öffnen" : "Stellenanzeige"}
              </button>
            ) : null}
          </section>
        </div>
      </div>

      {/* Modals & sheets */}
      <BearbeitenSheet open={editOpen} onClose={() => setEditOpen(false)} job={job} resumes={resumes} selectedResume={resumeId} onChangeResume={setSelectedResume} onSaveMeta={(payload) => handleSaveMeta(payload)} savingMeta={updateMetaMutation.loading} />
      <CoverLetterModal open={coverLetterOpen} onClose={() => setCoverLetterOpen(false)} job={job} followUpDays={Math.round((baselines?.p75_days ?? 14) + 2)} />
    </>
  );
}
