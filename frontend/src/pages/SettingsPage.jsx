import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Save,
  Camera,
  Trash2,
  User,
  AlertTriangle,
  ChevronDown,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { authApi, resumeApi, settingsApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { getApiErrorMessage } from "../utils/apiError";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import Popover from "../components/ui/Popover";

const loadStored = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 200;
        let { width, height } = img;
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const JOB_TYPES = [
  "Vollzeit",
  "Teilzeit",
  "Praktikum",
  "Samstagsjob",
  "Ferialjob",
  "Geringfügig",
  "Freiberuflich",
];
const EXPERIENCE_LEVELS = [
  "Noch in der Schule",
  "Gerade fertig / Studium",
  "Habe schon etwas gearbeitet",
  "Mehrere Jahre Erfahrung",
];
const INDUSTRIES = [
  "Gastronomie",
  "Handel/Verkauf",
  "Technik/IT",
  "Gesundheit",
  "Bildung",
  "Handwerk",
  "Büro/Verwaltung",
  "Sonstiges",
];
const INPUT_CLS =
  "w-full rounded-xl border px-3 py-2 text-sm h-10" +
  " focus:outline-none focus:border-[var(--color-accent-500)]/50 focus:ring-0" +
  " transition-colors";

const INPUT_STYLE = {
  borderColor: 'var(--color-border)',
  backgroundColor: 'var(--color-surface-input)',
  color: 'var(--color-ink-primary)',
  '--placeholder': 'var(--color-ink-meta)',
};
const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '0.25rem',
  color: 'var(--color-ink-dim)',
};

function MultiSelectDropdown({ options, value = [], onChange, placeholder = "Auswählen…" }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const toggle = (option) => {
    const next = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(next);
  };

  const remove = (option, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  };

  return (
    <div>
      <div
        ref={anchorRef}
        onClick={() => setOpen((o) => !o)}
        className="min-h-10 w-full rounded-xl border px-2 py-1.5 text-sm cursor-pointer flex flex-wrap gap-1 items-center focus:outline-none hover:border-[var(--color-border-strong)] transition-colors"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-input)', color: 'var(--color-ink-primary)' }}
      >
        {value.length === 0 ? (
          <span className="px-1 py-0.5" style={{ color: 'var(--color-ink-meta)' }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-fg)]"
            >
              {v}
              <button
                type="button"
                onClick={(e) => remove(v, e)}
                className="hover:text-[var(--color-fg)] text-[var(--color-fg-dim)] leading-none ml-0.5 transition-colors"
                aria-label={`${v} entfernen`}
              >
                ×
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              style={{ color: 'var(--color-ink-dim)' }}
        />
      </div>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        className="w-[min(100%,320px)] rounded-xl border shadow-xl overflow-hidden mt-1"
        >
        <div style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-elevated)' }}>
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggle(option)}
                className="w-4 h-4 rounded accent-brand-500 flex-shrink-0"
              />
              <span className="text-sm" style={{ color: 'var(--color-ink-sub)' }}>{option}</span>
            </label>
          ))}
        </div>
      </Popover>
    </div>
  );
}

