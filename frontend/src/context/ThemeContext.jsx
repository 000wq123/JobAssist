import { createContext, useContext, useState, useEffect, useCallback } from "react";

const THEME_KEY = "jobassist_theme_v1";
const THEMES = ["system", "light", "dark"];

/** Resolve the actual theme string ("light" | "dark") from a preference value. */
function resolveTheme(pref) {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw && THEMES.includes(raw)) return raw;
  } catch { /* ignore */ }
  return "system";
}

let themeAnimTimer = null;

function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  // Briefly enable the theme cross-fade so every widget re-colors in sync
  // (otherwise some surfaces snap while others lag behind the switch).
  root.classList.add("theme-anim");
  if (themeAnimTimer) clearTimeout(themeAnimTimer);
  themeAnimTimer = setTimeout(() => root.classList.remove("theme-anim"), 240);
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0C0C10" : "#FAFAF8");
  }
}

const ThemeContext = createContext({
  preference: "system",
  resolved: "light",
  setTheme: () => {},
});

/**
 * ThemeProvider — manages System/Light/Dark preferences.
 *
 * Reads from localStorage, falls back to prefers-color-scheme.
 * Applies `data-theme` on <html> and updates <meta name="theme-color">.
 * Listens for OS theme changes when in System mode.
 *
 * Wrap the entire app with this provider.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredTheme);

  // Apply on mount + whenever preference changes
  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  // Listen for OS theme changes
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((newPref) => {
    if (!THEMES.includes(newPref)) return;
    setPreference(newPref);
    try {
      localStorage.setItem(THEME_KEY, newPref);
    } catch { /* ignore */ }
  }, []);

  const resolved = resolveTheme(preference);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme — access the current theme state.
 * @returns {{ preference: string, resolved: "light" | "dark", setTheme: (p: "system" | "light" | "dark") => void }}
 */
export function useTheme() {
  return useContext(ThemeContext);
}