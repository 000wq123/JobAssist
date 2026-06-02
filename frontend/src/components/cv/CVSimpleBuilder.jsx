import { useState } from "react";
import { Download, ChevronLeft, Palette, Type, Layout } from "lucide-react";
import StepPersonal from "./StepPersonal";
import StepSchule from "./StepSchule";
import StepErfahrungen from "./StepErfahrungen";
import StepSkills from "./StepSkills";
import StepInteressen from "./StepInteressen";
import { TemplatePreviewPanel } from "../../cv/CVTemplatePicker";

const ACCENTS = [
  { name: "Blau", value: "#1C3557" },
  { name: "Grau", value: "#9ca3af" },
  { name: "Dunkel", value: "#1a1a1a" },
];

const FONTS = [
  { name: "Arial", value: "Arial,Helvetica,sans-serif" },
  { name: "Serif", value: "'Instrument Serif',Georgia,serif" },
];

/**
 * CVSimpleBuilder — single-page form + live preview.
 * Replaces the scene wizard with a clean split-screen experience.
 */
export default function CVSimpleBuilder({ profile, onChange, onBack, onDownload, pdfBusy, pdfError }) {
  const [design, setDesign] = useState({
    accent: profile.accentColor || "#1C3557",
    font: profile.fontFamily || "Arial,Helvetica,sans-serif",
    showPhoto: profile.showPhoto !== false,
  });

  const patchDesign = (delta) => {
    const next = { ...design, ...delta };
    setDesign(next);
    onChange({ accentColor: next.accent, fontFamily: next.font, showPhoto: next.showPhoto });
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Übersicht
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={pdfBusy}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold bg-[var(--color-accent-500)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {pdfBusy ? "Wird erstellt…" : "PDF"}
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* Left: Form */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <Section title="Persönliches">
              <StepPersonal profile={profile} onChange={onChange} />
            </Section>
            <Section title="Ausbildung">
              <StepSchule profile={profile} onChange={onChange} />
            </Section>
            <Section title="Berufserfahrung">
              <StepErfahrungen profile={profile} onChange={onChange} />
            </Section>
            <Section title="Fähigkeiten">
              <StepSkills profile={profile} onChange={onChange} />
            </Section>
            <Section title="Sprachen & Interessen">
              <StepInteressen profile={profile} onChange={onChange} />
            </Section>

            {pdfError && (
              <p className="text-[13px] text-[var(--color-error)]">{pdfError}</p>
            )}
          </div>

          {/* Right: Preview + Design */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="sticky top-[72px] flex flex-col gap-5">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 overflow-hidden">
                <TemplatePreviewPanel profile={profile} templateId={profile.templateId} />
              </div>

              {/* Design panel */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
                <h3 className="text-[13px] font-semibold text-[var(--color-fg)] mb-3 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[var(--color-fg-muted)]" />
                  Design
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-[var(--color-fg-dim)]" />
                    <span className="text-[12px] text-[var(--color-fg-muted)] w-14">Farbe</span>
                    <div className="flex gap-2">
                      {ACCENTS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => patchDesign({ accent: a.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${design.accent === a.value ? "border-[var(--color-accent-400)] scale-110" : "border-transparent"}`}
                          style={{ background: a.value }}
                          title={a.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-[var(--color-fg-dim)]" />
                    <span className="text-[12px] text-[var(--color-fg-muted)] w-14">Schrift</span>
                    <div className="flex gap-1.5">
                      {FONTS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => patchDesign({ font: f.value })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${design.font === f.value ? "border-[var(--color-accent-400)] text-[var(--color-accent-600)] bg-[var(--color-accent-50)]" : "border-[var(--color-border)] text-[var(--color-fg-dim)]"}`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.showPhoto}
                      onChange={(e) => patchDesign({ showPhoto: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-[var(--color-border)] accent-[var(--color-accent-500)]"
                    />
                    <span className="text-[12px] text-[var(--color-fg-muted)]">Foto anzeigen</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">{title}</h3>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}
