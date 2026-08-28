/**
 * Curated CV template picker. Uses the shared lightweight preview renderer;
 * PDF generation remains lazy-loaded by the existing export flow.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CV_TEMPLATES, TEMPLATE_FILTERS, templateMatchesFilter } from "./templateRegistry";
import { renderCVBody } from "./cvPreview.jsx";
import { renderCVThumbnail, THUMB } from "./cvThumbnail.jsx";
import { normalizeProfile, DESIGN_PREVIEW, A4 } from "./cvModel.js";

const DESIGN_MODEL = normalizeProfile(DESIGN_PREVIEW.profile);
const THUMBNAIL_HEIGHT = 300;


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
          <div style={{ width: THUMB.W * scale, height: THUMB.H * scale, margin: "0 auto", overflow: "hidden", position: "relative", pointerEvents: "none" }}>
            <div className="cv-stage" style={{ width: THUMB.W, height: THUMB.H, boxSizing: "border-box", transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {renderCVThumbnail(template.id, DESIGN_MODEL)}
            </div>
          </div>
          {/* eslint-disable-next-line no-restricted-syntax -- hover scrim overlay, not layout */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <button type="button" onClick={(event) => { event.stopPropagation(); onPreview(template.id); }} className="absolute left-1/2 top-1/2 z-10 flex h-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100" style={{ background: "rgba(22, 22, 27, 0.82)" }} aria-label={`Große Vorschau für ${template.name} öffnen`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            Vorschau
          </button>
          {selected && <span className="absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--app-brand)", boxShadow: "0 2px 8px rgba(0,0,0,0.28)" }} aria-hidden="true"><svg width="11" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
          <PhotoBadge template={template} />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 px-4 pb-4 sm:px-5">
        <div className="min-w-0"><h2 className="m-0 text-[16px] font-semibold leading-tight" style={{ color: "var(--color-fg)" }}>{template.name}</h2><p className="m-0 mt-1 line-clamp-2 text-[12.5px] leading-snug" style={{ color: "var(--color-fg-dim)" }}>{template.description}</p></div>
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
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-fg-muted)" }}>Ausgewählt</p>
              <p className="m-0 truncate text-[13px] font-semibold" style={{ color: "var(--color-fg)" }}>{template.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => onPreview(template.id)} className="h-9 cursor-pointer rounded-lg border px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--color-bg-elev-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: "var(--color-border)", color: "var(--color-fg)", outlineColor: "var(--app-focus-ring)" }}>Vorschau</button>
            <button type="button" onClick={onContinue} className="h-9 cursor-pointer rounded-lg px-3.5 text-[12.5px] font-semibold transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: "var(--app-brand)", color: "#fff", outlineColor: "var(--app-focus-ring)" }}>Weiter →</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** @param {{ startId: string, onClose: function, onSelect: function }} props */
function PreviewOverlay({ startId, onClose, onSelect }) {
  const [index, setIndex] = useState(Math.max(0, CV_TEMPLATES.findIndex((item) => item.id === startId)));
  const [zoom, setZoom] = useState(0.72);
  const [fit, setFit] = useState(true);
  const canvasRef = useRef(null);
  const active = CV_TEMPLATES[index];

  useEffect(() => {
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { document.documentElement.style.overflow = oldOverflow; focused?.focus(); };
  }, []);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1)); if (event.key === "ArrowRight") setIndex((value) => Math.min(CV_TEMPLATES.length - 1, value + 1)); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return undefined;
    const measure = () => { if (fit) setZoom(Math.min((node.clientWidth - 48) / A4.W, (node.clientHeight - 48) / A4.H)); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fit]);

  const scale = fit ? zoom : zoom;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label={`${active.name} — große Vorschau`} style={{ background: "rgba(10,10,12,0.95)" }}>
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}><button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="h-9 w-9 cursor-pointer rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30" aria-label="Vorherige Vorlage">←</button><button type="button" onClick={() => setIndex((value) => Math.min(CV_TEMPLATES.length - 1, value + 1))} disabled={index === CV_TEMPLATES.length - 1} className="h-9 w-9 cursor-pointer rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30" aria-label="Nächste Vorlage">→</button><h2 className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold text-white">{active.name}</h2><button type="button" onClick={() => { setFit(false); setZoom((value) => Math.min(1.35, value + 0.15)); }} className="h-9 w-9 cursor-pointer rounded-lg text-white/80 hover:bg-white/10" aria-label="Vergrößern">+</button><button type="button" onClick={() => { setFit(false); setZoom((value) => Math.max(0.4, value - 0.15)); }} className="h-9 w-9 cursor-pointer rounded-lg text-white/80 hover:bg-white/10" aria-label="Verkleinern">−</button><button type="button" onClick={onClose} className="h-9 w-9 cursor-pointer rounded-lg text-white/80 hover:bg-white/10" aria-label="Schließen">✕</button></header>
      <div ref={canvasRef} className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6" onClick={onClose}><div className="shrink-0 overflow-hidden rounded-sm" style={{ width: A4.W * scale, height: A4.H * scale, background: "#fff", boxShadow: "0 16px 70px rgba(0,0,0,0.55)" }} onClick={(event) => event.stopPropagation()}><div style={{ width: A4.W, height: A4.H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff" }}>{renderCVBody(active.id, DESIGN_MODEL)}</div></div></div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}><span className="text-[12px] text-white/60">{index + 1} / {CV_TEMPLATES.length}</span><button type="button" onClick={() => { onSelect(active.id); onClose(); }} className="h-10 cursor-pointer rounded-lg px-4 text-[13px] font-semibold" style={{ background: "var(--color-accent-500)", color: "#fff" }}>Diese Vorlage verwenden →</button></footer>
    </div>, document.body
  );
}

