import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { initApi } from "../services/api";

/**
 * Single source of truth for the `/init` bootstrap payload
 * (me, profile, resumes, job counts, usage, plan).
 *
 * Fetched exactly once per authenticated session. Pages read from here
 * instead of re-requesting the same facts themselves.
 */
const BootstrapContext = createContext({
  init: null,
  loading: true,
  error: null,
  reload: () => {},
  setInit: () => {},
});

export function BootstrapProvider({ children }) {
  const [init, setInitState] = useState(null);
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
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const setInit = useCallback((updater) => {
    setInitState((prev) => (typeof updater === "function" ? updater(prev) : updater));
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
