import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { initApi, profileApi } from "../services/api";
import {
  loadLibrary,
  getSyncedLibraryIds,
  computeLibraryReplay,
  pushCvLibrary,
} from "../cv/storage";
import { STORAGE_KEYS, writeJson } from "../storageKeys";

/**
 * Single source of truth for the `/init` bootstrap payload
 * (me, profile, resumes, job counts, usage, plan).
 *
 * The last successful payload is mirrored to sessionStorage, so a hard
 * reload renders the dashboard from known-good data instantly while a
 * fresh `/init` request runs in the background (stale-while-revalidate).
 * Cleared on logout via clearSwrCache's storage sweep.
 *
 * Also owns the saved-CV library (`cv_library_v1`): seeded from
 * localStorage, merged with the server mirror on boot so CVs saved on
 * another device show up everywhere. Mutations go through `setCvLibrary`,
 * which persists locally; the storage layer pushes to the backend.
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
  cvLibrary: [],
  setCvLibrary: () => {},
});

export function BootstrapProvider({ children }) {
  // Seed synchronously from the last session's payload when available.
  const [init, setInitState] = useState(readCachedInit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  // Saved-CV library, seeded from localStorage and merged with the server's
  // mirror once the GET resolves (so cross-device CVs appear everywhere).
  const [cvLibrary, setCvLibraryState] = useState(() => loadLibrary());

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

  // Pull the server-side CV library mirror and merge it with the local copy.
  // The merge is deletion-aware: entries the server has acknowledged but no
  // longer returns were deleted on another device and are dropped, while
  // never-synced local entries (offline-created) survive.
  //
  // Replay: after the merge, entries the server still doesn't have (created
  // offline, or a push that failed) are pushed so they reach the backend as
  // soon as a connection exists. This is also why the pull effect runs again
  // on the browser `online` event below — reconnect alone triggers the replay.
  useEffect(() => {
    let cancelled = false;
    profileApi
      .getCvLibrary()
      .then((res) => {
        if (cancelled) return;
        const remote = Array.isArray(res.data?.entries) ? res.data.entries : [];
        // Compute merge + replay decision outside the state updater so
        // localStorage and the push below see the merged result immediately.
        // `needsPush` is derived from `merged` — never from the pre-pull local
        // list, so a CV deleted on another device can't be resurrected.
        const { merged, needsPush } = computeLibraryReplay(
          loadLibrary(),
          remote,
          getSyncedLibraryIds()
        );
        writeJson(STORAGE_KEYS.CV_LIBRARY, merged);
        // The server is authoritative about what exists — record its ids so
        // the next pull can drop anything deleted on another device.
        const remoteIds = remote.map((e) => e.id).filter(Boolean);
        if (remoteIds.length) writeJson(STORAGE_KEYS.CV_LIBRARY_SYNCED, remoteIds);
        setCvLibraryState(merged);
        // Offline-created entries must reach the server once we're back online.
        if (needsPush) pushCvLibrary();
      })
      .catch(() => {
        /* offline/error — keep the local copy */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Reconnect: the pull effect above re-runs, which replays any CVs saved
  // while offline (the PUT that failed during the save is re-attempted here).
  //
  // Guarded: browsers occasionally re-emit `online` without a real offline→
  // online transition (e.g. on network changes). Refetching /init + the CV
  // library for those spurious events is what made widgets "reload for no
  // reason". We only refetch when an `offline` event (or a boot while the
  // browser reports offline) was seen first. The guard is event-driven, so
  // the offline-replay contract holds: an `offline` + `online` pair replays.
  const wasOfflineRef = useRef(navigator.onLine === false);
  useEffect(() => {
    const onOffline = () => { wasOfflineRef.current = true; };
    const onOnline = () => {
      if (!wasOfflineRef.current) return;
      wasOfflineRef.current = false;
      setTick((t) => t + 1);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  /** Update the library in state + localStorage (pushes happen in cv/storage). */
  const setCvLibrary = useCallback((updater) => {
    setCvLibraryState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== null && next !== undefined) {
        writeJson(STORAGE_KEYS.CV_LIBRARY, next);
      }
      return next;
    });
  }, []);

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
    () => ({ init, loading, error, reload, setInit, cvLibrary, setCvLibrary }),
    [init, loading, error, reload, setInit, cvLibrary, setCvLibrary]
  );

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  return useContext(BootstrapContext);
}
