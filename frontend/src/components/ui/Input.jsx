import { forwardRef } from "react";
import clsx from "clsx";

const SIZE_CLS = {
  sm: "h-8 px-2.5 text-[13px] rounded-md",
  md: "h-9 px-3 text-[13px] rounded-md",
  lg: "h-10 px-3.5 text-sm rounded-lg",
};

/**
 * Input primitive — text inputs, search, email, password, etc.
 * Uses border + bg-input pattern (no shadows, no gradients).
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {React.ReactNode} [props.leadingIcon]
 * @param {React.ReactNode} [props.trailingIcon]
 * @param {boolean} [props.invalid]
 * @param {string} [props.className]
 */
const Input = forwardRef(function Input(
  { size = "md", leadingIcon, trailingIcon, invalid = false, className = "", ...rest },
  ref,
) {
  const inputElement = (
    <input
      ref={ref}
      className={clsx(
        "w-full bg-[var(--color-bg-input)] text-[var(--color-fg)]",
        "border placeholder:text-[var(--color-fg-faint)]",
        "transition-colors duration-150",
        "focus:outline-none focus:bg-[var(--color-bg-elev-1)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        invalid
          ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)]",
        SIZE_CLS[size],
        leadingIcon && "pl-9",
        trailingIcon && "pr-9",
        className,
      )}
      {...rest}
    />
  );

  if (!leadingIcon && !trailingIcon) return inputElement;

  return (
    <div className="relative w-full">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-dim)]">
          {leadingIcon}
        </span>
      )}
      {inputElement}
      {trailingIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-dim)]">
          {trailingIcon}
        </span>
      )}
    </div>
  );
});

export default Input;
