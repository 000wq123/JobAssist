import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDir = path.resolve(extensionDir, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(extensionDir, relativePath), "utf8"));
const readRepositoryFile = (relativePath) => fs.readFileSync(path.join(repositoryDir, relativePath), "utf8");
const manifest = readJson("manifest.json");

assert.equal(manifest.manifest_version, 3, "Manifest V3 is required");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, "Version must use x.y.z format");
assert.deepEqual(
  [...manifest.permissions].sort(),
  ["activeTab", "scripting", "storage"].sort(),
  "Only the reviewed runtime permissions may be required",
);

const matches = manifest.content_scripts.flatMap((entry) => entry.matches || []);
assert.deepEqual(matches.sort(), ["https://jobassist.tech/*", "https://www.jobassist.tech/*"].sort());
assert.deepEqual(manifest.host_permissions || [], [], "The extension must not request persistent host access");
assert.deepEqual(manifest.optional_host_permissions || [], [], "The extension must not request optional host access");
assert.deepEqual(manifest.web_accessible_resources, [
  {
    resources: ["assets/icon-48.png"],
    matches: ["http://*/*", "https://*/*"],
  },
], "Only the visible assistant logo may be exposed to employer pages");

const germanMessages = readJson("_locales/de/messages.json");
const description = germanMessages.extensionDescription.message;
assert(description.length <= 132, `Description is ${description.length} characters; Chrome allows 132`);

function assertPng(relativePath, expectedWidth, expectedHeight = expectedWidth) {
  const filePath = path.join(extensionDir, relativePath);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${relativePath} must be PNG`);
  assert.equal(bytes.readUInt32BE(16), expectedWidth, `${relativePath} width`);
  assert.equal(bytes.readUInt32BE(20), expectedHeight, `${relativePath} height`);
}

for (const size of [16, 32, 48, 128]) assertPng(`assets/icon-${size}.png`, size);
assertPng("store-assets/icon-128.png", 128);
assertPng("store-assets/promo-small-440x280.png", 440, 280);
assertPng("store-assets/screenshot-application-helper-1280x800.png", 1280, 800);
assertPng("store-assets/screenshot-onboarding-1280x800.png", 1280, 800);

for (const htmlFile of ["popup/popup.html", "onboarding/onboarding.html"]) {
  const html = fs.readFileSync(path.join(extensionDir, htmlFile), "utf8");
  assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${htmlFile} contains an inline script`);
  assert(!/\son\w+\s*=/i.test(html), `${htmlFile} contains an inline event handler`);
}

for (const requiredPath of [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap((entry) => entry.js || []),
  ...manifest.web_accessible_resources.flatMap((entry) => entry.resources || []),
]) {
  assert(fs.existsSync(path.join(extensionDir, requiredPath)), `Missing manifest file: ${requiredPath}`);
}

for (const [relativePath, expectedText] of [
  ["frontend/src/App.jsx", 'path="/extension-demo"'],
  ["frontend/scripts/prerender.js", 'url: "/extension-demo"'],
  ["frontend/src/pages/PrivacyPage.jsx", 'id="browser-extension"'],
  ["frontend/src/pages/ExtensionDemoPage.jsx", "data-jobassist-apply"],
  ["frontend/e2e/extension-demo.spec.js", "public extension demo"],
]) {
  const contents = readRepositoryFile(relativePath);
  assert(contents.includes(expectedText), `Missing public extension integration in ${relativePath}`);
}

for (const relativePath of [
  "store-listing/de-DE.md",
  "store-listing/privacy-and-permissions.md",
  "store-listing/reviewer-instructions.md",
  "store-listing/release-checklist.md",
]) {
  assert(fs.existsSync(path.join(extensionDir, relativePath)), `Missing store submission document: ${relativePath}`);
}

console.log(`Release validation passed for JobAssist Bewerbungshelfer ${manifest.version}, including public website integration.`);
