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
  Bookmark, CalendarDays, ChevronDown, ChevronLeft, Clock3,
  ExternalLink, FileText, MapPin, MoreHorizontal, Edit3, Trash2,
  Navigation,
} from "lucide-react";

import {
  coverLetterApi, jobApi, kvWageApi,
} from "../services/api";
import useFetch, { invalidateSwrCache, mutateSwrCache } from "../hooks/useFetch";
import useMutation from "../hooks/useMutation";
import useConfirmDialog from "../components/ui/ConfirmDialog";
import { useBootstrap } from "../context/BootstrapContext";
import {
  parseSalary, daysUntil, kvMinimumFor, categoryLabel,
} from "../components/job-detail/domain";
import { formatEuro } from "../utils/format";
import { getAiErrorMessage } from "../utils/aiError";

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

import { Spinner, DescriptionBody, FitSection } from "../components/job-detail/ui";
import CompanyLogo from "../components/job-detail/CompanyLogo";
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

function routeLinks(location) {
  const destination = encodeURIComponent(location.trim());
  return [
    { label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${destination}` },
    { label: "Apple Karten", href: `https://maps.apple.com/?daddr=${destination}` },
    { label: "Waze", href: `https://www.waze.com/ul?q=${destination}&navigate=yes` },
  ];
}

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
  const [routeOpen, setRouteOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const statusBtnRef = useRef(null);
  const routeBtnRef = useRef(null);

  const { init } = useBootstrap();

  const { data: baselines } = useFetch(() => jobApi.getResponseBaselines().then((r) => r.data));

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
      toast.error(getAiErrorMessage(err, "Anschreiben konnte nicht erstellt werden"));
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
      toast.error(getAiErrorMessage(err, "Passung konnte nicht berechnet werden"));
    }
  };

  const askDelete = () => confirmDelete({
    title: "Stelle löschen?",
    body: "Die Stelle wird aus deiner Liste entfernt. Das kann nicht rückgängig gemacht werden.",
    confirmLabel: "Löschen",
    danger: true,
  });
  const handleDelete = async () => {
    const previousJobs = mutateSwrCache("jobs:list", (current) => (
      Array.isArray(current)
        ? current.filter((item) => String(item.id) !== String(jobId))
        : current
    ));
    navigate("/jobs", { replace: true });
    toast.success("Stelle gelöscht");

    try {
      await jobApi.delete(jobId);
    } catch (err) {
      if (previousJobs !== undefined) mutateSwrCache("jobs:list", previousJobs);
      else invalidateSwrCache("jobs:list");
      toast.error(err.response?.data?.detail || "Löschen fehlgeschlagen – Stelle wurde wiederhergestellt");
    }
  };

  const updateMetaMutation = useMutation(async (data) => {
    // Apply partial updates in a deterministic order, then fetch the canonical
    // record. Returning one of several PATCH responses can otherwise overwrite
    // a sibling field with stale data.
    if ("deadline" in data) await jobApi.updateDeadline(jobId, data.deadline);
    if ("notes" in data) await jobApi.updateNotes(jobId, data.notes);
    if ("url" in data) await jobApi.updateUrl(jobId, data.url);
    return jobApi.get(jobId);
  });
  const handleSaveMeta = async (payload) => {
    try {
      const res = await updateMetaMutation.mutate(payload);
      if (res?.data) setJob(res.data);
      invalidateSwrCache("jobs:list");
      toast.success("Aktualisiert");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Aktualisierung fehlgeschlagen");
      return false;
    }
  };

  const statusMutation = useMutation((status) => jobApi.updateStatus(jobId, status));
  const handleStatusChange = async (status) => {
    if (!job || job.status === status) return;

    // Update both surfaces before starting the request. Previously only the
    // cached list changed immediately, so the status button on this detail page
    // appeared stuck until the API response arrived.
    const previousJob = job;
    setJob((current) => (current ? { ...current, status } : current));
    const previousJobs = mutateSwrCache("jobs:list", (current) => (
      Array.isArray(current)
        ? current.map((item) => (String(item.id) === String(jobId) ? { ...item, status } : item))
        : current
    ));
    try {
      const res = await statusMutation.mutate(status);
      if (res?.data) {
        setJob((current) => (
          String(current?.id) === String(previousJob.id) ? res.data : current
        ));
      }
      // Reconcile the cache with the canonical server record (keeps updated_at).
      mutateSwrCache("jobs:list", (current) => (
        Array.isArray(current)
          ? current.map((item) => (String(item.id) === String(jobId) ? { ...item, ...res?.data } : item))
          : current
      ));
    } catch (err) {
      setJob((current) => (
        String(current?.id) === String(previousJob.id) && current?.status === status
          ? previousJob
          : current
      ));
      if (previousJobs !== undefined) mutateSwrCache("jobs:list", previousJobs);
      else invalidateSwrCache("jobs:list");
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
  const currentStatusLabel = STATUS_OPTIONS.find((option) => option.key === job.status)?.label || "Status";

  return (
    <>
      {confirmElement}
      <div key={jobId} className="animate-slide-up">
        {/* ── 1. Quiet header: breadcrumb + status + overflow ─────────────── */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 py-2.5 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border-subtle)]">
          <div className="grid grid-cols-12 items-center gap-2">
            <nav className="col-span-6 min-w-0 flex items-center gap-2 text-[12px]" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                aria-label="Stelle schließen und zur Liste zurückkehren"
                title="Stelle schließen"
                className={`inline-flex items-center gap-1 h-7 px-1.5 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors ${FOCUS}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Stellen schließen
              </button>
              <span className="hidden sm:block text-[var(--color-fg-dim)] truncate" aria-current="page">
                {job.company || "Stelle"}
              </span>
            </nav>

            <div className="col-span-6 justify-self-end flex items-center gap-1">
              {/* Status — quiet control with dropdown */}
              <button
                ref={statusBtnRef}
                type="button"
                onClick={() => setStatusOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={statusOpen}
                aria-label={`Status ändern: ${currentStatusLabel}`}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors ${FOCUS}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusDot }} aria-hidden="true" />
                <span className="hidden sm:inline">{currentStatusLabel}</span>
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
                  className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-bg-elev-3)] ${FOCUS}`}
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> Stelle löschen
                </button>
              </Popover>
            </div>
          </div>
        </div>

        {/* ── Body: centered readable column ──────────────────────────────── */}
        <div className="max-w-[840px] mx-auto pt-6 sm:pt-8 pb-16">
          {/* ── 2. Job identity — hero, no card ─────────────────────────────── */}
          <header className="flex items-start gap-3.5">
            <CompanyLogo company={job.company} url={job.url} size="sm" priority />
            <div className="min-w-0 flex-1">
              {job.category ? (
                <p className="text-[11.5px] text-[var(--color-fg-dim)] font-medium">
                  {categoryLabel(job.category)}{job.job_type ? ` · ${job.job_type}` : ""}
                </p>
              ) : null}
              <h1 className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-tight leading-[1.18] text-[var(--color-fg)] break-words" style={{ letterSpacing: "-0.02em" }}>
                {job.role || "Ohne Titel"}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 flex-wrap text-[13px] text-[var(--color-fg-muted)] leading-snug">
                <span>{job.company || "—"}</span>
                {job.location ? <><span className="text-[var(--color-fg-faint)]">·</span><span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{job.location}</span></> : null}
              </p>
            </div>
          </header>

          {/* ── 3. Quick facts — compact and non-repetitive ─────────────────── */}
          <section className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--color-fg-dim)]" aria-label="Kurzinfo">
              {job.source ? (
                <span className="inline-flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />Gefunden auf {job.source}</span>
              ) : null}
              {job.location ? (
                <>
                  <button
                    ref={routeBtnRef}
                    type="button"
                    onClick={() => setRouteOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={routeOpen}
                    className={`inline-flex items-center gap-1.5 rounded-md text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] transition-colors ${FOCUS}`}
                  >
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    Route ab aktuellem Standort
                    <ChevronDown className={`w-3 h-3 transition-transform ${routeOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  <Popover open={routeOpen} onClose={() => setRouteOpen(false)} anchorRef={routeBtnRef} align="left" className="min-w-[220px] rounded-xl p-1 animate-popover-in origin-top-left">
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-faint)]">
                      Karten-App öffnen
                    </p>
                    {routeLinks(job.location).map((route) => (
                      <a
                        key={route.label}
                        href={route.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        onClick={() => setRouteOpen(false)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-3)] hover:text-[var(--color-fg)] ${FOCUS}`}
                      >
                        {route.label}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ))}
                    <p className="px-3 pb-2 pt-1 text-[10.5px] leading-snug text-[var(--color-fg-faint)]">
                      Die Karten-App übernimmt deinen aktuellen Standort.
                    </p>
                  </Popover>
                </>
              ) : null}
              {deadlineDays !== null ? (
                <span className={`inline-flex items-center gap-1.5 ${deadlineWarn ? "text-[var(--color-warning)]" : ""}`}>
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                  {deadlineDays >= 0 ? `Frist in ${deadlineDays} Tagen` : `${Math.abs(deadlineDays)} Tage überfällig`}
                </span>
              ) : null}
              {daysSaved !== null ? (
                <span className="inline-flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5" aria-hidden="true" />Gespeichert am {new Date(savedAt).toLocaleDateString("de-AT", { day: "numeric", month: "short" })}</span>
              ) : null}
          </section>

          <hr className="my-6 border-[var(--color-border-subtle)]" />

          {/* ── 4. Salary — restrained, divider-separated ──────────────────── */}
          {salary ? (
            <section aria-label="Gehaltsangabe">
              <p className="text-[13px] text-[var(--color-fg)] font-semibold">Gehalt</p>
              <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <p className="text-[20px] sm:text-[22px] font-semibold leading-none tracking-tight text-[var(--color-fg)] tabular-nums">
                  {salary.unit === "hour"
                    ? <>€{salary.amount.toFixed(2)} <span className="text-[13px] font-medium text-[var(--color-fg-muted)]">/ h</span></>
                    : salary.unit === "month"
                      ? <>€{Math.round(salary.amount).toLocaleString("de-AT")} <span className="text-[13px] font-medium text-[var(--color-fg-muted)]">/ Monat</span></>
                      : <>€{Math.round(salary.amount / 1000)}k{salary.max ? ` – €${Math.round(salary.max / 1000)}k` : ""} <span className="text-[13px] font-medium text-[var(--color-fg-muted)]">/ Jahr</span></>}
                </p>
                {salary.unit === "hour" && (
                  <p className="text-[12.5px] text-[var(--color-fg-muted)]">
                    ~ €{Math.round(salary.amount * 15 * 4.3).toLocaleString("de-AT")} / Monat <span className="text-[var(--color-fg-dim)]">bei 15 h / Woche</span>
                  </p>
                )}
                {salary.unit === "year" && salary.hourly ? (
                  <p className="text-[12.5px] text-[var(--color-fg-muted)]">≈ {salary.hourly.toFixed(2)} €/h bei 38,5 h/Woche</p>
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
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-[var(--color-fg)] font-semibold">Gehalt</p>
                <span className="rounded-full bg-[var(--color-bg-elev-2)] px-2 py-0.5 text-[10.5px] text-[var(--color-fg-dim)]">KV-Schätzung</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                <p className="text-[20px] sm:text-[22px] font-semibold leading-none tracking-tight text-[var(--color-fg)] tabular-nums">
                  €{kvMin.toFixed(2)} <span className="text-[13px] font-medium text-[var(--color-fg-muted)]">/ h</span>
                </p>
                {kvMonthly ? (
                  <p className="text-[12.5px] text-[var(--color-fg-muted)]">~ €{kvMonthly.toLocaleString("de-AT")} / Monat <span className="text-[var(--color-fg-dim)]">bei 15 h / Woche</span></p>
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

          <hr className="my-6 border-[var(--color-border-subtle)]" />

          {/* ── 5. Why it could fit — replaces the percentage score ────────── */}
          <FitSection
            feedbackJson={job.match_feedback}
            onRecheck={resumeId ? handleMatch : () => setEditOpen(true)}
            recheckPending={matchMutation.loading}
            resumeId={resumeId}
          />

          <hr className="my-6 border-[var(--color-border-subtle)]" />

          {/* ── 7. Description — prose, not a boxed panel ──────────────────── */}
          {job.description ? (
            <section aria-label="Beschreibung">
              <p className="text-[13px] text-[var(--color-fg)] font-semibold">Beschreibung</p>
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

          <hr className="my-6 border-[var(--color-border-subtle)]" />

          {/* ── 8. Response-time estimate — supporting info row ────────────── */}
          <details className="group" aria-label="Einschätzung">
            <summary className={`flex items-center gap-2 text-[12.5px] text-[var(--color-fg-muted)] list-none ${FOCUS}`}>
              <Clock3 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              Wann kann ich mit einer Antwort rechnen?
              <ChevronDown className="ml-auto w-3.5 h-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 pl-5 text-[12.5px] text-[var(--color-fg-muted)] leading-relaxed">
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
          </details>

          {/* ── 9. Actions ──────────────────────────────────────────────────── */}
          <section className="mt-6 flex flex-wrap items-center gap-3">
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                data-jobassist-apply=""
                data-job-id={job.id}
                data-job-title={job.role || ""}
                data-job-company={job.company || ""}
                data-job-location={job.location || ""}
                data-job-source={job.source || ""}
                data-cover-letter={job.cover_letter || ""}
                className={`flex-1 min-w-[200px] h-11 px-5 rounded-xl bg-[var(--color-accent-500)] text-white font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 hover:bg-[var(--color-accent-600)] transition-colors ${FOCUS}`}
              >
                Jetzt bewerben
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) handleCoverLetter(); else setEditOpen(true); }}
                disabled={coverLetterMutation.loading}
                className={`flex-1 min-w-[200px] h-11 px-5 rounded-xl bg-[var(--color-accent-500)] text-white font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 hover:bg-[var(--color-accent-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${FOCUS}`}
              >
                {coverLetterMutation.loading
                  ? <><Spinner />Wird vorbereitet…</>
                  : job.cover_letter ? <><FileText className="w-4 h-4" aria-hidden="true" />Anschreiben ansehen</>
                    : <><FileText className="w-4 h-4" aria-hidden="true" />Bewerbung vorbereiten</>}
              </button>
            )}
            {job.url ? (
              <button
                type="button"
                onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) handleCoverLetter(); else setEditOpen(true); }}
                disabled={coverLetterMutation.loading}
                className={`h-11 px-5 rounded-xl border border-[var(--color-border)] text-[var(--color-fg-muted)] text-[13.5px] inline-flex items-center justify-center gap-1.5 hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${FOCUS}`}
              >
                {coverLetterMutation.loading
                  ? <><Spinner />Wird erstellt…</>
                  : job.cover_letter ? <><FileText className="w-3.5 h-3.5" aria-hidden="true" />Anschreiben ansehen</>
                    : <><FileText className="w-3.5 h-3.5" aria-hidden="true" />Anschreiben erstellen</>}
              </button>
            ) : null}
            {urlExpired ? (
              <p className="basis-full text-[11.5px] text-[var(--color-warning)]">
                Die Anzeige könnte abgelaufen sein. Der Link wird trotzdem geöffnet.
              </p>
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
