import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import useFocusTrap from "../hooks/useFocusTrap";

const STORAGE_KEY = "jobassist_onboarding_done_v1";
const SERIF = "'Instrument Serif', ui-serif, Georgia, serif";

function hasSeenOnboarding() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function markOnboardingDone() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* quota */ }
}

const SLIDES = [
  {
    eyebrow: "Willkommen",
    heading: "Dein Job-Assistent für Österreich.",
    body: "JobAssist hilft dir dabei, Praktika, Teilzeit- und Samstagsjobs zu finden, dich zu bewerben und den Überblick zu behalten.",
    cta: null,
  },
  {
    eyebrow: "Lebenslauf",
    heading: "Lade deinen Lebenslauf hoch.",
    body: "In den Einstellungen kannst du deinen Lebenslauf hinterlegen. Die KI berechnet damit Matches, prüft deine Passung und erstellt Anschreiben für dich.",
    cta: { label: "Einstellungen öffnen", to: "/settings" },
  },
  {
    eyebrow: "Stellen",
    heading: "Suche, merke, bewirb dich.",
    body: "Unter Finden entdeckst du passende Stellen in deiner Nähe. Merke sie, wechsle den Status und behalte den Überblick über alle laufenden Bewerbungen.",
    cta: { label: "Jobs ansehen", to: "/finden" },
  },
  {
    eyebrow: "Lebenslauf erstellen",
    heading: "Professionelles PDF in drei Minuten.",
    body: "Beantworte ein paar kurze Fragen — JobAssist erstellt dir sofort einen fertigen Lebenslauf im österreichischen Format als PDF. Kostenlos, direkt im Browser.",
    cta: { label: "Jetzt starten", to: "/lebenslauf" },
  },
];

/**
 * OnboardingModal — full-screen overlay shown once to new users.
 * Disappears on close or after the last slide.
 * Rendered via portal so it sits above all other content.
 *
 * @param {{ onDone: () => void }} props
 */
function OnboardingModalInner({ onDone }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;
  const modalRef = useRef(null);
  useFocusTrap(true, modalRef);

  const close = () => {
    markOnboardingDone();
    onDone();
  };

  const advance = () => {
    if (isLast) { close(); return; }
    setIdx((i) => i + 1);
  };

  const handleCta = () => {
    close();
    if (slide.cta?.to) navigate(slide.cta.to);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-[480px] rounded-2xl flex flex-col"
        style={{
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding"
      >
        {/* Close */}
        <button
          type="button"
          onClick={close}
          aria-label="Schließen"
          className="absolute top-4 right-4 h-7 w-7 grid place-items-center rounded-lg text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-8 pt-9 pb-6 flex flex-col gap-4">
          {/* Step + eyebrow */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--color-accent-400)" }}>
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="text-[11px] text-[var(--color-fg-dim)] uppercase tracking-[0.12em] font-medium">{slide.eyebrow}</span>
          </div>

          {/* Heading */}
          <h2
            className="text-[24px] sm:text-[28px] font-normal leading-[1.1] text-[var(--color-fg)]"
            style={{ fontFamily: SERIF, letterSpacing: "-0.02em" }}
          >
            {slide.heading}
          </h2>

          {/* Body */}
          <p className="text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">
            {slide.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          {/* Primary CTA or Next */}
          {slide.cta ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCta}
                className="flex-1 h-11 rounded-xl inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-all hover:-translate-y-px"
                style={{
                  background: "var(--color-accent-500)",
                  color: "#0b0b14",
                  boxShadow: "0 0 0 1px rgba(124,125,240,.4), 0 4px 14px rgba(124,125,240,.18)",
                }}
              >
                {slide.cta.label}
                <ArrowRight className="w-4 h-4" />
              </button>
              {!isLast && (
                <button
                  type="button"
                  onClick={advance}
                  className="h-11 px-4 rounded-xl text-[14px] font-medium border transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                  style={{ borderColor: "rgba(255,255,255,0.10)", color: "var(--color-fg-muted)" }}
                >
                  Weiter
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="w-full h-11 rounded-xl inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-all hover:-translate-y-px"
              style={{
                background: "var(--color-accent-500)",
                color: "#0b0b14",
                boxShadow: "0 0 0 1px rgba(124,125,240,.4), 0 4px 14px rgba(124,125,240,.18)",
              }}
            >
              {isLast ? "Loslegen" : "Weiter"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Skip (only on non-last slides) */}
          {!isLast && (
            <button
              type="button"
              onClick={close}
              className="text-[12px] text-center text-[var(--color-fg-faint)] hover:text-[var(--color-fg-dim)] transition-colors py-1"
            >
              Überspringen
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className="transition-all rounded-full"
              style={{
                width: i === idx ? "18px" : "5px",
                height: "5px",
                background: i === idx ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.14)",
              }}
              aria-label={`Schritt ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Mount point — renders the modal only on first visit.
 * Drop this anywhere in the authenticated app tree.
 */
export default function OnboardingModal() {
  const [open, setOpen] = useState(() => !hasSeenOnboarding());
  if (!open) return null;
  return createPortal(
    <OnboardingModalInner onDone={() => setOpen(false)} />,
    document.body,
  );
}
