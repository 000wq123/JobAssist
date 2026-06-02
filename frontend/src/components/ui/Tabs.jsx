import clsx from "clsx";

/**
 * Tabs — controlled segmented tabs using a 12-col friendly inline-flex container.
 *
 * @param {object} props
 * @param {Array<{value: string, label: string, count?: number, icon?: any}>} props.items
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.className]
 */
export default function Tabs({ items, value, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex items-center gap-1 p-1 rounded-md overflow-x-auto",
        "bg-[var(--color-bg-elev-1)] border border-[var(--color-border-subtle)]",
        "scrollbar-hide",
        className,
      )}
    >
      {items.map(({ value: v, label, count, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={clsx(
              "inline-flex items-center gap-1.5 h-7 px-3 rounded text-[13px] font-medium whitespace-nowrap",
              "transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent-400)]",
              active
                ? "bg-[var(--color-bg-elev-3)] text-[var(--color-fg)] shadow-[inset_0_0_0_1px_var(--color-border-subtle)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{label}</span>
            {count != null && (
              <span
                className={clsx(
                  "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] tabular-nums",
                  active
                    ? "bg-[var(--color-accent-500)]/20 text-[var(--color-accent-200)]"
                    : "bg-[var(--color-bg-elev-3)] text-[var(--color-fg-dim)]",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
