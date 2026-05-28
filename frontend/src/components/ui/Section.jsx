import clsx from "clsx";

/**
 * Section — Linear-style content grouping primitive.
 *
 * Replaces `Card` as the default container for in-app content. By default a
 * section is *just* a labeled content block with no border or background:
 * content sits directly on the page surface, separated from siblings by
 * vertical rhythm rather than chrome.
 *
 * Use `bordered` when grouping a true data island that needs visual
 * containment (a settings form, a job-detail panel, a list of rows that
 * should read as a single object).
 *
 * Title uses the new --text-subhead tier (17 px) — a deliberate middle step
 * between body (13 px) and page-title (24 px) so subsections feel grouped
 * without resorting to heavy card chrome.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title]         - Section header (string or JSX).
 * @param {React.ReactNode} [props.description]   - Optional sub-paragraph under the title.
 * @param {string}          [props.eyebrow]       - Optional tiny uppercase label above the title.
 * @param {React.ReactNode} [props.actions]       - Optional right-aligned action area in the header.
 * @param {boolean}         [props.bordered=false] - Wrap content in a bordered surface (legacy Card style).
 * @param {boolean}         [props.padded]         - Add inner padding. Defaults to `bordered`.
 * @param {boolean}         [props.dense=false]    - Halve the header→body gap.
 * @param {React.ReactNode} props.children
 * @param {string}          [props.className]
 * @param {string}          [props.headerClassName]
 * @param {string}          [props.bodyClassName]
 * @param {string}          [props.as='section']   - Semantic element override.
 */
export default function Section({
  title,
  description,
  eyebrow,
  actions,
  bordered = false,
  padded,
  dense = false,
  children,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  as: Tag = "section",
}) {
  const isPadded = padded ?? bordered;
  const hasHeader = title || description || eyebrow || actions;

  return (
    <Tag
      className={clsx(
        bordered && "rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]/40",
        bordered && isPadded && "p-5",
        !bordered && isPadded && "px-1 py-2",
        className,
      )}
    >
      {hasHeader && (
        <header
          className={clsx(
            "grid grid-cols-12 items-end gap-3",
            dense ? "mb-3" : "mb-6",
            headerClassName,
          )}
        >
          <div className={clsx("min-w-0", actions ? "col-span-12 sm:col-span-8" : "col-span-12")}>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)] mb-1.5">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                className="text-[19px] sm:text-[20px] font-semibold tracking-tight text-[var(--color-fg)] leading-tight"
                style={{ letterSpacing: "-0.015em" }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)] leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="col-span-12 sm:col-span-4 flex flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          )}
        </header>
      )}
      <div className={clsx(bodyClassName)}>{children}</div>
    </Tag>
  );
}
