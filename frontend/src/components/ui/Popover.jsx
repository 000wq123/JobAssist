import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Popover — portal-rendered dropdown anchored to a trigger element.
 *
 * Features:
 * - Viewport collision detection (flip from bottom→top, clamp left/right)
 * - Opaque surface with border+shadow (never transparent over content)
 * - Keyboard dismiss (Escape)
 * - Scroll/resize repositioning
 * - Dark+light theme aware via `style` passthrough
 * - Click-outside dismissal
 */
export default function Popover({ open, onClose, anchorRef, align = "right", offset = 6, children, className = "", style = {} }) {
  const [pos, setPos] = useState({ top: 0, left: undefined, right: undefined });
  const popoverRef = useRef(null);

  const computePosition = () => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popH = popoverRef.current?.offsetHeight || 200;
    const popW = popoverRef.current?.offsetWidth || 200;

    // Default: below the trigger
    let top = Math.round(rect.bottom + offset);
    let left = align === "left" ? Math.round(rect.left) : undefined;
    let right = align === "right" ? Math.round(window.innerWidth - rect.right) : undefined;

    // If would overflow bottom viewport, flip above the trigger
    if (top + popH > window.innerHeight - 8) {
      top = Math.round(rect.top - popH - offset);
      if (top < 8) top = 8; // clamp to viewport top
    }

    // Clamp horizontal position inside viewport
    if (align === "left") {
      left = Math.max(4, Math.min(left, window.innerWidth - popW - 4));
    } else {
      const computedLeft = window.innerWidth - (right || 0) - popW;
      if (computedLeft < 4) {
        left = 4;
        right = undefined;
      } else if (computedLeft + popW > window.innerWidth - 4) {
        left = window.innerWidth - popW - 4;
        right = undefined;
      }
    }

    setPos({ top, left, right });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open, anchorRef, align, offset]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const onResize = () => computePosition();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, onClose, anchorRef, align, offset]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        ref={popoverRef}
        className={`fixed ${className}`}
        style={{
          top: pos.top,
          left: pos.left ?? undefined,
          right: pos.right ?? undefined,
          background: "var(--app-surface, #FFFFFF)",
          borderColor: "var(--app-border, #E7E7E4)",
          boxShadow: "var(--app-shadow-modal, 0 8px 32px rgba(0,0,0,0.08))",
          border: "1px solid var(--app-border, #E7E7E4)",
          borderRadius: "8px",
          zIndex: 10000,
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}