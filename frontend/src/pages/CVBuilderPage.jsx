import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useFetch from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageChrome";
import useConfirmDialog from "../components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import {
  ArrowLeft, Trash2, ChevronRight, Download, CheckCircle2, Upload, Copy, Pencil, Edit3,
  Wand2, Plus,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import CVSimpleBuilder from "../components/cv/CVSimpleBuilder";
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
import { getTemplateMeta } from "../cv/templateRegistry";
import { useBootstrap } from "../context/BootstrapContext";

function T(n) { return `var(--app-${n})`; }

function hasDraftData(draft) {
  return !!(draft?.vorname || draft?.nachname || draft?.schultyp);
}

// Session-scoped builder view persistence — keeps the user on the overview
// (library visible) across visits instead of forcing the wizard every time.
const MODE_STORAGE_KEY = "ja:cv_builder_mode";
const BUILD_MODES = ["landing", "wizard", "templatePicker"];

function readLastMode() {
  try {
    const m = sessionStorage.getItem(MODE_STORAGE_KEY);
    return BUILD_MODES.includes(m) ? m : null;
  } catch {
    return null;
  }
}

function persistMode(mode) {
  try {
    sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / quota — ignore */
  }
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
}

function mapParsedResumeToProfile(parsed) {
  const p = parsed || {};
  const nameParts = (p.name || "").split(" ");
  const vorname = nameParts[0] || "";
  const nachname = nameParts.slice(1).join(" ") || "";
  const erfahrungen = (p.experience || []).map((e) => ({
    id: Math.random().toString(36).slice(2, 10),
    art: "Sonstige", titel: e.title || "", organisation: e.company || "",
    von: "", bis: "", bullets: e.bullets || [],
  }));
  let schulname = "", schultyp = "";
  const edu = (p.education || [])[0];
  if (edu) {
    schulname = edu.institution || "";
    const deg = (edu.degree || "").toLowerCase();
    if (deg.includes("hak")) schultyp = "HAK";
    else if (deg.includes("htl")) schultyp = "HTL";
    else if (deg.includes("ahs")) schultyp = "AHS";
    else if (deg.includes("bhs")) schultyp = "BHS";
    else schultyp = "Sonstige";
  }
  const sprachkenntnisse = [{ sprache: "Deutsch", niveau: "Muttersprache" }];
  (p.languages || []).forEach((l) => {
    if (l && l.name && l.name.toLowerCase() !== "deutsch") sprachkenntnisse.push({ sprache: l.name, niveau: l.level || "B1" });
  });
  return {
    vorname, nachname, email: p.email || "", telefon: p.phone || "",
    profil: p.summary || "", faehigkeiten: p.skills || [], erfahrungen,
    schulname, schultyp, sprachkenntnisse,
    weiterbildungen: (p.certifications || []).map((c) => ({
      name: typeof c === "string" ? c : c.name || "",
      institution: typeof c === "object" ? c.institution || "" : "",
      jahr: typeof c === "object" ? c.year || "" : "",
    })),
  };
}

