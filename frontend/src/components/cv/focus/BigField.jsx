import { forwardRef } from "react";

/**
 * BigField — the focus-mode equivalent of <Input>. 54px tall, no label
 * (the scene's question IS the label), generous padding, accent border
 * on focus.
 *
 * @typedef {object} BigFieldProps
 * @property {string} [value]
 * @property {(v:string) => void} onChange
 * @property {string} [placeholder]
 * @property {string} [type]
 * @property {string} [inputMode]
 * @property {string} [autoComplete]
 * @property {number} [maxLength]
 * @property {string} [error]
 * @property {string} [center]      - if "true", centers the text (date cells)
 * @property {string} [className]
 *
 * @type {React.ForwardRefExoticComponent<BigFieldProps & React.RefAttributes<HTMLInputElement>>}
 */
const BigField = forwardRef(function BigField(props, ref) {
  const {
    value = "",
    onChange,
    placeholder,
    type = "text",
    inputMode,
    autoComplete,
    maxLength,
    error,
    center,
    className = "",
  } = props;

  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      aria-invalid={!!error || undefined}
      className={
        "w-full h-[54px] rounded-[14px] px-[18px] text-[16px] outline-none " +
        "bg-[var(--color-bg-input)] border text-[var(--color-fg)] " +
        "placeholder:text-[var(--color-fg-faint)] " +
        "transition-colors duration-150 " +
        (error
          ? "border-[var(--color-error)]"
          : "border-[var(--color-border)] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-bg-elev-1)]") +
        (center === "true" ? " text-center text-[20px]" : "") +
        " " + className
      }
    />
  );
});

export default BigField;
