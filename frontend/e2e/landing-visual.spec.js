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
  { name: "mobile-xs", width: 320, height: 700, deviceScaleFactor: 2 },
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
 * The reveal-on-scroll animation is a visual-test blind spot: elements with
 * `.lv5-reveal` sit at opacity 0 until IntersectionObserver fires, so a
 * full-page screenshot can silently capture large blank sections and still
 * pass. Two guards prevent that:
 * - contexts run with reducedMotion: "reduce", and the CSS makes reveals
 *   immediately visible under reduced motion;
 * - every capture asserts the page holds no unrevealed `.lv5-reveal`
 *   content before comparing against the baseline.
 *
 * @param {import("@playwright/test").Page} page
 */
async function gotoLandingPage(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".landing-v5").waitFor({ state: "visible" });
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(500);
  await assertNothingHidden(page);
}

/**
 * Scroll through the page so any JS-driven reveal has fired, then fail if
 * `.lv5-reveal` content is still invisible (the blank-section blind spot).
 *
 * @param {import("@playwright/test").Page} page
 */
async function assertNothingHidden(page) {
  await page.evaluate(async () => {
    const scroller = document.scrollingElement || document.documentElement;
    const step = () => Math.max(320, window.innerHeight * 0.8);

    const sweep = async () => {
      // Instant scrolls only: html carries scroll-behavior:smooth, and rapid
      // smooth scrolls never finish animating, leaving bottom sections
      // unvisited (and therefore unrevealed).
      window.scrollTo({ top: 0, behavior: "instant" });
      for (let y = 0; y <= scroller.scrollHeight; y += step()) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 120));
    };

    // The first sweep reveals everything in the initial layout; additional
    // sweeps cover late layout growth (fonts, images) that moved sections
    // below the reach of the first pass.
    for (let pass = 0; pass < 3; pass++) {
      await sweep();
      const stuck = document.querySelectorAll(".lv5-reveal:not(.lv5-visible)");
      if (stuck.length === 0) return;
    }
  });
  const hidden = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".lv5-reveal:not(.lv5-visible)"))
      .filter((el) => (el.textContent || "").trim().length > 0)
      .map((el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80)),
  );
  expect(
    hidden,
    ".lv5-reveal content stayed invisible — full-page captures would silently approve blank sections",
  ).toEqual([]);
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
      await assertNothingHidden(page);

      await expect(locator).toHaveScreenshot(
        `landing-${section.name}-${vp.name}.png`,
        { maxDiffPixelRatio: 0.005 },
      );

      await context.close();
    });
  }
}
