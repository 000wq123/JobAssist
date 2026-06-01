import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/", heading: /jobassist/i },
  { path: "/login", heading: /willkommen zurück/i },
  { path: "/register", heading: /konto erstellen/i },
  { path: "/pricing", heading: /preise/i },
  { path: "/impressum", heading: /impressum/i },
  { path: "/terms", heading: /nutzungsbedingungen/i },
  { path: "/privacy", heading: /datenschutz/i },
  { path: "/forgot-password", heading: /passwort zurücksetzen/i },
];

for (const { path, heading } of PUBLIC_ROUTES) {
  test(`public page ${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}

test("authenticated dashboard smoke (mocked)", async ({ page }) => {
  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: 1, email: "test@example.com", full_name: "Test User" },
        profile: { id: 1, user_id: 1, schultyp: "HAK", klasse: "10", geburtsdatum: "2008-01-01", geburtsort: "Wien", strasse: "Teststr. 1", plz: "1010", ort: "Wien", fuehrerschein: "B" },
        resume: null,
        plan: { id: "basic", name: "Basic", features: {} },
        usage: { jobs_searched_today: 0, max_jobs_search_per_day: 10, cover_letters_today: 0, max_cover_letters_per_day: 3 },
      }),
    });
  });

  await page.route("**/api/jobs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /heute/i })).toBeVisible();
});
