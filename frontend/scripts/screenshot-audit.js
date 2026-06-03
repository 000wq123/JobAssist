const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "audit-screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-sm",  width: 375,  height: 812,  deviceScaleFactor: 2 },
  { name: "mobile-md",  width: 414,  height: 896,  deviceScaleFactor: 2 },
  { name: "tablet",     width: 768,  height: 1024, deviceScaleFactor: 2 },
  { name: "desktop-sm", width: 1280, height: 800,  deviceScaleFactor: 1 },
  { name: "desktop-lg", width: 1920, height: 1080, deviceScaleFactor: 1 },
];

const SECTIONS = [
  { name: "full",   scroll: 0 },
  { name: "hero",   scroll: 0 },
  { name: "features", scroll: 2200 },
  { name: "pricing",  scroll: 5500 },
  { name: "footer",   scroll: 7000 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4174/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Full page
    await page.screenshot({
      path: path.join(OUT, `${vp.name}-full.png`),
      fullPage: true,
    });
    console.log(`Wrote ${vp.name}-full.png`);

    await context.close();
  }

  await browser.close();
  console.log("Done. Screenshots in", OUT);
})();
