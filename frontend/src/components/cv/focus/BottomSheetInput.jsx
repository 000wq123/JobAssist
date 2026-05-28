import { useEffect, useRef, useState } from "react";

/**
 * BottomSheetInput — bottom-anchored modal input. Replaces window.prompt.
 * Slides up from the viewport bottom. Single text field with submit/cancel.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} [props.placeholder]
 * @param {string} [props.initialValue]
 * @param {() => void} props.onCancel
 * @param {(value: string) => void} props.onSubmit
 */
export default function BottomSheetInput({
  open,
  title,
  placeholder,
  initialValue = "",
  onCancel,
  onSubmit,
}) {
  const [v, setV] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setV(initialValue);
      // Focus shortly after mount so the slide-in animation can play.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60"
      />
      <div className="absolute left-0 right-0 bottom-0 mx-auto max-w-[480px] bg-[var(--color-bg-elev-1)] border-t border-[var(--color-border)] rounded-t-[20px] p-5 pb-7 animate-[slideUp_0.22s_ease]">
        <p className="text-[13px] text-[var(--color-fg-muted)] mb-3">{title}</p>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-[48px] rounded-[12px] px-4 text-[15px] bg-[var(--color-bg-input)] border border-[var(--color-border)] focus:border-[var(--color-accent-500)] outline-none text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]"
          />
          <button
            type="submit"
            disabled={!v.trim()}
            className="h-[48px] px-5 rounded-[12px] bg-[var(--color-accent-500)] text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </form>
        <button
          type="button"
          onClick={onCancel}
          className="block mx-auto mt-3 text-[12.5px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] py-1.5 px-2.5"
        >
          abbrechen
        </button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