/** User settings page: profile photo, job preferences, CV upload, and account deletion. */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);

  const { data: profile, isLoading: _profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      settingsApi.getProfile().then((res) => {
        saveStored("profile", res.data);
        return res.data;
      }),
    initialData: () => loadStored("profile"),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 3,
  });

  // Compute form values as soon as profile query has data.
  const formValues = {
    desired_locations: profile?.desired_locations ?? [],
    salary_min: profile?.salary_min ?? null,
    salary_max: profile?.salary_max ?? null,
    job_types: profile?.job_types ?? [],
    industries: profile?.industries ?? [],
    experience_level: profile?.experience_level ?? "",
    is_open_to_relocation: profile?.is_open_to_relocation ?? false,
  };

  useEffect(() => {
    if (profile?.avatar) setAvatar(profile.avatar);
  }, [profile?.avatar]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values: formValues,
  });

  const watchedSalaryMin = useWatch({ control, name: "salary_min" });
  const watchedSalaryMax = useWatch({ control, name: "salary_max" });
  const salaryError =
    watchedSalaryMin != null && watchedSalaryMax != null && watchedSalaryMin > watchedSalaryMax
      ? "Mindestgehalt darf nicht höher als das Maximalgehalt sein"
      : null;

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    if (salaryError) {
      toast.error(salaryError);
      return;
    }

    const profilePayload = {
      desired_locations: data.desired_locations,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      job_types: data.job_types,
      industries: data.industries,
      experience_level: data.experience_level,
      is_open_to_relocation: data.is_open_to_relocation,
      avatar: avatar ?? null,
    };

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 10000);

    try {
      await settingsApi.updateProfile(profilePayload, { signal: controller.signal });

      const newAvatar = avatar ?? null;
      queryClient.setQueryData(["profile"], (old) =>
        old ? { ...old, ...profilePayload, avatar: newAvatar } : old
      );
      queryClient.setQueryData(["init"], (old) =>
        old ? { ...old, profile: { ...(old.profile || {}), ...profilePayload, avatar: newAvatar } } : old
      );
      try {
        const raw = localStorage.getItem("profile");
        if (raw) localStorage.setItem("profile", JSON.stringify({ ...JSON.parse(raw), ...profilePayload, avatar: newAvatar }));
      } catch {}
      try {
        const raw = localStorage.getItem("init");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem("init", JSON.stringify({ ...parsed, profile: { ...(parsed.profile || {}), ...profilePayload, avatar: newAvatar } }));
        }
      } catch {}

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["init"] }),
      ]);

      toast.success("Einstellungen gespeichert");
    } catch (err) {
      toast.error(
        controller.signal.aborted
          ? "Zeitüberschreitung – bitte erneut versuchen"
          : getApiErrorMessage(err, "Einstellungen konnten nicht gespeichert werden")
      );
    } finally {
      clearTimeout(abortTimer);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild ist zu groß. Maximal 5 MB.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
    } catch {
      toast.error("Bild konnte nicht verarbeitet werden");
    }
  };

  const isLoading = _profileLoading && !profile;

  if (isLoading) {
    return (
      <div className="animate-slide-up">
        <PageHeader
          title="Einstellungen"
          description="Profil und Jobpräferenzen anpassen"
          className="mb-6"
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-4 flex flex-col gap-10">
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4">Profilfoto</h2>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-28 rounded-xl" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </section>
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4">Lebenslauf</h2>
              <Skeleton className="h-24 w-full rounded-xl" />
            </section>
          </div>
          <div className="lg:col-span-8 flex flex-col gap-10">
            <section className="flex flex-col gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Skeleton className="h-10 w-full max-w-[160px] rounded-xl" />
                <Skeleton className="h-10 w-full max-w-[160px] rounded-xl" />
              </div>
            </section>
            <section className="flex flex-col gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Einstellungen"
        description="Profil und Jobpräferenzen anpassen"
        className="mb-6"
        actions={
          <Button
            type="submit"
            form="settings-form"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? "Wird gespeichert…" : "Speichern"}</span>
          </Button>
        }
      />

      <form id="settings-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div className="flex flex-col gap-10 lg:col-span-4">

            {/* Profilfoto */}
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4">
                Profilfoto
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profil"
                      className="h-16 w-16 rounded-2xl object-cover ring-1 ring-[var(--color-border-subtle)]"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)]">
                      <User className="h-7 w-7 text-[var(--color-fg-muted)]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl bg-[var(--color-accent-500)] text-white transition-colors hover:bg-[var(--color-accent-400)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                    aria-label="Profilfoto ändern"
                    title="Foto ändern"
                  >
                    <Camera className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-input)', color: 'var(--color-ink-sub)' }}
                  >
                    {avatar ? "Foto ändern" : "Foto hochladen"}
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="flex items-center gap-1 text-sm text-red-400 transition-colors hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Foto entfernen
                    </button>
                  )}
                  <p className="text-[11px] text-[var(--color-fg-dim)]">JPG, PNG, WebP · max. 5 MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </section>

            {/* Lebenslauf hochladen */}
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4">
                Lebenslauf
              </h2>
              <CVUploadSection />
            </section>

          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────── */}
          <div className="flex flex-col gap-10 lg:col-span-8">

            {/* Jobsuche — Orte + Gehalt combined */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)]">
                Jobsuche
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Controller
                name="desired_locations"
                control={control}
                render={({ field }) => (
                  <div>
                    <label style={LABEL_STYLE}>Arbeitsorte</label>
                    <Input
                      {...field}
                      size="md"
                      value={field.value?.join(", ") || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? e.target.value.split(",").map((p) => p.trim()) : []
                        )
                      }
                      placeholder="Wien, Graz…"
                    />
                  </div>
                )}
              />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Controller
                  name="salary_min"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label style={LABEL_STYLE}>Mindestgehalt (€ / Monat)</label>
                      <Input {...field} type="number" size="md" className="max-w-[160px]" invalid={!!salaryError} placeholder="30" value={field.value || ""} />
                    </div>
                  )}
                />
                <Controller
                  name="salary_max"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label style={LABEL_STYLE}>Maximalgehalt (€ / Monat)</label>
                      <Input {...field} type="number" size="md" className="max-w-[160px]" invalid={!!salaryError} placeholder="50" value={field.value || ""} />
                    </div>
                  )}
                />
              </div>
              {salaryError && (
                <p className="text-xs text-[var(--color-error)] mt-1">{salaryError}</p>
              )}
            </section>

            {/* Stellenarten + Erfahrung + Branchen combined */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)]">
                Präferenzen
              </h2>

              {/* Berufserfahrung */}
              <Controller
                name="experience_level"
                control={control}
                render={({ field }) => (
                  <div>
                    <label style={LABEL_STYLE}>Wo stehst du gerade?</label>
                    <div className="relative">
                      <select {...field} className={`${INPUT_CLS} appearance-none pr-9`}
                        style={INPUT_STYLE} value={field.value || ""}>
                        <option value="">Wähle dein Niveau…</option>
                        {EXPERIENCE_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-muted)]" />
                    </div>
                  </div>
                )}
              />

              {/* Jobarten — multi-select dropdown */}
              <Controller
                name="job_types"
                control={control}
                render={({ field }) => (
                  <div>
                    <label style={LABEL_STYLE}>Jobarten</label>
                    <MultiSelectDropdown
                      options={JOB_TYPES}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Stellenarten wählen…"
                    />
                  </div>
                )}
              />

              {/* Branchen — multi-select dropdown */}
              <Controller
                name="industries"
                control={control}
                render={({ field }) => (
                  <div>
                    <label style={LABEL_STYLE}>Branchen</label>
                    <MultiSelectDropdown
                      options={INDUSTRIES}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Branchen wählen…"
                    />
                  </div>
                )}
              />

              {/* Umzugsbereitschaft — kept inside Präferenzen for context */}
              <Controller
                name="is_open_to_relocation"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-fg)]">Umzugsbereitschaft</p>
                      <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                        Offen für Stellen außerhalb der Heimatstadt
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!field.value}
                      aria-label="Umzugsbereitschaft"
                      onClick={() => field.onChange(!field.value)}
                      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors overflow-hidden [transform:translateZ(0)] ${
                        field.value ? "bg-[var(--color-accent-500)]" : "bg-[var(--color-bg-elev-3)]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          field.value ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}
              />
            </section>

            {/* Mobile save — sticky bottom bar (visible on small screens only) */}
            <div className="lg:hidden sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-400)] disabled:opacity-50 h-10"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Wird gespeichert…" : "Einstellungen speichern"}
              </button>
            </div>
          </div>

        </div>

      {/* Full-width bottom section: Danger Zone */}
      <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)]">
        <DeleteAccountSection />
      </div>

      </form>
    </div>
  );
}

