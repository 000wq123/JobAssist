import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { initApi } from "../services/api";

/**
 * Single source of truth for the `/init` bootstrap payload
 * (me, profile, resumes, job counts, usage, plan).
 *
 * The last successful payload is mirrored to sessionStorage, so a hard
 * reload renders the dashboard from known-good data instantly while a
 * fresh `/init` request runs in the background (stale-while-revalidate).
 * Cleared on logout via clearSwrCache's storage sweep.
 */
const INIT_STORAGE_KEY = "ja:init_cache";

function readCachedInit() {
  try {
    const raw = sessionStorage.getItem(INIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

const BootstrapContext = createContext({
  init: null,
  loading: true,
  error: null,
  reload: () => {},
  setInit: () => {},
});

export function BootstrapProvider({ children }) {
  // Seed synchronously from the last session's payload when available.
  const [init, setInitState] = useState(readCachedInit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    initApi
      .fetch()
      .then((res) => {
        if (cancelled) return;
        setInitState(res.data);
        try {
          sessionStorage.setItem(INIT_STORAGE_KEY, JSON.stringify(res.data));
        } catch { /* quota/private mode — ignore */ }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        // Keep showing cached init data on refresh failure.
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const setInit = useCallback((updater) => {
    setInitState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== null && next !== undefined) {
        try { sessionStorage.setItem(INIT_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ init, loading, error, reload, setInit }),
    [init, loading, error, reload, setInit]
  );

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  return useContext(BootstrapContext);
}
