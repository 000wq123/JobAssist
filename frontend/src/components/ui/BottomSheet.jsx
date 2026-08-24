import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useFocusTrap from "../../hooks/useFocusTrap";

/**
 * BottomSheet — modal sheet that slides up from the bottom on mobile and
 * appears centered-ish on larger screens. Calm aesthetic: no rounded corners
 * on top (small radius), one small grabber, hairline divider, no shadow theatre.
 *
 * Renders into a portal so it escapes any clipping container.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export default function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  useFocusTrap(open, sheetRef);

  // Close on Escape; lock body scroll when open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        /* overlay, not layout */
        // eslint-disable-next-line no-restricted-syntax
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="
          relative w-full sm:w-[420px] sm:max-w-[92vw]
          bg-[var(--color-bg-elev-2)] border-t sm:border border-[var(--color-border)]
          rounded-t-2xl sm:rounded-2xl
          shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)]
          animate-slide-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="block w-9 h-1 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        {title && (
          <div className="px-5 pt-4 sm:pt-5 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
              {title}
            </p>
          </div>
        )}

        <div className="px-5 pb-6 sm:pb-5 pt-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
