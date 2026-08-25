import { useSyncExternalStore } from "react";
import { clearSwrCache } from "./useFetch";

/**
 * Minimal auth store built on React's `useSyncExternalStore` — no zustand.
 *
 * The access token lives in `sessionStorage` (so a hard reload keeps you
 * logged in) and the user identity is mirrored to `localStorage` so the
 * sidebar/name render immediately on boot. Everything else (jobs, resumes,
 * alerts, init payloads) is fetched fresh — there is NO data caching layer.
 *
 * The refresh token is an httpOnly cookie set by the backend and is never
 * readable from JavaScript.
 */

const TOKEN_KEY = "ja:access_token";
const USER_KEY = "auth_user";

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * API *data* caches written by the old react-query/localStorage architecture.
 * Removed on login/logout so a stale build can never resurrect old rows.
 * Durable user content (CV drafts, theme, consent) is intentionally kept.
 */
function clearLegacyDataCaches() {
  try { sessionStorage.removeItem("ja:init_cache"); } catch { /* ignore */ }
  const legacyKeys = [
    "jobs",
    "resumes",
    "init",
    "billing",
    "profile",
    "preferences",
    "dashboard_jobs",
    "dashboard_resumes",
    "dashboard_job_alerts",
    "job_alerts",
    "settings_profile",
    "ai_chat_history",
    "job-search-research",
    "resume_optimization_tasks",
    "app-loaded",
    "access_token",
    "refresh_token",
  ];
  try {
    legacyKeys.forEach((k) => localStorage.removeItem(k));
    const dynamic = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("resume_analysis_")) dynamic.push(key);
    }
    dynamic.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable — ignore */
  }
}

function login(accessToken) {
  if (!accessToken) return;
  clearLegacyDataCaches();
  clearSwrCache();
  try {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
  } catch {
    /* ignore */
  }
  setState({ token: accessToken, user: null, isHydrated: true, isBooting: false });
}

function setAccessToken(accessToken) {
  try {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
  } catch {
    /* ignore */
  }
  setState({ token: accessToken });
}

function logout() {
  clearLegacyDataCaches();
  clearSwrCache();
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  setState({ token: null, user: null, isHydrated: true, isBooting: false });
}

function setUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
  setState({ user });
}

function setBooting(v) {
  setState({ isBooting: !!v });
}

function setHydrated(v) {
  setState({ isHydrated: !!v });
}

/** Current state, including actions — mirrors the zustand `getState()` shape. */
let state = {
  token: readToken(),
  user: readJson(USER_KEY),
  isHydrated: true,
  isBooting: true,
  login,
  setAccessToken,
  logout,
  setUser,
  setBooting,
  setHydrated,
};

const listeners = new Set();

function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/**
 * Auth store hook.
 * @param {(s: object) => any} [selector] - slice selector, defaults to whole state.
 */
function useAuthStore(selector = (s) => s) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(snapshot);
}

useAuthStore.getState = () => state;

export default useAuthStore;
