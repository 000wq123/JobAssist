import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, FileText, Upload, ArrowLeft, Trash2, ChevronRight, Download, Lock } from "lucide-react";

import FocusModeWizard from "../components/cv/focus/FocusModeWizard";
import { SCENES } from "../cv/scenes.jsx";
import { emptyProfile } from "../cv/profileSchema";
import { loadDraft, makeDebouncedSave, saveDraftNow, saveToLibrary, loadLibrary, deleteFromLibrary, getCvGenState, incrementCvGen } from "../cv/storage";
import useAuthStore from "../hooks/useAuthStore";
import { resumeApi } from "../services/api";
import PageHeader from "../components/ui/PageHeader";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getLocalPlanKey() {
  try {
    const billing = JSON.parse(localStorage.getItem("billing") || "{}");
    if (billing?.subscription?.plan) return billing.subscription.plan;
    const init = JSON.parse(localStorage.getItem("init") || "{}");
    return init?.plan || "basic";
  } catch { return "basic"; }
}

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

/**
 * Single row card for a saved CV library entry.
 */
function CVLibraryCard({ entry, onDownload, onEdit, onDelete, busy }) {
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
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
          style={{ borderColor: "rgba(255,255,255,0.10)", color: "var(--color-fg-muted)" }}
        >
          Bearbeiten
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
 * @param {{ onStart: () => void, hasDraft: boolean, onLoadFromLibrary: (profile: any) => void }} props
 */
function CVLandingView({ onStart, hasDraft, onLoadFromLibrary }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [library, setLibrary] = useState(() => loadLibrary());
  const [downloadingId, setDownloadingId] = useState(null);
  const genState = getCvGenState(getLocalPlanKey());

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

  return (
    <div className="max-w-[1180px] mx-auto px-5 pt-8 pb-24 sm:px-8 sm:pt-10 lg:px-14 lg:pt-14 flex flex-col gap-12 animate-slide-up">

      <PageHeader
        title="Lebenslauf"
        description="Erstelle einen professionellen österreichischen Lebenslauf in etwa drei Minuten — oder lade deinen eigenen hoch."
      />

      {/* ── Daily generation usage strip ─────────────────────────── */}
      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-4 py-2.5 -mt-8">
        {genState.atLimit
          ? <Lock className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0" />
          : <Download className="w-3.5 h-3.5 text-[var(--color-fg-dim)] flex-shrink-0" />}
        <span className="text-[12px] text-[var(--color-fg-muted)]">PDF-Erstellungen gesamt:</span>
        <span className={`text-[12px] font-semibold ${genState.atLimit ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]"}`}>
          {genState.unlimited ? "Unbegrenzt" : `${genState.count}\u202f/\u202f${genState.limit}`}
        </span>
        {genState.atLimit && !genState.unlimited && (
          <span className="text-[11px] text-[var(--color-warning)]">— Upgrade für mehr</span>
        )}
      </div>

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
          className="col-span-12 lg:col-span-7 flex flex-col gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-7 py-7"
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
            <p className="text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-[52ch]">
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

        {/* Meine PDFs — generated PDF library */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-7 py-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">Gespeichert</p>
              <h2 className="text-[18px] font-semibold text-[var(--color-fg)] mt-0.5" style={{ letterSpacing: "-0.015em" }}>Meine PDFs</h2>
            </div>
            {library.length > 0 && (
              <button
                type="button"
                onClick={onStart}
                className="text-[12px] font-medium text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors"
              >
                + Neu
              </button>
            )}
          </div>

          {library.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
              <FileText className="w-8 h-8 text-[var(--color-fg-faint)]" />
              <p className="text-[13px] text-[var(--color-fg-dim)]">Noch keine PDFs erstellt.</p>
              <p className="text-[12px] text-[var(--color-fg-faint)]">Starte den Generator links — dauert etwa 3 Minuten.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {library.map((entry) => (
                <CVLibraryCard
                  key={entry.id}
                  entry={entry}
                  onDownload={handleLibraryDownload}
                  onEdit={(e) => onLoadFromLibrary(e.profile)}
                  onDelete={handleLibraryDelete}
                  busy={downloadingId === entry.id}
                />
              ))}
            </div>
          )}
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

  const debouncedSave = useMemo(() => makeDebouncedSave(), []);
  const emailPrefillDone = useRef(Boolean(profile.email));

  useEffect(() => {
    debouncedSave(profile);
  }, [profile, debouncedSave]);

  useEffect(() => {
    if (emailPrefillDone.current) return;
    if (authUser?.email) {
      setProfile((p) => (p.email ? p : { ...p, email: authUser.email }));
      emailPrefillDone.current = true;
    }
  }, [authUser]);

  const patch = useCallback((delta) => {
    setProfile((p) => ({ ...p, ...delta }));
  }, []);

  const onComplete = useCallback(async () => {
    const genState = getCvGenState(getLocalPlanKey());
    if (genState.atLimit) {
      setPdfError(`PDF-Limit erreicht (${genState.count}/${genState.limit}). Upgrade auf Pro für mehr.`);
      return;
    }
    setPdfError("");
    setPdfBusy(true);
    try {
      saveDraftNow(profile);
      const { downloadCVPdf } = await import("../cv/exportPdf.jsx");
      await downloadCVPdf(profile);
      incrementCvGen(getLocalPlanKey());
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
    setMode("landing");
  }, [authUser]);

  if (mode === "landing") {
    return (
      <CVLandingView
        onStart={() => setMode("wizard")}
        hasDraft={hasDraftData(profile)}
        onLoadFromLibrary={onLoadFromLibrary}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)]">
      {/* Back to landing */}
      <div className="px-4 pt-3 pb-0">
        <button
          type="button"
          onClick={() => setMode("landing")}
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
        completeBusy={pdfBusy}
        completeError={pdfError}
      />
    </div>
  );
}
