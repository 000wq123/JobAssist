import { forwardRef } from "react";
import clsx from "clsx";

/**
 * Variant classes — borders not shadows, single accent, no gradients.
 * Dark-first: all surfaces assume the dark design system.
 */
const VARIANT_CLS = {
  primary:
    "bg-[var(--color-accent-500)] text-white " +
    "hover:bg-[var(--color-accent-400)] active:bg-[var(--color-accent-600)] " +
    "disabled:bg-[var(--color-accent-500)]/30 disabled:cursor-not-allowed",
  secondary:
    "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-bg-elev-3)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "bg-[var(--color-bg-elev-2)] text-[var(--color-error)] border border-[var(--color-error)]/25 " +
    "hover:bg-[var(--color-error)]/10 hover:border-[var(--color-error)]/40 " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  link:
    "text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] underline-offset-2 hover:underline " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
};

const SIZE_CLS = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-8 px-3.5 text-[13px] gap-2 rounded-md",
  lg: "h-9 px-5 text-[13.5px] gap-2 rounded-md",
};

/**
 * Shared button component.
 *
 * Design principles:
 * - Borders not shadows
 * - Single accent color (no gradients on interactive elements)
 * - Color-shift on hover (no transform/lift)
 * - Dark-first surfaces
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'link'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
const Button = forwardRef(function Button(
  { variant = "primary", size = "md", fullWidth = false, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center font-semibold",
        "transition-colors duration-100",
        // ≥44px hit area on phones (defined in index.css); desktop keeps the
        // compact size scale.
        "tap-44",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
        SIZE_CLS[size],
        VARIANT_CLS[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
