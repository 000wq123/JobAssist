import { useEffect, useRef, useState } from "react";

/**
 * Skel — inline skeleton block used by page-local loading layouts.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export function Skel({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: "var(--app-border, #E7E7E4)" }}
    />
  );
}

/**
 * Only show a skeleton after `loading` has been true for ~140ms.
 * Fast responses render their real content directly with no skeleton flash;
 * slow responses fall back to a structurally-correct skeleton.
 * @param {boolean} loading
 */
export function useDelayedSkeleton(loading) {
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      return;
    }
    timer.current = setTimeout(() => setShow(true), 140);
    return () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    };
  }, [loading]);

  return show;
}

/**
 * Sets `document.title` while the component is mounted and restores the
 * previous title on unmount. Keeps browser-tab history readable per route.
 *
 * @param {string} title - Page-specific title suffix (appended to " · JobAssist").
 */
export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · JobAssist` : "JobAssist – Bewerben. Klar. Schnell. Mit KI.";
    return () => { document.title = prev; };
  }, [title]);
}
