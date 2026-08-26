import { STORAGE_KEYS, readJson, writeJson } from "../storageKeys";
import { CV_PROFILE_VERSION, emptyProfile } from "./profileSchema";
import { profileApi } from "../services/api";

const DEBOUNCE_MS = 800;

/**
 * Load draft profile from localStorage. Merges with empty profile so newly
 * added fields default correctly when the schema evolves.
 * @returns {import("./profileSchema").CVProfile}
 */
export function loadDraft() {
  const raw = readJson(STORAGE_KEYS.CV_PROFILE, null);
  if (!raw || typeof raw !== "object") return emptyProfile();
  // Discard incompatible major versions (none yet — keeps door open).
  if (raw._version && raw._version > CV_PROFILE_VERSION) return emptyProfile();
  return { ...emptyProfile(), ...raw, _version: CV_PROFILE_VERSION };
}

/** Synchronously persist a profile draft. */
export function saveDraftNow(profile) {
  writeJson(STORAGE_KEYS.CV_PROFILE, profile);
}

/** Wipe the draft (used after successful server-side save or on logout). */
export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CV_PROFILE);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

/**
 * True when the builder draft holds real CV content.
 *
 * Deliberately excludes auto-prefilled fields (email from the account) and
 * always-present defaults (`sprachkenntnisse`, `fuehrerschein`, template,
 * etc.) so a draft that only got the email prefill never counts as a CV.
 * @returns {boolean}
 */
export function hasDraftContent() {
  const d = loadDraft();
  if (!d) return false;
  return Boolean(
    d.vorname?.trim()
    || d.nachname?.trim()
    || d.geburtsdatum
    || d.schulname?.trim()
    || d.schultyp
    || d.telefon?.trim()
    || d.profil?.trim()
    || d.hobbies?.trim()
    || (Array.isArray(d.erfahrungen) && d.erfahrungen.length > 0)
    || (Array.isArray(d.faehigkeiten) && d.faehigkeiten.length > 0)
    || (Array.isArray(d.weiterbildungen) && d.weiterbildungen.length > 0)
    || (Array.isArray(d.aktivitaeten) && d.aktivitaeten.length > 0)
  );
}

// ─── CV Library (saved generated snapshots) ──────────────────────────────────

/** @returns {{ id: string, name: string, templateId: string, createdAt: string, profile: any }[]} */
export function loadLibrary() {
  return readJson(STORAGE_KEYS.CV_LIBRARY, []);
}

/**
 * Append a new snapshot to the library (max 10, newest first).
 * @param {import("./profileSchema").CVProfile} profile
 * @returns {{ id: string, name: string, templateId: string, createdAt: string, profile: any }}
 */
export function saveToLibrary(profile) {
  const lib = loadLibrary();
  const name = [profile.vorname, profile.nachname].filter(Boolean).join(" ") || "Lebenslauf";
  const entry = {
    id: Math.random().toString(36).slice(2, 12),
    name,
    templateId: profile.templateId || "tabellarisch",
    createdAt: new Date().toISOString(),
    profile: { ...profile },
  };
  writeJson(STORAGE_KEYS.CV_LIBRARY, [entry, ...lib].slice(0, 10));
  pushCvLibrary();
  return entry;
}

/** Remove one entry by id. */
export function deleteFromLibrary(id) {
  writeJson(STORAGE_KEYS.CV_LIBRARY, loadLibrary().filter((e) => e.id !== id));
  pushCvLibrary();
}

/** Duplicate an entry with a new id and a "(Kopie)" suffix on the name. */
export function duplicateInLibrary(id) {
  const lib = loadLibrary();
  const entry = lib.find((e) => e.id === id);
  if (!entry) return;
  const copy = {
    ...entry,
    id: Math.random().toString(36).slice(2, 12),
    name: `${entry.name} (Kopie)`,
    createdAt: new Date().toISOString(),
  };
  writeJson(STORAGE_KEYS.CV_LIBRARY, [copy, ...lib].slice(0, 10));
  pushCvLibrary();
  return copy;
}

