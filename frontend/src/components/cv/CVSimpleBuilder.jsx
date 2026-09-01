import { useEffect, useRef, useState } from "react";
import {
  Download, ChevronLeft, Palette, Type, Layout,
  User, GraduationCap, Briefcase, Wrench, Languages, ClipboardCheck, Check,
} from "lucide-react";
import StepPersonal from "./StepPersonal";
import StepSchule from "./StepSchule";
import StepErfahrungen from "./StepErfahrungen";
import StepSkills from "./StepSkills";
import StepInteressen from "./StepInteressen";
import { TemplatePreviewPanel } from "../../cv/CVTemplatePicker";
import { getTemplateMeta } from "../../cv/templateRegistry";
import { normalizeAccentColor, normalizeFontFamily } from "../../cv/cvModel";
import clsx from "clsx";
import toast from "react-hot-toast";

const ACCENTS = [
  { name: "Rot", value: "#C8102E" },
  { name: "Blau", value: "#1C3557" },
  { name: "Dunkel", value: "#1A1A1A" },
];

const FONTS = [
  { name: "Sans", value: "sans" },
  { name: "Serif", value: "serif" },
];

/** Per-section completion predicates — used by the left progress rail. */
const SECTIONS = [
  {
    id: "persoenliches",
    label: "Persönliche Daten",
    icon: User,
    complete: (p) => Boolean(p?.vorname?.trim() && p?.nachname?.trim()),
  },
  {
    id: "ausbildung",
    label: "Ausbildung",
    icon: GraduationCap,
    complete: (p) => Boolean(p?.schulname?.trim() || p?.schultyp),
  },
  {
    id: "berufserfahrung",
    label: "Berufserfahrung",
    icon: Briefcase,
    complete: (p) => Boolean(Array.isArray(p?.erfahrungen) && p.erfahrungen.length > 0),
    optional: true,
  },
  {
    id: "faehigkeiten",
    label: "Kenntnisse",
    icon: Wrench,
    complete: (p) => Boolean(Array.isArray(p?.faehigkeiten) && p.faehigkeiten.length > 0),
  },
  {
    id: "sprachen",
    label: "Sprachen & Interessen",
    icon: Languages,
    complete: (p) =>
      Boolean(
        (Array.isArray(p?.sprachkenntnisse) && p.sprachkenntnisse.length > 0) ||
        (Array.isArray(p?.aktivitaeten) && p.aktivitaeten.length > 0)
      ),
  },
  { id: "export", label: "Prüfen & Exportieren", icon: ClipboardCheck, complete: () => true },
];

/**
 * CVSimpleBuilder — 3-zone editing workspace.
 *
 *   LEFT:  sticky section navigation with per-section completion state
 *   CENTER: editing workspace (one section per scroll anchor)
 *   RIGHT:  sticky live CV preview + design controls
 *
 * Desktop only for the left rail — on smaller screens a horizontal pill row
 * replaces it so the form stays the focus.
 */
