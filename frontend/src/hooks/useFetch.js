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
 * @param {number} [options.maxAge=0]       - ms; with a cacheKey, an initial mount
 *        skips the background refetch while the cache entry is younger than this
 *        (explicit `reload()` always refetches)
 */
export default function useFetch(fetcher, { enabled = true, deps = [], cacheKey, maxAge = 0 } = {}) {
  // Seed synchronously from the cache so a revisit renders instantly.
  const cachedEntry = cacheKey ? swrCache.get(cacheKey) : undefined;
  const cached = cachedEntry?.data;
  const fresh = Boolean(
    cachedEntry && maxAge > 0 && Date.now() - cachedEntry.ts < maxAge
  );
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
        persistSwrCache();
      }
      return next;
    });
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // A keyed resource may remain mounted in a master/detail layout while a
  // sibling route mutates it. Subscribe so invalidation refreshes both cache
  // and already-mounted consumers.
  useEffect(() => {
    if (!cacheKey) return undefined;
    const refresh = () => {
      setDataState(undefined);
      setTick((t) => t + 1);
    };
    let subscribers = swrSubscribers.get(cacheKey);
    if (!subscribers) {
      subscribers = new Set();
      swrSubscribers.set(cacheKey, subscribers);
    }
    subscribers.add(refresh);
    return () => {
      subscribers.delete(refresh);
      if (subscribers.size === 0) swrSubscribers.delete(cacheKey);
    };
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    // Fresh cache on an initial mount: render it as-is, no background refetch.
    // Explicit `reload()` (tick > 0) always refetches.
    if (fresh && tick === 0) return;
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

const CACHE_STORAGE_KEY = "ja:swr_cache";

/** @type {Map<string, { data: any, ts: number }>} */
const swrCache = (() => {
  // Seed from sessionStorage so hard reloads render last-known data instantly.
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) return new Map(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Map();
})();

let persistTimer = null;
function persistSwrCache() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([...swrCache]));
    } catch { /* quota/private mode — ignore */ }
  }, 300);
}

/**
 * Drop every cached resource. Called on login/logout so user data is never
 * shared across sessions or accounts.
 */
export function clearSwrCache() {
  swrCache.clear();
  swrInflight.clear();
  try { sessionStorage.removeItem(CACHE_STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Drop one cached resource after a mutation changes or removes it. This keeps
 * a quick return to a list page from rendering data that no longer exists.
 */
export function invalidateSwrCache(cacheKey) {
  if (!cacheKey) return;
  swrCache.delete(cacheKey);
  swrInflight.delete(cacheKey);
  persistSwrCache();
  swrSubscribers.get(cacheKey)?.forEach((refresh) => refresh());
}

/** @type {Map<string, Promise<any>>} */
const swrInflight = new Map();

/** @type {Map<string, Set<() => void>>} */
const swrSubscribers = new Map();
