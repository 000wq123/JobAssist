/**
 * JobDetailPage — pure v7 detail surface.
 *
 * Visual spec: see /demo/v7/index.html. The page reads as a single calm
 * stack:
 *
 *   1. Sticky toolbar     — breadcrumb · Status menu · Mehr menu
 *   2. Identity row       — logo · category · role · company/location
 *   3. Story-hero         — Instrument Serif €X,XX/h headline (when known)
 *   4. KPI tiles          — Standort · Typ · Frist on a 12-col grid
 *   5. KV-benchmark bar   — collective-bargaining context (when known)
 *   6. Match card         — score + AI strengths / gaps
 *   7. Kontext footer     — calm baselines ("Antworten dauern im Schnitt …")
 *   8. Beschreibung       — collapsed by default
 *   9. Primary CTAs       — Bewerbung schreiben · Stellenanzeige öffnen
 *
 * All legacy features (Anschreiben generieren, Gespräch, Recherche, CV-Picker,
 * Frist/Notizen edit, Stelle löschen) are reachable from the toolbar's
 * "Mehr" menu — never inline. This matches the v7 demo and the calm-mode
 * design memory.
 *
 * The previous (legacy) implementation lives at JobDetailPage.legacy.jsx.bak
 * for reference and is not imported.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ChevronLeft, ChevronRight, ExternalLink, Trash2,
  FileText, MessageSquare, SearchCheck, Check, Copy, Download, X, Mail,
  Edit3, ChevronDown, Info, Play, ArrowLeft, ArrowRight, Loader2,
  ThumbsUp, AlertCircle, MoreHorizontal, BarChart2, TrendingUp,
} from "lucide-react";

import { coverLetterApi, coursesApi, interviewApi, jobApi, researchApi, resumeApi } from "../services/api";
import ResearchModal from "../components/ResearchModal";
import AIDisclosureBanner from "../components/AIDisclosureBanner";
import { getApiErrorMessage } from "../utils/apiError";

// ─── Local storage helpers ───────────────────────────────────────────────────

const loadStored = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; } };
const saveStored = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ } };
const parseJson = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
const escapeHtml = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ─── Download helpers (preserved from legacy) ────────────────────────────────

/** Triggers a browser download of `content` as a Word-compatible HTML file. */
function downloadDoc(content, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><p style="font-family:Arial;font-size:12pt;">${escapeHtml(content).replace(/\n/g, "</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" })),
    download: filename,
  });
  a.click(); URL.revokeObjectURL(a.href);
}
/** Opens a print-optimised HTML window. */
function printHtml(title, bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000}</style></head><body>${bodyHtml}</body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })));
  win?.addEventListener("load", () => { win.print(); });
}

// ─── Domain helpers ──────────────────────────────────────────────────────────

/**
 * Parses a free-form salary string into a structured value the hero can render.
 *
 * Returns `null` when nothing useful can be extracted; otherwise an object:
 *   { unit: "hour" | "month" | "year",
 *     amount: number,         // primary value (EUR)
 *     max?: number,           // optional upper bound for ranges
 *     hourly?: number }       // best-effort hourly equivalent for KV bar
 *
 * Handles three common shapes:
 *   - hourly:  "€10,20/h", "9.50 pro Stunde", "€ 11/h"
 *   - annual:  "€ 25,000 – 35,000", "ab € 30.000", "bis € 45000"
 *   - monthly: "€ 2.500 brutto/Monat", "1.800/Monat"
 *
 * Hourly conversion assumes the Austrian full-time baseline of 38.5 h/week ×
 * 52 weeks ≈ 2002 h/year. Good enough for the KV bar; never shown as a
 * concrete number unless directly stated.
 *
 * @param {string | null | undefined} raw
 * @returns {{unit: "hour"|"month"|"year", amount: number, max?: number, hourly?: number} | null}
 */
function parseSalary(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\s+/g, " ").trim();

  // Pull all numeric tokens (handles "€ 25,000 – 35,000" → [25000, 35000])
  const tokens = [...s.matchAll(/([0-9]+(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?)/g)]
    .map((m) => normaliseNumber(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!tokens.length) return null;

  const isHourly  = /(\/h|\/std|pro stunde|pro h\b|hour)/.test(s);
  const isMonthly = /(\/mon|pro monat|monatlich|month)/.test(s);
  // Default for large four-digit-plus values without unit hint → annual.
  const looksAnnual = tokens.some((n) => n >= 10000);

  if (isHourly) {
    const amount = tokens[0];
    return { unit: "hour", amount, hourly: amount };
  }
  if (isMonthly) {
    const amount = tokens[0];
    return { unit: "month", amount, hourly: (amount * 12) / 2002 };
  }
  if (looksAnnual) {
    const amount = tokens[0];
    const max = tokens[1] && tokens[1] > amount ? tokens[1] : undefined;
    const ref = max ? (amount + max) / 2 : amount;
    return { unit: "year", amount, max, hourly: ref / 2002 };
  }
  return null;
}

/** Normalises German/English numeric strings like "25,000" / "1.234,50" to a Number. */
function normaliseNumber(s) {
  if (!s) return NaN;
  // Strategy: strip thousand separators, then convert decimal separator.
  // Heuristic — the LAST punctuation in a multi-punct number is decimal iff
  // it's followed by exactly 1–2 digits; otherwise it's a thousands sep.
  const last = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (last === -1) return Number(s);
  const tail = s.slice(last + 1);
  if (tail.length === 1 || tail.length === 2) {
    // Decimal separator
    return Number(s.slice(0, last).replace(/[.,]/g, "") + "." + tail);
  }
  return Number(s.replace(/[.,]/g, ""));
}

/** Whole days from now until the given ISO. Negative if past. */
function daysUntil(iso) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.ceil((t.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Mocked KV minimum hourly wage for a young first-job seeker (illustrative). */
function kvMinimumFor(category) {
  switch ((category || "").toLowerCase()) {
    case "samstagsjob":
    case "teilzeit":   return 9.27;
    case "praktikum":  return 8.10;
    default:           return 9.00;
  }
}

/** Human label for the `category` enum. */
function categoryLabel(category) {
  switch ((category || "").toLowerCase()) {
    case "samstagsjob": return "Samstagsjob";
    case "praktikum":   return "Praktikum";
    case "teilzeit":    return "Teilzeit";
    case "vollzeit":    return "Vollzeit";
    default:            return "Stelle";
  }
}

/** Best-effort initial / abbreviation for the company logo chip. */
function logoAbbrev(company) {
  if (!company) return "?";
  const trimmed = company.trim();
  if (trimmed.length <= 5) return trimmed.toUpperCase();
  return trimmed.slice(0, 1).toUpperCase();
}

/** Deterministic gradient class for a company logo (calm palette). */
function logoColor(company) {
  if (!company) return "bg-slate-700";
  const seed = company.charCodeAt(0) + (company.length || 1);
  const palettes = [
    "bg-gradient-to-br from-rose-600 to-rose-800",
    "bg-gradient-to-br from-amber-500 to-orange-700",
    "bg-gradient-to-br from-emerald-600 to-emerald-800",
    "bg-gradient-to-br from-sky-600 to-sky-800",
    "bg-gradient-to-br from-violet-600 to-violet-800",
    "bg-gradient-to-br from-fuchsia-600 to-fuchsia-800",
  ];
  return palettes[seed % palettes.length];
}

// ─── Status enum ─────────────────────────────────────────────────────────────

const STATUS = [
  { key: "bookmarked",   label: "Gespeichert" },
  { key: "applied",      label: "Beworben" },
  { key: "interviewing", label: "Im Gespräch" },
  { key: "offered",      label: "Angebot" },
  { key: "rejected",     label: "Erledigt" },
];
const statusLabel = (key) => STATUS.find(s => s.key === key)?.label ?? "Gespeichert";

// ─── Small UI primitives ─────────────────────────────────────────────────────

const ANNOT = "text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium";

/** Inline loading spinner used inside buttons. */
function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}

/** Lightweight click-outside hook for the toolbar dropdowns. */
function useClickOutside(ref, onClose, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onClose, active]);
}

/**
 * Status dropdown in the toolbar — changes the application status.
 */
