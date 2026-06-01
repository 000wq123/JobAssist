/**
 * Ähnliche Stellen — salary comparison against other saved jobs that have a
 * parseable salary. Shows diff vs. this job in green/red to give market context.
 */

import { parseSalary } from "./domain";
import { formatEuro } from "../../utils/format";
import { ANNOT } from "./ui";

export default function SimilarJobsCard({ currentHourly, jobs, currentId }) {
  const peers = jobs
    .filter((j) => String(j.id) !== String(currentId) && j.salary_text)
    .map((j) => {
      const p = parseSalary(j.salary_text);
      const h = p?.unit === "hour" ? p.amount : p?.hourly ?? null;
      if (!h) return null;
      const diff = h - currentHourly;
      return { j, hourly: h, diff };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
    .slice(0, 4);

  if (!peers.length) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border-subtle)] flex items-baseline justify-between">
        <p className={ANNOT}>Ähnliche Stellen</p>
        <p className="text-[11px] text-[var(--color-fg-dim)]">{peers.length} in deiner Liste</p>
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {peers.map(({ j, hourly, diff }) => {
          const pos = diff > 0;
          const neutral = Math.abs(diff) < 0.1;
          const diffColor = neutral
            ? "text-[var(--color-fg-dim)]"
            : pos
            ? "text-emerald-400"
            : "text-[var(--color-error)]";
          return (
            <div key={j.id} className="px-5 py-3 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--color-fg)] truncate">{j.company || j.role}</p>
                {j.company && j.role ? (
                  <p className="text-[11px] text-[var(--color-fg-dim)] truncate mt-0.5">{j.role}</p>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <p className="tabular-nums text-[13px] text-[var(--color-fg)]">{formatEuro(hourly)}/h</p>
                <p className={`tabular-nums text-[11px] ${diffColor}`}>
                  {neutral ? "±0" : `${pos ? "+" : ""}${formatEuro(Math.abs(diff))}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
