// axe-core audit of the public routes of the preview build.
// Authenticated routes are covered separately by axe-auth.spec.js.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password?token=x",
  "/verify-email?token=x",
  "/terms",
  "/privacy",
  "/impressum",
  "/contact",
  "/unsubscribe?token=x",
];

test.describe.configure({ mode: "serial" });

/**
 * Wait for fonts + mount animations to settle before analyzing. The landing
 * page fades `.lv5-reveal` blocks in over 0.6s (+ up to 0.32s delay) and the
 * dashboard pops numbers via `ja-num-pop`; axe can flag phantom
 * color-contrast violations on elements it catches mid-fade (blended
 * opacity), so the audit must run on a fully static page.
 */
async function waitForSettled(page) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1500);
}

for (const route of PUBLIC_ROUTES) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await waitForSettled(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    // Report violations compactly; fail on serious/critical only.
    const bad = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    );
    for (const v of results.violations) {
      const nodes = v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ");
      console.log(`[${v.impact}] ${v.id} (${route}): ${nodes}`);
    }
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
  });
}
