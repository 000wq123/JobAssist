import { useRef } from "react";
import clsx from "clsx";

/**
 * Tabs — controlled segmented tabs using a 12-col friendly inline-flex container.
 *
 * Implements roving tabindex + Arrow/Home/End keyboard navigation per WAI-ARIA
 * tabs pattern: only the active tab is in the tab order; Arrow keys move focus
 * and selection together, Home/End jump to the first/last tab.
 *
 * @param {object} props
 * @param {Array<{value: string, label: string, count?: number, icon?: any}>} props.items
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.className]
 */
export default function Tabs({ items, value, onChange, className = "" }) {
  const tabRefs = useRef({});

  const onKeyDown = (e) => {
    const idx = items.findIndex((it) => it.value === value);
    let next = null;
    if (e.key === "ArrowRight") next = items[(idx + 1) % items.length];
    else if (e.key === "ArrowLeft") next = items[(idx - 1 + items.length) % items.length];
    else if (e.key === "Home") next = items[0];
    else if (e.key === "End") next = items[items.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next.value);
      tabRefs.current[next.value]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
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
            ref={(el) => { tabRefs.current[v] = el; }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
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
