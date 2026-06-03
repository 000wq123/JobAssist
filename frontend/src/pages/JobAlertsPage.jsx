import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  Pencil,
  Plus,
  Trash2,
  X,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

import useUsageGuard from "../hooks/useUsageGuard";
import { jobAlertsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getRewriteState, updateUsageList } from "../utils/jobAlertsState";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import Popover from "../components/ui/Popover";
import PageHeader from "../components/ui/PageHeader";
import useFocusTrap from "../hooks/useFocusTrap";

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

function bumpJobAlertUsageCaches(qc, delta) {
  qc.setQueryData(["billing-overview"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
  qc.setQueryData(["init"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
}

function loadStoredAlerts() {
  try {
    const raw = localStorage.getItem("job_alerts");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? { alerts: parsed } : parsed;
  } catch { return undefined; }
}

function syncStoredAlerts(data) {
  try { localStorage.setItem("job_alerts", JSON.stringify(data)); } catch { /* quota */ }
}

/**
 * fmtAlertDate — precise German date, e.g. "22. Mai 2025".
 * Falls back to relative only for today/yesterday.
 */
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

/**
 * AlertRow — flat full-width card. Replaces the old master/detail layout.
 * Shows all info inline + action buttons on the right. No selection model.
 */
function AlertRow({ alert, onDelete, onEdit, onToggleActive }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Arten";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;
  const lastSent = alert.last_sent_at ? fmtAlertDate(alert.last_sent_at) : null;

  return (
    <article className="relative grid grid-cols-12 gap-4 items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-5 py-5 mb-3 last:mb-0 transition-opacity duration-200">
      {/* "..." — always top-right */}
      <div className="absolute top-3 right-3">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 grid place-items-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
          aria-label="Mehr"
          aria-expanded={menuOpen}
          ref={(el) => { menuBtnRef.current = el; }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuBtnRef}
          align="right"
          className="min-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-1 shadow-lg mt-1"
        >
          <button
            type="button"
            onClick={() => { onToggleActive(alert.id, !alert.is_active); setMenuOpen(false); }}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-[13px] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)]"
          >
            <span>{alert.is_active ? "Pausieren" : "Aktivieren"}</span>
          </button>
          <button
            type="button"
            onClick={() => { onDelete(alert.id); setMenuOpen(false); }}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Löschen</span>
          </button>
        </Popover>
      </div>

      {/* Title + meta */}
      <div className="col-span-12 sm:col-span-7 min-w-0 pr-9 sm:pr-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] truncate"
            style={{ letterSpacing: "-0.018em" }}
          >
            {alert.keywords}
          </h2>
          <span
            className={`inline-flex items-center h-5 px-2.5 rounded-full text-[11px] font-medium border ${
              alert.is_active
                ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] border-[var(--color-border-subtle)]"
                : "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-dim)] border-[var(--color-border-subtle)] opacity-60"
            }`}
          >
            {alert.is_active ? "Aktiv" : "Pausiert"}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-[var(--color-fg-muted)]">
          {[alert.location || "Überall", typeLabel, freqLabel].join(" · ")}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-fg-dim)]">
          {lastSent ? `Letzte Mail: ${lastSent}` : "Noch keine Mail verschickt"}
        </p>
      </div>

      {/* Inline actions */}
      <div className="col-span-12 sm:col-span-5 flex items-center sm:justify-end gap-2 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => onEdit(alert)}
        >
          <Pencil className="w-3.5 h-3.5" />
          Bearbeiten
        </Button>
      </div>
    </article>
  );
}

/**
 * CreateAlertModal — modal form for create/edit.
 */
