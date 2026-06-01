import { STORAGE_KEYS, readJson, writeJson } from "../storageKeys";
import { CV_PROFILE_VERSION, emptyProfile } from "./profileSchema";

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
  return entry;
}

/** Remove one entry by id. */
export function deleteFromLibrary(id) {
  writeJson(STORAGE_KEYS.CV_LIBRARY, loadLibrary().filter((e) => e.id !== id));
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
  return copy;
}

/** Rename an entry by id. */
export function renameInLibrary(id, newName) {
  const lib = loadLibrary();
  const entry = lib.find((e) => e.id === id);
  if (!entry) return;
  entry.name = newName;
  writeJson(STORAGE_KEYS.CV_LIBRARY, lib);
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
