(() => {
const ROOT_ID = "jobassist-extension-root";
const OPEN_EVENT = "jobassist-extension-open";
const PROFILE_KEY = "applicantProfile";
const APPLICATION_KEY = "activeApplication";
const APPLICATION_MAX_AGE = 12 * 60 * 60 * 1000;

const FIELD_RULES = [
  { key: "firstName", terms: ["given-name", "firstname", "first name", "vorname"] },
  { key: "lastName", terms: ["family-name", "lastname", "last name", "nachname", "familienname"] },
  { key: "email", terms: ["email", "e-mail", "mailadresse"] },
  { key: "phone", terms: ["tel", "phone", "telefon", "mobil"] },
  { key: "address", terms: ["street-address", "address", "straße", "strasse", "anschrift"] },
  { key: "postalCode", terms: ["postal-code", "postcode", "zip", "plz"] },
  { key: "city", terms: ["address-level2", "city", "stadt", "ort"] },
  { key: "linkedin", terms: ["linkedin"] },
];

if (globalThis.__jobAssistApplicationHelperLoaded && document.getElementById(ROOT_ID)) {
  window.dispatchEvent(new Event(OPEN_EVENT));
  return;
}
globalThis.__jobAssistApplicationHelperLoaded = true;

function fieldDescription(field) {
  const labels = Array.from(field.labels || []).map((label) => label.textContent || "");
  return [
    field.getAttribute("autocomplete"), field.getAttribute("name"), field.id,
    field.getAttribute("aria-label"), field.getAttribute("placeholder"), ...labels,
  ].filter(Boolean).join(" ").toLowerCase();
}

function setNativeValue(field, value) {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillFields(profile, coverLetter) {
  let filled = 0;
  const fields = Array.from(document.querySelectorAll("input:not([type='hidden']):not([disabled]), textarea:not([disabled])"));

  for (const field of fields) {
    if (["file", "password", "checkbox", "radio"].includes(field.type) || field.value?.trim()) continue;
    const description = fieldDescription(field);
    const rule = FIELD_RULES.find((candidate) => candidate.terms.some((term) => description.includes(term)));
    let value = rule ? profile[rule.key] : "";
    if (!value && field instanceof HTMLTextAreaElement && /(cover|motivation|anschreiben|message|nachricht)/.test(description)) {
      value = coverLetter || "";
    }
    if (!value) continue;
    setNativeValue(field, value);
    field.style.backgroundColor = "rgba(227, 6, 19, 0.06)";
    filled += 1;
  }
  return filled;
}

function highlightResumeUpload() {
  const inputs = Array.from(document.querySelectorAll("input[type='file']"));
  inputs.forEach((input) => {
    input.classList.add("jae-file-target");
    input.closest("label, div")?.classList.add("jae-file-target");
  });
  inputs[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
  return inputs.length;
}

function button(label, className = "jae-button") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function renderAssistant(application, profile) {
  document.getElementById(ROOT_ID)?.remove();

  const root = document.createElement("div");
  root.id = ROOT_ID;
  const launcher = button("JA  Bewerbung helfen", "jae-launcher");
  launcher.hidden = true;
  const panel = document.createElement("section");
  panel.className = "jae-panel";
  panel.setAttribute("aria-label", "JobAssist Bewerbungshelfer");

  const header = document.createElement("header");
  header.className = "jae-header";
  const mark = document.createElement("span");
  mark.className = "jae-mark";
  mark.textContent = "JA";
  const heading = document.createElement("div");
  heading.className = "jae-heading";
  const title = document.createElement("strong");
  title.textContent = application.title || "Bewerbung";
  const company = document.createElement("span");
  company.textContent = application.company || location.hostname;
  heading.append(title, company);
  const close = button("×", "jae-icon-button");
  close.setAttribute("aria-label", "Bewerbungshelfer einklappen");
  header.append(mark, heading, close);

  const section = document.createElement("div");
  section.className = "jae-section";
  const label = document.createElement("p");
  label.className = "jae-label";
  label.textContent = "Auf dieser Seite";
  const copy = document.createElement("p");
  copy.className = "jae-copy";
  copy.textContent = "Fülle erkannte leere Felder aus. JobAssist sendet das Formular niemals automatisch ab.";
  const actions = document.createElement("div");
  actions.className = "jae-actions";
  const fill = button("Leere Felder ausfüllen", "jae-button jae-button-primary");
  const resume = button("Lebenslauf-Feld zeigen");
  const copyLetter = button("Anschreiben kopieren");
  copyLetter.disabled = !application.coverLetter;
  actions.append(fill, resume, copyLetter);
  const status = document.createElement("p");
  status.className = "jae-status";
  status.setAttribute("aria-live", "polite");
  section.append(label, copy, actions, status);

  const footer = document.createElement("footer");
  footer.className = "jae-footer";
  const back = document.createElement("a");
  back.className = "jae-button";
  back.href = application.jobAssistUrl || "https://www.jobassist.tech/jobs";
  back.target = "_blank";
  back.rel = "noopener noreferrer";
  back.textContent = "Zurück zu JobAssist";
  const done = button("Helfer beenden");
  footer.append(back, done);

  panel.append(header, section, footer);
  root.append(launcher, panel);
  document.documentElement.append(root);

  launcher.addEventListener("click", () => { launcher.hidden = true; panel.hidden = false; });
  close.addEventListener("click", () => { panel.hidden = true; launcher.hidden = false; });
  fill.addEventListener("click", () => {
    const count = fillFields(profile, application.coverLetter);
    status.textContent = count ? `${count} leere${count === 1 ? "s Feld" : " Felder"} ausgefüllt. Bitte alles prüfen.` : "Keine passenden leeren Felder gefunden.";
  });
  resume.addEventListener("click", () => {
    const count = highlightResumeUpload();
    status.textContent = count ? "Das Upload-Feld ist markiert. Chrome erlaubt kein automatisches Einsetzen einer Datei." : "Auf dieser Seite wurde kein Datei-Upload gefunden.";
  });
  copyLetter.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(application.coverLetter || "");
      status.textContent = "Anschreiben kopiert.";
    } catch {
      status.textContent = "Kopieren wurde von dieser Seite blockiert. Öffne das Anschreiben in JobAssist.";
    }
  });
  done.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "APPLICATION_FINISHED" });
    root.hidden = true;
  });
}

