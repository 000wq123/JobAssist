import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Upload, FileText, Sparkles, Brain,
  Clock, CheckCircle, X,
  Target,
  TrendingUp,
  Edit3
} from "lucide-react";
import { resumeApi } from "../services/api";
import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string to a short German locale date (e.g. "3. Jan. 2024").
 * @param {string|null} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Converts a byte count to a human-readable KB/MB string.
 * @param {number|null} bytes
 * @returns {string|null}
 */
function formatSize(bytes) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// ─── Skill definitions (colors/labels — values come from Groq) ───────────────

const SKILL_DEFS = [
  { key: "tech", label: "Tech Skills",  color: "#a855f7" },
  { key: "exp",  label: "Erfahrung",    color: "#38bdf8" },
  { key: "edu",  label: "Ausbildung",   color: "#34d399" },
  { key: "soft", label: "Soft Skills",  color: "#fbbf24" },
  { key: "lang", label: "Sprachen",     color: "#f472b6" },
];

/**
 * Inflates a raw AI score upward so lower values improve more visually.
 * @param {number} v - Raw score 0–100.
 * @returns {number}
 */
function inflateScore(v) {
  // Boost scores upward — low values rise most, high values rise less
  return Math.min(95, Math.round(v + (100 - v) * 0.55));
}

/**
 * Merges GROQ skill dimension raw scores with category definitions and inflates them.
 * @param {object|null} analysisData
 * @returns {Array<{key: string, label: string, color: string, value: number}>}
 */
function mergeGroqScores(analysisData) {
  return SKILL_DEFS.map(s => {
    const raw = analysisData?.[s.key] ?? 50;
    return { ...s, value: inflateScore(raw) };
  });
}

/**
 * Derives a short natural-language skill summary from the top-scored dimension.
 * @param {Array<{label: string, value: number}>|null} skills
 * @returns {string|null}
 */
function buildSkillSummary(skills) {
  if (!skills?.length) return null;
  const sorted = [...skills].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const mid = sorted.slice(1, -1);
  const midText = mid.length ? ` ${mid.map(s => s.label).join(", ")} liegen im mittleren Bereich.` : "";
  return `Der stärkste Bereich ist ${top.label} (${top.value}%).${midText} Entwicklungspotenzial besteht vor allem bei ${bottom.label} (${bottom.value}%) — gezielte Verbesserungen hier steigern deinen Gesamtscore am stärksten.`;
}

// ─── Gamification: Score Goal System ────────────────────────────────────────

/**
 * Hook managing the resume optimisation gamification system (tasks + score).
 * Persists task completion state to localStorage.
 * @param {Array<{value: number}>|null} skills
 * @returns {{ tasks: object[], completedTasks: Set<string>, toggleTask: Function, currentScore: number }}
 */
