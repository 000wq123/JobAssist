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
        alert_refresh_count: 0,
        alert_refresh_window_start: null,
      },
      profile: {},
      usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
      plan: "basic",
    })
  );
  localStorage.setItem(
    "billing",
    JSON.stringify({
      subscription: { plan: "basic", current_period_end: null },
      usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
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
      updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

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
          alert_refresh_count: 0,
          alert_refresh_window_start: null,
        },
        profile: {},
        usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
        plan: "basic",
      }),
    });
  });

  await page.route("**/api/billing/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscription: { plan: "basic", current_period_end: null },
        usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
      }),
    });
  });

  await page.route("**/api/job-alerts/", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(alerts),
      });
      return;
    }

    if (method === "POST") {
      const data = route.request().postDataJSON();
      const created = {
        id: 2,
        ...data,
        is_active: true,
        last_sent_at: null,
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      };
      alerts = [created, ...alerts];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
    }
  });

  await page.route("**/api/job-alerts/2", async (route) => {
    if (route.request().method() === "DELETE") {
      alerts = alerts.filter((alert) => alert.id !== 2);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/job-alerts");
  await page.getByRole("button", { name: /neuer alert/i }).click();
  await page.getByPlaceholder(/software engineer/i).fill("QA Alert");
  await page.getByRole("button", { name: /^alert erstellen$/i }).click();

  await expect(page.getByText("QA Alert")).toBeVisible();

  const createdCard = page.locator("div.rounded-xl.border.p-5").filter({ hasText: "QA Alert" }).first();
  await createdCard.locator("button").nth(3).click();

  await expect(page.getByText("QA Alert")).toHaveCount(0);
});

test("run-now updates the shared refresh counter", async ({ page }) => {
  let refreshCount = 0;

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
          alert_refresh_count: refreshCount,
          alert_refresh_window_start: null,
        },
        profile: {},
        usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
        plan: "basic",
      }),
    });
  });

  await page.route("**/api/billing/overview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscription: { plan: "basic", current_period_end: null },
        usage: [{ feature: "job_alerts", used: 0, limit: 2, remaining: 2 }],
      }),
    });
  });

  await page.route("**/api/job-alerts/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 1,
          keywords: "Frontend Engineer",
          location: "Wien",
          job_type: "Full-time",
          email: "qa@jobassist.tech",
          frequency: "daily",
          is_active: true,
          last_sent_at: null,
          updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
      ]),
    });
  });

  await page.route("**/api/job-alerts/1/run", async (route) => {
    refreshCount = 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "ok",
        refreshes_used: 1,
        refreshes_remaining: 2,
      }),
    });
  });

  await page.goto("/job-alerts");
  const card = page.locator("div").filter({ hasText: "Frontend Engineer" }).first();
  await card.locator('button[title="Jetzt ausführen"]').click();

  await expect(page.getByText(/2 Aktualisierung(en)? heute/i)).toBeVisible();
});
