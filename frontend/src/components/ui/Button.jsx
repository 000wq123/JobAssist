import { forwardRef } from "react";
import clsx from "clsx";

/**
 * Variant classes — borders, not shadows. Single accent. No gradients.
 */
const VARIANT_CLS = {
  primary:
    "bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-400)] active:bg-[var(--color-accent-600)] " +
    "disabled:bg-[var(--color-accent-500)]/40 disabled:cursor-not-allowed",
  secondary:
    "bg-[var(--color-bg-elev-1)] text-[var(--color-fg)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-border-strong)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-[var(--color-bg-elev-1)] text-[var(--color-error)] border border-[var(--color-error)]/30 " +
    "hover:bg-[var(--color-error)]/10 hover:border-[var(--color-error)]/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  link:
    "text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] underline-offset-2 hover:underline " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE_CLS = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-4 text-[13px] gap-2 rounded-md",
  lg: "h-10 px-5 text-sm gap-2 rounded-lg",
};

/**
 * Shared button component with primary / secondary / ghost / danger / link variants.
 *
 * Design principles:
 * - Borders, not shadows
 * - Single accent color (no gradients)
 * - Color-shift on hover (no transform/lift)
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'link'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth] - Stretch to the parent's width.
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
        "transition-colors duration-150",
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
