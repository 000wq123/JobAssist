/**
 * ChoiceCard — large tappable card for binary or single-select choices.
 * Pflichtpraktikum yes/no, Berufserfahrung yes/no use this.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} props.selected
 * @param {() => void} props.onClick
 * @param {React.ReactNode} [props.summary]   - shown inside the card when selected
 */
export default function ChoiceCard({ title, subtitle, selected, onClick, summary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "w-full text-left p-[18px] rounded-[14px] border transition-colors " +
        (selected
          ? "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)]"
          : "bg-[var(--color-bg-elev-1)] border-[var(--color-border)] hover:bg-[var(--color-bg-elev-2)]")
      }
    >
      <div className="text-[15px] font-semibold text-[var(--color-fg)]">{title}</div>
      {subtitle && (
        <div className="text-[12.5px] text-[var(--color-fg-muted)] mt-1 leading-[1.45]">
          {subtitle}
        </div>
      )}
      {selected && summary && (
        <div className="mt-3 p-[10px_12px] rounded-[10px] bg-black/25 border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] leading-[1.5]">
          {summary}
        </div>
      )}
    </button>
  );
}
