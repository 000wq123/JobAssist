import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus inside a container while it is open and returns focus to the
 * previously focused element when closed.
 *
 * @param {boolean} active
 * @param {React.RefObject<HTMLElement|null>} containerRef
 */
export default function useFocusTrap(active, containerRef) {
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    // Remember the element that had focus before the trap opened.
    lastFocusedRef.current = document.activeElement;

    // Move focus to the first focusable element inside the container.
    const container = containerRef?.current;
    if (container) {
      const focusable = container.querySelectorAll(FOCUSABLE);
      const first = focusable[0];
      if (first) first.focus();
    }
  }, [active, containerRef]);

  useEffect(() => {
    if (!active) {
      // On close, return focus to the previously focused element.
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === "function") {
        lastFocusedRef.current.focus();
      }
      return;
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const container = containerRef?.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}
