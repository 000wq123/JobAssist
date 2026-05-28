import clsx from "clsx";

/**
 * Badge — small status indicator. Subtle, uses tokens, no uppercase by default.
 *
 * @param {object} props
 * @param {'neutral'|'accent'|'success'|'warning'|'error'|'info'} [props.variant='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
const VARIANT_CLS = {
  neutral: "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] border border-[var(--color-border)]",
  accent:  "bg-[var(--color-accent-500)]/10 text-[var(--color-accent-300)] border border-[var(--color-accent-500)]/20",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/20",
  error:   "bg-[var(--color-error-soft)] text-[var(--color-error)] border border-[var(--color-error)]/20",
  info:    "bg-[var(--color-info-soft)] text-[var(--color-info)] border border-[var(--color-info)]/20",
};

const SIZE_CLS = {
  sm: "h-5 px-1.5 text-[10px] gap-1 rounded",
  md: "h-6 px-2 text-[11px] gap-1.5 rounded-md",
};

export default function Badge({ variant = "neutral", size = "md", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium tabular-nums whitespace-nowrap",
        SIZE_CLS[size],
        VARIANT_CLS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
