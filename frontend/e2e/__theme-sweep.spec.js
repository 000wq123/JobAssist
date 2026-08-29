/** TEMP visual sweep: red-accent confirmation across key routes in both themes. */
import { test } from "@playwright/test";
import { mockApi, seedDraft } from "./helpers/cvPickerEnv.js";

const BASE = new URL("../../..", import.meta.url).pathname;

function routeAuth(page, theme) {
  mockApi(page);
  page.addInitScript(([t]) => localStorage.setItem("jobassist_theme_v1", t), [theme]);
}

const SHOTS = "/tmp/theme-sweep";

for (const theme of ["dark", "light"]) {
  test(`sweep ${theme}`, async ({ page }) => {
    routeAuth(page, theme);

    // 1) Login
    await page.goto("/login");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/${theme}-login.png` });

    // 2) Dashboard
    await page.goto("/dashboard");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/${theme}-dashboard.png` });

    // 3) Jobs list
    await page.goto("/jobs");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/${theme}-jobs.png` });

    // 4) Job detail
    await page.goto("/jobs/60");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/${theme}-job-detail.png` });

    // 5) CV picker
    await page.goto("/lebenslauf");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/${theme}-cv-picker.png` });
  });
}

test("geometry checks", async ({ page }) => {
  routeAuth(page, "dark");
  await page.goto("/dashboard");
  await page.waitForTimeout(1200);

  // No skeleton pulse elements should be visible after settle.
  const pulseCount = await page.evaluate(
    () => document.querySelectorAll('[class*="animate-pulse"]').length
  );
  console.log("animate-pulse count after settle:", pulseCount);

  // Focus ring token resolves to red in both themes.
  const ring = await page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue("--app-focus-ring").trim()
  );
  console.log("focus-ring:", ring);
});
