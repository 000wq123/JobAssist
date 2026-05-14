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
      usage: [{ feature: "job_search", used: 0, limit: 5, remaining: 5 }],
      plan: "basic",
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seedAuthenticatedState);
});

test("jobs page can search and save a result into applications", async ({ page }) => {
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
        usage: [{ feature: "job_search", used: 0, limit: 5, remaining: 5 }],
        plan: "basic",
      }),
    });
  });

  await page.route("**/api/resume/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  let savedJobs = [];

  await page.route("**/api/jobs/", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(savedJobs),
      });
      return;
    }

    const data = route.request().postDataJSON();
    const created = {
      id: 99,
      company: data.company,
      role: data.role,
      description: data.description,
      url: data.url,
    };
    savedJobs = [created];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(created),
    });
  });

  await page.route("**/api/jobs/search/custom**", async (route) => {
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
          },
        ],
      }),
    });
  });

  await page.goto("/jobs");
  await page.getByRole("button", { name: /stellen finden/i }).click();
  await page.getByRole("button", { name: /^stellen suchen$/i }).click();
  await page.getByRole("button", { name: /eigene suche/i }).click();
  await page.getByPlaceholder(/verkauf, gastro, it, praktikum/i).fill("QA Engineer");
  await page.getByRole("button", { name: /stellen suchen/i }).last().click();

  await expect(page.getByText("QA Engineer")).toBeVisible();
  await page.getByRole("button", { name: /qa engineer.*jobassist.*wien/i }).click();
  await page.getByRole("button", { name: /in bewerbungen speichern/i }).click();
  await expect(page.getByRole("button", { name: /gespeichert/i })).toBeVisible();
});
