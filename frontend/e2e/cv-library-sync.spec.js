import { expect, test } from "@playwright/test";

/**
 * Cross-device CV library sync.
 *
 * Saved CVs live in `cv_library_v1` locally AND in the server-side mirror
 * (`/api/profile/cv-library`, backed by the `cv_library_entries` table):
 *  - saves push the full list to the server (PUT),
 *  - every authenticated boot pulls the server mirror and merges it (GET).
 *
 * Two browser contexts simulate two devices (separate localStorage /
 * sessionStorage / cookies). A shared in-memory array acts as the backend
 * store, so the CV saved on device A must surface on device B with no local
 * seeding on B.
 *
 * NOTE: seed functions must be fully self-contained — Playwright serializes
 * the function body into the browser and does NOT capture references to
 * outer module-scope functions.
 */

/** Seed for device A: authenticated + a real builder draft (wizard mode). */
function seedDeviceA() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ id: 1, email: "qa@jobassist.tech", full_name: "Anna Muster" })
  );
  localStorage.setItem(
    "cv_profile_v1",
    JSON.stringify({
      _version: 1,
      vorname: "Anna",
      nachname: "Muster",
      schulname: "HAK Wien",
      sprachkenntnisse: [{ sprache: "Deutsch", niveau: "Muttersprache" }],
      templateId: "tabellarisch",
    })
  );
}

/** Seed for device B: authenticated only — no local library, no draft. */
function seedDeviceB() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ id: 1, email: "qa@jobassist.tech", full_name: "Anna Muster" })
  );
}

/** Seed for device A (deletion test): authenticated + one library entry. */
function seedDeviceAWithLibrary() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ id: 1, email: "qa@jobassist.tech", full_name: "Anna Muster" })
  );
  // One previously-saved CV — id must match the server-mirror seed below.
  localStorage.setItem(
    "cv_library_v1",
    JSON.stringify([
      {
        id: "lib-delete-1",
        name: "Anna Muster",
        templateId: "tabellarisch",
        createdAt: "2026-08-26T12:00:00.000Z",
        profile: { vorname: "Anna", nachname: "Muster", email: "qa@jobassist.tech" },
      },
    ])
  );
}

/** Wire the API mocks for one page; `serverLibrary` is the shared backend store. */
async function mockApi(page, serverLibrary, net = { offline: false }) {
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token" }),
    });
  });

  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "qa@jobassist.tech", full_name: "Anna Muster", is_verified: true },
        profile: { avatar: null },
        resumes: [],
        resumes_total: 0,
        cv: { has_content: false, completion_pct: 0, updated_at: null },
        jobs_total: 0,
        jobs_by_status: {},
        plan: "max",
        usage: [],
      }),
    });
  });

  await page.route("**/api/profile/me", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: route.request().postData() || "{}",
    });
  });

  await page.route("**/api/profile/cv/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, remaining: -1 }),
    });
  });

  // The server mirror: PUT replaces the store, GET returns it. While
  // `net.offline` is true, requests abort like a lost connection so the app
  // behaves exactly as it would offline (saves stay local, pushes fail).
  // `net.blockPush` aborts only PUTs — used to prove a CV survives an empty
  // server pull on its own (the merge), not because a replay push landed.
  // `net.gets` / `net.puts` count fulfilled requests so tests can assert that
  // a reconnect pull ran and that no push followed it.
  await page.route("**/api/profile/cv-library", async (route) => {
    if (net.offline) {
      await route.abort("internetdisconnected");
      return;
    }
    if (route.request().method() === "PUT" && net.blockPush) {
      await route.abort("internetdisconnected");
      return;
    }
    if (route.request().method() === "PUT") {
      net.puts += 1;
      const body = route.request().postDataJSON();
      serverLibrary.length = 0;
      serverLibrary.push(...(body?.entries ?? []));
    } else {
      net.gets += 1;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: serverLibrary }),
    });
  });

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });
}

const BASE = "http://127.0.0.1:4173";

