import clsx from "clsx";

/**
 * Card — primary container. Uses borders for elevation, not shadows.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.elevated] - Slightly raised surface (modals, popovers)
 * @param {boolean} [props.interactive] - Adds hover state for clickable cards
 * @param {boolean} [props.padded=true] - Apply default padding
 * @param {'default'|'hero'} [props.tone='default'] - 'hero' uses the marketing-page card aesthetic (rounded-2xl, backdrop-blur, generous padding) for top-of-page feature surfaces.
 * @param {string} [props.className]
 * @param {object} [props.style]
 * @param {() => void} [props.onClick]
 */
export default function Card({
  children,
  elevated = false,
  interactive = false,
  padded = true,
  tone = "default",
  className = "",
  style,
  onClick,
  ...rest
}) {
  const Tag = onClick ? "button" : "div";
  const isHero = tone === "hero";
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        "border text-left",
        isHero ? "rounded-2xl backdrop-blur-sm" : "rounded-xl",
        elevated
          ? "bg-[var(--color-bg-elev-2)] border-[var(--color-border)]"
          : isHero
            ? "bg-[var(--color-bg-elev-1)]/60 border-[var(--color-border)]"
            : "bg-[var(--color-bg-elev-1)] border-[var(--color-border-subtle)]",
        interactive &&
          "transition-colors hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-border)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
        padded && (isHero ? "p-6 sm:p-7" : "p-5"),
        onClick && "w-full block",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
