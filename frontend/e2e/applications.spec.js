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
  await page.route("**/api/proxy/logo/best**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e30613"/></svg>',
    });
  });
});

test("job detail can update status, deadline, link, and notes", async ({ page }) => {
  let currentStatus = "bookmarked";
  let savedNotes = "";
  let savedDeadline = "2026-09-01T00:00:00Z";
  let savedUrl = "https://example.com/jobs/qa";
  let notesAttempts = 0;

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
        deadline: savedDeadline,
        url: savedUrl,
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
        deadline: savedDeadline,
        url: savedUrl,
      }),
    });
  });

  await page.route(/\/api\/jobs\/55\/notes\/?$/, async (route) => {
    notesAttempts += 1;
    if (notesAttempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Temporärer Speicherfehler" }),
      });
      return;
    }
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
        deadline: savedDeadline,
        url: savedUrl,
      }),
    });
  });

  await page.route(/\/api\/jobs\/55\/deadline\/?$/, async (route) => {
    savedDeadline = route.request().postDataJSON().deadline;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 55, deadline: savedDeadline }),
    });
  });

  await page.route(/\/api\/jobs\/55\/url\/?$/, async (route) => {
    savedUrl = route.request().postDataJSON().url;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 55, url: savedUrl }),
    });
  });

  await page.goto("/jobs/55");
  await expect(page.getByRole("heading", { name: "QA Engineer" })).toBeVisible();

  // Change status to "Beworben" via the desktop status dropdown.
  await page.getByRole("button", { name: /status ändern/i }).click();
  await page.getByRole("menuitem", { name: /beworben/i }).click();
  await expect.poll(() => currentStatus).toBe("applied");

  // Open the combined editor and verify ISO deadlines are date-input safe.
  await page.getByRole("button", { name: "Mehr Aktionen" }).click();
  await page.getByRole("menuitem", { name: "Bearbeiten" }).click();
  await expect(page.getByLabel("Frist")).toHaveValue("2026-09-01");
  await page.getByLabel("Frist").fill("2026-09-15");
  await page.getByLabel("Original-Link").fill("https://example.com/jobs/qa-updated");
  await page.getByLabel("Notizen").fill("Sehr interessante QA-Rolle");
  await page.getByRole("button", { name: /^Speichern$/i, exact: true }).click();

  // A failed request must keep the editor and the user's input intact.
  await expect.poll(() => notesAttempts).toBe(1);
  await expect(page.getByRole("dialog", { name: "Bearbeiten" })).toBeVisible();
  await expect(page.getByLabel("Notizen")).toHaveValue("Sehr interessante QA-Rolle");
  await page.getByRole("button", { name: /^Speichern$/i, exact: true }).click();

  await expect.poll(() => savedNotes).toBe("Sehr interessante QA-Rolle");
  await expect.poll(() => savedDeadline).toBe("2026-09-15");
  await expect.poll(() => savedUrl).toBe("https://example.com/jobs/qa-updated");
  await expect(page.getByRole("dialog", { name: "Bearbeiten" })).not.toBeVisible();
  await expect(page.getByText("Sehr interessante QA-Rolle")).toBeVisible();
});
