import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "../../frontend/node_modules/@playwright/test/index.mjs";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(extensionDir, "store-assets/screenshot-application-helper-1280x800.png");
const onboardingOutput = path.join(extensionDir, "store-assets/screenshot-onboarding-1280x800.png");
const browser = await chromium.launch({ headless: true, channel: "chromium" });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  await page.setContent(`<!doctype html>
    <html lang="de"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box} body{margin:0;background:#0f0f13;color:#f4f4f5;font-family:Inter,system-ui,sans-serif}
      header{height:64px;display:flex;align-items:center;padding:0 52px;border-bottom:1px solid #2a2a31;background:#141419}
      .brand{display:flex;align-items:center;gap:11px;font-weight:750}.brand-mark{display:grid;width:32px;height:32px;place-items:center;border-radius:9px;background:#e30613;font-size:11px;font-weight:900}
      main{width:760px;margin:34px 0 80px 68px}.crumb{color:#8d8d98;font-size:12px}.card{margin-top:22px;padding:30px;border:1px solid #2d2d35;border-radius:18px;background:#16161c;box-shadow:0 20px 60px rgba(0,0,0,.2)}
      .label{color:#e30613;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}h1{margin:8px 0 4px;font-size:29px;letter-spacing:-.03em}.company{margin:0;color:#a1a1aa;font-size:13px}
      form{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}label{display:grid;gap:7px;color:#b7b7c0;font-size:11px;font-weight:650}.wide{grid-column:1/-1}
      input,textarea{width:100%;height:42px;padding:0 12px;border:1px solid #34343d;border-radius:10px;background:#101014;color:#f4f4f5;font:inherit}textarea{height:105px;padding-top:11px;resize:none}.upload{height:64px;padding:19px;border:1px dashed #44444f;border-radius:10px;color:#8d8d98;font-size:12px}
      .submit{grid-column:1/-1;height:44px;border:0;border-radius:10px;background:#2a2a31;color:#888892;font-weight:700}
    </style></head><body>
      <header><div class="brand"><span class="brand-mark">BG</span>Beispiel GmbH Karriere</div></header>
      <main><p class="crumb">Offene Stellen / Junior Projektassistenz / Bewerbung</p>
        <section class="card"><p class="label">Bewerbungsformular</p><h1>Junior Projektassistenz</h1><p class="company">Beispiel GmbH · Wien</p>
          <form><label>Vorname<input name="firstName" autocomplete="given-name"></label><label>Nachname<input name="lastName" autocomplete="family-name"></label>
          <label class="wide">E-Mail<input name="email" type="email" autocomplete="email"></label><label class="wide">Telefon<input name="phone" type="tel" autocomplete="tel"></label>
          <label class="wide">Anschreiben<textarea name="coverLetter"></textarea></label><label class="wide">Lebenslauf<div class="upload">PDF auswählen</div></label><button class="submit" type="button">Bewerbung prüfen</button></form>
        </section></main>
    </body></html>`);

  await page.evaluate((iconUrl) => {
    const values = {
      applicantProfile: { firstName: "Anna", lastName: "Berger", email: "anna.berger@example.at" },
      activeApplication: {
        jobId: "demo",
        title: "Junior Projektassistenz",
        company: "Beispiel GmbH",
        jobAssistUrl: "https://www.jobassist.tech/extension-demo",
        coverLetter: "Sehr geehrte Damen und Herren, ich bewerbe mich als Junior Projektassistenz.",
        startedAt: Date.now(),
      },
    };
    const chromeApi = globalThis.chrome || {};
    Object.defineProperty(chromeApi, "storage", {
      configurable: true,
      value: {
        local: { get: async (keys) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, values[key]])), remove: async () => {} },
        onChanged: { addListener: () => {} },
      },
    });
    Object.defineProperty(chromeApi, "runtime", { configurable: true, value: { sendMessage: () => {}, getURL: () => iconUrl } });
  }, `data:image/png;base64,${fs.readFileSync(path.join(extensionDir, "assets/icon-48.png")).toString("base64")}`);
  await page.addStyleTag({ path: path.join(extensionDir, "content/application-assistant.css") });
  await page.addScriptTag({ path: path.join(extensionDir, "content/application-assistant.js") });
  await page.locator("#jobassist-extension-root .jae-panel").waitFor();
  await page.getByRole("button", { name: "Felder prüfen" }).click();
  await page.screenshot({ path: output });

  const onboarding = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
  await onboarding.goto(pathToFileURL(path.join(extensionDir, "onboarding/onboarding.html")).href);
  await onboarding.evaluate(() => { document.body.style.zoom = "0.70"; });
  await onboarding.screenshot({ path: onboardingOutput });
  console.log(`${output}\n${onboardingOutput}`);
} finally {
  await browser.close();
}
