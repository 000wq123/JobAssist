/**
 * ReportModal — let users flag a job for review.
 */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Flag, Check } from "lucide-react";
import useFocusTrap from "../../hooks/useFocusTrap";

const REASONS = [
  { value: "spam", label: "Spam oder Fake" },
  { value: "filled", label: "Stelle bereits besetzt" },
  { value: "wrong_category", label: "Falsche Kategorie" },
  { value: "offensive", label: "Anstößiger Inhalt" },
  { value: "other", label: "Sonstiges" },
];

export default function ReportModal({ open, onClose, job, onSubmit }) {
  const modalRef = useRef(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  useFocusTrap(open, modalRef);

  if (!open) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit?.({ reason, note: note.trim() || undefined });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setReason("");
      setNote("");
      onClose();
    }, 1500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="w-full sm:max-w-md flex flex-col max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[var(--color-fg-dim)]" />
            <h2 id="report-title" className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">Stelle melden</h2>
          </div>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[13px] text-[var(--color-fg-muted)]">Danke — wir prüfen das.</p>
            </div>
          ) : (
            <>
              <p className="text-[12.5px] text-[var(--color-fg-muted)]">
                {job?.company || "Diese Stelle"} melden, wenn etwas nicht stimmt.
              </p>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-[var(--color-fg-muted)]">Grund</p>
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] border transition-colors ${
                      reason === r.value
                        ? "bg-[var(--color-accent-500)]/10 border-[var(--color-accent-500)]/40 text-[var(--color-accent-200)]"
                        : "bg-transparent border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Anmerkung (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-500)]/50 resize-none"
                  placeholder="Zusätzliche Details…"
                />
              </div>
            </>
          )}
        </div>

        {!sent && (
          <div className="px-5 py-3 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={handleSubmit}
              disabled={!reason}
              className="w-full h-10 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Flag className="w-3.5 h-3.5" /> Melden
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
