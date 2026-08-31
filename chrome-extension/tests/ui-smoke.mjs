import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "../../frontend/node_modules/jsdom/lib/api.js";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const popupHtml = fs.readFileSync(path.join(extensionDir, "popup/popup.html"), "utf8");
const popupDom = new JSDOM(popupHtml, {
  url: "chrome-extension://jobassist/popup/popup.html",
  runScripts: "outside-only",
});
const calls = { css: [], scripts: [], writes: [] };
const popupStored = {
  applicantProfile: { firstName: "Anna", email: "anna@example.at" },
  profileConsentAt: "2026-08-30T10:00:00.000Z",
  activeApplication: { title: "QA Engineer", company: "Beispiel GmbH", startedAt: Date.now() },
};

popupDom.window.close = () => {};
popupDom.window.chrome = {
  storage: {
    local: {
      get: async (keys) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, popupStored[key]])),
      set: async (value) => { calls.writes.push(value); Object.assign(popupStored, value); },
      remove: async (keys) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) delete popupStored[key];
      },
    },
  },
  runtime: { sendMessage: () => {} },
  tabs: { query: async () => [{ id: 17, url: "https://careers.example/apply" }] },
  scripting: {
    insertCSS: async (options) => { calls.css.push(options); },
    executeScript: async (options) => { calls.scripts.push(options); },
  },
};

popupDom.window.eval(fs.readFileSync(path.join(extensionDir, "popup/popup.js"), "utf8"));
await tick();

assert.equal(popupDom.window.document.getElementById("active-application").hidden, false);
assert.equal(popupDom.window.document.getElementById("empty-application").hidden, true);
assert.equal(popupDom.window.document.querySelector('[name="firstName"]').value, "Anna");
assert.equal(popupDom.window.document.getElementById("profile-consent").checked, true);

delete popupStored.profileConsentAt;
popupDom.window.document.getElementById("open-assistant").click();
await tick();
assert.equal(calls.scripts.length, 0);
assert.match(popupDom.window.document.getElementById("status").textContent, /Speichere zuerst/);

popupStored.profileConsentAt = "2026-08-30T10:00:00.000Z";
popupDom.window.document.getElementById("open-assistant").click();
await tick();
assert.equal(Array.from(calls.css[0].files).join(","), "content/application-assistant.css");
assert.equal(Array.from(calls.scripts[0].files).join(","), "content/application-assistant.js");
assert.equal(calls.scripts[0].target.tabId, 17);

popupDom.window.document.getElementById("clear-data").click();
await tick();
assert.equal(popupStored.applicantProfile, undefined);
assert.equal(popupStored.profileConsentAt, undefined);
assert.equal(popupStored.activeApplication, undefined);
assert.equal(popupDom.window.document.getElementById("active-application").hidden, true);
assert.equal(popupDom.window.document.getElementById("empty-application").hidden, false);
assert.match(popupDom.window.document.getElementById("status").textContent, /gelöscht/);

const onboardingHtml = fs.readFileSync(path.join(extensionDir, "onboarding/onboarding.html"), "utf8");
const onboardingDom = new JSDOM(onboardingHtml, {
  url: "chrome-extension://jobassist/onboarding/onboarding.html",
  runScripts: "outside-only",
});
const onboardingWrites = [];
onboardingDom.window.setTimeout = () => 0;
onboardingDom.window.chrome = {
  storage: {
    local: {
      get: async () => ({}),
      set: async (value) => { onboardingWrites.push(value); },
    },
  },
};
onboardingDom.window.eval(fs.readFileSync(path.join(extensionDir, "onboarding/onboarding.js"), "utf8"));
await tick();

onboardingDom.window.document.querySelector('[name="firstName"]').value = "Anna";
onboardingDom.window.document.getElementById("profile-consent").checked = true;
onboardingDom.window.document.getElementById("onboarding-form").dispatchEvent(
  new onboardingDom.window.Event("submit", { bubbles: true, cancelable: true }),
);
await tick();
assert.equal(onboardingWrites[0].applicantProfile.firstName, "Anna");
assert.match(onboardingWrites[0].profileConsentAt, /^\d{4}-\d{2}-\d{2}T/);

console.log("Extension UI smoke test passed: consent, local profile and active-tab injection are wired.");
