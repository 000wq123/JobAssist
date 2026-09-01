(() => {
const ROOT_ID = "jobassist-extension-root";
const OPEN_EVENT = "jobassist-extension-open";
const PROFILE_KEY = "applicantProfile";
const APPLICATION_KEY = "activeApplication";
const APPLICATION_MAX_AGE = 12 * 60 * 60 * 1000;
const MIN_CONFIDENCE = 62;

const FIELD_RULES = [
  { key: "firstName", label: "Vorname", autocomplete: ["given-name"], terms: ["vorname", "first name", "firstname", "given name"] },
  { key: "lastName", label: "Nachname", autocomplete: ["family-name"], terms: ["nachname", "familienname", "last name", "lastname", "surname", "family name"] },
  { key: "fullName", label: "Vollständiger Name", autocomplete: ["name"], terms: ["vollständiger name", "vollstaendiger name", "full name", "your name"] },
  { key: "email", label: "E-Mail", autocomplete: ["email"], terms: ["e-mail", "email", "mailadresse", "email address"] },
  { key: "phoneCountryCode", label: "Telefonvorwahl", autocomplete: ["tel-country-code"], terms: ["ländervorwahl", "landervorwahl", "country code", "dialling code"] },
  { key: "phoneNational", label: "Telefonnummer", autocomplete: ["tel-national"], terms: ["nationale telefonnummer", "national phone", "local phone"] },
  { key: "phone", label: "Telefon", autocomplete: ["tel"], terms: ["telefon", "telefonnummer", "phone", "phone number", "mobile number", "mobilnummer"] },
  { key: "address", label: "Straße und Hausnummer", autocomplete: ["street-address", "address-line1"], terms: ["straße und hausnummer", "strasse und hausnummer", "street address", "address line 1", "anschrift"] },
  { key: "street", label: "Straße", autocomplete: [], exactTerms: ["straße", "strasse", "street"], terms: ["straßenname", "strassenname", "street name"] },
  { key: "houseNumber", label: "Hausnummer", autocomplete: [], terms: ["hausnummer", "house number", "street number"] },
  { key: "postalCode", label: "Postleitzahl", autocomplete: ["postal-code"], terms: ["postleitzahl", "postal code", "postcode", "zip code", "plz"] },
  { key: "city", label: "Ort", autocomplete: ["address-level2"], exactTerms: ["ort"], terms: ["wohnort", "stadt", "city", "town"] },
  { key: "country", label: "Land", autocomplete: ["country", "country-name"], terms: ["wohnland", "country", "land"] },
  { key: "birthDate", label: "Geburtsdatum", autocomplete: ["bday"], terms: ["geburtsdatum", "date of birth", "birth date", "birthday"] },
  { key: "linkedin", label: "LinkedIn", autocomplete: [], terms: ["linkedin profil", "linkedin profile", "linkedin url", "linkedin"] },
  { key: "coverLetter", label: "Anschreiben", autocomplete: [], terms: ["anschreiben", "motivationsschreiben", "cover letter", "motivation letter"] },
];

const LEGAL_TERMS = [
  "consent", "zustimmung", "einwilligung", "datenschutz", "privacy", "terms",
  "bedingungen", "agb", "newsletter", "marketing", "captcha", "robot",
];

if (globalThis.__jobAssistApplicationHelperLoaded && document.getElementById(ROOT_ID)) {
  window.dispatchEvent(new Event(OPEN_EVENT));
  return;
}
globalThis.__jobAssistApplicationHelperLoaded = true;

let currentProposals = [];
let lastChanges = [];
let hasScanned = false;
let rescanTimer = null;
let proposalSequence = 0;
let renderProposalList = () => {};
const observedRoots = new WeakSet();
const frameListeners = new WeakSet();

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTerm(text, term) {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedText || !normalizedTerm) return false;
  if (normalizedTerm.length <= 4) return normalizedText.split(" ").includes(normalizedTerm);
  return normalizedText.includes(normalizedTerm);
}

function textFromIds(field, attribute) {
  const ids = String(field.getAttribute(attribute) || "").split(/\s+/).filter(Boolean);
  return ids.map((id) => field.ownerDocument.getElementById(id)?.textContent || "").join(" ");
}

function fieldSignals(field) {
  const labelParts = [
    ...Array.from(field.labels || []).map((label) => label.textContent || ""),
    field.closest?.("label")?.textContent || "",
    textFromIds(field, "aria-labelledby"),
  ].map((part) => String(part).replace(/\s+/g, " ").trim()).filter(Boolean);
  const labels = labelParts.filter((part, index) => (
    labelParts.findIndex((candidate) => normalize(candidate) === normalize(part)) === index
  )).join(" ");
  const legend = field.closest?.("fieldset")?.querySelector("legend")?.textContent || "";
  return [
    { kind: "autocomplete", text: field.getAttribute("autocomplete"), weight: 100 },
    { kind: "label", text: labels, weight: 86 },
    { kind: "aria", text: `${field.getAttribute("aria-label") || ""} ${textFromIds(field, "aria-describedby")}`, weight: 80 },
    { kind: "identity", text: `${field.getAttribute("name") || ""} ${field.id || ""}`, weight: 76 },
    { kind: "placeholder", text: field.getAttribute("placeholder"), weight: 68 },
    { kind: "fieldset", text: legend, weight: 52 },
  ].filter((signal) => normalize(signal.text));
}

function readableFieldLabel(field) {
  const signals = fieldSignals(field);
  const preferred = signals.find((signal) => signal.kind === "label")
    || signals.find((signal) => signal.kind === "aria")
    || signals.find((signal) => signal.kind === "placeholder")
    || signals.find((signal) => signal.kind === "identity");
  return String(preferred?.text || field.tagName || "Feld").replace(/\s+/g, " ").trim().slice(0, 90);
}

function profileValue(key, profile, application) {
  if (key === "fullName") return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  if (key === "coverLetter") return application.coverLetter || "";
  const addressMatch = String(profile.address || "").trim().match(/^(.*?)[,\s]+(\d+[a-zA-Z]?(?:[\/-]\d+[a-zA-Z]?)?)$/);
  if (key === "street") return addressMatch?.[1] || profile.address || "";
  if (key === "houseNumber") return addressMatch?.[2] || "";
  const callingCodes = { osterreich: "+43", austria: "+43", deutschland: "+49", germany: "+49", schweiz: "+41", switzerland: "+41" };
  const callingCode = callingCodes[normalize(profile.country)] || String(profile.phone || "").match(/^\s*(\+\d{1,3})\b/)?.[1] || "";
  if (key === "phoneCountryCode") return callingCode;
  if (key === "phoneNational") return String(profile.phone || "").replace(callingCode, "").trim();
  return profile[key] || "";
}

function scoreRule(rule, signals) {
  let score = 0;
  let reason = "";
  for (const signal of signals) {
    const normalizedText = normalize(signal.text);
    if (signal.kind === "autocomplete" && rule.autocomplete.some((value) => normalizedText === normalize(value))) {
      if (signal.weight > score) { score = signal.weight; reason = "Browser-Feldtyp"; }
      continue;
    }
    if (signal.kind === "autocomplete") continue;
    if ((rule.exactTerms || []).some((term) => normalizedText === normalize(term)) && signal.weight > score) {
      score = signal.weight;
      reason = signal.kind === "label" ? "Beschriftung" : signal.kind === "identity" ? "Feldname" : "Feldhinweis";
      continue;
    }
    if (rule.terms.some((term) => matchesTerm(normalizedText, term)) && signal.weight > score) {
      score = signal.weight;
      reason = signal.kind === "label" ? "Beschriftung" : signal.kind === "identity" ? "Feldname" : "Feldhinweis";
    }
  }
  return { score, reason };
}

function controlKind(field) {
  const tag = field.tagName?.toLowerCase();
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (field.isContentEditable) return "contenteditable";
  if (field.getAttribute?.("role") === "combobox" && tag !== "input") return "custom";
  return String(field.type || "text").toLowerCase();
}

function fieldValue(field) {
  if (field.isContentEditable) return field.textContent || "";
  if (["checkbox", "radio"].includes(controlKind(field))) return field.checked ? "checked" : "";
  return field.value || "";
}

function isInsideAssistant(field) {
  return Boolean(field.closest?.(`#${ROOT_ID}`));
}

function isLegalControl(field, label) {
  if (!["checkbox", "radio"].includes(controlKind(field))) return false;
  return LEGAL_TERMS.some((term) => matchesTerm(label, term));
}

function optionForValue(select, value) {
  const wanted = normalize(value);
  if (!wanted) return null;
  const countryAliases = {
    osterreich: ["osterreich", "austria", "at"],
    austria: ["osterreich", "austria", "at"],
    deutschland: ["deutschland", "germany", "de"],
    germany: ["deutschland", "germany", "de"],
    schweiz: ["schweiz", "switzerland", "suisse", "svizzera", "ch"],
    switzerland: ["schweiz", "switzerland", "suisse", "svizzera", "ch"],
  };
  const accepted = new Set(countryAliases[wanted] || [wanted]);
  const options = Array.from(select.options || []);
  return options.find((option) => accepted.has(normalize(option.value)))
    || options.find((option) => accepted.has(normalize(option.textContent)))
    || options.find((option) => [...accepted].some((candidate) => normalize(option.textContent).includes(candidate)));
}

function classifyField(field, profile, application) {
  if (!field || isInsideAssistant(field) || field.disabled || field.readOnly) return null;
  if (field.closest?.("[hidden], [aria-hidden='true']") || field.getClientRects?.().length === 0) return null;
  const kind = controlKind(field);
  const label = readableFieldLabel(field);
  if (["hidden", "password", "submit", "button", "reset", "image"].includes(kind)) return null;
  if (fieldValue(field).trim()) return null;

  if (kind === "file") {
    return { status: "manual", label, message: "Datei bitte selbst auswählen", selected: false };
  }
  if (isLegalControl(field, label)) return null;
  if (["checkbox", "radio", "custom"].includes(kind)) {
    return { status: "unsupported", label, message: "Manuelle Auswahl erforderlich", selected: false };
  }

  const signals = fieldSignals(field);
  const candidates = FIELD_RULES
    .map((rule) => ({ rule, ...scoreRule(rule, signals), value: profileValue(rule.key, profile, application) }))
    .filter((candidate) => candidate.score > 0 && String(candidate.value || "").trim())
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const second = candidates[1];

  if (!best) {
    return { status: "unknown", label, message: "Nicht sicher erkannt", selected: false };
  }
  if (best.score < MIN_CONFIDENCE || (second && best.score - second.score < 12)) {
    return { status: "ambiguous", label, message: "Bitte manuell prüfen", selected: false };
  }
  if (kind === "select" && !optionForValue(field, best.value)) {
    return { status: "unsupported", label, message: `${best.rule.label}: keine passende Option`, selected: false };
  }

  return {
    status: "ready",
    key: best.rule.key,
    label,
    mappedLabel: best.rule.label,
    value: String(best.value),
    confidence: best.score,
    reason: best.reason,
    selected: true,
  };
}

function rootsFromDocument(doc, roots, diagnostics) {
  if (!doc?.documentElement || roots.some((entry) => entry.root === doc)) return;
  roots.push({ root: doc });

  const walk = (node) => {
    for (const element of node.querySelectorAll?.("*") || []) {
      if (element.shadowRoot) {
        roots.push({ root: element.shadowRoot });
        walk(element.shadowRoot);
      }
    }
  };
  walk(doc);

  for (const frame of doc.querySelectorAll("iframe, frame")) {
    if (!frameListeners.has(frame)) {
      frameListeners.add(frame);
      frame.addEventListener("load", scheduleRescan);
    }
    try {
      const frameDocument = frame.contentDocument;
      if (frameDocument?.documentElement) rootsFromDocument(frameDocument, roots, diagnostics);
      else diagnostics.protectedFrames += 1;
    } catch {
      diagnostics.protectedFrames += 1;
    }
  }
}

function collectControls(root) {
  return Array.from(root.querySelectorAll(
    "input, textarea, select, [contenteditable='true'], [role='combobox']",
  ));
}

function scanApplication(profile, application) {
  const roots = [];
  const diagnostics = { protectedFrames: 0, files: 0 };
  rootsFromDocument(document, roots, diagnostics);
  const seen = new Set();
  const proposals = [];

  for (const { root } of roots) {
    observeRoot(root);
    for (const field of collectControls(root)) {
      if (seen.has(field)) continue;
      seen.add(field);
      const classification = classifyField(field, profile, application);
      if (!classification) continue;
      if (classification.status === "manual") diagnostics.files += 1;
      proposals.push({ id: `jae-proposal-${++proposalSequence}`, field, ...classification });
    }
  }

  return { proposals, diagnostics };
}

function nativeValueSetter(field) {
  const win = field.ownerDocument?.defaultView || window;
  const tag = field.tagName?.toLowerCase();
  const prototype = tag === "textarea" ? win.HTMLTextAreaElement?.prototype
    : tag === "select" ? win.HTMLSelectElement?.prototype
      : win.HTMLInputElement?.prototype;
  return Object.getOwnPropertyDescriptor(prototype || {}, "value")?.set;
}

function dispatchFieldEvents(field) {
  const win = field.ownerDocument?.defaultView || window;
  field.dispatchEvent(new win.Event("input", { bubbles: true, composed: true }));
  field.dispatchEvent(new win.Event("change", { bubbles: true, composed: true }));
}

function snapshotField(field) {
  return {
    field,
    value: "value" in field ? field.value : undefined,
    checked: "checked" in field ? field.checked : undefined,
    selectedIndex: "selectedIndex" in field ? field.selectedIndex : undefined,
    textContent: field.isContentEditable ? field.textContent : undefined,
    backgroundColor: field.style.backgroundColor,
    outline: field.style.outline,
    outlineOffset: field.style.outlineOffset,
  };
}

function setFieldValue(field, value) {
  const kind = controlKind(field);
  if (kind === "select") {
    const option = optionForValue(field, value);
    if (!option) return false;
    nativeValueSetter(field)?.call(field, option.value);
  } else if (kind === "contenteditable") {
    field.textContent = value;
  } else {
    const setter = nativeValueSetter(field);
    if (!setter) return false;
    setter.call(field, value);
  }
  dispatchFieldEvents(field);
  field.style.backgroundColor = "rgba(227, 6, 19, 0.06)";
  field.style.outline = "2px solid rgba(227, 6, 19, 0.22)";
  field.style.outlineOffset = "1px";
  return true;
}

function restoreField(change) {
  const { field } = change;
  if (!field?.isConnected) return;
  if (field.isContentEditable) field.textContent = change.textContent || "";
  else if (change.value !== undefined) nativeValueSetter(field)?.call(field, change.value);
  if (change.checked !== undefined) field.checked = change.checked;
  if (change.selectedIndex !== undefined && controlKind(field) === "select") field.selectedIndex = change.selectedIndex;
  field.style.backgroundColor = change.backgroundColor;
  field.style.outline = change.outline;
  field.style.outlineOffset = change.outlineOffset;
  dispatchFieldEvents(field);
}

function button(label, className = "jae-button") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function brandImage(className, alt = "") {
  const image = document.createElement("img");
  image.className = className;
  image.src = chrome.runtime.getURL("assets/icon-48.png");
  image.alt = alt;
  image.width = 48;
  image.height = 48;
  return image;
}

function mutationComesFromAssistant(mutation) {
  const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
  return Boolean(target?.closest?.(`#${ROOT_ID}`));
}

function observeRoot(root) {
  if (!root || observedRoots.has(root)) return;
  observedRoots.add(root);
  const observer = new MutationObserver((mutations) => {
    if (!hasScanned || mutations.every(mutationComesFromAssistant)) return;
    scheduleRescan();
  });
  const target = root.nodeType === 9 ? root.documentElement : root;
  if (target) observer.observe(target, { childList: true, subtree: true });
}

function scheduleRescan() {
  if (!hasScanned) return;
  clearTimeout(rescanTimer);
  rescanTimer = setTimeout(() => renderProposalList({ announce: true }), 180);
}

function renderAssistant(application, profile) {
  document.getElementById(ROOT_ID)?.remove();

  const root = document.createElement("div");
  root.id = ROOT_ID;
  const launcher = button("Bewerbung helfen", "jae-launcher");
  launcher.prepend(brandImage("jae-launcher-logo"));
  launcher.hidden = true;
  const panel = document.createElement("section");
  panel.className = "jae-panel";
  panel.setAttribute("aria-label", "JobAssist Bewerbungshelfer");

  const header = document.createElement("header");
  header.className = "jae-header";
  const mark = brandImage("jae-mark", "JobAssist");
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
  label.textContent = "Sicher ausfüllen";
  const copy = document.createElement("p");
  copy.className = "jae-copy";
  copy.textContent = "Prüfe zuerst die erkannten Felder. Bestehende Eingaben bleiben unverändert und nichts wird automatisch abgesendet.";
  const scan = button("Felder prüfen", "jae-button jae-button-primary");
  scan.classList.add("jae-scan-button");

  const review = document.createElement("div");
  review.className = "jae-review";
  review.hidden = true;
  const summary = document.createElement("p");
  summary.className = "jae-review-summary";
  summary.setAttribute("aria-live", "polite");
  const proposalList = document.createElement("div");
  proposalList.className = "jae-proposal-list";
  const reviewActions = document.createElement("div");
  reviewActions.className = "jae-review-actions";
  const rescan = button("Neu prüfen");
  const fill = button("Ausgewählte Felder ausfüllen", "jae-button jae-button-primary");
  reviewActions.append(rescan, fill);
  review.append(summary, proposalList, reviewActions);

  const secondaryActions = document.createElement("div");
  secondaryActions.className = "jae-secondary-actions";
  const resume = button("Lebenslauf-Feld zeigen");
  const copyLetter = button("Anschreiben kopieren");
  copyLetter.disabled = !application.coverLetter;
  const undo = button("Letzte Änderungen rückgängig");
  undo.hidden = true;
  secondaryActions.append(resume, copyLetter, undo);
  const status = document.createElement("p");
  status.className = "jae-status";
  status.setAttribute("aria-live", "polite");
  section.append(label, copy, scan, review, secondaryActions, status);

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

  renderProposalList = ({ announce = false } = {}) => {
    const { proposals, diagnostics } = scanApplication(profile, application);
    currentProposals = proposals;
    hasScanned = true;
    proposalList.replaceChildren();
    review.hidden = false;
    scan.hidden = true;

    const readyCount = proposals.filter((proposal) => proposal.status === "ready").length;
    const manualCount = proposals.length - readyCount;
    summary.textContent = `${readyCount} sicher erkannt${manualCount ? ` · ${manualCount} manuell prüfen` : ""}${diagnostics.protectedFrames ? ` · ${diagnostics.protectedFrames} geschützter Frame` : ""}`;
    fill.disabled = readyCount === 0;

    if (!proposals.length) {
      const empty = document.createElement("p");
      empty.className = "jae-empty-review";
      empty.textContent = "Auf diesem Schritt wurden keine leeren Formularfelder gefunden.";
      proposalList.append(empty);
    }

    for (const proposal of proposals) {
      const row = document.createElement("label");
      row.className = `jae-proposal jae-proposal-${proposal.status}`;
      row.dataset.jaeProposal = proposal.status;
      row.dataset.proposalId = proposal.id;

      if (proposal.status === "ready") {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = proposal.selected;
        checkbox.setAttribute("aria-label", `${proposal.label} ausfüllen`);
        checkbox.addEventListener("change", () => {
          proposal.selected = checkbox.checked;
          fill.disabled = !currentProposals.some((item) => item.status === "ready" && item.selected);
        });
        row.append(checkbox);
      } else {
        const marker = document.createElement("span");
        marker.className = "jae-proposal-marker";
        marker.textContent = "!";
        marker.setAttribute("aria-hidden", "true");
        row.append(marker);
      }

      const details = document.createElement("span");
      details.className = "jae-proposal-details";
      const fieldName = document.createElement("strong");
      fieldName.textContent = proposal.label;
      const mapping = document.createElement("span");
      mapping.textContent = proposal.status === "ready"
        ? `${proposal.mappedLabel} · sicher erkannt`
        : proposal.message;
      details.append(fieldName, mapping);
      row.append(details);
      proposalList.append(row);
    }

    if (announce) status.textContent = "Neue oder geänderte Felder wurden erneut geprüft.";
  };

  launcher.addEventListener("click", () => { launcher.hidden = true; panel.hidden = false; });
  close.addEventListener("click", () => { panel.hidden = true; launcher.hidden = false; });
  scan.addEventListener("click", () => renderProposalList());
  rescan.addEventListener("click", () => renderProposalList({ announce: true }));
  fill.addEventListener("click", () => {
    const selected = currentProposals.filter((proposal) => proposal.status === "ready" && proposal.selected);
    const changes = [];
    let firstFilled = null;
    for (const proposal of selected) {
      if (!proposal.field?.isConnected || fieldValue(proposal.field).trim()) continue;
      const snapshot = snapshotField(proposal.field);
      if (!setFieldValue(proposal.field, proposal.value)) continue;
      changes.push(snapshot);
      firstFilled ||= proposal.field;
    }
    lastChanges = changes;
    undo.hidden = changes.length === 0;
    if (changes.length) fill.disabled = true;
    status.textContent = changes.length
      ? `${changes.length} ${changes.length === 1 ? "Feld" : "Felder"} ausgefüllt. Bitte alles prüfen.`
      : "Keine ausgewählten leeren Felder konnten ausgefüllt werden.";
    firstFilled?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  undo.addEventListener("click", () => {
    lastChanges.slice().reverse().forEach(restoreField);
    const restored = lastChanges.length;
    lastChanges = [];
    undo.hidden = true;
    status.textContent = restored ? `${restored} Änderungen rückgängig gemacht.` : "Keine Änderungen zum Rückgängigmachen.";
    renderProposalList();
  });
  resume.addEventListener("click", () => {
    const roots = [];
    rootsFromDocument(document, roots, { protectedFrames: 0, files: 0 });
    const files = roots.flatMap(({ root: scanRoot }) => Array.from(scanRoot.querySelectorAll("input[type='file']")));
    files.forEach((input) => {
      input.classList.add("jae-file-target");
      input.style.outline = "3px solid rgba(227, 6, 19, .34)";
      input.style.outlineOffset = "3px";
    });
    files[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
    status.textContent = files.length ? "Das Upload-Feld ist markiert. Wähle deinen Lebenslauf dort aus." : "Auf dieser Seite wurde kein Datei-Upload gefunden.";
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

  observeRoot(document);
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
