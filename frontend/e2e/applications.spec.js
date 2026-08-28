import { expect, test } from "@playwright/test";

function seedAuthenticatedState() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  // Pre-accept cookie consent so the banner doesn't intercept clicks
  localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: Date.now() }));
  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      id: 1,
      email: "qa@jobassist.tech",
      full_name: "QA User",
      is_verified: true,
    })
  );
  localStorage.setItem(
    "init",
    JSON.stringify({
      me: {
        id: 1,
        email: "qa@jobassist.tech",
        full_name: "QA User",
        is_verified: true,
      },
      profile: {},
      resumes: [{ id: 7, filename: "resume.pdf" }],
      resumes_total: 1,
      jobs_total: 1,
      jobs_by_status: { bookmarked: 1 },
      usage: [],
      plan: "max",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
});

test("job detail can update status and save notes", async ({ page }) => {
  let currentStatus = "bookmarked";
  let savedNotes = "";

  // Mock auth refresh so the interceptor doesn't fire unauthenticated
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
  // Boot also lists jobs + alerts; mock them so no real 401 can log us out.
  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });

  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: {
          id: 1,
          email: "qa@jobassist.tech",
          full_name: "QA User",
          is_verified: true,
        },
        profile: {},
        resumes: [{ id: 7, filename: "resume.pdf" }],
        resumes_total: 1,
        jobs_total: 1,
        jobs_by_status: { bookmarked: 1 },
        usage: [],
        plan: "max",
      }),
    });
  });

  await page.route(/\/api\/jobs\/55\/?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 55,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: currentStatus,
        notes: savedNotes,
        deadline: null,
        url: "https://example.com/jobs/qa",
        match_score: null,
        match_feedback: null,
        cover_letter: null,
        interview_qa: null,
        research_data: null,
      }),
    });
  });

  await page.route(/\/api\/jobs\/55\/status\/?$/, async (route) => {
    currentStatus = route.request().postDataJSON().status;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 55,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: currentStatus,
        notes: savedNotes,
        deadline: null,
        url: "https://example.com/jobs/qa",
      }),
    });
  });

  await page.route(/\/api\/jobs\/55\/notes\/?$/, async (route) => {
    savedNotes = route.request().postDataJSON().notes;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 55,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: currentStatus,
        notes: savedNotes,
        deadline: null,
        url: "https://example.com/jobs/qa",
      }),
    });
  });

  await page.goto("/jobs/55");
  await expect(page.getByRole("heading", { name: "QA Engineer" })).toBeVisible();

  // Change status to "Beworben" via the desktop status dropdown.
  await page.getByRole("button", { name: /status ändern/i }).click();
  await page.getByRole("button", { name: /beworben/i }).first().click({ force: true });

  // Open the Bearbeiten sheet and save notes.
  await page.getByRole("button", { name: /notizen/i }).first().click({ force: true });
  await page.getByPlaceholder(/eigene notizen/i).fill("Sehr interessante QA-Rolle");
  await page.getByRole("button", { name: /^Speichern$/i, exact: true }).click();

  await expect.poll(() => savedNotes).toBe("Sehr interessante QA-Rolle");
});