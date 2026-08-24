import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageChrome";
import useMutation from "../hooks/useMutation";
import { useBootstrap } from "../context/BootstrapContext";
import toast from "react-hot-toast";
import {
  Save, Camera, Trash2, User, AlertTriangle, ChevronDown, FileText, Upload, X,
  Moon, Sun, Monitor, SlidersHorizontal,
} from "lucide-react";
import { authApi, resumeApi, settingsApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { getApiErrorMessage } from "../utils/apiError";
import { useTheme } from "../context/ThemeContext";
import Skeleton from "../components/ui/Skeleton";
import Popover from "../components/ui/Popover";

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
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const JOB_TYPES = ["Vollzeit", "Teilzeit", "Praktikum", "Samstagsjob", "Ferialjob", "Geringfügig", "Freiberuflich"];
const EXPERIENCE_LEVELS = ["Noch in der Schule", "Gerade fertig / Studium", "Habe schon etwas gearbeitet", "Mehrere Jahre Erfahrung"];
const INDUSTRIES = ["Gastronomie", "Handel/Verkauf", "Technik/IT", "Gesundheit", "Bildung", "Handwerk", "Büro/Verwaltung", "Sonstiges"];

// ─── Shared primitives ───────────────────────────────────────────
const CARD = "rounded-[10px] border p-5 sm:p-6";
const cardStyle = { background: "var(--app-surface, #FFF)", borderColor: "var(--app-border, #E7E7E4)", transition: "var(--app-transition)" };
const labelCls = "block text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5";
const inputCls = "w-full h-10 rounded-[6px] border px-3 text-[13.5px] outline-none transition-colors duration-100";
const inputStyle = { background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)", color: "var(--app-text, #171717)" };

function SectionTitle({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="grid place-items-center w-7 h-7 rounded-[6px]" style={{ background: "var(--app-brand-soft, #FFF0F1)", color: "var(--app-brand, #E30613)" }}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div>
        <h2 className="text-[15px] font-semibold leading-tight" style={{ color: "var(--app-text, #171717)" }}>{title}</h2>
        {desc && <p className="text-[12px] mt-0.5" style={{ color: "var(--app-text-muted, #888)" }}>{desc}</p>}
      </div>
    </div>
  );
}

function MultiSelectDropdown({ options, value = [], onChange, placeholder = "Auswählen…" }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const toggle = (option) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  const remove = (option, e) => { e.stopPropagation(); onChange(value.filter((v) => v !== option)); };

  return (
    <div>
      <div ref={anchorRef} onClick={() => setOpen((o) => !o)}
        className="min-h-10 w-full rounded-[6px] border px-2 py-1.5 text-[13.5px] cursor-pointer flex flex-wrap gap-1 items-center outline-none transition-colors duration-100"
        style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)", color: "var(--app-text, #171717)" }}>
        {value.length === 0 ? (
          <span className="px-1 py-0.5" style={{ color: "var(--app-text-faint, #B0B0AD)" }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[12px] font-medium"
              style={{ background: "var(--app-surface-hover, #F5F5F3)", color: "var(--app-text, #171717)" }}>
              {v}
              <button type="button" onClick={(e) => remove(v, e)} aria-label={`${v} entfernen`}
                style={{ color: "var(--app-text-faint, #B0B0AD)" }}>×</button>
            </span>
          ))
        )}
        <ChevronDown className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--app-text-faint, #B0B0AD)" }} />
      </div>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="left" className="w-[min(100%,320px)] rounded-[8px] border overflow-hidden mt-1"
        style={{ borderColor: "var(--app-border, #E7E7E4)", background: "var(--app-surface, #FFF)" }}>
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none" style={{ color: "var(--app-text, #171717)" }}>
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} className="w-4 h-4 rounded accent-[#E30613] flex-shrink-0" />
            <span className="text-[13.5px]">{option}</span>
          </label>
        ))}
      </Popover>
    </div>
  );
}

