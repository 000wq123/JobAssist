import { expect, test } from "@playwright/test";

/**
 * Regression: "it says I'm not logged in but it shows my saved jobs".
 *
 * When the refresh cookie is gone/revoked (401/403) but a stale access token
 * + cached bootstrap/SWR data still live in sessionStorage, the app used to
 * boot as "logged in": BootstrapContext/useFetch render the cached dashboard
 * (saved jobs, CVs) immediately, and the dead session was only detected on
 * the *next* data request (401 → refresh → fail → redirect).
 *
 * The boot refresh failure must now clear the session + caches on its own —
 * even if no data endpoint 401s — so the app lands on /login without
 * flashing cached user data. Data endpoints are mocked to 200-empty here to
 * isolate the boot-refresh path (the interceptor never fires).
 */
function seedStaleSession() {
  sessionStorage.setItem("ja:access_token", "stale-access-token");
  sessionStorage.setItem(
    "ja:init_cache",
    JSON.stringify({
      me: { id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true },
      profile: { avatar: null },
      resumes: [{ id: 1, filename: "cv.pdf", created_at: "2026-01-01" }],
      resumes_total: 1,
      cv: { has_content: true, completion_pct: 80, updated_at: null },
      jobs_total: 3,
      jobs_by_status: { bookmarked: 3 },
      plan: "max",
      usage: [],
    })
  );
  sessionStorage.setItem(
    "ja:swr_cache",
    JSON.stringify([
      [
        "jobs:list",
        { data: [{ id: 1, title: "Stale Saved Job", status: "bookmarked" }], ts: Date.now() },
      ],
    ])
  );
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ id: 1, email: "qa@jobassist.tech", full_name: "QA User" })
  );
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
}

test("boot refresh failure alone logs out a stale session and wipes caches", async ({ page }) => {
  await page.addInitScript(seedStaleSession);

  // Refresh cookie is dead → the boot refresh returns 401.
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Invalid or expired refresh token" }),
    });
  });

  // Data endpoints return 200-empty so the 401 interceptor never fires —
  // the boot refresh failure must be the thing that logs the user out.
  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true },
        profile: { avatar: null },
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
  await page.route("**/api/jobs/?*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });
  await page.route("**/api/resume/*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/profile/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/dashboard");

  // The app must end on the login page, not a cached dashboard.
  await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });

  // The stale session + cached user data must be gone from storage.
  // (`auth_user` is a display-only mirror — the access token is the auth
  // gate — so it's not asserted here; a mocked /init can legitimately race
  // the logout and re-write it, which never happens with a real dead token.)
  const leftovers = await page.evaluate(() => ({
    token: sessionStorage.getItem("ja:access_token"),
    init: sessionStorage.getItem("ja:init_cache"),
    swr: sessionStorage.getItem("ja:swr_cache"),
  }));
  expect(leftovers).toEqual({ token: null, init: null, swr: null });
});
