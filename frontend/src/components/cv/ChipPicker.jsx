/**
 * ChipPicker — pill-shaped selectable chips for single- or multi-select inputs.
 * Calm: borders not shadows, single accent, color-shift on select.
 *
 * @template T
 * @param {object} props
 * @param {string} props.label
 * @param {{value: T, label: string}[]} props.options
 * @param {T | T[]} props.value
 * @param {(next: T | T[]) => void} props.onChange
 * @param {boolean} [props.multiple]
 * @param {number} [props.max]            cap selections (multi only)
 * @param {string} [props.hint]
 * @param {string} [props.error]
 */
export default function ChipPicker({
  label,
  options,
  value,
  onChange,
  multiple = false,
  max,
  hint,
  error,
}) {
  const selectedSet = multiple
    ? new Set(Array.isArray(value) ? value : [])
    : new Set(value !== undefined && value !== null ? [value] : []);

  const handleClick = (v) => {
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      if (cur.includes(v)) {
        onChange(cur.filter((x) => x !== v));
      } else {
        if (max && cur.length >= max) return;
        onChange([...cur, v]);
      }
    } else {
      onChange(value === v ? null : v);
    }
  };

  const atCap =
    multiple && max && Array.isArray(value) && value.length >= max;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-[var(--color-fg-muted)]">
          {label}
        </span>
        {multiple && max && (
          <span className="text-[11px] text-[var(--color-fg-faint)]">
            {(Array.isArray(value) ? value.length : 0)}/{max}
          </span>
        )}
      </div>

      <div role={multiple ? "group" : "radiogroup"} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = selectedSet.has(o.value);
          const disabled = !selected && atCap;
          return (
            <button
              key={String(o.value)}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              onClick={() => handleClick(o.value)}
              className={
                "min-h-[36px] px-3.5 rounded-full border text-[13px] font-medium transition-colors " +
                (selected
                  ? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/15 text-[var(--color-accent-200)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]") +
                (disabled ? " opacity-40 cursor-not-allowed" : "")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {error && <p className="text-[12px] text-[var(--color-error)]">{error}</p>}
      {!error && hint && (
        <p className="text-[12px] text-[var(--color-fg-faint)]">{hint}</p>
      )}
    </div>
  );
}
