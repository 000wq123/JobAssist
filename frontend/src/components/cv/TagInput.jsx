import { useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * TagInput — free-text chip input. Enter / comma to commit. Backspace removes
 * the last chip when the field is empty. Optional one-tap suggestion chips below.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string[]} props.value
 * @param {(next: string[]) => void} props.onChange
 * @param {string[]} [props.suggestions]
 * @param {string} [props.placeholder]
 * @param {string} [props.hint]
 * @param {number} [props.max]
 */
export default function TagInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = "Tippen, Enter zum Hinzufügen",
  hint,
  max,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const tags = Array.isArray(value) ? value : [];
  const atCap = max && tags.length >= max;

  const add = (raw) => {
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    if (atCap) return;
    onChange([...tags, t]);
    setDraft("");
  };

  const remove = (t) => onChange(tags.filter((x) => x !== t));

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const remainingSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-[var(--color-fg-muted)]">
          {label}
        </span>
        {max && (
          <span className="text-[11px] text-[var(--color-fg-faint)]">
            {tags.length}/{max}
          </span>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[44px] md:min-h-9 flex flex-wrap gap-1.5 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 py-1.5 focus-within:border-[var(--color-accent-500)] focus-within:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] hover:border-[var(--color-border-strong)] cursor-text"
      >
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-0.5 h-7 pl-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[12px] text-[var(--color-fg)]"
          >
            {t}
            {/* 44px hit area on phones; compact chip via negative margin */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(t);
              }}
              aria-label={`${t} entfernen`}
              className="h-11 w-11 my-auto -mx-1 inline-flex items-center justify-center rounded-full text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={atCap}
          className="flex-1 min-w-[120px] bg-transparent h-11 md:h-7 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none disabled:opacity-50"
        />
      </div>

      {remainingSuggestions.length > 0 && !atCap && (
        <div className="flex flex-wrap gap-2 pt-1">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-[44px] md:min-h-0 md:h-8 px-3 rounded-full border border-dashed border-[var(--color-border)] text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-200)] transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {hint && (
        <p className="text-[12px] text-[var(--color-fg-faint)]">{hint}</p>
      )}
    </div>
  );
}
