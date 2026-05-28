import clsx from "clsx";

/**
 * EmptyState — shown when a list/page has no data.
 *
 * Calm direction: no accent-tinted icon tile, no decorated chrome.
 * If an icon is passed it renders as a small neutral mark above the title.
 *
 * @param {object} props
 * @param {React.ComponentType<{className?: string}>} [props.icon] - Lucide icon
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - CTA button(s)
 * @param {'default'|'subtle'} [props.tone='default'] - 'subtle' drops the dashed border for inline use inside cards.
 * @param {string} [props.className]
 */
export default function EmptyState({ icon: Icon, title, description, action, tone = "default", className = "" }) {
  const isSubtle = tone === "subtle";
  return (
    <div
      className={clsx(
        "flex flex-col items-start text-left py-8 sm:py-10 px-1 sm:px-2 rounded-xl",
        isSubtle
          ? ""
          : "bg-[var(--color-bg-elev-1)]/40 border border-[var(--color-border-subtle)] px-5 sm:px-6",
        className,
      )}
    >
      {Icon && (
        <Icon
          className="h-4 w-4 text-[var(--color-fg-faint)] mb-3"
          aria-hidden="true"
        />
      )}
      <h3 className="text-[15.5px] font-medium tracking-tight text-[var(--color-fg)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
