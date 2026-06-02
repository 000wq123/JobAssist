/**
 * Combined edit dialog. Opens from Mehr menu. Avoids three separate sheets.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X, ChevronDown, FileText } from "lucide-react";
import { ANNOT } from "./ui";
import useFocusTrap from "../../hooks/useFocusTrap";

export default function BearbeitenSheet({ open, onClose, job, resumes, selectedResume, onChangeResume, onSaveMeta, savingMeta }) {
  const [deadline, setDeadline] = useState(job.deadline || "");
  const [notes, setNotes] = useState(job.notes || "");
  const dialogRef = useRef(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => { if (open) { setDeadline(job.deadline || ""); setNotes(job.notes || ""); } }, [open, job.deadline, job.notes]);

  if (!open) return null;

  const dirty = (deadline || "") !== (job.deadline || "") || (notes || "") !== (job.notes || "");
  const handleSave = () => {
    const payload = {};
    if ((deadline || "") !== (job.deadline || "")) payload.deadline = deadline || null;
    if ((notes    || "") !== (job.notes    || "")) payload.notes    = notes    || null;
    if (Object.keys(payload).length) onSaveMeta(payload);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bearbeiten"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className="w-full sm:max-w-md grid grid-cols-12 gap-0 rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60">
        <div className="col-span-12 grid grid-cols-12 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          <h2 className="col-span-10 text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">Bearbeiten</h2>
          <button onClick={onClose} className="col-span-2 justify-self-end grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="col-span-12 px-5 py-5 space-y-5">
          {/* Lebenslauf für Analyse */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Lebenslauf für Analyse</label>
            {resumes.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedResume || resumes[0]?.id || ""}
                  onChange={(e) => onChangeResume(Number(e.target.value))}
                  className="grid w-full h-10 appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40"
                >
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-dim)]" />
              </div>
            ) : (
              <Link to="/lebenslauf" className="grid grid-cols-[auto_1fr] items-center gap-1.5 text-[12.5px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)]">
                <FileText className="w-3.5 h-3.5" /> Lebenslauf hochladen →
              </Link>
            )}
          </div>

          {/* Frist */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Frist</label>
            <input
              type="date"
              value={deadline || ""}
              onChange={(e) => setDeadline(e.target.value)}
              className="grid w-full h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40"
            />
          </div>

          {/* Notizen */}
          <div>
            <label className={`block mb-1.5 ${ANNOT}`}>Notizen</label>
            <textarea
              rows={4}
              value={notes || ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eigene Notizen, Erinnerungen, Stichworte …"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[13px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent-500)]/40 resize-y"
            />
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-12 gap-2 px-5 py-3.5 border-t border-[var(--color-border-subtle)]">
          <button onClick={onClose} className="col-span-6 sm:col-span-8 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[13px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)]">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || savingMeta}
            className="col-span-6 sm:col-span-4 h-10 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] disabled:opacity-50"
          >
            {savingMeta ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
