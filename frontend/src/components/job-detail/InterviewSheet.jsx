/**
 * Modern interview prep sheet.
 * Overview mode: clean question cards with inline tips.
 * Practice mode: one question at a time, user writes answer, then reveals suggestion.
 */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft, ArrowRight, Check, Download, Loader2, MessageSquare, Play, ThumbsUp, AlertCircle, X,
} from "lucide-react";
import AIDisclosureBanner from "../AIDisclosureBanner";
import { interviewApi } from "../../services/api";
import { Spinner } from "./ui";

const parseJson = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };

function escapeHtml(v) {
  return String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadDoc(content, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><p style="font-family:Arial;font-size:12pt;">${escapeHtml(content).replace(/\n/g, "</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" })),
    download: filename,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

function printHtml(title, bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000}</style></head><body>${bodyHtml}</body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })));
  win?.addEventListener("load", () => { win.print(); });
}

export default function InterviewSheet({ open, onClose, job, mutate, pending, resumeId }) {
  const qa = useMemo(() => parseJson(job.interview_qa), [job.interview_qa]);
  const [mode, setMode] = useState("overview");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ratings, setRatings] = useState({});

  if (!open) return null;

  const total = qa?.length ?? 0;
  const currentQ = qa?.[idx];
  const rating = ratings[idx];

  const enterPractice = () => { setMode("practice"); setIdx(0); };
  const exitPractice  = () => setMode("overview");
  const handleNext    = () => { if (idx < total - 1) setIdx((i) => i + 1); };
  const handlePrev    = () => { if (idx > 0) setIdx((i) => i - 1); };

  const handleRate = async () => {
    const userAnswer = (answers[idx] ?? "").trim();
    if (!userAnswer || !currentQ) return;
    setRatings((prev) => ({ ...prev, [idx]: { status: "loading" } }));
    try {
      const res = await interviewApi.rateAnswer(
        currentQ.question,
        userAnswer,
        currentQ.answer,
      );
      setRatings((prev) => ({ ...prev, [idx]: { status: "done", ...res.data } }));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Bewertung fehlgeschlagen. Bitte versuche es erneut.");
      setRatings((prev) => ({ ...prev, [idx]: { status: "fallback" } }));
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl flex flex-col max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          {mode === "practice" && (
            <button onClick={exitPractice} className="grid place-items-center w-7 h-7 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Zurück">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">
              {mode === "practice" ? "Gespräch üben" : "Vorbereitung"}
            </h2>
            {qa && <p className="text-[11.5px] text-[var(--color-fg-dim)] mt-0.5">{job.role || job.company} · {total} Fragen</p>}
          </div>
          {qa && mode === "overview" && (
            <button
              onClick={enterPractice}
              className="hidden sm:inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[12px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors"
            >
              <Play className="w-3 h-3" /> Gespräch üben
            </button>
          )}
          {mode === "practice" && (
            <span className="text-[11px] tabular-nums text-[var(--color-fg-dim)] mr-1">{idx + 1} / {total}</span>
          )}
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!qa ? (
            /* ── Generate state ── */
            <div className="px-5 py-5">
              <AIDisclosureBanner feature="interview" />
              <div className="grid place-items-center py-10 text-center">
                <MessageSquare className="w-7 h-7 text-[var(--color-accent-300)] mb-3" />
                <p className="text-[13px] text-[var(--color-fg-muted)] mb-4 max-w-xs">
                  Erstelle eine Vorbereitung auf Basis deiner Stelle und deines Lebenslaufs.
                </p>
                <button
                  onClick={() => mutate()}
                  disabled={pending || !resumeId}
                  className="h-10 px-4 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {pending ? <><Spinner /> Wird erstellt…</> : <>Vorbereitung erstellen</>}
                </button>
                {!resumeId ? <p className="mt-2 text-[11px] text-[var(--color-warning)]">Wähle zuerst einen Lebenslauf in &quot;Bearbeiten&quot;.</p> : null}
              </div>
            </div>
          ) : mode === "overview" ? (
            /* ── Overview: question cards ── */
            <div className="px-5 py-4 grid grid-cols-1 gap-2.5">
              <AIDisclosureBanner feature="interview" />
              {qa.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">Frage {i + 1}</p>
                  <p className="text-[14px] leading-snug font-medium text-[var(--color-fg)]">{item.question}</p>
                  {item.tip && (
                    <div className="mt-3 flex items-start gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-warning)] flex-shrink-0 mt-0.5">Tipp</span>
                      <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{item.tip}</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={enterPractice}
                className="sm:hidden mt-1 h-10 rounded-xl bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[13px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Gespräch üben
              </button>
            </div>
          ) : (
            /* ── Practice mode: one question at a time ── */
            <div className="px-5 py-5 flex flex-col gap-5 scene-enter">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-0.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-400"
                    style={{ width: `${((idx + 1) / total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="scene-enter">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-faint)] mb-2">Frage {idx + 1}</p>
                <p
                  className="text-[18px] leading-snug font-medium text-[var(--color-fg)]"
                  style={{ fontFamily: "'Instrument Serif', ui-serif, Georgia, serif" }}
                >
                  {currentQ?.question}
                </p>
              </div>

              {/* Answer textarea */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-dim)] block mb-2">Deine Antwort</label>
                <textarea
                  key={idx}
                  value={answers[idx] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                  disabled={rating?.status === "loading" || rating?.status === "done"}
                  placeholder="Schreib deine Antwort hier…"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[13px] text-[var(--color-fg)] placeholder-[var(--color-fg-faint)] resize-none h-28 focus:outline-none focus:border-[var(--color-accent-500)]/50 transition-colors disabled:opacity-60"
                />
              </div>

              {/* Rate button — only before rating */}
              {!rating && (
                <button
                  onClick={handleRate}
                  disabled={!(answers[idx] ?? "").trim()}
                  className="h-9 rounded-lg bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[13px] font-medium text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/25 transition-colors disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  Antwort bewerten lassen
                </button>
              )}

              {/* Loading state */}
              {rating?.status === "loading" && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--color-fg-dim)] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird bewertet…</span>
                </div>
              )}

              {/* AI Feedback card */}
              {rating?.status === "done" && (() => {
                const SCORE_STYLE = {
                  stark:        { cls: "bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]",  label: "Stark" },
                  gut:          { cls: "bg-[#fbbf24]/10 border-[#fbbf24]/25 text-[#fbbf24]",  label: "Gut" },
                  ausbaufähig:  { cls: "bg-[#f87171]/10 border-[#f87171]/25 text-[#f87171]",  label: "Ausbaufähig" },
                };
                const style = SCORE_STYLE[rating.score] ?? SCORE_STYLE.gut;
                return (
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4 flex flex-col gap-3 scene-enter">
                    {/* Score badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${style.cls}`}>
                        <ThumbsUp className="w-3 h-3" />
                        {style.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-fg-faint)]">KI-Bewertung</span>
                    </div>
                    {/* Strengths */}
                    {rating.strong?.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {rating.strong.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0" />
                            <p className="text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{s}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Improvements */}
                    {rating.improve?.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {rating.improve.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#fbbf24] flex-shrink-0" />
                            <p className="text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{s}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Coaching tip */}
                    {rating.tip && (
                      <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{rating.tip}</p>
                      </div>
                    )}
                    {/* Collapsible suggested answer */}
                    <details className="group">
                      <summary className="cursor-pointer list-none text-[11.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors select-none">
                        Vorschlag anzeigen ▸
                      </summary>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ?.answer}</p>
                    </details>
                  </div>
                );
              })()}

              {/* Fallback: just show suggestion if rating failed */}
              {rating?.status === "fallback" && (
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4 scene-enter">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent-300)] mb-2">Vorschlag</p>
                  <p className="text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ?.answer}</p>
                  {currentQ?.tip && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-start gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-warning)] flex-shrink-0 mt-0.5">Tipp</span>
                      <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{currentQ.tip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={idx === 0}
                  className="flex-1 h-9 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)] disabled:opacity-30 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Zurück
                </button>
                {idx < total - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 h-9 rounded-lg border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 text-[13px] text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    Weiter <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={exitPractice}
                    className="flex-1 h-9 rounded-lg border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 text-[13px] text-[var(--color-accent-200)] hover:bg-[var(--color-accent-500)]/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Abgeschlossen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: download (overview only) */}
        {qa && mode === "overview" && (
          <div className="grid grid-cols-2 gap-2 px-5 py-3 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => downloadDoc(
                qa.map((it, i) => `Frage ${i + 1}: ${it.question}\n\nAntwort:\n${it.answer}${it.tip ? `\n\nTipp: ${it.tip}` : ""}`).join("\n\n----\n\n"),
                `Vorbereitung_${job.company || "Bewerbung"}.doc`,
              )}
              className="h-9 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> DOCX
            </button>
            <button
              onClick={() => printHtml(
                "Gesprächsvorbereitung",
                `<h1>${escapeHtml(job.role || "Stelle")}</h1><p>${escapeHtml(job.company || "")}</p>${qa.map((it, i) =>
                  `<div style="margin-bottom:24px;"><b>Frage ${i + 1}: ${escapeHtml(it.question)}</b><p>${escapeHtml(it.answer)}</p>${it.tip ? `<p style="background:#1a1a1a;padding:8px;border-radius:4px;"><b>Tipp:</b> ${escapeHtml(it.tip)}</p>` : ""}</div>`
                ).join("<hr>")}`,
              )}
              className="h-9 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
