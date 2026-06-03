import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Resolve repo/frontend root via import.meta.url to avoid cwd differences in CI/runner
const FRONTEND_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const OUT = path.join(FRONTEND_ROOT, "audit-screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: "mobile-sm",  width: 375,  height: 812,  deviceScaleFactor: 2 },
  { name: "mobile-md",  width: 414,  height: 896,  deviceScaleFactor: 2 },
  { name: "tablet",     width: 768,  height: 1024, deviceScaleFactor: 2 },
  { name: "desktop-sm", width: 1280, height: 800,  deviceScaleFactor: 1 },
  { name: "desktop-lg", width: 1920, height: 1080, deviceScaleFactor: 1 },
];

for (const vp of viewports) {
  test(`screenshot ${vp.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Full page screenshot
    await page.screenshot({
      path: path.join(OUT, `${vp.name}-full.png`),
      fullPage: true,
    });

    // Hero section only
    const hero = page.locator("section:has(h1)").first();
    await hero.screenshot({ path: path.join(OUT, `${vp.name}-hero.png`) });

    // Features section
    await page.evaluate(() => window.scrollTo(0, 2200));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-features.png`), clip: { x: 0, y: 2200, width: vp.width, height: 800 } });

    // Pricing section
    await page.evaluate(() => window.scrollTo(0, 5000));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-pricing.png`), clip: { x: 0, y: 5000, width: vp.width, height: 800 } });

    await context.close();
  });
}
