import { test, expect } from "@playwright/test";

/**
 * Responsive visual regression test for the public landing page.
 *
 * This spec captures full-page screenshots at multiple breakpoints and compares
 * them against committed baselines using Playwright's toHaveScreenshot.
 *
 * Guidelines for maintaining this test:
 * - Baselines are stored in e2e/__snapshots__.
 * - Run `npm run test:e2e:visual -- --update-snapshots` when the landing page
 *   design intentionally changes.
 * - Animations are disabled via reduced-motion preference so screenshots are
 *   deterministic.
 */

const VIEWPORTS = [
  { name: "mobile-sm", width: 375, height: 812, deviceScaleFactor: 2 },
  { name: "mobile-md", width: 414, height: 896, deviceScaleFactor: 2 },
  { name: "tablet", width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: "desktop-sm", width: 1280, height: 800, deviceScaleFactor: 1 },
  { name: "desktop-lg", width: 1920, height: 1080, deviceScaleFactor: 1 },
];

for (const vp of VIEWPORTS) {
  test(`matches baseline at ${vp.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
      reducedMotion: "reduce",
    });

    const page = await context.newPage();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the landing page root and hero headline to be present.
    await page.locator(".landing-root").waitFor({ state: "visible" });
    await expect(page.locator("h1")).toContainText("Bewerbungen");

    // Wait for any initial paint / lazy content.
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(`landing-${vp.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });

    await context.close();
  });
}
