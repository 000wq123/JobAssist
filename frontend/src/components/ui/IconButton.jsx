import { forwardRef } from "react";
import clsx from "clsx";

const SIZE_CLS = {
  sm: "w-7 h-7 rounded-md",
  md: "w-9 h-9 rounded-md",
  lg: "w-10 h-10 rounded-lg",
};

const VARIANT_CLS = {
  ghost:
    "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]",
  secondary:
    "bg-[var(--color-bg-elev-1)] text-[var(--color-fg)] border border-[var(--color-border)] " +
    "hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-border-strong)]",
};

/**
 * IconButton — square button containing only an icon.
 *
 * @param {object} props
 * @param {'ghost'|'secondary'} [props.variant='ghost']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {React.ReactNode} props.children - Icon element
 * @param {string} props['aria-label'] - Required for a11y
 */
const IconButton = forwardRef(function IconButton(
  { variant = "ghost", size = "md", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center transition-colors",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        SIZE_CLS[size],
        VARIANT_CLS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