/** Rename an entry by id. */
export function renameInLibrary(id, newName) {
  const lib = loadLibrary();
  const entry = lib.find((e) => e.id === id);
  if (!entry) return;
  entry.name = newName;
  writeJson(STORAGE_KEYS.CV_LIBRARY, lib);
  pushCvLibrary();
}

// ─── Server sync (saved CVs follow the user across devices) ────────────────

/**
 * Merge the local library with the server's mirror.
 *
 * Semantics — the server is authoritative about *what exists*, the local
 * copy is authoritative about *content*:
 *  - ids present on the server are kept; on id conflicts the local entry
 *    wins (current device's edits win over another device's stale copy),
 *  - remote-only ids are appended (CVs saved on another device),
 *  - local-only ids are kept only while NOT in `syncedIds` (created offline,
 *    never acknowledged — will be pushed later). A local id that IS in
 *    `syncedIds` but missing from the server was deleted on another device,
 *    so it is dropped instead of resurrected.
 *
 * Result is capped at 10, newest first, matching `saveToLibrary`.
 *
 * @param {Array} local  - entries from `cv_library_v1` (or [])
 * @param {Array} remote - entries from GET /profile/cv-library (or [])
 * @param {Set|Array} [syncedIds] - ids the server has acknowledged
 * @returns {Array} merged entries
 */
export function mergeCvLibraries(local, remote, syncedIds = new Set()) {
  const synced = syncedIds instanceof Set ? syncedIds : new Set(syncedIds || []);
  const remoteIds = new Set();
  const byId = new Map();

  // Server first — establishes which ids exist.
  (Array.isArray(remote) ? remote : []).forEach((e) => {
    if (e && e.id) {
      remoteIds.add(e.id);
      byId.set(e.id, e);
    }
  });
  // Local second — wins on content for ids the server still has; kept for
  // offline-created ids; dropped for ids the server has stopped acknowledging.
  (Array.isArray(local) ? local : []).forEach((e) => {
    if (!e || !e.id) return;
    if (remoteIds.has(e.id)) byId.set(e.id, e);
    else if (!synced.has(e.id)) byId.set(e.id, e);
  });
  return [...byId.values()]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 10);
}

// Serializes pushes so rapid edits can never land out of order on the server
// (each PUT carries the full list; the last *completed* PUT must win).
let cvPushChain = Promise.resolve();

/**
 * Push the current local library to the backend (fire-and-forget, ordered).
 * Offline/errors are swallowed — the local copy remains the source of truth
 * until the next successful push. On success, the pushed ids are recorded as
 * server-acknowledged so a later pull can distinguish offline-created entries
 * from entries deleted on another device.
 * @returns {Promise<void>}
 */
export function pushCvLibrary() {
  const entries = loadLibrary();
  cvPushChain = cvPushChain
    .then(() => profileApi.putCvLibrary(entries))
    .then(() => {
      const ids = entries.map((e) => e.id).filter(Boolean);
      if (ids.length) writeJson(STORAGE_KEYS.CV_LIBRARY_SYNCED, ids);
    })
    .catch(() => {});
  return cvPushChain;
}

/** Ids the server has acknowledged (pushed or pulled). */
export function getSyncedLibraryIds() {
  const raw = readJson(STORAGE_KEYS.CV_LIBRARY_SYNCED, null);
  return Array.isArray(raw) ? new Set(raw) : new Set();
}

/**
 * True when the local library holds entries the server doesn't (yet) have —
 * i.e. there is something to replay (created while offline, or a previous
 * push failed and was swallowed).
 *
 * @param {Array} [remote] - entries from GET /profile/cv-library (or [])
 * @returns {boolean}
 */
export function hasUnsyncedLibraryEntries(remote) {
  const remoteIds = new Set(
    (Array.isArray(remote) ? remote : []).map((e) => e && e.id).filter(Boolean)
  );
  return loadLibrary().some((e) => e && e.id && !remoteIds.has(e.id));
}

