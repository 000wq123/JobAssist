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
          className={`mt-2.5 min-h-8 sm:min-h-0 inline-flex items-center gap-1 text-[12px] text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] transition-colors ${FOCUS}`}
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
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

/** Calm section heading used across the job-detail surface. */
export function SectionLabel({ children }) {
  return <p className="text-[13px] text-[var(--color-fg)] font-semibold">{children}</p>;
}

/**
 * Why-it-could-fit section — REMOVED: students don't need to know why a job
 * matches them, so the fit-check feature (and its AI cost) is gone.
 */
