/**
 * FunnelChart — Linear/Resend-style pipeline visualisation.
 *
 * Bars use the foreground colour (white-with-opacity), NOT the brand accent —
 * data should not be colour-coded as "brand". Stage drop-off is encoded by
 * each row's `intensity` (0–1) reducing opacity. Bars are taller (4 px) than
 * before and sit on a hairline track for a calmer rhythm.
 *
 * @param {object} props
 * @param {Array<{label: string, value: string, percent: number, note?: string, intensity?: number}>} props.stages
 */
export default function FunnelChart({ stages }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {stages.map((s, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-3">
          <div className="col-span-3 sm:col-span-3 text-[13px] text-[var(--color-fg-muted)] truncate">
            {s.label}
          </div>
          <div className="col-span-6 sm:col-span-7 relative h-1 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
            <div
              className="h-full rounded-l-full transition-[width] duration-500"
              style={{
                width: `${Math.max(2, Math.min(100, s.percent))}%`,
                background: "var(--color-fg)",
                opacity: 0.35 + 0.65 * (s.intensity ?? 1),
              }}
            />
          </div>
          <div className="col-span-3 sm:col-span-2 text-right flex items-baseline justify-end gap-1.5">
            <span className="text-[15px] font-semibold tabular-nums text-[var(--color-fg)]">
              {s.value}
            </span>
            {s.note && (
              <span className="text-[11px] text-[var(--color-fg-dim)] tabular-nums">{s.note}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
