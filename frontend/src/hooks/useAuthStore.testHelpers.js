/**
 * Test-only helpers for the auth store.
 *
 * This module exists so production code never exposes an unrestricted state
 * setter on the store API. Import it from `src/hooks/useAuthStore` for the
 * real store, and from here only inside tests (vitest picks it up via the
 * same module graph; production bundles never reference this file).
 *
 * Kept under src/ (not test/) so the import path stays stable if tests run
 * with different roots — the filename convention (`*.testHelpers.js`) marks
 * it as test infrastructure.
 */
import useAuthStore from "./useAuthStore";

/**
 * Force the store into a given state. Mirrors the zustand `setState` shape
 * but is only reachable from test code, since nothing in the app imports
 * this module.
 *
 * @param {Partial<object>} partial - state slice to merge.
 */
export function setAuthStateForTests(partial) {
  // The store module does not export its internal setState on purpose;
  // going through a real action (logout) first guarantees listeners fire
  // through the same code path production uses.
  const current = useAuthStore.getState();
  const merged = { ...current, ...partial };
  if (current.token !== merged.token) {
    if (merged.token === null) {
      current.logout();
    } else {
      current.login(merged.token);
    }
  }
  // Apply the remaining slices through the exported fine-grained actions.
  if ("user" in partial) current.setUser(partial.user);
  if ("isBooting" in partial) current.setBooting(partial.isBooting);
  if ("isHydrated" in partial) current.setHydrated(partial.isHydrated);
  return useAuthStore.getState();
}
