import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import useFetch from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageChrome";
import useMutation from "../hooks/useMutation";
import { useBootstrap } from "../context/BootstrapContext";
import {
  Bell, Pencil, Plus, Trash2, X, MoreHorizontal,
  AlertCircle, Clock, Mail, MapPin, Briefcase,
  RefreshCw, CheckCircle2, Search, SlidersHorizontal,
  ArrowUpRight, Lightbulb, BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

import { jobAlertsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import useFocusTrap from "../hooks/useFocusTrap";

/* ───────────────────────────────────────────────────────────────
   Token helper
   ─────────────────────────────────────────────────────────────── */
function T(name) {
  return `var(--app-${name})`;
}

const JOB_TYPES = [
  { value: "",           label: "Alle Arten" },
  { value: "Full-time",  label: "Vollzeit" },
  { value: "Part-time",  label: "Teilzeit" },
  { value: "Contract",   label: "Befristet" },
  { value: "Internship", label: "Praktikum" },
  { value: "Lehre",      label: "Lehre" },
  { value: "Samstagsjob", label: "Samstagsjob" },
];

const FREQUENCIES = [
  { value: "daily",  label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
];

const FILTERS = [
  { key: "all",     label: "Alle Alerts" },
  { key: "active",  label: "Aktiv" },
  { key: "paused",  label: "Pausiert" },
  { key: "expired", label: "Abgelaufen" },
];

function fmtAlertDate(value) {
  if (!value) return null;
  const d = new Date(value);
  const ms = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(ms / day);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return d.toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
}

/* ───────────────────────────────────────────────────────────────
   Metric card component
   ─────────────────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, subtext, color, children }) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-2"
      style={{
        borderColor: T("border"),
        background: T("surface"),
        boxShadow: T("shadow-card"),
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <div>
          <p className="text-[24px] font-bold tracking-[-0.02em] tabular-nums leading-none" style={{ color: T("text") }}>
            {value}
          </p>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T("text-secondary") }}>
            {label}
          </p>
        </div>
      </div>
      {subtext && (
        <p className="text-[11px]" style={{ color: T("text-muted") }}>
          {subtext}
        </p>
      )}
      {children}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Simple donut ring (SVG)
   ─────────────────────────────────────────────────────────────── */
function DonutRing({ segments, size = 90, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const circumference = 2 * Math.PI * r;

  // Drop segments whose value is ≤ 0 — a zero-length arc with
  // stroke-linecap="round" renders an unwanted dot at 12-o'clock.
  const visible = segments.filter((s) => s.value > 0);
  let offset = 0;
  const arcs = visible.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0;
    const dashLen = circumference * pct;
    const gap = circumference - dashLen;
    const result = {
      color: seg.color,
      dashArray: `${dashLen} ${gap}`,
      dashOffset: -offset,
    };
    offset += dashLen;
    return result;
  });

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={T("border")} strokeWidth={strokeWidth} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={c} cy={c} r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
            strokeDasharray={a.dashArray}
            strokeDashoffset={a.dashOffset}
            strokeLinecap={total > 0 ? "round" : "butt"}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ))}
      </svg>
      <span
        className="absolute text-[15px] font-bold tabular-nums"
        style={{ color: T("text") }}
      >
        {total}
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Alert card — substantial, colored accent, rich metadata
   ─────────────────────────────────────────────────────────────── */