/** @param {{ profile: object, onChange: function, onContinue: function }} props */
export function CVTemplatePicker({ profile, onChange, onContinue }) {
  const selectedId = profile.templateId || "tabellarisch";
  const selectedTemplate = CV_TEMPLATES.find((item) => item.id === selectedId) || CV_TEMPLATES[0];
  const [filter, setFilter] = useState("all");
  const [previewId, setPreviewId] = useState(null);
  const [picked, setPicked] = useState(false);
  const [scale, setScale] = useState(0.5);
  const galleryRef = useCallback((node) => {
    if (!node) return undefined;
    const measure = () => { const frame = node.querySelector("[data-paper-frame]"); if (frame) setScale(frame.offsetWidth / THUMB.W); };
    requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const handleSelect = useCallback((id) => { setPicked(true); onChange({ templateId: id }); }, [onChange]);
  const visible = CV_TEMPLATES.filter((item) => templateMatchesFilter(item, filter));

  return <div className={`mx-auto max-w-[1120px] ${picked ? "pb-40 md:pb-32" : "pb-6"}`}>
    <div className="min-w-0">
      <header><h1 className="m-0 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]" style={{ color: "var(--color-fg)" }}>Wähle deinen Lebenslauf</h1><p className="m-0 mt-2 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>Wähle ein Design, das zu dir und deiner Bewerbung passt.</p></header>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Vorlagen filtern">{TEMPLATE_FILTERS.map((item) => { const active = filter === item.key; return <button key={item.key} type="button" aria-pressed={active} onClick={() => setFilter(item.key)} className="h-8 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[12px] font-medium transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ outlineColor: "var(--app-focus-ring)", borderColor: active ? "var(--color-border-strong)" : "var(--color-border)", background: active ? "var(--color-bg-elev-3)" : "transparent", color: active ? "var(--color-fg)" : "var(--color-fg-dim)" }}>{item.label}</button>; })}</div>
      <section ref={galleryRef} className="mt-6 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 sm:gap-7" aria-label="Vorlagen-Galerie">{visible.map((item) => <div key={item.id} className="min-w-0"><TemplateCard template={item} selected={selectedId === item.id} scale={scale} onSelect={handleSelect} onPreview={setPreviewId} /></div>)}{visible.length === 0 && <p className="col-span-2 py-12 text-center text-sm" style={{ color: "var(--color-fg-faint)" }}>Keine Vorlagen für diesen Filter.</p>}</section>
    </div>
    {picked && <SelectionDock template={selectedTemplate} onPreview={setPreviewId} onContinue={onContinue} />}
    {previewId && <PreviewOverlay startId={previewId} onClose={() => setPreviewId(null)} onSelect={handleSelect} />}
  </div>;
}

export function TemplateLightbox({ templateId, onClose, onSelect }) { return <PreviewOverlay startId={templateId} onClose={onClose} onSelect={onSelect} />; }

/** Live builder preview retaining the shared model and renderer. */
export function TemplatePreviewPanel({ profile, templateId }) {
  const id = templateId || profile?.templateId || "tabellarisch";
  const model = normalizeProfile(profile);
  const [scale, setScale] = useState(0.5);
  const [open, setOpen] = useState(false);
  const ref = useCallback((node) => { if (!node) return undefined; const measure = () => setScale(node.offsetWidth / A4.W); requestAnimationFrame(measure); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, []);
  return <div className="flex h-full flex-col gap-3" data-live-preview><div className="flex items-center justify-between"><p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-fg-faint)" }}>Vorlage — {CV_TEMPLATES.find((item) => item.id === id)?.name || id}</p><button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-[11px]" style={{ color: "var(--color-fg-dim)" }}>Vollbild</button></div><div ref={ref} className="relative overflow-hidden rounded-md" style={{ height: A4.H * scale, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}><div style={{ width: A4.W, height: A4.H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff" }}>{renderCVBody(id, model)}</div></div>{open && <TemplateLightbox templateId={id} onClose={() => setOpen(false)} onSelect={() => setOpen(false)} />}</div>;
}
