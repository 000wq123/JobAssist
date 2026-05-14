import { create } from "zustand";
import {
  STORAGE_KEYS,
  clearAllAppStorage,
  readJson,
  removeKey,
  writeJson,
} from "../storageKeys";

/**
 * Auth store.
 *
 * Refresh tokens live in an httpOnly cookie set by the backend (XSS-proof) —
 * the SPA never touches them. The access token lives in this Zustand store
 * (memory only) and is mirrored to localStorage *only* until the cookie-only
 * rollout completes; it is short-lived (≤ 30 min) so the blast radius of any
 * future XSS is limited to the current tab session.
 *
 * On full app load with no in-memory token, `api.js` will silently call
 * `/api/auth/refresh`, which uses the cookie to mint a fresh access token.
 */
const useAuthStore = create((set) => ({
  // Initial value comes from localStorage so a hard reload doesn't kick the
  // user back to /login before the silent-refresh round-trip lands.
  token: readJson(STORAGE_KEYS.ACCESS_TOKEN, null) || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
  user: readJson(STORAGE_KEYS.AUTH_USER),
  isHydrated: false,

  /**
   * Persist a fresh login. The legacy `refreshToken` argument is accepted
   * for backwards compat but is no longer stored — the cookie is set by
   * the server and can never be read by JavaScript.
   * @param {string} accessToken
   * @param {string} [_refreshToken] - ignored; kept for call-site compat.
   */
  login: (accessToken, _refreshToken) => {
    if (!accessToken) return;
    clearAllAppStorage();
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    } catch {}
    set({ token: accessToken, user: null, isHydrated: true });
  },

  /**
   * Update only the access token (used after a silent refresh).
   * @param {string} accessToken
   */
  setAccessToken: (accessToken) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    } catch {}
    set({ token: accessToken });
  },

  /** Clear in-memory + on-disk client state. The httpOnly cookie is cleared by the server's `/auth/logout`. */
  logout: () => {
    clearAllAppStorage();
    removeKey(STORAGE_KEYS.ACCESS_TOKEN);
    removeKey(STORAGE_KEYS.REFRESH_TOKEN);
    set({ token: null, user: null, isHydrated: true });
  },

  /** @param {object} user */
  setUser: (user) => {
    writeJson(STORAGE_KEYS.AUTH_USER, user);
    set({ user });
  },

  /** Re-read persisted auth state from localStorage. Called on app boot. */
  hydrate: () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
    const user = readJson(STORAGE_KEYS.AUTH_USER);
    set({ token, user, isHydrated: true });
  },
}));

export default useAuthStore;
