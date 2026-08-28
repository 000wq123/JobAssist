/** Shared env for CV-picker e2e: auth/draft seeding + full API mocks. */
import { expect } from "@playwright/test";

export const MARKET_TITLE = "Wähle deinen Lebenslauf";
export const WIZARD_HEADING = "Persönliche Daten";

/**
 * Authenticated session + a real builder draft, landing directly in the
 * template-picker scene (the builder persists its last view mode).
 */
export function seedDraft() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  sessionStorage.setItem("ja:cv_builder_mode", "templatePicker");
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
      schultyp: "HAK",
      klasse: "5A",
      profil: "Kaufmännisch interessierte Schülerin mit Fokus auf Marketing.",
      email: "qa@jobassist.tech",
      telefon: "6608585186",
      plz: "1050",
      ort: "Wien",
      sprachkenntnisse: [
        { sprache: "Deutsch", niveau: "Muttersprache" },
        { sprache: "Englisch", niveau: "B2" },
      ],
      faehigkeiten: ["MS Excel", "Python Grundlagen"],
      erfahrungen: [
        { titel: "Praktikum", organisation: "MegaMart Wien", von: "2025-07-01", bis: "2025-08-31" },
      ],
      templateId: "tabellarisch",
    })
  );
}

/** Bootstrap/auth/CV-sync API mocks — identical response shapes to axe-auth + cv-library-sync. */
export function mockApi(page) {
  page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "test@example.com", full_name: "Test User", is_verified: true },
        profile: { id: 1, user_id: 1, avatar: null },
        resumes: [],
        resumes_total: 0,
        jobs_total: 0,
        jobs_by_status: {},
        plan: "max",
        usage: [],
      }),
    });
  });
  page.route("**/api/jobs**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  page.route("**/api/job-alerts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ alerts: [], daily_manual_run_count: 0, daily_manual_run_limit: -1 }),
    });
  });
  page.route("**/api/resumes**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  page.route("**/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, email: "test@example.com", full_name: "Test User", is_verified: true }),
    });
  });
  // CV-library sync mirror — pulled during bootstrap; without this mock the
  // boot treats the failed pull as an auth failure.
  page.route("**/api/profile/cv-library**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) });
  });
  // The seeded access token isn't a parseable JWT, so the client proactively
  // refreshes before its first call; a real-server 401 here logs out to /login.
  page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token", token_type: "bearer" }),
    });
  });
  page.route("**/api/profile/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, user_id: 1, email: "qa@jobassist.tech", full_name: "Anna Muster" }),
    });
  });
}

/** Navigate into the picker scene and wait for the marketplace heading. */
export async function openPicker(page) {
  await page.goto("/lebenslauf");
  const cont = page.getByRole("button", { name: /Fortsetzen/u }).first();
  if (await cont.isVisible().catch(() => false)) await cont.click();
  const cookieDialog = page.getByRole("dialog", { name: "Cookie-Einstellungen" });
  if (await cookieDialog.isVisible().catch(() => false)) {
    const accept = cookieDialog.getByRole("button", { name: /Akzeptieren|Alle akzeptieren/u });
    if (await accept.isVisible().catch(() => false)) await accept.click();
  }
  await expect(page.getByRole("heading", { name: MARKET_TITLE })).toBeVisible();
}
