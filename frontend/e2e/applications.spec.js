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

test("applications list can update status and autosave notes", async ({ page }) => {
  let savedNotes = "";
  let currentStatus = "bookmarked";

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

  await page.route("**/api/jobs/pipeline/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bookmarked: currentStatus === "bookmarked" ? 1 : 0,
        applied: currentStatus === "applied" ? 1 : 0,
        interviewing: 0,
        offered: 0,
        rejected: 0,
      }),
    });
  });

  await page.route("**/api/jobs/", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 55,
          company: "JobAssist",
          role: "QA Engineer",
          description: "Teste Produktqualität und Nutzerflüsse.",
          status: currentStatus,
          notes: savedNotes,
          deadline: null,
          url: "https://example.com/jobs/qa",
          match_score: null,
        },
      ]),
    });
  });

  await page.route("**/api/jobs/55/status", async (route) => {
    currentStatus = route.request().postDataJSON().status;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 55,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: currentStatus,
        notes: savedNotes,
        deadline: null,
        url: "https://example.com/jobs/qa",
        match_score: null,
      }),
    });
  });

  await page.route("**/api/jobs/55/notes", async (route) => {
    savedNotes = route.request().postDataJSON().notes;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 55,
        company: "JobAssist",
        role: "QA Engineer",
        description: "Teste Produktqualität und Nutzerflüsse.",
        status: currentStatus,
        notes: savedNotes,
        deadline: null,
        url: "https://example.com/jobs/qa",
        match_score: null,
      }),
    });
  });

  await page.goto("/jobs");
  await expect(page.getByText("QA Engineer")).toBeVisible();

  const card = page.locator("div.overflow-hidden.rounded-xl.border").filter({ hasText: "QA Engineer" }).first();
  await page.getByRole("button", { name: /als beworben markieren/i }).click();
  await expect(card.locator("span").filter({ hasText: /^Beworben$/ })).toBeVisible();

  const notes = page.getByPlaceholder(/persönliche notizen/i);
  await notes.fill("Sehr interessante QA-Rolle");
  await expect(page.getByText(/wird gespeichert/i)).toBeVisible();
  await expect.poll(() => savedNotes).toBe("Sehr interessante QA-Rolle");
});
