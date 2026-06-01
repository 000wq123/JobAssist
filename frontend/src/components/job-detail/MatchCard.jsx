/**
 * AI Match card — anchor of the page when no wage hero is present.
 */

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { ANNOT } from "./ui";

export default function MatchCard({ score, feedbackJson, onCheckFit, onCheckFitPending, resumeId }) {
  const [whyOpen, setWhyOpen] = useState(false);
  let parsed = null;
  if (feedbackJson) {
    try { const obj = JSON.parse(feedbackJson); if (obj && typeof obj === "object") parsed = obj; } catch { /* ignore */ }
  }
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const pct = hasScore ? Math.round(score) : null;
  const scoreTone = pct === null ? "text-[var(--color-fg-dim)]"
    : pct >= 70 ? "text-emerald-400"
    : pct >= 40 ? "text-[var(--color-fg-muted)]"
    : "text-[var(--color-error)]";
  const hasDetail = parsed?.requirements?.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] overflow-hidden">
      <div className="p-5 sm:p-6">

        {/* Score row */}
        <div className="flex items-start gap-4">
          {hasScore && (
            <p className="flex items-baseline gap-0.5 leading-none flex-shrink-0">
              <span className={`${scoreTone} font-semibold tabular-nums`} style={{ fontSize: "clamp(32px, 5vw, 40px)", fontFamily: '"Instrument Serif", ui-serif, Georgia, serif' }}>{pct}</span>
              <span className="text-[15px] text-[var(--color-fg-dim)]">%</span>
            </p>
          )}
          <div className="pt-1.5">
            <p className={ANNOT}>Passt zu dir</p>
          </div>
        </div>

        {/* Verdict */}
        {parsed?.verdict ? (
          <p className="mt-3 text-[13.5px] text-[var(--color-fg-muted)] leading-relaxed border-l-2 border-[var(--color-border)] pl-3">
            {parsed.verdict}
          </p>
        ) : !hasScore ? (
          <p className="mt-3 text-[13px] text-[var(--color-fg-dim)] leading-relaxed">
            {resumeId
              ? "Klick auf \"Passung prüfen\" — die KI liest deinen Lebenslauf und sagt dir direkt, wie gut du passt und warum."
              : "Verknüpfe deinen Lebenslauf, damit die KI eine ehrliche Einschätzung geben kann."}
          </p>
        ) : null}

        {/* Strengths */}
        {parsed?.strengths?.length > 0 && (
          <ul className="mt-4 space-y-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {(parsed.strengths || []).slice(0, 5).map((s, i) => (
              <li key={`s${i}`} className="flex gap-2.5 items-start">
                <span className="text-emerald-400 flex-shrink-0 font-bold mt-0.5 text-[12px]">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Gaps */}
        {parsed?.gaps?.length > 0 && (
          <ul className="mt-3 space-y-2 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
            {(parsed.gaps || []).slice(0, 4).map((g, i) => (
              <li key={`g${i}`} className="flex gap-2.5 items-start">
                <span className="text-[var(--color-fg-dim)] flex-shrink-0 font-bold mt-0.5 text-[12px]">−</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        )}

        {!parsed?.strengths?.length && !parsed?.gaps?.length && hasScore && (
          <p className="mt-3 text-[13px] text-[var(--color-fg-dim)]">Keine Detailanalyse verfügbar — berechne die Passung neu.</p>
        )}
      </div>

      {/* Expander: per-requirement evidence breakdown */}
      <div className="border-t border-[var(--color-border-subtle)]">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          className="flex items-center justify-between w-full px-5 py-3 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
        >
          <span>{hasDetail ? "Was die KI in deinem Lebenslauf gefunden hat" : "Wie entsteht diese Zahl?"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${whyOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {whyOpen && (
          <div className="pb-4 flex flex-col gap-4 text-[12.5px] leading-relaxed bg-[var(--color-bg-elev-2)]/30">
            {hasDetail ? (
              <div className="px-5 pt-1 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-faint)] font-semibold">6 Anforderungen · Zeile für Zeile</p>
                {parsed.requirements.map((r, i) => {
                  const s = Math.min(2, Math.max(0, parseInt(r.score ?? 0, 10)));
                  const icon = s === 2 ? "✓" : s === 1 ? "◐" : "✕";
                  const bg   = s === 2 ? "bg-emerald-500/8 border-emerald-500/20" : s === 1 ? "bg-amber-500/8 border-amber-500/20" : "bg-red-500/8 border-red-500/20";
                  const tone = s === 2 ? "text-emerald-400" : s === 1 ? "text-[var(--color-warning)]" : "text-[var(--color-error)]/80";
                  const hasEvidence = r.evidence && !r.evidence.toLowerCase().startsWith("kein nachweis");
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${bg}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={`flex-shrink-0 text-[12px] font-bold mt-0.5 ${tone}`}>{icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[var(--color-fg-muted)] font-medium text-[12.5px]">{r.req}</span>
                            {r.dealbreaker && s < 2 && (
                              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-error)]/15 text-[var(--color-error)]/80">K.O.</span>
                            )}
                          </div>
                          {r.note && (
                            <p className="mt-1 text-[var(--color-fg-dim)] text-[12px]">{r.note}</p>
                          )}
                          {hasEvidence && (
                            <p className="mt-1.5 text-[11.5px] text-emerald-400/80 italic">
                              Dein CV: „{r.evidence}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 pt-2 text-[var(--color-fg-dim)]">
                <p>{resumeId ? "Berechne die Passung, um die vollständige Anforderungsanalyse zu sehen." : "Verknüpfe deinen Lebenslauf, damit die KI die Anforderungen prüfen kann."}</p>
              </div>
            )}

            {onCheckFit && (
              <div className="px-5">
                <button
                  type="button"
                  onClick={onCheckFit}
                  disabled={onCheckFitPending}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors disabled:opacity-50"
                >
                  {onCheckFitPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {resumeId ? "Analyse neu starten →" : "Lebenslauf verknüpfen →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
