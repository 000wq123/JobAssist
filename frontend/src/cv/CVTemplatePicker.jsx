/**
 * Curated CV template picker. Uses the shared lightweight preview renderer;
 * PDF generation remains lazy-loaded by the existing export flow.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Maximize2, Minimize2, Minus, Plus, X } from "lucide-react";
import { CV_TEMPLATES, TEMPLATE_FILTERS, templateMatchesFilter } from "./templateRegistry";
import { renderCVBody } from "./cvPreview.jsx";
import { normalizeProfile, DESIGN_PREVIEW, A4 } from "./cvModel.js";

const DESIGN_MODEL = normalizeProfile(DESIGN_PREVIEW.profile);
const THUMBNAIL_HEIGHT = 300;

/* Fullscreen viewer chrome follows the active app theme. The CV page itself
   stays paper-colored because it is also the printable document. */
const VIEWER = {
  overlay: "color-mix(in srgb, var(--app-bg) 78%, transparent)",
  shell: "var(--app-surface)",
  toolbar: "var(--app-surface-hover)",
  stage: "var(--app-bg)",
  footer: "var(--app-surface)",
  border: "var(--app-border)",
  focus: "var(--app-focus-ring)",
};

/* Zoom clamps (absolute A4 scale). Wide enough to inspect detail, never so
   far that the page escapes the stage entirely (stage scrolls to pan). */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
/* Breathing room around the page inside the stage (accounts for the side
   arrows and the position pill). */
const STAGE_PAD = 56;

/** Compact square toolbar button with hover / focus-visible / tooltip.
    44px hit area on phones (visual size unchanged via negative margin). */
function ToolbarButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-11 w-11 -m-1.5 sm:m-0 sm:h-8 sm:w-8 cursor-pointer place-items-center rounded-md text-[var(--app-text-muted)] transition-colors duration-150 hover:bg-[var(--app-surface-selected)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-35"
      style={{ outlineColor: VIEWER.focus }}
    >
      {children}
    </button>
  );
}


/** @param {{ template: object }} props */
function PhotoBadge({ template }) {
  const label = template.photo === "no" ? "Ohne Foto" : template.photo === "yes" ? "Mit Foto" : "Foto möglich";
  return (
    <span className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white" style={{ background: "rgba(22, 22, 27, 0.78)" }}>
      {label}
    </span>
  );
}

