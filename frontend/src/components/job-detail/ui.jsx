/**
 * Small UI primitives shared across the job detail surface.
 */

import { useState } from "react";

export const ANNOT = "text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium";

/** Inline loading spinner used inside buttons. */
export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
}

/** Labelled toolbar button — icon on top, short text below. */
export function ToolBtn({ icon: Icon, label, shortLabel, onClick, danger, disabled }) {
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

/** Truncates text at a sentence boundary (ends with . ! ?) up to ~maxChars. */
export function truncateAtSentence(text, maxChars = 420) {
  if (!text || text.length <= maxChars) return { preview: text, full: text, truncated: false };
  const sub = text.slice(0, maxChars);
  const last = Math.max(sub.lastIndexOf(". "), sub.lastIndexOf(".\n"), sub.lastIndexOf("! "), sub.lastIndexOf("? "));
  const cutAt = last > maxChars * 0.45 ? last + 1 : maxChars;
  return { preview: sub.slice(0, cutAt).trimEnd(), full: text, truncated: true };
}

/** Expandable job description body with sentence-boundary preview. */
export function DescriptionBody({ text }) {
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
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      )}
    </div>
  );
}

/** KPI tile — renders inside a flex row so tiles auto-fill regardless of count. */
export function KpiTile({ label, value, hint, tone = "default" }) {
  const toneClass = tone === "warn" ? "text-[var(--color-warning)]" : "text-[var(--color-fg)]";
  return (
    <div className="flex-1 min-w-[160px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-5 pt-4 pb-3.5">
      <p className="text-[12px] tracking-[0.07em] uppercase text-[var(--color-fg-dim)] font-semibold">{label}</p>
      <p
        className={`mt-2.5 leading-none tabular-nums ${toneClass}`}
        style={{ fontFamily: '"Instrument Serif", ui-serif, Georgia, serif', fontSize: "32px", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12.5px] text-[var(--color-fg-dim)]">{hint}</p> : null}
    </div>
  );
}
