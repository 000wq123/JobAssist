import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark, Send, MessageCircle, CheckCircle2, Archive,
  FileText, Bell, ArrowRight, Plus, Search, RefreshCw, AlertCircle,
} from "lucide-react";

import useAuthStore from "../hooks/useAuthStore";
import { jobApi, jobAlertsApi } from "../services/api";
import useFetch from "../hooks/useFetch";
import { Skel, useDelayedSkeleton, usePageTitle } from "../hooks/usePageChrome";
import { useBootstrap } from "../context/BootstrapContext";

function T(name) {
  return `var(--app-${name})`;
}

const BUCKETS = [
  { key: "bookmarked",   label: "Gemerkt",     icon: Bookmark,      color: "#f59e0b" },
  { key: "applied",      label: "Beworben",    icon: Send,           color: "#3b82f6" },
  { key: "interviewing", label: "Gespräch",    icon: MessageCircle,  color: "#8b5cf6" },
  { key: "offered",      label: "Angebot",     icon: CheckCircle2,   color: "#22c55e" },
  { key: "archived",     label: "Archiviert",  icon: Archive,        color: "#6b7280" },
];

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
      style={{ borderBottom: isLast ? "none" : `1px solid ${T("border")}` }}
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

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const _fullName = authUser?.full_name || authUser?.email?.split("@")[0] || "";
  const meName = _fullName.split(" ")[0];

  const { init, loading: bootstrapLoading, error: bootstrapError } = useBootstrap();

  // SWR-backed: revisits render instantly from cache, then refresh silently.
  const { data: jobsRaw, loading: jobsLoading, error: jobsErr, reload: jobsReload } = useFetch(
    () => jobApi.list().then((r) => r.data?.items ?? r.data ?? []),
    { cacheKey: "jobs:list" }
  );
  const { data: alertsRaw, loading: alertsLoading, error: alertsErr, reload: alertsReload } = useFetch(
    () => jobAlertsApi.list().then((r) => r.data?.alerts ?? r.data ?? []),
    { cacheKey: "alerts:list" }
  );

  const jobs = useMemo(() => (Array.isArray(jobsRaw) ? jobsRaw : []), [jobsRaw]);
  // CV existence comes straight from the bootstrap payload — no extra request.
  const initResumes = init?.resumes;
  const resumes = Array.isArray(initResumes) ? initResumes : [];
  const jobAlerts = useMemo(() => (Array.isArray(alertsRaw) ? alertsRaw : []), [alertsRaw]);

  const bootstrapEmpty = init?.jobs_total === 0;

  const jobsFailed = jobsErr && jobs.length === 0;
  const resumesFailed = bootstrapError && !init;
  const alertsFailed = alertsErr && jobAlerts.length === 0;

  const showJobSkeleton = useDelayedSkeleton(jobsLoading && !jobsErr && jobs.length === 0 && !bootstrapEmpty);
  const showResumeSkeleton = useDelayedSkeleton(bootstrapLoading && !init && !resumesFailed);
  const showAlertSkeleton = useDelayedSkeleton(alertsLoading && !alertsErr && jobAlerts.length === 0);

  const resumeUndetermined = bootstrapLoading && !init && !resumesFailed && !showResumeSkeleton;
  const alertsUndetermined = alertsLoading && !alertsErr && jobAlerts.length === 0 && !showAlertSkeleton;

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

  const hasCV = resumes.length > 0;
  const activeAlerts = jobAlerts.filter((a) => a.is_active).length;
  const totalApplications = jobs.filter((j) => j.status !== "bookmarked" && j.status !== "archived" && j.status !== "rejected").length;

  const allSettled = (!jobsLoading || jobsErr) && !bootstrapLoading && (!alertsLoading || alertsErr);
  const trulyEmpty = allSettled && !jobsFailed && !resumesFailed && !alertsFailed && jobs.length === 0 && resumes.length === 0 && jobAlerts.length === 0;

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
    <div className="max-w-[1200px] mx-auto pt-6 pb-16 px-0">
      {/* Greeting */}
      <div className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T("brand") }}>
          {new Date().toLocaleDateString("de-AT", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        <h1 className="text-[36px] font-bold tracking-[-0.03em] leading-[1.1]" style={{ color: T("text") }}>
          {greeting}
        </h1>
        {totalApplications > 0 && (
          <p className="mt-2 text-[14px]" style={{ color: T("text-secondary") }}>
            Du hast {totalApplications} aktive {totalApplications === 1 ? "Bewerbung" : "Bewerbungen"}.
          </p>
        )}
      </div>

      {/* KPI strip — unified container */}
      <div className="mb-12 pb-8" style={{ borderBottom: `1px solid ${T("border")}` }}>
        <div className="grid grid-cols-5 rounded-2xl overflow-hidden" style={{ background: T("surface-hover"), border: `1px solid ${T("border-subtle")}` }}>
          {BUCKETS.map((b, i) => {
            const Icon = b.icon;
            const count = statusCounts[b.key] ?? 0;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => navigate(`/jobs?status=${b.key}`)}
                className="group flex flex-col items-center gap-3 py-5 px-4 transition-all cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                style={{ borderRight: i < BUCKETS.length - 1 ? `1px solid ${T("border-subtle")}` : "none" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: `${b.color}14` }}
                >
                  <Icon className="w-[17px] h-[17px]" style={{ color: b.color }} />
                </div>
                <div className="text-center">
                  <span
                    className="text-[22px] font-bold tracking-[-0.02em] tabular-nums block mb-0.5"
                    style={{ color: T("text"), fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
                  >
                    {count}
                  </span>
                  <span className="text-[11.5px] font-medium" style={{ color: T("text-secondary") }}>
                    {b.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column main area */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        {/* Left: Recent activity */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: T("text") }}>
              Letzte Aktivität
            </h2>
            {jobs.length > 5 && (
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className="btn btn-link text-[13px] gap-1.5">
                Alle Stellen <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showJobSkeleton && (
            [0, 1, 2].map((i) => <JobRowSkeleton key={i} isLast={i === 2} />)
          )}

          {/* Error — compact inline banner */}
          {jobsFailed && (
            <div
              className="flex items-center gap-4 rounded-lg px-4 py-3 mb-3"
              style={{ background: T("error-soft"), borderLeft: `3px solid ${T("error")}` }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: T("error") }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: T("text") }}>
                  Stellen konnten nicht geladen werden.
                </p>
                <p className="text-[12px]" style={{ color: T("text-muted") }}>
                  Überprüfe deine Verbindung und versuche es erneut.
                </p>
              </div>
              <button
                type="button"
                onClick={() => jobsReload()}
                className="btn btn-secondary h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0">
                <RefreshCw className="w-3 h-3" /> Erneut versuchen
              </button>
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
            <div className="flex flex-col">
              {recentJobs.map((job, i) => {
                const bucket = BUCKETS.find((b) => b.key === normalizeStatus(job.status)) || BUCKETS[0];
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
                    className="group flex items-center gap-4 py-3.5 cursor-pointer transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg"
                    style={{ borderBottom: i < recentJobs.length - 1 ? `1px solid ${T("border")}` : "none" }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${bucket.color}15` }}>
                      <StatusIcon className="w-[15px] h-[15px]" style={{ color: bucket.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: T("text") }}>{role}</p>
                      <p className="text-[12px] mt-0.5 truncate" style={{ color: T("text-muted") }}>
                        {company}
                        {dateStr ? ` · ${dateStr}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block" style={{ color: bucket.color, background: `${bucket.color}10` }}>
                      {bucket.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T("text-faint") }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: CV + Alerts */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          {/* CV card */}
          <div
            className="rounded-xl border p-5 flex flex-col gap-3"
            style={{ borderColor: hasCV ? "rgba(34,197,94,0.15)" : T("border"), background: T("surface"), transition: "border-color 0.2s ease" }}
          >
            {showResumeSkeleton ? (
              <>
                <div className="flex items-center gap-3">
                  <Skel className="w-10 h-10 rounded-lg" />
                  <div><Skel className="w-36 h-4 mb-1" /><Skel className="w-28 h-3" /></div>
                </div>
                <Skel className="w-24 h-4" />
              </>
            ) : resumeUndetermined ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: T("border-subtle") }}>
                    <FileText className="w-[18px] h-[18px]" style={{ color: T("text-faint") }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>Lebenslauf</p>
                  </div>
                </div>
              </>
            ) : resumesFailed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: T("error-soft") }}>
                    <AlertCircle className="w-[18px] h-[18px]" style={{ color: T("error") }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>Nicht verfügbar</p>
                    <p className="text-[12px]" style={{ color: T("text-muted") }}>Lebenslauf-Daten konnten nicht geladen werden.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${hasCV ? "#22c55e" : "var(--app-brand)"}15` }}>
                    <FileText className="w-[18px] h-[18px]" style={{ color: hasCV ? "#22c55e" : "var(--app-brand)" }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>
                      {hasCV ? "Lebenslauf bereit" : "Noch kein Lebenslauf"}
                    </p>
                    <p className="text-[12px]" style={{ color: T("text-muted") }}>
                      {hasCV ? `${resumes.length} ${resumes.length === 1 ? "Datei" : "Dateien"} gespeichert` : "Erstelle deinen ersten Lebenslauf"}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/lebenslauf")} className="btn btn-link text-[13px] gap-1.5 self-start font-medium">
                  {hasCV ? "Bearbeiten" : "Jetzt erstellen"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Alerts card */}
          <div
            className="rounded-xl border p-5 flex flex-col gap-3"
            style={{ borderColor: activeAlerts > 0 ? "rgba(245,158,11,0.15)" : T("border"), background: T("surface"), transition: "border-color 0.2s ease" }}
          >
            {showAlertSkeleton ? (
              <>
                <div className="flex items-center gap-3">
                  <Skel className="w-10 h-10 rounded-lg" />
                  <div><Skel className="w-28 h-4 mb-1" /><Skel className="w-40 h-3" /></div>
                </div>
                <Skel className="w-24 h-4" />
              </>
            ) : alertsUndetermined ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: T("border-subtle") }}>
                    <Bell className="w-[18px] h-[18px]" style={{ color: T("text-faint") }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>Alerts</p>
                  </div>
                </div>
              </>
            ) : alertsFailed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: T("error-soft") }}>
                    <AlertCircle className="w-[18px] h-[18px]" style={{ color: T("error") }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>Nicht verfügbar</p>
                    <p className="text-[12px]" style={{ color: T("text-muted") }}>Alert-Daten konnten nicht geladen werden.</p>
                  </div>
                </div>
                <button type="button" onClick={() => alertsReload()} className="btn btn-link text-[13px] gap-1.5 self-start">
                  <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: activeAlerts > 0 ? "rgba(245,158,11,0.15)" : "var(--app-brand)08" }}>
                    <Bell className="w-[18px] h-[18px]" style={{ color: activeAlerts > 0 ? "#f59e0b" : "var(--app-brand)" }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: T("text") }}>
                      {activeAlerts > 0 ? `${activeAlerts} aktive Alerts` : "Keine Alerts"}
                    </p>
                    <p className="text-[12px]" style={{ color: T("text-muted") }}>
                      {activeAlerts > 0 ? "Neue Stellen per E-Mail" : "Werde benachrichtigt über neue Jobs"}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/job-alerts")} className="btn btn-link text-[13px] gap-1.5 self-start font-medium">
                  {activeAlerts > 0 ? "Verwalten" : "Alert anlegen"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Workbench promo panel */}
      <div
        className="rounded-2xl border overflow-hidden grid grid-cols-12"
        style={{ borderColor: T("border"), background: T("surface") }}
      >
        <div className="col-span-12 lg:col-span-7 p-7 flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.10em] mb-2" style={{ color: T("text-muted") }}>
            Mehr entdecken
          </p>
          <h2 className="text-[18px] font-bold tracking-[-0.01em] leading-[1.3] mb-2" style={{ color: T("text") }}>
            Lebenslauf, KV-Check und mehr
          </h2>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: T("text-secondary") }}>
            Erstelle deinen Lebenslauf, vergleiche Gehälter mit dem Kollektivvertrag und behalte deine Bewerbungen im Blick.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/lebenslauf")} className="btn btn-primary btn-md gap-1.5 text-[12.5px]">
              <FileText className="w-3.5 h-3.5" /> Lebenslauf
            </button>
            <button type="button" onClick={() => navigate("/jobs?tab=finden")} className="btn btn-secondary btn-md gap-1.5 text-[12.5px]">
              <Search className="w-3.5 h-3.5" /> Jobs finden
            </button>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 min-h-[180px] lg:min-h-0 flex items-center justify-center p-5"
          style={{ background: "color-mix(in srgb, var(--app-border-subtle) 60%, var(--app-bg, #FAFAF8))" }}>
          <img
            src="/illustrations/person-laptop.png"
            alt=""
            className="w-full max-w-[200px] h-auto object-contain pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
