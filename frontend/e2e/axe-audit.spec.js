// Throwaway audit: runs axe-core against public routes of the preview build.
// Authenticated routes are covered separately by the mocked smoke spec pattern.
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

for (const route of PUBLIC_ROUTES) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
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