function AlertCard({ alert, onDelete, onEdit, onToggleActive }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef(null);
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Arten";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;
  const lastSent = alert.last_sent_at ? fmtAlertDate(alert.last_sent_at) : null;
  const accentColor = alert.is_active ? "#5D9F68" : (alert.is_active === false ? "#F59E0B" : T("text-faint"));

  return (
    <div
      className="relative rounded-xl border p-5 group transition-all flex items-start gap-4"
      style={{
        borderColor: T("border"),
        background: T("surface"),
        boxShadow: T("shadow-card"),
        borderLeft: `3px solid ${alert.is_active ? "#5D9F68" : "#F59E0B"}`,
      }}
    >
      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${accentColor}12` }}
      >
        <Bell className="w-[18px] h-[18px]" style={{ color: accentColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold truncate" style={{ color: T("text") }}>
              {alert.keywords}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {alert.location && (
                <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: T("text-muted") }}>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {alert.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: T("text-muted") }}>
                <Briefcase className="w-3 h-3 flex-shrink-0" />
                {typeLabel}
              </span>
              <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: T("text-muted") }}>
                <Clock className="w-3 h-3 flex-shrink-0" />
                {freqLabel}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <span
            className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium border flex-shrink-0"
            style={{
              color: alert.is_active ? T("success") : T("text-muted"),
              borderColor: alert.is_active ? "color-mix(in srgb, var(--app-success) 25%, transparent)" : T("border-subtle"),
              background: alert.is_active ? "color-mix(in srgb, var(--app-success) 8%, transparent)" : "transparent",
            }}
          >
            {alert.is_active ? "Aktiv" : "Pausiert"}
          </span>
        </div>

        {/* Bottom row: delivery + actions */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${T("border-subtle")}` }}>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 flex-shrink-0" style={{ color: T("text-faint") }} />
            <span className="text-[12px]" style={{ color: T("text-muted") }}>
              {lastSent ? `Letzte Lieferung: ${lastSent}` : "Noch keine Lieferung"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(alert)}
              className="h-8 w-8 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/[0.04]"
              style={{ color: T("text-secondary") }}
              title="Bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              ref={menuBtnRef}
              onClick={() => {
                const r = menuBtnRef.current?.getBoundingClientRect();
                if (r) {
                  // Clamp the menu inside the viewport so it never overflows.
                  const menuHeight = 120;
                  const top = Math.min(r.bottom + 4, window.innerHeight - menuHeight);
                  const left = Math.max(8, Math.min(r.right - 140, window.innerWidth - 148));
                  setMenuPos({ top, left });
                }
                setMenuOpen((v) => !v);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/[0.04]"
              style={{ color: T("text-secondary") }}
              title="Mehr"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && createPortal(
              <div
                className="fixed inset-0 z-[9999]"
                onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}
              >
                <div
                  className="absolute rounded-lg border py-1.5 min-w-[140px]"
                  style={{
                    top: menuPos.top,
                    left: menuPos.left,
                    background: T("surface"),
                    borderColor: T("border"),
                    boxShadow: T("shadow-modal"),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { onToggleActive(alert); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    style={{ color: T("text") }}
                  >
                    {alert.is_active ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {alert.is_active ? "Pausieren" : "Aktivieren"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDelete(alert); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    style={{ color: T("error") }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Löschen
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Create/Edit Alert modal
   ─────────────────────────────────────────────────────────────── */
function AlertModal({ mode, alert, usage, isSaving, onClose, onSave }) {
  const [keywords, setKeywords] = useState(alert?.keywords || "");
  const [location, setLocation] = useState(alert?.location || "");
  const [jobType, setJobType] = useState(alert?.job_type || "");
  const [frequency, setFrequency] = useState(alert?.frequency || "daily");
  const modalRef = useRef(null);
  useFocusTrap(modalRef);

  const title = mode === "edit" ? "Alert bearbeiten" : "Neuer Alert";
  const cta = mode === "edit" ? "Speichern" : "Alert erstellen";
  const remaining = usage ? (usage.limit ?? 0) - (usage.used ?? 0) : 0;
  const blocked = remaining <= 0 && mode === "create";

  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[440px] rounded-xl border p-6 flex flex-col gap-5"
        style={{ background: T("surface"), borderColor: T("border"), boxShadow: T("shadow-modal") }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold" style={{ color: T("text") }}>{title}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-black/[0.04]" style={{ color: T("text-muted") }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: T("text") }}>Suchbegriffe *</span>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="z.B. Frontend Entwickler, UX Designer"
              className="h-10 px-3 rounded-md text-[14px] border outline-none transition-colors"
              style={{
                background: T("surface"),
                borderColor: T("border"),
                color: T("text"),
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--app-accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--app-border)"; }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: T("text") }}>Ort</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Wien, Graz — leer für überall"
              className="h-10 px-3 rounded-md text-[14px] border outline-none transition-colors"
              style={{
                background: T("surface"),
                borderColor: T("border"),
                color: T("text"),
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--app-accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--app-border)"; }}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium" style={{ color: T("text") }}>Anstellungsart</span>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="h-10 px-3 rounded-md text-[14px] border outline-none"
                style={{ background: T("surface"), borderColor: T("border"), color: T("text") }}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium" style={{ color: T("text") }}>Frequenz</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="h-10 px-3 rounded-md text-[14px] border outline-none"
                style={{ background: T("surface"), borderColor: T("border"), color: T("text") }}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
          </div>

          {blocked && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px]" style={{ background: T("warning-soft"), color: T("warning") }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Keine weiteren Alerts verfügbar. Pausiere oder lösche einen bestehenden Alert.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md text-[13px] font-medium border transition-colors hover:bg-black/[0.02]"
            style={{ borderColor: T("border"), color: T("text-secondary") }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!keywords.trim() || blocked || isSaving}
            onClick={() => onSave({ keywords: keywords.trim(), location: location.trim(), job_type: jobType, frequency })}
            className="h-9 px-4 rounded-md text-[13px] font-semibold transition-all disabled:opacity-40"
            style={{ background: T("brand"), color: "#fff" }}
          >
            {isSaving ? "Wird gespeichert…" : cta}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────────────────────────────────────────────────
   JobAlertsPage — reference-quality rebuild
   ─────────────────────────────────────────────────────────────── */
export default function JobAlertsPage() {
  usePageTitle("Job-Alerts");
  /* ── Data ── */
  const {
    data: alertsData,
    loading: alertsFetching,
    error: alertsError,
    reload: alertsReload,
  } = useFetch(() => jobAlertsApi.list().then((r) => r.data), { cacheKey: "alerts:list" });

  const alerts = useMemo(() => alertsData?.alerts ?? alertsData ?? [], [alertsData]);
  const listAlerts = useMemo(() => (Array.isArray(alerts) ? alerts : []), [alerts]);

  /* ── Computed metrics ── */
  const activeAlerts = useMemo(() => listAlerts.filter((a) => a.is_active === true), [listAlerts]);
  const pausedAlerts = useMemo(() => listAlerts.filter((a) => a.is_active === false), [listAlerts]);
  const withDelivery = useMemo(() =>
    listAlerts.filter((a) => a.last_sent_at).sort((a, b) => new Date(b.last_sent_at) - new Date(a.last_sent_at)),
    [listAlerts]
  );
  /* ── Filter state ── */
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);

  const filteredAlerts = useMemo(() => {
    let result = listAlerts;
    if (activeFilter === "active") result = result.filter((a) => a.is_active === true);
    if (activeFilter === "paused") result = result.filter((a) => a.is_active === false);
    if (activeFilter === "expired") result = result.filter((a) => a.is_active === null || a.is_active === undefined);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.keywords?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q));
    }
    return result;
  }, [listAlerts, activeFilter, searchQuery]);

  /* ── Mutations ── */
  const delMut = useMutation((id) => jobAlertsApi.delete(id));
  const handleDelete = async (id) => {
    try {
      await delMut.mutate(id);
      alertsReload();
      toast.success("Alert gelöscht.");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const toggleMut = useMutation(({ id, is_active }) => jobAlertsApi.update(id, { is_active }));
  const handleToggle = async (a) => {
    try {
      await toggleMut.mutate({ id: a.id, is_active: !a.is_active });
      alertsReload();
      toast.success("Status aktualisiert.");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const saveMut = useMutation((payload) => {
    if (payload.id) return jobAlertsApi.update(payload.id, payload);
    return jobAlertsApi.create(payload);
  });
  const handleSave = async (payload) => {
    try {
      await saveMut.mutate(payload);
      alertsReload();
      toast.success(payload.id ? "Alert gespeichert." : "Alert erstellt.");
      setShowCreate(false);
      setEditingAlert(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const { init } = useBootstrap();
  const usage = useMemo(() => init?.usage?.find((u) => u.feature === "job_alerts"), [init]);

  /* ── Error state ── */
  const hasFailed = alertsError && listAlerts.length === 0;

  /* ───────────────────────────────────────────────────────────
     Render
     ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-[1200px] mx-auto pt-6 pb-16 px-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T("brand") }}>
            ALERTS
          </p>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] leading-[1.15]" style={{ color: T("text") }}>
            Deine Job-Alerts
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: T("text-secondary") }}>
            Lass dich benachrichtigen, wenn neue Stellen erscheinen, die zu deinen Kriterien passen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn btn-primary h-10 px-4 rounded-lg text-[13px] gap-2"
          >
            <Plus className="w-4 h-4" />
            Neuer Alert
          </button>
        </div>
      </div>

      {/* ── Failure state ── */}
      {hasFailed && (
        <div className="py-16 text-center rounded-xl border" style={{ borderColor: T("border"), background: T("surface") }}>
          <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: T("error") }} />
          <p className="text-[15px] font-medium mb-2" style={{ color: T("text") }}>Alerts konnten nicht geladen werden.</p>
          <p className="text-[13px] mb-4" style={{ color: T("text-muted") }}>Überprüfe deine Verbindung und versuche es erneut.</p>
          <button
            type="button"
            onClick={() => alertsReload()}
            className="btn btn-primary h-9 px-4 rounded-md text-[13px] gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasFailed && !alertsFetching && listAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <img
            src="/illustrations/notification-bell.png"
            alt=""
            className="w-[160px] h-[160px] mb-8 object-contain pointer-events-none"
          />
          <h2 className="text-[20px] font-bold mb-2" style={{ color: T("text") }}>Noch keine Alerts</h2>
          <p className="text-[14px] text-center max-w-[440px] mb-6" style={{ color: T("text-secondary") }}>
            Erstelle deinen ersten Job-Alert und wir benachrichtigen dich per E-Mail, sobald neue passende Stellen erscheinen.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn btn-primary btn-lg text-[13px] gap-2"
          >
            <Bell className="w-4 h-4" />
            Ersten Alert erstellen
          </button>
        </div>
      )}

      {/* ── Populated state ── */}
      {!hasFailed && listAlerts.length > 0 && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={Bell}
              label="Aktive Alerts"
              value={activeAlerts.length}
              color="#5D9F68"
            />
            <MetricCard
              icon={Clock}
              label="Pausiert"
              value={pausedAlerts.length}
              color="#F59E0B"
            />
            <MetricCard
              icon={Mail}
              label="Lieferungen heute"
              value={withDelivery.filter((a) => {
                if (!a.last_sent_at) return false;
                const d = new Date(a.last_sent_at);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length}
              color="#3B82F6"
            />
            <MetricCard
              icon={BarChart3}
              label="Alerts gesamt"
              value={listAlerts.length}
              color="#8B5CF6"
            />
          </div>

          {/* Main grid: left (alerts list) + right (overview/tips) */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Alert list */}
            <div className="col-span-12 lg:col-span-8">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: T("border-subtle") }}>
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setActiveFilter(f.key)}
                      className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                      style={{
                        background: activeFilter === f.key ? T("surface") : "transparent",
                        color: activeFilter === f.key ? T("text") : T("text-muted"),
                        boxShadow: activeFilter === f.key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      {f.label}
                      {f.key === "all" && ` (${listAlerts.length})`}
                      {f.key === "active" && ` (${activeAlerts.length})`}
                      {f.key === "paused" && ` (${pausedAlerts.length})`}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T("text-faint") }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Alerts durchsuchen…"
                    className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] border outline-none transition-colors"
                    style={{
                      background: T("surface"),
                      borderColor: T("border"),
                      color: T("text"),
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--app-focus-ring)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--app-border)"; }}
                  />
                </div>
              </div>

              {/* Alert cards */}
              {filteredAlerts.length === 0 ? (
                <div className="py-16 text-center">
                  <SlidersHorizontal className="w-6 h-6 mx-auto mb-2" style={{ color: T("text-faint") }} />
                  <p className="text-[14px]" style={{ color: T("text-muted") }}>Keine Alerts für diesen Filter.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onEdit={(a) => setEditingAlert(a)}
                      onDelete={(a) => handleDelete(a.id)}
                      onToggleActive={(a) => handleToggle(a)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right column: overview + tips */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              {/* Overview card — shows breakdown even for single alerts */}
              {listAlerts.length > 0 && (
                <div
                  className="rounded-xl border p-5 flex flex-col gap-4"
                  style={{ borderColor: T("border"), background: T("surface"), boxShadow: T("shadow-card") }}
                >
                  <h3 className="text-[14px] font-semibold" style={{ color: T("text") }}>Dein Alert-Überblick</h3>
                  <div className="flex items-center gap-5">
                    <DonutRing segments={[
                      { value: activeAlerts.length, color: "#5D9F68", label: "Aktiv" },
                      { value: pausedAlerts.length, color: "#F59E0B", label: "Pausiert" },
                    ]} />
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#5D9F68" }} />
                        <span className="text-[13px]" style={{ color: T("text-secondary") }}>Aktiv</span>
                        <span className="text-[13px] font-semibold ml-auto" style={{ color: T("text") }}>{activeAlerts.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#F59E0B" }} />
                        <span className="text-[13px]" style={{ color: T("text-secondary") }}>Pausiert</span>
                        <span className="text-[13px] font-semibold ml-auto" style={{ color: T("text") }}>{pausedAlerts.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips card */}
              <div
                className="rounded-xl border p-5 flex flex-col gap-3"
                style={{ borderColor: T("border"), background: T("surface"), boxShadow: T("shadow-card") }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-[16px] h-[16px]" style={{ color: "#F59E0B" }} />
                  <h3 className="text-[14px] font-semibold" style={{ color: T("text") }}>Tipps für bessere Ergebnisse</h3>
                </div>
                <ul className="flex flex-col gap-2 text-[12px]" style={{ color: T("text-secondary") }}>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: T("success") }} />
                    Verwende genaue Jobtitel wie „Frontend Entwickler“ statt „IT-Job".
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: T("success") }} />
                    Wähle einen Ort, um nur relevante lokale Stellen zu erhalten.
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: T("success") }} />
                    Mehrere spezifische Alerts liefern bessere Ergebnisse als ein allgemeiner.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <AlertModal
          mode="create"
          usage={usage}
          isSaving={saveMut.loading}
          onClose={() => setShowCreate(false)}
          onSave={(data) => handleSave(data)}
        />
      )}

      {/* ── Edit modal ── */}
      {editingAlert && (
        <AlertModal
          mode="edit"
          alert={editingAlert}
          isSaving={saveMut.loading}
          onClose={() => setEditingAlert(null)}
          onSave={(data) => handleSave({ ...data, id: editingAlert.id })}
        />
      )}
    </div>
  );
}