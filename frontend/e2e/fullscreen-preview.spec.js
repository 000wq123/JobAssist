/**
 * Fullscreen CV preview viewer — geometry, zoom, keyboard, responsive and
 * theme checks for the rebuilt document-viewer modal (CVTemplatePicker's
 * PreviewOverlay). Screenshots land in test-results/screenshots/.
 */
import { expect, test } from "@playwright/test";
import { CV_TEMPLATES } from "../src/cv/templateRegistry.js";
import { mockApi, seedDraft, openPicker } from "./helpers/cvPickerEnv.js";

async function installFixture(page) {
  await page.addInitScript(seedDraft);
  mockApi(page);
}

/** Open the picker and the first template's fullscreen preview. */
async function openPreview(page) {
  await openPicker(page);
  await page.locator("article").first().getByRole("button", { name: "Vorschau", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Vollbildvorschau/u });
  await expect(dialog).toBeVisible();
  return dialog;
}

const A4_RATIO = 794 / 1123; // matches cvModel A4.W / A4.H

test.describe("fullscreen CV preview viewer", () => {
  test("desktop: layered modal shell, fitted A4 page, controls and anchored CTA", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const dialog = await openPreview(page);

    // Modal occupies most of the viewport but leaves breathing room.
    const viewport = page.viewportSize();
    const box = await dialog.boundingBox();
    expect(box.width).toBeGreaterThan(viewport.width * 0.65);
    expect(box.width).toBeLessThan(viewport.width * 0.95);
    expect(box.height).toBeGreaterThan(viewport.height * 0.8);
    expect(box.height).toBeLessThan(viewport.height * 0.97);

    // Toolbar: document header + all controls with tooltips/aria-labels.
    await expect(dialog).toContainText("Beispielvorschau");
    for (const label of [
      "Verkleinern (Minus)",
      "Vergrößern (Plus)",
      "Breite ausfüllen",
      "Schließen (Esc)",
    ]) {
      await expect(dialog.getByRole("button", { name: label })).toBeVisible();
    }

    // A4 page is fully visible inside the stage at default fit, correct ratio.
    const paper = dialog.locator(".cv-stage");
    await expect(paper).toBeVisible();
    const paperBox = await paper.boundingBox();
    expect(paperBox.height).toBeGreaterThan(300);
    expect(paperBox.width / paperBox.height).toBeCloseTo(A4_RATIO, 1);
    expect(paperBox.x).toBeGreaterThanOrEqual(box.x - 1);
    expect(paperBox.y).toBeGreaterThanOrEqual(box.y - 1);
    expect(paperBox.x + paperBox.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(paperBox.y + paperBox.height).toBeLessThanOrEqual(box.y + box.height + 1);

    // CTA is anchored inside the modal, not floating at the viewport edge.
    const cta = dialog.getByRole("button", { name: /Diese Vorlage verwenden/u });
    const ctaBox = await cta.boundingBox();
    expect(ctaBox.x + ctaBox.width).toBeLessThan(box.x + box.width + 1);
    expect(ctaBox.y).toBeGreaterThanOrEqual(box.y);
    await expect(dialog.getByRole("button", { name: "Zurück zur Auswahl" })).toBeVisible();

    // Position pill + side navigation.
    await expect(dialog.getByText(`1 / ${CV_TEMPLATES.length}`)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Vorherige Vorlage" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Nächste Vorlage" })).toBeVisible();

    // No horizontal page overflow.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    ).toBe(true);

    await dialog.screenshot({ path: "test-results/screenshots/fullscreen-desktop-1920.png" });
  });

  test("builder fullscreen uses the real profile and downloads that profile", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPicker(page);
    await page.locator("article[data-template-id='serif']").getByRole("button", { name: "Auswählen", exact: true }).click();
    await page.getByLabel("Ausgewählte Vorlage").getByRole("button", { name: "Weiter →" }).click();
    await page.getByRole("button", { name: "Vollbild öffnen" }).click();

    const dialog = page.getByRole("dialog", { name: /Vollbildvorschau/u });
    await expect(dialog).toContainText("Anna Muster");
    await expect(dialog).not.toContainText("Anna Berger");

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Als PDF herunterladen" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Anna_Muster_Lebenslauf.pdf");
  });

  test("builder design controls update the live document", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPicker(page);
    await page.locator("article[data-template-id='kontrast']").getByRole("button", { name: "Auswählen", exact: true }).click();
    await page.getByLabel("Ausgewählte Vorlage").getByRole("button", { name: "Weiter →" }).click();

    const preview = page.locator("[data-live-preview] .cva4");
    await page.getByTitle("Blau").click();
    await expect.poll(() => preview.evaluate((node) => getComputedStyle(node).getPropertyValue("--cv-accent").trim())).toBe("#1C3557");
    await page.getByRole("button", { name: "Serif", exact: true }).click();
    await expect.poll(() => preview.evaluate((node) => getComputedStyle(node).fontFamily)).toContain("Georgia");
  });

  test("zoom in/out and fill toggle change the rendered page scale", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const dialog = await openPreview(page);
    const paper = dialog.locator(".cv-stage");

    const fit = await paper.boundingBox();
    await dialog.getByRole("button", { name: "Vergrößern (Plus)" }).click();
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeGreaterThan(fit.width + 1);
    const zoomed = await paper.boundingBox();

    await dialog.getByRole("button", { name: "Verkleinern (Minus)" }).click();
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeLessThan(zoomed.width);

    await dialog.getByRole("button", { name: "Breite ausfüllen" }).click();
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeGreaterThan(fit.width * 1.2);
    const filled = await paper.boundingBox();
    // Fill label toggles back to "fit page".
    await expect(dialog.getByRole("button", { name: "Auf Seite einpassen" })).toBeVisible();

    await dialog.getByRole("button", { name: "Auf Seite einpassen" }).click();
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeLessThan(filled.width);
  });

  test("keyboard: arrows navigate templates, +/- zoom, Escape closes with focus restore", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const dialog = await openPreview(page);

    await dialog.press("ArrowRight");
    await expect(dialog.getByText(`2 / ${CV_TEMPLATES.length}`)).toBeVisible();
    await dialog.press("ArrowLeft");
    await expect(dialog.getByText(`1 / ${CV_TEMPLATES.length}`)).toBeVisible();

    const before = await dialog.locator(".cv-stage").boundingBox();
    await dialog.press("+");
    const after = await dialog.locator(".cv-stage").boundingBox();
    expect(after.width).toBeGreaterThan(before.width + 1);
    await dialog.press("-");
    await dialog.press("Escape");

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Vorschau", exact: true }).first()).toBeFocused();
  });

  test("mobile: near-fullscreen modal, page fits width, no horizontal scroll", async ({ page }) => {
    await installFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openPreview(page);

    const box = await dialog.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(388);
    expect(box.height).toBeGreaterThanOrEqual(844 * 0.9);

    const paper = await dialog.locator(".cv-stage").boundingBox();
    expect(paper.width).toBeLessThanOrEqual(box.width);
    expect(paper.x).toBeGreaterThanOrEqual(box.x - 1);

    await expect(dialog.getByRole("button", { name: /Diese Vorlage verwenden/u })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    ).toBe(true);

    await dialog.screenshot({ path: "test-results/screenshots/fullscreen-mobile-390.png" });
  });

  test("light mode: viewer chrome follows the selected light theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jobassist_theme_v1", "light"));
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const dialog = await openPreview(page);

    const stageBg = await dialog.locator("div.flex.min-h-full.min-w-full").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(stageBg).toBe("rgb(250, 250, 248)");
  });

  test("dark mode: viewer chrome follows the selected dark theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jobassist_theme_v1", "dark"));
    await installFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const dialog = await openPreview(page);

    const bg = await dialog.locator("div.flex.min-h-full.min-w-full").evaluate((el) => getComputedStyle(el).backgroundColor);
    const values = bg.match(/\d+/g)?.map(Number) || [];
    const sum = values.slice(0, 3).reduce((total, value) => total + value, 0);
    expect(sum).toBeGreaterThan(10); // not pure black
    expect(sum).toBeLessThan(130); // dark charcoal

    await dialog.screenshot({ path: "test-results/screenshots/fullscreen-dark-1440.png" });
  });
});
