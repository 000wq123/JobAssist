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

test("job detail can generate interview preparation", async ({ page }) => {
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

  await page.route("**/api/resume/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: 7, filename: "resume.pdf" }]),
    });
  });

  await page.route("**/api/jobs/123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        url: "https://example.com/jobs/qa",
        match_score: null,
        match_feedback: null,
        cover_letter: null,
        interview_qa: null,
        research_data: null,
      }),
    });
  });

  await page.route("**/api/jobs/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 123,
          company: "JobAssist",
          role: "QA Engineer",
          description: "Teste Produktqualität und Nutzerflüsse.",
          url: "https://example.com/jobs/qa",
        },
      ]),
    });
  });

  await page.route("**/api/interview/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        interview_qa: JSON.stringify([
          {
            question: "Wie strukturierst du einen Regressionstest?",
            type: "technical",
            answer: "Ich priorisiere Kernflüsse und risikoreiche Bereiche.",
            tip: "Nenne ein konkretes Beispiel aus einem Projekt.",
          },
        ]),
      }),
    });
  });

  await page.goto("/jobs/123");

  const actionButtons = page.locator("div.animate-slide-up.mb-8.flex.flex-wrap.gap-3 button");
  await actionButtons.nth(2).click();

  await expect(page.getByText(/wie strukturierst du einen regressionstest/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /q1/i })).toBeVisible();
});
