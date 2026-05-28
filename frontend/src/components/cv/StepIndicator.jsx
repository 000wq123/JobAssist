import clsx from "clsx";

/**
 * Calm step indicator — text first, dots second, no progress bar.
 * @param {object} props
 * @param {number} props.current  0-indexed
 * @param {{id:string,label:string}[]} props.steps
 */
export default function StepIndicator({ current, steps }) {
  const total = steps.length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">
        Schritt {current + 1} von {total}
      </p>
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.id}
            aria-hidden
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i < current && "bg-[var(--color-accent-500)]/60",
              i === current && "bg-[var(--color-accent-500)]",
              i > current && "bg-[var(--color-border)]",
            )}
          />
        ))}
      </div>
      <p className="text-base font-semibold text-[var(--color-fg)]">
        {steps[current]?.label}
      </p>
    </div>
  );
}
