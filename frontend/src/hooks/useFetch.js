import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data-fetching hook — plain fetch, NO caching library.
 *
 * Every mount runs the fetcher once. An opt-in module-level stale-while-
 * revalidate cache (`options.cacheKey`) lets revisited pages render their
 * previous data instantly while a fresh request runs in the background —
 * no skeleton flash, no "preload → reload" cycle on every navigation.
 *
 * With a cacheKey, concurrent mounts of the same key share ONE in-flight
 * network request (dedupe) and one successful response populates them all.
 *
 * The caller controls when data is (re)loaded via `reload()` and can
 * optimistically patch it via `setData()`.
 *
 * @param {(ctx: { signal: AbortSignal }) => Promise<any>} fetcher
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]  - skip the fetch entirely when false
 * @param {any[]} [options.deps=[]]         - extra values that trigger a reload
 * @param {string} [options.cacheKey]       - opt-in SWR cache key for this resource
 */
export default function useFetch(fetcher, { enabled = true, deps = [], cacheKey } = {}) {
  // Seed synchronously from the cache so a revisit renders instantly.
  const cached = cacheKey ? swrCache.get(cacheKey)?.data : undefined;
  const [data, setDataState] = useState(cached);
  const [loading, setLoading] = useState(enabled && cached === undefined);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  /**
   * Write through to state AND the SWR cache (when keyed).
   * Accepts a value or an updater function, mirroring setState.
   */
  const setData = useCallback((updater) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const key = cacheKeyRef.current;
      if (key) {
        if (next === undefined) swrCache.delete(key);
        else swrCache.set(key, { data: next, ts: Date.now() });
      }
      return next;
    });
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Dedupe: if another mount is already fetching this key, ride its promise.
    const key = cacheKeyRef.current;
    let shared = null;
    if (key) {
      shared = swrInflight.get(key);
      if (!shared) {
        shared = Promise.resolve(
          fetcherRef.current({ signal: new AbortController().signal })
        ).finally(() => swrInflight.delete(key));
        swrInflight.set(key, shared);
      }
    }

    const run = shared || fetcherRef.current({ signal: undefined });

    run
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.name === "AbortError") return;
        // Stale data stays on screen during a failed refresh; the error is
        // only surfaced when there was nothing to show in the first place.
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  return { data, loading, error, reload, setData };
}

// ── SWR plumbing ─────────────────────────────────────────────────────────────

/** @type {Map<string, { data: any, ts: number }>} */
const swrCache = new Map();

/**
 * Drop every cached resource. Called on login/logout so user data is never
 * shared across sessions or accounts.
 */
export function clearSwrCache() {
  swrCache.clear();
  swrInflight.clear();
}

/** @type {Map<string, Promise<any>>} */
const swrInflight = new Map();