/**
 * Decide what a boot pull should do: merge, then report whether a push is
 * needed — based on the MERGED result, never the pre-pull local list.
 *
 * This is the single source of truth for the replay decision. The ordering
 * guarantee lives here so it is testable in isolation: the push payload must
 * be the merged list (the merge may drop entries deleted on another device),
 * so `needsPush` is computed from `merged`, not from `local`.
 *
 * @param {Array} local    - entries from `cv_library_v1` (or [])
 * @param {Array} remote   - entries from GET /profile/cv-library (or [])
 * @param {Set|Array} [syncedIds] - ids the server has acknowledged
 * @returns {{ merged: Array, needsPush: boolean }}
 */
/** Compare the sync-relevant content of two library entries (id excluded). */
function sameEntryContent(a, b) {
  if (!a || !b) return false;
  return (
    a.name === b.name
    && a.templateId === b.templateId
    && a.createdAt === b.createdAt
    && JSON.stringify(a.profile ?? null) === JSON.stringify(b.profile ?? null)
  );
}

export function computeLibraryReplay(local, remote, syncedIds = new Set()) {
  const merged = mergeCvLibraries(local, remote, syncedIds);
  const remoteById = new Map(
    (Array.isArray(remote) ? remote : [])
      .map((e) => [e && e.id, e])
      .filter(([id]) => id)
  );
  // Push when the merged list diverges from the server mirror:
  //  - ids the server lacks (offline-created / duplicated), or
  //  - ids the server has but whose content changed locally (offline
  //    rename/edit — the local version hasn't been acknowledged yet).
  // Server-deleted ids were dropped by the merge, so they never trigger a
  // push (they must not be resurrected).
  const needsPush = merged.some((e) => {
    if (!e || !e.id) return false;
    const serverEntry = remoteById.get(e.id);
    return !serverEntry || !sameEntryContent(e, serverEntry);
  });
  return { merged, needsPush };
}

// ─── CV Generation rate-limiting (frontend guard, basic = 1 total lifetime) ─────

export const CV_GEN_LIMITS = {
  basic:      1,
  pro:        5,
  max:       -1,  // unlimited
  enterprise: -1, // unlimited
};

/**
 * Returns PDF generation state.
 * Basic plan: 1 total lifetime (never resets).
 * Pro+: daily reset.
 * @param {string} [planKey] - "basic" | "pro" | "max" | "enterprise"
 * @returns {{ count: number, limit: number, atLimit: boolean, unlimited: boolean, remaining: number }}
 */
export function getCvGenState(planKey = "basic") {
  const limit = CV_GEN_LIMITS[planKey] ?? CV_GEN_LIMITS.basic;
  const unlimited = limit === -1;
  const raw = readJson(STORAGE_KEYS.CV_GEN_COUNT, null);
  let count;
  if (planKey === "basic") {
    count = raw?.total ?? raw?.count ?? 0;
  } else {
    const today = new Date().toDateString();
    count = raw?.date === today ? (raw.count ?? 0) : 0;
  }
  const atLimit = !unlimited && count >= limit;
  return { count, limit, atLimit, unlimited, remaining: unlimited ? -1 : Math.max(0, limit - count) };
}

/** Increment the PDF generation counter. Basic: lifetime total. Pro+: daily. */
export function incrementCvGen(planKey = "basic") {
  const raw = readJson(STORAGE_KEYS.CV_GEN_COUNT, null);
  if (planKey === "basic") {
    const total = (raw?.total ?? raw?.count ?? 0) + 1;
    writeJson(STORAGE_KEYS.CV_GEN_COUNT, { total });
  } else {
    const today = new Date().toDateString();
    const prev = raw?.date === today ? (raw.count ?? 0) : 0;
    writeJson(STORAGE_KEYS.CV_GEN_COUNT, { count: prev + 1, date: today });
  }
}

/**
 * Returns a debounced save function. Last call wins; subsequent calls reset
 * the timer. Safe against rapid keystrokes.
 * @returns {(profile: import("./profileSchema").CVProfile) => void}
 */
export function makeDebouncedSave() {
  let timer = null;
  return (profile) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveDraftNow(profile);
      timer = null;
    }, DEBOUNCE_MS);
  };
}
