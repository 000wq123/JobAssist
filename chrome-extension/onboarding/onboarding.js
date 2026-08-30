const PROFILE_KEY = "applicantProfile";
const CONSENT_KEY = "profileConsentAt";
const form = document.getElementById("onboarding-form");
const status = document.getElementById("status");

async function initialize() {
  const stored = await chrome.storage.local.get([PROFILE_KEY, CONSENT_KEY]);
  const profile = stored[PROFILE_KEY] || {};
  for (const [key, value] of Object.entries(profile)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value || "";
  }
  document.getElementById("profile-consent").checked = Boolean(stored[CONSENT_KEY]);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = Object.fromEntries(new FormData(form).entries());
  await chrome.storage.local.set({
    [PROFILE_KEY]: profile,
    [CONSENT_KEY]: new Date().toISOString(),
  });
  status.textContent = "Gespeichert. JobAssist kann dich jetzt beim Ausfüllen unterstützen.";
  window.setTimeout(() => {
    window.location.href = "https://www.jobassist.tech/jobs?tab=finden";
  }, 900);
});

initialize();
