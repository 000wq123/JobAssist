import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../frontend/node_modules/@playwright/test/index.mjs";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = await chromium.launchPersistentContext("", {
  headless: true,
  channel: "chromium",
  args: [
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
  ],
});

try {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "www.jobassist.tech") {
      await route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><body>
          <a href="https://arbeitgeber.example/bewerben" target="_blank"
             data-jobassist-apply data-job-id="42" data-job-title="QA Engineer"
             data-job-company="Beispiel GmbH" data-job-location="Wien"
             data-job-source="karriere.at" data-cover-letter="Mein Anschreiben">
            Jetzt bewerben
          </a>
        </body></html>`,
      });
      return;
    }
    if (url.hostname === "arbeitgeber.example") {
      await route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><body>
          <form><label>Vorname <input name="firstName"></label>
          <label>E-Mail <input type="email" name="email"></label>
          <label>Ort <input name="city" value="Graz"></label>
          <label>Passwort <input type="password" name="password"></label>
          <label>Newsletter <input type="checkbox" name="newsletter"></label>
          <label>Lebenslauf <input type="file" name="resume"></label>
          <label>Anschreiben <textarea name="coverLetter"></textarea></label>
          <button type="submit">Absenden</button></form>
          <script>document.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); window.submitCount = (window.submitCount || 0) + 1; });</script>
        </body></html>`,
      });
      return;
    }
    await route.abort();
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  await worker.evaluate(() => chrome.storage.local.set({
    applicantProfile: { firstName: "Anna", email: "anna@example.com" },
  }));

  const jobAssist = await context.newPage();
  await jobAssist.goto("https://www.jobassist.tech/jobs/42");
  const externalPagePromise = context.waitForEvent("page");
  await jobAssist.getByText("Jetzt bewerben").click();
  const employer = await externalPagePromise;
  await employer.waitForLoadState("domcontentloaded");

  // Least privilege: nothing is injected into employer pages automatically.
  assert.equal(await employer.locator("#jobassist-extension-root").count(), 0);

  const stored = await worker.evaluate(() => chrome.storage.local.get("activeApplication"));
  assert.equal(stored.activeApplication.title, "QA Engineer");
  assert.equal(stored.activeApplication.company, "Beispiel GmbH");
  assert.equal("destinationUrl" in stored.activeApplication, false);

  // Exercise the same assistant files the popup injects after the user invokes
  // the extension. Browser chrome cannot be clicked in headless mode, so this
  // supplies only the isolated storage/runtime APIs used by the injected code.
  const extensionIconUrl = await worker.evaluate(() => chrome.runtime.getURL("assets/icon-48.png"));
  await employer.evaluate(({ application, iconUrl }) => {
    const values = {
      applicantProfile: { firstName: "Anna", email: "anna@example.com" },
      activeApplication: application,
    };
    Object.defineProperty(globalThis.chrome, "storage", {
      configurable: true,
      value: {
        local: {
          get: async (keys) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, values[key]])),
          remove: async (key) => { delete values[key]; },
        },
        onChanged: { addListener: () => {} },
      },
    });
    Object.defineProperty(globalThis.chrome, "runtime", {
      configurable: true,
      value: { sendMessage: () => {}, getURL: () => iconUrl },
    });
  }, { application: stored.activeApplication, iconUrl: extensionIconUrl });
  await employer.addStyleTag({ path: path.join(extensionDir, "content/application-assistant.css") });
  await employer.addScriptTag({ path: path.join(extensionDir, "content/application-assistant.js") });

  await employer.locator("#jobassist-extension-root .jae-panel").waitFor();
  assert.equal(await employer.locator(".jae-mark").getAttribute("src"), extensionIconUrl);
  await employer.getByRole("button", { name: "Felder prüfen" }).click();
  assert.equal(await employer.locator('[data-jae-proposal="ready"]').count(), 3);
  assert.equal((await employer.locator(".jae-panel").textContent()).includes("anna@example.com"), false);
  await employer.getByRole("button", { name: "Ausgewählte Felder ausfüllen" }).click();

  assert.equal(await employer.locator('input[name="firstName"]').inputValue(), "Anna");
  assert.equal(await employer.locator('input[name="email"]').inputValue(), "anna@example.com");
  assert.equal(await employer.locator('textarea[name="coverLetter"]').inputValue(), "Mein Anschreiben");
  assert.equal(await employer.locator('input[name="city"]').inputValue(), "Graz");
  assert.equal(await employer.locator('input[name="password"]').inputValue(), "");
  assert.equal(await employer.locator('input[name="newsletter"]').isChecked(), false);
  assert.equal(await employer.evaluate(() => window.submitCount || 0), 0);
  assert.match(await employer.locator(".jae-status").textContent(), /3 Felder ausgefüllt/);

  await employer.getByRole("button", { name: "Lebenslauf-Feld zeigen" }).click();
  assert.equal(await employer.locator('input[name="resume"]').evaluate((element) => element.classList.contains("jae-file-target")), true);
  assert.equal(await employer.locator('input[name="resume"]').inputValue(), "");

  console.log("Extension smoke test passed: least-privilege handoff and explicit autofill work.");
} finally {
  await context.close();
}
