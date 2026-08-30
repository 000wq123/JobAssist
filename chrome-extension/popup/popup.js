const PROFILE_KEY = "applicantProfile";
const APPLICATION_KEY = "activeApplication";
const CONSENT_KEY = "profileConsentAt";
const APPLICATION_MAX_AGE = 12 * 60 * 60 * 1000;
const form = document.getElementById("profile-form");
const status = document.getElementById("status");
const applicationCard = document.getElementById("active-application");
const emptyApplication = document.getElementById("empty-application");
const consent = document.getElementById("profile-consent");

function profileFromForm() {
  return Object.fromEntries(new FormData(form).entries());
}

async function initialize() {
  const stored = await chrome.storage.local.get([PROFILE_KEY, APPLICATION_KEY, CONSENT_KEY]);
  const profile = stored[PROFILE_KEY] || {};
  for (const [key, value] of Object.entries(profile)) {
    if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value || "";
  }

  consent.checked = Boolean(stored[CONSENT_KEY]);

  let application = stored[APPLICATION_KEY];
  if (application && Date.now() - Number(application.startedAt || 0) > APPLICATION_MAX_AGE) {
    await chrome.storage.local.remove(APPLICATION_KEY);
    application = null;
  }
  if (application) {
    applicationCard.hidden = false;
    emptyApplication.hidden = true;
    document.getElementById("application-title").textContent = application.title || "Bewerbung";
    document.getElementById("application-company").textContent = application.company || "";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({
    [PROFILE_KEY]: profileFromForm(),
    [CONSENT_KEY]: new Date().toISOString(),
  });
  status.textContent = "Lokal gespeichert.";
  setTimeout(() => { status.textContent = ""; }, 1800);
});

document.getElementById("open-assistant").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (!/^https?:\/\//i.test(tab.url || "")) {
    status.textContent = "Chrome schützt diese Seite. Öffne das Bewerbungsformular in einem normalen Web-Tab.";
    return;
  }
  const isJobAssistPage = /^https?:\/\/(www\.)?jobassist\.tech\//i.test(tab.url || "");
  const isExtensionDemo = /^https?:\/\/(www\.)?jobassist\.tech\/extension-demo(?:\?|$)/i.test(tab.url || "");
  if (isJobAssistPage && !isExtensionDemo) {
    status.textContent = "Öffne zuerst die externe Bewerbungsseite und klicke dort erneut auf das Erweiterungssymbol.";
    return;
  }
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content/application-assistant.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/application-assistant.js"],
    });
    window.close();
  } catch {
    status.textContent = "Chrome schützt diese Seite. Öffne das Bewerbungsformular in einem normalen Web-Tab.";
  }
});

initialize();