test("deleting a CV on one device removes it on another device", async ({ browser }) => {
  // The CV exists on the server (saved earlier) and on device A's local library.
  const serverLibrary = [
    {
      id: "lib-delete-1",
      name: "Anna Muster",
      templateId: "tabellarisch",
      createdAt: "2026-08-26T12:00:00.000Z",
      profile: { vorname: "Anna", nachname: "Muster", email: "qa@jobassist.tech" },
    },
  ];

  // ── Device B first: sees the CV via the server pull ───────────────────────
  const deviceB = await browser.newContext({ baseURL: BASE });
  const pageB = await deviceB.newPage();
  await pageB.addInitScript(seedDeviceB);
  await mockApi(pageB, serverLibrary);

  await pageB.goto("/dashboard");
  await expect(pageB.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(pageB.getByText("1 Lebenslauf gespeichert")).toBeVisible();

  // ── Device A: delete the CV in the builder ────────────────────────────────
  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceAWithLibrary);
  await mockApi(pageA, serverLibrary);

  await pageA.goto("/lebenslauf");
  const librarySectionA = pageA.getByRole("heading", { name: "Gespeicherte Lebensläufe" }).locator("../..");
  await expect(librarySectionA.getByText("Anna Muster")).toBeVisible();

  // Entfernen → deleteFromLibrary → PUT replaces the server mirror with [].
  await pageA.getByTitle("Entfernen").click();
  await expect.poll(() => serverLibrary.length, { timeout: 10_000 }).toBe(0);

  // ── Device B: after a fresh boot the CV is gone everywhere ────────────────
  await pageB.reload();
  await expect(pageB.getByText("Lebenslauf bereit")).not.toBeVisible();

  await pageB.goto("/lebenslauf");
  await expect(
    pageB.getByRole("heading", { name: "Gespeicherte Lebensläufe" })
  ).not.toBeVisible();

  await deviceA.close();
  await deviceB.close();
});

test("a CV saved offline is pushed to the server after reconnect", async ({ browser }) => {
  const serverLibrary = [];
  const net = { offline: false };

  // ── Device A: start offline, save a CV ────────────────────────────────────
  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceA);
  await mockApi(pageA, serverLibrary, net);

  net.offline = true; // go offline before the boot pull / save
  await pageA.goto("/lebenslauf");
  await pageA.getByRole("button", { name: /^PDF$/ }).click();

  // The save landed in the LOCAL library (source of truth while offline)…
  await expect.poll(
    () => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length),
    { timeout: 10_000 },
  ).toBe(1);
  // …but the server mirror is still empty (the push was swallowed offline).
  expect(serverLibrary).toHaveLength(0);

  // ── Reconnect: the browser fires `offline` then `online` (a real network
  // transition), and the boot pull replays the push ──
  net.offline = false;
  await pageA.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });

  await expect.poll(() => serverLibrary.length, { timeout: 10_000 }).toBe(1);
  expect(serverLibrary[0].name).toBe("Anna Muster");

  // ── Device B (fresh, online): sees the replayed CV ───────────────────────
  const deviceB = await browser.newContext({ baseURL: BASE });
  const pageB = await deviceB.newPage();
  await pageB.addInitScript(seedDeviceB);
  await mockApi(pageB, serverLibrary);

  await pageB.goto("/dashboard");
  await expect(pageB.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(pageB.getByText("1 Lebenslauf gespeichert")).toBeVisible();

  await deviceA.close();
  await deviceB.close();
});

