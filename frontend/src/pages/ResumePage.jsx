import { useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import useFetch from "../hooks/useFetch";
import { usePageTitle } from "../hooks/usePageChrome";
import useMutation from "../hooks/useMutation";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Check,
} from "lucide-react";

import { resumeApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import SkillBars from "../components/resume/SkillBars";

const SKILL_DEFS = [
  { key: "tech", label: "Fachkenntnisse" },
  { key: "exp",  label: "Erfahrung" },
  { key: "edu",  label: "Ausbildung" },
  { key: "soft", label: "Persönliche Stärken" },
  { key: "lang", label: "Sprachen" },
];

const OPTIMIZATION_TIPS = [
  { id: "keywords",    label: "Begriffe aus der Stellenanzeige übernehmen" },
  { id: "length",      label: "Lebenslauf auf 1–2 Seiten kürzen" },
  { id: "achievements", label: "Erfolge mit Zahlen belegen" },
  { id: "format",      label: "Format wählen, das Bewerbungssysteme lesen können" },
  { id: "contact",     label: "Kontaktdaten vervollständigen" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Inflates raw 0-100 score so weak resumes still get visible movement.
 */
function inflate(v) {
  return Math.min(95, Math.round(v + (100 - v) * 0.55));
}

/**
 * Returns true if the analysis object has at least one real per-skill number.
 * Used to detect a backend response that lacks the detailed breakdown
 * so we can show "no data" instead of fabricating identical placeholder bars.
 */
function hasDetailedSkills(analysis) {
  if (!analysis) return false;
  return SKILL_DEFS.some((s) => {
    const v = analysis[s.key];
    return typeof v === "number" && !Number.isNaN(v);
  });
}

/**
 * Builds skill array from analysis JSON. Returns null if there's no real data.
 */
function buildSkills(analysis) {
  if (!hasDetailedSkills(analysis)) return null;
  return SKILL_DEFS.map((s) => ({
    key: s.key,
    label: s.label,
    value: inflate(typeof analysis[s.key] === "number" ? analysis[s.key] : 50),
  }));
}

/**
 * ResumePage — clean two-column layout.
 *  Left:  Upload zone + uploaded files
 *  Right: Skill bars + score + optimization checklist
 */
export default function ResumePage() {
  usePageTitle("Lebenslauf");

  const [selectedId, setSelectedId] = useState(null);
  const [completed, setCompleted] = useState(() => new Set());

  const { data: resumesRaw, loading: isFetching, reload: reloadResumes } = useFetch(
    () => resumeApi.list().then((r) => r.data),
    { cacheKey: "resumes:list" }
  );
  const resumes = useMemo(() => (Array.isArray(resumesRaw) ? resumesRaw : []), [resumesRaw]);

  const activeResume = useMemo(() => {
    if (!resumes.length) return null;
    return resumes.find((r) => r.id === selectedId) || resumes[0];
  }, [resumes, selectedId]);

  const { data: analysisData, loading: analyzing } = useFetch(
    () => resumeApi.analyze(activeResume.id).then((r) => r.data),
    { enabled: !!activeResume?.id && !!activeResume?.parsed_status, deps: [activeResume?.id] }
  );

  const skills = useMemo(() => buildSkills(analysisData), [analysisData]);
  const hasSkills = skills !== null;

  // Average is only meaningful if real skill data exists; fall back to
  // analysisData.score when available, otherwise show no number.
  const baseScore = useMemo(() => {
    if (hasSkills) {
      return Math.round(skills.reduce((a, s) => a + s.value, 0) / skills.length);
    }
    if (typeof analysisData?.score === "number") return Math.round(analysisData.score);
    return null;
  }, [skills, hasSkills, analysisData]);

  // Each completed task is worth enough to plausibly reach the 85% goal.
  const tasksTotal = OPTIMIZATION_TIPS.length;
  const taskValue = baseScore != null
    ? Math.max(2, Math.ceil((Math.max(0, 85 - baseScore) + 2) / tasksTotal))
    : 0;
  const completedPoints = [...completed].length * taskValue;
  const currentScore = baseScore != null ? Math.min(100, baseScore + completedPoints) : null;
  const goalReached = currentScore != null && currentScore >= 85;

  // ─── Upload ─────────────────────────────────────────────────
  const uploadMut = useMutation((file) => {
    const fd = new FormData();
    fd.append("file", file);
    return resumeApi.upload(fd);
  });
  const handleUpload = async (file) => {
    try {
      const res = await uploadMut.mutate(file);
      reloadResumes();
      toast.success("Lebenslauf hochgeladen");
      if (res.data?.id) setSelectedId(res.data.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload fehlgeschlagen"));
    }
  };

  const onDrop = (files) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei ist zu groß. Maximal 5 MB.");
      return;
    }
    handleUpload(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploadMut.loading,
  });

  // ─── Delete ─────────────────────────────────────────────────
  const deleteMut = useMutation((id) => resumeApi.delete(id));
  const handleDelete = async (id) => {
    try {
      await deleteMut.mutate(id);
      reloadResumes();
      if (selectedId === id) setSelectedId(null);
      toast.success("Lebenslauf gelöscht");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen"));
    }
  };

  // ─── Tasks ──────────────────────────────────────────────────
  const toggleTask = (id) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-[1180px] mx-auto px-5 pt-8 pb-24 sm:px-8 sm:pt-10 lg:px-14 lg:pt-14 flex flex-col gap-12 lg:gap-16 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Lebenslauf"
        description="Lade deinen Lebenslauf hoch — die KI zeigt dir Stärken und was du verbessern kannst."
      />

      {/* ── Active resume hero strip — flat, no card ───────────────────────── */}
      {activeResume && (
        <section className="grid grid-cols-12 gap-6 items-end pb-10 border-b border-[var(--color-border-subtle)]">
          <div className="col-span-12 sm:col-span-7 min-w-0">
            <p className="text-[12px] text-[var(--color-fg-dim)] mb-1.5">Aktiver Lebenslauf</p>
            <h2
              className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[var(--color-fg)] truncate"
              style={{ letterSpacing: "-0.02em" }}
            >
              {activeResume.filename}
            </h2>
            <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)]">
              Hochgeladen {formatDate(activeResume.updated_at || activeResume.created_at)}
            </p>
          </div>
          <div className="col-span-12 sm:col-span-5 sm:text-right">
            <p className="text-[12px] text-[var(--color-fg-dim)] mb-1.5">Aktuelle Bewertung</p>
            {currentScore != null ? (
              <div className="flex items-baseline gap-1.5 sm:justify-end">
                <span
                  className="text-[52px] sm:text-[60px] font-semibold leading-[1] tabular-nums"
                  style={{
                    letterSpacing: "-0.04em",
                    color: goalReached ? "var(--color-success)" : "var(--color-fg)",
                  }}
                >
                  {currentScore}
                </span>
                <span className="text-[22px] font-medium text-[var(--color-fg-dim)] tabular-nums">%</span>
                {goalReached && (
                  <Badge variant="success" size="sm" className="ml-2 self-center">
                    <CheckCircle2 className="w-3 h-3" />
                    Ziel erreicht
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--color-fg-dim)]">
                {analyzing ? "Wird berechnet…" : "Noch keine Analyse"}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Skills + Optimize checklist — flat columns, no cards ──────────── */}
      {activeResume && (
        <div className="grid grid-cols-12 gap-10 lg:gap-14">
          <Section
            className="col-span-12 lg:col-span-7"
            title="Deine Stärken"
            description="Einschätzung der KI · Werte können abweichen."
            actions={analyzing ? <Badge variant="neutral" size="sm">Analysiere…</Badge> : null}
          >
            {analyzing ? (
              <div className="grid grid-cols-1 gap-3">
                {SKILL_DEFS.map((s) => <Skeleton key={s.key} className="h-7" />)}
              </div>
            ) : hasSkills ? (
              <SkillBars skills={skills} />
            ) : (
              <div className="py-2">
                <p className="text-[13px] text-[var(--color-fg-muted)]">
                  Noch keine Detailanalyse verfügbar.
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-fg-dim)] max-w-md leading-relaxed">
                  Lade einen Lebenslauf hoch — die KI startet die Analyse automatisch.
                </p>
              </div>
            )}
          </Section>

          <Section
            className="col-span-12 lg:col-span-5"
            title="Optimieren"
            description={`${completed.size}/${OPTIMIZATION_TIPS.length} erledigt`}
          >
            <ul className="flex flex-col">
              {OPTIMIZATION_TIPS.map((t, i) => {
                const done = completed.has(t.id);
                return (
                  <li
                    key={t.id}
                    className={i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      className="group w-full flex items-start gap-3 py-3 text-left"
                    >
                      <div
                        className={`grid h-[18px] w-[18px] mt-0.5 flex-shrink-0 place-items-center rounded-md border transition-colors ${
                          done
                            ? "bg-[var(--color-success)] border-[var(--color-success)]"
                            : "bg-transparent border-[var(--color-border-strong)] group-hover:border-[var(--color-fg-dim)]"
                        }`}
                      >
                        {done && <Check className="w-3 h-3 text-[var(--color-bg)]" strokeWidth={3} />}
                      </div>
                      <span
                        className={`flex-1 text-[13.5px] leading-snug transition-colors ${
                          done ? "text-[var(--color-fg-dim)] line-through" : "text-[var(--color-fg)]"
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>
      )}

      {/* ── Drop zone + Documents list — flat 2-col ────────────────────────── */}
      <div className="grid grid-cols-12 gap-10 lg:gap-14">

        {/* Drop zone (the only bordered island on this page) */}
        <Section
          className="col-span-12 lg:col-span-7"
          title={activeResume ? "Neue Version hochladen" : "Lebenslauf hochladen"}
          description="PDF oder TXT · max. 5 MB"
        >
          <div
            {...getRootProps()}
            className={`group flex flex-col items-center justify-center gap-3 px-4 py-12 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
              isDragActive
                ? "border-[var(--app-brand)] bg-[var(--app-brand)]/[0.06]"
                : "border-[var(--color-border-strong)] hover:border-[var(--color-fg-dim)] hover:bg-[var(--color-bg-elev-1)]/40"
            } ${uploadMut.loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            {uploadMut.loading ? (
              <>
                <span
                  className="inline-block w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--color-fg-muted)", borderTopColor: "transparent" }}
                />
                <p className="text-[13px] font-medium text-[var(--color-fg-muted)]">Analysiere…</p>
              </>
            ) : (
              <>
                <Upload
                  className={`h-7 w-7 transition-colors ${
                    isDragActive ? "text-[var(--app-brand)]" : "text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-muted)]"
                  }`}
                />
                <div className="text-center">
                  <p className="text-[14.5px] font-medium text-[var(--color-fg)]">
                    {isDragActive ? "Hier ablegen" : "Datei auswählen"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
                    {isDragActive ? "Loslassen zum Hochladen" : "oder per Drag & Drop"}
                  </p>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Documents list — flat, no avatars */}
        <Section
          className="col-span-12 lg:col-span-5"
          title="Dokumente"
          description={resumes.length > 0 ? `${resumes.length} hochgeladen` : "Keine Lebensläufe"}
        >
          {isFetching && resumes.length === 0 ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
            </div>
          ) : resumes.length === 0 ? (
            <p className="text-[13px] text-[var(--color-fg-dim)] py-2">
              Lade deinen ersten Lebenslauf hoch.
            </p>
          ) : (
            <ul className="flex flex-col">
              {resumes.map((r, i) => {
                const isActive = (activeResume?.id ?? null) === r.id;
                return (
                  <li
                    key={r.id}
                    className={i > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}
                  >
                    <div
                      className={`group flex items-center gap-3 py-3 ${
                        isActive ? "" : "cursor-pointer"
                      }`}
                      onClick={() => !isActive && setSelectedId(r.id)}
                    >
                      <FileText className={`h-4 w-4 flex-shrink-0 ${
                        isActive ? "text-[var(--app-brand)]" : "text-[var(--color-fg-faint)]"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13.5px] truncate tracking-tight ${
                          isActive ? "text-[var(--color-fg)] font-medium" : "text-[var(--color-fg)]"
                        }`}>
                          {r.filename}
                        </p>
                        <p className="text-[11.5px] text-[var(--color-fg-dim)] truncate">
                          {formatDate(r.updated_at || r.created_at)}
                          {formatSize(r.file_size) ? ` · ${formatSize(r.file_size)}` : ""}
                          {isActive ? " · Aktiv" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        disabled={deleteMut.loading}
                        className="flex-shrink-0 w-11 h-11 -m-2 md:m-0 md:w-7 md:h-7 grid place-items-center rounded-md text-[var(--color-fg-faint)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 opacity-0 group-hover:opacity-100 transition-opacity max-md:opacity-100"
                        aria-label="Löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      {/* The standalone AI Assistant is deprecated. CV-specific feedback
          will return when CV Builder ships (see PRODUCT_V1.md §1.1). */}
    </div>
  );
}