/** @param {{ template: object, selected: boolean, scale: number, onSelect: function, onPreview: function }} props */
function TemplateCard({ template, selected, scale, onSelect, onPreview }) {
  return (
    <article
      data-template-id={template.id}
      tabIndex={0}
      onClick={() => onSelect(template.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(template.id);
        }
      }}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-[0_5px_18px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? "border-[var(--app-brand)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"}`}
      style={{
        outlineColor: "var(--app-focus-ring)",
        background: selected ? "color-mix(in srgb, var(--app-brand) 3%, var(--color-bg-elev-1))" : "var(--color-bg-elev-1)",
      }}
    >
      <div className="p-2.5 sm:p-3">
        <div data-paper-frame className="relative w-full overflow-hidden rounded-[5px]" style={{ height: `clamp(210px, 18vw, ${THUMBNAIL_HEIGHT}px)`, background: "var(--app-cv-paper, #F7F6F2)", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.08), 0 10px 24px rgba(0,0,0,0.14)" }}>
          <div style={{ width: A4.W * scale, height: A4.H * scale, margin: "0 auto", overflow: "hidden", position: "relative", pointerEvents: "none" }}>
            <div
              className="cv-stage"
              data-cv-document="true"
              data-preview-kind="gallery"
              data-template-id={template.id}
              style={{ width: A4.W, height: A4.H, boxSizing: "border-box", transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff" }}
            >
              {renderCVBody(template.id, DESIGN_MODEL)}
            </div>
          </div>
          {selected && <span className="absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--app-brand)", boxShadow: "0 2px 8px rgba(0,0,0,0.28)" }} aria-hidden="true"><svg width="11" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
          <PhotoBadge template={template} />
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-3 px-4 pb-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-[16px] font-semibold leading-tight" style={{ color: "var(--color-fg)" }}>{template.name}</h2>
            {template.recommended && <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ background: "color-mix(in srgb, var(--app-brand) 10%, transparent)", color: "var(--app-brand)" }}>Empfohlen</span>}
          </div>
          <p className="m-0 mt-1 text-[12.5px] leading-snug" style={{ color: "var(--color-fg-dim)" }}>{template.description}</p>
          <p className="m-0 mt-2 line-clamp-1 text-[11px]" style={{ color: "var(--color-fg-faint)" }}>{template.bestFor}</p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={(event) => { event.stopPropagation(); onPreview(template.id); }} className="min-h-[44px] sm:min-h-0 sm:h-8 rounded-lg border px-3 text-[11.5px] font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-fg-muted)" }}>Vorschau</button>
            <button type="button" aria-pressed={selected} onClick={(event) => { event.stopPropagation(); onSelect(template.id); }} className="min-h-[44px] sm:min-h-0 sm:h-8 rounded-lg px-3 text-[11.5px] font-semibold text-white" style={{ background: "var(--app-brand)" }}>{selected ? "Auswahl aufheben" : "Auswählen"}</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Compact floating selection dock — appears (portal to body) only after the
 * user actively selects a template. Centered near the bottom on desktop; a
 * compact bottom bar above the mobile navigation on small screens.
 *
 * @param {{ template: object, onPreview: function, onContinue: function }} props
 */
function SelectionDock({ template, onPreview, onContinue }) {
  return createPortal(
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+66px)] z-[90] md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[min(660px,calc(100vw-48px))] md:-translate-x-1/2">
      <div data-selection-dock role="region" aria-label="Ausgewählte Vorlage" className="rounded-xl border" style={{ borderColor: "var(--color-border-strong)", background: "var(--color-bg-elev-2)", boxShadow: "0 12px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--app-brand)" }} aria-hidden="true"><svg width="11" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <div className="min-w-0 leading-tight">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-fg)" }}>Ausgewählt</p>
              <p className="m-0 truncate text-[13px] font-semibold" style={{ color: "var(--color-fg)" }}>{template.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => onPreview(template.id)} className="min-h-[44px] md:min-h-0 h-9 cursor-pointer rounded-lg border px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--color-bg-elev-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: "var(--color-border)", color: "var(--color-fg)", outlineColor: "var(--app-focus-ring)" }}>Vorschau</button>
            <button type="button" onClick={onContinue} className="min-h-[44px] md:min-h-0 h-9 cursor-pointer rounded-lg px-3.5 text-[12.5px] font-semibold transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: "var(--app-brand)", color: "#fff", outlineColor: "var(--app-focus-ring)" }}>Weiter →</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Fullscreen CV preview — document-viewer modal matching the approved mockup.
 *
 * Dark layered surface (overlay → shell → toolbar → stage → footer), A4 page
 * on a presentation stage with fit/fill/manual zoom, side template arrows,
 * position pill, PDF export and a CTA anchored to the modal. Reuses the
 * shared renderCVBody renderer and the lazy downloadCVPdf export flow.
 *
 * @param {{ startId: string, profile?: object, onClose: function, onSelect: function, onDownload?: function }} props
 */
function PreviewOverlay({ startId, profile, onClose, onSelect, onDownload }) {
  const [index, setIndex] = useState(Math.max(0, CV_TEMPLATES.findIndex((item) => item.id === startId)));
  const [mode, setMode] = useState("fit"); // "fit" | "fill" | "manual"
  const [scale, setScale] = useState(0.5);
  const [pdfBusy, setPdfBusy] = useState(false);
  const stageRef = useRef(null);
  const modalRef = useRef(null);
  const modeRef = useRef(mode);
  const fitScaleRef = useRef(0.5);
  const fillScaleRef = useRef(0.6);
  const active = CV_TEMPLATES[index];
  const model = profile ? normalizeProfile(profile) : DESIGN_MODEL;
  modeRef.current = mode;

  // Measure the stage and keep the page fitted to it while in fit/fill mode.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const measure = () => {
      const w = node.clientWidth - STAGE_PAD;
      const h = node.clientHeight - STAGE_PAD;
      fitScaleRef.current = Math.max(0.1, Math.min(w / A4.W, h / A4.H));
      fillScaleRef.current = Math.max(0.1, w / A4.W);
      if (modeRef.current === "fit") setScale(fitScaleRef.current);
      else if (modeRef.current === "fill") setScale(fillScaleRef.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Re-apply the fit/fill scale whenever the mode switches.
  useEffect(() => {
    if (mode === "fit") setScale(fitScaleRef.current);
    else if (mode === "fill") setScale(fillScaleRef.current);
  }, [mode]);

  // Scroll-lock the page, trap focus inside the modal, restore focus to the
  // triggering card on close.
  useEffect(() => {
    const root = modalRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    root?.querySelector("button")?.focus();
    const onTab = (event) => {
      if (event.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])")).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onTab);
    return () => {
      document.documentElement.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onTab);
      previouslyFocused?.focus();
    };
  }, []);

  // Keyboard: Esc close · ←/→ template · +/= zoom in · − zoom out.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      else if (event.key === "ArrowRight") setIndex((value) => Math.min(CV_TEMPLATES.length - 1, value + 1));
      else if (event.key === "+" || event.key === "=") { setMode("manual"); setScale((value) => Math.min(MAX_ZOOM, value * 1.15)); }
      else if (event.key === "-") { setMode("manual"); setScale((value) => Math.max(MIN_ZOOM, value * 0.85)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zoomIn = () => { setMode("manual"); setScale((value) => Math.min(MAX_ZOOM, value * 1.15)); };
  const zoomOut = () => { setMode("manual"); setScale((value) => Math.max(MIN_ZOOM, value * 0.85)); };
  const toggleFill = () => setMode((value) => (value === "fill" ? "fit" : "fill"));

  const handleDownload = async () => {
    if (!onDownload) return;
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await onDownload(active.id);
    } catch {
      toast.error("PDF konnte nicht erstellt werden.");
    } finally {
      setPdfBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] grid place-items-center overflow-hidden p-0 sm:p-6"
      style={{ background: VIEWER.overlay, backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      {/* ── Modal shell (the dialog) ────────────────────────────── */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${active.name} — Vollbildvorschau`}
        className="flex h-full w-full flex-col overflow-hidden sm:h-[88vh] sm:w-[min(1280px,82vw)] sm:rounded-2xl sm:border"
        style={{ background: VIEWER.shell, borderColor: VIEWER.border, boxShadow: "var(--app-shadow-modal)" }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Top toolbar ───────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3" style={{ background: VIEWER.toolbar, borderColor: VIEWER.border }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ background: "var(--app-brand-soft)" }} aria-hidden="true">
              <FileText className="h-4 w-4" style={{ color: "var(--app-brand)" }} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="m-0 truncate text-[13px] font-semibold text-[var(--app-text)]">{active.name}</p>
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--app-text-faint)]">{profile ? "Vollbildvorschau" : "Beispielvorschau"}</p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ToolbarButton onClick={zoomOut} label="Verkleinern (Minus)"><Minus className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={zoomIn} label="Vergrößern (Plus)"><Plus className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton onClick={toggleFill} label={mode === "fill" ? "Auf Seite einpassen" : "Breite ausfüllen"}>
              {mode === "fill" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </ToolbarButton>
            {onDownload && profile && <ToolbarButton onClick={handleDownload} disabled={pdfBusy} label="Als PDF herunterladen">
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </ToolbarButton>}
            <span className="mx-0.5 h-5 w-px shrink-0" style={{ background: "var(--app-border)" }} aria-hidden="true" />
            <ToolbarButton onClick={onClose} label="Schließen (Esc)"><X className="h-4 w-4" /></ToolbarButton>
          </div>
        </header>

        {/* ── Preview stage ─────────────────────────────────────── */}
        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto" style={{ background: VIEWER.stage }}>
          <div className="flex min-h-full min-w-full" style={{ padding: "clamp(18px, 3.5vh, 40px) 48px", background: VIEWER.stage }}>
            <div className="m-auto shrink-0 rounded-[2px]" style={{ width: A4.W * scale, height: A4.H * scale, boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 3px 10px rgba(0,0,0,0.4)" }}>
              <div
                className="cv-stage"
                data-cv-document="true"
                data-preview-kind="fullscreen"
                data-template-id={active.id}
                style={{ width: A4.W, height: A4.H, transform: `scale(${scale})`, transformOrigin: "top left", background: "var(--app-cv-paper, #FDFCF9)" }}
              >
                {renderCVBody(active.id, model)}
              </div>
            </div>
          </div>

          {/* Side template navigation — sits in the stage padding, never over the page */}
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            aria-label="Vorherige Vorlage"
            className="absolute left-1.5 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[var(--app-text-muted)] transition-colors duration-150 hover:bg-[var(--app-surface-selected)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-30 sm:left-2 sm:h-9 sm:w-9"
            style={{ background: "var(--app-surface)", outlineColor: VIEWER.focus, boxShadow: "var(--app-shadow-card)" }}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((value) => Math.min(CV_TEMPLATES.length - 1, value + 1))}
            disabled={index === CV_TEMPLATES.length - 1}
            aria-label="Nächste Vorlage"
            className="absolute right-1.5 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[var(--app-text-muted)] transition-colors duration-150 hover:bg-[var(--app-surface-selected)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-30 sm:right-2 sm:h-9 sm:w-9"
            style={{ background: "var(--app-surface)", outlineColor: VIEWER.focus, boxShadow: "var(--app-shadow-card)" }}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Position indicator */}
          <div className="pointer-events-none absolute bottom-3 left-4 z-10 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--app-text-secondary)]" style={{ background: "var(--app-surface)", boxShadow: "var(--app-shadow-card)" }}>
            {index + 1} / {CV_TEMPLATES.length}
          </div>
        </div>

        {/* ── Bottom action bar ─────────────────────────────────── */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-3 sm:px-4" style={{ background: VIEWER.footer, borderColor: VIEWER.border }}>
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-lg border px-4 text-[13px] font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            style={{ borderColor: "var(--app-border)", outlineColor: VIEWER.focus }}
          >
            Zurück zur Auswahl
          </button>
          <button
            type="button"
            onClick={() => { onSelect(active.id); onClose(); }}
            className="h-10 cursor-pointer rounded-lg px-5 text-[13px] font-semibold text-white transition-[filter] duration-150 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            style={{ background: "var(--app-brand)", outlineColor: VIEWER.focus }}
          >
            Diese Vorlage verwenden →
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

/** @param {{ profile: object, onChange: function, onContinue: function }} props */
export function CVTemplatePicker({ profile, onChange, onContinue }) {
  const selectedId = profile.templateId || null;
  const selectedTemplate = CV_TEMPLATES.find((item) => item.id === selectedId) || null;
  const [filter, setFilter] = useState("all");
  const [previewId, setPreviewId] = useState(null);
  const [picked, setPicked] = useState(false);
  const [scale, setScale] = useState(0.5);
  const galleryRef = useCallback((node) => {
    if (!node) return undefined;
    const measure = () => { const frame = node.querySelector("[data-paper-frame]"); if (frame) setScale(frame.offsetWidth / A4.W); };
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const handleSelect = useCallback((id) => {
    const deselecting = selectedId === id;
    setPicked(!deselecting);
    onChange({ templateId: deselecting ? "" : id });
  }, [onChange, selectedId]);
  const visible = CV_TEMPLATES.filter((item) => templateMatchesFilter(item, filter));

  return <div className={`mx-auto max-w-[1120px] ${picked ? "pb-40 md:pb-32" : "pb-6"}`}>
    <div className="min-w-0">
      <header><h1 className="m-0 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]" style={{ color: "var(--color-fg)" }}>Wähle deinen Lebenslauf</h1><p className="m-0 mt-2 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>Wähle ein Design, das zu dir und deiner Bewerbung passt.</p></header>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Vorlagen filtern">{TEMPLATE_FILTERS.map((item) => { const active = filter === item.key; return <button key={item.key} type="button" aria-pressed={active} onClick={() => setFilter(item.key)} className="min-h-[44px] sm:min-h-0 sm:h-8 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[12px] font-medium transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ outlineColor: "var(--app-focus-ring)", borderColor: active ? "var(--color-border-strong)" : "var(--color-border)", background: active ? "var(--color-bg-elev-3)" : "transparent", color: active ? "var(--color-fg)" : "var(--color-fg-dim)" }}>{item.label}</button>; })}</div>
      <section ref={galleryRef} className="mt-6 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 sm:gap-7" aria-label="Vorlagen-Galerie">{visible.map((item) => <div key={item.id} className="min-w-0"><TemplateCard template={item} selected={selectedId === item.id} scale={scale} onSelect={handleSelect} onPreview={setPreviewId} /></div>)}{visible.length === 0 && <p className="col-span-2 py-12 text-center text-sm" style={{ color: "var(--color-fg-faint)" }}>Keine Vorlagen für diesen Filter.</p>}</section>
    </div>
    {picked && selectedTemplate && <SelectionDock template={selectedTemplate} onPreview={setPreviewId} onContinue={onContinue} />}
    {previewId && <PreviewOverlay startId={previewId} onClose={() => setPreviewId(null)} onSelect={handleSelect} />}
  </div>;
}

export function TemplateLightbox({ templateId, profile, onClose, onSelect, onDownload }) { return <PreviewOverlay startId={templateId} profile={profile} onClose={onClose} onSelect={onSelect} onDownload={onDownload} />; }

/** Live builder preview retaining the shared model and renderer. */
export function TemplatePreviewPanel({ profile, templateId, onDownload }) {
  const id = templateId || profile?.templateId || "tabellarisch";
  const model = normalizeProfile(profile);
  const [scale, setScale] = useState(0.5);
  const [open, setOpen] = useState(false);
  const ref = useCallback((node) => { if (!node) return undefined; const measure = () => setScale(node.offsetWidth / A4.W); requestAnimationFrame(measure); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, []);
  return <div className="flex h-full flex-col gap-3" data-live-preview><div className="flex items-center justify-between"><p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-fg-faint)" }}>Vorlage — {CV_TEMPLATES.find((item) => item.id === id)?.name || id}</p><button type="button" onClick={() => setOpen(true)} className="min-h-[44px] lg:min-h-0 cursor-pointer text-[12px] font-medium" style={{ color: "var(--app-brand)" }}>Vollbild öffnen</button></div><div ref={ref} className="relative overflow-hidden rounded-md" style={{ height: A4.H * scale, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}><div style={{ width: A4.W, height: A4.H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff" }}>{renderCVBody(id, model)}</div></div>{open && <TemplateLightbox templateId={id} profile={profile} onClose={() => setOpen(false)} onSelect={() => setOpen(false)} onDownload={onDownload} />}</div>;
}