function CreateAlertModal({ onClose, onSubmit, defaultEmail, initialData, title = "Neuer Job-Alert", submitLabel = "Alert erstellen" }) {
  const [form, setForm] = useState({
    keywords: initialData?.keywords || "",
    location: initialData?.location || "",
    job_type: initialData?.job_type || "",
    email: defaultEmail || "",
    frequency: initialData?.frequency || "daily",
  });

  const dialogRef = useRef(null);
  useFocusTrap(true, dialogRef);

  const setVal = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.keywords.trim()) return toast.error("Bitte Suchbegriff eingeben");
    onSubmit({
      keywords: form.keywords.trim(),
      location: form.location.trim() || null,
      job_type: form.job_type || null,
      email: defaultEmail || "",
      frequency: "daily",
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Job-Alert"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-5 sm:p-6 animate-slide-up"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div className="grid grid-cols-12 items-center mb-5">
          <h2 className="col-span-11 text-[16px] font-semibold text-[var(--color-fg)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="col-span-1 justify-self-end w-7 h-7 grid place-items-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)]"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-fg-muted)] mb-1.5">Suchbegriff *</label>
            <Input
              type="text"
              value={form.keywords}
              onChange={(e) => setVal("keywords", e.target.value)}
              placeholder="z. B. Grafikdesign, Lager, Büro"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-fg-muted)] mb-1.5">Standort</label>
            <Input
              type="text"
              value={form.location}
              onChange={(e) => setVal("location", e.target.value)}
              placeholder="z. B. Wien, Graz"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-fg-muted)] mb-1.5">Art der Stelle</label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Art der Stelle">
              {JOB_TYPES.map((t) => {
                const selected = form.job_type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setVal("job_type", t.value)}
                    className={
                      "h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors " +
                      (selected
                        ? "bg-[var(--color-accent-500)]/15 border-[var(--color-accent-500)]/50 text-[var(--color-accent-200)]"
                        : "bg-transparent border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)]")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/**
 * JobAlertsPage — flat list of alert cards. No master/detail.
 */
export default function JobAlertsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => {
      try {
        const raw = localStorage.getItem("init");
        return raw ? JSON.parse(raw) : queryClient.getQueryData(["init"]);
      } catch { return queryClient.getQueryData(["init"]); }
    },
    staleTime: 1000 * 60 * 2,
  });

  const me = initData?.me;
  const { guardedRun, atLimit: planAtLimit } = useUsageGuard("job_alerts");

  const { data: alertsData, isFetching, isError, error } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () => jobAlertsApi.list().then((r) => { syncStoredAlerts(r.data); return r.data; }),
    initialData: () => queryClient.getQueryData(["job-alerts"]) ?? loadStoredAlerts(),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
  });

  const alerts = useMemo(() => alertsData?.alerts ?? [], [alertsData?.alerts]);

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: (res) => {
      queryClient.setQueryData(["job-alerts"], (old) => {
        const next = { ...(old ?? {}), alerts: [res.data, ...(old?.alerts ?? [])] };
        syncStoredAlerts(next);
        return next;
      });
      bumpJobAlertUsageCaches(queryClient, 1);
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
      setShowCreate(false);
      toast.success("Alert erstellt");
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail?.error === "usage_limit") return;
      toast.error(getApiErrorMessage(err, "Alert konnte nicht erstellt werden"));
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
            a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a,
          ),
        };
        syncStoredAlerts(next);
        return next;
      });
      setEditingAlert(null);
      toast.success("Alert aktualisiert");
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["job-alerts"], ctx.prev);
        syncStoredAlerts(ctx.prev);
      }
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail?.error === "usage_limit") return;
      toast.error(getApiErrorMessage(err, "Alert konnte nicht aktualisiert werden"));
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
      if (ctx?.alerts) { queryClient.setQueryData(["job-alerts"], ctx.alerts); syncStoredAlerts(ctx.alerts); }
      if (ctx?.billing) queryClient.setQueryData(["billing-overview"], ctx.billing);
      if (ctx?.init) queryClient.setQueryData(["init"], ctx.init);
      toast.error(getApiErrorMessage(err, "Alert konnte nicht gelöscht werden"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
    },
  });

  // Removed manual run-now functionality for alerts.

  const handleOpenCreate = () => {
    guardedRun(() => setShowCreate(true));
  };

  const handleOpenEdit = (current) => {
    const { canRewrite, remainingMin } = getRewriteState(current);
    if (!canRewrite) {
      toast.error(`Du kannst diesen Alert in ${remainingMin} Minuten erneut bearbeiten.`);
      return;
    }
    setEditingAlert(current);
  };

  const activeCount = alerts.filter((a) => a.is_active).length;

  // ── Empty state ─────────────────────────────────────────────
  if (alerts.length === 0) {
    if (isFetching && !alertsData) {
      return (
        <div className="grid grid-cols-1 gap-3 animate-slide-up">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      );
    }
    if (isError) {
      return (
        <div className="grid grid-cols-12 gap-5 md:gap-6 animate-slide-up">
          <PageHeader
            className="col-span-12"
            title="Alerts"
            description="Lass dir passende Stellen per E-Mail schicken."
          />
          <Card className="col-span-12 p-6 flex flex-col items-center text-center">
            <AlertCircle className="w-8 h-8 text-[var(--color-error)] mb-3" />
            <p className="text-[15px] font-medium text-[var(--color-fg)]">
              Alerts konnten nicht geladen werden
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-fg-muted)]">
              {getApiErrorMessage(error, "Bitte versuche es später erneut.")}
            </p>
            <Button
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["job-alerts"] })}
            >
              Erneut versuchen
            </Button>
          </Card>
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
      <div className="grid grid-cols-12 gap-5 md:gap-6 animate-slide-up">
        <PageHeader
          className="col-span-12"
          title="Alerts"
          description="Lass dir passende Stellen per E-Mail schicken."
        />
        <Card className="col-span-12">
          <EmptyState
            icon={Bell}
            title="Noch keine Alerts"
            description="Erstelle deinen ersten Alert — passende Stellen kommen automatisch per E-Mail."
            action={
              (
                <Button onClick={handleOpenCreate} disabled={planAtLimit}>
                  <Plus className="w-3.5 h-3.5" />
                  Alert erstellen
                </Button>
              )
            }
          />
        </Card>
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

  // ── Normal view: flat card list ──────────────────────────────
  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Alerts"
        description={`${alerts.length} ${alerts.length === 1 ? "Alert" : "Alerts"} · ${activeCount} aktiv`}
        className="mb-6"
        actions={
          <Button
            onClick={handleOpenCreate}
            disabled={planAtLimit}
            title={planAtLimit ? "Upgrade auf Pro oder Max für mehr Alerts" : undefined}
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Alert
          </Button>
        }
      />

      {/* Flat list of alert cards */}
      <div>
        {alerts.map((alert) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            onDelete={(id) => deleteMutation.mutate(id)}
            onEdit={handleOpenEdit}
            onToggleActive={(id, nextActive) => updateMutation.mutate({ id, data: { is_active: nextActive } })}
          />
        ))}
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
          title="Alert bearbeiten"
          submitLabel="Speichern"
        />
      )}
    </div>
  );
}
