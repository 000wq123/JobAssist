import { useMemo } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import {
  Bookmark, Send, MessageCircle, CheckCircle2, Archive,
  FileText, Bell, ArrowRight, Plus, Search, RefreshCw, AlertCircle,
} from "lucide-react";

import useAuthStore from "../hooks/useAuthStore";
import { jobApi, jobAlertsApi } from "../services/api";
import useFetch from "../hooks/useFetch";
import { Skel, useDelayedSkeleton, usePageTitle } from "../hooks/usePageChrome";
import useCountUp from "../hooks/useCountUp";
import { useBootstrap } from "../context/BootstrapContext";
import { hasDraftContent } from "../cv/storage";

function T(name) {
  return `var(--app-${name})`;
}

// Semantic status tokens — single source of truth (see index.css). Components
// must reference these CSS variables instead of hardcoding hex values so
// light/dark themes stay consistent.

/** Animated counter for the status rail (transitions.dev pop-in pattern). */
function CountUp({ value }) {
  const display = useCountUp(value);
  // No key on the span: keying it by the animated value remounts it on every
  // animation frame, restarting the CSS pop so it only visibly "jumps" in at
  // the very end. Mount once, pop once, then let the JS counter run smoothly.
  return (
    <span className="ja-num-pop inline-block">{display}</span>
  );
}

const BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt",    stripLabel: "Gemerkt",   icon: Bookmark,     color: "var(--status-saved-icon)", soft: "var(--status-saved-soft)", textColor: "var(--status-saved)" },
  { key: "applied",      label: "Beworben",   stripLabel: "Beworben",  icon: Send,          color: "var(--status-applied)",  soft: "var(--status-applied-soft)" },
  { key: "interviewing", label: "Gespräch",   stripLabel: "Gespräche", icon: MessageCircle, color: "var(--status-interview)", soft: "var(--status-interview-soft)" },
  { key: "offered",      label: "Angebot",    stripLabel: "Angebote",  icon: CheckCircle2,  color: "var(--status-offered)",  soft: "var(--status-offered-soft)" },
  { key: "archived",     label: "Archiviert", stripLabel: "Archiviert", icon: Archive,       color: "var(--status-archived)", soft: "var(--status-archived-soft)" },
];

const STATUS_TOKEN = Object.fromEntries(BUCKETS.map((b) => [b.key, b]));

function getGreeting(name) {
  const hour = new Date().getHours();
  if (hour < 10) return `Guten Morgen, ${name}.`;
  if (hour < 14) return `Hallo, ${name}.`;
  if (hour < 18) return `Guten Nachmittag, ${name}.`;
  return `Guten Abend, ${name}.`;
}

function JobRowSkeleton({ isLast }) {
  return (
    <div
      className="flex items-center gap-4 py-3.5"
      style={{ borderBottom: isLast ? "none" : `1px solid ${T("border-subtle")}` }}
    >
      <Skel className="w-9 h-9 rounded-md flex-shrink-0" />
      <div className="flex-1">
        <Skel className="w-48 h-4 mb-1.5" />
        <Skel className="w-32 h-3" />
      </div>
      <Skel className="w-20 h-5 rounded-full" />
    </div>
  );
}

/** Map the backend `rejected` status to the frontend `archived` bucket. */
function normalizeStatus(status) {
  return status === "rejected" ? "archived" : status || "bookmarked";
}

/** Shared card surface — every dashboard card uses one visual language. */
const CARD = {
  borderRadius: 16,
  border: `1px solid ${T("border-subtle")}`,
  background: T("surface"),
  boxShadow: "var(--app-shadow-card)",
};

/**
 * Contained inline failure panel used inside cards (never a page-level block).
 * Renders the retry action only when `onRetry` is provided.
 */
