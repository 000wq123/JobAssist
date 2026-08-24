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

/**
 * Create a fresh browser context with the given viewport and reduced motion.
 *
 * @param {import("@playwright/test").Browser} browser
 * @param {object} viewport
 */
async function newLandingPageContext(browser, viewport) {
  return browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    reducedMotion: "reduce",
  });
}

/**
 * Navigate to the landing page and wait for the hero to be ready.
 *
 * @param {import("@playwright/test").Page} page
 */
async function gotoLandingPage(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".landing-v5").waitFor({ state: "visible" });
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(500);
}

for (const vp of VIEWPORTS) {
  test(`matches full-page baseline at ${vp.name}`, async ({ browser }) => {
    const context = await newLandingPageContext(browser, vp);
    const page = await context.newPage();
    await gotoLandingPage(page);

    await expect(page).toHaveScreenshot(`landing-${vp.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });

    await context.close();
  });
}

const SECTIONS = [
  { name: "hero", selector: "section#hero" },
  // v5 landing: features + CTA no longer have dedicated section ids.
  // Capture the workflow canvas and final CTA block via stable text landmarks.
  { name: "features", selector: 'div:has(> h2:has-text("Ein Ablauf. Alle Werkzeuge."))' },
  { name: "cta", selector: 'div:has(> h2:has-text("Bereit für deinen nächsten Karriereschritt?"))' },
];

// Section snapshots are captured at representative breakpoints only
// (mobile, tablet, desktop) to keep the baseline snapshot count manageable.
// Full-page snapshots already cover all five breakpoints.
const SECTION_VIEWPORTS = VIEWPORTS.filter((vp) =>
  ["mobile-sm", "tablet", "desktop-lg"].includes(vp.name),
);

for (const vp of SECTION_VIEWPORTS) {
  for (const section of SECTIONS) {
    test(`matches ${section.name} baseline at ${vp.name}`, async ({ browser }) => {
      const context = await newLandingPageContext(browser, vp);
      const page = await context.newPage();
      await gotoLandingPage(page);

      const locator = page.locator(section.selector).first();
      await locator.scrollIntoViewIfNeeded();

      await expect(locator).toHaveScreenshot(
        `landing-${section.name}-${vp.name}.png`,
        { maxDiffPixelRatio: 0.005 },
      );

      await context.close();
    });
  }
}