test("a CV created offline survives a boot that pulls an empty server list", async ({ browser }) => {
  const serverLibrary = [];
  const net = { offline: false, blockPush: false };

  // ── Device A: save a CV while offline ─────────────────────────────────────
  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceA);
  await mockApi(pageA, serverLibrary, net);

  net.offline = true;
  await pageA.goto("/lebenslauf");
  await pageA.getByRole("button", { name: /^PDF$/ }).click();

  // The CV exists only locally — the offline push never reached the server.
  await expect
    .poll(() => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length))
    .toBe(1);
  expect(serverLibrary).toHaveLength(0);

  // ── Boot again with connectivity: the pull returns an EMPTY server list ───
  // (the server genuinely has nothing) while PUT stays blocked. Survival must
  // come from the merge keeping the never-synced local entry — not from the
  // replay push landing.
  net.offline = false;
  net.blockPush = true;
  await pageA.reload();

  // The reload lands on the builder overview (library visible — the draft
  // card offers "Fortsetzen"). Navigate to the dashboard to see the merged
  // CV state after the empty pull.
  await pageA.goto("/dashboard");

  // Still there after the empty pull, and the server remains empty the whole
  // time (the push was never allowed through).
  await expect(pageA.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(pageA.getByText("1 Lebenslauf gespeichert")).toBeVisible();
  expect(serverLibrary).toHaveLength(0);

  // And the CV is still listed in the builder's library. The overview is
  // shown directly when the last view was persisted, otherwise the wizard
  // auto-resumed the draft — hop back to the overview in that case.
  await pageA.goto("/lebenslauf");
  const uebersicht = pageA.getByRole("button", { name: "Übersicht" });
  const libraryHeading = pageA.getByRole("heading", { name: "Gespeicherte Lebensläufe" });
  await expect(uebersicht.or(libraryHeading)).toBeVisible({ timeout: 10_000 });
  if (await uebersicht.isVisible()) await uebersicht.click();
  const librarySection = pageA.getByRole("heading", { name: "Gespeicherte Lebensläufe" }).locator("../..");
  await expect(librarySection.getByText("Anna Muster")).toBeVisible();

  await deviceA.close();
});

test("an offline-created CV deleted before reconnect never reaches the server", async ({ browser }) => {
  const serverLibrary = [];
  const net = { offline: false, blockPush: false, gets: 0, puts: 0 };

  // ── Device A: save a CV while offline ─────────────────────────────────────
  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceA);
  await mockApi(pageA, serverLibrary, net);

  net.offline = true; // boot + save + delete all happen without connectivity
  await pageA.goto("/lebenslauf");
  await pageA.getByRole("button", { name: /^PDF$/ }).click();

  // The CV landed in the LOCAL library; the offline push never reached the
  // server (and the offline boot pull also failed, so no fulfilled GET yet).
  await expect
    .poll(() => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length))
    .toBe(1);
  expect(serverLibrary).toHaveLength(0);
  expect(net.puts).toBe(0);

  // ── Delete it while still offline ─────────────────────────────────────────
  // Reload while offline. The overview may be shown directly (last view
  // persisted) or the wizard auto-resumes the draft — get to the overview
  // either way, where the library card shows the Entfernen button. The
  // delete writes localStorage + pushes (swallowed).
  await pageA.reload();
  const uebersicht = pageA.getByRole("button", { name: "Übersicht" });
  const entf = pageA.getByTitle("Entfernen");
  await expect(uebersicht.or(entf)).toBeVisible({ timeout: 10_000 });
  if (await uebersicht.isVisible()) await uebersicht.click();
  await expect(pageA.getByTitle("Entfernen")).toBeVisible();
  await pageA.getByTitle("Entfernen").click();

  // Local library is now empty; the server never saw anything.
  await expect
    .poll(() => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length))
    .toBe(0);
  expect(serverLibrary).toHaveLength(0);
  expect(net.puts).toBe(0);

  // ── Reconnect: the pull runs again — and must NOT replay anything ─────────
  net.offline = false;
  await pageA.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });

  // The reconnect pull completes (one fulfilled GET)…
  await expect.poll(() => net.gets, { timeout: 10_000 }).toBe(1);
  // …but there is nothing to push: the deleted CV never reaches the server.
  expect(serverLibrary).toHaveLength(0);
  expect(net.puts).toBe(0);

  // UI agrees: no saved CV anywhere, dashboard shows the empty state.
  const localAfter = await pageA.evaluate(
    () => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length
  );
  expect(localAfter).toBe(0);
  await pageA.goto("/dashboard");
  await expect(pageA.getByText("1 Lebenslauf gespeichert")).not.toBeVisible();

  await deviceA.close();
});

