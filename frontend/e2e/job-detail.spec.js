import { expect, test } from "@playwright/test";

function seedAuthenticatedState() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
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

test("job detail can generate a cover letter", async ({ page }) => {
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

  let coverLetterGenerated = false;
  let releaseStatusUpdate;
  const statusUpdateGate = new Promise((resolve) => { releaseStatusUpdate = resolve; });

  await page.route("**/api/jobs/123/status", async (route) => {
    await statusUpdateGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        company: "JobAssist",
        role: "QA Engineer",
        location: "Wien, Österreich",
        source: "karriere.at",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: "offered",
        notes: "",
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

  // Mock the single job endpoint (used by both JobDetailPage and the list page)
  await page.route(/\/api\/jobs\/123(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        company: "JobAssist",
        role: "QA Engineer",
        location: "Wien, Österreich",
        source: "karriere.at",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: "bookmarked",
        notes: "",
        deadline: null,
        url: "https://example.com/jobs/qa",
        match_score: null,
        match_feedback: null,
        cover_letter: coverLetterGenerated
          ? "Sehr geehrte Damen und Herren,\n\nich bewerbe mich als QA Engineer."
          : null,
        interview_qa: null,
        research_data: null,
      }),
    });
  });

  await page.route("**/api/cover-letter/generate", async (route) => {
    coverLetterGenerated = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        cover_letter: "Sehr geehrte Damen und Herren,\n\nich bewerbe mich als QA Engineer.",
      }),
    });
  });

  await page.goto("/jobs/123");

  // The detail status changes before the deliberately delayed API responds.
  await page.getByRole("button", { name: "Status ändern: Gemerkt" }).click();
  await page.getByRole("menuitem", { name: "Angebot", exact: true }).click();
  await expect(page.getByRole("button", { name: "Status ändern: Angebot" })).toBeVisible();
  const statusResponse = page.waitForResponse((response) => response.url().includes("/api/jobs/123/status") && response.status() === 200);
  releaseStatusUpdate();
  await statusResponse;

  await expect(page.getByText(/Geschätzte Anfahrt/i)).toHaveCount(0);
  await page.getByRole("button", { name: /Route ab aktuellem Standort/i }).click();
  await expect(page.getByRole("menuitem", { name: /Google Maps/i })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=Wien%2C%20%C3%96sterreich",
  );
  await expect(page.getByRole("menuitem", { name: /Apple Karten/i })).toHaveAttribute(
    "href",
    "https://maps.apple.com/?daddr=Wien%2C%20%C3%96sterreich",
  );
  await expect(page.getByRole("menuitem", { name: /Waze/i })).toHaveAttribute(
    "href",
    "https://www.waze.com/ul?q=Wien%2C%20%C3%96sterreich&navigate=yes",
  );
  await page.keyboard.press("Escape");

  // The primary CTA must still work without the extension. Its data contract lets
  // the extension carry this job into the employer's application page.
  const applicationLink = page.getByRole("link", { name: /jetzt bewerben/i });
  await expect(applicationLink).toBeVisible({ timeout: 10000 });
  await expect(applicationLink).toHaveAttribute("href", "https://example.com/jobs/qa");
  await expect(applicationLink).toHaveAttribute("data-jobassist-apply", "");
  await expect(applicationLink).toHaveAttribute("data-job-title", "QA Engineer");
  await expect(applicationLink).toHaveAttribute("data-job-company", "JobAssist");

  // Cover-letter generation remains available as a separate preparation step.
  await page.getByRole("button", { name: /anschreiben erstellen/i }).click();

  // After generation, the button should change to "Anschreiben ansehen"
  await expect(page.getByRole("button", { name: /anschreiben ansehen/i })).toBeVisible({ timeout: 15000 });
  await expect(coverLetterGenerated).toBeTruthy();
});
