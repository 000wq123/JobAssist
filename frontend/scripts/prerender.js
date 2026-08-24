/**
 * Prerender script — generates static HTML for critical public routes
 * so crawlers and AI search platforms see semantic markup instead of a
 * blank SPA shell.
 *
 * Requires Playwright (already in devDependencies):
 *   npm run build       # generates the SPA dist/
 *   node scripts/prerender.js  # writes route-specific index.html files
 *
 * Usage in CI:
 *   Add `node scripts/prerender.js` immediately after `vite build`.
 */
import { chromium } from "@playwright/test";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = 3456;

const ROUTES = [
  { url: "/", out: "index.html" },
  { url: "/impressum", out: "impressum/index.html" },
  { url: "/terms", out: "terms/index.html" },
  { url: "/privacy", out: "privacy/index.html" },
];

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(DIST, req.url === "/" ? "index.html" : req.url);
      const safePath = filePath.startsWith(DIST) ? filePath : DIST;
      let target = safePath;
      if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        target = path.join(DIST, "index.html");
      }
      fs.readFile(target, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(target);
        const type =
          ext === ".js" ? "application/javascript" :
          ext === ".css" ? "text/css" :
          ext === ".png" ? "image/png" :
          ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
          ext === ".svg" ? "image/svg+xml" :
          "text/html";
        res.writeHead(200, { "Content-Type": type });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function prerender() {
  if (!fs.existsSync(DIST)) {
    console.error("dist/ folder not found. Run `vite build` first.");
    process.exit(1);
  }

  const staticServer = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error("Prerender skipped:", String(err.message || err));
    staticServer.close();
    return;
  }
  const page = await browser.newPage();

  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route.url}`, { waitUntil: "networkidle" });
    // Wait a short beat for React to render the route-specific markup.
    await page.waitForTimeout(600);

    const html = await page.content();
    const outPath = path.join(DIST, route.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf-8");
    console.log(`✓ Prerendered ${route.url} → dist/${route.out}`);
  }

  await browser.close();
  staticServer.close(() => {
    console.log("Prerender complete.");
  });
}

prerender().catch((err) => {
  console.error(err);
  process.exit(1);
});