/* ── CVLibraryCard ── */
function CVLibraryCard({ entry, onDownload, onEdit, onDelete, onDuplicate, onRename, busy }) {
  const meta = getTemplateMeta(entry.templateId);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 rounded-lg border"
      style={{ borderColor: T("border"), background: T("surface") }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div style={{ width: 6, height: 28, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold truncate" style={{ color: T("text") }}>{entry.name}</p>
          <p className="text-[12px] mt-0.5" style={{ color: T("text-muted") }}>{meta.name} · {formatDate(entry.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={() => onDownload(entry)} disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
          style={{ background: T("brand"), color: "#fff" }}>
          <Download className="w-3 h-3" />{busy ? "…" : "PDF"}
        </button>
        <button type="button" onClick={() => onEdit(entry)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors"
          style={{ borderColor: T("border"), color: T("text-secondary") }}>
          <Edit3 className="w-3 h-3 sm:hidden" /><span className="hidden sm:inline">Bearbeiten</span>
        </button>
        <button type="button" onClick={() => onDuplicate(entry)} className="p-1.5 rounded"
          style={{ color: T("text-faint") }} title="Duplizieren"><Copy className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => onRename(entry)} className="p-1.5 rounded"
          style={{ color: T("text-faint") }} title="Umbenennen"><Pencil className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => onDelete(entry.id)} className="p-1.5 rounded"
          style={{ color: T("text-faint") }} title="Entfernen"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

/* ── CVLandingView ── */
function CVLandingView({ onStart, hasDraft, onLoadFromLibrary, onUploadResume, uploadBusy, onReset }) {
  // Library state is owned by BootstrapContext so the dashboard count and the
  // server mirror stay in sync (BootstrapProvider merges the server library
  // into this on boot).
  const { cvLibrary: library, setCvLibrary } = useBootstrap();
  const [downloadingId, setDownloadingId] = useState(null);

  const handleLibraryDownload = async (entry) => {
    setDownloadingId(entry.id);
    try { const { downloadCVPdf } = await import("../cv/exportPdf.jsx"); await downloadCVPdf(entry.profile); }
    catch { toast.error("PDF konnte nicht erstellt werden."); }
    finally { setDownloadingId(null); }
  };
  const handleLibraryDelete = (id) => { deleteFromLibrary(id); setCvLibrary(loadLibrary()); };
  const handleLibraryDuplicate = (entry) => { duplicateInLibrary(entry.id); setCvLibrary(loadLibrary()); toast.success("Lebenslauf dupliziert."); };
  const handleLibraryRename = (entry) => {
    const newName = window.prompt("Neuer Name:", entry.name);
    if (newName && newName.trim() && newName.trim() !== entry.name) { renameInLibrary(entry.id, newName.trim()); setCvLibrary(loadLibrary()); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1, maxSize: 5 * 1024 * 1024, disabled: uploadBusy,
    onDrop: (accepted) => { if (accepted[0]) onUploadResume(accepted[0]); },
    onDropRejected: () => toast.error("Nur PDF oder TXT, maximal 5 MB."),
  });

  return (
    <div className="animate-slide-up max-w-[1100px] mx-auto px-5 pt-6 pb-24 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12 flex flex-col gap-8">
      <PageHeader title="Lebenslauf" description="Erstelle einen professionellen österreichischen Lebenslauf." />

      {/* One authoritative current-CV state: the draft (or the empty state). */}
      {hasDraft ? (
        <div className="rounded-xl border p-6 flex flex-col sm:flex-row sm:items-center gap-5"
          style={{ borderColor: "var(--status-offered-soft)", background: T("surface") }}>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: T("brand") }}>Entwurf vorhanden</p>
            <h2 className="text-[20px] font-bold mb-1" style={{ color: T("text") }}>Dein Lebenslauf</h2>
            <p className="text-[13px]" style={{ color: T("text-secondary") }}>Mach dort weiter, wo du aufgehört hast — dein Fortschritt wird automatisch gespeichert.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <button type="button" onClick={onStart}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-[14px] font-semibold transition-colors"
              style={{ background: T("brand"), color: "#fff" }}>
              <Wand2 className="w-4 h-4" />Fortsetzen <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {onReset && (
              <button type="button" onClick={onReset}
                className="inline-flex items-center h-11 px-4 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
                style={{ border: `1px solid ${T("border")}`, color: T("text-secondary") }}>
                Verwerfen
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state — framed, not a lonely illustration in a void */
        <div className="rounded-xl border overflow-hidden grid grid-cols-12" style={{ borderColor: T("border"), background: T("surface") }}>
          <div className="col-span-12 md:col-span-7 px-7 py-9 flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: T("brand") }}>Lebenslauf erstellen</p>
            <h2 className="text-[24px] font-bold tracking-[-0.02em] mb-2" style={{ color: T("text") }}>Erstelle deinen ersten Lebenslauf</h2>
            <p className="text-[14px] leading-relaxed max-w-md mb-6" style={{ color: T("text-secondary") }}>
              Beantworte ein paar Fragen und erhalte sofort ein professionelles PDF im österreichischen Format. Professionell, österreichisch und direkt als PDF.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={onStart}
                className="btn btn-primary btn-lg gap-2">
                <Wand2 className="w-4 h-4" />Lebenslauf erstellen
              </button>
              <button type="button" onClick={() => document.getElementById("cv-upload-zone")?.click()}
                className="btn btn-secondary btn-lg gap-2">
                <Upload className="w-4 h-4" />PDF hochladen
              </button>
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 min-h-[160px] flex items-center justify-center px-5 py-6"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--app-brand) 6%, var(--app-surface)) 0%, color-mix(in srgb, var(--app-border-subtle) 75%, var(--app-surface)) 100%)",
              borderLeft: "1px solid var(--app-border-subtle)",
            }}>
            <img src="/illustrations/cv-document.png" alt="" className="w-[150px] h-[150px] object-contain pointer-events-none" />
          </div>
        </div>
      )}

      {/* Library */}
      {library.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold" style={{ color: T("text") }}>Gespeicherte Lebensläufe</h2>
            <button type="button" onClick={onStart} className="btn btn-link text-[13px] font-medium">
              <Plus className="w-3.5 h-3.5 inline mr-1" />Neu
            </button>
          </div>
          {library.map((entry) => (
            <CVLibraryCard key={entry.id} entry={entry} onDownload={handleLibraryDownload}
              onEdit={(e) => onLoadFromLibrary(e.profile)} onDelete={handleLibraryDelete}
              onDuplicate={handleLibraryDuplicate} onRename={handleLibraryRename} busy={downloadingId === entry.id} />
          ))}
        </div>
      )}

      {/* Secondary actions — never duplicate the draft's "Fortsetzen" */}
      {hasDraft && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 md:col-span-7 rounded-xl border p-6"
            style={{ borderColor: T("border"), background: T("surface") }}>
            <h2 className="text-[17px] font-bold tracking-[-0.02em] mb-1.5" style={{ color: T("text") }}>
              Neuen Lebenslauf erstellen
            </h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: T("text-secondary") }}>
              Starte mit einer leeren Vorlage und wähle aus professionellen Designs — dein Entwurf bleibt dabei unangetastet.
            </p>
            <button type="button" onClick={onStart}
              className="btn btn-secondary btn-md gap-2">
              <Plus className="w-4 h-4" />Neue Vorlage wählen
            </button>
          </div>

          <div className="col-span-12 md:col-span-5 rounded-xl border p-6"
            style={{ borderColor: T("border"), background: T("surface") }}>
            <h2 className="text-[17px] font-bold tracking-[-0.02em] mb-1.5" style={{ color: T("text") }}>
              Lebenslauf hochladen
            </h2>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: T("text-secondary") }}>
              Lade ein bestehendes PDF oder eine Textdatei hoch — wir lesen die Daten aus und füllen das Formular vor.
            </p>
            <div id="cv-upload-zone" {...getRootProps()} className={`w-full rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors text-center ${isDragActive ? "border-[var(--app-brand)]" : ""} ${uploadBusy ? "opacity-60 pointer-events-none" : ""}`}
              style={{ borderColor: isDragActive ? T("brand") : T("border") }}>
              <input {...getInputProps()} aria-label="Lebenslauf-Datei hochladen" />
              <Upload className="w-4 h-4 mx-auto mb-1.5" style={{ color: T("text-muted") }} />
              <p className="text-[12.5px] font-medium" style={{ color: T("text") }}>
                {uploadBusy ? "Wird gelesen…" : "Datei auswählen oder hierher ziehen"}
              </p>
              <p className="text-[11px] mt-1" style={{ color: T("text-faint") }}>PDF oder TXT, max. 5 MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CVBuilderPage ── */
export default function CVBuilderPage() {
  usePageTitle("CV-Builder");
  const { confirm, element: confirmElement } = useConfirmDialog();
  const { setCvLibrary } = useBootstrap();
  const authUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(() => {
    const draft = loadDraft();
    if (!draft.email && authUser?.email) draft.email = authUser.email;
    return draft;
  });
  // Remember which view the user last left the builder on (session-scoped):
  // auto-entering the wizard on EVERY visit hid the saved-CV library and made
  // the cards appear to reload each time the page was opened. First visit in a
  // session still auto-resumes a draft (wizard); afterwards the last view wins.
  const [mode, setModeState] = useState(() => readLastMode() ?? (hasDraftData(loadDraft()) ? "wizard" : "landing"));
  const setMode = useCallback((next) => {
    setModeState(next);
    if (next !== "finish") persistMode(next); // "finish" is a transient post-download view
  }, []);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [finishLightboxOpen, setFinishLightboxOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const debouncedSave = useMemo(() => makeDebouncedSave(), []);
  const emailPrefillDone = useRef(Boolean(profile.email?.trim?.()));

  const { data: serverProfile } = useFetch(
    () => profileApi.get(),
    { enabled: !!authUser }
  );

  useEffect(() => {
    if (!serverProfile?.data) return;
    const srv = serverProfile.data;
    // Only prefill from the server while the local draft is still empty —
    // never overwrite content the user already typed or loaded from their
    // saved draft (prevents the mid-session "content swap" flash).
    const localFilled = [profile.vorname, profile.nachname, profile.schulname].filter(Boolean).length;
    if (localFilled > 0) return;
    const srvFilled = [srv.vorname, srv.nachname, srv.schulname].filter(Boolean).length;
    if (srvFilled > 0) {
      const merged = { ...emptyProfile(), ...srv, templateId: srv.templateId || profile.templateId || "tabellarisch" };
      setProfile(merged); saveDraftNow(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverProfile]);

  useEffect(() => { debouncedSave(profile); }, [profile, debouncedSave]);

  const backendSaveTimer = useRef(null);
  useEffect(() => {
    if (!authUser) return;
    if (backendSaveTimer.current) clearTimeout(backendSaveTimer.current);
    backendSaveTimer.current = setTimeout(() => {
      profileApi.patch(profile).catch((err) => { toast.error(getApiErrorMessage(err, "Speichern fehlgeschlagen")); });
    }, 2000);
    return () => clearTimeout(backendSaveTimer.current);
  }, [profile, authUser]);

  useEffect(() => {
    if (emailPrefillDone.current) return;
    if (authUser?.email) { setProfile((p) => (p.email?.trim?.() ? p : { ...p, email: authUser.email })); emailPrefillDone.current = true; }
  }, [authUser]);

  const patch = useCallback((delta) => { setProfile((p) => ({ ...p, ...delta })); }, []);

  const handleDownload = useCallback(async () => {
    setPdfError(""); setPdfBusy(true);
    saveDraftNow(profile); saveToLibrary(profile);
    // Reflect the new library snapshot in shared state (storage already pushed it).
    setCvLibrary(loadLibrary());
    try { await profileApi.generateCv(); }
    catch (err) { setPdfError(getApiErrorMessage(err, "PDF-Limit erreicht.")); setPdfBusy(false); return; }
    try {
      const { downloadCVPdf } = await import("../cv/exportPdf.jsx");
      await downloadCVPdf(profile);
      profileApi.patch(profile).catch(() => {});
      toast.success("PDF heruntergeladen — dein Lebenslauf wurde gespeichert.");
      setMode("landing");
    } catch { setPdfError("PDF konnte nicht erstellt werden."); }
    finally { setPdfBusy(false); }
  }, [profile, setCvLibrary, setMode]);

  const handleUploadResume = useCallback(async (file) => {
    setUploadBusy(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const uploadRes = await resumeApi.upload(formData);
      const resumeId = uploadRes.data?.id;
      if (!resumeId) throw new Error("Upload failed");
      const getRes = await resumeApi.get(resumeId);
      const parsed = getRes.data?.parsed_json ? JSON.parse(getRes.data.parsed_json) : {};
      const mapped = mapParsedResumeToProfile(parsed);
      const merged = { ...emptyProfile(), ...mapped, templateId: profile.templateId || "tabellarisch" };
      if (authUser?.email) merged.email = authUser.email;
      setProfile(merged); saveDraftNow(merged);
      toast.success("Daten übernommen — du kannst sie jetzt bearbeiten.");
      setMode("templatePicker");
    } catch (err) { toast.error(getApiErrorMessage(err, "Lebenslauf konnte nicht gelesen werden.")); }
    finally { setUploadBusy(false); }
  }, [profile.templateId, authUser, setMode]);

  const onLoadFromLibrary = useCallback((libProfile) => { setProfile({ ...libProfile }); saveDraftNow(libProfile); setMode("wizard"); }, [setMode]);
  const onReset = useCallback(async () => {
    const ok = await confirm({
      title: "Entwurf verwerfen?",
      body: "Dein aktueller Lebenslauf-Entwurf wird gelöscht. Das kann nicht rückgängig gemacht werden.",
      confirmLabel: "Verwerfen",
      danger: true,
    });
    if (!ok) return;
    const empty = emptyProfile(); if (authUser?.email) empty.email = authUser.email;
    setProfile(empty); saveDraftNow(empty); profileApi.patch(empty).catch(() => {});
    setMode("landing");
  }, [authUser, confirm, setMode]);

  if (mode === "landing") {
    return (
      <>
        {confirmElement}
        <CVLandingView onStart={() => setMode("templatePicker")}
          hasDraft={hasDraftData(profile)} onLoadFromLibrary={onLoadFromLibrary}
          onUploadResume={handleUploadResume} uploadBusy={uploadBusy}
          onReset={hasDraftData(profile) ? onReset : undefined} />
      </>
    );
  }

  if (mode === "templatePicker") {
    return (
      <div style={{ minHeight: "100dvh", background: T("bg") }}>
        <div className="max-w-[1280px] mx-auto px-4 lg:px-10 pt-5">
          <button type="button" onClick={() => setMode("landing")} className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer transition-opacity duration-150 hover:opacity-80" style={{ color: T("text-muted") }}>
            <ArrowLeft className="w-3.5 h-3.5" />Zurück
          </button>
          <CVTemplatePicker profile={profile} onChange={patch} onContinue={() => setMode("wizard")} />
        </div>
      </div>
    );
  }

  if (mode === "finish") {
    return (
      <div style={{ minHeight: "100dvh", background: T("bg") }}>
        <div className="px-4 pt-3">
          <button type="button" onClick={() => setMode("landing")} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: T("text-muted") }}>
            <ArrowLeft className="w-3.5 h-3.5" />Zurück
          </button>
        </div>
        <div className="max-w-[640px] lg:max-w-[1100px] mx-auto px-5 pt-8 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full border grid place-items-center flex-shrink-0"
              style={{ background: "color-mix(in srgb, var(--app-success) 12%, transparent)", borderColor: "color-mix(in srgb, var(--app-success) 25%, transparent)" }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: T("success") }} />
            </div>
            <h2 className="text-[24px] font-bold" style={{ color: T("text") }}>Dein Lebenslauf ist fertig.</h2>
          </div>
          <TemplatePreviewPanel profile={profile} templateId={profile.templateId} />
          {pdfError && <p className="text-[12px] mt-4" style={{ color: T("error") }}>{pdfError}</p>}
          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={handleDownload} disabled={pdfBusy}
              className="w-full h-[52px] rounded-lg inline-flex items-center justify-center gap-2 font-semibold text-[15px] disabled:opacity-60 transition-colors"
              style={{ background: T("accent"), color: "#fff" }}>
              {pdfBusy ? "Wird erstellt…" : "PDF herunterladen"} <Download className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setFinishLightboxOpen(true)}
              className="w-full h-[44px] rounded-lg border text-[14px] transition-colors"
              style={{ borderColor: T("border"), color: T("text-secondary") }}>Vorlage wechseln</button>
          </div>
          {finishLightboxOpen && <TemplateLightbox templateId={profile.templateId} profile={profile}
            onClose={() => setFinishLightboxOpen(false)} onSelect={(id) => { patch({ templateId: id }); setFinishLightboxOpen(false); }} />}
        </div>
      </div>
    );
  }

  return <CVSimpleBuilder profile={profile} onChange={patch} onBack={() => setMode("landing")}
    onDownload={handleDownload} pdfBusy={pdfBusy} pdfError={pdfError} />;
}