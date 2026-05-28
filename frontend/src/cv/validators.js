/**
 * Per-step validation for the Lebenslauf wizard.
 * Each validator returns an object: { [fieldName]: "error message" }.
 * Empty object = valid.
 */

const PLZ_AT = /^\d{4}$/;
const TEL_AT = /^\+?\d[\d\s\-/()]{5,}$/;

/** @param {import("./profileSchema").CVProfile} p */
export function validatePersonal(p) {
  const e = {};
  if (!p.vorname?.trim()) e.vorname = "Vorname fehlt.";
  if (!p.nachname?.trim()) e.nachname = "Nachname fehlt.";
  if (p.plz && !PLZ_AT.test(p.plz)) {
    e.plz = "PLZ ist 4 Ziffern (z. B. 1010).";
  }
  if (p.telefon && !TEL_AT.test(p.telefon)) {
    e.telefon = "Bitte gültige Telefonnummer.";
  }
  return e;
}

/** @param {import("./profileSchema").CVProfile} p */
export function validateSchule(p) {
  const e = {};
  if (!p.schulname?.trim()) e.schulname = "Wie heißt deine Schule?";
  if (!p.schultyp) e.schultyp = "Bitte Schultyp wählen.";
  return e;
}

/** @param {import("./profileSchema").CVProfile} _p */
export function validateErfahrungen(_p) {
  // Erfahrungen are optional — empty is valid (handled with empty state copy).
  return {};
}

/** @param {import("./profileSchema").CVProfile} p */
export function validateSkills(p) {
  const e = {};
  if (!Array.isArray(p.sprachkenntnisse) || p.sprachkenntnisse.length === 0) {
    e.sprachkenntnisse = "Mindestens eine Sprache.";
  }
  return e;
}

/** @param {import("./profileSchema").CVProfile} _p */
export function validateInteressen(_p) {
  return {};
}

/** @param {import("./profileSchema").CVProfile} p */
export function validateSuche(p) {
  const e = {};
  if (!Array.isArray(p.jobArten) || p.jobArten.length === 0) {
    e.jobArten = "Wähle mindestens eine Job-Art.";
  }
  return e;
}

/** Map step id → validator. */
export const VALIDATORS = {
  personal: validatePersonal,
  schule: validateSchule,
  erfahrungen: validateErfahrungen,
  skills: validateSkills,
  interessen: validateInteressen,
  suche: validateSuche,
};

/**
 * Validate a single step.
 * @param {string} stepId
 * @param {import("./profileSchema").CVProfile} profile
 * @returns {Record<string,string>}
 */
export function validateStep(stepId, profile) {
  const fn = VALIDATORS[stepId];
  return fn ? fn(profile) : {};
}
