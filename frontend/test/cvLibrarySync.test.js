import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/api", () => ({
  profileApi: {
    putCvLibrary: vi.fn(() => Promise.resolve({ data: { entries: [] } })),
  },
}));

import {
  saveToLibrary,
  deleteFromLibrary,
  duplicateInLibrary,
  renameInLibrary,
  loadLibrary,
  mergeCvLibraries,
  hasDraftContent,
  hasUnsyncedLibraryEntries,
  computeLibraryReplay,
} from "../src/cv/storage";
import { profileApi } from "../src/services/api";

const putCvLibrary = vi.mocked(profileApi.putCvLibrary);

function entry(id, createdAt, overrides = {}) {
  return { id, name: `CV ${id}`, templateId: "tabellarisch", createdAt, profile: { vorname: "Lisa" }, ...overrides };
}

/** Wait until `putCvLibrary` has been called `n` times (serialized chain). */
async function expectPushCount(n) {
  await vi.waitFor(() => expect(putCvLibrary).toHaveBeenCalledTimes(n));
}

beforeEach(() => {
  putCvLibrary.mockClear();
});

describe("mergeCvLibraries", () => {
  it("keeps local entries and appends remote-only ones (newest first, cap 10)", () => {
    const local = [entry("a", "2026-01-02T00:00:00Z")];
    const remote = [
      entry("a", "2026-01-02T00:00:00Z", { name: "Renamed elsewhere" }),
      entry("b", "2026-01-03T00:00:00Z"),
    ];
    const merged = mergeCvLibraries(local, remote);
    // Same id → local wins; remote-only entry appended; sorted newest first.
    expect(merged.map((e) => e.id)).toEqual(["b", "a"]);
    expect(merged[1].name).toBe("CV a");
  });

  it("tolerates missing/null inputs", () => {
    expect(mergeCvLibraries(null, undefined)).toEqual([]);
    expect(mergeCvLibraries([entry("a", "2026-01-01T00:00:00Z")], null)).toHaveLength(1);
  });

  it("caps the merged result at 10 entries", () => {
    const local = Array.from({ length: 6 }, (_, i) => entry(`l${i}`, `2026-01-0${i + 1}T00:00:00Z`));
    const remote = Array.from({ length: 6 }, (_, i) => entry(`r${i}`, `2026-02-0${i + 1}T00:00:00Z`));
    expect(mergeCvLibraries(local, remote)).toHaveLength(10);
  });

  it("hasUnsyncedLibraryEntries is true for offline-created local entries", () => {
    localStorage.setItem("cv_library_v1", JSON.stringify([entry("offline-1", "2026-01-02T00:00:00Z")]));
    expect(hasUnsyncedLibraryEntries([])).toBe(true);
    expect(hasUnsyncedLibraryEntries(null)).toBe(true);
    expect(hasUnsyncedLibraryEntries(undefined)).toBe(true);
  });

  it("hasUnsyncedLibraryEntries is false when everything is on the server", () => {
    localStorage.setItem("cv_library_v1", JSON.stringify([entry("a", "2026-01-02T00:00:00Z")]));
    expect(hasUnsyncedLibraryEntries([entry("a", "2026-01-02T00:00:00Z")])).toBe(false);
    // Extra remote-only entries don't create pending work either.
    expect(
      hasUnsyncedLibraryEntries([
        entry("a", "2026-01-02T00:00:00Z"),
        entry("b", "2026-01-03T00:00:00Z"),
      ])
    ).toBe(false);
  });

  it("hasUnsyncedLibraryEntries is false when the local library is empty", () => {
    localStorage.setItem("cv_library_v1", JSON.stringify([]));
    expect(hasUnsyncedLibraryEntries([])).toBe(false);
    expect(hasUnsyncedLibraryEntries(null)).toBe(false);
  });

  it("hasUnsyncedLibraryEntries mixes: one synced + one offline entry → pending", () => {
    localStorage.setItem(
      "cv_library_v1",
      JSON.stringify([
        entry("a", "2026-01-02T00:00:00Z"),
        entry("offline-2", "2026-01-03T00:00:00Z"),
      ])
    );
    expect(hasUnsyncedLibraryEntries([entry("a", "2026-01-02T00:00:00Z")])).toBe(true);
  });

  it("drops a synced entry the server no longer returns (deleted elsewhere)", () => {
    const local = [entry("a", "2026-01-02T00:00:00Z")];
    // Server acknowledged "a" before, but no longer has it → deleted on
    // another device → must NOT resurrect on this boot.
    expect(mergeCvLibraries(local, [], new Set(["a"]))).toEqual([]);
  });

  it("keeps a never-synced local entry when the server list is empty (offline-created)", () => {
    const local = [entry("a", "2026-01-02T00:00:00Z")];
    // "a" was created offline and never acknowledged → survives the merge
    // and will be pushed on the next mutation.
    expect(mergeCvLibraries(local, [], new Set())).toEqual(local);
  });

  it("keeps the local edit for an id the server still has", () => {
    const local = [entry("a", "2026-01-02T00:00:00Z", { name: "Local edit" })];
    const remote = [entry("a", "2026-01-02T00:00:00Z", { name: "Remote stale copy" })];
    const merged = mergeCvLibraries(local, remote, new Set(["a"]));
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("Local edit");
  });
});

