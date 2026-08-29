/**
 * Small UI primitives shared across the job detail surface.
 * Simple, calm: no display-serif numbers, no KPI tiles.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const ANNOT = "text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium";

/** Shared focus ring for interactive elements. */
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] cursor-pointer";

/** Inline loading spinner used inside buttons. */
export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
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
    <div>
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">
        {expanded ? full : preview}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`mt-2.5 inline-flex items-center gap-1 text-[12px] text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] transition-colors ${FOCUS}`}
        >
          {expanded ? "Menos" : "Mehr anzeigen"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Compact label/value row used for quick facts. */
export function FactItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon className="w-4 h-4 mt-0.5 text-[var(--color-fg-dim)] flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-dim)]">{label}</p>
        <p className="text-[13.5px] text-[var(--color-fg)] truncate">{children}</p>
      </div>
    </div>
  );
}

/** Section divider used between major blocks. */
export function Divider() {
  return <hr className="my-7 border-[var(--color-border-subtle)]" />;
}

/** Section label (eyebrow) — small, muted, uppercase. */
export function SectionLabel({ children }) {
  return <p className="text-[11px] tracking-[0.10em] uppercase text-[var(--color-fg-dim)] font-medium">{children}</p>;
}

/**
 * Why-it-could-fit section — replaces the old percentage match card.
 * Renders concise strengths from the stored AI feedback (no percentage),
 * plus an optional compact missing-experience subsection.
 */
export function FitSection({ feedbackJson, onRecheck, recheckPending, resumeId }) {
  let parsed = null;
  if (feedbackJson) {
    try { const obj = JSON.parse(feedbackJson); if (obj && typeof obj === "object") parsed = obj; } catch { /* ignore */ }
  }

  const strengths = (parsed?.strengths || []).slice(0, 6);
  const gaps = (parsed?.gaps || []).slice(0, 3);
  const hasContent = strengths.length > 0 || gaps.length > 0;

  if (!hasContent) {
    return (
      <section aria-label="Warum es passen könnte">
        <SectionLabel>Warum es passen könnte</SectionLabel>
        <p className="mt-2.5 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
          {resumeId
            ? "Berechne die Passung, um zu sehen, warum diese Stelle zu dir passen könnte."
            : "Verknüpfe deinen Lebenslauf, damit eine Passungsanalyse möglich ist."}
        </p>
        {onRecheck && (
          <button
            type="button"
            onClick={onRecheck}
            disabled={recheckPending}
            className={`mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] transition-colors disabled:opacity-50 ${FOCUS}`}
          >
            {recheckPending ? <><Spinner />Wird geprüft…</> : "Passung prüfen →"}
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Warum es passen könnte">
      <SectionLabel>Warum es passen könnte</SectionLabel>
      <ul className="mt-2.5 space-y-2">
        {strengths.map((s, i) => (
          <li key={`s${i}`} className="flex gap-2.5 items-start text-[13.5px] text-[var(--color-fg-muted)] leading-relaxed">
            <span className="text-[var(--color-success)] flex-shrink-0 font-bold mt-0.5 text-[12px]" aria-hidden="true">✓</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      {gaps.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] text-[var(--color-fg-dim)]">Noch nicht im Lebenslauf erkennbar</p>
          <p className="mt-1 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {gaps.map((g, i) => (
              <span key={`g${i}`}>
                {g}{i < gaps.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