function useGamification(skills) {
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("resume_optimization_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const avgScore = useMemo(() => {
    return Math.round(skills.reduce((a, b) => a + b.value, 0) / skills.length);
  }, [skills]);

  const GOAL_SCORE = 85;

  const tasks = useMemo(() => {
    const baseTasks = [
      { id: "keywords", label: "Keywords aus Stellenanzeige einfügen", baseWeight: 3, icon: Target },
      { id: "length",   label: "Lebenslauf auf 1-2 Seiten kürzen",     baseWeight: 2, icon: FileText },
      { id: "achievements", label: "Messbare Erfolge hinzufügen",       baseWeight: 4, icon: TrendingUp },
      { id: "format",   label: "ATS-freundliches Format wählen",         baseWeight: 2, icon: CheckCircle },
      { id: "contact",  label: "Kontaktdaten vervollständigen",          baseWeight: 2, icon: CheckCircle },
    ];
    // Scale points so completing all tasks always bridges avgScore → GOAL_SCORE.
    // fairnessMultiplier doubles the effective value for low scores, reduces for high.
    const fm = avgScore < 40 ? 2 : avgScore > 60 ? 0.6 : 1;
    const gap = Math.max(0, GOAL_SCORE - avgScore);
    const totalBaseWeight = baseTasks.reduce((s, t) => s + t.baseWeight, 0);
    const targetRawPoints = gap / fm; // fm * targetRawPoints = gap
    return baseTasks.map(t => ({
      ...t,
      points: Math.max(1, Math.round(t.baseWeight / totalBaseWeight * targetRawPoints)),
    }));
  }, [avgScore]);

  const completedPoints = useMemo(() => {
    return tasks
      .filter(t => completedTasks.includes(t.id))
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks, completedTasks]);

  const potentialPoints = useMemo(() => {
    return tasks
      .filter(t => !completedTasks.includes(t.id))
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks, completedTasks]);

  // Current score includes completed task points with weighting
  // Lower base scores get more benefit from tasks (fairness factor)
  // < 40%: tasks give more points; > 60%: tasks give fewer (but still meaningful)
  const fairnessMultiplier = avgScore < 40 ? 2 : avgScore > 60 ? 0.6 : 1;
  const weightedCompletedPoints = Math.round(completedPoints * fairnessMultiplier);
  const currentScore = Math.min(100, avgScore + weightedCompletedPoints);
  const projectedScore = Math.min(100, avgScore + weightedCompletedPoints + Math.round(potentialPoints * fairnessMultiplier));

  const toggleTask = useCallback((taskId) => {
    setCompletedTasks(prev => {
      const next = prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId];
      try {
        localStorage.setItem("resume_optimization_tasks", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { avgScore, currentScore, tasks, completedTasks, potentialPoints, projectedScore, toggleTask };
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

/**
 * SVG radar/spider chart visualising resume skill dimensions.
 * @param {object} props
 * @param {Array<{label: string, color: string, value: number}>} props.skills
 * @param {number} [props.size] - Outer SVG size in px.
 */
function RadarChart({ skills, size = 520 }) {
  const N = skills.length;
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.36;
  const angles = skills.map((_, i) => -Math.PI / 2 + (i / N) * 2 * Math.PI);

  const polyPts = (level) =>
    angles.map(a => `${cx + level * maxR * Math.cos(a)},${cy + level * maxR * Math.sin(a)}`).join(" ");

  const dataPts = skills.map((s, i) => {
    const r = (s.value / 100) * maxR;
    return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])];
  });

  return (
    /* P2: w-full h-auto macht den Radar-SVG responsiv — kein Overflow auf Mobile */
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible w-full h-auto max-w-full">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
        </radialGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings with scale labels */}
      {[0.25, 0.5, 0.75, 1].map(level => (
        <g key={level}>
          <polygon points={polyPts(level)} fill="none" stroke="#1e293b" strokeWidth={level === 1 ? 0.8 : 0.4} strokeOpacity={0.5} />
          {/* Scale indicator on the vertical axis (top spoke) */}
          <text
            x={cx + 5}
            y={cy - level * maxR + 4}
            fill="#334155"
            fontSize="8"
            fontWeight="500"
            textAnchor="start"
          >
            {Math.round(level * 100)}%
          </text>
        </g>
      ))}

      {/* Axis spokes – ultra thin */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#1e293b" strokeWidth="0.4" strokeOpacity={0.4} />
      ))}

      {/* Data fill – neon glassmorphism */}
      <polygon
        points={dataPts.map(p => p.join(",")).join(" ")}
        fill="url(#radarGrad)"
        stroke="url(#radarStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        filter="url(#neonGlow)"
        style={{ backdropFilter: "blur(12px)" }}
      />

      {/* Data dots – minimal glowing */}
      {dataPts.map((p, i) => (
        <g key={i} filter="url(#dotGlow)">
          <circle cx={p[0]} cy={p[1]} r="3" fill="#0f172a" stroke={skills[i].color} strokeWidth="1" />
          <circle cx={p[0]} cy={p[1]} r="1.5" fill={skills[i].color} opacity="0.9" />
        </g>
      ))}

      {/* Labels – pushed far outside */}
      {skills.map((s, i) => {
        const labelR = maxR + 32;
        const lx = cx + labelR * Math.cos(angles[i]);
        const ly = cy + labelR * Math.sin(angles[i]);
        const isRight = Math.cos(angles[i]) > 0.1;
        const isLeft = Math.cos(angles[i]) < -0.1;
        const textAnchor = isRight ? "start" : isLeft ? "end" : "middle";
        const offsetX = isRight ? 10 : isLeft ? -10 : 0;
        return (
          <g key={`label-${i}`}>
            <text
              x={lx + offsetX}
              y={ly - 6}
              fill={s.color}
              fontSize="10"
              fontWeight="700"
              textAnchor={textAnchor}
              dominantBaseline="middle"
              opacity="0.9"
            >
              {s.label}
            </text>
            <text
              x={lx + offsetX}
              y={ly + 8}
              fill="#94a3b8"
              fontSize="9"
              fontWeight="500"
              textAnchor={textAnchor}
              dominantBaseline="middle"
            >
              {s.value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Glassmorphism file card ───────────────────────────────────────────────────

/**
 * Glassmorphism card representing a single uploaded resume file.
 * @param {object} props
 * @param {object} props.resume
 * @param {boolean} props.selected
 * @param {() => void} props.onSelect
 * @param {() => void} props.onDelete
 * @param {number|null} props.matchScore
 * @param {boolean} props.deleteLoading
 */
function FileCard({ resume, selected, onSelect, onDelete, matchScore, deleteLoading }) {
  const size = formatSize(resume.file_size);
  const score = matchScore;
  const scoreColor = score == null ? "#94a3b8" : score >= 60 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <button
      onClick={() => onSelect(resume.id)}
      className={`w-full text-left rounded-xl p-3.5 transition-all duration-200 border group relative overflow-hidden focus:outline-none ${
        selected
          ? "bg-[#08090c] border-brand-500/30 shadow-[0_4px_24px_rgba(91,79,232,0.14)]"
          : "bg-[#08090c]/60 border-[#171a21] hover:bg-[#08090c] hover:border-brand-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      }`}
    >
      {/* Violet accent bar for selected */}
      {selected && <div className="absolute left-0 inset-y-0 w-0.5 bg-gradient-to-b from-brand-400 to-accent-600 rounded-l-full" />}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          selected ? "bg-brand-500/15" : "bg-white/5 group-hover:bg-brand-500/10"
        }`}>
          <FileText className={`w-4 h-4 ${selected ? "text-brand-300" : "text-slate-400"}`} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold truncate leading-snug ${selected ? "text-brand-200" : "text-slate-300"}`}>
            {resume.filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Clock className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
            {/* P0: text-[11px] statt text-[9px] */}
            <span className="text-[11px] text-slate-400">{formatDate(resume.updated_at || resume.created_at)}</span>
            {size && <span className="text-[11px] text-slate-300">· {size}</span>}
          </div>

          {/* Match Accuracy badge */}
          <div className="flex items-center gap-1.5 mt-2">
            {resume.parsed_status ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border"
                style={{ backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}40`, color: scoreColor }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: scoreColor }} />
                {score != null ? `Match ${score}%` : "Analysiert"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-[#1C2333] px-2 py-0.5 text-[11px] font-bold text-slate-400">
                Bereit
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
          disabled={deleteLoading}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
}

// ─── Compact upload zone ───────────────────────────────────────────────────────

/**
 * Drag-and-drop upload zone for PDF resume files.
 * @param {object} props
 * @param {Function} props.getRootProps
 * @param {Function} props.getInputProps
 * @param {boolean} props.isDragActive
 * @param {boolean} props.uploading
 */
function UploadZone({ getRootProps, getInputProps, isDragActive, uploading }) {
  return (
    <div {...getRootProps()} className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
      isDragActive
        ? "border-brand-400 bg-brand-500/10 scale-[1.02]"
        : "border-[#171a21] bg-[#08090c]/40 hover:border-brand-500/30 hover:bg-[#08090c]/60"
    } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] font-semibold text-brand-300">Analysiere…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDragActive ? "bg-brand-500/15" : "bg-brand-500/10"}`}>
            <Upload className={`w-4 h-4 ${isDragActive ? "text-brand-200" : "text-brand-300"}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">{isDragActive ? "Hier ablegen!" : "Lebenslauf hochladen"}</p>
            <p className="text-xs text-slate-400 mt-0.5">PDF oder TXT · Max. 5 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Checklist Component ─────────────────────────────────────────────────────

/**
 * Interactive gamification checklist of resume optimisation tasks.
 * @param {object} props
 * @param {ReturnType<typeof useGamification>} props.gamification
 */
function Checklist({ gamification }) {
  const { tasks, completedTasks, toggleTask } = gamification || {};

  if (!tasks?.length) return null;

  return (
    <div className="rounded-xl bg-[#08090c] border border-[#171a21] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-500/12 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-[11px] font-bold text-slate-300">Optimierungs-Tipps</span>
      </div>

      <div className="space-y-2">
        {tasks?.map((task) => {
          const isCompleted = completedTasks?.includes(task.id);
          const TaskIcon = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => toggleTask?.(task.id)}
              /* P1: min-h-[44px] für Fitts's Law Touch-Target */
              className={`w-full flex items-center gap-3 p-3 min-h-[44px] rounded-lg border transition-all duration-200 text-left ${
                isCompleted
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-800/30 border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800/50"
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                isCompleted ? "bg-emerald-500/20" : "bg-slate-700/50"
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <TaskIcon className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* P0: text-xs statt text-[10px] */}
              <p className={`text-xs font-medium leading-snug ${isCompleted ? "text-emerald-300 line-through" : "text-slate-300"}`}>
                  {task.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Growth recommendations (static) ─────────────────────────────────────────

const _GROWTH_RECS = {
  tech: "Erweitere dein Tech-Stack um Cloud-Zertifizierungen (AWS/Azure) für +15% Match-Rate.",
  exp: "Dokumentiere messbare Erfolge: '→ Umsatz +20%' statt 'Umsatz gesteigert'.",
  edu: "Ein relevantes Zertifikat (z.B. Scrum Master) kann deinen Score um 8-12% steigern.",
  soft: "Füge konkrete Beispiele für Teamführung und Konfliktlösung in deinen CV ein.",
  lang: "Business-English auf C2-Niveau ist der #1 gefragte Soft Skill in DACH.",
};

// ─── Document Intelligence (center) ──────────────────────────────────────────

/**
 * Centre column showing skill radar, progress ring, summary, and analysis CTA.
 * @param {object} props
 * @param {object|null} props.resume
 * @param {Array<{label: string, color: string, value: number}>|null} props.skills
 * @param {ReturnType<typeof useGamification>} props.gamification
 * @param {boolean} props.isAnalyzing
 * @param {string|null} props.groqSummary
 */
function DocumentIntelligence({ resume, skills, gamification, isAnalyzing, groqSummary }) {
  const { currentScore } = gamification || {};
  const goalReached = currentScore >= 85;
  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,79,232,0.08)" }}>
          <Brain className="w-8 h-8 text-brand-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Kein Dokument ausgewählt</h3>
          <p className="text-[11px] text-[#3a3a42] mt-1">Lade einen Lebenslauf hoch oder wähle ihn links aus</p>
        </div>
      </div>
    );
  }

  const scoreColor = goalReached ? "#10b981" : "#818cf8";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  return (
    <div className="grid grid-cols-12 gap-3">

      {/* ── 1. HERO: Large Neon Radar Chart — central visual element ── */}
      <div className="col-span-12 rounded-2xl py-4 sm:py-5 flex flex-col items-center"
        style={{
          background: "linear-gradient(180deg, #060608 0%, #020204 100%)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Document title above radar */}
        <div className="text-center mb-4">
          <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#3a3a42]">
            Dokumenten-Analyse
          </span>
          <h2 className="text-lg font-semibold text-white leading-tight mt-1 truncate max-w-md">
            {resume.filename?.replace(/\.[^.]+$/, "")}
          </h2>
          <p className="text-[11px] text-[#3a3a42] mt-0.5">
            Lebenslauf · {formatDate(resume.updated_at || resume.created_at)}
          </p>
        </div>

        {/* Radar nur auf Desktop — auf Mobile zu klein und labels overflow */}
        <div className="my-2 w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[280px] max-h-[300px] mx-auto overflow-visible relative">
          {isAnalyzing ? (
            <div className="flex items-center justify-center w-full aspect-square max-w-[280px] mx-auto">
              <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : (
            <>
              <RadarChart skills={skills} size={280} />
              <p className="text-center text-[9px] text-[#3a3a42] mt-1 tracking-wide">KI-Schätzung · Werte können abweichen</p>
            </>
          )}
        </div>

        {/* Score ring + goal below radar */}
        <div className="flex items-center gap-4 mt-4 border border-white/10 rounded-xl px-3 py-2 bg-white/5">
          <div className="flex-shrink-0 relative">
            <svg width="72" height="72" viewBox="0 0 120 120">
              <defs>
                <filter id="heroScoreGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#111114" strokeWidth="1.5" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={scoreColor} strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
                filter="url(#heroScoreGlow)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="grid place-items-center" style={{ position: "absolute", inset: 0 }}>
              <span className="text-[20px] font-semibold text-white leading-none tracking-tight">
                {currentScore}<span className="text-[11px] text-[#3a3a42]">%</span>
              </span>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Gesamt-Score
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {goalReached ? (
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              ) : (
                <Target className="w-3 h-3 text-[#505058]" />
              )}
              <span className={`text-[11px] font-medium ${goalReached ? "text-emerald-400" : "text-[#505058]"}`}>
                {goalReached ? "Ziel erreicht (85%)" : "Ziel: 85%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. AI Executive Summary ─────────────────── */}
      <div className="col-span-12 px-3 py-4 border border-white/10 rounded-xl bg-white/5">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#505058]">
            KI-Zusammenfassung
          </span>
        </div>
        {groqSummary ? (
          <p className="text-[13px] leading-relaxed text-slate-300">{groqSummary}</p>
        ) : (
          <p className="text-[12px] text-[#3a3a42] italic">
            Nicht verfügbar — lade einen Lebenslauf hoch, um eine KI-Analyse zu erhalten.
          </p>
        )}
      </div>


    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/** Resume management page: upload, select, AI skill analysis, radar chart, and gamification checklist. */
export default function ResumePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const { guardedRun } = useUsageGuard("cv_analysis");

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => queryClient.getQueryData(["init"]),
    staleTime: 1000 * 60 * 2,
  });

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => r.data),
    initialData: () => queryClient.getQueryData(["resumes"]) || initData?.resumes?.map(r => ({ id: r.id, filename: r.filename, created_at: r.created_at })),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
  });

  // Auto-select first resume
  useEffect(() => {
    if (!selectedId && resumes.length > 0) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);

  const deleteMutation = useMutation({
    mutationFn: resumeApi.delete,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData(["resumes"], (old = []) => old.filter(r => r.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      if (selectedId === deletedId) setSelectedId(null);
      toast.success("Dein Dokument wurde sicher entfernt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Lebenslauf konnte nicht gelöscht werden")),
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    guardedRun(async () => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        await resumeApi.upload(fd);
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
        toast.success("Dein Dokument wurde sicher hinterlegt und für die Analyse vorbereitet");
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Das Dokument konnte nicht hochgeladen werden"));
      } finally { setUploading(false); }
    });
  }, [guardedRun, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploading,
  });

  // Average match score from cached jobs
  const jobs = queryClient.getQueryData(["jobs"]) || [];
  const avgMatchScore = (() => {
    const scored = (jobs || []).filter(j => j.match_score != null);
    return scored.length ? Math.round(scored.reduce((s, j) => s + j.match_score, 0) / scored.length) : null;
  })();

  const selectedResume = resumes.find(r => r.id === selectedId) || null;

  const { data: analysisData, isFetching: isAnalyzing } = useQuery({
    queryKey: ["resume-analysis", selectedId],
    queryFn: () => resumeApi.analyze(selectedId).then(r => {
      try { localStorage.setItem(`resume_analysis_${selectedId}`, JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => {
      try { const s = localStorage.getItem(`resume_analysis_${selectedId}`); return s ? JSON.parse(s) : undefined; } catch { return undefined; }
    },
    enabled: !!selectedId,
    staleTime: Infinity,
    retry: 1,
  });

  const skills = mergeGroqScores(analysisData);
  const gamification = useGamification(skills);

  const handleImproveClick = useCallback(() => {
    navigate("/ai-assistant");
  }, [navigate]);

  return (
    <div className="animate-slide-up flex flex-col gap-4" style={{ minHeight: "calc(100svh - 140px)" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-2">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-white leading-none">
          Lebenslauf
        </h1>
        <p className="mt-2 text-[11px] tracking-[0.18em] uppercase text-[#3a3a42]">
          KI-gestützte Dokumentenanalyse
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        /* ── 2-column workspace ─────────────────────────────────────────────── */
        <div className="grid grid-cols-12 gap-3 sm:gap-4 flex-1">

          {/* ── LEFT: Slim Sidebar ─────────────────────────────────────── */}
          {/* P2: lg:col-span-3 statt 2 — Checklist-Text trunciert nicht mehr */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">

            {/* Elegant AI Cover Letter CTA */}
            <button
              onClick={handleImproveClick}
              className="group w-full rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(168,85,247,0.06) 100%)",
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 24px rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.12)",
              }}
            >
              <div className="flex flex-col items-center gap-2.5">
                <div className="grid place-items-center h-10 w-10 rounded-xl" style={{ background: "rgba(99,102,241,0.15)" }}>
                  <Edit3 className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[11px] font-medium text-[#c8c8d0] text-center leading-snug">
                  KI-Anschreiben erstellen
                </span>
              </div>
            </button>

            <UploadZone getRootProps={getRootProps} getInputProps={getInputProps} isDragActive={isDragActive} uploading={uploading} />

            {resumes.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[#171a21] bg-[#08090c]/40 p-4 text-center">
                <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-400">Noch keine Dokumente</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="block text-xs font-medium tracking-[0.14em] uppercase text-[#505058] px-1">
                  Dokumente ({resumes.length})
                </span>
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                  {resumes.map(resume => (
                    <FileCard
                      key={resume.id}
                      resume={resume}
                      selected={selectedId === resume.id}
                      onSelect={setSelectedId}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      matchScore={avgMatchScore}
                      deleteLoading={deleteMutation.isPending && deleteMutation.variables === resume.id}
                    />
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* ── CENTER: Document Intelligence ──────────────────────────────── */}
          <div className="col-span-12 lg:col-span-6 min-h-[360px] sm:min-h-[440px] lg:min-h-[500px]">
            <DocumentIntelligence
              resume={selectedResume}
              skills={skills}
              gamification={gamification}
              isAnalyzing={isAnalyzing}
              groqSummary={analysisData ? buildSkillSummary(skills) : null}
            />
          </div>

          {/* ── RIGHT: Optimierungs-Tipps Sidebar ──────────────────────────── */}
          <div className="col-span-12 lg:col-span-3">
            {selectedResume && <Checklist gamification={gamification} />}
          </div>
        </div>
      )}
    </div>
  );
}
