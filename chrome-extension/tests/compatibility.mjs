import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../frontend/node_modules/@playwright/test/index.mjs";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(testsDir, "..");
const contentScript = fs.readFileSync(path.join(extensionDir, "content/application-assistant.js"), "utf8");
const contentStyle = fs.readFileSync(path.join(extensionDir, "content/application-assistant.css"), "utf8");
const fixtureDir = path.join(testsDir, "fixtures");
const profile = {
  firstName: "Davor",
  lastName: "Radeski",
  email: "davor@example.com",
  phone: "+43 664 1234567",
  address: "Hauptstraße 1",
  postalCode: "1010",
  city: "Wien",
  birthDate: "2009-01-15",
  country: "Österreich",
};
const application = {
  title: "Compatibility Fixture",
  company: "Example GmbH",
  coverLetter: "Ich freue mich auf die Bewerbung.",
  startedAt: Date.now(),
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

const failures = [];
async function check(name, callback) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function openFixture(page, file) {
  await page.goto(`https://fixtures.jobassist.test/${file}`);
  await page.addStyleTag({ content: contentStyle });
  await page.addScriptTag({ content: contentScript });
  await page.locator("#jobassist-extension-root .jae-panel").waitFor();
  await page.getByRole("button", { name: "Felder prüfen" }).click();
}

try {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "external-ats.test") {
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: '<!doctype html><html><body><label for="external-email">E-Mail</label><input id="external-email" autocomplete="email"></body></html>',
      });
      return;
    }
    if (url.hostname !== "fixtures.jobassist.test") return route.abort();
    const name = url.pathname.slice(1) || "ordinary.html";
    const file = name.startsWith("fixtures/") ? name.slice("fixtures/".length) : name;
    const fixturePath = path.join(fixtureDir, path.basename(file));
    if (!fs.existsSync(fixturePath)) return route.abort();
    await route.fulfill({ contentType: "text/html", body: fs.readFileSync(fixturePath, "utf8") });
  });
  const page = await context.newPage();
  await page.addInitScript(({ storedProfile, storedApplication }) => {
    const values = { applicantProfile: storedProfile, activeApplication: storedApplication };
    Object.defineProperty(globalThis, "chrome", { configurable: true, value: {
      storage: {
        local: {
          get: async (keys) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, values[key]])),
          set: async (next) => Object.assign(values, next),
          remove: async (key) => { delete values[key]; },
        },
        onChanged: { addListener: () => {} },
      },
      runtime: { sendMessage: () => {}, getURL: (asset) => `chrome-extension://fixture/${asset}` },
    }});
  }, { storedProfile: profile, storedApplication: application });

  await check("ordinary fields are proposed and require explicit review", async () => {
    await openFixture(page, "ordinary.html");
    assert.ok(await page.locator("[data-jae-proposal]").count() >= 3);
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.locator("#first-name").inputValue(), "Davor");
    assert.equal(await page.locator("#email").inputValue(), "davor@example.com");
    await page.getByRole("button", { name: "Letzte Änderungen rückgängig" }).click();
    assert.equal(await page.locator("#first-name").inputValue(), "");
    assert.equal(await page.locator("#email").inputValue(), "");
  });

  await check("users can deselect individual proposals before filling", async () => {
    await openFixture(page, "ordinary.html");
    await page.getByRole("checkbox", { name: "Wohnort ausfüllen" }).uncheck();
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.locator("#first-name").inputValue(), "Davor");
    assert.equal(await page.locator("#city").inputValue(), "");
  });

  await check("existing, password and hidden values are never overwritten", async () => {
    await openFixture(page, "controls.html");
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.locator("#birthday").inputValue(), "2009-01-15");
    assert.equal(
      await page.locator("#country").inputValue(),
      "AT",
      `country proposals: ${(await page.locator("[data-jae-proposal]").allTextContents()).join(" | ")}`,
    );
    assert.equal(await page.locator("#phone-code").inputValue(), "+43");
    assert.equal(await page.locator("#phone-national").inputValue(), "664 1234567");
    assert.equal(await page.locator('#controls-form input[type="radio"]:checked').count(), 0);
    assert.equal(await page.locator('#controls-form input[type="checkbox"]:checked').count(), 0);
    assert.equal(await page.locator("#password").inputValue(), "");
    assert.equal(await page.locator("input[type=hidden]").inputValue(), "fixture-token");
  });

  await check("dynamic controls are rescanned after the next step", async () => {
    await openFixture(page, "dynamic.html");
    await page.locator("#next").click();
    await page.getByText(/Neue oder geänderte Felder wurden erneut geprüft/).waitFor();
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.locator('[name="street"]').inputValue(), "Hauptstraße");
    assert.equal(await page.locator('[name="houseNumber"]').inputValue(), "1");
    assert.equal(await page.locator('[name="postalCode"]').inputValue(), "1010");
  });

  await check("shadow DOM and same-origin iframe fields are recognized", async () => {
    await openFixture(page, "shadow-iframe.html");
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.locator("#shadow-host").evaluate((host) => host.shadowRoot.querySelector("input").value), "davor@example.com");
    const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
    assert.ok(frame, "same-origin iframe was not available");
    assert.equal(await frame.locator("input").inputValue(), "Wien");
  });

  await check("cross-origin iframe restrictions are reported instead of guessed through", async () => {
    await openFixture(page, "cross-origin.html");
    await page.getByText(/1 geschützter Frame/).waitFor();
    assert.equal(await page.locator('[data-jae-proposal="ready"]').count(), 0);
  });

  await check("ambiguous and existing fields remain unselected", async () => {
    await openFixture(page, "ambiguous.html");
    assert.equal(await page.locator('[data-jae-proposal="ready"]').count(), 0);
    assert.equal(await page.locator('[data-jae-proposal="unknown"]').count(), 2);
    assert.equal(await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).isDisabled(), true);
    assert.equal(await page.locator("#existing").inputValue(), "already@example.com");
  });

  await check("review flow never submits a form automatically", async () => {
    await openFixture(page, "ordinary.html");
    assert.equal(await page.evaluate(() => window.submitCount || 0), 0);
    await page.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();
    assert.equal(await page.evaluate(() => window.submitCount || 0), 0);
  });
} finally {
  await context.close();
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} compatibility test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("Extension compatibility test passed: all fixtures are supported safely.");
}
