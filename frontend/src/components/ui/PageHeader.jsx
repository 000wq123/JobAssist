/**
 * Standard in-app page header — Linear-style.
 *
 * Plain 24 px title + optional description + optional right-aligned actions.
 * The serif-italic accent word from the marketing hero treatment is removed
 * here: in-app pages should feel like a workspace, not a landing page.
 *
 * Legacy props `accent` and `size` are accepted but intentionally ignored, so
 * pages migrating gradually don't break. They will be removed once every
 * caller is updated to the new contract.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title         - Main heading (string or JSX).
 * @param {React.ReactNode} [props.description] - Optional sub-paragraph under the title.
 * @param {string}          [props.eyebrow]     - Optional small uppercase caption above the title.
 * @param {React.ReactNode} [props.actions]     - Optional right-aligned action area.
 * @param {string}          [props.className]
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
  // Legacy props — accepted but no longer rendered. Kept for graceful
  // migration; will be removed once every page uses the new contract.
  // eslint-disable-next-line no-unused-vars
  accent,
  // eslint-disable-next-line no-unused-vars
  size,
}) {
  return (
    <div className={`grid grid-cols-12 gap-3 items-end ${className}`}>
      <div className={`min-w-0 ${actions ? "col-span-12 sm:col-span-8" : "col-span-12"}`}>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)] mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1
          className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-[1.1] text-[var(--color-fg)]"
          style={{ letterSpacing: "-0.025em" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="col-span-12 sm:col-span-4 flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
