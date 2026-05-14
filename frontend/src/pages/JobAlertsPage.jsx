import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  ChevronLeft,
  Lock,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { jobAlertsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getRewriteState, getRunState, getCreationState, updateUsageList } from "../utils/jobAlertsState";

const JOB_TYPES = [
  { value: "", label: "Alle" },
  { value: "Full-time", label: "Vollzeit" },
  { value: "Part-time", label: "Teilzeit" },
  { value: "Contract", label: "Befristet" },
  { value: "Internship", label: "Praktikum" },
  { value: "Lehre", label: "Lehre" },
  { value: "Samstagsjob", label: "Samstagsjob" },
];

const FREQUENCIES = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
];

/**
 * Optimistically updates both billing-overview and init query caches by `delta` for job_alerts.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {number} delta
 */
function bumpJobAlertUsageCaches(queryClient, delta) {
  queryClient.setQueryData(["billing-overview"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
  queryClient.setQueryData(["init"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
}

/**
 * Reads persisted job alerts from localStorage, returning undefined on miss or parse error.
 * @returns {object[]|undefined}
 */
function loadStoredAlerts() {
  try {
    const raw = localStorage.getItem("job_alerts");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Handle both old array format and new object format
    return Array.isArray(parsed) ? { alerts: parsed } : parsed;
  } catch {
    return undefined;
  }
}

/**
 * Writes the current alerts list to localStorage for offline-first initialData.
 * @param {object[]} responseData
 */
function syncStoredAlerts(responseData) {
  try {
    localStorage.setItem("job_alerts", JSON.stringify(responseData));
  } catch {}
}

/**
 * Formats an ISO datetime string to a localised German date-time label.
 * @param {string} value
 * @returns {string}
 */
function formatAlertDateTime(value) {
  return new Date(value).toLocaleString("de-AT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Compact card in the left list panel representing a single job alert.
 * @param {object} props
 * @param {object} props.alert
 * @param {boolean} props.isSelected
 * @param {(id: string) => void} props.onSelect
 */
function AlertListCard({ alert, isSelected, onSelect }) {
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Stellen";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;

  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? "border-brand-500/40 bg-[#111827] shadow-[0_0_0_1px_rgba(91,79,232,0.2),0_0_24px_rgba(91,79,232,0.12)]"
          : "border-[#1f2937] bg-[#111827] hover:border-brand-500/30 hover:bg-[#131c2b]"
      }`}
    >
      <div className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${isSelected ? "bg-brand-500" : "bg-transparent"}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="truncate text-sm font-semibold text-white">{alert.keywords}</p>
          <p className="mt-1 text-xs text-slate-400">{alert.location || "Ohne Ortsfilter"}</p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            alert.is_active
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-slate-700 bg-slate-800 text-slate-400"
          }`}
        >
          {alert.is_active ? "Aktiv" : "Pausiert"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full border border-[#243041] bg-[#0b1220] px-2 py-0.5 text-slate-300">{typeLabel}</span>
        <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-brand-200">{freqLabel}</span>
      </div>
    </button>
  );
}

/**
 * Right-panel detail view for the selected job alert with run, edit, and delete actions.
 * @param {object} props
 * @param {object} props.alert
 * @param {() => void} props.onDelete
 * @param {() => void} props.onRunNow
 * @param {(alert: object) => void} props.onEdit
 * @param {boolean} props.isRunning
 * @param {'idle'|'running'|'done'|'error'} props.runState
 * @param {'idle'|'creating'|'done'|'error'} props.creationState
 */
function AlertDetailPanel({ alert, onDelete, onRunNow, onEdit, isRunning, runState, creationState }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Stellenarten";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;

  const runDisabled = isRunning || runState.atLimit;
  const runTitle = runState.atLimit
    ? `Tageslimit erreicht (${runState.used}/${runState.limit}). Reset um 00:00 Uhr UTC.`
    : "Jetzt ausführen";

  const configItems = [
    { icon: MapPin, label: "Ort", value: alert.location || "Kein Ortsfilter" },
    { icon: Briefcase, label: "Stellenart", value: typeLabel },
    { icon: Clock3, label: "Frequenz", value: freqLabel },
    { icon: Mail, label: "E-Mail", value: alert.email },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Run-limit banner */}
      {runState.atLimit && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Tageslimit für manuelle Ausführungen erreicht ({runState.used}/{runState.limit}).
            Reset um 00:00 Uhr UTC.
          </span>
        </div>
      )}

      {/* Creation-limit banner */}
      {creationState.atLimit && (
        <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-300">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Tageslimit für Erstellungen/Bearbeitungen erreicht ({creationState.used}/{creationState.limit}).{" "}
            <span className="font-semibold underline cursor-pointer">Upgrade auf Pro</span> für mehr Kapazität.
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-[#1f2937] bg-[#111827]">
        <div className="h-px w-full bg-gradient-to-r from-brand-500 via-brand-300/60 to-transparent" />
        <div className="p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">Alert-Profil</p>
                <span className="inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-200">
                  {freqLabel}
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-white">{alert.keywords}</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {alert.is_active
                  ? "Benachrichtigungen sind aktiv und folgen deinem gewählten Rhythmus."
                  : "Benachrichtigungen sind pausiert und werden aktuell nicht versendet."}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => !runDisabled && onRunNow(alert.id)}
                disabled={runDisabled}
                title={runTitle}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  runDisabled
                    ? "cursor-not-allowed bg-slate-800 text-slate-500"
                    : "bg-brand-500 text-white hover:bg-brand-400"
                }`}
              >
                {isRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : runState.atLimit ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                Jetzt ausführen
                {!runState.unlimited && !runState.atLimit && (
                  <span
                    title={`Verbleibende manuelle Ausführungen heute (${runState.remaining} von ${runState.limit})`}
                    className="ml-0.5 rounded-full bg-brand-700/50 px-1.5 py-0.5 text-[10px]"
                  >
                    {runState.remaining} übrig
                  </span>
                )}
              </button>
              <button
                onClick={() => onEdit(alert)}
                disabled={creationState.atLimit}
                title={creationState.atLimit ? `Tageslimit für Bearbeitungen erreicht (${creationState.used}/${creationState.limit})` : "Bearbeiten"}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  creationState.atLimit
                    ? "cursor-not-allowed border-slate-800 bg-transparent text-slate-600"
                    : "border-[#334155] bg-transparent text-slate-200 hover:border-brand-500/30 hover:text-brand-200"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </button>
              <div className="relative">
                {menuOpen && (
                  <div className="fixed inset-0 z-[49]" onClick={() => setMenuOpen(false)} />
                )}
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="relative z-50 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-[#334155] text-slate-400 transition-colors hover:border-brand-500/30 hover:text-brand-200"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 z-50 min-w-[9rem] rounded-xl border border-[#1f2937] bg-[#0b1220] p-1.5 shadow-lg shadow-black/50">
                    <button
                      onClick={() => { onDelete(alert.id); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Alert-Konfiguration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {configItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex max-h-20 items-center rounded-xl border border-[#243041] bg-[#0b1220] p-2">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-brand-400" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  <p className="truncate text-sm font-semibold text-slate-100">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" />
          <p className="text-xs font-semibold text-white">Letzte Benachrichtigung</p>
        </div>
        <p className="text-xs text-slate-300">
          {alert.last_sent_at
            ? `Zuletzt aktualisiert am ${formatAlertDateTime(alert.last_sent_at)}`
            : "Noch keine Benachrichtigung protokolliert. Starte bei Bedarf eine manuelle Suche über den Primär-Button."}
        </p>
      </div>
    </div>
  );
}

/**
 * Modal form for creating or editing a job alert.
 * Supports all alert fields including location city map.
 */
function CreateAlertModal({
  onClose,
  onSubmit,
  defaultEmail,
  initialData,
  title = "Neuer Job-Alert",
  submitLabel = "Alert erstellen",
}) {
  const [form, setForm] = useState({
    keywords: initialData?.keywords || "",
    location: initialData?.location || "",
    job_type: initialData?.job_type || "",
    email: defaultEmail || "",
    frequency: initialData?.frequency || "daily",
  });

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.keywords.trim()) return toast.error("Bitte Suchbegriff eingeben");
    if (!form.email.trim()) return toast.error("Bitte E-Mail-Adresse eingeben");
    onSubmit({
      keywords: form.keywords.trim(),
      location: form.location.trim() || null,
      job_type: form.job_type || null,
      email: form.email.trim(),
      frequency: form.frequency,
    });
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(2,6,23,0.78)",
        padding: "16px",
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#1f2937] bg-[#111827] p-4 sm:p-6 shadow-[0_0_0_1px_rgba(91,79,232,0.08),0_24px_80px_rgba(2,6,23,0.55)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Suchbegriff *</label>
            <input
              type="text"
              value={form.keywords}
              onChange={(e) => setValue("keywords", e.target.value)}
              placeholder="z. B. Grafikdesign, Lagerarbeit oder Büro"
              className="w-full rounded-xl border border-[#243041] bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Standort</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setValue("location", e.target.value)}
              placeholder="z. B. Wien, Graz oder Österreich"
              className="w-full rounded-xl border border-[#243041] bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Stellenart</label>
            <select
              value={form.job_type}
              onChange={(e) => setValue("job_type", e.target.value)}
              className="w-full rounded-xl border border-[#243041] bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
            >
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">E-Mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2.5 text-sm text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">Alerts werden nur an deine registrierte E-Mail-Adresse gesendet.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Häufigkeit</label>
            <div className="flex gap-4">
              {FREQUENCIES.map((f) => (
                <label key={f.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value={f.value}
                    checked={form.frequency === f.value}
                    onChange={() => setValue("frequency", f.value)}
                    className="accent-brand-500"
                  />
                  <span className="text-sm text-slate-300">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/** Job alerts page: split-view list + detail panel with create, edit, delete, and manual-run actions. */
export default function JobAlertsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [mobileView, setMobileView] = useState("list");

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => {
      try {
        const raw = localStorage.getItem("init");
        return raw ? JSON.parse(raw) : queryClient.getQueryData(["init"]);
      } catch {
        return queryClient.getQueryData(["init"]);
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  const me = initData?.me;
  const { guardedRun } = useUsageGuard("job_alerts");

  const { data: alertsData, isFetching } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () =>
      jobAlertsApi.list().then((r) => {
        syncStoredAlerts(r.data);
        return r.data;
      }),
    initialData: () => queryClient.getQueryData(["job-alerts"]) ?? loadStoredAlerts(),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
  });

  // alertsData is now { alerts, daily_manual_run_count, daily_creation_count, daily_manual_run_limit, daily_creation_limit }
  const alerts = useMemo(() => alertsData?.alerts ?? [], [alertsData?.alerts]);
  const runState = getRunState(alertsData ?? {});
  const creationState = getCreationState(alertsData ?? {});

  useEffect(() => {
    if (!alerts.length) {
      setSelectedAlertId(null);
      return;
    }
    if (!alerts.some((a) => a.id === selectedAlertId)) setSelectedAlertId(alerts[0].id);
  }, [alerts, selectedAlertId]);

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: (res) => {
      queryClient.setQueryData(["job-alerts"], (old) => {
        const next = { ...(old ?? {}), alerts: [res.data, ...(old?.alerts ?? [])] };
        syncStoredAlerts(next);
        return next;
      });
      setSelectedAlertId(res.data.id);
      bumpJobAlertUsageCaches(queryClient, 1);
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
      setShowCreate(false);
      toast.success("Alert erstellt!");
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        const detail = err.response?.data?.detail;
        if (detail?.error === "usage_limit") return;
        if (detail?.error === "daily_creation_limit") {
          toast.error(`Tageslimit erreicht (${detail.used}/${detail.limit}). Reset um 00:00 Uhr UTC.`);
          return;
        }
      }
      toast.error(getApiErrorMessage(err, "Fehler beim Erstellen des Alerts"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobAlertsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["job-alerts"] });
      const prev = queryClient.getQueryData(["job-alerts"]);
      queryClient.setQueryData(["job-alerts"], (old) => {
        const next = {
          ...(old ?? {}),
          alerts: (old?.alerts ?? []).map((a) =>
            a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
          ),
        };
        syncStoredAlerts(next);
        return next;
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["job-alerts"], ctx.prev);
        syncStoredAlerts(ctx.prev);
      }
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "daily_creation_limit") {
        const detail = err.response.data.detail;
        toast.error(`Tageslimit erreicht (${detail.used}/${detail.limit}). Reset um 00:00 Uhr UTC.`);
        return;
      }
      toast.error(getApiErrorMessage(err, "Fehler beim Aktualisieren"));
    },
    onSuccess: (res) => {
      queryClient.setQueryData(["job-alerts"], (old) => {
        const next = {
          ...(old ?? {}),
          alerts: (old?.alerts ?? []).map((a) => (a.id === res.data.id ? res.data : a)),
        };
        syncStoredAlerts(next);
        return next;
      });
      setEditingAlert(null);
      toast.success("Alert aktualisiert!");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["job-alerts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => jobAlertsApi.delete(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["job-alerts"] }),
        queryClient.cancelQueries({ queryKey: ["billing-overview"] }),
        queryClient.cancelQueries({ queryKey: ["init"] }),
      ]);
      const prev = {
        alerts: queryClient.getQueryData(["job-alerts"]),
        billing: queryClient.getQueryData(["billing-overview"]),
        init: queryClient.getQueryData(["init"]),
      };
      queryClient.setQueryData(["job-alerts"], (old) => {
        const next = { ...(old ?? {}), alerts: (old?.alerts ?? []).filter((a) => a.id !== id) };
        syncStoredAlerts(next);
        return next;
      });
      bumpJobAlertUsageCaches(queryClient, -1);
      toast.success("Alert gelöscht");
      return prev;
    },
    onError: (err, _id, ctx) => {
      if (ctx?.alerts) {
        queryClient.setQueryData(["job-alerts"], ctx.alerts);
        syncStoredAlerts(ctx.alerts);
      }
      if (ctx?.billing) queryClient.setQueryData(["billing-overview"], ctx.billing);
      if (ctx?.init) queryClient.setQueryData(["init"], ctx.init);
      toast.error(getApiErrorMessage(err, "Fehler beim Löschen"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
    },
  });

  const handleRunNow = async (id) => {
    if (runningId) return;
    if (runState.atLimit) {
      toast.error(`Tageslimit erreicht (${runState.used}/${runState.limit}). Reset um 00:00 Uhr UTC.`);
      return;
    }
    setRunningId(id);
    try {
      await jobAlertsApi.runNow(id);
      // Optimistically bump the run count in local cache so button disables immediately
      queryClient.setQueryData(["job-alerts"], (old) =>
        old
          ? { ...old, daily_manual_run_count: (old.daily_manual_run_count ?? 0) + 1 }
          : old
      );
      toast.success("Suche gestartet. Du erhältst bald eine E-Mail.", { duration: 5000 });
    } catch (err) {
      if (err.response?.status === 403) {
        const detail = err.response?.data?.detail;
        if (detail?.error === "daily_run_limit") {
          toast.error(`Tageslimit erreicht (${detail.used}/${detail.limit}). Reset um 00:00 Uhr UTC.`);
          // Sync accurate count into cache
          queryClient.setQueryData(["job-alerts"], (old) =>
            old ? { ...old, daily_manual_run_count: detail.used } : old
          );
          return;
        }
        if (detail?.error === "usage_limit") return;
      }
      toast.error(getApiErrorMessage(err, "Fehler beim Starten der Suche"));
    } finally {
      setRunningId(null);
    }
  };

  const handleOpenCreate = () => {
    if (creationState.atLimit) {
      toast.error(
        `Tageslimit für Erstellungen erreicht (${creationState.used}/${creationState.limit}). Upgrade auf Pro oder warte bis 00:00 Uhr UTC.`,
        { duration: 6000 }
      );
      return;
    }
    guardedRun(() => setShowCreate(true));
  };

  const handleOpenEdit = (current) => {
    if (creationState.atLimit) {
      toast.error(
        `Tageslimit für Bearbeitungen erreicht (${creationState.used}/${creationState.limit}). Upgrade auf Pro oder warte bis 00:00 Uhr UTC.`,
        { duration: 6000 }
      );
      return;
    }
    const { canRewrite, remainingMin } = getRewriteState(current);
    if (!canRewrite) {
      toast.error(`Du kannst diesen Alert in ${remainingMin} Minuten erneut bearbeiten.`);
      return;
    }
    setEditingAlert(current);
  };

  const activeCount = alerts.filter((a) => a.is_active).length;
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || null;

  if (alerts.length === 0) {
    if (isFetching) {
      return <div className="animate-slide-up"><ListSkeleton rows={4} /></div>;
    }
    return (
      <div className="animate-slide-up rounded-2xl border border-[#1f2937] bg-black/80 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/20 bg-[#111827]">
          <Bell className="h-8 w-8 text-brand-300" />
        </div>
        <h1 className="text-xl font-bold text-white">Noch keine Job-Alerts</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Erstelle deinen ersten Alert und lasse passende Stellen automatisch an deine E-Mail-Adresse senden.
        </p>
        <button
          onClick={handleOpenCreate}
          disabled={creationState.atLimit}
          title={creationState.atLimit ? `Tageslimit erreicht (${creationState.used}/${creationState.limit})` : undefined}
          className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            creationState.atLimit
              ? "cursor-not-allowed bg-slate-800 text-slate-500"
              : "bg-brand-500 text-white hover:bg-brand-400"
          }`}
        >
          <Plus className="h-4 w-4" />
          Such-Agent einrichten (Automatisierte Jobsuche starten)
        </button>
        {showCreate && (
          <CreateAlertModal
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createMutation.mutate(data)}
            defaultEmail={me?.email || ""}
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up overflow-hidden rounded-2xl border border-[#1f2937] bg-black/80">
      <div className="flex items-center justify-between gap-3 border-b border-[#1f2937] p-2 sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-200 shadow-[0_0_10px_rgba(91,79,232,0.15)]">
            <Bell className="h-3 w-3" />{alerts.length} Job-Alerts
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />{activeCount} Aktiv
          </span>
        </div>
        <button
          onClick={handleOpenCreate}
          disabled={creationState.atLimit}
          title={creationState.atLimit ? `Tageslimit erreicht (${creationState.used}/${creationState.limit})` : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            creationState.atLimit
              ? "cursor-not-allowed bg-slate-800 text-slate-500"
              : "bg-brand-500 text-white hover:bg-brand-400"
          }`}
        >
          {creationState.atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="hidden sm:inline">Such-Agent einrichten</span>
          <span className="sm:hidden">Neu</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12">
        <aside
          className={`border-b border-[#1f2937] bg-[#05070b] p-3 md:col-span-4 md:h-[calc(100vh-120px)] md:overflow-y-auto md:border-b-0 md:border-r md:border-[#1f2937] ${
            mobileView === "detail" ? "hidden md:block" : ""
          }`}
        >
          <div className="mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Deine Suchprofile</p>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertListCard
                key={alert.id}
                alert={alert}
                isSelected={alert.id === selectedAlertId}
                onSelect={() => {
                  setSelectedAlertId(alert.id);
                  setMobileView("detail");
                }}
              />
            ))}
          </div>
        </aside>

        <main className={`md:col-span-8 md:flex md:h-[calc(100vh-120px)] md:flex-col md:overflow-y-auto ${mobileView === "list" ? "hidden md:flex" : ""}`}>
          <div className="flex items-center gap-2 border-b border-[#1f2937] px-3 py-2 md:hidden">
            <button
              onClick={() => setMobileView("list")}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-200 transition-colors hover:text-brand-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>
            {selectedAlert && <span className="truncate text-sm text-slate-400">{selectedAlert.keywords}</span>}
          </div>

          <div className="flex flex-1 flex-col bg-black p-3 md:p-4 [&>*]:flex-1">
            {selectedAlert && (
              <AlertDetailPanel
                alert={selectedAlert}
                onDelete={(id) => {
                  deleteMutation.mutate(id);
                  setMobileView("list");
                }}
                onRunNow={handleRunNow}
                onEdit={handleOpenEdit}
                isRunning={runningId === selectedAlert.id}
                runState={runState}
                creationState={creationState}
              />
            )}
          </div>
        </main>
      </div>

      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          defaultEmail={me?.email || ""}
        />
      )}
      {editingAlert && (
        <CreateAlertModal
          onClose={() => setEditingAlert(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingAlert.id, data })}
          defaultEmail={me?.email || ""}
          initialData={editingAlert}
          title="Job-Alert bearbeiten"
          submitLabel="Änderungen speichern"
        />
      )}
    </div>
  );
}
