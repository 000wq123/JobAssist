import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";

/**
 * @typedef {Object} SceneCtx
 * @property {() => void} next
 * @property {() => void} back
 * @property {(id: string) => void} jumpTo
 * @property {boolean} isFirst
 * @property {boolean} isLast
 *
 * @typedef {Object} SceneDef
 * @property {string} id
 * @property {string} title
 * @property {(profile: any) => boolean} [condition]   - if false, scene is skipped
 * @property {(profile: any) => Record<string,string>} [validate]
 * @property {(profile: any) => boolean} [showSkip]    - if true, footer shows "überspringen"
 * @property {string} [skipLabel]                       - copy for the skip link
 * @property {string} [primaryLabel]                    - override "Weiter"
 * @property {boolean} [primaryAccent]                  - accent-color CTA (intro / final)
 * @property {boolean} [hidePrimary]                    - hide CTA entirely (terminal scene)
 * @property {React.ComponentType<{profile:any, onChange:(d:any)=>void, errors:any, ctx: SceneCtx}>} render
 */

/**
 * FocusModeWizard — the conversational onboarding shell.
 *
 * One scene fills the screen. Slide L↔R between scenes.
 * Dot progress at top, big primary CTA at bottom.
 *
 * Mobile-first 390-ish; centered max-width 480 on desktop.
 *
 * @param {object} props
 * @param {SceneDef[]} props.scenes
 * @param {any} props.profile
 * @param {(delta:any) => void} props.onChange
 * @param {() => void} [props.onComplete]    - fired when primary CTA is tapped on the last scene
 * @param {boolean} [props.completeBusy]
 * @param {string} [props.completeError]
 */
export default function FocusModeWizard({ scenes, profile, onChange, onComplete, completeBusy, completeError }) {
  const activeScenes = useMemo(
    () => scenes.filter((s) => !s.condition || s.condition(profile)),
    [scenes, profile],
  );

  // Index is into `activeScenes`. We resolve by id when scenes change.
  const [activeId, setActiveId] = useState(activeScenes[0]?.id ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const sceneRef = useRef(null);

  // If the active scene was removed by a condition flip, fall back to first.
  useEffect(() => {
    if (!activeScenes.some((s) => s.id === activeId)) {
      setActiveId(activeScenes[0]?.id ?? "");
    }
  }, [activeScenes, activeId]);

  const idx = Math.max(0, activeScenes.findIndex((s) => s.id === activeId));
  const total = activeScenes.length;
  const scene = activeScenes[idx];
  const isFirst = idx === 0;
  const isLast = idx === total - 1;

  const errors = useMemo(() => {
    if (!showErrors || !scene?.validate) return {};
    return scene.validate(profile) || {};
  }, [showErrors, scene, profile]);

  const goTo = useCallback((nextIdx) => {
    if (nextIdx < 0 || nextIdx >= activeScenes.length) return;
    setShowErrors(false);
    setActiveId(activeScenes[nextIdx].id);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeScenes]);

  const next = useCallback(() => {
    if (scene?.validate) {
      const errs = scene.validate(profile) || {};
      if (Object.keys(errs).length > 0) {
        setShowErrors(true);
        return;
      }
    }
    goTo(idx + 1);
  }, [idx, scene, profile, goTo]);

  const back = useCallback(() => goTo(idx - 1), [idx, goTo]);

  const jumpTo = useCallback((id) => {
    const target = activeScenes.findIndex((s) => s.id === id);
    if (target >= 0) goTo(target);
  }, [activeScenes, goTo]);

  // Keyboard nav: Enter → next (from input), ← → back, → next.
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      const isInput = tag === "INPUT";
      const isTextarea = tag === "TEXTAREA";
      if (isTextarea) return;
      if (e.key === "Enter" && isInput && !isLast) {
        e.preventDefault();
        next();
        return;
      }
      if (isInput) return;
      if (e.key === "ArrowRight" && !isLast) next();
      if (e.key === "ArrowLeft" && !isFirst) back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, back, isFirst, isLast]);

  // Focus the scene container on change for screen readers.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.focus();
  }, [activeId]);

  if (!scene) return null;

  const ctx = { next, back, jumpTo, isFirst, isLast };
  const showSkip = scene.showSkip ? scene.showSkip(profile) : false;
  const primaryLabel = scene.primaryLabel || "Weiter";

  const progressPct = total > 1 ? Math.round((idx / (total - 1)) * 100) : 100;

  /** Shared CTA button markup */
  const ctaButton = (
    <>
      {Object.keys(errors).length > 0 && (
        <p className="text-[12px] text-[var(--color-error)] mb-2">{Object.values(errors)[0]}</p>
      )}
      {completeError && (
        <p className="text-[12px] text-[var(--color-error)] mb-2">{completeError}</p>
      )}
      <button
        type="button"
        onClick={isLast && onComplete ? onComplete : next}
        disabled={isLast && completeBusy}
        className={
          "w-full h-[52px] rounded-[14px] inline-flex items-center justify-center gap-2 " +
          "font-semibold text-[15px] tracking-[0.01em] transition-all active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed " +
          (scene.primaryAccent
            ? "bg-[var(--color-accent-500)] text-[#0b0b14]"
            : "bg-white/90 hover:bg-white text-[#0b0b10]")
        }
      >
        {isLast && completeBusy ? "Wird erstellt…" : primaryLabel}
        {!completeBusy && (primaryLabel === "PDF herunterladen"
          ? <Download className="h-4 w-4" />
          : <ArrowRight className="h-4 w-4" />
        )}
      </button>
      {showSkip && (
        <button
          type="button"
          onClick={() => goTo(idx + 1)}
          className="block mx-auto mt-3 text-[12.5px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] py-1.5 px-2.5 w-full text-center"
        >
          {scene.skipLabel || "überspringen"}
        </button>
      )}
    </>
  );

  return (
    <div className="w-full flex flex-col min-h-[100dvh]">

      {/* ── Progress header — full width, same on all breakpoints ───── */}
      <header className="w-full px-5 lg:px-8 xl:px-14 pt-6 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={isFirst}
          aria-label="Zurück"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent-500)] transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[11px] text-[var(--color-fg-faint)] tabular-nums min-w-[36px] text-right flex-shrink-0">
          {isLast && scene.id === "fertig" ? "Fertig" : `${idx + 1} / ${total}`}
        </span>
      </header>

      {/* ── MOBILE layout (< lg) — single column, content + sticky CTA ─ */}
      <div className="lg:hidden flex-1 flex flex-col">
        <main
          key={activeId}
          ref={sceneRef}
          tabIndex={-1}
          className="px-5 sm:px-6 pt-8 pb-4 outline-none scene-enter"
          aria-live="polite"
        >
          <scene.render profile={profile} onChange={onChange} errors={errors} ctx={ctx} />
        </main>
        {!scene.hidePrimary && (
          <div className="sticky bottom-0 px-5 sm:px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] bg-gradient-to-t from-[var(--color-bg)] from-60% to-transparent">
            {ctaButton}
          </div>
        )}
      </div>

      {/* ── DESKTOP layout (lg+) — centered form only, no preview ── */}
      <div className="hidden lg:flex flex-1 justify-center px-8 xl:px-14 pb-12">
        <div className="w-full max-w-[520px] flex flex-col pt-8">
          <main
            key={activeId}
            ref={sceneRef}
            tabIndex={-1}
            className="flex flex-col outline-none scene-enter"
            aria-live="polite"
          >
            <scene.render profile={profile} onChange={onChange} errors={errors} ctx={ctx} />
          </main>
          {!scene.hidePrimary && (
            <div className="mt-8">
              {ctaButton}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