async function initialize() {
  const stored = await chrome.storage.local.get([PROFILE_KEY, APPLICATION_KEY]);
  const application = stored[APPLICATION_KEY];
  if (!application) return;
  if (Date.now() - Number(application.startedAt || 0) > APPLICATION_MAX_AGE) {
    await chrome.storage.local.remove(APPLICATION_KEY);
    return;
  }
  renderAssistant(application, stored[PROFILE_KEY] || {});
}

// The employer tab can finish loading a fraction before the JobAssist click is
// persisted. React to that write as well as the initial read so the helper is
// reliable even on very fast pages.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[APPLICATION_KEY]) return;
  const application = changes[APPLICATION_KEY].newValue;
  if (!application) {
    const root = document.getElementById(ROOT_ID);
    if (root) root.hidden = true;
    return;
  }
  chrome.storage.local.get(PROFILE_KEY).then((stored) => {
    renderAssistant(application, stored[PROFILE_KEY] || {});
  });
});

window.addEventListener(OPEN_EVENT, () => {
  const root = document.getElementById(ROOT_ID);
  const launcher = document.querySelector(`#${ROOT_ID} .jae-launcher`);
  const panel = document.querySelector(`#${ROOT_ID} .jae-panel`);
  if (!root || !launcher || !panel) return;
  root.hidden = false;
  panel.hidden = false;
  launcher.hidden = true;
});

initialize();
})();
