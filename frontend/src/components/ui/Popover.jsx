import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function Popover({ open, onClose, anchorRef, align = "right", offset = 6, children, className = "" }) {
  const [pos, setPos] = useState({ top: 0, left: null, right: null });
  const mounted = useRef(false);

  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.bottom + offset);
    const right = Math.round(window.innerWidth - rect.right);
    const left = Math.round(rect.left);
    setPos({ top, left: align === "left" ? left : null, right: align === "right" ? right : null });
    mounted.current = true;
  }, [open, anchorRef, align, offset]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const onResize = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = Math.round(rect.bottom + offset);
      const right = Math.round(window.innerWidth - rect.right);
      const left = Math.round(rect.left);
      setPos({ top, left: align === "left" ? left : null, right: align === "right" ? right : null });
    };
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
    <div className="fixed inset-0 z-50" onClick={onClose} aria-hidden={!open}>
      <div
        className={"fixed " + className}
        style={{ top: pos.top, left: pos.left ?? undefined, right: pos.right ?? undefined }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
