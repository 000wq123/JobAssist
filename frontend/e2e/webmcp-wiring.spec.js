import { test, expect } from "@playwright/test";

/**
 * E2E (built bundle): WebMCP is env-gated and stock Chromium lacks
 * document.modelContext → registration must be a graceful no-op that
 * never breaks app boot. Deep handler logic is covered by Vitest.
 */
test("webmcp: absent API is a no-op and does not affect boot", async ({ page }) => {
  await page.route("**/api/init", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      me: { id: 1, email: "t@gmail.com", full_name: "T User" },
      profile: {}, resumes: [], plan: "max", usage: [], jobs_total: 0, jobs_by_status: {},
    })})
  );
  await page.route("**/api/jobs**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  );

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await page.waitForTimeout(800);

  // App booted fine
  await expect(page.locator("body")).toBeVisible();
  // No modelContext in stock Chromium
  const hasMcp = await page.evaluate(() => !!document.modelContext);
  expect(hasMcp).toBe(false);
  // No uncaught page errors from the webmcp path
  expect(errors.filter((e) => e.includes("webmcp"))).toEqual([]);
});
