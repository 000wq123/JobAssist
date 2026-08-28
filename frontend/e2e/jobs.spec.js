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
      resumes: [],
      resumes_total: 0,
      jobs_total: 0,
      jobs_by_status: {},
      usage: [{ feature: "job_search", used: 0, limit: 5, remaining: 5 }],
      plan: "max",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
});

test("finden page can search and see results", async ({ page }) => {
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
        resumes: [],
        resumes_total: 0,
        jobs_total: 0,
        jobs_by_status: {},
        usage: [{ feature: "job_search", used: 0, limit: 5, remaining: 5 }],
        plan: "max",
      }),
    });
  });

  // Mock saved jobs (empty) — matches the list fetch (has a query string)
  await page.route("**/api/jobs/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/resume/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  let searchCalled = false;

  await page.route("**/api/jobs/search/custom**", async (route) => {
    searchCalled = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            source_id: "job-1",
            title: "QA Engineer",
            company: "JobAssist",
            location: "Wien",
            description: "Teste Produktqualität und Nutzerflüsse.",
            full_url: "https://example.com/jobs/qa",
          },
        ],
      }),
    });
  });

  await page.goto("/jobs?tab=finden");

  // Wait for the page to load and the search input to appear
  await page.waitForLoadState("networkidle");
  const searchInput = page.getByPlaceholder(/Stichwort/i);
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill("QA Engineer");
  
  // Click the Suchen button
  await page.getByRole("button", { name: /^Suchen$/i }).click();

  // Wait for results to appear
  await expect(page.getByText("QA Engineer")).toBeVisible({ timeout: 10000 });
  await expect(searchCalled).toBeTruthy();
});