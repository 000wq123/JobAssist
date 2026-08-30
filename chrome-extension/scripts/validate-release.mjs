import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(extensionDir, relativePath), "utf8"));
const manifest = readJson("manifest.json");

assert.equal(manifest.manifest_version, 3, "Manifest V3 is required");
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, "Version must use x.y.z format");
assert.deepEqual(
  [...manifest.permissions].sort(),
  ["activeTab", "scripting", "storage"].sort(),
  "Only the reviewed runtime permissions may be required",
);

const serializedManifest = JSON.stringify(manifest);
for (const forbidden of ["<all_urls>", "https://*/*", "http://*/*"]) {
  assert(!serializedManifest.includes(forbidden), `Forbidden broad host access: ${forbidden}`);
}

const matches = manifest.content_scripts.flatMap((entry) => entry.matches || []);
assert.deepEqual(matches.sort(), ["https://jobassist.tech/*", "https://www.jobassist.tech/*"].sort());

const germanMessages = readJson("_locales/de/messages.json");
const description = germanMessages.extensionDescription.message;
assert(description.length <= 132, `Description is ${description.length} characters; Chrome allows 132`);

function assertPng(relativePath, expectedSize) {
  const filePath = path.join(extensionDir, relativePath);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${relativePath} must be PNG`);
  assert.equal(bytes.readUInt32BE(16), expectedSize, `${relativePath} width`);
  assert.equal(bytes.readUInt32BE(20), expectedSize, `${relativePath} height`);
}

for (const size of [16, 32, 48, 128]) assertPng(`assets/icon-${size}.png`, size);

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
]) {
  assert(fs.existsSync(path.join(extensionDir, requiredPath)), `Missing manifest file: ${requiredPath}`);
}

console.log(`Release validation passed for JobAssist Bewerbungshelfer ${manifest.version}.`);
