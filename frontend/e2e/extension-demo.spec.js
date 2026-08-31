import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("jobassist_cookie_consent", "necessary");
  });
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Not authenticated" }) });
  });
});

test("public extension demo exposes a safe no-login application flow", async ({ page }) => {
  await page.goto("/extension-demo");

  const start = page.getByRole("link", { name: /Demo starten/i });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute("href", "/extension-demo?form=1");
  await expect(start).toHaveAttribute("data-jobassist-apply", "");
  await expect(start).toHaveAttribute("data-job-title", "Junior Projektassistenz");
  await expect(start).toHaveAttribute("data-job-assist-url", "/extension-demo");

  await page.goto("/extension-demo?form=1");
  await expect(page.getByRole("heading", { name: "Junior Projektassistenz" })).toBeVisible();
  await expect(page.getByLabel("Vorname")).toBeVisible();
  await expect(page.getByLabel("Anschreiben")).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo nicht absenden" })).toBeVisible();
});
