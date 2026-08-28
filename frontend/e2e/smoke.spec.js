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

test("dashboard counts a local CV library entry when the builder profile is not synced", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("ja:access_token", "test-access-token");
    localStorage.setItem("jobassist_onboarding_done_v1", "1");
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ id: 1, email: "test@example.com", full_name: "Test User" })
    );
    // Saved CV snapshot — the builder profile hasn't synced to the backend.
    localStorage.setItem(
      "cv_library_v1",
      JSON.stringify([
        {
          id: "lib-1",
          name: "Lebenslauf",
          templateId: "tabellarisch",
          createdAt: new Date().toISOString(),
          profile: { vorname: "Test", nachname: "User" },
        },
      ])
    );
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token" }),
    });
  });

  // The boot pulls the CV-library mirror; without this mock it hits the real
  // backend, 401s with the seeded token and logs the session out.
  await page.route("**/api/profile/cv-library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) });
  });

  // Bootstrap says: no uploaded files, no synced builder profile.
  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "test@example.com", full_name: "Test User", is_verified: true },
        profile: { id: 1, user_id: 1, avatar: null },
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

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ alerts: [] }),
    });
  });

  await page.goto("/dashboard");

  // The local library entry counts as a CV even though nothing is on the server.
  await expect(page.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(page.getByText("1 Lebenslauf gespeichert")).toBeVisible();
});

test("dashboard counts a non-empty builder draft as a CV", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("ja:access_token", "test-access-token");
    localStorage.setItem("jobassist_onboarding_done_v1", "1");
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ id: 1, email: "test@example.com", full_name: "Test User" })
    );
    // Builder draft with real content — never saved to the library.
    localStorage.setItem(
      "cv_profile_v1",
      JSON.stringify({ vorname: "Test", nachname: "User", schulname: "HAK Wien" })
    );
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token" }),
    });
  });

  // The boot pulls the CV-library mirror; without this mock it hits the real
  // backend, 401s with the seeded token and logs the session out.
  await page.route("**/api/profile/cv-library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) });
  });

  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "test@example.com", full_name: "Test User", is_verified: true },
        profile: { id: 1, user_id: 1, avatar: null },
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

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });

  await page.goto("/dashboard");

  await expect(page.getByText("Lebenslauf bereit")).toBeVisible();
  await expect(page.getByText("Entwurf im Lebenslauf-Builder gespeichert")).toBeVisible();
});

test("dashboard ignores an email-only builder draft", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("ja:access_token", "test-access-token");
    localStorage.setItem("jobassist_onboarding_done_v1", "1");
    localStorage.setItem(
      "auth_user",
      JSON.stringify({ id: 1, email: "test@example.com", full_name: "Test User" })
    );
    // Auto-prefilled email is not real CV content.
    localStorage.setItem("cv_profile_v1", JSON.stringify({ email: "test@example.com" }));
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token" }),
    });
  });

  // The boot pulls the CV-library mirror; without this mock it hits the real
  // backend, 401s with the seeded token and logs the session out.
  await page.route("**/api/profile/cv-library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) });
  });

  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "test@example.com", full_name: "Test User", is_verified: true },
        profile: { id: 1, user_id: 1, avatar: null },
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

  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });

  await page.goto("/dashboard");

  // Nothing counts as a CV → the dashboard renders its fully-empty state
  // instead of the CV card (an email-prefilled draft must NOT count).
  await expect(
    page.getByRole("heading", { name: /bereit für deine erste bewerbung/i })
  ).toBeVisible();
  await expect(page.getByText("Lebenslauf bereit")).not.toBeVisible();
});
