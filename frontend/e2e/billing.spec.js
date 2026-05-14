import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
        usage: [
          { feature: "job_search", used: 2, limit: 5, remaining: 3 },
          { feature: "cover_letter", used: 1, limit: 10, remaining: 9 },
        ],
        plan: "basic",
      })
    );
  });
});

test("billing page renders usage and clears checkout query params", async ({ page }) => {
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
        usage: [
          { feature: "job_search", used: 2, limit: 5, remaining: 3 },
          { feature: "cover_letter", used: 1, limit: 10, remaining: 9 },
        ],
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
        usage: [
          { feature: "job_search", used: 2, limit: 5, remaining: 3 },
          { feature: "cover_letter", used: 1, limit: 10, remaining: 9 },
        ],
      }),
    });
  });

  await page.goto("/billing?success=true#plan");

  await expect(page.getByRole("heading", { name: /abrechnung/i })).toBeVisible();
  await expect(page.getByText(/jobsuchen \(heute\)/i)).toBeVisible();
  await expect(page.getByText(/2 \/ 5/i)).toBeVisible();
  await expect(page).toHaveURL(/\/billing#plan$/);
});

test("pricing page starts checkout for a paid plan", async ({ page }) => {
  let checkoutRequested = false;

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
        usage: [],
        plan: "basic",
      }),
    });
  });

  await page.route("**/api/billing/create-checkout-session", async (route) => {
    checkoutRequested = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkout_url: "https://checkout.example.com/session/pro",
      }),
    });
  });

  await page.goto("/pricing");
  await page.getByRole("button", { name: /jetzt upgraden/i }).first().click();
  await expect.poll(() => checkoutRequested).toBe(true);
});