describe("computeLibraryReplay (merge-then-push order)", () => {
  it("decides on the MERGED list, not the pre-pull local list", () => {
    // The pre-pull local library still holds "deleted-elsewhere" (synced) + an
    // offline-created entry. The merge must drop the synced one (deleted on
    // another device), so the replay pushes only the merged result.
    const local = [
      entry("deleted-elsewhere", "2026-01-01T00:00:00Z"),
      entry("offline-new", "2026-01-02T00:00:00Z"),
    ];
    const remote = []; // server has nothing (the offline CV was never pushed)
    const syncedIds = new Set(["deleted-elsewhere"]);

    const { merged, needsPush } = computeLibraryReplay(local, remote, syncedIds);
    // Deleted-elsewhere is NOT resurrected into the merged list…
    expect(merged.map((e) => e.id)).toEqual(["offline-new"]);
    // …so the push payload (the merged list) never contains it.
    expect(merged.some((e) => e.id === "deleted-elsewhere")).toBe(false);
    // And a push is still needed for the genuinely offline-created entry.
    expect(needsPush).toBe(true);
  });

  it("does NOT push when the merge drops everything (all synced, none on server)", () => {
    // Pre-pull local would report "unsynced" for every entry (server empty),
    // but the merge drops them all (all were previously acknowledged) — so
    // there is nothing to replay: a push would resurrect deleted CVs.
    const local = [entry("a", "2026-01-01T00:00:00Z")];
    const remote = [];
    const syncedIds = new Set(["a"]);

    const { merged, needsPush } = computeLibraryReplay(local, remote, syncedIds);
    expect(merged).toEqual([]);
    expect(needsPush).toBe(false);
  });

  it("pushes a single offline-created entry when the server has nothing", () => {
    const local = [entry("offline-new", "2026-01-02T00:00:00Z")];
    const remote = [];

    const { merged, needsPush } = computeLibraryReplay(local, remote, new Set());
    expect(merged.map((e) => e.id)).toEqual(["offline-new"]);
    expect(needsPush).toBe(true);
  });

  it("pushes when an offline RENAME diverges from the server copy (same id)", () => {
    // The id exists on the server, but the local copy was renamed offline —
    // the merge keeps the local (renamed) content, and that divergence must
    // trigger a replay push so the rename reaches the server.
    const local = [entry("a", "2026-01-02T00:00:00Z", { name: "Bewerbung 2026" })];
    const remote = [entry("a", "2026-01-02T00:00:00Z", { name: "CV a" })];

    const { merged, needsPush } = computeLibraryReplay(local, remote, new Set(["a"]));
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("Bewerbung 2026");
    expect(needsPush).toBe(true);
  });

  it("does NOT push when the server copy matches the local content", () => {
    // Same id, same content (e.g. just pulled) — nothing to replay.
    const local = [entry("a", "2026-01-02T00:00:00Z")];
    const remote = [entry("a", "2026-01-02T00:00:00Z")];

    const { merged, needsPush } = computeLibraryReplay(local, remote, new Set(["a"]));
    expect(merged.map((e) => e.id)).toEqual(["a"]);
    expect(needsPush).toBe(false);
  });

  it("pushes when an offline DUPLICATE adds an id the server lacks", () => {
    // The original is in sync, but the offline duplicate is a brand-new id.
    const local = [
      entry("copy-of-a", "2026-01-03T00:00:00Z", { name: "CV a (Kopie)" }),
      entry("a", "2026-01-02T00:00:00Z"),
    ];
    const remote = [entry("a", "2026-01-02T00:00:00Z")];

    const { merged, needsPush } = computeLibraryReplay(local, remote, new Set(["a"]));
    expect(merged.map((e) => e.id)).toEqual(["copy-of-a", "a"]);
    expect(needsPush).toBe(true);
  });

  it("is a no-op when local and server are in sync (nothing to replay)", () => {
    const local = [entry("a", "2026-01-02T00:00:00Z")];
    const remote = [entry("a", "2026-01-02T00:00:00Z")];

    const { merged, needsPush } = computeLibraryReplay(local, remote, new Set(["a"]));
    expect(merged.map((e) => e.id)).toEqual(["a"]);
    expect(needsPush).toBe(false);
  });

  it("tolerates missing/null inputs", () => {
    expect(computeLibraryReplay(null, undefined)).toEqual({ merged: [], needsPush: false });
    expect(computeLibraryReplay([], null)).toEqual({ merged: [], needsPush: false });
  });
});