function StatusMenu({ status, onChange, pending }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={pending}
        className="grid grid-cols-[1fr_auto] items-center gap-1.5 h-8 px-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] text-[12px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{statusLabel(status)}</span>
        <ChevronDown className="w-3 h-3 text-[var(--color-fg-dim)]" aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-1.5 z-40 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-lg shadow-black/40 py-1">
          {STATUS.map((s) => {
            const active = s.key === status;
            return (
              <button
                key={s.key}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setOpen(false); if (!active) onChange(s.key); }}
                className="grid grid-cols-[1fr_auto] items-center gap-2 w-full px-3 py-2 text-left text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]"
              >
                <span>{s.label}</span>
                {active ? <Check className="w-3.5 h-3.5 text-[var(--color-accent-300)]" /> : <span />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Truncates text at a sentence boundary (ends with . ! ?) up to ~maxChars. */
function truncateAtSentence(text, maxChars = 420) {
  if (!text || text.length <= maxChars) return { preview: text, full: text, truncated: false };
  const sub = text.slice(0, maxChars);
  const last = Math.max(sub.lastIndexOf(". "), sub.lastIndexOf(".\n"), sub.lastIndexOf("! "), sub.lastIndexOf("? "));
  const cutAt = last > maxChars * 0.45 ? last + 1 : maxChars;
  return { preview: sub.slice(0, cutAt).trimEnd(), full: text, truncated: true };
}

/** Expandable job description body with sentence-boundary preview. */
function DescriptionBody({ text }) {
  const [expanded, setExpanded] = useState(false);
  const { preview, full, truncated } = truncateAtSentence(text);
  return (
    <div className="px-5 pb-5 pt-1 border-t border-[var(--color-border-subtle)]">
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
        {expanded ? full : preview}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-[12px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

/** Labelled toolbar button — icon on top, short text below. */
function ToolBtn({ icon: Icon, label, shortLabel, onClick, danger, disabled }) {
  const display = shortLabel || label.split(" ")[0];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center gap-0.5 h-10 px-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[38px] ${
        danger
          ? "text-[var(--color-error)]/70 hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]"
      }`}
    >
      <Icon className="w-[15px] h-[15px]" aria-hidden="true" />
      <span className="text-[9px] font-medium leading-none tracking-wide">{display}</span>
    </button>
  );
}

// ─── Body sub-components ─────────────────────────────────────────────────────

const _API = "http://localhost:8000/api";

/**
 * Company logo chip — single request to /proxy/logo/best; falls back to
 * the deterministic letter chip on 404.
 */
function CompanyLogo({ company, url }) {
  const [failed, setFailed] = useState(false);
  const src = `${_API}/proxy/logo/best?company=${encodeURIComponent(company || "")}&url=${encodeURIComponent(url || "")}`;

  if (!failed && company) {
    return (
      <img
        key={src}
        src={src}
        alt={company}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain flex-shrink-0 bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] p-1.5"
      />
    );
  }
  return (
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${logoColor(company)} text-white text-[13px] font-bold grid place-items-center flex-shrink-0`}
      aria-hidden="true"
    >
      {logoAbbrev(company)}
    </div>
  );
}

/** KPI tile — renders inside a flex row so tiles auto-fill regardless of count. */
function KpiTile({ label, value, hint, tone = "default" }) {
  const toneClass = tone === "warn" ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]";
  return (
    <div className="flex-1 min-w-[140px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-4 pt-3.5 pb-3">
      <p className="text-[12px] tracking-[0.07em] uppercase text-[var(--color-fg-dim)] font-semibold">{label}</p>
      <p
        className={`mt-2 leading-none tabular-nums ${toneClass}`}
        style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif', fontSize: "32px", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12.5px] text-[var(--color-fg-dim)] truncate">{hint}</p> : null}
    </div>
  );
}

/** KV-benchmark bar (mocked) — only when an hourly rate could be parsed. */
function KvBar({ hourly, kvMin, category }) {
  const top = Math.max(hourly * 1.18, kvMin * 1.35);
  const kvPct  = Math.min(100, (kvMin  / top) * 100);
  const jobPct = Math.min(100, (hourly / top) * 100);
  const above  = hourly > kvMin;
  const diff   = (hourly - kvMin).toFixed(2);
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] p-5">
      <div className="grid grid-cols-12 items-baseline gap-2">
        <p className={`col-span-8 ${ANNOT} text-[var(--color-fg)]`} style={{ letterSpacing: "0.14em" }}>
          KV-Vergleich · {categoryLabel(category)}
        </p>
        <p className={`col-span-4 text-right text-[11.5px] tabular-nums font-medium ${above ? "text-emerald-400" : "text-[var(--color-warning)]"}`}>
          {above ? "+" : ""}€{diff}/h
        </p>
      </div>
      <div className="relative mt-5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-[var(--color-accent-500)]/35" style={{ width: `${kvPct}%` }} />
        <div
          className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--color-fg)] ring-2 ring-[var(--color-bg)]"
          style={{ left: `${jobPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between tabular-nums text-[11px] text-[var(--color-fg-dim)]">
        <span>€{kvMin.toFixed(2)} KV-Min.</span>
        <span className="text-[var(--color-fg)] font-medium">€{hourly.toFixed(2)} hier</span>
        <span>€{top.toFixed(2)} Top</span>
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--color-fg-faint)] flex items-center gap-1">
        <Info className="w-2.5 h-2.5" aria-hidden="true" /> Illustrative Werte — werden durch echte KV-Daten ersetzt.
      </p>
    </div>
  );
}

/**
 * Ähnliche Stellen — salary comparison against other saved jobs that have a
 * parseable salary. Shows diff vs. this job in green/red to give market context.
 */
function SimilarJobsCard({ currentHourly, jobs, currentId }) {
  const peers = jobs
    .filter((j) => String(j.id) !== String(currentId) && j.salary_text)
    .map((j) => {
      const p = parseSalary(j.salary_text);
      const h = p?.unit === "hour" ? p.amount : p?.hourly ?? null;
      if (!h) return null;
      const diff = h - currentHourly;
      return { j, hourly: h, diff };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
    .slice(0, 4);

  if (!peers.length) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-baseline justify-between">
        <p className={ANNOT}>Ähnliche Stellen</p>
        <p className="text-[11px] text-[var(--color-fg-dim)]">{peers.length} in deiner Liste</p>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {peers.map(({ j, hourly, diff }) => {
          const pos = diff > 0;
          const neutral = Math.abs(diff) < 0.1;
          const diffColor = neutral
            ? "text-[var(--color-fg-dim)]"
            : pos
            ? "text-emerald-400"
            : "text-[var(--color-error)]";
          return (
            <div key={j.id} className="px-5 py-3 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--color-fg)] truncate">{j.company || j.role}</p>
                {j.company && j.role ? (
                  <p className="text-[11px] text-[var(--color-fg-dim)] truncate mt-0.5">{j.role}</p>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <p className="tabular-nums text-[13px] text-[var(--color-fg)]">€{hourly.toFixed(2)}/h</p>
                <p className={`tabular-nums text-[11px] ${diffColor}`}>
                  {neutral ? "±0" : `${pos ? "+" : ""}€${diff.toFixed(2)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Salary comparison modal — shows this job's rate vs KV minimum and other
 * saved jobs that have parseable salaries.
 */
function SalaryCompareModal({ open, onClose, currentJob, allJobs }) {
  if (!open) return null;

  const current = parseSalary(currentJob.salary_text);
  const kvMin   = kvMinimumFor(currentJob.category);

  const peers = (allJobs || [])
    .filter((j) => j.id !== currentJob.id && (j.company || j.role))
    .map((j) => {
      const parsed = parseSalary(j.salary_text);
      const hourly = parsed?.unit === "hour" ? parsed.amount
        : parsed?.unit === "month" ? parsed.amount / 160
        : null;
      const estimated = hourly === null;
      return { j, hourly: hourly ?? kvMinimumFor(j.category), estimated };
    })
    .sort((a, b) => b.hourly - a.hourly)
    .slice(0, 6);

  const currentHourly = current?.unit === "hour" ? current.amount : null;
  const aboveKv = currentHourly !== null ? currentHourly > kvMin : null;

  const tips = [
    "Frage ruhig nach dem Gehalt — die meisten Stellen haben Spielraum.",
    `Der KV-Mindestlohn für diese Kategorie liegt bei €${kvMin.toFixed(2)}/h.`,
    "Vergleiche immer netto: Teilzeit bringt weniger Abzüge als Vollzeit.",
    "Probezeit-Gehalt ist oft niedriger — frag nach dem Gehalt danach.",
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[520px] sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[var(--color-warning)]" />
            <p className="text-[14px] font-semibold text-[var(--color-fg)]">Gehaltsvergleich</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Current job vs KV */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "rgba(124,125,240,0.08)", border: "1px solid rgba(124,125,240,0.20)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-300)]">Dieser Job</p>
              {currentHourly !== null ? (
                <p className="text-[20px] font-semibold text-[var(--color-fg)] tabular-nums">€{currentHourly.toFixed(2)}<span className="text-[12px] font-normal text-[var(--color-fg-muted)]">/h</span></p>
              ) : (
                <p className="text-[13px] text-[var(--color-fg-dim)] leading-snug">Kein Gehalt</p>
              )}
              {aboveKv !== null && (
                <span className="self-start mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={aboveKv ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" } : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                  {aboveKv ? "über KV" : "unter KV"}
                </span>
              )}
            </div>
            <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-warning)]">KV-Minimum</p>
              <p className="text-[20px] font-semibold text-[var(--color-fg)] tabular-nums">€{kvMin.toFixed(2)}<span className="text-[12px] font-normal text-[var(--color-fg-muted)]">/h</span></p>
              <p className="text-[10px] text-[var(--color-fg-faint)]">€{(kvMin * 160).toFixed(0)} / Monat</p>
            </div>
          </div>

          {/* Peer jobs */}
          {peers.length > 0 && (
            <div>
              <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-faint)] font-semibold mb-2">Deine gespeicherten Stellen</p>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
                {peers.map(({ j, hourly, estimated }) => {
                  const diff = currentHourly !== null ? hourly - currentHourly : null;
                  const pos = diff !== null && diff > 0.05;
                  const neg = diff !== null && diff < -0.05;
                  return (
                    <div key={j.id} className="flex items-center justify-between py-2 gap-3">
                      <div className="min-w-0">
                        <span className="text-[12.5px] text-[var(--color-fg-muted)] truncate block">{j.company || j.role || "Stelle"}</span>
                        {j.company && j.role && <span className="text-[11px] text-[var(--color-fg-dim)] truncate block">{j.role}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {estimated && (
                          <span className="text-[10px] text-[var(--color-fg-dim)] px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-3)]">KV-Min.</span>
                        )}
                        <span className="text-[12.5px] font-medium text-[var(--color-fg)]">€{hourly.toFixed(2)}/h</span>
                        {diff !== null && (
                          <span className={`text-[11px] tabular-nums ${pos ? "text-emerald-400" : neg ? "text-[var(--color-error)]" : "text-[var(--color-fg-dim)]"}`}>
                            {Math.abs(diff) < 0.05 ? "==" : `${pos ? "+" : ""}€${diff.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[var(--color-fg-muted)] leading-relaxed">
              {tips[Math.floor(Math.random() * tips.length)]}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** AI Match card — anchor of the page when no wage hero is present. */
function MatchCard({ score, feedbackJson, onCheckFit, onCheckFitPending, resumeId }) {
  const [whyOpen, setWhyOpen] = useState(false);
  let parsed = null;
  if (feedbackJson) {
    try { const obj = JSON.parse(feedbackJson); if (obj && typeof obj === "object") parsed = obj; } catch { /* ignore */ }
  }
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const pct = hasScore ? Math.round(score) : null;
  const scoreTone = pct === null ? "text-[var(--color-fg-dim)]"
    : pct >= 70 ? "text-emerald-400"
    : pct >= 40 ? "text-[var(--color-fg-muted)]"
    : "text-[var(--color-error)]";
  const hasDetail = parsed?.requirements?.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="p-5 sm:p-6">

        {/* Score row — score on the left, annotation beside it */}
        <div className="flex items-start gap-4">
          {hasScore && (
            <p className="flex items-baseline gap-0.5 leading-none flex-shrink-0">
              <span className={`${scoreTone} font-semibold tabular-nums`} style={{ fontSize: "clamp(32px, 5vw, 40px)", fontFamily: '"Instrument Serif", ui-serif, Georgia, serif' }}>{pct}</span>
              <span className="text-[15px] text-[var(--color-fg-dim)]">%</span>
            </p>
          )}
          <div className="pt-1.5">
            <p className={ANNOT}>Passt zu dir</p>
          </div>
        </div>

        {/* Verdict — the honest personal takeaway */}
        {parsed?.verdict ? (
          <p className="mt-3 text-[13.5px] text-[var(--color-fg-muted)] leading-relaxed border-l-2 border-[var(--color-border)] pl-3">
            {parsed.verdict}
          </p>
        ) : !hasScore ? (
          <p className="mt-3 text-[13px] text-[var(--color-fg-dim)] leading-relaxed">
            {resumeId
              ? "Klick auf \"Passung prüfen\" — die KI liest deinen Lebenslauf und sagt dir direkt, wie gut du passt und warum."
              : "Verknüpfe deinen Lebenslauf, damit die KI eine ehrliche Einschätzung geben kann."}
          </p>
        ) : null}

        {/* Strengths */}
        {parsed?.strengths?.length > 0 && (
          <ul className="mt-4 space-y-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {(parsed.strengths || []).slice(0, 5).map((s, i) => (
              <li key={`s${i}`} className="flex gap-2.5 items-start">
                <span className="text-emerald-400 flex-shrink-0 font-bold mt-0.5 text-[12px]">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Gaps */}
        {parsed?.gaps?.length > 0 && (
          <ul className="mt-3 space-y-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {(parsed.gaps || []).slice(0, 4).map((g, i) => (
              <li key={`g${i}`} className="flex gap-2.5 items-start">
                <span className="text-[var(--color-fg-dim)] flex-shrink-0 font-bold mt-0.5 text-[12px]">−</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        )}

        {!parsed?.strengths?.length && !parsed?.gaps?.length && hasScore && (
          <p className="mt-3 text-[13px] text-[var(--color-fg-dim)]">Keine Detailanalyse verfügbar — berechne die Passung neu.</p>
        )}
      </div>

      {/* Expander: per-requirement evidence breakdown */}
      <div className="border-t border-[var(--color-border-subtle)]">
        <button
          type="button"
          onClick={() => setWhyOpen(v => !v)}
          className="flex items-center justify-between w-full px-5 py-3 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
        >
          <span>{hasDetail ? "Was die KI in deinem Lebenslauf gefunden hat" : "Wie entsteht diese Zahl?"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {whyOpen && (
          <div className="pb-4 flex flex-col gap-4 text-[12.5px] leading-relaxed bg-[var(--color-bg-elev-2)]/30">
            {hasDetail ? (
              <div className="px-5 pt-1 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-faint)] font-semibold">6 Anforderungen · Zeile für Zeile</p>
                {parsed.requirements.map((r, i) => {
                  const s = Math.min(2, Math.max(0, parseInt(r.score ?? 0, 10)));
                  const icon = s === 2 ? "✓" : s === 1 ? "◐" : "✕";
                  const bg   = s === 2 ? "bg-emerald-500/8 border-emerald-500/20" : s === 1 ? "bg-amber-500/8 border-amber-500/20" : "bg-red-500/8 border-red-500/20";
                  const tone = s === 2 ? "text-emerald-400" : s === 1 ? "text-[var(--color-warning)]" : "text-[var(--color-error)]/80";
                  const hasEvidence = r.evidence && !r.evidence.toLowerCase().startsWith("kein nachweis");
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${bg}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={`flex-shrink-0 text-[12px] font-bold mt-0.5 ${tone}`}>{icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[var(--color-fg-muted)] font-medium text-[12.5px]">{r.req}</span>
                            {r.dealbreaker && s < 2 && (
                              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-error)]/15 text-[var(--color-error)]/80">K.O.</span>
                            )}
                          </div>
                          {r.note && (
                            <p className="mt-1 text-[var(--color-fg-dim)] text-[12px]">{r.note}</p>
                          )}
                          {hasEvidence && (
                            <p className="mt-1.5 text-[11.5px] text-emerald-400/80 italic">
                              Dein CV: „{r.evidence}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 pt-2 text-[var(--color-fg-dim)]">
                <p>{resumeId ? "Berechne die Passung, um die vollständige Anforderungsanalyse zu sehen." : "Verknüpfe deinen Lebenslauf, damit die KI die Anforderungen prüfen kann."}</p>
              </div>
            )}

            {onCheckFit && (
              <div className="px-5">
                <button
                  type="button"
                  onClick={onCheckFit}
                  disabled={onCheckFitPending}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors disabled:opacity-50"
                >
                  {onCheckFitPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {resumeId ? "Analyse neu starten →" : "Lebenslauf verknüpfen →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bearbeiten sheet (CV + Frist + Notizen, combined) ───────────────────────

/**
 * Combined edit dialog. Opens from Mehr menu. Avoids three separate sheets.
 */
function BearbeitenSheet({ open, onClose, job, resumes, selectedResume, onChangeResume, onSaveMeta, savingMeta }) {
  const [deadline, setDeadline] = useState(job.deadline || "");
  const [notes, setNotes] = useState(job.notes || "");

  useEffect(() => { if (open) { setDeadline(job.deadline || ""); setNotes(job.notes || ""); } }, [open, job.deadline, job.notes]);

  if (!open) return null;

  const dirty = (deadline || "") !== (job.deadline || "") || (notes || "") !== (job.notes || "");
  const handleSave = () => {
    const payload = {};
    if ((deadline || "") !== (job.deadline || "")) payload.deadline = deadline || null;
    if ((notes    || "") !== (job.notes    || "")) payload.notes    = notes    || null;
    if (Object.keys(payload).length) onSaveMeta(payload);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md grid grid-cols-12 gap-0 rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60">
        <div className="col-span-12 grid grid-cols-12 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          <h2 className="col-span-10 text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">Bearbeiten</h2>
          <button onClick={onClose} className="col-span-2 justify-self-end grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="col-span-12 px-5 py-5 space-y-5">
          {/* Lebenslauf für Analyse */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Lebenslauf für Analyse</label>
            {resumes.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedResume || resumes[0]?.id || ""}
                  onChange={(e) => onChangeResume(Number(e.target.value))}
                  className="grid w-full h-10 appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40"
                >
                  {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-dim)]" />
              </div>
            ) : (
              <Link to="/settings" className="grid grid-cols-[auto_1fr] items-center gap-1.5 text-[12.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)]">
                <FileText className="w-3.5 h-3.5" /> Lebenslauf hochladen →
              </Link>
            )}
          </div>

          {/* Frist */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Frist</label>
            <input
              type="date"
              value={deadline || ""}
              onChange={(e) => setDeadline(e.target.value)}
              className="grid w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40"
            />
          </div>

          {/* Notizen */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Notizen</label>
            <textarea
              rows={4}
              value={notes || ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eigene Notizen, Erinnerungen, Stichworte …"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40 resize-y"
            />
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-12 gap-2 px-5 py-3.5 border-t border-[var(--color-border-subtle)]">
          <button onClick={onClose} className="col-span-6 sm:col-span-8 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[13px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)]">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || savingMeta}
            className="col-span-6 sm:col-span-4 h-10 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] disabled:opacity-50"
          >
            {savingMeta ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Interview QA sheet ──────────────────────────────────────────────────────

/**
 * Modern interview prep sheet.
 * Overview mode: clean question cards with inline tips.
 * Practice mode: one question at a time, user writes answer, then reveals suggestion.
 */
function InterviewSheet({ open, onClose, job, mutate, pending, resumeId, escapeHtmlFn }) {
  const qa = useMemo(() => parseJson(job.interview_qa), [job.interview_qa]);
  const [mode, setMode] = useState("overview");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ratings, setRatings] = useState({});

  if (!open) return null;

  const total = qa?.length ?? 0;
  const currentQ = qa?.[idx];
  const rating = ratings[idx];

  const enterPractice = () => { setMode("practice"); setIdx(0); };
  const exitPractice  = () => setMode("overview");
  const handleNext    = () => { if (idx < total - 1) setIdx(i => i + 1); };
  const handlePrev    = () => { if (idx > 0) setIdx(i => i - 1); };

  const handleRate = async () => {
    const userAnswer = (answers[idx] ?? "").trim();
    if (!userAnswer || !currentQ) return;
    setRatings(prev => ({ ...prev, [idx]: { status: "loading" } }));
    try {
      const res = await interviewApi.rateAnswer(
        currentQ.question,
        userAnswer,
        currentQ.answer,
      );
      setRatings(prev => ({ ...prev, [idx]: { status: "done", ...res.data } }));
    } catch {
      setRatings(prev => ({ ...prev, [idx]: { status: "fallback" } }));
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl flex flex-col max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          {mode === "practice" && (
            <button onClick={exitPractice} className="grid place-items-center w-7 h-7 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Zurück">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">
              {mode === "practice" ? "Gespräch üben" : "Vorbereitung"}
            </h2>
            {qa && <p className="text-[11.5px] text-[var(--color-fg-dim)] mt-0.5">{job.role || job.company} · {total} Fragen</p>}
          </div>
          {qa && mode === "overview" && (
            <button
              onClick={enterPractice}
              className="hidden sm:inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[12px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors"
            >
              <Play className="w-3 h-3" /> Gespräch üben
            </button>
          )}
          {mode === "practice" && (
            <span className="text-[11px] tabular-nums text-[var(--color-fg-dim)] mr-1">{idx + 1} / {total}</span>
          )}
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!qa ? (
            /* ── Generate state ── */
            <div className="px-5 py-5">
              <AIDisclosureBanner feature="interview" />
              <div className="grid place-items-center py-10 text-center">
                <MessageSquare className="w-7 h-7 text-[var(--color-accent-300)] mb-3" />
                <p className="text-[13px] text-[var(--color-fg-muted)] mb-4 max-w-xs">
                  Erstelle eine Vorbereitung auf Basis deiner Stelle und deines Lebenslaufs.
                </p>
                <button
                  onClick={() => mutate()}
                  disabled={pending || !resumeId}
                  className="h-10 px-4 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {pending ? <><Spinner /> Wird erstellt…</> : <>Vorbereitung erstellen</>}
                </button>
                {!resumeId ? <p className="mt-2 text-[11px] text-[var(--color-warning)]">Wähle zuerst einen Lebenslauf in "Bearbeiten".</p> : null}
              </div>
            </div>
          ) : mode === "overview" ? (
            /* ── Overview: question cards ── */
            <div className="px-5 py-4 grid grid-cols-1 gap-2.5">
              <AIDisclosureBanner feature="interview" />
              {qa.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Frage {i + 1}</p>
                  <p className="text-[14px] leading-snug font-medium text-[var(--color-fg)]">{item.question}</p>
                  {item.tip && (
                    <div className="mt-3 flex items-start gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-warning)] flex-shrink-0 mt-0.5">Tipp</span>
                      <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{item.tip}</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={enterPractice}
                className="sm:hidden mt-1 h-10 rounded-xl bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[13px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Gespräch üben
              </button>
            </div>
          ) : (
            /* ── Practice mode: one question at a time ── */
            <div className="px-5 py-5 flex flex-col gap-5 scene-enter">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-0.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-400"
                    style={{ width: `${((idx + 1) / total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="scene-enter">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-faint)] mb-2">Frage {idx + 1}</p>
                <p
                  className="text-[18px] leading-snug font-medium text-[var(--color-fg)]"
                  style={{ fontFamily: "'Instrument Serif', ui-serif, Georgia, serif" }}
                >
                  {currentQ?.question}
                </p>
              </div>

              {/* Answer textarea */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-dim)] block mb-2">Deine Antwort</label>
                <textarea
                  key={idx}
                  value={answers[idx] ?? ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                  disabled={rating?.status === "loading" || rating?.status === "done"}
                  placeholder="Schreib deine Antwort hier…"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[13px] text-[var(--color-fg)] placeholder-[var(--color-fg-faint)] resize-none h-28 focus:outline-none focus:border-[var(--color-accent-500)]/50 transition-colors disabled:opacity-60"
                />
              </div>

              {/* Rate button — only before rating */}
              {!rating && (
                <button
                  onClick={handleRate}
                  disabled={!(answers[idx] ?? "").trim()}
                  className="h-9 rounded-lg bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[13px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  Antwort bewerten lassen
                </button>
              )}

              {/* Loading state */}
              {rating?.status === "loading" && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--color-fg-dim)] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird bewertet…</span>
                </div>
              )}

              {/* AI Feedback card */}
              {rating?.status === "done" && (() => {
                const SCORE_STYLE = {
                  stark:        { cls: "bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]",  label: "Stark" },
                  gut:          { cls: "bg-[#fbbf24]/10 border-[#fbbf24]/25 text-[#fbbf24]",  label: "Gut" },
                  ausbaufähig:  { cls: "bg-[#f87171]/10 border-[#f87171]/25 text-[#f87171]",  label: "Ausbaufähig" },
                };
                const style = SCORE_STYLE[rating.score] ?? SCORE_STYLE.gut;
                return (
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4 flex flex-col gap-3 scene-enter">
                    {/* Score badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${style.cls}`}>
                        <ThumbsUp className="w-3 h-3" />
                        {style.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-fg-faint)]">KI-Bewertung</span>
                    </div>
                    {/* Strengths */}
                    {rating.strong?.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {rating.strong.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0" />
                            <p className="text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{s}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Improvements */}
                    {rating.improve?.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {rating.improve.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#fbbf24] flex-shrink-0" />
                            <p className="text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{s}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Coaching tip */}
                    {rating.tip && (
                      <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{rating.tip}</p>
                      </div>
                    )}
                    {/* Collapsible suggested answer */}
                    <details className="group">
                      <summary className="cursor-pointer list-none text-[11.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors select-none">
                        Vorschlag anzeigen ▸
                      </summary>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ?.answer}</p>
                    </details>
                  </div>
                );
              })()}

              {/* Fallback: just show suggestion if rating failed */}
              {rating?.status === "fallback" && (
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4 scene-enter">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent-300)] mb-2">Vorschlag</p>
                  <p className="text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ?.answer}</p>
                  {currentQ?.tip && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-start gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-warning)] flex-shrink-0 mt-0.5">Tipp</span>
                      <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ.tip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={idx === 0}
                  className="flex-1 h-9 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] disabled:opacity-30 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Zurück
                </button>
                {idx < total - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 h-9 rounded-lg border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 text-[13px] text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    Weiter <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={exitPractice}
                    className="flex-1 h-9 rounded-lg border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 text-[13px] text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Abgeschlossen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: download (overview only) */}
        {qa && mode === "overview" && (
          <div className="grid grid-cols-2 gap-2 px-5 py-3 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => downloadDoc(
                qa.map((it, i) => `Frage ${i + 1}: ${it.question}\n\nAntwort:\n${it.answer}${it.tip ? `\n\nTipp: ${it.tip}` : ""}`).join("\n\n----\n\n"),
                `Vorbereitung_${job.company || "Bewerbung"}.doc`,
              )}
              className="h-9 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> DOCX
            </button>
            <button
              onClick={() => printHtml(
                "Gesprächsvorbereitung",
                `<h1>${escapeHtmlFn(job.role || "Stelle")}</h1><p>${escapeHtmlFn(job.company || "")}</p>${qa.map((it, i) =>
                  `<div style="margin-bottom:24px;"><b>Frage ${i + 1}: ${escapeHtmlFn(it.question)}</b><p>${escapeHtmlFn(it.answer)}</p>${it.tip ? `<p style="background:#1a1a1a;padding:8px;border-radius:4px;"><b>Tipp:</b> ${escapeHtmlFn(it.tip)}</p>` : ""}</div>`
                ).join("<hr>")}`,
              )}
              className="h-9 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Cover Letter Modal (preserved, restyled) ────────────────────────────────

/** Modal that displays a generated cover letter with copy/mailto/download. */
function CoverLetterModal({ open, onClose, job }) {
  const [copied, setCopied] = useState(false);
  if (!open || !job?.cover_letter) return null;

  const companyEmail = parseJson(job.research_data)?.contact_info?.email;
  const subject = encodeURIComponent(`Bewerbung als ${job.role || "Kandidat"} – ${job.company || ""}`);
  const body = encodeURIComponent(job.cover_letter || "");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl flex flex-col max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60">
        <div className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          <h2 className="col-span-9 text-[14px] font-semibold tracking-tight text-[var(--color-fg)] truncate">
            Anschreiben{job.company ? ` · ${job.company}` : ""}
          </h2>
          <div className="col-span-3 justify-self-end flex items-center gap-1">
            <button
              onClick={() => { navigator.clipboard.writeText(job.cover_letter); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Kopiert"); }}
              className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
              title="Kopieren"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <AIDisclosureBanner feature="cover_letter" />
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">{job.cover_letter}</p>
        </div>
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-t border-[var(--color-border-subtle)]">
          <a
            href={`mailto:${companyEmail || ""}?subject=${subject}&body=${body}`}
            className="col-span-12 sm:col-span-6 h-10 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] inline-flex items-center justify-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> {companyEmail ? "E-Mail senden" : "E-Mail Entwurf"}
          </a>
          <button
            onClick={() => downloadDoc(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.doc`)}
            className="col-span-6 sm:col-span-3 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> DOCX
          </button>
          <button
            onClick={() => printHtml("Anschreiben", `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(job.cover_letter)}</pre>`)}
            className="col-span-6 sm:col-span-3 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Courses card ────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  youtube:            { color: "#ff0000", domain: "youtube.com" },
  coursera:           { color: "#0056d3", domain: "coursera.org" },
  udemy:              { color: "#a435f0", domain: "udemy.com" },
  linkedin:           { color: "#0077b5", domain: "linkedin.com" },
  "linkedin learning":{ color: "#0077b5", domain: "linkedin.com" },
  "khan academy":     { color: "#14bf96", domain: "khanacademy.org" },
  skillshare:         { color: "#00cc76", domain: "skillshare.com" },
  edx:                { color: "#02262b", domain: "edx.org" },
  pluralsight:        { color: "#f15a2c", domain: "pluralsight.com" },
  duolingo:           { color: "#58cc02", domain: "duolingo.com" },
  futurelearn:        { color: "#de00a5", domain: "futurelearn.com" },
  openhpi:            { color: "#e2001a", domain: "open.hpi.de" },
};

/** Single course row — cascade: apple-touch-icon → favicon.ico → badge. */
function CourseRow({ course }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const pk   = (course.platform || "").toLowerCase();
  const meta = Object.entries(PLATFORM_ICONS).find(([k]) => pk.includes(k))?.[1];
  const bg   = meta?.color ?? "#52525b";
  const abbr = (course.platform || "?").replace(/\s+learning|\s+academy/i, "").slice(0, 2).toUpperCase();

  const proxy = (u) => `http://localhost:8000/api/proxy/logo?url=${encodeURIComponent(u)}`;
  const sources = meta?.domain ? [
    proxy(`https://www.${meta.domain}/apple-touch-icon.png`),
    proxy(`https://www.${meta.domain}/favicon.ico`),
  ] : [];

  const showImg = srcIdx < sources.length;

  const getCourseHref = () => {
    if (course.url && /^https?:\/\//i.test(course.url)) return course.url;
    const q = encodeURIComponent(course.title || "Kurs");
    if (pk.includes("youtube"))  return `https://www.youtube.com/results?search_query=${q}`;
    if (pk.includes("coursera")) return `https://www.coursera.org/search?query=${q}`;
    if (pk.includes("udemy"))    return `https://www.udemy.com/courses/search/?q=${q}`;
    if (pk.includes("linkedin")) return `https://www.linkedin.com/learning/search?keywords=${q}`;
    if (pk.includes("edx"))      return `https://www.edx.org/search?q=${q}`;
    return `https://www.google.com/search?q=${q}+Kurs+online`;
  };

  return (
    <a
      href={getCourseHref()}
      target="_blank"
      rel="noopener noreferrer"
      className="px-5 py-4 flex items-center gap-3.5 hover:bg-[var(--color-bg-elev-2)] transition-colors group"
      style={{ textDecoration: "none", display: "flex" }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-lg grid place-items-center"
        style={{ background: bg }}
      >
        {showImg ? (
          <img
            key={sources[srcIdx]}
            src={sources[srcIdx]}
            alt={course.platform || ""}
            referrerPolicy="no-referrer"
            className="w-7 h-7 object-contain rounded-md"
            onError={() => setSrcIdx(i => i + 1)}
          />
        ) : (
          <span className="text-[11px] font-bold text-white tracking-wide">{abbr}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--color-fg)] leading-snug line-clamp-2">{course.title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-fg-dim)]">
          {course.platform}
          {course.duration ? <span className="text-[var(--color-fg-faint)]"> · {course.duration}</span> : null}
        </p>
      </div>
      <ExternalLink className="shrink-0 w-3.5 h-3.5 text-[var(--color-fg-faint)] group-hover:text-[var(--color-fg-dim)] transition-colors" />
    </a>
  );
}

/**
 * Empfohlene Kurse — shows AI-suggested courses from job.suggested_courses
 * (JSON array). Falls back to a placeholder prompting CV linkage.
 * Each course: { title, platform, duration?, url? }
 */
function CoursesCard({ job, resumeId, onOpenEdit, onGenerate, generating }) {
  const courses = useMemo(() => {
    if (!job.suggested_courses) return null;
    try {
      const p = JSON.parse(job.suggested_courses);
      return Array.isArray(p) && p.length ? p : null;
    } catch { return null; }
  }, [job.suggested_courses]);

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <p className={ANNOT}>Empfohlene Kurse</p>
        {courses ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="text-[11px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] disabled:opacity-50 inline-flex items-center gap-1 transition-colors"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {generating ? "Erstellt…" : `${courses.length} Vorschläge · Neu`}
          </button>
        ) : null}
      </div>
      {courses ? (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {courses.map((c, i) => <CourseRow key={i} course={c} />)}
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] text-[var(--color-fg-dim)] leading-relaxed">
            {resumeId
              ? "Kurse werden auf Basis deines Lebenslaufs und der Stellenbeschreibung vorgeschlagen."
              : "Verknüpfe deinen Lebenslauf — dann schlägt die App passende Kurse für diese Stelle vor."}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            {!resumeId && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="h-8 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.28)", color: "#60a5fa" }}
              >
                Lebenslauf wählen
              </button>
            )}
            {onGenerate && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="h-8 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ background: "rgba(45,212,191,0.10)", border: "1px solid rgba(45,212,191,0.28)", color: "#5eead4" }}
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {generating ? "Wird erstellt…" : "Kurse vorschlagen"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

/** Full job detail surface — pure v7 layout. */
export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedResume, setSelectedResume] = useState(null);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [salaryCompareOpen, setSalaryCompareOpen] = useState(false);
  const matchCardRef = useRef(null);

  const { data: initData } = useQuery({ queryKey: ["init"], enabled: false });

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
    const rid = searchParams.get("resumeId");
    if (rid && selectedResume == null) setSelectedResume(Number(rid));
  }, [searchParams, selectedResume]);

  // ─ Mutations ───────────────────────────────────────────────────────────────

  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); setCoverLetterOpen(true); toast.success("Anschreiben erstellt"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Anschreiben konnte nicht erstellt werden")),
  });

  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches({ ...(queryClient.getQueryData(["jobs", jobId]) || job || {}), ...res.data });
      invalidateJobs();
      toast.success("Gesprächsvorbereitung erstellt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung fehlgeschlagen")),
  });

  const matchMutation = useMutation({
    mutationFn: () => {
      if (!resumeId) throw new Error("Kein Lebenslauf ausgewählt");
      return jobApi.match(Number(jobId), resumeId);
    },
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); toast.success("Passung berechnet"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Passung konnte nicht berechnet werden")),
  });

  const coursesMutation = useMutation({
    mutationFn: () => coursesApi.generate(Number(jobId), resumeId ?? null),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); toast.success("Kursvorschläge erstellt"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Kursvorschläge konnten nicht erstellt werden")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { toast.success("Stelle gelöscht"); navigate("/jobs"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen")),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => jobApi.updateStatus(jobId, status),
    onMutate: (status) => {
      const prev = queryClient.getQueryData(["jobs", jobId]);
      const prevList = queryClient.getQueryData(["jobs"]);
      const optimistic = { ...(prev || job || {}), status };
      queryClient.setQueryData(["jobs", jobId], optimistic);
      queryClient.setQueryData(["jobs", Number(jobId)], optimistic);
      queryClient.setQueryData(["jobs"], (old = []) => old.map(e => String(e.id) === String(jobId) ? optimistic : e));
      return { prev, prevList };
    },
    onSuccess: (res) => updateJobCaches(res.data),
    onError: (err, _status, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["jobs", jobId], ctx.prev);
        queryClient.setQueryData(["jobs", Number(jobId)], ctx.prev);
      }
      if (ctx?.prevList) queryClient.setQueryData(["jobs"], ctx.prevList);
      toast.error(getApiErrorMessage(err, "Status konnte nicht aktualisiert werden"));
    },
  });

  const updateMetaMutation = useMutation({
    mutationFn: async (data) => {
      const calls = [];
      if ("deadline" in data) calls.push(jobApi.updateDeadline(jobId, data.deadline));
      if ("notes"    in data) calls.push(jobApi.updateNotes(jobId, data.notes));
      const results = await Promise.all(calls);
      return results[results.length - 1];
    },
    onSuccess: (res) => { if (res?.data) updateJobCaches(res.data); toast.success("Aktualisiert"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Aktualisierung fehlgeschlagen")),
  });

  const handleResearch = async () => {
    if (job?.research_data) { setResearchData(parseJson(job.research_data)); setResearchOpen(true); return; }
    setResearchData(null); setResearchOpen(true); setResearchLoading(true);
    try {
      const res = await researchApi.research(job?.company || "", job?.description || "");
      setResearchData(res.data);
      updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
    } catch (err) {
      if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
        toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      }
      setResearchOpen(false);
    } finally { setResearchLoading(false); }
  };

  // ─ Loading / not-found ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-[var(--color-fg-dim)] gap-2">
        <Spinner /> <span className="text-[13px]">Wird geladen…</span>
      </div>
    );
  }
  if (!job) {
    return <div className="py-16 text-center text-[var(--color-error)] font-medium">Stelle nicht gefunden.</div>;
  }

  // ─ Derived values ──────────────────────────────────────────────────────────

  const allJobs = queryClient.getQueryData(["jobs"]) || loadStored("jobs") || [];
  const salary       = parseSalary(job.salary_text);
  const hourly       = salary?.unit === "hour" ? salary.amount : null;
  const kvMin        = kvMinimumFor(job.category);
  const monthlyEst   = hourly ? Math.round(hourly * 8 * 4.3) : null; // 8h/week × 4.3 weeks
  const deadlineDays = daysUntil(job.deadline || job.expires_at);
  const showDeadline = deadlineDays !== null;
  const deadlineWarn = deadlineDays !== null && deadlineDays <= 7;
  const urlExpired   = deadlineDays !== null && deadlineDays < 0;
  const [city, ...rest] = (job.location || "").split(",");
  const locRest        = rest.join(",").trim();

  // Count how many KPI tiles will render so we can hide the section when it
  // would only show a lonely single tile (looks broken in 12-col layout).
  const kpiCount =
    (job.location ? 1 : 0) +
    (job.category ? 1 : 0) +
    (showDeadline ? 1 : 0) +
    (job.salary_text && !salary ? 1 : 0);
  const showKpis = kpiCount >= 2;

  const savedAt   = job.created_at;
  const daysSaved = savedAt ? Math.max(0, Math.floor((Date.now() - new Date(savedAt).getTime()) / (1000 * 60 * 60 * 24))) : null;
  const kvMonthly = !salary ? Math.round(kvMin * 15 * 4.3) : null;

  // ─ Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <div key={jobId} className="animate-slide-up">
      {/* ── Sticky toolbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 lg:mx-0 px-5 sm:px-8 lg:px-0 py-2.5 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border-subtle)]">
        <div className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-7 sm:col-span-7 min-w-0 grid grid-cols-[auto_auto_1fr] items-center gap-2">
            <button
              onClick={() => navigate("/jobs")}
              className="grid grid-cols-[auto_auto] items-center gap-1 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Stellen</span>
            </button>
            <ChevronRight className="w-3 h-3 text-[var(--color-fg-faint)]" aria-hidden="true" />
            <p className="text-[12px] text-[var(--color-fg-muted)] truncate">{job.company || "Stelle"}</p>
          </div>
          <div className="col-span-5 sm:col-span-5 justify-self-end flex items-center gap-0.5">
            <StatusMenu status={job.status} onChange={(s) => statusMutation.mutate(s)} pending={statusMutation.isPending} />
            {/* Mobile-only … overflow */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setMobileToolOpen(o => !o)}
                aria-label="Mehr Aktionen"
                className="inline-flex flex-col items-center justify-center gap-0.5 h-10 px-2 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] transition-colors min-w-[32px]"
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                <span className="text-[9px] font-medium leading-none">Mehr</span>
              </button>
              {mobileToolOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] shadow-xl shadow-black/40 py-1 min-w-[160px] animate-slide-up">
                  <button type="button" onClick={() => { setEditOpen(true); setMobileToolOpen(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)]">
                    <Edit3 className="w-3.5 h-3.5 flex-shrink-0" /> Bearbeiten
                  </button>
                  <div className="mx-3 my-1 h-px bg-[var(--color-border-subtle)]" />
                  <button type="button" onClick={() => { if (window.confirm("Stelle wirklich löschen?")) { setMobileToolOpen(false); deleteMutation.mutate(); } }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-bg-elev-3)]">
                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Stelle löschen
                  </button>
                </div>
              )}
            </div>
            <div className="hidden sm:block w-px h-4 mx-1 bg-[var(--color-border-subtle)]" aria-hidden="true" />
            <div className="hidden sm:flex items-center gap-0.5">
              <ToolBtn icon={Edit3} label="Notizen & Lebenslauf" shortLabel="Bearbeiten" onClick={() => setEditOpen(true)} />
              <ToolBtn icon={Trash2} label="Stelle löschen" shortLabel="Löschen" onClick={() => { if (window.confirm("Stelle wirklich löschen?")) deleteMutation.mutate(); }} danger disabled={deleteMutation.isPending} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[760px] mx-auto pt-8 pb-16">

        {/* Identity + role title (matches demo: logo on left, role sans-serif h1) */}
        <div className="flex items-start gap-4">
          <CompanyLogo company={job.company} url={job.url} />
          <div className="min-w-0 flex-1">
            {job.category ? (
              <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-accent-300)] font-semibold">
                {categoryLabel(job.category)}
                {job.job_type ? ` · ${job.job_type}` : ""}
              </p>
            ) : null}
            <h1
              className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)] break-words"
              style={{ letterSpacing: "-0.025em" }}
            >
              {job.role || "Ohne Titel"}
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)] leading-snug">
              {job.company || "—"}
              {job.location ? ` · ${job.location}` : ""}
              {job.salary_text && !salary ? ` · ${job.salary_text}` : ""}
            </p>
          </div>
        </div>

        {/* Quick actions — 2×3 grid */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-2">
          {/* Row 1: AI/analysis actions — subtle tints */}
          <button
            type="button"
            onClick={() => { if (job.cover_letter) setCoverLetterOpen(true); else if (resumeId) coverLetterMutation.mutate(); else setEditOpen(true); }}
            disabled={coverLetterMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(124,125,240,0.07)", borderColor: "rgba(124,125,240,0.22)", color: "var(--color-accent-300)" }}
          >
            <FileText className="w-3 h-3" />
            {coverLetterMutation.isPending ? "Wird erstellt…" : job.cover_letter ? "Anschreiben ansehen" : "Anschreiben erstellen"}
          </button>
          <button
            type="button"
            onClick={() => setInterviewOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(96,165,250,0.07)", borderColor: "rgba(96,165,250,0.22)", color: "#93c5fd" }}
          >
            <MessageSquare className="w-3 h-3" />
            Vorbereitung
          </button>
          <button
            type="button"
            onClick={() => { if (resumeId) matchMutation.mutate(); else toast.error("Wähle zuerst einen Lebenslauf — klick auf \"Lebenslauf wählen\""); }}
            disabled={matchMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(74,222,128,0.07)", borderColor: "rgba(74,222,128,0.22)", color: "#86efac" }}
          >
            {matchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <SearchCheck className="w-3 h-3" />}
            {matchMutation.isPending ? "Wird berechnet…" : "Passung prüfen"}
          </button>
          {/* Row 2: utility actions — neutral */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(167,139,250,0.07)", borderColor: "rgba(167,139,250,0.22)", color: "#c4b5fd" }}
          >
            <FileText className="w-3 h-3" />
            Lebenslauf wählen
          </button>
          <button
            type="button"
            onClick={handleResearch}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(56,189,248,0.07)", borderColor: "rgba(56,189,248,0.22)", color: "#7dd3fc" }}
          >
            <SearchCheck className="w-3 h-3" />
            Recherche
          </button>
          <button
            type="button"
            onClick={() => setSalaryCompareOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors w-full border hover:bg-white/[0.08]"
            style={{ background: "rgba(251,191,36,0.07)", borderColor: "rgba(251,191,36,0.22)", color: "#fde68a" }}
          >
            <BarChart2 className="w-3 h-3" />
            Gehaltsvergleich
          </button>
        </div>


        {/* Story hero — always renders when salary is parseable (hourly,
            monthly, or annual). This is THE serif moment of the page. */}
        {salary ? (
          <section className="mt-7">
            <p className={ANNOT}>
              {salary.unit === "hour"  ? "Verdienst pro Stunde"
              : salary.unit === "month" ? "Verdienst pro Monat"
              : "Jahresgehalt"}
            </p>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <p
                className="leading-none text-[var(--color-fg)]"
                style={{
                  fontFamily: '"Instrument Serif", ui-serif, Georgia, serif',
                  fontSize: "clamp(48px, 8.5vw, 84px)",
                  letterSpacing: "-0.02em",
                }}
              >
                {salary.unit === "hour" ? (
                  <>
                    €{Math.trunc(salary.amount)}
                    <span className="text-[var(--color-fg-dim)]">
                      ,{String(Math.round((salary.amount - Math.trunc(salary.amount)) * 100)).padStart(2, "0")}
                    </span>
                  </>
                ) : salary.max ? (
                  <>
                    €{Math.round(salary.amount / 1000)}k
                    <span className="text-[var(--color-fg-dim)]"> – </span>
                    €{Math.round(salary.max / 1000)}k
                  </>
                ) : (
                  <>€{Math.round(salary.amount / 1000)}k</>
                )}
              </p>
              <p className="text-[14px] text-[var(--color-fg-muted)] pb-2">
                {salary.unit === "hour"  ? `/Stunde · KV ${categoryLabel(job.category)}`
                : salary.unit === "month" ? "/Monat brutto"
                : "/Jahr brutto"}
              </p>
            </div>
            {salary.unit === "hour" && monthlyEst ? (
              <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-md">
                Bei <span className="text-[var(--color-fg)]">8 Stunden pro Woche</span> sind das rund{" "}
                <span className="text-[var(--color-fg)]">€{monthlyEst} im Monat</span> — ohne Sonn- oder Feiertagszuschlag.
              </p>
            ) : salary.unit === "year" && salary.hourly ? (
              <p className="mt-3 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-md">
                Entspricht ungefähr <span className="text-[var(--color-fg)]">€{salary.hourly.toFixed(2)}/Stunde</span>{" "}
                bei 38,5 h/Woche.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* KPI tiles — auto-fit row */}
        {showKpis ? (
          <section className="mt-6 flex flex-wrap gap-3">
            {job.location ? (
              <KpiTile
                label="Standort"
                value={city || job.location}
                hint={locRest || null}
              />
            ) : null}
            {job.category ? (
              <KpiTile
                label="Typ"
                value={categoryLabel(job.category)}
                hint={job.job_type || null}
              />
            ) : null}
            {showDeadline ? (
              <KpiTile
                label="Frist"
                tone={deadlineWarn ? "warn" : "default"}
                value={
                  deadlineDays >= 0
                    ? <>{deadlineDays}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1">Tage</span></>
                    : <>{Math.abs(deadlineDays)}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1">T überfällig</span></>
                }
                hint={job.deadline ? new Date(job.deadline).toLocaleDateString("de-AT") : (job.expires_at ? new Date(job.expires_at).toLocaleDateString("de-AT") : null)}
              />
            ) : null}
            {job.salary_text && !salary ? (
              <KpiTile
                label="Gehalt"
                value={job.salary_text}
              />
            ) : null}
            {daysSaved !== null ? (
              <KpiTile
                label="Gespeichert"
                value={<>{daysSaved}<span className="text-[14px] text-[var(--color-fg-dim)] ml-1">T</span></>}
                hint={savedAt ? `am ${new Date(savedAt).toLocaleDateString("de-AT", { day: "2-digit", month: "numeric" })}` : null}
              />
            ) : null}
          </section>
        ) : null}

        {/* KV bar — uses parsed hourly equivalent (hourly directly, or
            annual/monthly normalised via the 38.5 h/wk baseline). */}
        {salary?.hourly ? (
          <section className="mt-4">
            <KvBar hourly={salary.hourly} kvMin={kvMin} category={job.category} />
          </section>
        ) : null}

        {/* Ähnliche Stellen — salary comparison vs other saved jobs */}
        {salary?.hourly ? (
          <section className="mt-4">
            <SimilarJobsCard currentHourly={salary.hourly} jobs={allJobs} currentId={jobId} />
          </section>
        ) : null}

        {/* KV estimate — only when no salary is stated */}
        {!salary && (
          <section className="mt-4">
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                <p className={ANNOT}>Gehalt · Einschätzung</p>
                <span className="text-[11px] text-[var(--color-fg-dim)]">KV Angestellte 2024</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-[12px] text-[var(--color-fg-dim)] mb-4">
                  Kein Gehalt angegeben — Richtwert laut Kollektivvertrag:
                </p>
                <div className="flex items-end gap-5 mb-5">
                  <p
                    className="leading-none"
                    style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif', fontSize: "52px", letterSpacing: "-0.02em", color: "var(--color-warning)" }}
                  >
                    €{kvMin.toFixed(2)}<span className="text-[20px] text-[var(--color-fg-dim)] ml-1.5">/h</span>
                  </p>
                  {kvMonthly ? (
                    <div className="pb-1">
                      <p className="text-[14px] font-semibold text-[var(--color-fg)]">≈ €{kvMonthly} / Monat</p>
                      <p className="text-[12px] text-[var(--color-fg-dim)] mt-0.5">bei 15 h / Woche</p>
                    </div>
                  ) : null}
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] relative mb-2">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: "49%", background: "var(--color-warning)" }} />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[var(--color-fg)] ring-2 ring-[var(--color-bg)]" style={{ left: "49%" }} />
                </div>
                <div className="flex justify-between tabular-nums text-[11px] text-[var(--color-fg-dim)]">
                  <span>€9,27 gesetzl. Minimum</span>
                  <span className="font-medium" style={{ color: "var(--color-warning)" }}>€{kvMin.toFixed(2)} KV-Richtwert</span>
                  <span>€14,00 Top 10 %</span>
                </div>
                <p className="mt-3 text-[10.5px] text-[var(--color-fg-faint)] flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" aria-hidden="true" />
                  Schätzung auf Basis des KV (WKO, 01/2024) — keine Firmenangabe.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Match card — only rendered after user explicitly triggers Passung prüfen */}
        {job.match_feedback && (
          <section ref={matchCardRef} className="mt-4">
            <MatchCard
              score={job.match_score}
              feedbackJson={job.match_feedback}
              onCheckFit={() => resumeId ? matchMutation.mutate() : setEditOpen(true)}
              onCheckFitPending={matchMutation.isPending}
              resumeId={resumeId}
            />
          </section>
        )}

        {/* Empfohlene Kurse */}
        <section className="mt-4">
          <CoursesCard
            job={job}
            resumeId={resumeId}
            onOpenEdit={() => setEditOpen(true)}
            onGenerate={() => coursesMutation.mutate()}
            generating={coursesMutation.isPending}
          />
        </section>

        {/* Kontext footer */}
        <section className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5">
          <p className={ANNOT}>Einschätzung</p>
          <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            Rückmeldungen dauern bei {job.company || "den meisten Betrieben"} erfahrungsgemäß{" "}
            <span className="text-[var(--color-fg)]">7–14 Werktage</span>.
            Keine Antwort in dieser Zeit ist häufig und sagt nichts über deine Bewerbung aus.
          </p>
        </section>

        {/* Notizen — inline card */}
        {job.notes ? (
          <section className="mt-4">
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                <p className={ANNOT}>Notizen</p>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-[11.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
                >
                  Bearbeiten
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-[13px] text-[var(--color-fg-muted)] leading-relaxed italic">{job.notes}</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Beschreibung — collapsed */}
        {job.description ? (
          <section className="mt-4">
            <details className="group rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]">
              <summary className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-5 py-3.5 cursor-pointer list-none">
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-fg-dim)] group-open:rotate-90 transition-transform" aria-hidden="true" />
                <p className={ANNOT}>Stellenbeschreibung</p>
                <span className="text-[11px] text-[var(--color-fg-dim)]">Einblenden</span>
              </summary>
              <DescriptionBody text={job.description} />
            </details>
          </section>
        ) : null}

        {/* Primary actions */}
        <section className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (job.cover_letter) setCoverLetterOpen(true);
              else if (resumeId) coverLetterMutation.mutate();
              else setEditOpen(true);
            }}
            disabled={coverLetterMutation.isPending}
            className="flex-1 min-w-[200px] h-11 px-5 rounded-xl bg-[var(--color-accent-500)] text-white font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {coverLetterMutation.isPending ? (
              <><Spinner /> Wird erstellt…</>
            ) : job.cover_letter ? (
              <><FileText className="w-4 h-4" /> Anschreiben ansehen</>
            ) : (
              <><FileText className="w-4 h-4" /> Bewerbung schreiben</>
            )}
          </button>
          {job.url ? (
            <button
              type="button"
              onClick={() => {
                window.open(job.url, "_blank", "noopener,noreferrer");
                toast(
                  (t) => (
                    <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                      <span>Nicht mehr verfügbar?</span>
                      <button
                        onClick={() => { toast.dismiss(t.id); deleteMutation.mutate(); }}
                        style={{ fontWeight: 600, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}
                      >Stelle entfernen</button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ color: "#71717a", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12 }}
                      >✕</button>
                    </span>
                  ),
                  { duration: 9000 },
                );
              }}
              className={`h-11 px-5 rounded-xl border text-[13.5px] inline-flex items-center justify-center gap-1.5 transition-colors ${
                urlExpired
                  ? "border-[var(--color-warning)]/40 text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {urlExpired ? "Abgelaufen — Anzeige öffnen" : "Stellenanzeige"}
            </button>
          ) : null}
        </section>
      </div>
    </div>

      {/* ── Modals & sheets ────────────────────────────────────────────────── */}
      <BearbeitenSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        job={job}
        resumes={resumes}
        selectedResume={resumeId}
        onChangeResume={setSelectedResume}
        onSaveMeta={(payload) => updateMetaMutation.mutate(payload)}
        savingMeta={updateMetaMutation.isPending}
      />

      <InterviewSheet
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        job={job}
        mutate={interviewMutation.mutate}
        pending={interviewMutation.isPending}
        resumeId={resumeId}
        escapeHtmlFn={escapeHtml}
      />

      <CoverLetterModal
        open={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        job={job}
      />

      {researchOpen ? (
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
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
              }
            } finally { setResearchLoading(false); }
          }}
          onClose={() => { setResearchOpen(false); setResearchData(null); }}
        />
      ) : null}

      <SalaryCompareModal
        open={salaryCompareOpen}
        onClose={() => setSalaryCompareOpen(false)}
        currentJob={job}
        allJobs={allJobs}
      />
    </>
  );
}

