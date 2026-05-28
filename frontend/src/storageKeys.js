/**
 * Single source of truth for every localStorage key the app reads or writes.
 *
 * Centralising the list avoids the "I added a new cache key but forgot to
 * clear it on logout" bug that the previous hard-coded list in
 * `useAuthStore.clearUserCache` had been silently developing.
 *
 * Convention: every key here is prefixed `ja:` so localStorage inspection
 * makes it obvious which entries belong to JobAssist.
 *
 * @typedef {keyof typeof STORAGE_KEYS} StorageKey
 */
export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: "access_token",            // legacy; kept until cookie-only rollout
  REFRESH_TOKEN: "refresh_token",          // legacy; kept until cookie-only rollout
  AUTH_USER: "auth_user",
  INIT: "init",
  SETTINGS_PROFILE: "settings_profile",
  BILLING: "billing",
  DASHBOARD_JOBS: "dashboard_jobs",
  JOBS: "jobs",
  RESUMES: "resumes",
  JOB_ALERTS: "job_alerts",
  DASHBOARD_RESUMES: "dashboard_resumes",
  DASHBOARD_JOB_ALERTS: "dashboard_job_alerts",
  AI_CHAT_HISTORY: "ai_chat_history",
  PROFILE: "profile",
  PREFERENCES: "preferences",
  JOB_SEARCH_RESEARCH: "job-search-research",
  RESUME_OPTIMIZATION_TASKS: "resume_optimization_tasks",
  APP_LOADED: "app-loaded",                // sessionStorage, but tracked here too
  COOKIE_CONSENT: "cookie_consent_v1",     // {essential:true, analytics:bool, ts:number}
  CV_PROFILE: "cv_profile_v1",             // Lebenslauf builder draft (autosaved)
  CV_LIBRARY: "cv_library_v1",             // Saved generated CVs (max 10)
  CV_GEN_COUNT: "ja:cv_gen",               // Daily PDF generation counter { count, date }
});

/** Key prefixes whose dynamic suffixes should also be cleared on logout. */
const DYNAMIC_PREFIXES = Object.freeze([
  "resume_analysis_",
]);

/**
 * Keys that represent durable, cross-session user preferences and must
 * survive login/logout cycles. Wiping these would re-trigger consent
 * banners or onboarding for returning users, which is a UX bug.
 */
const DURABLE_KEYS = Object.freeze(new Set([
  STORAGE_KEYS.COOKIE_CONSENT,
]));

/** Returns every static key in `STORAGE_KEYS` plus any dynamic-prefix matches. */
export function listAllAppKeys() {
  const staticKeys = Object.values(STORAGE_KEYS);
  const dynamic = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && DYNAMIC_PREFIXES.some((p) => k.startsWith(p))) dynamic.push(k);
    }
  } catch {}
  return [...staticKeys, ...dynamic];
}

/**
 * Removes every JobAssist localStorage entry except durable user-preference
 * keys (see `DURABLE_KEYS`). Used on login + logout to scrub the previous
 * session's cached data.
 */
export function clearAllAppStorage() {
  for (const k of listAllAppKeys()) {
    if (DURABLE_KEYS.has(k)) continue;
    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

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
  } catch {}
}

/** Safely remove a key. */
export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
