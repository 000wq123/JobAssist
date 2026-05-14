import { expect, test } from "@playwright/test";

test("register page validates required fields", async ({ page }) => {
  await page.goto("/register");

  await page.getByRole("button", { name: /konto erstellen/i }).click();

  await expect(page.getByText("E-Mail ist erforderlich")).toBeVisible();
  await expect(page.getByText("Passwort ist erforderlich")).toBeVisible();
});

test("verify email success state renders for guests", async ({ page }) => {
  await page.route("**/api/auth/verify-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "ok" }),
    });
  });

  await page.goto("/verify-email?token=test-token");

  await expect(page.getByRole("heading", { name: /e-mail bestätigt/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /zum login/i })).toBeVisible();
});

test("verify email error state renders for invalid token", async ({ page }) => {
  await page.route("**/api/auth/verify-email", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ detail: "invalid" }),
    });
  });

  await page.goto("/verify-email?token=bad-token");

  await expect(page.getByRole("heading", { name: /bestätigung fehlgeschlagen/i })).toBeVisible();
});
