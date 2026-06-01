import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Sparkles, ArrowLeft, Trash2, ChevronRight, Download, CheckCircle2, Upload, Copy, Pencil,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import FocusModeWizard from "../components/cv/focus/FocusModeWizard";
import { SCENES } from "../cv/scenes.jsx";
import { emptyProfile } from "../cv/profileSchema";
import {
  loadDraft, makeDebouncedSave, saveDraftNow, saveToLibrary,
  loadLibrary, deleteFromLibrary, duplicateInLibrary, renameInLibrary,
} from "../cv/storage";
import useAuthStore from "../hooks/useAuthStore";
import { profileApi, resumeApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import PageHeader from "../components/ui/PageHeader";
import { CVTemplatePicker, TemplatePreviewPanel, TemplateLightbox } from "../cv/CVTemplatePicker";

// ─── Constants ──────────────────────────────────────────────────────────────
const SERIF = "'Instrument Serif', ui-serif, Georgia, serif";

const TMPL_META = {
  "gray-header":  { label: "Grau-Header",    color: "#9ca3af" },
  "slim-sidebar": { label: "Schlanke Leiste", color: "#d1d5db" },
  "tabellarisch": { label: "Tabellarisch",    color: "#1C3557" },
  "dark-bands":   { label: "Dunkle Bänder",   color: "#1a1a1a" },
};

function hasDraftData(draft) {
  return !!(draft?.vorname || draft?.nachname || draft?.schultyp);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
}

/** Convert a parsed resume JSON (from backend /resume/analyze) into a CVProfile partial. */
function mapParsedResumeToProfile(parsed) {
  const p = parsed || {};
  const nameParts = (p.name || "").split(" ");
  const vorname = nameParts[0] || "";
  const nachname = nameParts.slice(1).join(" ") || "";

  const erfahrungen = (p.experience || []).map((e) => ({
    id: Math.random().toString(36).slice(2, 10),
    art: "Sonstige",
    titel: e.title || "",
    organisation: e.company || "",
    von: "",
    bis: "",
    bullets: e.bullets || [],
  }));

  // Map education to schulname / schultyp heuristics
  let schulname = "";
  let schultyp = "";
  const edu = (p.education || [])[0];
  if (edu) {
    schulname = edu.institution || "";
    const deg = (edu.degree || "").toLowerCase();
    if (deg.includes("hak")) schultyp = "HAK";
    else if (deg.includes("htl")) schultyp = "HTL";
    else if (deg.includes("ahs")) schultyp = "AHS";
    else if (deg.includes("bhs")) schultyp = "BHS";
    else if (deg.includes("nms")) schultyp = "NMS";
    else if (deg.includes("pts")) schultyp = "PTS";
    else schultyp = "Sonstige";
  }

  const sprachkenntnisse = [{ sprache: "Deutsch", niveau: "Muttersprache" }];
  (p.languages || []).forEach((l) => {
    if (l && l.name && l.name.toLowerCase() !== "deutsch") {
      sprachkenntnisse.push({ sprache: l.name, niveau: l.level || "B1" });
    }
  });

  return {
    vorname,
    nachname,
    email: p.email || "",
    telefon: p.phone || "",
    profil: p.summary || "",
    faehigkeiten: p.skills || [],
    erfahrungen,
    schulname,
    schultyp,
    sprachkenntnisse,
    // These come from the resume parser but don't map perfectly:
    weiterbildungen: (p.certifications || []).map((c) => ({
      name: typeof c === "string" ? c : c.name || "",
      institution: typeof c === "object" ? c.institution || "" : "",
      jahr: typeof c === "object" ? c.year || "" : "",
    })),
  };
}

/**
 * Single row card for a saved CV library entry.
 */
function CVLibraryCard({ entry, onDownload, onEdit, onDelete, onDuplicate, onRename, busy }) {
  const meta = TMPL_META[entry.templateId] || TMPL_META["tabellarisch"];
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] hover:border-[var(--color-border-strong)] transition-colors">
      <div style={{ width: 8, height: 40, borderRadius: 3, background: meta.color, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[var(--color-fg)] truncate">{entry.name}</p>
        <p className="text-[12px] text-[var(--color-fg-faint)] mt-0.5">
          {meta.label} · {formatDate(entry.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onDownload(entry)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
          style={{ background: "var(--color-accent-500)", color: "#0b0b14" }}
        >
          <Download className="w-3 h-3" />
          {busy ? "…" : "PDF"}
        </button>
        <button
          type="button"
          onClick={() => onEdit(entry)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
          style={{ borderColor: "rgba(255,255,255,0.10)", color: "var(--color-fg-muted)" }}
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(entry)}
          className="p-1.5 text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] transition-colors"
          title="Duplizieren"
          aria-label="Duplizieren"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRename(entry)}
          className="p-1.5 text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] transition-colors"
          title="Umbenennen"
          aria-label="Umbenennen"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="p-1.5 text-[var(--color-fg-faint)] hover:text-[var(--color-error)] transition-colors"
          aria-label="Entfernen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Landing view shown before entering the wizard.
 * Matches the app's normal page aesthetic.
 *
 * @param {{ onStart: () => void, hasDraft: boolean, onLoadFromLibrary: (profile: any) => void, onUploadResume: (file: File) => void, uploadBusy: boolean }} props
 */
function CVLandingView({ onStart, hasDraft, onLoadFromLibrary, onUploadResume, uploadBusy }) {
  const [library, setLibrary] = useState(() => loadLibrary());
  const [downloadingId, setDownloadingId] = useState(null);

  const handleLibraryDownload = async (entry) => {
    setDownloadingId(entry.id);
    try {
      const { downloadCVPdf } = await import("../cv/exportPdf.jsx");
      await downloadCVPdf(entry.profile);
    } catch {
      toast.error("PDF konnte nicht erstellt werden.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLibraryDelete = (id) => {
    deleteFromLibrary(id);
    setLibrary(loadLibrary());
  };

  const handleLibraryDuplicate = (entry) => {
    duplicateInLibrary(entry.id);
    setLibrary(loadLibrary());
    toast.success("Lebenslauf dupliziert.");
  };

  const handleLibraryRename = (entry) => {
    const newName = window.prompt("Neuer Name:", entry.name);
    if (newName && newName.trim() && newName.trim() !== entry.name) {
      renameInLibrary(entry.id, newName.trim());
      setLibrary(loadLibrary());
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: uploadBusy,
    onDrop: (accepted) => {
      if (accepted[0]) onUploadResume(accepted[0]);
    },
    onDropRejected: () => {
      toast.error("Nur PDF oder TXT, maximal 5 MB.");
    },
  });

  return (
    <div className="max-w-[1180px] mx-auto px-5 pt-8 pb-24 sm:px-8 sm:pt-10 lg:px-14 lg:pt-14 flex flex-col gap-12 animate-slide-up">

      <PageHeader
        title="Lebenslauf"
        description="Erstelle einen professionellen österreichischen Lebenslauf in etwa drei Minuten — oder lade deinen eigenen hoch."
      />

      {/* ── Saved CVs library ────────────────────────────────────── */}
      {library.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[var(--color-fg)]">Deine Lebensläufe</h2>
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors"
            >
              <span className="text-[17px] leading-none font-light">+</span> Neu erstellen
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {library.map((entry) => (
              <CVLibraryCard
                key={entry.id}
                entry={entry}
                onDownload={handleLibraryDownload}
                onEdit={(e) => onLoadFromLibrary(e.profile)}
                onDelete={handleLibraryDelete}
                onDuplicate={handleLibraryDuplicate}
                onRename={handleLibraryRename}
                busy={downloadingId === entry.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Two-up feature cards ─────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Create from scratch */}
        <div
          className="col-span-12 md:col-span-6 flex flex-col gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-7 py-7"
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-300)]">
              Instant-Lebenslauf
            </p>
            <h2
              className="text-[28px] sm:text-[34px] font-normal leading-[1.1] text-[var(--color-fg)]"
              style={{ fontFamily: SERIF, letterSpacing: "-0.02em" }}
            >
              {hasDraft ? "Entwurf fortsetzen" : "Lebenslauf erstellen"}
            </h2>
            <p className="text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
              {hasDraft
                ? "Du hast einen angefangenen Entwurf. Mach dort weiter, wo du aufgehört hast — deine Antworten sind gespeichert."
                : "Beantworte ein paar Fragen über dich. Danach generieren wir sofort ein professionelles PDF im österreichischen Format."}
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {[
              { text: "Tabellarischer Lebenslauf im österreichischen Standard", color: "text-[var(--color-accent-300)]" },
              { text: "Persönliche Daten, Ausbildung, Erfahrung, Sprachen",      color: "text-emerald-400" },
              { text: "Sofort als PDF herunterladen — kein Konto bei Drittanbietern", color: "text-sky-400" },
            ].map(({ text, color }) => (
              <li key={text} className="flex items-start gap-2 text-[13px] text-[var(--color-fg-muted)]">
                <span className={`mt-0.5 text-[11px] font-bold flex-shrink-0 ${color}`}>✓</span>
                {text}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onStart}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px"
            style={{ background: "var(--color-accent-500)", color: "#0b0b14", boxShadow: "0 0 0 1px rgba(124,125,240,.4), 0 4px 14px rgba(124,125,240,.22)" }}
          >
            <Sparkles className="w-4 h-4" />
            {hasDraft ? "Fortsetzen" : "Starten — etwa 3 Minuten"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Upload existing resume */}
        <div
          {...getRootProps()}
          className={`col-span-12 md:col-span-6 flex flex-col gap-6 rounded-2xl border border-dashed px-7 py-7 transition-colors cursor-pointer ${
            isDragActive
              ? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/[0.04]"
              : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-elev-1)]"
          } ${uploadBusy ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
              Vorhandener Lebenslauf
            </p>
            <h2
              className="text-[28px] sm:text-[34px] font-normal leading-[1.1] text-[var(--color-fg)]"
              style={{ fontFamily: SERIF, letterSpacing: "-0.02em" }}
            >
              Hochladen &amp; vorausfüllen
            </h2>
            <p className="text-[14px] text-[var(--color-fg-muted)] leading-relaxed">
              Lade einen bestehenden Lebenslauf hoch. Wir lesen deine Daten aus und füllen das Formular für dich vor.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {[
              { text: "Unterstützt PDF und Textdateien", color: "text-[var(--color-accent-300)]" },
              { text: "KI liest Name, Ausbildung, Erfahrung aus", color: "text-emerald-400" },
              { text: "Du kannst alles vor dem PDF noch bearbeiten", color: "text-sky-400" },
            ].map(({ text, color }) => (
              <li key={text} className="flex items-start gap-2 text-[13px] text-[var(--color-fg-muted)]">
                <span className={`mt-0.5 text-[11px] font-bold flex-shrink-0 ${color}`}>✓</span>
                {text}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px border border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-fg)]"
          >
            <Upload className="w-4 h-4" />
            {uploadBusy ? "Wird gelesen…" : "Datei auswählen"}
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * Lebenslauf builder page.
 *
 * mode = 'landing' → standard app-page layout with feature overview.
 * mode = 'wizard'  → full-screen focus wizard (FocusModeWizard).
 *
 * Auto-starts wizard if a meaningful draft already exists.
 */
export default function CVBuilderPage() {
  const authUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState(() => {
    const draft = loadDraft();
    if (!draft.email && authUser?.email) draft.email = authUser.email;
    return draft;
  });
  const [mode, setMode] = useState(() => hasDraftData(loadDraft()) ? "wizard" : "landing");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [finishLightboxOpen, setFinishLightboxOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const debouncedSave = useMemo(() => makeDebouncedSave(), []);
  const emailPrefillDone = useRef(Boolean(profile.email?.trim?.()));

  // ── Load profile from backend on mount (fallback to local draft) ────────
  const { data: serverProfile } = useQuery({
    queryKey: ["cv-profile"],
    queryFn: profileApi.get,
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!serverProfile?.data) return;
    const srv = serverProfile.data;
    // Only overwrite local draft if the server has newer/more complete data.
    // We use a simple heuristic: if server has a name and local doesn't, or server has more filled fields.
    const localFilled = [profile.vorname, profile.nachname, profile.schulname].filter(Boolean).length;
    const srvFilled = [srv.vorname, srv.nachname, srv.schulname].filter(Boolean).length;
    if (srvFilled >= localFilled) {
      const merged = { ...emptyProfile(), ...srv, templateId: srv.templateId || profile.templateId || "tabellarisch" };
      setProfile(merged);
      saveDraftNow(merged);
    }
  }, [serverProfile]);

  // ── Persist to localStorage (fast) and backend (debounced) ─────────────
  useEffect(() => {
    debouncedSave(profile);
  }, [profile, debouncedSave]);

  const backendSaveTimer = useRef(null);
  useEffect(() => {
    if (!authUser) return;
    if (backendSaveTimer.current) clearTimeout(backendSaveTimer.current);
    backendSaveTimer.current = setTimeout(() => {
      profileApi.patch(profile).catch(() => {
        // Silently fail — localStorage is the source of truth; backend is a backup.
      });
    }, 2000);
    return () => clearTimeout(backendSaveTimer.current);
  }, [profile, authUser]);

  useEffect(() => {
    if (emailPrefillDone.current) return;
    if (authUser?.email) {
      setProfile((p) => (p.email?.trim?.() ? p : { ...p, email: authUser.email }));
      emailPrefillDone.current = true;
    }
  }, [authUser]);

  const patch = useCallback((delta) => {
    setProfile((p) => ({ ...p, ...delta }));
  }, []);

  const onComplete = useCallback(() => {
    setMode("finish");
  }, []);

  // ── PDF download with SERVER-SIDE rate limit check ────────────────────
  const handleDownload = useCallback(async () => {
    setPdfError("");
    setPdfBusy(true);
    try {
      // Ask the server for permission (increments usage counter).
      await profileApi.generateCv();
    } catch (err) {
      const msg = getApiErrorMessage(err, "PDF-Limit erreicht. Upgrade auf Pro für mehr.");
      setPdfError(msg);
      setPdfBusy(false);
      return;
    }
    try {
      saveDraftNow(profile);
      const { downloadCVPdf } = await import("../cv/exportPdf.jsx");
      await downloadCVPdf(profile);
      // Also sync completion to backend
      profileApi.patch(profile).catch(() => {});
      saveToLibrary(profile);
      toast.success("PDF heruntergeladen — dein Lebenslauf wurde gespeichert.");
      setMode("landing");
    } catch (err) {
      setPdfError("PDF konnte nicht erstellt werden. Bitte erneut versuchen.");
      // eslint-disable-next-line no-console
      console.error("CV PDF export failed", err);
    } finally {
      setPdfBusy(false);
    }
  }, [profile]);

  // ── Resume upload → parse → prefill wizard ─────────────────────────────
  const handleUploadResume = useCallback(async (file) => {
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await resumeApi.upload(formData);
      const resumeId = uploadRes.data?.id;
      if (!resumeId) throw new Error("Upload failed");

      // Fetch parsed JSON from the uploaded resume
      const getRes = await resumeApi.get(resumeId);
      const parsed = getRes.data?.parsed_json ? JSON.parse(getRes.data.parsed_json) : {};
      const mapped = mapParsedResumeToProfile(parsed);

      const merged = { ...emptyProfile(), ...mapped, templateId: profile.templateId || "tabellarisch" };
      if (authUser?.email) merged.email = authUser.email;
      setProfile(merged);
      saveDraftNow(merged);
      toast.success("Daten übernommen — du kannst sie jetzt bearbeiten.");
      setMode("templatePicker");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Lebenslauf konnte nicht gelesen werden."));
    } finally {
      setUploadBusy(false);
    }
  }, [profile.templateId, authUser]);

  const onLoadFromLibrary = useCallback((libProfile) => {
    setProfile({ ...libProfile });
    saveDraftNow(libProfile);
    setMode("wizard");
  }, []);

  const onReset = useCallback(() => {
    if (!window.confirm("Lebenslauf-Entwurf wirklich löschen?")) return;
    const empty = emptyProfile();
    if (authUser?.email) empty.email = authUser.email;
    setProfile(empty);
    saveDraftNow(empty);
    // Also clear on backend
    profileApi.patch(empty).catch(() => {});
    setMode("landing");
  }, [authUser]);

  const handleBackToLanding = useCallback(() => {
    // Preserve the draft — going back to landing should never destroy data.
    setMode("landing");
  }, []);

  if (mode === "landing") {
    return (
      <CVLandingView
        onStart={() => setMode("templatePicker")}
        hasDraft={hasDraftData(profile)}
        onLoadFromLibrary={onLoadFromLibrary}
        onUploadResume={handleUploadResume}
        uploadBusy={uploadBusy}
      />
    );
  }

  if (mode === "templatePicker") {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)]">
        <div className="px-4 pt-3 pb-0">
          <button
            type="button"
            onClick={handleBackToLanding}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Übersicht
          </button>
        </div>
        <div className="max-w-[720px] lg:max-w-[1400px] mx-auto px-4 lg:px-10 pt-8 pb-6 lg:pb-24">
          <CVTemplatePicker profile={profile} onChange={patch} />
          <div className="mt-4 lg:mt-8">
            <button
              type="button"
              onClick={() => setMode("wizard")}
              className="w-full lg:max-w-[480px] lg:mx-auto h-[52px] rounded-[14px] inline-flex items-center justify-center gap-2 font-semibold text-[15px] tracking-[0.01em] bg-white/90 hover:bg-white text-[#0b0b10] transition-all"
            >
              Weiter zum Formular
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "finish") {
    return (
      <div className="min-h-[100dvh] bg-[var(--color-bg)]">
        <div className="px-4 pt-3 pb-0">
          <button
            type="button"
            onClick={handleBackToLanding}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Übersicht
          </button>
        </div>
        <div className="max-w-[640px] lg:max-w-[1100px] mx-auto px-5 pt-8 pb-24">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.25)] grid place-items-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-ok)]" />
            </div>
            <h2 className="text-[28px] sm:text-[34px] font-normal leading-[1.1] text-[var(--color-fg)]" style={{ fontFamily: SERIF }}>
              Dein Lebenslauf ist fertig.
            </h2>
          </div>
          <p className="text-[14px] text-[var(--color-fg-muted)] leading-relaxed mb-6">
            Hier ist die Vorschau mit deinen Daten. Du kannst die Vorlage noch wechseln, bevor du die PDF erzeugst.
          </p>

          <TemplatePreviewPanel profile={profile} templateId={profile.templateId} />

          {pdfError && <p className="text-[12px] text-[var(--color-error)] mt-4">{pdfError}</p>}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={pdfBusy}
              className="w-full h-[56px] rounded-[14px] inline-flex items-center justify-center gap-2 font-semibold text-[16px] tracking-[0.01em] bg-white/90 hover:bg-white text-[#0b0b10] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {pdfBusy ? "Wird erstellt…" : "PDF herunterladen"}
              <Download className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setFinishLightboxOpen(true)}
              className="w-full h-[48px] rounded-[14px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] text-[15px] transition-colors"
            >
              Vorlage wechseln
            </button>
          </div>
          {finishLightboxOpen && (
            <TemplateLightbox
              templateId={profile.templateId}
              profile={profile}
              onClose={() => setFinishLightboxOpen(false)}
              onSelect={(id) => { patch({ templateId: id }); setFinishLightboxOpen(false); }}
            />
          )}
          <div className="mt-6 flex items-center gap-3 text-[14px] text-[var(--color-fg-dim)]">
            <button type="button" onClick={onReset} className="hover:text-[var(--color-fg)] transition-colors">Neuen Lebenslauf erstellen</button>
            <span className="text-[var(--color-border-hover)]">|</span>
            <Link to="/dashboard" className="hover:text-[var(--color-fg)] transition-colors">Zum Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)]">
      {/* Back to landing */}
      <div className="px-4 pt-3 pb-0">
        <button
          type="button"
          onClick={handleBackToLanding}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Übersicht
        </button>
      </div>
      <FocusModeWizard
        scenes={SCENES}
        profile={profile}
        onChange={patch}
        onComplete={onComplete}
        completeBusy={false}
        completeError=""
      />
    </div>
  );
}
