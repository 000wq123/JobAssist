import clsx from "clsx";

/**
 * KpiCard — Resend/Linear-style single-metric display.
 *
 * No icon. No icon tile. No uppercase eyebrow. Just:
 *   – Tiny label (sentence-case, muted)
 *   – Gigantic tabular number (44–48 px) — the hero of the card
 *   – Sub-line (delta + meta + optional action)
 *
 * Visual hierarchy comes from typography, not chrome. Accent is reserved for
 * a deliberate signal (`accent` prop) — used at most once per row.
 *
 * Legacy `icon` prop is accepted but ignored to keep callers compiling.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value - Pre-formatted display value (or "—")
 * @param {string} [props.unit] - e.g. "%"
 * @param {string} [props.meta] - Sub-line description
 * @param {{ value: number, positive: boolean }} [props.delta] - Trend delta
 * @param {React.ReactNode} [props.action] - Empty-state CTA
 * @param {boolean} [props.empty] - Renders dim value instead
 * @param {boolean} [props.accent=false] - Tint the value in accent (use sparingly)
 */
export default function KpiCard({
  label,
  value,
  unit,
  meta,
  delta,
  action,
  empty = false,
  accent = false,
  // legacy — accepted, ignored. Will be removed once every caller stops passing it.
  // eslint-disable-next-line no-unused-vars
  icon,
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <span className="text-[12.5px] text-[var(--color-fg-muted)] leading-none">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={clsx(
            "text-[44px] sm:text-[48px] font-semibold leading-[1] tabular-nums",
            empty
              ? "text-[var(--color-fg-faint)]"
              : accent
                ? "text-[var(--color-accent-300)]"
                : "text-[var(--color-fg)]",
          )}
          style={{ letterSpacing: "-0.035em" }}
        >
          {value}
        </span>
        {!empty && unit && (
          <span className="text-[20px] sm:text-[22px] font-medium leading-none text-[var(--color-fg-dim)] tabular-nums">
            {unit}
          </span>
        )}
      </div>
      {(delta || meta || (action && empty)) && (
        <div className="flex items-center gap-2 min-h-[16px] text-[12px] mt-0.5">
          {delta && (
            <span
              className={clsx(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                delta.positive ? "text-[var(--color-success)]" : "text-[var(--color-warning)]",
              )}
            >
              {delta.positive ? "↑" : "↓"} {Math.abs(delta.value)}
              {unit}
            </span>
          )}
          {action && empty ? (
            action
          ) : (
            meta && <span className="text-[var(--color-fg-dim)] truncate">{meta}</span>
          )}
        </div>
      )}
    </div>
  );
}
