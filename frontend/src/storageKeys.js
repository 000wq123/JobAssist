/**
 * Client-side storage keys for durable user content and preferences.
 *
 * These are the ONLY things persisted on the client:
 *   - cookie consent (a legal preference)
 *   - CV builder draft, saved CV library, and the daily PDF counter (user content)
 *
 * API data (jobs, resumes, alerts, profile, init, usage) is NEVER cached —
 * every page fetches its rows fresh on mount. There is no data-caching layer.
 */
export const STORAGE_KEYS = Object.freeze({
  COOKIE_CONSENT: "cookie_consent_v1",
  CV_PROFILE: "cv_profile_v1",
  CV_LIBRARY: "cv_library_v1",
  CV_GEN_COUNT: "ja:cv_gen",
});

/** Safely read JSON. Returns `fallback` on missing/invalid data. */
export function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Safely write JSON. Silently swallows quota errors. */
export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Safely remove a key. */
export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
