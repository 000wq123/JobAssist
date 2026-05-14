import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /willkommen zurück/i })).toBeVisible();
  await expect(page.getByPlaceholder(/du@beispiel\.at/i)).toBeVisible();
  await expect(page.getByPlaceholder(/dein passwort eingeben/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
});
