/**
 * KV-benchmark bar — compares the parsed hourly rate against the Austrian
 * KV minimum (Kollektivvertrag) for the job category.
 */

import { Info } from "lucide-react";
import { formatEuro } from "../../utils/format";
import { categoryLabel } from "./domain";
import { ANNOT } from "./ui";

export default function KvBar({ hourly, kvMin, kvMax, kvName, category }) {
  const top = Math.max(hourly * 1.18, kvMax ? kvMax * 1.15 : kvMin * 1.35);
  const kvPct  = Math.min(100, (kvMin  / top) * 100);
  const jobPct = Math.min(100, (hourly / top) * 100);
  const above  = hourly > kvMin;
  const diff   = hourly - kvMin;
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] p-5">
      <div className="grid grid-cols-12 items-baseline gap-2">
        <p className={`col-span-8 ${ANNOT} text-[var(--color-fg)]`} style={{ letterSpacing: "0.14em" }}>
          KV-Vergleich · {categoryLabel(category)}
        </p>
        <p className={`col-span-4 text-right text-[11.5px] tabular-nums font-medium ${above ? "text-emerald-400" : "text-[var(--color-warning)]"}`}>
          {above ? "+" : ""}{formatEuro(Math.abs(diff))}/h
        </p>
      </div>
      <div className="relative mt-5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-l-full bg-[var(--color-accent-500)]/35" style={{ width: `${kvPct}%` }} />
        <div
          className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--color-fg)] ring-2 ring-[var(--color-bg)]"
          style={{ left: `${jobPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between tabular-nums text-[11px] text-[var(--color-fg-dim)]">
        <span>{formatEuro(kvMin)} KV-Min.</span>
        <span className="text-[var(--color-fg)] font-medium">{formatEuro(hourly)} hier</span>
        <span>{formatEuro(top)} Top</span>
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--color-fg-faint)] flex items-center gap-1">
        <Info className="w-2.5 h-2.5" aria-hidden="true" /> Basierend auf {kvName || "österreichischem Mindestlohn"} (2025).
      </p>
    </div>
  );
}
