/** CV template picker behavior, accessibility, responsiveness, themes, and snapshots. */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CV_TEMPLATES, TEMPLATE_FILTERS, templateMatchesFilter } from "../src/cv/templateRegistry.js";
import { MARKET_TITLE, WIZARD_HEADING, mockApi, seedDraft, openPicker } from "./helpers/cvPickerEnv.js";

async function installFixture(page) {
  await page.addInitScript(seedDraft);
  mockApi(page);
}

function selectionDock(page) {
  return page.getByLabel("Ausgewählte Vorlage");
}

test.describe("CV template gallery", () => {
  test("renders all templates and useful plain-language filters", async ({ page }) => {
    await installFixture(page);
    await openPicker(page);
    await expect(page.getByRole("heading", { name: MARKET_TITLE })).toBeVisible();
    const chips = page.getByRole("group", { name: "Vorlagen filtern" }).getByRole("button");
    await expect(chips).toHaveCount(TEMPLATE_FILTERS.length);
    await expect(chips).toHaveText(TEMPLATE_FILTERS.map((filter) => filter.label));
    await expect(page.locator("article[data-template-id]")).toHaveCount(CV_TEMPLATES.length);
    const firstApplication = CV_TEMPLATES.filter((template) => templateMatchesFilter(template, "first-application"));
    await chips.filter({ hasText: "Für die erste Bewerbung" }).click();
    await expect(page.locator("article[data-template-id]")).toHaveCount(firstApplication.length);
    const withPhoto = CV_TEMPLATES.filter((template) => templateMatchesFilter(template, "photo"));
    await chips.filter({ hasText: "Mit Foto" }).click();
    await expect(page.locator("article[data-template-id]")).toHaveCount(withPhoto.length);
  });

  test("selecting a card updates the selection and shows the floating dock", async ({ page }) => {
    await installFixture(page);
    await openPicker(page);
    await expect(selectionDock(page)).toHaveCount(0);
    const card = page.locator("article[data-template-id='serif']");
    await card.click();
    await expect(card.locator("span[aria-hidden='true'] svg path")).toBeVisible();
    await expect(card).toHaveCSS("border-top-color", /rgb\(.*\)/);
    const dock = selectionDock(page);
    await expect(dock).toBeVisible();
    await expect(dock).toContainText("Elegant");
    await expect(dock.getByRole("button", { name: "Vorschau", exact: true })).toBeVisible();
    await expect(dock.getByRole("button", { name: "Weiter →" })).toBeVisible();
  });

  test("clicking the selected template again deselects it", async ({ page }) => {
    await installFixture(page);
    await openPicker(page);
    const card = page.locator("article[data-template-id='tabellarisch']");
    const toggle = card.getByRole("button", { name: "Auswahl aufheben" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();

    await expect(card.getByRole("button", { name: "Auswählen", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(selectionDock(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("cv_profile_v1") || "{}").templateId)).toBe("");
  });

  test("selection dock CTA advances to the builder", async ({ page }) => {
    await installFixture(page);
    await openPicker(page);
    await page.locator("article[data-template-id='serif']").click();
    const dock = selectionDock(page);
    await expect(dock).toBeVisible();
    await dock.getByRole("button", { name: "Weiter →" }).click();
    await expect(page.getByRole("heading", { name: WIZARD_HEADING })).toBeVisible();
    await expect(page).toHaveURL(/\/lebenslauf$/);
  });

  test("opens an accessible large preview with navigation, zoom, select, and ESC", async ({ page }) => {
    await installFixture(page);
    await openPicker(page);
    const firstCard = page.locator("article").first();
    const previewButton = firstCard.getByRole("button", { name: "Vorschau", exact: true });
    await previewButton.click();
    const dialog = page.getByRole("dialog", { name: /— Vollbildvorschau/u });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("button", { name: "Vergrößern" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Diese Vorlage verwenden →" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    await dialog.getByRole("button", { name: "Nächste Vorlage" }).click();
    await dialog.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
    await expect(previewButton).toBeFocused();
  });

  test("desktop shows two large landscape showcase columns", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPicker(page);
    await page.locator("article[data-template-id='serif']").click();
    await expect(selectionDock(page)).toBeVisible();
    const cards = page.locator("article[data-template-id]");
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    const third = await cards.nth(2).boundingBox();
    expect(first.width).toBeGreaterThan(420);
    expect(Math.abs(first.y - second.y)).toBeLessThan(12);
    expect(second.x).toBeGreaterThan(first.x);
    expect(third.y).toBeGreaterThan(first.y + first.height * 0.8);
    expect(first.height).toBeLessThan(first.width * 0.8);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(serious).toEqual([]);
    await expect(page).toHaveScreenshot("picker-desktop-light.png");
  });

  test("thumbnails are art-directed: full width, content-dense, no blank paper", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPicker(page);
    await expect(page.locator("article[data-template-id]")).toHaveCount(CV_TEMPLATES.length);
    const cards = page.locator("article[data-template-id]");
    for (let i = 0; i < await cards.count(); i += 1) {
      const card = cards.nth(i);
      const id = await card.getAttribute("data-template-id");
      const audit = await card.locator("[data-paper-frame]").evaluate((frame) => {
        const w = frame.clientWidth;
        const h = frame.clientHeight;
        const inner = frame.querySelector("div");
        const canvasW = inner ? inner.getBoundingClientRect().width : 0;
        const canvasH = inner ? inner.getBoundingClientRect().height : 0;
        const totalArea = w * h;
        const origin = frame.getBoundingClientRect();
        const clip = (rect) => {
          const left = Math.max(0, rect.left - origin.left);
          const top = Math.max(0, rect.top - origin.top);
          const right = Math.min(w, rect.right - origin.left);
          const bottom = Math.min(h, rect.top - origin.top + rect.height);
          return { width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
        };
        let inkArea = 0;
        const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.nodeValue || !node.nodeValue.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            const c = clip(rect);
            inkArea += c.width * c.height;
          }
        }
        frame.querySelectorAll("div, span").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) return;
          const bg = getComputedStyle(el).backgroundColor;
          if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return;
          const m = bg.match(/[\d.]+/g);
          // Ink = any non-background paint. Warm paper (#F7F6F2 → 247/246/242)
          // must NOT count as ink, hence the 235 threshold.
          if (m && (Number(m[0]) < 235 || Number(m[1]) < 235 || Number(m[2]) < 235)) {
            const c = clip(rect);
            inkArea += c.width * c.height;
          }
        });
        let sidebarRatio = 0;
        frame.querySelectorAll("div").forEach((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg === "rgb(36, 42, 51)") sidebarRatio = el.getBoundingClientRect().width / w;
        });
        const frameRect = frame.getBoundingClientRect();
        const canvasRect = inner ? inner.getBoundingClientRect() : { left: 0, right: 0 };
        return {
          canvasFillsWidth: Math.abs(canvasW - w) <= 2,
          canvasCoversViewport: canvasH >= h - 2,
          canvasLeftOffset: canvasRect.left - frameRect.left,
          canvasRightOffset: frameRect.right - canvasRect.right,
          inkCoverage: inkArea / totalArea,
          sidebarRatio,
        };
      });
      expect(audit.canvasFillsWidth, `${id}: thumbnail must span the full preview width`).toBe(true);
      expect(audit.canvasCoversViewport, `${id}: thumbnail must fill the viewport height`).toBe(true);
      expect(audit.canvasLeftOffset, `${id}: left edge must align with the frame (0 horizontal clipping)`).toBeLessThan(2);
      expect(audit.canvasLeftOffset).toBeGreaterThan(-2);
      expect(audit.canvasRightOffset, `${id}: right edge must align with the frame (0 horizontal clipping)`).toBeLessThan(2);
      expect(audit.canvasRightOffset).toBeGreaterThan(-2);
      expect(audit.inkCoverage, `${id}: thumbnail must be content-dense, not blank paper`).toBeGreaterThan(0.05);
      if (id === "slim-sidebar") {
        expect(audit.sidebarRatio, "Mit Seitenleiste must show its dark sidebar column (~30% width)").toBeGreaterThan(0.24);
        expect(audit.sidebarRatio).toBeLessThan(0.4);
      }
    }
  });

  test("mobile uses one full-width card per row", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPicker(page);
    const cards = page.locator("article[data-template-id]");
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(second.y).toBeGreaterThan(first.y + first.height * 0.9);
    expect(first.width).toBeGreaterThan(320);
    await expect(page.locator("article[data-template-id='tabellarisch']")).toBeVisible();
    await expect(page).toHaveScreenshot("picker-mobile-light.png");
  });

  test("dark mode frames the paper gallery intentionally", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jobassist_theme_v1", "dark"));
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPicker(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const values = bg.match(/\d+/g)?.map(Number) || [];
    expect(values.slice(0, 3).reduce((sum, value) => sum + value, 0)).toBeLessThan(240);
    await expect(page).toHaveScreenshot("picker-desktop-dark.png");
  });
});