function InlineError({ title, detail, onRetry, retryLabel = "Erneut versuchen" }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3.5 rounded-xl px-4 py-3.5"
      style={{
        background: T("error-soft"),
        border: `1px solid color-mix(in srgb, ${T("error")} 22%, transparent)`,
      }}
    >
      <div
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${T("error")} 14%, transparent)` }}
      >
        <AlertCircle className="w-4 h-4" style={{ color: T("error") }} />
      </div>
      <div className="flex-1 min-w-[160px]">
        <p className="text-[13px] font-semibold" style={{ color: T("text") }}>
          {title}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: T("text-muted") }}>
          {detail}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> {retryLabel}
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const _fullName = authUser?.full_name || authUser?.email?.split("@")[0] || "";
  const meName = _fullName.split(" ")[0];

  const { init, loading: bootstrapLoading, error: bootstrapError, cvLibrary } = useBootstrap();

  // SWR-backed: revisits render instantly from cache, then refresh silently —
  // but only when the cache is older than maxAge, so bouncing between pages
  // doesn't refetch the dashboard widgets on every visit.
  const { data: jobsRaw, loading: jobsLoading, error: jobsErr, reload: jobsReload } = useFetch(
    () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    { cacheKey: "jobs:list", maxAge: 60_000 }
  );
  const { data: alertsRaw, loading: alertsLoading, error: alertsErr, reload: alertsReload } = useFetch(
    () => jobAlertsApi.list().then((r) => r.data?.alerts ?? r.data ?? []),
    { cacheKey: "alerts:list", maxAge: 60_000 }
  );

  const jobs = useMemo(() => (Array.isArray(jobsRaw) ? jobsRaw : []), [jobsRaw]);
  // CV existence comes from three places, so a CV never shows up as
  // "Noch kein Lebenslauf":
  //   1. uploaded files (init.resumes)
  //   2. a CV built in the Lebenslauf-Builder and synced to the backend
  //      (init.cv, backed by the profiles_v2 row)
  //   3. the local CV library (cv_library_v1, held in BootstrapContext and
  //      merged with the server mirror) — covers users whose builder profile
  //      hasn't synced yet (offline, failed patch, or local-only copy)
  //   4. a non-empty builder draft (cv_profile_v1) — e.g. a CV the user
  //      started but never saved to the library (auto-prefilled email alone
  //      does NOT count, see hasDraftContent)
  const initResumes = init?.resumes;
  const resumes = Array.isArray(initResumes) ? initResumes : [];
  const hasCvProfile = Boolean(init?.cv?.has_content);
  const localCvLibraryCount = cvLibrary.length;
  const hasBuilderDraft = hasDraftContent();
  const jobAlerts = useMemo(() => (Array.isArray(alertsRaw) ? alertsRaw : []), [alertsRaw]);

  const bootstrapEmpty = init?.jobs_total === 0;

  const jobsFailed = jobsErr && jobs.length === 0;
  const resumesFailed = bootstrapError && !init;
  const alertsFailed = alertsErr && jobAlerts.length === 0;

  // Structural skeletons only: the cards have fixed geometry (min-h-[132px]),
  // so rendering the skeleton shape immediately causes no layout shift and
  // avoids the "bare title card → skeleton → content" pop-in sequence.
  const showJobSkeleton = useDelayedSkeleton(jobsLoading && !jobsErr && jobs.length === 0 && !bootstrapEmpty);
  const showResumeSkeleton = bootstrapLoading && !init && !resumesFailed;
  const showAlertSkeleton = alertsLoading && !alertsErr && jobAlerts.length === 0;

  const statusCounts = useMemo(() => {
    const counts = {};
    BUCKETS.forEach((b) => { counts[b.key] = 0; });
    // Seed from bootstrap so the strip never flashes "0 → real".
    const byStatus = init?.jobs_by_status || {};
    Object.entries(byStatus).forEach(([status, count]) => {
      const key = normalizeStatus(status);
      if (counts[key] !== undefined) counts[key] = count;
    });
    // The fetched list is authoritative once it has arrived.
    if (jobsRaw && Array.isArray(jobsRaw)) {
      BUCKETS.forEach((b) => { counts[b.key] = 0; });
      jobsRaw.forEach((j) => {
        const key = normalizeStatus(j.status);
        if (counts[key] !== undefined) counts[key]++;
      });
    }
    return counts;
  }, [jobsRaw, init?.jobs_by_status]);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .filter((j) => j.status !== "archived" && j.status !== "rejected")
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 5);
  }, [jobs]);

  const hasCV = resumes.length > 0 || hasCvProfile || localCvLibraryCount > 0 || hasBuilderDraft;
  const activeAlerts = jobAlerts.filter((a) => a.is_active).length;

  const allSettled = (!jobsLoading || jobsErr) && !bootstrapLoading && (!alertsLoading || alertsErr);
  const trulyEmpty = allSettled && !jobsFailed && !resumesFailed && !alertsFailed && jobs.length === 0 && resumes.length === 0 && !hasCvProfile && localCvLibraryCount === 0 && !hasBuilderDraft && jobAlerts.length === 0;

  const greeting = getGreeting(meName);

  if (trulyEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-16 px-4">
        <div className="w-full max-w-[480px] text-center">
          <img
            src="/illustrations/person-laptop.png"
            alt=""
            className="w-[220px] h-[220px] mx-auto mb-8 object-contain pointer-events-none"
          />
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-3" style={{ color: T("text") }}>
            Bereit für deine erste Bewerbung?
          </h1>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: T("text-secondary") }}>
            Erstelle deinen Lebenslauf, finde passende Stellen und behalte den Überblick über deine Bewerbungen — alles an einem Ort.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("/lebenslauf")}
              className="btn btn-primary btn-xl gap-2"
            >
              <FileText className="w-4 h-4" />
              Lebenslauf erstellen
            </button>
            <button
              type="button"
              onClick={() => navigate("/jobs?tab=finden")}
              className="btn btn-secondary btn-xl gap-2"
            >
              <Search className="w-4 h-4" />
              Jobs finden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up max-w-[1200px] mx-auto pt-2 pb-24 px-0">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: T("brand") }}>
          {new Date().toLocaleDateString("de-AT", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          }).toUpperCase()}
        </p>
        <h1 className="text-[34px] font-bold tracking-[-0.02em] leading-[1.15]" style={{ color: T("text") }}>
          {greeting}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: T("text-secondary") }}>
          Hier ist dein aktueller Überblick.
        </p>
      </header>

      {/* ── Status strip — one unified panel, five semantic columns ───── */}
      <section aria-label="Bewerbungsstatus" className="mb-10 pb-9" style={{ borderBottom: `1px solid ${T("border-subtle")}` }}>
        <div
          className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-2xl overflow-hidden"
          style={{ background: T("border-subtle"), boxShadow: "var(--app-shadow-card)" }}
        >
          {BUCKETS.map((b, i) => {
            const Icon = b.icon;
            const count = statusCounts[b.key] ?? 0;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => navigate(`/jobs?status=${b.key}`)}
                aria-label={`${count} ${b.stripLabel}`}
                className={clsx(
                  "group flex flex-col items-center justify-center gap-2.5 py-6 px-4 cursor-pointer",
                  "bg-[var(--app-surface)] transition-colors duration-150 hover:bg-[var(--app-surface-hover)]",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--app-brand)] focus-visible:z-10",
                  i >= BUCKETS.length - 1 && "max-md:col-span-2",
                )}
              >
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-[1.05]"
                  style={{ background: b.soft }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: b.color }} />
                </span>
                <span className="text-center">
                  <span
                    className="text-[26px] font-bold tracking-[-0.02em] block leading-none mb-1.5 transition-colors duration-150 group-hover:text-[var(--app-brand)]"
                    style={{ color: T("text"), fontVariantNumeric: "tabular-nums" }}
                  >
                    <CountUp value={count} />
                  </span>
                  <span className="block text-[12px] font-medium" style={{ color: T("text-muted") }}>
                    {b.stripLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Main content — activity left (60%), status cards right (40%) ── */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        {/* Left: Latest activity */}
        <div className="col-span-12 lg:col-span-7 min-w-0">
          <div className="rounded-2xl border overflow-hidden h-full flex flex-col" style={CARD}>
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: `1px solid ${T("border-subtle")}`, background: T("surface-hover") }}
            >
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em]" style={{ color: T("text-muted") }}>
                Letzte Aktivität
              </h2>
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className="section-link inline-flex items-center text-[13px] font-medium gap-1.5 cursor-pointer bg-transparent border-none p-0"
              >
                Alle Stellen <ArrowRight className="arrow-shift w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-3 py-1 flex-1">
              {showJobSkeleton && (
                [0, 1, 2].map((i) => <JobRowSkeleton key={i} isLast={i === 2} />)
              )}

              {/* Failure stays contained inside the activity card */}
              {jobsFailed && (
                <div className="p-3">
                  <InlineError
                    title="Stellen konnten nicht geladen werden."
                    detail="Überprüfe deine Verbindung und versuche es erneut."
                    onRetry={() => jobsReload()}
                  />
                </div>
              )}

              {!showJobSkeleton && !jobsFailed && recentJobs.length === 0 && (bootstrapEmpty || !jobsLoading) && (
                <div className="py-12 text-center">
                  <p className="text-[14px]" style={{ color: T("text-muted") }}>
                    Noch keine Stellen gespeichert.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/jobs?tab=finden")}
                    className="btn btn-link text-[13px] mt-3 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Jobs finden
                  </button>
                </div>
              )}

              {!showJobSkeleton && !jobsFailed && recentJobs.length > 0 && (
                <div className="flex flex-col" role="list">
                  {recentJobs.map((job, i) => {
                    const bucket = STATUS_TOKEN[normalizeStatus(job.status)] || BUCKETS[0];
                    const StatusIcon = bucket.icon;
                    const role = job.role || job.title || "Stelle";
                    const company = job.company || "";
                    const date = job.updated_at || job.created_at;
                    const dateStr = date
                      ? new Date(date).toLocaleDateString("de-AT", { day: "numeric", month: "short" })
                      : "";
                    return (
                      <div
                        key={job.id || i}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`${role} bei ${company || "Unbekannt"}, ${bucket.label}`}
                        className="interactive-row group flex items-center gap-3.5 py-3 px-2.5 rounded-lg focus:outline-none"
                        style={{
                          borderBottom: i < recentJobs.length - 1 ? `1px solid ${T("border-subtle")}` : "none",
                        }}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/jobs/${job.id}`);
                          }
                        }}
                      >
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ background: bucket.soft }}
                        >
                          <StatusIcon className="w-[15px] h-[15px]" style={{ color: bucket.color }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-medium truncate" style={{ color: T("text") }}>{role}</span>
                          <span className="block text-[12px] mt-0.5 truncate" style={{ color: T("text-muted") }}>
                            {company}
                            {dateStr ? ` · ${dateStr}` : ""}
                          </span>
                        </span>
                        <span
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block"
                          style={{ color: bucket.textColor || bucket.color, background: bucket.soft }}
                        >
                          {bucket.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T("text-faint") }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: CV status + alert status */}
        <div className="col-span-12 lg:col-span-5 min-w-0 flex flex-col gap-5">
          {/* CV card — restrained green accenting */}
          <div
            className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 min-h-[132px] ${hasCV ? "interactive-row" : ""}`}
            style={{
              ...CARD,
              borderRadius: 16,
              borderColor: hasCV ? `color-mix(in srgb, var(--status-offered) 30%, transparent)` : T("border-subtle"),
              transition: "border-color 0.2s ease",
            }}
          >
            {showResumeSkeleton ? (
              <>
                <div className="flex items-center gap-3">
                  <Skel className="w-10 h-10 rounded-lg" />
                  <div><Skel className="w-36 h-4 mb-1" /><Skel className="w-28 h-3" /></div>
                </div>
                <Skel className="w-24 h-4" />
              </>
            ) : resumesFailed ? (
              <>
                <InlineError
                  title="Nicht verfügbar"
                  detail="Lebenslauf-Daten konnten nicht geladen werden."
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: hasCV ? "var(--status-offered-soft)" : "var(--app-accent-soft)" }}
                  >
                    <FileText className="w-[18px] h-[18px]" style={{ color: hasCV ? "var(--status-offered)" : "var(--app-brand)" }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-tight" style={{ color: T("text") }}>
                      {hasCV ? "Lebenslauf bereit" : "Noch kein Lebenslauf"}
                    </span>
                    <span className="block mt-1 text-[12px]" style={{ color: T("text-muted") }}>
                      {resumes.length > 0
                        ? `${resumes.length} ${resumes.length === 1 ? "Datei" : "Dateien"} gespeichert`
                        : localCvLibraryCount > 0
                        ? `${localCvLibraryCount} ${localCvLibraryCount === 1 ? "Lebenslauf" : "Lebensläufe"} gespeichert`
                        : hasBuilderDraft
                        ? "Entwurf im Lebenslauf-Builder gespeichert"
                        : "Profil im Lebenslauf-Builder gespeichert"}
                    </span>
                  </span>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); navigate("/lebenslauf"); }} className="btn btn-link text-[13px] gap-1.5 self-end font-medium">
                  {hasCV ? "Bearbeiten" : "Jetzt erstellen"} <ArrowRight className="arrow-shift w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Alerts card — amber accent, contained error state */}
          <div
            className="rounded-2xl border p-5 flex flex-col justify-between gap-3 min-h-[132px]"
            style={{
              ...CARD,
              borderRadius: 16,
              borderColor: activeAlerts > 0 ? `color-mix(in srgb, var(--status-saved) 30%, transparent)` : T("border-subtle"),
              transition: "border-color 0.2s ease",
            }}
          >
            {showAlertSkeleton ? (
              <>
                <div className="flex items-center gap-3">
                  <Skel className="w-10 h-10 rounded-lg" />
                  <div><Skel className="w-28 h-4 mb-1" /><Skel className="w-40 h-3" /></div>
                </div>
                <Skel className="w-24 h-4" />
              </>
            ) : alertsFailed ? (
              <>
                <InlineError
                  title="Nicht verfügbar"
                  detail="Alert-Daten konnten nicht geladen werden."
                  onRetry={() => alertsReload()}
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: activeAlerts > 0 ? "var(--status-saved-soft)" : "var(--app-accent-soft)" }}
                  >
                    <Bell className="w-[18px] h-[18px]" style={{ color: activeAlerts > 0 ? "var(--status-saved)" : "var(--app-brand)" }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-tight" style={{ color: T("text") }}>
                      {activeAlerts > 0 ? `${activeAlerts} aktive ${activeAlerts === 1 ? "Alert" : "Alerts"}` : "Keine Alerts"}
                    </span>
                    <span className="block mt-1 text-[12px]" style={{ color: T("text-muted") }}>
                      {activeAlerts > 0 ? "Neue Stellen per E-Mail" : "Werde benachrichtigt über neue Jobs"}
                    </span>
                  </span>
                </div>
                <button type="button" onClick={() => navigate("/job-alerts")} className="btn btn-link text-[13px] gap-1.5 self-end font-medium">
                  {activeAlerts > 0 ? "Verwalten" : "Alert anlegen"} <ArrowRight className="arrow-shift w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Discovery panel ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden grid grid-cols-12"
        style={{ ...CARD }}
      >
        <div className="col-span-12 lg:col-span-7 px-7 py-7 flex flex-col justify-center min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T("brand") }}>
            Mehr entdecken
          </p>
          <h2 className="text-[18px] font-bold tracking-[-0.01em] leading-[1.3] mb-1.5" style={{ color: T("text") }}>
            Lebenslauf, KV-Check und mehr
          </h2>
          <p className="text-[13.5px] leading-relaxed mb-4 max-w-md" style={{ color: T("text-secondary") }}>
            Erstelle deinen Lebenslauf, vergleiche Gehälter mit dem Kollektivvertrag und behalte deine Bewerbungen im Blick.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => navigate("/lebenslauf")} className="btn btn-primary btn-md gap-1.5 text-[12.5px] cursor-pointer">
              <FileText className="w-3.5 h-3.5" /> Lebenslauf
            </button>
            <button type="button" onClick={() => navigate("/jobs?tab=finden")} className="btn btn-secondary btn-md gap-1.5 text-[12.5px] cursor-pointer">
              <Search className="w-3.5 h-3.5" /> Jobs finden
            </button>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-5 min-h-[150px] lg:min-h-0 flex items-center justify-center px-5 py-5"
          style={{
            background: "color-mix(in srgb, var(--app-brand) 8%, var(--app-surface))",
            borderLeft: "1px solid var(--app-border-subtle)",
          }}
        >
          <img
            src="/illustrations/person-laptop.png"
            alt=""
            className="w-full max-w-[180px] h-auto object-contain pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
