import { MapPin, Clock, ExternalLink, Bookmark, BookmarkCheck, ArrowRight } from "lucide-react";
import clsx from "clsx";
import CompanyLogo from "../job-detail/CompanyLogo";

/**
 * Formats relative time in German (de-AT).
 */
function timeAgo(date) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7) return `Vor ${days} Tagen`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Vor ${w} ${w === 1 ? "Woche" : "Wochen"}`;
  }
  const m = Math.floor(days / 30);
  return `Vor ${m} ${m === 1 ? "Monat" : "Monaten"}`;
}

/** Status pill metadata: label + tonal classes (text + tinted bg + border). */
const STATUS_PILL = {
  bookmarked:   { label: "Gemerkt",     cls: "text-[#f59e0b] bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.28)]" },
  applied:      { label: "Beworben",    cls: "text-[var(--color-success)]   bg-[var(--color-success-soft)] border-[var(--color-success)]/25" },
  interviewing: { label: "Im Gespräch", cls: "text-[#60a5fa]               bg-[#60a5fa]/10                border-[#60a5fa]/25" },
  offered:      { label: "Angebot",     cls: "text-[var(--color-success)]   bg-[var(--color-success-soft)] border-[var(--color-success)]/25" },
  rejected:     { label: "Abgelehnt",   cls: "text-[var(--color-error)]     bg-[var(--color-error-soft)]   border-[var(--color-error)]/25" },
};

/**
 * JobRow — single job listing row with company avatar tile, title, metadata
 * chips, match-score pill, and quick actions. Visual language matches the
 * marketing-page card aesthetic (rounded-xl, accent hover, soft borders).
 *
 * @param {object} props
 * @param {{ id?: string, source_id?: string, title?: string, role?: string, company?: string, location?: string, updated?: string, created_at?: string, status?: string, jobType?: string, full_url?: string, url?: string }} props.job
 * @param {() => void} [props.onClick]
 * @param {() => void} [props.onSave]
 * @param {boolean} [props.isSaved]
 * @param {boolean} [props.saving]
 * @param {boolean} [props.compact] - Hide secondary actions
 */
export default function JobRow({ job, onClick, onSave, isSaved = false, saving = false, compact = false }) {
  const title = job.role || job.title || "Ohne Titel";
  const company = job.company || "Unbekannt";
  const url = job.full_url || job.url;
  const date = timeAgo(job.updated || job.created_at);
  const status = STATUS_PILL[job.status];

  return (
    <div
      className={clsx(
        "group flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-xl",
        "border border-transparent",
        "hover:bg-[var(--color-bg-elev-1)]",
        "transition-colors duration-150",
      )}
    >
      {/* Company logo tile */}
      <CompanyLogo company={company} url={url} size="sm" />

      {/* Title + meta */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)] rounded"
      >
        <div className="text-[14px] font-semibold text-[var(--color-fg)] truncate group-hover:text-[var(--color-fg)]">
          {title}
        </div>
        <div className="mt-0.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-[12px] text-[var(--color-fg-dim)]">
          <span className="font-medium text-[var(--color-fg-muted)] truncate max-w-[200px]">{company}</span>
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </span>
          )}
          {job.jobType && <span>{job.jobType}</span>}
          {date && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {date}
            </span>
          )}
        </div>
      </button>

      {/* Status pill (saved jobs only) — visible on all breakpoints */}
      {status && (
        <span
          className={clsx(
            "inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium border whitespace-nowrap flex-shrink-0",
            status.cls,
          )}
        >
          {status.label}
        </span>
      )}

      {/* Actions — compact icons, ≥44px tappable wrappers on phones */}
      <div className="flex items-center -mx-1 sm:mx-0">
        {!compact && onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isSaved}
            className={clsx(
              "grid place-items-center w-11 h-11 sm:w-8 sm:h-8 rounded-md transition-colors",
              isSaved
                ? "text-[var(--color-accent-300)]"
                : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)]",
              "disabled:opacity-50",
            )}
            aria-label={isSaved ? "Gespeichert" : "Speichern"}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        )}
        {url && !compact && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:grid w-8 h-8 place-items-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
            aria-label="Original öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onClick}
          className="grid place-items-center w-11 h-11 sm:w-8 sm:h-8 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
          aria-label="Details"
        >
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