test("offline renames and duplicates replay to the server after reconnect", async ({ browser }) => {
  // Device A already has a synced CV (on the server + in its local library).
  // Id must match seedDeviceAWithLibrary ("lib-delete-1") so the boot pull
  // sees a single in-sync entry and does not push on startup.
  const serverLibrary = [
    {
      id: "lib-delete-1",
      name: "Anna Muster",
      templateId: "tabellarisch",
      createdAt: "2026-08-26T12:00:00.000Z",
      profile: { vorname: "Anna", nachname: "Muster", email: "qa@jobassist.tech" },
    },
  ];
  const net = { offline: false, blockPush: false, gets: 0, puts: 0 };

  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceAWithLibrary);
  await mockApi(pageA, serverLibrary, net);

  await pageA.goto("/lebenslauf");
  await expect(pageA.getByTitle("Umbenennen")).toBeVisible();

  // ── Phase 1: offline rename → reconnect → server must be renamed ──────────
  net.offline = true;
  pageA.once("dialog", (dialog) => dialog.accept("Bewerbung 2026"));
  await pageA.getByTitle("Umbenennen").click();

  // Local copy is renamed; the server still holds the old name.
  await expect
    .poll(() => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]")[0]?.name))
    .toBe("Bewerbung 2026");
  expect(serverLibrary[0].name).toBe("Anna Muster");

  net.offline = false;
  await pageA.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });

  // The RENAME alone (same id, changed content) must trigger the replay push.
  await expect
    .poll(() => serverLibrary[0]?.name, { timeout: 10_000 })
    .toBe("Bewerbung 2026");
  expect(serverLibrary).toHaveLength(1);

  // ── Phase 2: offline duplicate → reconnect → server gains the copy ────────
  net.offline = true;
  await pageA.getByTitle("Duplizieren").click();
  await expect
    .poll(() => pageA.evaluate(() => JSON.parse(localStorage.getItem("cv_library_v1") || "[]").length))
    .toBe(2);
  expect(serverLibrary).toHaveLength(1); // nothing pushed yet

  net.offline = false;
  await pageA.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });

  await expect.poll(() => serverLibrary.length, { timeout: 10_000 }).toBe(2);
  const names = serverLibrary.map((e) => e.name).sort();
  expect(names).toEqual(["Bewerbung 2026", "Bewerbung 2026 (Kopie)"]);
  // The renamed entry keeps its id (it was edited, not re-created).
  expect(serverLibrary.find((e) => e.name === "Bewerbung 2026").id).toBe("lib-delete-1");

  await deviceA.close();
});

test("a CV saved on one device appears on another device", async ({ browser }) => {
  const serverLibrary = [];

  // ── Device A: save a CV in the builder ────────────────────────────────────
  const deviceA = await browser.newContext({ baseURL: BASE });
  const pageA = await deviceA.newPage();
  await pageA.addInitScript(seedDeviceA);
  await mockApi(pageA, serverLibrary);

  await pageA.goto("/lebenslauf");
  // Wizard mode renders the top-bar "PDF" button; clicking it saves the CV to
  // the library (saveToLibrary → PUT /profile/cv-library) before generating.
  await pageA.getByRole("button", { name: /^PDF$/ }).click();

  // The save must have reached the server mirror on device A.
  await expect.poll(() => serverLibrary.length, { timeout: 10_000 }).toBe(1);
  const savedEntry = serverLibrary[0];
  expect(savedEntry.name).toBe("Anna Muster");
  expect(savedEntry.profile?.vorname).toBe("Anna");

  // ── Device B: fresh context — no local library, only the server pull ──────
  const deviceB = await browser.newContext({ baseURL: BASE });
  const pageB = await deviceB.newPage();
  await pageB.addInitScript(seedDeviceB);
  await mockApi(pageB, serverLibrary);

  await pageB.goto("/dashboard");

  // The pulled mirror counts as a CV on the dashboard…
  await expect(pageB.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(pageB.getByText("1 Lebenslauf gespeichert")).toBeVisible();

  // …and the CV builder lists the actual saved entry, not just a count.
  await pageB.goto("/lebenslauf");
  const librarySection = pageB.getByRole("heading", { name: "Gespeicherte Lebensläufe" }).locator("../..");
  await expect(librarySection).toBeVisible();
  await expect(librarySection.getByText("Anna Muster")).toBeVisible();

  await deviceA.close();
  await deviceB.close();
});
