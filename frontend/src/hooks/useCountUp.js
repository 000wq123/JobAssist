import { useEffect, useRef, useState } from "react";

/**
 * useCountUp — animates a number from its previous value to `target`
 * (transitions.dev "number pop-in" pattern, JS side). Respects
 * prefers-reduced-motion by snapping instantly.
 */
export default function useCountUp(target, { duration = 600 } = {}) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;

    if (from === target) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo for a springy finish without a physics lib
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
