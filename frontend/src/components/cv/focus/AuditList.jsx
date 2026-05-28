import { Check, AlertTriangle, Info, X } from "lucide-react";

/**
 * AuditList — renders the Konformitäts-Check rules list.
 *
 * @param {object} props
 * @param {import("../../../cv/audit").AuditResult[]} props.results
 * @param {(id: string) => void} [props.onFix]   - invoked when a fixHint is tapped
 */
export default function AuditList({ results, onFix }) {
  return (
    <div>
      {results.map((r) => (
        <Row key={r.id} r={r} onFix={onFix} />
      ))}
    </div>
  );
}

/** @param {{ r: import("../../../cv/audit").AuditResult, onFix?: (id:string)=>void }} props */
function Row({ r, onFix }) {
  const { sev, color } = sevTokens(r.severity);
  return (
    <div className="flex items-start gap-3 py-[11px] border-b border-[var(--color-border-subtle)] last:border-b-0 text-[13.5px] leading-[1.45] text-[var(--color-fg)]">
      <span
        className={
          "w-5 h-5 flex-shrink-0 mt-[1px] inline-flex items-center justify-center rounded-full border " +
          color
        }
        aria-label={sev}
      >
        {iconFor(r.severity)}
      </span>
      <div className="flex-1">
        <div>
          {r.label}
          {r.severity === "ok" && r.detail && (
            <span className="text-[var(--color-fg-muted)] text-[12px]"> · {r.detail}</span>
          )}
        </div>
        {r.severity !== "ok" && r.detail && (
          <div className="text-[var(--color-fg-muted)] text-[12px] mt-[2px]">{r.detail}</div>
        )}
        {r.fixHint && onFix && (
          <button
            type="button"
            onClick={() => onFix(r.id)}
            className="inline-block mt-1 text-[var(--color-accent-300)] text-[12px] hover:underline"
          >
            {r.fixHint}
          </button>
        )}
      </div>
    </div>
  );
}

function sevTokens(severity) {
  switch (severity) {
    case "ok":
      return { sev: "ok", color: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/30" };
    case "warn":
      return { sev: "warn", color: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/30" };
    case "fail":
      return { sev: "fail", color: "bg-[var(--color-error-soft)] text-[var(--color-error)] border-[var(--color-error)]/30" };
    default:
      return { sev: "info", color: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info)]/30" };
  }
}

function iconFor(severity) {
  switch (severity) {
    case "ok":   return <Check className="w-3 h-3" strokeWidth={3} />;
    case "warn": return <AlertTriangle className="w-3 h-3" strokeWidth={3} />;
    case "fail": return <X className="w-3 h-3" strokeWidth={3} />;
    default:     return <Info className="w-3 h-3" strokeWidth={3} />;
  }
}
