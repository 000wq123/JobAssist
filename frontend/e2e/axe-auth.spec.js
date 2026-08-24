// Authenticated-route axe audit. Mocks the API surface (same pattern as the
// smoke spec) so protected pages render, then runs axe-core wcag2a/2aa.
// Fails on serious/critical violations.
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function mockApi(page) {
  // Bootstrap payload — one job in each bucket + one resume + alerts + usage.
  const job = (id, status) => ({
    id, status,
    role: "Entwickler:in", company: `Firma ${id}`,
    location: "Graz", category: "IT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deadline: null, expires_at: null, salary_text: null,
    url: "https://example.com/job",
  });

  page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "test@example.com", full_name: "Test User", is_verified: true },
        profile: { id: 1, user_id: 1, avatar: null },
        resumes: [{ id: 7, filename: "lebenslauf.pdf", created_at: new Date().toISOString() }],
        resumes_total: 1,
        jobs_total: 3,
        jobs_by_status: { bookmarked: 1, applied: 1, interviewing: 1 },
        plan: "max",
        usage: [],
      }),
    });
  });

  page.route("**/api/jobs**", async (route) => {
    if (!route.request().url().includes("/api/jobs") || route.request().method() !== "GET") {
      return route.continue();
    }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ items: [job(1, "bookmarked"), job(2, "applied"), job(3, "interviewing")] }),
    });
  });

  page.route("**/api/job-alerts**", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        alerts: [{ id: 5, keywords: "IT", is_active: true }],
        daily_manual_run_count: 0, daily_manual_run_limit: -1,
      }),
    });
  });

  page.route("**/api/resumes**", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: 7, filename: "lebenslauf.pdf", parsed_status: "done" }]),
    });
  });

  page.route("**/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ id: 1, email: "test@example.com", full_name: "Test User", is_verified: true }),
    });
  });
}

// Seed a session token before any app code runs.
async function login(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("ja:access_token", "fake-token-for-audit");
    localStorage.setItem("auth_user", JSON.stringify({ full_name: "Test User", email: "test@example.com" }));
  });
}

const ROUTES = [
  "/dashboard",
  "/jobs",
  "/jobs?tab=finden",
  "/job-alerts",
  "/settings",
  "/lebenslauf",
];

test.describe.configure({ mode: "serial" });

for (const route of ROUTES) {
  test(`axe (auth): ${route}`, async ({ page }) => {
    await login(page);
    await mockApi(page);
    await page.goto(route, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    for (const v of results.violations) {
      const nodes = v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ");
      console.log(`[${v.impact}] ${v.id} (${route}): ${nodes}`);
      for (const n of v.nodes.slice(0, 2)) {
        console.log(`  FIX: ${(n.failureSummary || "").split("\n").slice(1).join(" | ").slice(0, 260)}`);
        console.log(`  HTML: ${n.html.slice(0, 200)}`);
      }
    }
    const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
  });
}
