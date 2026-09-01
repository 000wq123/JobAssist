import Input from "../ui/Input";

/**
 * Labelled form field used in the CV wizard. Calm dark surface, single-column,
 * accessible label + error pairing.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.name
 * @param {string} [props.value]
 * @param {(v:string) => void} props.onChange
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {string} [props.placeholder]
 * @param {string} [props.type]       defaults to "text"
 * @param {boolean} [props.required]
 * @param {React.ReactNode} [props.prefix]
 * @param {React.ReactNode} [props.leadingIcon]
 * @param {number} [props.maxLength]
 * @param {string} [props.autoComplete]
 * @param {'numeric'|'tel'|'decimal'|'email'|'url'|'search'|'none'|'text'} [props.inputMode]
 * @param {string} [props.pattern]
 */
export default function Field({
  label,
  name,
  value = "",
  onChange,
  error,
  hint,
  placeholder,
  type = "text",
  required = false,
  prefix,
  leadingIcon,
  maxLength,
  autoComplete,
  inputMode,
  pattern,
}) {
  const id = `cv-${name}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-medium text-[var(--color-fg-muted)]"
      >
        {label}
        {required && <span className="text-[var(--color-accent-300)] ml-1">*</span>}
      </label>

      {prefix ? (
        <div className="flex items-stretch rounded-md border border-[var(--color-border)] focus-within:border-[var(--color-accent-500)] focus-within:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] bg-[var(--color-bg-input)] overflow-hidden">
          <span className="flex items-center px-3 text-[13px] text-[var(--color-fg-dim)] border-r border-[var(--color-border)]">
            {prefix}
          </span>
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete={autoComplete}
            inputMode={inputMode}
            pattern={pattern}
            aria-invalid={!!error || undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            className="flex-1 min-w-0 bg-transparent px-3 h-9 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none"
          />
        </div>
      ) : (
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          pattern={pattern}
          invalid={!!error}
          leadingIcon={leadingIcon}
          aria-invalid={!!error || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
        />
      )}

      {error && (
        <p id={`${id}-err`} className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-[12px] text-[var(--color-fg-faint)]">
          {hint}
        </p>
      )}
    </div>
  );
}