/**
 * SettingsPage v2 — account console.
 * Card-grouped sections: Profil, Job-Präferenzen, Lebenslauf (PDF-only upload),
 * Darstellung (theme), Account (danger zone). Left sub-nav on desktop.
 */
export default function SettingsPage() {
  usePageTitle("Einstellungen");
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const me = useAuthStore((s) => s.user);
  const { init, loading: bootstrapLoading, setInit } = useBootstrap();

  // Profile comes straight from the bootstrap payload — no duplicate request,
  // no "defaults then snap" flash.
  const profile = init?.profile;

  const formValues = {
    desired_locations: profile?.desired_locations ?? [],
    salary_min: profile?.salary_min ?? null,
    salary_max: profile?.salary_max ?? null,
    job_types: profile?.job_types ?? [],
    industries: profile?.industries ?? [],
    experience_level: profile?.experience_level ?? "",
    is_open_to_relocation: profile?.is_open_to_relocation ?? false,
  };

  useEffect(() => { if (profile?.avatar) setAvatar(profile.avatar); }, [profile?.avatar]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm({ values: formValues });
  const watchedSalaryMin = useWatch({ control, name: "salary_min" });
  const watchedSalaryMax = useWatch({ control, name: "salary_max" });
  const salaryError = watchedSalaryMin != null && watchedSalaryMax != null && watchedSalaryMin > watchedSalaryMax
    ? "Mindestgehalt darf nicht höher als das Maximalgehalt sein" : null;

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    if (salaryError) { toast.error(salaryError); return; }
    const profilePayload = {
      desired_locations: data.desired_locations, salary_min: data.salary_min, salary_max: data.salary_max,
      job_types: data.job_types, industries: data.industries, experience_level: data.experience_level,
      is_open_to_relocation: data.is_open_to_relocation, avatar: avatar ?? null,
    };
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 10000);
    try {
      await settingsApi.updateProfile(profilePayload, { signal: controller.signal });
      const newAvatar = avatar ?? null;
      setInit((old) => old ? { ...old, profile: { ...(old.profile || {}), ...profilePayload, avatar: newAvatar } } : old);
      toast.success("Einstellungen gespeichert");
    } catch (err) {
      toast.error(controller.signal.aborted ? "Zeitüberschreitung – bitte erneut versuchen" : getApiErrorMessage(err, "Einstellungen konnten nicht gespeichert werden"));
    } finally { clearTimeout(abortTimer); }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Bitte wähle eine Bilddatei aus"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Bild ist zu groß. Maximal 5 MB."); return; }
    try { const compressed = await compressImage(file); setAvatar(compressed); } catch { toast.error("Bild konnte nicht verarbeitet werden"); }
  };

  const isLoading = bootstrapLoading && !profile;
  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="animate-slide-up">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]" style={{ color: "var(--app-text, #171717)" }}>Einstellungen</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--app-text-muted, #888)" }}>Profil, Jobpräferenzen und Darstellung.</p>
        </div>
        <button type="submit" form="settings-form" disabled={isSubmitting}
          className="btn btn-primary btn-md gap-2">
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? "Wird gespeichert…" : "Speichern"}</span>
        </button>
      </div>

      <form id="settings-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Sub-nav (desktop) ─────────────────────────────── */}
          <nav className="hidden lg:flex flex-col gap-1 w-[180px] flex-shrink-0 sticky top-0 pt-1">
            {[
              { id: "profil", label: "Profil", icon: User },
              { id: "job-praeferenzen", label: "Job-Präferenzen", icon: SlidersHorizontal },
              { id: "lebenslauf", label: "Lebenslauf", icon: FileText },
              { id: "darstellung", label: "Darstellung", icon: Monitor },
              { id: "account", label: "Account", icon: AlertTriangle },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`}
                className="flex items-center gap-2.5 h-8 px-2.5 rounded-[4px] text-[13px] font-medium transition-colors duration-100"
                style={{ color: "var(--app-text-muted, #888)" }}>
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </a>
            ))}
          </nav>

          {/* ── Sections ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Profil */}
            <section id="profil" className={CARD} style={cardStyle}>
              <SectionTitle icon={User} title="Profil" desc="Dein Foto und deine Identität" />
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Profilfoto" className="h-16 w-16 rounded-[8px] object-cover"
                      style={{ border: "1px solid var(--app-border, #E7E7E4)" }} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[8px]"
                      style={{ background: "var(--app-surface-hover, #F5F5F3)", border: "1px solid var(--app-border, #E7E7E4)" }}>
                      <User className="h-7 w-7" style={{ color: "var(--app-text-faint, #B0B0AD)" }} />
                    </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid place-items-center h-6 w-6 rounded-[6px] text-white transition-colors duration-100"
                    style={{ background: "var(--app-brand, #E30613)" }}
                    aria-label="Profilfoto ändern">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className="text-[17px] font-bold tracking-[-0.02em] truncate" style={{ color: "var(--app-text, #171717)" }}>
                    {me?.full_name || me?.email?.split("@")[0] || "Dein Name"}
                  </p>
                  <p className="text-[13px] truncate" style={{ color: "var(--app-text-muted, #888)" }}>
                    {me?.email || "—"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="rounded-[6px] border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-100"
                      style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)", color: "var(--app-text-secondary, #626262)" }}>
                      {avatar ? "Foto ändern" : "Foto hochladen"}
                    </button>
                    {avatar && (
                      <button type="button" onClick={() => { setAvatar(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="flex items-center gap-1 text-[13px] transition-colors duration-100"
                        style={{ color: "var(--app-error, #E05050)" }}>
                        <Trash2 className="h-3 w-3" /> Foto entfernen
                      </button>
                    )}
                    <p className="text-[11px]" style={{ color: "var(--app-text-faint, #B0B0AD)" }}>JPG, PNG, WebP · max. 5 MB</p>
                  </div>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            </section>

            {/* Job-Präferenzen */}
            <section id="job-praeferenzen" className={CARD} style={cardStyle}>
              <SectionTitle icon={SlidersHorizontal} title="Job-Präferenzen" desc="Wonach du suchst" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller name="desired_locations" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }} htmlFor="desired_locations">Arbeitsorte</label>
                    <input id="desired_locations" className={inputCls} style={inputStyle}
                      value={field.value?.join(", ") || ""}
                      onChange={(e) => field.onChange(e.target.value ? e.target.value.split(",").map((p) => p.trim()) : [])}
                      placeholder="Wien, Graz…" />
                  </div>
                )} />
                <Controller name="experience_level" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }} htmlFor="experience_level">Erfahrung</label>
                    <select id="experience_level" {...field} className={`${inputCls} appearance-none`} style={inputStyle} value={field.value || ""}>
                      <option value="">Wähle dein Niveau…</option>
                      {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                )} />
                <Controller name="salary_min" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }} htmlFor="salary_min">Mindestgehalt (€ / Monat)</label>
                    <input id="salary_min" type="number" className={inputCls}
                      aria-invalid={!!salaryError}
                      aria-describedby={salaryError ? "salary-error" : undefined}
                      style={{ ...inputStyle, borderColor: salaryError ? "var(--app-error, #E05050)" : "var(--app-border, #E7E7E4)" }}
                      {...field} value={field.value || ""} placeholder="30" />
                  </div>
                )} />
                <Controller name="salary_max" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }} htmlFor="salary_max">Maximalgehalt (€ / Monat)</label>
                    <input id="salary_max" type="number" className={inputCls}
                      aria-invalid={!!salaryError}
                      aria-describedby={salaryError ? "salary-error" : undefined}
                      style={{ ...inputStyle, borderColor: salaryError ? "var(--app-error, #E05050)" : "var(--app-border, #E7E7E4)" }}
                      {...field} value={field.value || ""} placeholder="50" />
                  </div>
                )} />
                {salaryError && (
                  <p id="salary-error" role="alert" className="text-[12px] text-[var(--app-error, #E05050)] -mt-2">{salaryError}</p>
                )}
                <Controller name="job_types" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }}>Jobarten</label>
                    <MultiSelectDropdown options={JOB_TYPES} value={field.value || []} onChange={field.onChange} placeholder="Stellenarten wählen…" />
                  </div>
                )} />
                <Controller name="industries" control={control} render={({ field }) => (
                  <div>
                    <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }}>Branchen</label>
                    <MultiSelectDropdown options={INDUSTRIES} value={field.value || []} onChange={field.onChange} placeholder="Branchen wählen…" />
                  </div>
                )} />
              </div>
              {salaryError && <p className="text-[12px] mt-2" style={{ color: "var(--app-error, #E05050)" }}>{salaryError}</p>}
              <Controller name="is_open_to_relocation" control={control} render={({ field }) => (
                <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t" style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
                  <div>
                    <p className="text-[13.5px] font-semibold" style={{ color: "var(--app-text, #171717)" }}>Umzugsbereitschaft</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--app-text-muted, #888)" }}>Offen für Stellen außerhalb der Heimatstadt</p>
                  </div>
                  <button type="button" role="switch" aria-checked={!!field.value} aria-label="Umzugsbereitschaft"
                    onClick={() => field.onChange(!field.value)}
                    className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-100"
                    style={{ background: field.value ? "var(--app-brand, #E30613)" : "var(--app-border-strong, #D8D8D4)" }}>
                    {/* eslint-disable-next-line no-restricted-syntax -- toggle knob, not layout */}
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-100"
                      style={{ transform: field.value ? "translateX(20px)" : "translateX(0)" }} />
                  </button>
                </div>
              )} />
            </section>

            {/* Lebenslauf (PDF only) */}
            <section id="lebenslauf" className={CARD} style={cardStyle}>
              <SectionTitle icon={FileText} title="Lebenslauf" desc="PDF-Upload als Ergänzung zum Lebenslauf-Builder" />
              <CVUploadSection />
            </section>

            {/* Darstellung */}
            <section id="darstellung" className={CARD} style={cardStyle}>
              <SectionTitle icon={Monitor} title="Darstellung" desc="Wähle dein bevorzugtes Theme" />
              <ThemeSection />
            </section>

            {/* Account / Danger zone */}
            <section id="account" className={CARD} style={cardStyle}>
              <SectionTitle icon={AlertTriangle} title="Account" desc="Konto und Sicherheit" />
              <DeleteAccountSection />
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-slide-up">
      <div className="mb-6"><Skeleton className="h-8 w-48" /></div>
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[10px] border p-6" style={{ borderColor: "var(--app-border, #E7E7E4)" }}>
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-10 w-full max-w-sm rounded-[6px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** CV upload/management — PDF only, per backend /resume/upload contract. */
function CVUploadSection() {
  const cvInputRef = useRef(null);
  const { data: resumesRaw, reload: reloadResumes } = useFetch(
    () => resumeApi.list().then((r) => r.data),
    { cacheKey: "resumes:list" }
  );
  const resumes = Array.isArray(resumesRaw) ? resumesRaw : [];

  const uploadMut = useMutation((file) => { const fd = new FormData(); fd.append("file", file); return resumeApi.upload(fd); });
  const handleUpload = async (file) => {
    try {
      await uploadMut.mutate(file);
      reloadResumes();
      toast.success("Lebenslauf hochgeladen");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload fehlgeschlagen"));
    }
  };
  const deleteMut = useMutation((id) => resumeApi.delete(id));
  const handleDeleteResume = async (id) => {
    try {
      await deleteMut.mutate(id);
      reloadResumes();
      toast.success("Lebenslauf entfernt");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen"));
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Nur PDF-Dateien erlaubt"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Datei zu groß. Maximal 10 MB."); return; }
    handleUpload(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      {resumes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {resumes.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-[6px] border px-3 py-2.5"
              style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
              <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "var(--app-brand, #E30613)" }} />
              <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: "var(--app-text-secondary, #626262)" }}>
                {r.filename || r.original_filename || `Lebenslauf ${r.id}`}
              </span>
              <button type="button" onClick={() => handleDeleteResume(r.id)} disabled={deleteMut.loading}
                className="flex-shrink-0 transition-colors duration-100 disabled:opacity-50" style={{ color: "var(--app-text-faint, #B0B0AD)" }}
                aria-label="Lebenslauf entfernen">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px]" style={{ color: "var(--app-text-muted, #888)" }}>
          Noch kein Lebenslauf hochgeladen. Deinen eigenen Lebenslauf kannst du im Lebenslauf-Bereich erstellen — hier kannst du zusätzlich ein bestehendes PDF hinterlegen.
        </p>
      )}
      <button type="button" onClick={() => cvInputRef.current?.click()} disabled={uploadMut.loading}
        className="inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[13px] font-semibold transition-colors duration-100 disabled:opacity-50 w-fit"
        style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)", color: "var(--app-text-secondary, #626262)" }}>
        {uploadMut.loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--app-border, #E7E7E4)", borderTopColor: "var(--app-brand, #E30613)" }} />
        ) : <Upload className="h-3.5 w-3.5" />}
        {uploadMut.loading ? "Wird hochgeladen…" : resumes.length > 0 ? "Weiteres PDF hochladen" : "PDF hochladen"}
      </button>
      <input ref={cvInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
      <p className="text-[11px]" style={{ color: "var(--app-text-faint, #B0B0AD)" }}>Nur PDF · max. 10 MB</p>
    </div>
  );
}

/** Theme toggle — System / Hell / Dunkel. */
function ThemeSection() {
  const { preference, setTheme } = useTheme();
  const options = [
    { value: "system", label: "System", desc: "Betriebssystem", icon: Monitor },
    { value: "light", label: "Hell", desc: "Helles Design", icon: Sun },
    { value: "dark", label: "Dunkel", desc: "Dunkles Design", icon: Moon },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = preference === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => setTheme(opt.value)}
            className="flex items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition-colors duration-100"
            style={{
              borderColor: active ? "var(--app-brand, #E30613)" : "var(--app-border, #E7E7E4)",
              background: active ? "var(--app-brand-soft, #FFF0F1)" : "var(--app-surface, #FFF)",
            }}>
            <opt.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? "var(--app-brand, #E30613)" : "var(--app-text-muted, #888)" }} />
            <div>
              <div className="text-[13px] font-semibold" style={{ color: active ? "#b30010" : "var(--app-text, #171717)" }}>{opt.label}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--app-text-muted, #888)" }}>{opt.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Danger-zone — account deletion with password confirmation. */
function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!password) { toast.error("Bitte gib dein Passwort ein"); return; }
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
    <div className="rounded-[8px] border p-4" style={{ borderColor: "var(--app-error, #E05050)", background: "var(--app-error-soft, rgba(224,80,80,0.08))" }}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#b91c1c" }} />
        <div>
          <h3 className="font-semibold" style={{ color: "#b91c1c" }}>Konto löschen</h3>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--app-text-secondary, #626262)" }}>
            Entfernt alle deine Daten, Profile, Lebensläufe und gespeicherten Stellen dauerhaft.
          </p>
        </div>
      </div>
      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-[6px] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-100"
          style={{ background: "#c0392b" }}>
          <Trash2 className="h-3.5 w-3.5" /> Konto löschen
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-[6px] p-3" style={{ background: "var(--app-surface, #FFF)" }}>
          <p className="text-[13.5px] font-semibold" style={{ color: "var(--app-error, #E05050)" }}>
            Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div>
            <label className={labelCls} style={{ color: "var(--app-text-muted, #888)" }} htmlFor="delete-password">Passwort zur Bestätigung</label>
            <input id="delete-password" type="password" className={inputCls} style={inputStyle}
              placeholder="Aktuelles Passwort eingeben" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="rounded-[6px] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-100 disabled:opacity-50"
              style={{ background: "var(--app-error, #E05050)" }}>
              {deleting ? "Wird gelöscht…" : "Unwiderruflich löschen"}
            </button>
            <button onClick={() => { setShowConfirm(false); setPassword(""); }}
              className="rounded-[6px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-100"
              style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)", color: "var(--app-text-secondary, #626262)" }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}