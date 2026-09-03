/**
 * Modal that displays a generated cover letter with copy/mailto/download.
 */

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Mail, X, CalendarPlus } from "lucide-react";
import toast from "react-hot-toast";
import useFocusTrap from "../../hooks/useFocusTrap";
import AIDisclosureBanner from "../AIDisclosureBanner";

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

function parseJson(v) { try { return v ? JSON.parse(v) : null; } catch { return null; } }

function generateIcs({ title, start, end, description, location }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobAssist//Follow-up//DE",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@jobassist.tech`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function downloadIcs(blob, filename) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CoverLetterModal({ open, onClose, job, followUpDays = 10 }) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  useFocusTrap(open, modalRef);
  if (!open || !job?.cover_letter) return null;

  const companyEmail = parseJson(job.research_data)?.contact_info?.email;
  const subject = encodeURIComponent(`Bewerbung als ${job.role || "Kandidat"} – ${job.company || ""}`);
  const body = encodeURIComponent(job.cover_letter || "");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coverletter-title"
        className="w-full sm:max-w-2xl flex flex-col max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60"
      >
        <div className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
          <h2 id="coverletter-title" className="col-span-9 text-[14px] font-semibold tracking-tight text-[var(--color-fg)] truncate">
            Anschreiben{job.company ? ` · ${job.company}` : ""}
          </h2>
          <div className="col-span-3 justify-self-end flex items-center gap-1">
            <button
              onClick={() => { navigator.clipboard.writeText(job.cover_letter); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Kopiert"); }}
              className="grid place-items-center h-11 w-11 -m-1.5 md:m-0 md:w-8 md:h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
              title="Kopieren"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="grid place-items-center h-11 w-11 -m-1.5 md:m-0 md:w-8 md:h-8 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]" aria-label="Schließen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <AIDisclosureBanner feature="cover_letter" />
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">{job.cover_letter}</p>
        </div>
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-t border-[var(--color-border-subtle)]">
          <a
            href={`mailto:${companyEmail || ""}?subject=${subject}&body=${body}`}
            className="col-span-12 sm:col-span-6 h-10 rounded-lg bg-[var(--color-accent-500)] text-white font-semibold text-[13px] inline-flex items-center justify-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> {companyEmail ? "E-Mail senden" : "E-Mail Entwurf"}
          </a>
          <button
            onClick={() => downloadDoc(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.doc`)}
            className="col-span-4 sm:col-span-2 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> DOCX
          </button>
          <button
            onClick={() => printHtml("Anschreiben", `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(job.cover_letter)}</pre>`)}
            className="col-span-4 sm:col-span-2 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => {
              const start = new Date();
              start.setDate(start.getDate() + followUpDays);
              start.setHours(9, 0, 0, 0);
              const end = new Date(start.getTime() + 30 * 60 * 1000);
              const ics = generateIcs({
                title: `Nachfassen: ${job.company || "Bewerbung"}`,
                start,
                end,
                description: `Erinnerung: Nachfassen bei ${job.company || "der Bewerbung"}.\n\nLink: ${job.url || ""}`,
                location: job.location || "",
              });
              downloadIcs(new Blob([ics], { type: "text/calendar" }), `FollowUp_${job.company || "Bewerbung"}.ics`);
              toast.success("Kalender-Erinnerung erstellt");
            }}
            className="col-span-4 sm:col-span-2 h-10 rounded-lg border border-[var(--color-border-subtle)] text-[12.5px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] inline-flex items-center justify-center gap-1.5"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> Erinnerung
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
