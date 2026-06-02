/**
 * Salary comparison modal — shows this job's rate vs KV minimum and other
 * saved jobs that have parseable salaries.
 */

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { X, BarChart2, TrendingUp } from "lucide-react";
import { formatEuro } from "../../utils/format";
import { parseSalary, kvMinimumFor } from "./domain";
import useFocusTrap from "../../hooks/useFocusTrap";

export default function SalaryCompareModal({ open, onClose, currentJob, allJobs }) {
  const [tipIdx] = useState(() => Math.floor(Math.random() * 4));
  const dialogRef = useRef(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const current = parseSalary(currentJob.salary_text);
  const kvMin   = kvMinimumFor(currentJob.category);

  const peers = (allJobs || [])
    .filter((j) => j.id !== currentJob.id && (j.company || j.role))
    .map((j) => {
      const parsed = parseSalary(j.salary_text);
      const hourly = parsed?.unit === "hour" ? parsed.amount
        : parsed?.unit === "month" ? parsed.amount / 160
        : null;
      const estimated = hourly === null;
      return { j, hourly: hourly ?? kvMinimumFor(j.category), estimated };
    })
    .sort((a, b) => b.hourly - a.hourly)
    .slice(0, 6);

  const currentHourly = current?.unit === "hour" ? current.amount : null;
  const aboveKv = currentHourly !== null ? currentHourly > kvMin : null;

  const tips = [
    "Frage ruhig nach dem Gehalt — die meisten Stellen haben Spielraum.",
    `Der gesetzliche Mindestlohn für diese Kategorie liegt bei ${formatEuro(kvMin)}/h. Branchen-KV ist oft höher.`,
    "Vergleiche immer netto: Teilzeit bringt weniger Abzüge als Vollzeit.",
    "Probezeit-Gehalt ist oft niedriger — frag nach dem Gehalt danach.",
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Gehaltsvergleich"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="w-full sm:max-w-[520px] sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[var(--color-warning)]" />
            <p className="text-[14px] font-semibold text-[var(--color-fg)]">Gehaltsvergleich</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Current job vs KV */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "rgba(124,125,240,0.08)", border: "1px solid rgba(124,125,240,0.20)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-300)]">Dieser Job</p>
              {currentHourly !== null ? (
                <p className="text-[20px] font-semibold text-[var(--color-fg)] tabular-nums">{formatEuro(currentHourly)}<span className="text-[12px] font-normal text-[var(--color-fg-muted)]">/h</span></p>
              ) : (
                <p className="text-[13px] text-[var(--color-fg-dim)] leading-snug">Kein Gehalt</p>
              )}
              {aboveKv !== null && (
                <span className="self-start mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={aboveKv ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" } : { background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                  {aboveKv ? "über KV" : "unter KV"}
                </span>
              )}
            </div>
            <div className="rounded-xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-warning)]">KV-Minimum</p>
              <p className="text-[20px] font-semibold text-[var(--color-fg)] tabular-nums">{formatEuro(kvMin)}<span className="text-[12px] font-normal text-[var(--color-fg-muted)]">/h</span></p>
              <p className="text-[10px] text-[var(--color-fg-faint)]">{formatEuro(kvMin * 160, { maximumFractionDigits: 0 })} / Monat</p>
            </div>
          </div>

          {/* Peer jobs */}
          {peers.length > 0 && (
            <div>
              <p className="text-[10.5px] tracking-[0.10em] uppercase text-[var(--color-fg-faint)] font-semibold mb-2">Deine gespeicherten Stellen</p>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
                {peers.map(({ j, hourly, estimated }) => {
                  const diff = currentHourly !== null ? hourly - currentHourly : null;
                  const pos = diff !== null && diff > 0.05;
                  const neg = diff !== null && diff < -0.05;
                  return (
                    <div key={j.id} className="flex items-center justify-between py-2 gap-3">
                      <div className="min-w-0">
                        <span className="text-[12.5px] text-[var(--color-fg-muted)] truncate block">{j.company || j.role || "Stelle"}</span>
                        {j.company && j.role && <span className="text-[11px] text-[var(--color-fg-dim)] truncate block">{j.role}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {estimated && (
                          <span className="text-[10px] text-[var(--color-fg-dim)] px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-3)]">KV-Min.</span>
                        )}
                        <span className="text-[12.5px] font-medium text-[var(--color-fg)]">{formatEuro(hourly)}/h</span>
                        {diff !== null && (
                          <span className={`text-[11px] tabular-nums ${pos ? "text-emerald-400" : neg ? "text-[var(--color-error)]" : "text-[var(--color-fg-dim)]"}`}>
                            {Math.abs(diff) < 0.05 ? "==" : `${pos ? "+" : ""}${formatEuro(Math.abs(diff))}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[var(--color-fg-muted)] leading-relaxed">
              {tips[tipIdx]}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
