import { forwardRef } from "react";

const VARIANT_CLS = {
  primary:
    "bg-gradient-to-r from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/30 " +
    "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
  secondary:
    "border border-white/10 bg-white/5 text-slate-200 " +
    "hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "text-slate-300 hover:bg-white/5 hover:text-white " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "border border-red-500/20 bg-red-500/10 text-red-300 " +
    "hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE_CLS = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-base gap-2",
};

/**
 * Shared button component with primary / secondary / ghost / danger variants.
 *
 * Prefer this over hand-rolling Tailwind-utility buttons in new code so the app
 * has a consistent CTA style and one place to evolve hover / focus / disabled states.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='primary']
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
      className={[
        "inline-flex items-center justify-center rounded-xl font-semibold",
        "transition-all duration-200 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        SIZE_CLS[size],
        VARIANT_CLS[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