describe("hasDraftContent", () => {
  const draftKey = "cv_profile_v1";

  it("returns false when there is no draft", () => {
    expect(hasDraftContent()).toBe(false);
  });

  it("does NOT count an auto-prefilled email-only draft", () => {
    localStorage.setItem(draftKey, JSON.stringify({ email: "test@example.com" }));
    expect(hasDraftContent()).toBe(false);
  });

  it("does NOT count only-default drafts (language, license, template)", () => {
    localStorage.setItem(draftKey, JSON.stringify({}));
    expect(hasDraftContent()).toBe(false);
  });

  it("counts a draft with a name", () => {
    localStorage.setItem(draftKey, JSON.stringify({ vorname: "Lisa", nachname: "Muster" }));
    expect(hasDraftContent()).toBe(true);
  });

  it("counts a draft with only experience entries", () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({ erfahrungen: [{ id: "e1", titel: "Praktikum", organisation: "Firma" }] })
    );
    expect(hasDraftContent()).toBe(true);
  });
});

describe("push on mutation", () => {
  it("saveToLibrary writes locally then pushes the full list", async () => {
    const saved = saveToLibrary({ vorname: "Lisa", nachname: "Muster", templateId: "slim-sidebar" });
    await expectPushCount(1);

    const pushed = putCvLibrary.mock.calls[0][0];
    expect(pushed).toHaveLength(1);
    expect(pushed[0].id).toBe(saved.id);
    expect(pushed[0].name).toBe("Lisa Muster");
    expect(pushed[0].templateId).toBe("slim-sidebar");
    expect(loadLibrary()).toHaveLength(1);
  });

  it("records pushed ids as server-acknowledged", async () => {
    localStorage.removeItem("cv_library_synced_ids_v1");
    const saved = saveToLibrary({ vorname: "Lisa", nachname: "Muster" });
    await expectPushCount(1);

    const synced = JSON.parse(localStorage.getItem("cv_library_synced_ids_v1"));
    expect(synced).toEqual([saved.id]);
  });

  it("deleteFromLibrary pushes the list without the removed entry", async () => {
    const first = saveToLibrary({ vorname: "A", nachname: "B" });
    saveToLibrary({ vorname: "C", nachname: "D" });
    await expectPushCount(2);

    deleteFromLibrary(first.id);
    await expectPushCount(3);

    const pushed = putCvLibrary.mock.calls[2][0];
    expect(pushed.map((e) => e.id)).not.toContain(first.id);
  });

  it("duplicate and rename also push", async () => {
    const saved = saveToLibrary({ vorname: "Lisa", nachname: "Muster" });
    await expectPushCount(1);

    duplicateInLibrary(saved.id);
    await expectPushCount(2);

    const two = loadLibrary();
    renameInLibrary(two[0].id, "Bewerbung 2026");
    await expectPushCount(3);

    const pushed = putCvLibrary.mock.calls[2][0];
    expect(pushed.some((e) => e.name === "Bewerbung 2026")).toBe(true);
  });
});