export default function CVSimpleBuilder({ profile, onChange, onBack, onDownload, pdfBusy, pdfError }) {
  const [design, setDesign] = useState({
    accent: normalizeAccentColor(profile.accentColor),
    font: normalizeFontFamily(profile.fontFamily),
    showPhoto: profile.showPhoto !== false,
  });
  const [activeSection, setActiveSection] = useState("persoenliches");
  const [exportAttempted, setExportAttempted] = useState(false);
  const sectionRefs = useRef({});
  const template = getTemplateMeta(profile.templateId);
  const completedSections = SECTIONS.slice(0, 5).filter((section) => section.complete(profile) || section.optional).length;
  const requiredNamesPresent = Boolean(profile.vorname?.trim() && profile.nachname?.trim());

  const patchDesign = (delta) => {
    const next = { ...design, ...delta };
    setDesign(next);
    onChange({ accentColor: next.accent, fontFamily: next.font, showPhoto: next.showPhoto });
  };

  useEffect(() => {
    setDesign({
      accent: normalizeAccentColor(profile.accentColor),
      font: normalizeFontFamily(profile.fontFamily),
      showPhoto: profile.showPhoto !== false,
    });
  }, [profile.accentColor, profile.fontFamily, profile.showPhoto]);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // The section with the largest visible ratio wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const requestDownload = (templateId) => {
    setExportAttempted(true);
    if (!requiredNamesPresent) {
      toast.error("Bitte zuerst Vor- und Nachname ergänzen.");
      scrollTo("persoenliches");
      return false;
    }
    return onDownload(templateId);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)]">
      {/* Top bar — on phones it stacks below the app shell's own sticky
          header (56px + border), so its back/PDF controls stay reachable while
          scrolled instead of sliding underneath them. */}
      <div className="sticky top-[57px] z-30 md:top-0 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-h-9 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Übersicht
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-dim)]">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent-500)" }} />
              Lebenslauf bearbeiten
            </span>
          </div>
          <button
            type="button"
              onClick={() => requestDownload()}
            disabled={pdfBusy}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold bg-[var(--color-accent-500)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {pdfBusy ? "Wird erstellt…" : "PDF"}
          </button>
        </div>
      </div>

      {/* Mobile section pills — stick below the top bar (57 + 57 = 114px). */}
      <div className="lg:hidden sticky top-[114px] z-20 md:top-[57px] bg-[var(--color-bg)]/90 backdrop-blur-sm border-b border-[var(--color-border-subtle)]">
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {SECTIONS.map((s, i) => {
            const isDone = s.complete(profile);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={clsx(
                  "flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-medium border transition-colors",
                  activeSection === s.id
                    ? "border-[var(--color-accent-500)] text-[var(--color-accent-600)] bg-[var(--color-accent-50)]"
                    : "border-[var(--color-border)] text-[var(--color-fg-dim)]"
                )}
              >
                {isDone && s.id !== "export" ? (
                  <Check className="w-3 h-3" style={{ color: "var(--color-success)" }} />
                ) : (
                  <span className="text-[10px] opacity-70">{i + 1}</span>
                )}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">

          {/* ── LEFT: section navigation (desktop) ── */}
          <aside className="hidden lg:block lg:col-span-2">
            <nav className="sticky top-[72px] flex flex-col gap-0.5">
              <div className="mb-3 rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-elev-1)" }}>
                <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: "var(--color-fg-muted)" }}><span>Fortschritt</span><span>{completedSections}/5</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-bg-elev-3)" }}><div className="h-full rounded-full transition-[width]" style={{ width: `${completedSections * 20}%`, background: "var(--app-brand)" }} /></div>
              </div>
              {SECTIONS.map((s, i) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                const isDone = s.complete(profile);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollTo(s.id)}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors duration-100",
                      isActive ? "text-[var(--color-fg)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
                    )}
                    style={{
                      background: isActive ? "var(--color-bg-elev-2)" : "transparent",
                    }}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span
                      className="grid place-items-center w-6 h-6 rounded-md flex-shrink-0 transition-colors"
                      style={{
                        background: isDone ? "color-mix(in srgb, var(--color-success) 12%, transparent)" : "var(--color-bg-elev-3)",
                        color: isDone ? "var(--color-success)" : isActive ? "var(--color-accent-600)" : "var(--color-fg-faint)",
                      }}
                    >
                      {isDone && s.id !== "export" ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    </span>
                    <span className="flex-1 min-w-0 leading-tight">{s.label}</span>
                    <span className="text-[9px] text-[var(--color-fg-faint)]">{s.optional && !isDone ? "Optional" : i + 1}</span>
                  </button>
                );
              })}

            </nav>
          </aside>

          {/* ── CENTER: editing workspace ── */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {SECTIONS.slice(0, 5).map((s) => (
              <section
                key={s.id}
                id={s.id}
                ref={(el) => { sectionRefs.current[s.id] = el; }}
                className="flex flex-col gap-4 scroll-mt-[170px] lg:scroll-mt-[92px]"
              >
                <h3 className="text-[15px] font-semibold text-[var(--color-fg)] flex items-center gap-2">
                  <s.icon className="w-4 h-4" style={{ color: "var(--color-accent-600)" }} />
                  {s.label}
                  {s.complete(profile) && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--color-success)" }}>
                      <Check className="w-3 h-3" /> Erledigt
                    </span>
                  )}
                  {s.optional && !s.complete(profile) && <span className="text-[10px] font-normal" style={{ color: "var(--color-fg-faint)" }}>Optional</span>}
                </h3>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 sm:p-5">
                  {s.id === "persoenliches" && <StepPersonal profile={profile} onChange={onChange} errors={exportAttempted ? {
                    vorname: profile.vorname?.trim() ? undefined : "Vorname fehlt.",
                    nachname: profile.nachname?.trim() ? undefined : "Nachname fehlt.",
                  } : {}} />}
                  {s.id === "ausbildung" && <StepSchule profile={profile} onChange={onChange} />}
                  {s.id === "berufserfahrung" && <StepErfahrungen profile={profile} onChange={onChange} />}
                  {s.id === "faehigkeiten" && <StepSkills profile={profile} onChange={onChange} />}
                  {s.id === "sprachen" && <StepInteressen profile={profile} onChange={onChange} />}
                </div>
              </section>
            ))}

            {/* Prüfen & Exportieren */}
            <section id="export" ref={(el) => { sectionRefs.current.export = el; }} className="flex flex-col gap-4 scroll-mt-[170px] lg:scroll-mt-[92px]">
              <h3 className="text-[15px] font-semibold text-[var(--color-fg)] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" style={{ color: "var(--color-accent-600)" }} />
                Prüfen & Exportieren
              </h3>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-5 flex flex-col gap-4">
                <ul className="flex flex-col gap-1.5">
                  {SECTIONS.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-[13px]" style={{ color: s.complete(profile) ? "var(--color-fg-muted)" : "var(--color-fg)" }}>
                      {s.complete(profile) || s.optional ? (
                        <Check className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "var(--color-border-strong)" }} />
                      )}
                      {s.label}{s.optional && !s.complete(profile) ? " (optional)" : ""}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => requestDownload()}
                  disabled={pdfBusy}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-[13.5px] font-semibold bg-[var(--color-accent-500)] text-white hover:opacity-90 disabled:opacity-50 transition-all self-start"
                >
                  <Download className="w-4 h-4" />
                  {pdfBusy ? "Wird erstellt…" : "Als PDF herunterladen"}
                </button>
                {pdfError && <p className="text-[13px] text-[var(--color-error)]">{pdfError}</p>}
                {!requiredNamesPresent && <button type="button" onClick={() => scrollTo("persoenliches")} className="self-start text-left text-[12px] font-medium" style={{ color: "var(--color-error)" }}>Vor- und Nachname fehlen — persönliche Daten ergänzen →</button>}
              </div>
            </section>
          </div>

          {/* ── RIGHT: sticky live preview + design ── */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Desktop only: on phones the preview lives at the end of the
                flow — pinning it would fight the stacked sticky chrome. */}
            <div className="lg:sticky lg:top-[72px] flex flex-col gap-5">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 overflow-hidden">
                <TemplatePreviewPanel profile={profile} templateId={profile.templateId} onDownload={requestDownload} />
              </div>

              {/* Design panel */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4">
                <h3 className="text-[13px] font-semibold text-[var(--color-fg)] mb-3 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[var(--color-fg-muted)]" />
                  Design
                </h3>
                <div className="flex flex-col gap-3">
                  {template.style === "Modern" && <div className="flex items-center gap-2">
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
                  </div>}
                  <div className="flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-[var(--color-fg-dim)]" />
                    <span className="text-[12px] text-[var(--color-fg-muted)] w-14">Schrift</span>
                    <div className="flex gap-2">
                      {FONTS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => patchDesign({ font: f.value })}
                          className={`min-h-8 px-2.5 rounded-md text-[12px] font-medium border transition-all ${design.font === f.value ? "border-[var(--color-accent-400)] text-[var(--color-accent-600)] bg-[var(--color-accent-50)]" : "border-[var(--color-border)] text-[var(--color-fg-dim)]"}`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {template.photo !== "no" ? <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.showPhoto}
                      onChange={(e) => patchDesign({ showPhoto: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-[var(--color-border)] accent-[var(--color-accent-500)]"
                    />
                    <span className="text-[12px] text-[var(--color-fg-muted)]">Foto anzeigen</span>
                  </label> : <p className="m-0 text-[11px] leading-relaxed" style={{ color: "var(--color-fg-faint)" }}>Diese Vorlage ist bewusst ohne Foto gestaltet.</p>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
