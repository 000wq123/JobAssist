import { expect, test } from "@playwright/test";

function seedAuthenticatedState() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem("cookie_consent_v1", "accepted");
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
      me: { id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true },
      profile: {},
      resumes: [],
      resumes_total: 0,
      jobs_total: 0,
      jobs_by_status: {},
      usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
      plan: "max",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
});

test("job alerts can be created and deleted in the UI", async ({ page }) => {
  let alerts = [
    {
      id: 1,
      keywords: "Frontend Engineer",
      location: "Wien",
      job_type: "Full-time",
      email: "qa@jobassist.tech",
      frequency: "daily",
      is_active: true,
      last_sent_at: null,
      updated_at: new Date().toISOString(),
    },
  ];
  let nextId = 2;

  // Auth refresh
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "x", refresh_token: "x" }) });
  });

  // Init
  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true },
        profile: {},
        resumes: [],
        resumes_total: 0,
        jobs_total: 0,
        jobs_by_status: {},
        usage: [{ feature: "job_alerts", used: alerts.length, limit: 5, remaining: 5 - alerts.length }],
        plan: "max",
      }),
    });
  });

  // Job-alerts — handle GET, POST, DELETE all on the same path
  await page.route("**/api/job-alerts/**", async (route, request) => {
    const method = request.method();
    const url = route.request().url();

    if (method === "GET" && url.endsWith("/api/job-alerts/")) {
      console.log(`GET alerts: ${alerts.length} items, ${alerts.map(a => a.id).join(",")}`);

      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts }) });
      return;
    }
    if (method === "POST" && url.endsWith("/api/job-alerts/")) {
      const body = request.postDataJSON();
      const created = { id: nextId++, ...body, is_active: true, last_sent_at: null, updated_at: new Date().toISOString() };
      alerts.push(created);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(created) });
      return;
    }
    if (method === "DELETE") {
      const parts = url.split("/");
      const id = parseInt(parts[parts.length - 1] || parts[parts.length - 2] || "0", 10);
      // Filter out the deleted alert BEFORE fulfilling, so the subsequent GET sees the update
      const before = alerts.length;
      alerts = alerts.filter((a) => a.id !== id);
      console.log(`DELETE id=${id}: ${before}→${alerts.length} alerts remaining`);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      return;
    }
    await route.fulfill({ status: 404 });
  });

  await page.goto("/job-alerts");

  // Wait for the initial alert
  await expect(page.getByText("Frontend Engineer")).toBeVisible({ timeout: 10000 });

  // Click "Neuer Alert"
  await page.getByRole("button", { name: /Neuer Alert/i }).click();

  // Wait for modal heading
  await expect(page.getByRole("heading", { name: "Neuer Alert" })).toBeVisible({ timeout: 5000 });

  // Fill keywords
  const input = page.getByPlaceholder(/Frontend Entwickler/i);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill("QA Alert");

  // Submit
  await page.getByRole("button", { name: /^Alert erstellen$/i }).click();

  // Wait for new alert to appear
  await expect(page.getByText("QA Alert")).toBeVisible({ timeout: 5000 });

  // Scroll the created alert into view, hover, and open "Mehr" menu
  const createdRow = page.locator("div.rounded-xl").filter({ hasText: "QA Alert" }).first();
  await createdRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await createdRow.hover();
  await createdRow.getByRole("button", { name: /Mehr/i }).click();

  // Click "Löschen" — post-menu-open the button should be in viewport now
  await page.getByRole("button", { name: /Löschen/i }).click();

  // Alert should disappear after refetch
  await expect(page.getByText("QA Alert")).not.toBeVisible({ timeout: 5000 });
});