import { expect, test } from "@playwright/test";

function seedAuthenticatedState() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
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
  await page.route("**/api/proxy/logo/best**", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-access-token");
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e30613"/><text x="128" y="150" text-anchor="middle" fill="white" font-size="72">JA</text></svg>',
    });
  });
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

  let searchUrl = "";
  let savedPayload = null;

  await page.route("**/api/jobs/search/custom**", async (route) => {
    searchUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [
          {
            source_id: "job-1",
            title: "QA Engineer",
            company: "JobAssist",
            location: "Wien",
            description: "Teste Produktqualität und Nutzerflüsse.",
            full_url: "https://example.com/jobs/qa",
            source: "Adzuna",
            job_type: "Praktikum",
          },
        ],
      }),
    });
  });

  await page.route("**/api/jobs/", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    savedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: 42, ...savedPayload, status: "bookmarked" }),
    });
  });

  await page.goto("/jobs?tab=finden");

  // Wait for the page to load and the search input to appear
  await page.waitForLoadState("networkidle");
  const searchInput = page.getByPlaceholder(/Stichwort/i);
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /Weitere Filter/i })).toBeVisible();
  await searchInput.fill("QA Engineer");
  await page.getByLabel("Stadt filtern").fill("Wien");
  
  // Click the Suchen button
  await page.getByRole("button", { name: /^Suchen$/i }).click();

  // Wait for results to appear
  await expect(page.getByText("QA Engineer")).toBeVisible({ timeout: 10000 });
  expect(new URL(searchUrl).searchParams.get("location")).toBe("Wien");
  await expect(page.getByText("Gefunden auf Adzuna")).toBeVisible();
  await expect(page.getByRole("link", { name: /Original/i })).toHaveAttribute("href", "https://example.com/jobs/qa");
  await expect(page.locator("img[data-company-logo]")).toHaveCount(1);

  await page.getByRole("button", { name: "Bewerbung vorbereiten" }).click();
  await expect.poll(() => savedPayload?.source).toBe("Adzuna");
  expect(savedPayload.location).toBe("Wien");
  expect(savedPayload.source_id).toBe("job-1");
  await expect(page).toHaveURL(/\/jobs\/42$/);
});

test("pipeline row menu changes status and detail page can delete", async ({ page }) => {
  const testJob = {
    id: 7,
    company: "Hopf und Partner",
    role: "Lagermitarbeiter",
    url: "https://example.com/jobs/lager",
    status: "bookmarked",
    category: "samstagsjob",
    match_score: null,
    deadline: null,
    location: "Graz",
    job_type: "Teilzeit",
    salary_text: "12,50 € / h",
    source: "Adzuna",
    posted_at: null,
    expires_at: null,
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
  };
  let currentStatus = testJob.status;
  let deleted = false;
  let deleteRequested = false;
  let releaseDelete;
  const deleteResponse = new Promise((resolve) => { releaseDelete = resolve; });
  const statusUpdates = [];

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "test-access-token" }),
    });
  });
  await page.route("**/api/profile/cv-library", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entries: [] }) });
  });
  await page.route("**/api/init", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        me: { id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true },
        profile: {},
        resumes: [],
        resumes_total: 0,
        jobs_total: 1,
        jobs_by_status: { bookmarked: 1 },
        usage: [{ feature: "job_search", used: 0, limit: 5, remaining: 5 }],
        plan: "max",
      }),
    });
  });
  await page.route("**/api/resume/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/jobs/response-baselines", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ median_days: 8, p25_days: 5, p75_days: 14, sample_size: 0 }),
    });
  });
  await page.route("**/api/kv-wages/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        category: "samstagsjob",
        region: "AT",
        year: 2025,
        kollektivvertrag: "KV Handel",
        hourly_min: 12.09,
        hourly_max: 14.5,
        source_url: null,
      }),
    });
  });

  // List endpoint — reflects live status/deleted state so reloads stay truthful.
  await page.route(/\/api\/jobs\/\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: deleted ? [] : [{ ...testJob, status: currentStatus }],
        total: deleted ? 0 : 1,
        page: 1,
        page_size: 100,
        pages: 1,
      }),
    });
  });

  // Status PATCH
  await page.route("**/api/jobs/7/status", async (route) => {
    const body = route.request().postDataJSON();
    currentStatus = body.status;
    statusUpdates.push(body.status);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...testJob, status: currentStatus }),
    });
  });

  // Detail GET + DELETE — deletion flips the list mock to empty.
  await page.route("**/api/jobs/7", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...testJob,
          status: currentStatus,
          description: "Warenannahme, Kommissionierung und Lagerpflege.",
          notes: null,
          source_id: "lager-7",
          applied_at: null,
          match_score: null,
          match_feedback: null,
          cover_letter: null,
          interview_qa: null,
          research_data: null,
        }),
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      deleteRequested = true;
      await deleteResponse;
      deleted = true;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.goto("/jobs");
  await expect(page.getByLabel("Status filtern")).toBeVisible();

  // Row renders with its current bucket badge
  const row = page.getByRole("listitem").filter({ hasText: "Lagermitarbeiter" });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.getByText("Gemerkt")).toBeVisible();

  // Open the row menu and switch status to Beworben
  await row.getByRole("button", { name: /Status ändern/i }).click();
  await page.getByRole("button", { name: "Beworben", exact: true }).click();

  await expect.poll(() => statusUpdates).toEqual(["applied"]);
  // Badge flips after reload
  await expect(row.getByText("Beworben")).toBeVisible({ timeout: 10000 });

  // The UI-only "archived" bucket must be translated to backend "rejected".
  await row.getByRole("button", { name: /Status ändern/i }).click();
  await page.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect.poll(() => statusUpdates).toEqual(["applied", "rejected"]);
  await expect(row.getByText("Erledigt")).toBeVisible({ timeout: 10000 });

  // Detail page delete flow
  await row.click();
  await expect(page).toHaveURL(/\/jobs\/7$/);
  await expect(row).toHaveAttribute("aria-current", "true");
  await expect(page.getByText("Gefunden auf Adzuna")).toBeVisible();
  await expect(page.getByText("Wann kann ich mit einer Antwort rechnen?")).toBeVisible();
  await page.getByRole("button", { name: "Mehr Aktionen" }).click();
  await page.getByRole("menuitem", { name: /Stelle löschen/i }).click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();

  // The UI updates before the deliberately delayed backend response arrives.
  await expect.poll(() => deleteRequested).toBe(true);
  expect(deleted).toBe(false);
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByText("Noch keine Stellen gespeichert")).toBeVisible({ timeout: 10000 });
  releaseDelete();
  await expect.poll(() => deleted).toBe(true);
});
