import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  { path: "/", heading: /bewerbungen/i },
  { path: "/login", heading: /willkommen zurück/i },
  { path: "/register", heading: /konto erstellen/i },
  { path: "/impressum", heading: /impressum/i },
  { path: "/terms", heading: /nutzungsbedingungen/i },
  { path: "/privacy", heading: /datenschutz/i },
  { path: "/forgot-password", heading: /passwort vergessen/i },
];

for (const { path, heading } of PUBLIC_ROUTES) {
  test(`public page ${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  });
}

test("authenticated dashboard smoke (mocked)", async ({ page }) => {
  await page.route("**/api/init", async (route) => {
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

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading").first()).toBeVisible();
});
