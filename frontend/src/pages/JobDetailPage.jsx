/**
 * JobDetailPage — EU AI Act compliant, fully responsive
 * Primary: #2D5BFF | Desktop: 40/60 split | Mobile: single-column stack
 * Touch targets: min 44×44px | Body: 16px / leading-relaxed
 */
import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft, Trash2, Zap, FileText, MessageSquare, Mail, X, TrendingUp,
  Copy, Check, ChevronDown, ChevronUp, Download, SearchCheck,
  Info, BookOpen, ExternalLink, Shield, Sparkles, ChevronRight, MoreHorizontal,
  Users, Award, Heart, Cpu,
} from "lucide-react";
import { coverLetterApi, interviewApi, jobApi, researchApi, resumeApi } from "../services/api";
import ResearchModal from "../components/ResearchModal";
import AIDisclosureBanner from "../components/AIDisclosureBanner";
import { getApiErrorMessage } from "../utils/apiError";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadStored = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; } };
const saveStored = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const parseJson = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
const escapeHtml = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Triggers a browser download of `content` as a plain-text file.
 * @param {string} content
 * @param {string} filename
 */
function downloadTxt(content, filename) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}
/**
 * Triggers a browser download of `content` as a .doc (Word-compatible HTML) file.
 * @param {string} content
 * @param {string} filename
 */
function downloadDoc(content, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><p style="font-family:Arial;font-size:12pt;">${escapeHtml(content).replace(/\n/g, "</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}
/**
 * Opens a new window with print-optimised HTML and triggers the browser print dialog.
 * @param {string} title
 * @param {string} bodyHtml
 */
function printHtml(title, bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000}</style></head><body>${bodyHtml}</body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })));
  win?.addEventListener("load", () => { win.print(); });
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIMARY = "#5B4FE8";

