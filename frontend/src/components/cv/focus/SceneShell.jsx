/**
 * SceneShell — standard layout for a focus-mode question.
 *
 * Question heading at the top (Instrument Serif), optional hint, then children
 * (the answer surface). Used by virtually every scene to keep typography
 * and rhythm consistent across the wizard.
 *
 * @param {object} props
 * @param {string} [props.eyebrow]   - tiny uppercase label above the question
 * @param {string} props.question
 * @param {React.ReactNode} [props.hint]
 * @param {React.ReactNode} props.children
 */
export default function SceneShell({ eyebrow, question, hint, children }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-faint)]">
            {eyebrow}
          </p>
        )}
        <h2
          className="text-[34px] lg:text-[52px] leading-[1.10] text-[var(--color-fg)]"
          style={{ fontFamily: "'Instrument Serif', ui-serif, Georgia, serif", letterSpacing: "0.005em" }}
        >
          {question}
        </h2>
        {hint && (
          <p className="text-[13.5px] lg:text-[15px] leading-[1.5] text-[var(--color-fg-muted)] max-w-[72ch]">
            {hint}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
