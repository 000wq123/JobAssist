import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useFocusTrap from "../../hooks/useFocusTrap";

/**
 * ConfirmDialog — in-app replacement for `window.confirm`.
 *
 * Renders a small centered modal (portal) with a title, description, and
 * confirm/cancel buttons. Escape, backdrop click, and the cancel button all
 * resolve as "cancelled". Focus is trapped while open; the previously
 * focused element regains focus on close.
 *
 * Usage (hook + render pair):
 *
 *   const { confirm, element } = useConfirmDialog();
 *   ...
 *   const ok = await confirm({ title: "Löschen?", body: "...", confirmLabel: "Löschen" });
 *   if (!ok) return;
 *   ...
 *   return (<>{element} ...</>);
 *
 * @returns {{ confirm: (opts: ConfirmOptions) => Promise<boolean>, element: React.ReactNode }}
 */

/**
 * @typedef {Object} ConfirmOptions
 * @param {string} [title]          - Heading text.
 * @param {string} [body]           - Supporting sentence.
 * @param {string} [confirmLabel]   - Confirm button label (default "Bestätigen").
 * @param {string} [cancelLabel]    - Cancel button label (default "Abbrechen").
 * @param {boolean} [danger]        - Red confirm styling for destructive actions.
 */

export function useConfirmDialog() {
  const [state, setState] = useState(null); // { opts, resolve }
  const restoreFocusRef = useRef(null);

  const confirm = (opts = {}) =>
    new Promise((resolve) => {
      // Remember the trigger so focus returns there after close.
      restoreFocusRef.current = document.activeElement;
      setState({ opts, resolve });
    });

  const settle = (result) => {
    if (!state) return;
    state.resolve(result);
    setState(null);
    // Return focus to whatever opened the dialog.
    const el = restoreFocusRef.current;
    if (el && typeof el.focus === "function") requestAnimationFrame(() => el.focus());
    restoreFocusRef.current = null;
  };

  const open = !!state;
  const element = (
    <ConfirmDialogSurface
      open={open}
      opts={state?.opts || {}}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, element };
}

function ConfirmDialogSurface({ open, opts, onCancel, onConfirm }) {
  const boxRef = useRef(null);
  useFocusTrap(open, boxRef);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const {
    title = "Bist du sicher?",
    body,
    confirmLabel = "Bestätigen",
    cancelLabel = "Abbrechen",
    danger = false,
  } = opts;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — overlay, not layout */}
      <div
        /* eslint-disable-next-line no-restricted-syntax -- overlay, not layout */
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={boxRef}
        tabIndex={-1}
        className="
          relative w-full max-w-[380px]
          bg-[var(--color-bg-elev-2)] border border-[var(--color-border)]
          rounded-2xl p-6 outline-none
          shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]
          animate-slide-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-[var(--color-fg)]">
          {title}
        </h2>
        {body && (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
            {body}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary h-9 px-4 rounded-lg text-[13px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn h-9 px-4 rounded-lg text-[13px] font-semibold ${
              danger ? "btn-danger" : "btn-primary"
            }`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default useConfirmDialog;
