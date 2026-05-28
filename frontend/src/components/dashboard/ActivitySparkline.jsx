/**
 * ActivitySparkline — minimal weekly activity bar chart.
 *
 * @param {object} props
 * @param {Array<{day: string, val: number, max?: number}>} props.data
 * @param {number} [props.todayIdx] - index to highlight as "today"
 */
export default function ActivitySparkline({ data, todayIdx }) {
  const max = Math.max(...data.map((d) => d.val), 1);
  return (
    <div className="grid grid-cols-7 gap-1.5 h-20">
      {data.map((d, i) => {
        const h = (d.val / max) * 100;
        const isToday = i === todayIdx;
        const hasValue = d.val > 0;
        return (
          <div key={i} className="flex flex-col justify-end items-center gap-2">
            <div
              className="w-full rounded-sm transition-[height] duration-500"
              style={{
                height: hasValue ? `${Math.max(6, h)}%` : "3px",
                background: hasValue
                  ? "var(--color-fg)"
                  : "var(--color-border-subtle)",
                opacity: hasValue ? (isToday ? 0.85 : 0.32) : 1,
              }}
              title={`${d.day}: ${d.val}`}
            />
            <span
              className="text-[10.5px] font-medium tabular-nums"
              style={{ color: isToday ? "var(--color-fg-muted)" : "var(--color-fg-dim)" }}
            >
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}
