import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Save,
  MapPin,
  Briefcase,
  Sliders,
  Camera,
  Trash2,
  User,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { authApi, settingsApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { useI18n } from "../context/I18nContext";
import { getApiErrorMessage } from "../utils/apiError";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

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
  "Schüler/Student",
  "Berufseinsteiger",
  "Mit Erfahrung",
  "Senior/Führungskraft",
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
const CURRENCIES = ["EUR"];
const LANGUAGES = [{ code: "de", label: "Deutsch" }];

const INPUT_CLS =
  "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-0 h-10";
// Constrained width variant for short-value fields (selects, short inputs)
const INPUT_SM_CLS =
  "w-full max-w-[240px] rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-0 h-10";
const LABEL_CLS =
  "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1";

function MultiSelectDropdown({ options, value = [], onChange, placeholder = "Auswählen…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className="min-h-10 w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-2 py-1.5 text-sm text-white cursor-pointer flex flex-wrap gap-1 items-center focus:outline-none hover:border-brand-500/30 transition-colors"
      >
        {value.length === 0 ? (
          <span className="text-slate-500 px-1 py-0.5">{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-brand-500/20 border border-brand-500/30 px-1.5 py-0.5 text-xs font-semibold text-brand-200"
            >
              {v}
              <button
                type="button"
                onClick={(e) => remove(v, e)}
                className="hover:text-white text-brand-300 leading-none ml-0.5"
                aria-label={`${v} entfernen`}
              >
                ×
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#1f2937] bg-[#0d1525] shadow-xl overflow-hidden">
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
              <span className="text-sm text-slate-200">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** User settings page: profile photo, personal info, notification toggles, and account deletion. */
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { t, setLanguage, releaseLanguageLock } = useI18n();
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
    staleTime: 1000 * 60 * 3,
  });

  const { data: preferences, isLoading: _preferencesLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      settingsApi.getPreferences().then((res) => {
        saveStored("preferences", res.data);
        return res.data;
      }),
    initialData: () => loadStored("preferences"),
    staleTime: 1000 * 60 * 3,
  });

  const formValues =
    profile && preferences
      ? {
          desired_locations: profile.desired_locations ?? [],
          salary_min: profile.salary_min ?? null,
          salary_max: profile.salary_max ?? null,
          job_types: profile.job_types ?? [],
          industries: profile.industries ?? [],
          experience_level: profile.experience_level ?? "",
          is_open_to_relocation: profile.is_open_to_relocation ?? false,
          currency: preferences.currency ?? "EUR",
          location: preferences.location ?? "Österreich",
          language: preferences.language ?? "de",
        }
      : undefined;

  useEffect(() => {
    if (profile?.avatar) setAvatar(profile.avatar);
  }, [profile?.avatar]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values:
      formValues ?? {
        currency: "EUR",
        location: "Österreich",
        language: "de",
        desired_locations: [],
        salary_min: null,
        salary_max: null,
        job_types: [],
        industries: [],
        experience_level: "",
        is_open_to_relocation: false,
      },
  });

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    const preferencesPayload = {
      currency: data.currency,
      location: data.location,
      language: data.language,
    };

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
      const [preferencesResult, profileResult] = await Promise.allSettled([
        settingsApi.updatePreferences(preferencesPayload, { signal: controller.signal }),
        settingsApi.updateProfile(profilePayload, { signal: controller.signal }),
      ]);

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
        queryClient.invalidateQueries({ queryKey: ["preferences"] }),
        queryClient.invalidateQueries({ queryKey: ["init"] }),
      ]);

      const preferencesFailed = preferencesResult.status === "rejected";
      const profileFailed = profileResult.status === "rejected";

      if (preferencesFailed && profileFailed) {
        toast.error(
          controller.signal.aborted
            ? "Zeitüberschreitung – bitte erneut versuchen"
            : "Einstellungen konnten nicht gespeichert werden"
        );
        return;
      }
      if (preferencesFailed) {
        toast.error("App-Einstellungen konnten nicht gespeichert werden");
        toast.success("Jobpräferenzen gespeichert");
        return;
      }
      if (profileFailed) {
        toast.error("Jobpräferenzen konnten nicht gespeichert werden");
        toast.success("App-Einstellungen gespeichert");
        return;
      }

      if (data.language) setLanguage(data.language);
      toast.success(`${t("settings.savePreferences")} ✓`);
    } finally {
      clearTimeout(abortTimer);
      releaseLanguageLock();
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
      toast.error("Bild muss unter 5 MB sein");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
    } catch {
      toast.error("Bild konnte nicht verarbeitet werden");
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        eyebrow="Konto"
        title="Einstellungen"
        description="Profil & Jobpräferenzen konfigurieren"
        className="mb-3"
        actions={
          <Button
            type="submit"
            form="settings-form"
            variant="primary"
            size="md"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? "Wird gespeichert…" : "Speichern"}</span>
          </Button>
        }
      />

      <form id="settings-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5">

            {/* Profilfoto */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-brand-300 flex-shrink-0" />
                <h2 className="font-semibold text-white">Profilfoto</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profil"
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-brand-500/30"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 ring-2 ring-brand-500/30">
                      <User className="h-7 w-7 text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-md transition-all hover:from-brand-400 hover:to-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
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
                    className="rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-200"
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
                  <p className="text-[11px] text-slate-500">JPG, PNG, WebP · max. 5 MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Basis-Konfiguration */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-300 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-white">Basis-Konfiguration</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sprache, Währung & Marktstandort</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className={LABEL_CLS}>Sprache</label>
                      <div className="relative">
                        <select
                          {...field}
                          className={`${INPUT_SM_CLS} appearance-none pr-9`}
                          value={field.value || "de"}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>{l.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  )}
                />
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className={LABEL_CLS}>Währung</label>
                      <div className="relative">
                        <select
                          {...field}
                          className={`${INPUT_SM_CLS} appearance-none pr-9`}
                          value={field.value || "EUR"}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  )}
                />
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className={LABEL_CLS}>Suchregion</label>
                      <input
                        {...field}
                        className={INPUT_CLS}
                        placeholder="z.B. Wien, Graz"
                        value={field.value || ""}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="space-y-2.5 flex flex-col lg:row-span-2">

            {/* Jobsuche — Orte + Gehalt combined */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-300 flex-shrink-0" />
                <h2 className="font-semibold text-white">Jobsuche</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Controller
                name="desired_locations"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={LABEL_CLS}>Arbeitsorte</label>
                    <input
                      {...field}
                      value={field.value?.join(", ") || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? e.target.value.split(",").map((p) => p.trim()) : []
                        )
                      }
                      className={INPUT_CLS}
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
                      <label className={LABEL_CLS}>Gehalt min (k€)</label>
                      <input {...field} type="number" className="w-full max-w-[160px] rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-0 h-10" placeholder="30" value={field.value || ""} />
                    </div>
                  )}
                />
                <Controller
                  name="salary_max"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className={LABEL_CLS}>Gehalt max (k€)</label>
                      <input {...field} type="number" className="w-full max-w-[160px] rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-0 h-10" placeholder="50" value={field.value || ""} />
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Stellenarten + Erfahrung + Branchen combined */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-brand-300 flex-shrink-0" />
                <h2 className="font-semibold text-white">Präferenzen</h2>
              </div>

              {/* Erfahrungsstufe */}
              <Controller
                name="experience_level"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={LABEL_CLS}>Erfahrungsstufe</label>
                    <div className="relative">
                      <select {...field} className={`${INPUT_CLS} appearance-none pr-9`} value={field.value || ""}>
                        <option value="">Stufe auswählen…</option>
                        {EXPERIENCE_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                )}
              />

              {/* Stellenarten — multi-select dropdown */}
              <Controller
                name="job_types"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className={LABEL_CLS}>Stellenarten</label>
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
                    <label className={LABEL_CLS}>Branchen</label>
                    <MultiSelectDropdown
                      options={INDUSTRIES}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Branchen wählen…"
                    />
                  </div>
                )}
              />
            </div>

            {/* Umzugsbereitschaft */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <Controller
                name="is_open_to_relocation"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Umzugsbereitschaft</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Offen für Stellen außerhalb der Heimatstadt
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors overflow-hidden [transform:translateZ(0)] ${
                        field.value ? "bg-brand-500" : "bg-[#1f2937]"
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
            </div>

            {/* Mobile save — sticky bottom bar (visible on small screens only) */}
            <div className="lg:hidden sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500 hover:shadow-xl hover:shadow-brand-500/40 disabled:opacity-50 disabled:shadow-none h-10"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Wird gespeichert…" : "Einstellungen speichern"}
              </button>
            </div>
          </div>

          {/* Legal Links — nur auf Mobile (Desktop: Footer im Layout) */}
          <div className="md:hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
            <p className={LABEL_CLS}>Rechtliches</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-1">
              <Link to="/terms" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">AGB</Link>
              <Link to="/privacy" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Impressum</Link>
              <Link to="/contact" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Kontakt</Link>
            </div>
          </div>

          {/* Danger Zone — bottom on mobile, left col row 2 on desktop */}
          <DeleteAccountSection />

        </div>

      </form>
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
      toast.success("Konto wurde gelöscht");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Löschen des Kontos"));
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
      <div className="mb-2 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
        <div>
          <h2 className="font-semibold text-slate-400">Gefahrenzone</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Alle Daten, Profile, Lebensläufe und Jobs werden permanent gelöscht.
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
              className="w-full rounded-xl border border-red-900/60 bg-[#0b0606] px-3 py-2 text-sm text-white placeholder-red-900 focus:outline-none focus:border-red-500/50 h-10"
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
              className="rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
