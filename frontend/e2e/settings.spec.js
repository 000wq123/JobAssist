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
      usage: [],
      plan: "max",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
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
  // Boot also lists jobs, alerts and resumes; mock them so no real 401 can
  // log us out.
  await page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/job-alerts/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ alerts: [] }) });
  });
  await page.route("**/api/resume/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
});

test("settings save sends profile updates", async ({ page }) => {
  let profileSaved = false;

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
        profile: { avatar: null },
        resumes: [],
        resumes_total: 0,
        jobs_total: 0,
        jobs_by_status: {},
        usage: [],
        plan: "max",
      }),
    });
  });

  await page.route("**/api/settings/profile", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          desired_locations: ["Wien"],
          salary_min: 30,
          salary_max: 50,
          job_types: ["Vollzeit"],
          industries: ["Technik/IT"],
          experience_level: "Mit Erfahrung",
          is_open_to_relocation: false,
          avatar: null,
        }),
      });
      return;
    }

    profileSaved = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: route.request().postData() || "{}",
    });
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: /^Speichern$/i }).first().click();

  await expect.poll(() => profileSaved).toBe(true);
});

test("settings delete-account flow redirects to login", async ({ page }) => {
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
        profile: { avatar: null },
        resumes: [],
        resumes_total: 0,
        jobs_total: 0,
        jobs_by_status: {},
        usage: [],
        plan: "max",
      }),
    });
  });

  await page.route("**/api/settings/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        desired_locations: [],
        salary_min: null,
        salary_max: null,
        job_types: [],
        industries: [],
        experience_level: "",
        is_open_to_relocation: false,
        avatar: null,
      }),
    });
  });

  await page.route("**/api/settings/preferences", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        currency: "EUR",
        location: "Österreich",
        language: "de",
      }),
    });
  });

  await page.route("**/api/auth/delete-account", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "deleted" }),
    });
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: /^Konto löschen$/i }).first().click();
  await page.getByPlaceholder(/aktuelles passwort/i).fill("secret123");
  await page.getByRole("button", { name: /unwiderruflich löschen/i }).click();

  await expect(page).toHaveURL(/\/login$/);
});
