import { useState } from "react";
import BottomSheetInput from "./BottomSheetInput";

/**
 * ChipPickerV2 — focus-mode chip picker.
 * Multi- or single-select. Open list: every cluster ends with a dashed
 * "+ Eigene" button that opens a bottom-sheet input. Custom values
 * appear as removable tags with an inline ×.
 *
 * Single-select chips clear other selections (radio-group semantics).
 *
 * @template T
 * @param {object} props
 * @param {{value: string, label: string}[]} props.options   - canonical options
 * @param {string[] | string} props.value
 * @param {(next: string[] | string) => void} props.onChange
 * @param {boolean} [props.multiple]
 * @param {number} [props.max]
 * @param {boolean} [props.allowCustom]              - render "+ Eigene"
 * @param {string} [props.customLabel]               - copy for the dashed button
 * @param {string} [props.customPrompt]              - bottom-sheet question copy
 * @param {"flow"|"cols2"|"cols3"} [props.layout]    - chip grid style
 */
export default function ChipPickerV2({
  options,
  value,
  onChange,
  multiple = false,
  max,
  allowCustom = false,
  customLabel = "+ Eigene",
  customPrompt = "Eigene Antwort hinzufügen",
  layout = "flow",
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const arr = multiple
    ? Array.isArray(value) ? value : []
    : value ? [value] : [];
  const isSelected = (v) => arr.includes(v);
  const atCap = multiple && max && arr.length >= max;

  // Distinguish: a "custom" chip is anything in the value list that isn't
  // among the canonical option values. We render those at the end.
  const canonicalSet = new Set(options.map((o) => o.value));
  const customs = multiple ? arr.filter((v) => !canonicalSet.has(v)) : [];

  const toggle = (v) => {
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      if (cur.includes(v)) onChange(cur.filter((x) => x !== v));
      else if (!atCap) onChange([...cur, v]);
    } else {
      onChange(value === v ? "" : v);
    }
  };

  const addCustom = (label) => {
    const t = (label || "").trim();
    if (!t) return;
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      if (!cur.includes(t) && !atCap) onChange([...cur, t]);
    } else {
      onChange(t);
    }
  };

  const gridClass = layout === "cols2"
    ? "grid grid-cols-2 gap-[10px]"
    : layout === "cols3"
    ? "grid grid-cols-3 gap-[10px]"
    : "flex flex-wrap gap-2";

  const baseChip = layout === "flow"
    ? "min-h-[38px] px-[14px] rounded-full text-[13.5px]"
    : "min-h-[52px] px-[18px] rounded-[14px] text-[14.5px]";

  return (
    <>
      <div className={gridClass} role={multiple ? "group" : "radiogroup"}>
        {options.map((o) => {
          const selected = isSelected(o.value);
          const disabled = !selected && atCap;
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              disabled={disabled || undefined}
              onClick={() => toggle(o.value)}
              className={
                baseChip + " font-medium border transition-colors inline-flex items-center justify-center " +
                (selected
                  ? "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)] text-[var(--color-fg)]"
                  : "bg-[var(--color-bg-elev-1)] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)]") +
                (disabled ? " opacity-40 cursor-not-allowed" : "")
              }
            >
              {o.label}
            </button>
          );
        })}

        {customs.map((v) => (
          <button
            key={"custom-" + v}
            type="button"
            onClick={() => toggle(v)}
            className={
              baseChip + " font-medium border inline-flex items-center justify-center gap-2 pr-[10px] " +
              "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)] text-[var(--color-fg)]"
            }
          >
            <span>{v}</span>
            <span
              className="inline-flex w-[18px] h-[18px] items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] text-[13px] leading-none"
              aria-label="Entfernen"
            >×</span>
          </button>
        ))}

        {allowCustom && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={atCap || undefined}
            className={
              baseChip + " font-medium border border-dashed inline-flex items-center justify-center " +
              "bg-transparent border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] " +
              (atCap ? " opacity-40 cursor-not-allowed" : "")
            }
          >
            {customLabel}
          </button>
        )}
      </div>

      {multiple && max && (
        <p className="mt-4 text-[11px] font-mono text-[var(--color-fg-faint)] tabular-nums">
          {arr.length} / {max} ausgewählt
        </p>
      )}

      <BottomSheetInput
        open={sheetOpen}
        title={customPrompt}
        placeholder="z. B. Erste-Hilfe-Schein"
        onCancel={() => setSheetOpen(false)}
        onSubmit={(v) => { addCustom(v); setSheetOpen(false); }}
      />
    </>
  );
}