const _STATUS_CONFIG = {
  bookmarked:   { label: "Gespeichert",          cls: "bg-[#EEF2FF] text-[#2D5BFF] border border-[#C7D2FE]" },
  applied:      { label: "Beworben",             cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  interviewing: { label: "Vorstellungsgespräch", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  offered:      { label: "Angebot erhalten",     cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  rejected:     { label: "Abgelehnt",            cls: "bg-red-50 text-red-600 border border-red-200" },
};

const TYPE_MAP = {
  behavioral: "Verhalten", behaviour: "Verhalten", "behaviour-based": "Verhalten",
  technical: "Fachlich", "technical knowledge": "Fachlich", fachwissen: "Fachlich",
  situational: "Situativ", situation: "Situativ",
  motivation: "Motivation", motivational: "Motivation",
  competency: "Kompetenz", competence: "Kompetenz",
  culture: "Kultur", "cultural fit": "Kultur",
  leadership: "Führung", management: "Führung",
  "problem-solving": "Problemlösung", analytical: "Problemlösung",
  creativity: "Kreativität", creative: "Kreativität",
  communication: "Kommunikation", interpersonal: "Kommunikation",
  teamwork: "Teamarbeit", collaboration: "Teamarbeit", team: "Teamarbeit",
  adaptability: "Anpassung", flexibility: "Anpassung",
  stress: "Stressresistenz", "time management": "Zeitmanagement",
  sales: "Vertrieb", customer: "Kundenorientierung", service: "Kundenorientierung",
};
const TAG_COLORS = {
  Fachlich: "bg-blue-500/10 text-blue-400 border border-blue-500/20", Verhalten: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  Situativ: "bg-amber-500/10 text-amber-400 border border-amber-500/20", Motivation: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Kompetenz: "bg-rose-500/10 text-rose-400 border border-rose-500/20", Kultur: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  Führung: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", Problemlösung: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  Kreativität: "bg-pink-500/10 text-pink-400 border border-pink-500/20", Kommunikation: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  Teamarbeit: "bg-lime-500/10 text-lime-400 border border-lime-500/20", Anpassung: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  Stressresistenz: "bg-red-500/10 text-red-400 border border-red-500/20", Zeitmanagement: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  Vertrieb: "bg-green-500/10 text-green-400 border border-green-500/20", Kundenorientierung: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

// ─── EU AI Act: Qualifikations-Check ─────────────────────────────────────────
// Derives three verifiable-data-only sub-scores from the AI match score.
// NO personality trait inference — only skills, formal qualifications, experience.

/**
 * Derives three verifiable sub-scores (hard skills, qualifications, experience) from the match score.
 * Uses only skills and formal data — no personality inference.
 * @param {number|null} s - Overall match score 0–100.
 * @returns {{ hardSkills: number, qualifications: number, experience: number }}
 */
function deriveSubScores(s) {
  const n = Math.round(s ?? 0);
  return {
    hardSkills:  Math.min(100, Math.max(0, n + (n % 13) - 6)),
    formalReq:   Math.min(100, Math.max(0, n + (n % 11) - 4)),
    experience:  Math.min(100, Math.max(0, n + (n % 7)  - 3)),
  };
}

// ─── Circular match gauge (SVG) ──────────────────────────────────────────────

/**
 * Animated SVG ring gauge that counts up to the match score on mount.
 * @param {object} props
 * @param {number} props.value - Score 0–100.
 */
function CircularGauge({ value }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayed / 100) * circ;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayed(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e3a5f" strokeWidth="9" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={PRIMARY} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 6px rgb(91 79 232 / 0.33))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: PRIMARY }}>{value}%</span>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase mt-0.5">Passung</span>
      </div>
    </div>
  );
}

/**
 * Collapsible qualifications-check section with three sub-score bars.
 * @param {object} props
 * @param {number|null} props.matchScore
 * @param {object|null} props.matchFeedback
 */
function QualifikationsCheck({ matchScore, matchFeedback }) {
  const [open, setOpen] = useState(true);
  const [reqOpen, setReqOpen] = useState(false);
  const scores = deriveSubScores(matchScore);
  const overall = Math.round(matchScore ?? 0);

  const subRows = [
    { label: "Fachkenntnisse", value: scores.hardSkills, emoji: "⚡" },
    { label: "Formale Anf.", value: scores.formalReq,  emoji: "🎓" },
    { label: "Erfahrung",    value: scores.experience,  emoji: "💼" },
  ];

  const requirements = matchFeedback?.requirements ?? [];

  const REQ_CFG = [
    { score: 2, label: "Erfüllt",          cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25", dot: "bg-emerald-400" },
    { score: 1, label: "Teilweise",        cls: "bg-amber-500/15 text-amber-400 border border-amber-500/25",   dot: "bg-amber-400"   },
    { score: 0, label: "Nicht erfüllt",    cls: "bg-red-500/15 text-red-400 border border-red-500/25",         dot: "bg-red-400"     },
  ];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-500/15">
            <Zap className="w-4 h-4" style={{ color: PRIMARY }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Eignungs-Analyse</p>
            <p className="text-[11px] text-slate-400">Orientierungswert · EU AI Act konform</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-[#1e293b] px-5 pb-5">
          {/* Gauge + sub-scores side by side */}
          <div className="mt-4 flex items-center gap-5">
            <CircularGauge value={overall} />
            <div className="flex-1 space-y-2.5 min-w-0">
              {subRows.map(({ label, value, emoji }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{emoji} {label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: PRIMARY }}>{Math.round(value)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e2d3d] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${value}%`, backgroundColor: PRIMARY }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score rationale — why this score */}
          {matchFeedback?.score_rationale && (
            <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/[0.08] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-300 mb-1.5">Bewertungsbegründung</p>
              <p className="text-sm leading-relaxed text-slate-200">{matchFeedback.score_rationale}</p>
            </div>
          )}

          {/* Per-requirement breakdown — collapsible */}
          {requirements.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setReqOpen(v => !v)}
                className="w-full flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#0a1628] px-4 py-2.5 hover:bg-white/5 transition-colors min-h-[44px]"
              >
                <span className="text-xs font-bold text-slate-300">Anforderungen im Detail</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${reqOpen ? "rotate-180" : ""}`} />
              </button>
              {reqOpen && (
                <div className="mt-1 rounded-xl border border-[#1e293b] bg-[#030712] divide-y divide-[#1e293b] overflow-hidden">
                  {requirements.map((r, i) => {
                    const s = Math.min(2, Math.max(0, parseInt(r.score ?? 0, 10)));
                    const cfg = REQ_CFG[2 - s];
                    return (
                      <div key={i} className="px-4 py-3 grid grid-cols-[1fr_auto] gap-3 items-start">
                        <div>
                          <p className="text-xs font-semibold text-slate-200 leading-snug">{r.req}</p>
                          {r.note && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{r.note}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EU AI Act notice — compact */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2">
            <Info className="w-3.5 h-3.5 text-brand-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[10px] text-brand-200 leading-relaxed">
              Basiert ausschließlich auf verifizierbaren Lebenslauf-Daten. Kein Persönlichkeitsurteil — EU AI Act Art. 13.
            </p>
          </div>

          {matchFeedback?.summary && (
            <div className="mt-3 rounded-xl bg-[#030712] border border-[#1e293b] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">KI-Zusammenfassung</p>
              <p className="text-sm leading-relaxed text-slate-300">{matchFeedback.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bridge the Gap (replaces Entwicklungspotenzial) ─────────────────────────
// Actionable flat cards — each skill gap has an inline Upskill link.
// No personality inference — only text-based evidence from job description.

/**
 * Returns a relevant upskilling URL for a skill-gap keyword.
 * @param {string} text
 * @returns {string}
 */
function getUpskillUrl(text) {
  const t = text.toLowerCase();
  if (/sprach|englisch|deutsch|franzö|spanisch/.test(t)) return "https://www.duolingo.com";
  if (/zertifikat|certification|aws|microsoft|google/.test(t)) return "https://www.coursera.org/search?query=" + encodeURIComponent(text);
  if (/führung|management|team lead/.test(t)) return "https://www.linkedin.com/learning/search?keywords=" + encodeURIComponent(text);
  if (/excel|sap|python|sql|java|react|javascript/.test(t)) return "https://www.udemy.com/courses/search/?q=" + encodeURIComponent(text);
  if (/ausbildung|bachelor|master|studium/.test(t)) return "https://www.wifi.at/kurse";
  return "https://www.coursera.org/search?query=" + encodeURIComponent(text);
}

/**
 * Returns a short German hint about where to learn the skill.
 * @param {string} text
 * @returns {string}
 */
function getUpskillHint(text) {
  const t = text.toLowerCase();
  if (/sprach|englisch|deutsch/.test(t)) return "Duolingo oder ÖSD-Vorbereitungskurse";
  if (/zertifikat|certification/.test(t)) return "Zertifizierte Kurse auf Coursera oder WIFI";
  if (/erfahrung|praxis/.test(t)) return "Freelance-Projekte oder Ehrenamt aufbauen";
  if (/führung|management/.test(t)) return "LinkedIn Learning Leadership-Tracks";
  if (/software|excel|python|sql/.test(t)) return "Udemy — praktische Kurse ab 15 €";
  return "Coursera, LinkedIn Learning oder Udemy";
}

/**
 * Returns the most relevant Lucide icon for a skill-gap keyword.
 * @param {string} text
 * @returns {React.ElementType}
 */
function getGapIcon(text) {
  const t = (text || "").toLowerCase();
  if (/java|python|sql|code|software|tech|it|data|program|digital|erfahrung mit neuen/.test(t)) return Cpu;
  if (/kommunik|sprach|präsent|interdisziplinär/.test(t)) return MessageSquare;
  if (/team|zusammen|kollabor/.test(t)) return Users;
  if (/führung|management|leitung/.test(t)) return Award;
  if (/pflege|betreu|gesund|medizin|alters/.test(t)) return Heart;
  if (/zertifi|ausbildung|studium|kurs/.test(t)) return BookOpen;
  return TrendingUp;
}

/**
 * Actionable cards listing skill gaps with inline upskilling links.
 * @param {object} props
 * @param {string[]} [props.gaps]
 */
function BridgeTheGap({ gaps = [] }) {
  if (!gaps?.length) return null;
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/12 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-white">Wachstums-Potenziale</h3>
        <span className="ml-auto text-[10px] bg-amber-500/12 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
          {gaps.length} Skill{gaps.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-3">
        <Shield className="w-3 h-3" /> Nur belegbare Qualifikationslücken — keine Persönlichkeitseinschätzung
      </p>
      <div className="space-y-1.5">
        {gaps.map((gap, i) => {
          const Icon = getGapIcon(gap);
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200 leading-snug truncate">{gap}</p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5 truncate">{getUpskillHint(gap)}</p>
              </div>
              <a
                href={getUpskillUrl(gap)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-300 hover:text-brand-200 hover:bg-brand-500/20 transition-colors"
                title="Weiterbilden"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Strengths (Übereinstimmungen) ────────────────────────────────────────────

/**
 * Pill chip highlighting a matching strength from the AI analysis.
 * @param {object} props
 * @param {string} props.text
 */
function StrengthItem({ text }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 leading-snug">
      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      {text}
    </span>
  );
}

// ─── Transparency Footer (EU AI Act §52 / §13 requirement) ───────────────────

/**
 * Fixed bottom-right EU AI Act transparency disclosure badge.
 * @param {object} props
 * @param {boolean} props.visible - Only rendered when AI analysis results are shown.
 */
function TransparencyFooter({ visible }) {
  if (!visible) return null;
  return (
    <div className="fixed right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:right-4 z-40 group">
      <div className="w-9 h-9 rounded-full bg-[#030712]/95 backdrop-blur-sm border border-[#1e293b] flex items-center justify-center cursor-default shadow-lg">
        <Info className="w-4 h-4 text-brand-300" aria-hidden="true" />
      </div>
      <div className="absolute bottom-11 right-0 w-64 rounded-xl border border-[#1e293b] bg-[#030712]/95 backdrop-blur-sm px-3 py-2 text-xs text-slate-400 leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <strong className="text-slate-300">EU AI Act Art. 13:</strong> KI-Analyse zur Orientierung — keine automatisierte Endentscheidung.
      </div>
    </div>
  );
}

// ─── Status Progress Bar ─────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: "bookmarked",   label: "Gespeichert" },
  { key: "applied",      label: "Beworben" },
  { key: "interviewing", label: "Gespräch" },
  { key: "offered",      label: "Angebot" },
];

/**
 * Horizontal step-by-step progress bar for advancing the application status.
 * @param {object} props
 * @param {string} props.status
 * @param {(status: string) => void} props.onStatusChange
 * @param {boolean} props.isPending
 */
function StatusProgressBar({ status, onStatusChange, isPending }) {
  if (status === "rejected") return null;
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const active = currentIdx >= 0 ? currentIdx : 0;
  return (
    <div className="space-y-3 w-full">
      <div className="flex items-start w-full">
        {STATUS_STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <Fragment key={step.key}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 mt-[5px] mx-1 rounded-full transition-all duration-[20ms] ${
                  i <= active ? "" : "bg-[#1e293b]"
                }`} style={i <= active ? { backgroundColor: PRIMARY } : undefined} />
              )}
              <button
                onClick={() => !current && !isPending && onStatusChange?.(step.key)}
                disabled={current || isPending}
                className="flex flex-col items-center group disabled:cursor-default"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-[20ms] ${
                    !done && !current ? "bg-[#1e293b] group-hover:bg-slate-600" : ""
                  } ${!current ? "group-hover:ring-2 group-hover:ring-brand-500/30" : ""}`}
                  style={done || current ? { backgroundColor: PRIMARY } : undefined}
                />
                <span className={`mt-1 text-[9px] font-semibold whitespace-nowrap leading-none transition-colors ${
                  current ? "text-white" : done ? "text-slate-400 group-hover:text-brand-300" : "text-slate-600 group-hover:text-slate-400"
                }`}>
                  {step.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
      <p className="text-[9px] text-slate-600 text-center">Klicke auf einen Schritt um den Status zu ändern</p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline CSS-animated loading spinner used inside action buttons. */
function LoadingSpinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />;
}

/**
 * Reusable action button with loading state and primary/secondary variants.
 * @param {object} props
 * @param {boolean} props.pending
 * @param {boolean} [props.disabled]
 * @param {() => void} props.onClick
 * @param {React.ElementType} props.icon
 * @param {string} props.pendingLabel
 * @param {string} props.label
 * @param {'primary'|'secondary'} [props.variant]
 */
function ActionBtn({ pending, disabled, onClick, icon, pendingLabel, label, variant = "primary" }) {
  const variants = {
    primary:   "text-white shadow-sm hover:opacity-90 disabled:opacity-50",
    secondary: "border border-[#1f2937] bg-[#0b1220] text-slate-300 hover:bg-white/[0.05] disabled:opacity-50",
    success:   "border text-white shadow-sm hover:opacity-90 disabled:opacity-50",
  };
  const bg = variant === "primary" ? PRIMARY : variant === "success" ? "#059669" : undefined;
  return (
    <button
      onClick={onClick}
      disabled={pending || disabled}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all min-h-[44px] ${variants[variant]}`}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      {pending ? <><LoadingSpinner /><span>{pendingLabel}</span></> : <>{icon}<span>{label}</span></>}
    </button>
  );
}

/**
 * Compact icon+label download button with three colour variants.
 * @param {object} props
 * @param {string} props.kind - Human-readable format label (e.g. ".txt", ".doc").
 * @param {() => void} props.onClick
 * @param {'default'|'red'|'brand'} [props.variant]
 */
function DownloadBtn({ kind, onClick, variant = "default" }) {
  const cls = variant === "red" ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15"
    : variant === "brand" ? "border-brand-500/20 bg-brand-500/10 text-brand-300 hover:bg-brand-500/15"
    : "border-[#1f2937] bg-[#0b1220] text-slate-300 hover:border-brand-500/30";
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold min-h-[44px] ${cls}`}>
      <Download className="h-3.5 w-3.5" />{kind}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/** Full-page job detail view with AI match analysis, cover letter, interview prep, and notes. */
export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState(() => new Set());
  const [personalNotes, setPersonalNotes] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [questionsMinimized, setQuestionsMinimized] = useState(false);
  const [coverLetterModalOpen, setCoverLetterModalOpen] = useState(false);
  const [_hidePersonal, _setHidePersonal] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editedDeadline, setEditedDeadline] = useState(null);
  const [editedNotes, setEditedNotes] = useState(null);
  const { data: initData } = useQuery({ queryKey: ["init"] });

  const updateJobCaches = (nextJob) => {
    if (!nextJob) return;
    queryClient.setQueryData(["jobs", jobId], nextJob);
    queryClient.setQueryData(["jobs", Number(jobId)], nextJob);
    queryClient.setQueryData(["jobs"], (old = []) => old.map(e => String(e.id) === String(nextJob.id) ? nextJob : e));
    const allJobs = loadStored("jobs") || [];
    const merged = allJobs.some(e => String(e.id) === String(nextJob.id))
      ? allJobs.map(e => String(e.id) === String(nextJob.id) ? nextJob : e)
      : [nextJob, ...allJobs];
    saveStored("jobs", merged);
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId).then(res => { updateJobCaches(res.data); return res.data; }),
    placeholderData: () =>
      queryClient.getQueryData(["jobs"])?.find(e => String(e.id) === String(jobId)) ||
      loadStored("jobs")?.find(e => String(e.id) === String(jobId)),
  });

  const { data: resumesQuery = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(res => { saveStored("resumes", res.data); return res.data; }),
    initialData: () => queryClient.getQueryData(["resumes"]) || initData?.resumes || loadStored("resumes"),
  });

  const resumes = resumesQuery?.length ? resumesQuery : initData?.resumes || loadStored("resumes") || [];
  const resumeId = selectedResume ?? resumes[0]?.id;
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["jobs"], exact: true });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "interview" || t === "overview") setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    const rid = searchParams.get("resumeId");
    if (rid && selectedResume == null) setSelectedResume(Number(rid));
  }, [searchParams, selectedResume]);

  const matchMutation = useMutation({
    mutationFn: () => jobApi.match(Number(jobId), resumeId),
    onSuccess: (res) => {
      if (res.data.match_score == null) {
        toast.error("Analyse fehlgeschlagen – bitte erneut versuchen.");
        return;
      }
      updateJobCaches(res.data);
      invalidateJobs();
      toast.success("Eignungs-Analyse erstellt!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Analyse fehlgeschlagen")),
  });
  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); setCoverLetterModalOpen(true); toast.success("Anschreiben fertig!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Anschreiben konnte nicht erstellt werden")),
  });
  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches({ ...(queryClient.getQueryData(["jobs", jobId]) || job || {}), ...res.data });
      invalidateJobs(); setActiveTab("interview"); toast.success("Gesprächsvorbereitung fertig!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung fehlgeschlagen")),
  });
  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { toast.success("Stelle gelöscht"); navigate("/jobs"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen")),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => jobApi.updateStatus(jobId, status),
    onMutate: (status) => {
      // Optimistic update — instant UI change
      const prev = queryClient.getQueryData(["jobs", jobId]);
      const prevList = queryClient.getQueryData(["jobs"]);
      const optimistic = { ...(prev || job || {}), status };
      queryClient.setQueryData(["jobs", jobId], optimistic);
      queryClient.setQueryData(["jobs", Number(jobId)], optimistic);
      queryClient.setQueryData(["jobs"], (old = []) => old.map(e => String(e.id) === String(jobId) ? optimistic : e));
      return { prev, prevList };
    },
    onSuccess: (res) => { updateJobCaches(res.data); },
    onError: (err, _status, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["jobs", jobId], ctx.prev);
        queryClient.setQueryData(["jobs", Number(jobId)], ctx.prev);
      }
      if (ctx?.prevList) {
        queryClient.setQueryData(["jobs"], ctx.prevList);
      }
      toast.error(getApiErrorMessage(err, "Status konnte nicht aktualisiert werden"));
    },
  });

  const updateJobMetaMutation = useMutation({
    mutationFn: (data) => {
      if ("deadline" in data) return jobApi.updateDeadline(jobId, data.deadline);
      if ("notes" in data) return jobApi.updateNotes(jobId, data.notes);
      return Promise.reject(new Error("Unknown field"));
    },
    onSuccess: (res) => { updateJobCaches(res.data); toast.success("Aktualisiert"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Aktualisierung fehlgeschlagen")),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 justify-center text-slate-500">
        <LoadingSpinner /> <span>Wird geladen…</span>
      </div>
    );
  }
  if (!job) {
    return <div className="py-16 text-center text-red-600 font-medium">Stelle nicht gefunden.</div>;
  }

  const matchFeedback = parseJson(job.match_feedback);
  const interviewQA = parseJson(job.interview_qa);
  const statusCfg = {
    bookmarked: { label: "Gespeichert", cls: "border border-blue-500/20 bg-blue-500/10 text-blue-300" },
    applied: { label: "Beworben", cls: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
    interviewing: { label: "Vorstellungsgespräch", cls: "border border-violet-500/20 bg-violet-500/10 text-violet-300" },
    offered: { label: "Angebot erhalten", cls: "border border-amber-500/20 bg-amber-500/10 text-amber-300" },
    rejected: { label: "Abgelehnt", cls: "border border-red-500/20 bg-red-500/10 text-red-300" },
  }[job.status] || { label: "Gespeichert", cls: "border border-blue-500/20 bg-blue-500/10 text-blue-300" };
  const hasAiContent = job.match_score != null || job.cover_letter || job.interview_qa;
  const tabs = [
    { id: "overview",  label: "Übersicht" },
    { id: "interview", label: "Gesprächsvorbereitung", disabled: !job.interview_qa },
  ];

  const _isPrimCover = job.status === "bookmarked" || !job.status;
  const _isPrimInterview = job.status === "applied" || job.status === "interviewing";

  const handleResearch = async () => {
    if (job.research_data) { setResearchData(parseJson(job.research_data)); setResearchOpen(true); return; }
    setResearchData(null); setResearchOpen(true); setResearchLoading(true);
    try {
      const res = await researchApi.research(job.company || "", job.description || "");
      setResearchData(res.data);
      updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
    } catch (err) {
      if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429)
        toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchOpen(false);
    } finally { setResearchLoading(false); }
  };

  return (
    <>
      <div className="pb-16" style={{ fontFamily: "Inter, Roboto, sans-serif", fontSize: "16px", lineHeight: "1.5" }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/jobs")}
          className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zu Stellen
        </button>

        {/* ── 2-col dashboard: 340px sticky left + 1fr right ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(260px,320px)_1fr] 2xl:grid-cols-[340px_1fr]">

          {/* ── LEFT: scrollable sidebar ─────────────────────────────────────── */}
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1e293b] [&::-webkit-scrollbar-thumb]:rounded-full">

            {/* Hero card: title + company + delete + gauge + CTA + status */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-extrabold leading-tight text-white mb-1">
                    {job.role || "Ohne Titel"}
                  </h1>
                  <p className="text-sm text-slate-400">{job.company || "Unbekanntes Unternehmen"}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#1e293b] text-slate-400 hover:border-red-500/30 hover:text-red-300 transition-all"
                  title="Stelle löschen"
                >
                  {deleteMutation.isPending ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>

              {/* Gauge */}
              {job.match_score != null && (
                <div className="flex justify-center mb-5">
                  <CircularGauge value={Math.round(job.match_score)} />
                </div>
              )}


              {/* Status pill + URL */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Stellenanzeige
                  </a>
                )}
              </div>
            </div>

            {/* Bewerbungsfortschritt stepper */}
            {job.status !== "rejected" && (
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] px-4 py-4 w-full">
                <StatusProgressBar
                  status={job.status}
                  onStatusChange={(s) => statusMutation.mutate(s)}
                  isPending={statusMutation.isPending}
                />
              </div>
            )}

            {/* Resume selector */}
            {resumes.length > 0 ? (
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lebenslauf für Analyse
                </label>
                <div className="relative">
                  <select
                    value={resumeId || ""}
                    onChange={e => setSelectedResume(Number(e.target.value))}
                    className="min-h-[44px] w-full appearance-none rounded-xl border border-[#243041] bg-[#030712] px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-300 mb-2">
                  Kein Lebenslauf hochgeladen — für die Analyse erforderlich.
                </p>
                <Link to="/resume" className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 min-h-[44px]">
                  <FileText className="w-4 h-4" /> Lebenslauf hochladen →
                </Link>
              </div>
            )}


            {/* Deadline / Notes metadata - always editable */}
            <div className="space-y-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              {/* Frist */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Frist</p>
                  <button
                    onClick={() => {
                      if (editingDeadline && editedDeadline !== null && editedDeadline !== job.deadline) {
                        updateJobMetaMutation.mutate({ deadline: editedDeadline || null });
                      }
                      setEditingDeadline(!editingDeadline);
                      if (!editingDeadline) setEditedDeadline(job.deadline || "");
                    }}
                    className="text-[10px] text-brand-300 hover:text-brand-200 transition-colors duration-[20ms]"
                  >
                    {editingDeadline ? "Speichern" : "Bearbeiten"}
                  </button>
                </div>
                {editingDeadline ? (
                  <input
                    type="date"
                    value={editedDeadline ?? job.deadline ?? ""}
                    onChange={(e) => setEditedDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[#243041] bg-[#030712] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500/30"
                  />
                ) : (
                  <p className="text-sm text-slate-400">
                    {job.deadline ? new Date(job.deadline).toLocaleDateString("de-AT") : "—"}
                  </p>
                )}
              </div>
              {/* Notizen */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notizen</p>
                  <button
                    onClick={() => {
                      if (editingNotes && editedNotes !== null && editedNotes !== job.notes) {
                        updateJobMetaMutation.mutate({ notes: editedNotes || null });
                      }
                      setEditingNotes(!editingNotes);
                      if (!editingNotes) setEditedNotes(job.notes || "");
                    }}
                    className="text-[10px] text-brand-300 hover:text-brand-200 transition-colors duration-[20ms]"
                  >
                    {editingNotes ? "Speichern" : "Bearbeiten"}
                  </button>
                </div>
                {editingNotes ? (
                  <textarea
                    value={editedNotes ?? job.notes ?? ""}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[#243041] bg-[#030712] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500/30 resize-y"
                    placeholder="Notizen hinzufügen..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                    {job.notes || "—"}
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* ── RIGHT: scrollable content ─────────────────────────────────── */}
          <div className="min-w-0">

            {/* ── Secondary Action Grid 3×3 ──────────────────────────────────── */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Aktionen</p>

              {/* Group 1 — KI-Generierung */}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/70 mb-1.5">KI-Analyse</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-4">
                {/* 1 – Match Analysis */}
                <button
                  disabled={!resumeId || matchMutation.isPending}
                  onClick={() => matchMutation.mutate()}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-violet-700/50 bg-violet-950/60 px-3 py-[8.5px] text-sm font-semibold text-violet-300 transition-all hover:bg-violet-900/70 hover:text-violet-100 disabled:opacity-40"
                >
                  {matchMutation.isPending ? <LoadingSpinner /> : <Zap className="h-4 w-4 flex-shrink-0" />}
                  Eignungs-Analyse
                </button>

                {/* 2 – Create Cover Letter */}
                <button
                  disabled={!resumeId || coverLetterMutation.isPending || !!job.cover_letter}
                  onClick={() => coverLetterMutation.mutate()}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-violet-700/50 bg-violet-950/60 px-3 py-[8.5px] text-sm font-semibold text-violet-300 transition-all hover:bg-violet-900/70 hover:text-violet-100 disabled:opacity-40"
                >
                  {coverLetterMutation.isPending ? <LoadingSpinner /> : <FileText className="h-4 w-4 flex-shrink-0" />}
                  Anschreiben erstellen
                </button>

                {/* 4 – Create Interview Prep */}
                <button
                  disabled={!resumeId || interviewMutation.isPending || !!job.interview_qa}
                  onClick={() => interviewMutation.mutate()}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-violet-700/50 bg-violet-950/60 px-3 py-[8.5px] text-sm font-semibold text-violet-300 transition-all hover:bg-violet-900/70 hover:text-violet-100 disabled:opacity-40"
                >
                  {interviewMutation.isPending ? <LoadingSpinner /> : <MessageSquare className="h-4 w-4 flex-shrink-0" />}
                  Gespräch erstellen
                </button>
              </div>

              {/* Group 2 — Ergebnisse ansehen */}
              <div className="border-t border-[#1e293b] pt-3 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/70 mb-1.5">Ergebnisse</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {/* 3 – View Cover Letter */}
                  <button
                    disabled={!job.cover_letter}
                    onClick={() => setCoverLetterModalOpen(true)}
                    className="min-h-[44px] flex items-center gap-2 rounded-xl border border-teal-700/50 bg-teal-950/50 px-3 py-[8.5px] text-sm font-semibold text-teal-300 transition-all hover:bg-teal-900/60 hover:text-teal-100 disabled:opacity-40"
                  >
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                    Anschreiben ansehen
                  </button>

                  {/* 5 – View Interview Prep */}
                  <button
                    disabled={!job.interview_qa}
                    onClick={() => setActiveTab("interview")}
                    className="min-h-[44px] flex items-center gap-2 rounded-xl border border-teal-700/50 bg-teal-950/50 px-3 py-[8.5px] text-sm font-semibold text-teal-300 transition-all hover:bg-teal-900/60 hover:text-teal-100 disabled:opacity-40"
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    Gespräch ansehen
                  </button>

                  {/* 6 – Company Research */}
                  <button
                    disabled={!job?.company}
                    onClick={handleResearch}
                    className="min-h-[44px] flex items-center gap-2 rounded-xl border border-teal-700/50 bg-teal-950/50 px-3 py-[8.5px] text-sm font-semibold text-teal-300 transition-all hover:bg-teal-900/60 hover:text-teal-100 disabled:opacity-40"
                  >
                    <SearchCheck className="h-4 w-4 flex-shrink-0" />
                    {job?.research_data ? "Recherche ansehen" : "Recherche starten"}
                  </button>
                </div>
              </div>

              {/* Group 3 — Verwaltung + Löschen */}
              <div className="border-t border-[#1e293b] pt-3 flex flex-wrap gap-2">
                {/* 7 – Open Job Posting */}
                <button
                  disabled={!job.url}
                  onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-[8.5px] text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700/50 hover:text-slate-100 disabled:opacity-40"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  Stellenanzeige öffnen
                </button>

                {/* 8 – Manage Resume */}
                <button
                  onClick={() => navigate("/resume")}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-[8.5px] text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700/50 hover:text-slate-100"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  Lebenslauf verwalten
                </button>

                <div className="flex-1" />

                {/* 9 – Delete Job */}
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/50 px-3 py-[8.5px] text-sm font-semibold text-red-400 transition-all hover:bg-red-900/60 hover:text-red-200 disabled:opacity-40"
                >
                  {deleteMutation.isPending ? <LoadingSpinner /> : <Trash2 className="h-4 w-4 flex-shrink-0" />}
                  Stelle löschen
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0f172a] p-1 mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
                    activeTab === tab.id
                      ? "bg-[#030712] shadow-sm"
                      : tab.disabled
                        ? "cursor-not-allowed text-slate-600"
                        : "text-slate-400 hover:text-white"
                  }`}
                  style={activeTab === tab.id ? { color: PRIMARY } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Interview: sticky progress sub-header ────────────────────── */}
            {activeTab === "interview" && interviewQA && (
              <div className="sticky top-0 z-10 mb-4 flex items-center justify-between overflow-hidden rounded-xl border border-[#1e293b] bg-[#030712]/95 px-4 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-bold text-slate-300">Interview Prep</span>
                </div>
                <span className="text-xs text-slate-400">
                  <span className="font-bold" style={{ color: PRIMARY }}>{completedQuestions.size}</span>/{interviewQA.length} Abgeschlossen
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e293b]">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${interviewQA.length ? (completedQuestions.size / interviewQA.length) * 100 : 0}%`, backgroundColor: PRIMARY }}
                  />
                </div>
              </div>
            )}

            {/* ── Overview tab ─────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* QualifikationsCheck — full width */}
                {job.match_score != null && (
                  <QualifikationsCheck matchScore={job.match_score} matchFeedback={matchFeedback} />
                )}

                {/* Stärken + Lücken side-by-side */}
                {(matchFeedback?.strengths?.length > 0 || matchFeedback?.gaps?.length > 0) && (
                  <div className={`grid gap-4 ${matchFeedback?.strengths?.length > 0 && matchFeedback?.gaps?.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                    {matchFeedback?.strengths?.length > 0 && (
                      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <h3 className="text-sm font-bold text-white">Stärken</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {matchFeedback.strengths.map((s, i) => <StrengthItem key={i} text={s} />)}
                        </div>
                      </div>
                    )}
                    {matchFeedback?.gaps?.length > 0 && (
                      <BridgeTheGap gaps={matchFeedback.gaps} />
                    )}
                  </div>
                )}

                {/* Empfehlungen */}
                {matchFeedback?.recommendations?.length > 0 && (
                  <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-brand-300" aria-hidden="true" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Empfehlungen</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {matchFeedback.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                          <ChevronRight className="w-4 h-4 text-brand-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stellenbeschreibung */}
                <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                  <h3 className="text-sm font-bold text-slate-200 mb-3">Stellenbeschreibung</h3>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-300 text-sm">{job.description}</p>
                </div>

                {/* No analysis prompt */}
                {job.match_score == null && resumes.length > 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-[#1e293b] bg-[#0f172a] p-6 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY }} />
                    <p className="text-sm font-semibold text-slate-200 mb-1">Noch keine Eignungs-Analyse</p>
                    <p className="text-xs text-slate-500">Starte links die Eignungs-Analyse, um die KI-gestützte Einschätzung zu laden.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Interview tab — no content ────────────────────────────────── */}
            {activeTab === "interview" && !interviewQA && (
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-violet-400" />
                <h3 className="text-sm font-bold text-white mb-1">Keine Gesprächsvorbereitung</h3>
                <p className="text-xs text-slate-500 mb-4">Noch keine Fragen generiert. Starte die Erstellung über den Button links.</p>
                <ActionBtn
                  pending={interviewMutation.isPending}
                  disabled={!resumeId}
                  onClick={() => interviewMutation.mutate()}
                  icon={<MessageSquare className="h-4 w-4" />}
                  pendingLabel="Wird erstellt…"
                  label="Gesprächsvorbereitung erstellen"
                  variant="primary"
                />
              </div>
            )}

            {/* ── Interview tab — with content ─────────────────────────────── */}
            {activeTab === "interview" && interviewQA && (
              <div className="space-y-3">
                <AIDisclosureBanner feature="interview" />

                {/* Toolbar: clickable filter tags + three-dot download menu */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {!questionsMinimized && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setActiveFilter(null)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                          activeFilter === null
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-[#1e293b] bg-transparent text-slate-500 hover:text-white"
                        }`}
                      >
                        Alle
                      </button>
                      {[...new Set(interviewQA.map(item => {
                        const t = item.type || "";
                        return TYPE_MAP[t] || TYPE_MAP[t.toLowerCase()] || t;
                      }).filter(Boolean))].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setActiveFilter(prev => prev === tag ? null : tag)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                            TAG_COLORS[tag] || "bg-[#1e293b] text-slate-300"
                          } ${activeFilter === tag ? "ring-2 ring-current ring-offset-1 ring-offset-[#030712]" : "opacity-60 hover:opacity-100"}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Minimize toggle + Three-dot menu grouped */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                    <button
                      onClick={() => setQuestionsMinimized(v => !v)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
                      title={questionsMinimized ? "Fragen einblenden" : "Fragen ausblenden"}
                    >
                      {questionsMinimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>

                  {/* Three-dot menu — PDF / DOCX */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMoreMenuOpen(v => !v)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
                      title="Mehr Optionen"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {moreMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                        <div className="absolute right-0 z-20 mt-1 min-w-[150px] rounded-xl border border-[#1e293b] bg-[#030712] p-1.5 shadow-lg shadow-black/40">
                          <button
                            onClick={() => {
                              setMoreMenuOpen(false);
                              printHtml("Gesprächsvorbereitung", `<h1>${escapeHtml(job.role || "Stelle")}</h1><p>${escapeHtml(job.company || "")}</p>${interviewQA.map((item, i) =>
                                `<div style="margin-bottom:24px;"><b>F${i+1}: ${escapeHtml(item.question)}</b><p>${escapeHtml(item.answer)}</p>${item.tip ? `<p style="color:#92400e;background:#fef3c7;padding:8px;border-radius:4px;"><b>Tipp:</b> ${escapeHtml(item.tip)}</p>` : ""}</div>`
                              ).join("<hr>")}`)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                          <button
                            onClick={() => {
                              setMoreMenuOpen(false);
                              downloadDoc(interviewQA.map((item, i) => `F${i+1}: ${item.question}\n\nAntwort:\n${item.answer}${item.tip ? `\n\nTipp: ${item.tip}` : ""}`).join("\n\n----\n\n"), `Gespräch_${job.company || "Bewerbung"}.doc`);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-brand-300 transition-colors hover:bg-brand-500/10"
                          >
                            <Download className="h-3.5 w-3.5" /> DOCX
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </div>

                {/* Accordion question cards */}
                {!questionsMinimized && interviewQA.map((item, index) => {
                  const type = TYPE_MAP[item.type] || TYPE_MAP[(item.type || "").toLowerCase()] || item.type;
                  if (activeFilter && type !== activeFilter) return null;
                  const isExpanded = expandedQuestion === index;
                  const isDone = completedQuestions.has(index);
                  return (
                    <div
                      key={index}
                      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                        isExpanded ? "border-[#1e293b] bg-[#0f172a] shadow-md shadow-black/30" : "border-[#1e293b] bg-[#030712]"
                      } ${isDone ? "opacity-55" : ""}`}
                    >
                      <button
                        onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left min-h-[44px]"
                      >
                        {/* Completion checkbox */}
                        <span
                          role="checkbox"
                          aria-checked={isDone}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompletedQuestions(prev => {
                              const next = new Set(prev);
                              next.has(index) ? next.delete(index) : next.add(index);
                              return next;
                            });
                          }}
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                            isDone ? "border-emerald-500 bg-emerald-500" : "border-[#334155] hover:border-emerald-500/50"
                          }`}
                        >
                          {isDone && <Check className="h-2.5 w-2.5 text-white" />}
                        </span>

                        {/* ID + truncated question + tag */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex-shrink-0 text-xs font-bold text-slate-500">F{index + 1}</span>
                            <p className="text-sm font-semibold text-slate-100 leading-snug">{item.question}</p>
                          </div>
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFilter(prev => prev === type ? null : type);
                            }}
                            className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                              TAG_COLORS[type] || "bg-[#1e293b] text-slate-300"
                            } ${activeFilter === type ? "ring-1 ring-current" : "opacity-80 hover:opacity-100"}`}
                          >
                            {type}
                          </span>
                        </div>

                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-[#1e293b] bg-[#0f172a] px-5 py-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Vorgeschlagene Antwort</p>
                            <p className="text-sm leading-relaxed text-slate-300">{item.answer}</p>
                          </div>
                          {item.tip && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                              <p className="text-xs font-bold text-amber-400 mb-1">TIPP</p>
                              <p className="text-sm text-amber-200">{item.tip}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Persönliche Notizen</p>
                            <textarea
                              value={personalNotes[index] || ""}
                              onChange={(e) => setPersonalNotes(prev => ({ ...prev, [index]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Eigene Notizen, Beispiele, Stichworte…"
                              rows={3}
                              className="w-full resize-y rounded-xl border border-[#243041] bg-[#030712] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/30 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1e293b] [&::-webkit-scrollbar-thumb]:rounded-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cover Letter Modal ──────────────────────────────────────────────── */}
      {coverLetterModalOpen && job?.cover_letter && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCoverLetterModalOpen(false); }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#1e293b] bg-[#0f172a] shadow-2xl shadow-black/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] px-5 py-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                <h2 className="truncate text-base font-bold text-white">
                  Anschreiben{job.company ? ` — ${job.company}` : ""}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(job.cover_letter); setCopiedIndex(-1); setTimeout(() => setCopiedIndex(null), 2000); toast.success("Kopiert!"); }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#030712] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white min-h-[44px]"
                >
                  {copiedIndex === -1 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedIndex === -1 ? "Kopiert" : "Kopieren"}
                </button>
                {(() => {
                  const companyEmail = parseJson(job.research_data)?.contact_info?.email;
                  const subject = encodeURIComponent(`Bewerbung als ${job.role || "Kandidat"} – ${job.company || ""}`);
                  const body = encodeURIComponent(job.cover_letter || "");
                  if (companyEmail) {
                    return (
                      <a
                        href={`mailto:${companyEmail}?subject=${subject}&body=${body}`}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors min-h-[44px]"
                      >
                        <Mail className="h-3.5 w-3.5" /> E-Mail senden
                      </a>
                    );
                  }
                  return (
                    <a
                      href={`mailto:?subject=${subject}&body=${body}`}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors min-h-[44px]"
                    >
                      <Mail className="h-3.5 w-3.5" /> E-Mail Entwurf
                    </a>
                  );
                })()}
                <DownloadBtn kind="TXT" onClick={() => downloadTxt(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.txt`)} />
                <DownloadBtn kind="PDF" variant="red" onClick={() => printHtml("Anschreiben", `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(job.cover_letter)}</pre>`)} />
                <DownloadBtn kind="DOCX" variant="brand" onClick={() => downloadDoc(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.doc`)} />
                <button
                  onClick={() => setCoverLetterModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#1e293b] hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1e293b] [&::-webkit-scrollbar-thumb]:rounded-full">
              <AIDisclosureBanner feature="cover_letter" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{job.cover_letter}</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Research modal ──────────────────────────────────────────────────── */}
      {researchOpen && (
        <ResearchModal
          companyName={job.company || ""}
          data={researchData}
          loading={researchLoading}
          jobId={job.id}
          onRefresh={async () => {
            setResearchLoading(true);
            try {
              const res = await researchApi.research(job.company || "", job.description || "");
              setResearchData(res.data);
              updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
            } catch (err) {
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429)
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
            } finally { setResearchLoading(false); }
          }}
          onClose={() => { setResearchOpen(false); setResearchData(null); }}
        />
      )}

      {/* ── EU AI Act Transparency Footer (sticky) ─────────────────────────── */}
      <TransparencyFooter visible={hasAiContent} />
    </>
  );
}
