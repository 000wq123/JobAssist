import { expect, test } from "@playwright/test";

function seedAuthenticatedState() {
  localStorage.setItem("access_token", "test-access-token");
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
      usage: [],
      plan: "basic",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
});

test("settings save sends both preferences and profile updates", async ({ page }) => {
  let profileSaved = false;
  let preferencesSaved = false;

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
        usage: [],
        plan: "basic",
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

  await page.route("**/api/settings/preferences", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          currency: "EUR",
          location: "Österreich",
          language: "de",
        }),
      });
      return;
    }

    preferencesSaved = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: route.request().postData() || "{}",
    });
  });

  await page.goto("/settings");
  await page.locator('button[type="submit"]').click();

  await expect.poll(() => profileSaved).toBe(true);
  await expect.poll(() => preferencesSaved).toBe(true);
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
        usage: [],
        plan: "basic",
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
  await page.getByRole("button", { name: /konto .*löschen/i }).click();
  await page.getByPlaceholder(/dein aktuelles passwort/i).fill("secret123");
  await page.getByRole("button", { name: /unwiderruflich löschen/i }).click();

  await expect(page).toHaveURL(/\/login$/);
});
