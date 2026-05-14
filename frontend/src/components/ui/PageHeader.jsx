/**
 * Standard page header used across protected routes.
 * Pattern: small uppercase eyebrow + large semibold title + optional sub-text.
 *
 * Use this on new pages instead of hand-rolling another header markup.
 *
 * @param {object} props
 * @param {string} props.title - Main page title.
 * @param {string} [props.eyebrow] - Small uppercase label above the title.
 * @param {string} [props.description] - Optional description shown under the title.
 * @param {React.ReactNode} [props.actions] - Optional CTA / action area on the right.
 * @param {string} [props.className] - Extra wrapper classes (margin / spacing tweaks).
 */
export default function PageHeader({ title, eyebrow, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-dim">
            {eyebrow}
          </p>
        )}
        <h1
          className="text-[26px] font-semibold leading-none tracking-tight text-ink-primary sm:text-[28px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-sub">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
