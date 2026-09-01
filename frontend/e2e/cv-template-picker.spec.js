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

  test("gallery thumbnails are cropped views of the same A4 document as fullscreen", async ({ page }) => {
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
        const canvas = frame.querySelector(".cv-stage");
        const page = canvas?.querySelector(".cva4");
        const canvasRect = canvas?.getBoundingClientRect();
        const pageStyle = page ? getComputedStyle(page) : null;
        let sidebarRatio = 0;
        page?.querySelectorAll("div").forEach((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg === "rgb(36, 42, 51)") sidebarRatio = el.getBoundingClientRect().width / canvasRect.width;
        });
        const frameRect = frame.getBoundingClientRect();
        return {
          kind: canvas?.getAttribute("data-preview-kind"),
          id: canvas?.getAttribute("data-template-id"),
          logicalWidth: Number.parseFloat(canvas?.style.width || "0"),
          logicalHeight: Number.parseFloat(canvas?.style.height || "0"),
          pageWidth: Number.parseFloat(pageStyle?.width || "0"),
          pageMinHeight: Number.parseFloat(pageStyle?.minHeight || "0"),
          canvasFillsWidth: Math.abs((canvasRect?.width || 0) - w) <= 2,
          canvasCoversViewport: (canvasRect?.height || 0) >= h - 2,
          canvasLeftOffset: (canvasRect?.left || 0) - frameRect.left,
          canvasRightOffset: frameRect.right - (canvasRect?.right || 0),
          sidebarRatio,
        };
      });
      expect(audit.kind, `${id}: gallery document must be identifiable`).toBe("gallery");
      expect(audit.id).toBe(id);
      expect(audit.logicalWidth, `${id}: gallery must retain the A4 document width`).toBeCloseTo(595.28, 1);
      expect(audit.logicalHeight, `${id}: gallery must retain the A4 document height`).toBeCloseTo(841.89, 1);
      expect(audit.pageWidth, `${id}: rendered template must use the A4 width`).toBeCloseTo(595.28, 1);
      expect(audit.pageMinHeight, `${id}: rendered template must use the A4 height`).toBeCloseTo(841.89, 1);
      expect(audit.canvasFillsWidth, `${id}: scaled A4 page must span the preview width`).toBe(true);
      expect(audit.canvasCoversViewport, `${id}: scaled A4 page must cover the cropped viewport`).toBe(true);
      expect(audit.canvasLeftOffset, `${id}: left edge must align with the frame (0 horizontal clipping)`).toBeLessThan(2);
      expect(audit.canvasLeftOffset).toBeGreaterThan(-2);
      expect(audit.canvasRightOffset, `${id}: right edge must align with the frame (0 horizontal clipping)`).toBeLessThan(2);
      expect(audit.canvasRightOffset).toBeGreaterThan(-2);
      if (id === "slim-sidebar") {
        expect(audit.sidebarRatio, "Mit Seitenleiste must preserve the real 150pt sidebar").toBeCloseTo(150 / 595.28, 2);
      }
    }

    const sidebarCard = page.locator("article[data-template-id='slim-sidebar']");
    const galleryMarkup = await sidebarCard.locator("[data-cv-document] > .cva4").evaluate((node) => node.innerHTML);
    await sidebarCard.getByRole("button", { name: "Vorschau", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /Mit Seitenleiste — Vollbildvorschau/u });
    const fullscreenDocument = dialog.locator("[data-cv-document][data-template-id='slim-sidebar']");
    await expect(fullscreenDocument).toHaveAttribute("data-preview-kind", "fullscreen");
    const fullscreenMarkup = await fullscreenDocument.locator(":scope > .cva4").evaluate((node) => node.innerHTML);
    expect(fullscreenMarkup, "gallery and fullscreen must render one identical CV tree").toBe(galleryMarkup);
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