/**
 * CV upload/management panel for the Settings left column.
 * Wraps the existing /resume/upload endpoint and lists current resumes.
 */
function CVUploadSection() {
  const qc = useQueryClient();
  const cvInputRef = useRef(null);

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const uploadMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return resumeApi.upload(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Lebenslauf hochgeladen");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Upload fehlgeschlagen")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => resumeApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Lebenslauf entfernt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen")),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Nur PDF-Dateien erlaubt");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß. Maximal 10 MB.");
      return;
    }
    uploadMut.mutate(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      {resumes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {resumes.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-3 py-2.5"
            >
              <FileText className="h-4 w-4 flex-shrink-0 text-[var(--color-accent-300)]" />
              <span className="flex-1 min-w-0 text-[13px] text-[var(--color-fg-muted)] truncate">
                {r.filename || r.original_filename || `Lebenslauf ${r.id}`}
              </span>
              <button
                type="button"
                onClick={() => deleteMut.mutate(r.id)}
                disabled={deleteMut.isPending}
                className="flex-shrink-0 text-[var(--color-fg-faint)] hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                aria-label="Lebenslauf entfernen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-[var(--color-fg-dim)]">
          Noch kein Lebenslauf hochgeladen. Lade deinen Lebenslauf hoch, damit die KI ihn bei der Jobsuche und Passung verwenden kann.
        </p>
      )}
      <button
        type="button"
        onClick={() => cvInputRef.current?.click()}
        disabled={uploadMut.isPending}
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)] disabled:opacity-50"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-input)", color: "var(--color-ink-sub)" }}
      >
        {uploadMut.isPending ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-fg-dim)]/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {uploadMut.isPending ? "Wird hochgeladen…" : resumes.length > 0 ? "Weiteren hochladen" : "PDF hochladen"}
      </button>
      <input
        ref={cvInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <p className="text-[11px] text-[var(--color-fg-dim)]">Nur PDF · max. 10 MB</p>
    </div>
  );
}

/**
 * Danger-zone section that handles the account deletion confirmation flow.
 * Requires password re-entry before deleting.
 */
function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!password) {
      toast.error("Bitte gib dein Passwort ein");
      return;
    }
    setDeleting(true);
    try {
      await authApi.deleteAccount(password);
      toast.success("Konto gelöscht");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Konto konnte nicht gelöscht werden"));
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 mt-4">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
        <div>
          <h2 className="font-semibold text-red-400">Konto löschen</h2>
          <p className="mt-0.5 text-xs text-[var(--color-fg-dim)]">
            Entfernt alle deine Daten, Profile, Lebensläufe und gespeicherten Stellen dauerhaft.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 rounded-xl bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Konto löschen
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-900/60 bg-red-950/30 p-3">
          <p className="text-sm font-semibold text-red-300">
            Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div>
            <label className="block text-xs font-bold text-red-400/80 uppercase tracking-widest mb-1">
              Passwort zur Bestätigung
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-red-900/60 bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder-red-500 focus:outline-none focus:border-red-500/50 h-10"
              placeholder="Aktuelles Passwort eingeben"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? "Wird gelöscht…" : "Unwiderruflich löschen"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
              }}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-input)', color: 'var(--color-ink-sub)' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
