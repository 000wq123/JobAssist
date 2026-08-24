import clsx from "clsx";

/**
 * SkillBars — horizontal progress bars for skill dimensions.
 * Replaces the radar chart. Easier to read, more honest.
 *
 * @param {object} props
 * @param {Array<{label: string, value: number, key?: string}>} props.skills
 * @param {string} [props.className]
 */
export default function SkillBars({ skills, className = "" }) {
  return (
    <div className={clsx("grid grid-cols-1 gap-3", className)}>
      {skills.map((s) => {
        const v = Math.max(0, Math.min(100, s.value));
        const color =
          v >= 70 ? "var(--color-success)"
          : v >= 50 ? "var(--color-accent-500)"
          : v >= 35 ? "var(--color-warning)"
          : "var(--color-error)";
        return (
          <div key={s.key || s.label} className="grid grid-cols-12 items-center gap-3">
            <div className="col-span-4 sm:col-span-3 text-[12.5px] text-[var(--color-fg-muted)] truncate">
              {s.label}
            </div>
            <div className="col-span-6 sm:col-span-7 relative h-2 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
              <div
                // eslint-disable-next-line no-restricted-syntax -- progress bar fill overlay
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                style={{ width: `${v}%`, background: color }}
              />
            </div>
            <div className="col-span-2 text-right text-[12.5px] font-semibold tabular-nums text-[var(--color-fg)]">
              {v}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
