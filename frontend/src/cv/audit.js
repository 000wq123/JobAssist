/**
 * Konformitäts-Check — content audit for Austrian teen CVs.
 *
 * Each rule receives the profile and returns either null (rule skipped/inapplicable)
 * or an AuditResult object. The aggregator runs every rule and returns a list,
 * sorted by severity (fail → warn → info → ok).
 *
 * Why content not pixels: Austrian HR offices don't audit fonts. They audit
 * whether dates are reverse-chronological, whether your e-mail is professional,
 * whether your phone has +43, whether HAK/HTL students completed a Pflichtpraktikum.
 */

/**
 * @typedef {"ok"|"info"|"warn"|"fail"} AuditSeverity
 *
 * @typedef {Object} AuditResult
 * @property {string} id
 * @property {AuditSeverity} severity
 * @property {string} label
 * @property {string} [detail]   - optional one-line context shown under the label
 * @property {string} [fixHint]  - optional CTA copy ("Vorschläge ansehen →")
 */

const PHONE_OK = /^(\+43|0)\s?\d{2,4}[\s/-]?\d[\d\s/-]{4,}$/;
const PLZ_OK = /^\d{4}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;
/** Local-parts that scream "teen e-mail account". Heuristic, not exhaustive. */
const EMAIL_UNPROFESSIONAL = /(xx|xX|babe|cool|gamer|sexy|420|666|hotty|pussy|crazy)/i;
const ACTIVE_VERB_OPENERS = [
  "beriet", "betreute", "organisierte", "entwickelte", "verkaufte",
  "kassierte", "begleitete", "erstellte", "unterstützte", "präsentierte",
  "leitete", "plante", "koordinierte", "trainierte", "schulte",
  "programmierte", "designte", "übersetzte", "moderierte", "führte",
];
const PASSIVE_OPENERS = /^(war zuständig|war verantwortlich|hatte die aufgabe|musste|sollte)/i;

/** @param {string} s */
const trim = (s) => (typeof s === "string" ? s.trim() : "");

/**
 * Run all rules and return a sorted list.
 * @param {import("./profileSchema").CVProfile} p
 * @returns {AuditResult[]}
 */
export function runAudit(p) {
  const rules = [
    rulePhone, ruleEmail, rulePlz, ruleSprachenCEFR,
    ruleSchuleComplete, rulePflichtpraktikum, ruleErfahrungenPresent,
    ruleBulletsActive, ruleDateOrder, ruleFotoForBranche,
    ruleProfessionalName,
  ];
  const out = [];
  for (const r of rules) {
    const res = r(p);
    if (res) out.push(res);
  }
  // Sort: fail first, then warn, info, ok last.
  const order = { fail: 0, warn: 1, info: 2, ok: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Helper: count by severity. */
export function summarize(results) {
  const c = { ok: 0, info: 0, warn: 0, fail: 0 };
  for (const r of results) c[r.severity] += 1;
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual rules
// ─────────────────────────────────────────────────────────────────────────────

/** @param {import("./profileSchema").CVProfile} p */
function rulePhone(p) {
  const tel = trim(p.telefon);
  if (!tel) return { id: "phone", severity: "fail", label: "Telefonnummer fehlt" };
  if (!PHONE_OK.test(tel.replace(/\s+/g, " "))) {
    return {
      id: "phone",
      severity: "warn",
      label: "Telefonformat prüfen",
      detail: "AT-Standard: +43 664 1234567 oder 0664 1234567.",
    };
  }
  return { id: "phone", severity: "ok", label: "Telefon mit +43" };
}

/** @param {import("./profileSchema").CVProfile} p */
function ruleEmail(p) {
  const m = trim(p.email).toLowerCase();
  if (!m) return { id: "email", severity: "fail", label: "E-Mail-Adresse fehlt" };
  if (!EMAIL_OK.test(m)) {
    return { id: "email", severity: "fail", label: "E-Mail ungültig", detail: m };
  }
  if (EMAIL_UNPROFESSIONAL.test(m)) {
    return {
      id: "email",
      severity: "warn",
      label: "E-Mail wirkt unprofessionell",
      detail: "vorname.nachname@gmail.com ist HR-tauglicher.",
      fixHint: "Vorschläge ansehen →",
    };
  }
  return { id: "email", severity: "ok", label: "E-Mail wirkt professionell", detail: m };
}

/** @param {import("./profileSchema").CVProfile} p */
function rulePlz(p) {
  const z = trim(p.plz);
  if (!z) return { id: "plz", severity: "warn", label: "PLZ fehlt" };
  if (!PLZ_OK.test(z)) {
    return { id: "plz", severity: "fail", label: "PLZ muss vierstellig sein" };
  }
  return { id: "plz", severity: "ok", label: "PLZ vierstellig" };
}

/** @param {import("./profileSchema").CVProfile} p */
function ruleSprachenCEFR(p) {
  const langs = Array.isArray(p.sprachkenntnisse) ? p.sprachkenntnisse : [];
  if (langs.length === 0) {
    return { id: "cefr", severity: "fail", label: "Mindestens eine Sprache angeben" };
  }
  const allowed = new Set(["A1", "A2", "B1", "B2", "C1", "C2", "Muttersprache"]);
  const bad = langs.filter((l) => !allowed.has(l.niveau));
  if (bad.length > 0) {
    return {
      id: "cefr",
      severity: "warn",
      label: "Sprachen ohne CEFR-Niveau",
      detail: `Statt „gut/fließend" das CEFR-Niveau A1–C2 oder Muttersprache.`,
    };
  }
  return { id: "cefr", severity: "ok", label: "Sprachen mit CEFR-Niveau" };
}

/** @param {import("./profileSchema").CVProfile} p */
function ruleSchuleComplete(p) {
  const missing = [];
  if (!trim(p.schultyp)) missing.push("Schultyp");
  if (!trim(p.schulname)) missing.push("Schulname");
  if (missing.length > 0) {
    return {
      id: "schule",
      severity: "warn",
      label: "Schule unvollständig",
      detail: `Es fehlt: ${missing.join(", ")}.`,
    };
  }
  return { id: "schule", severity: "ok", label: "Schule vollständig" };
}

/**
 * HAK / HTL students from year 3 onward are expected to have completed a
 * Pflichtpraktikum. Missing one is a credibility hit.
 * @param {import("./profileSchema").CVProfile} p
 */
function rulePflichtpraktikum(p) {
  const requiresIt = (p.schultyp === "HAK" || p.schultyp === "HTL")
    && /^(3|4|5)/.test(trim(p.klasse));
  if (!requiresIt) return null;
  const has = (Array.isArray(p.erfahrungen) ? p.erfahrungen : [])
    .some((e) => /pflichtpraktikum/i.test(e?.art || "") || /pflichtpraktikum/i.test(e?.titel || ""));
  if (!has) {
    return {
      id: "pflicht",
      severity: "warn",
      label: "Kein Pflichtpraktikum eingetragen",
      detail: `${p.schultyp} ${p.klasse} fordert eines — ohne wirken Bewerbungen unvollständig.`,
      fixHint: "Eintragen →",
    };
  }
  return { id: "pflicht", severity: "ok", label: "Pflichtpraktikum eingetragen" };
}

/** @param {import("./profileSchema").CVProfile} p */
function ruleErfahrungenPresent(p) {
  const list = Array.isArray(p.erfahrungen) ? p.erfahrungen : [];
  if (list.length === 0) {
    return {
      id: "exp",
      severity: "info",
      label: "Noch keine Erfahrungen",
      detail: "Auch Babysitten, Nachhilfe, Sportverein oder Schulprojekte zählen.",
    };
  }
  return { id: "exp", severity: "ok", label: `${list.length} Erfahrung${list.length === 1 ? "" : "en"} eingetragen` };
}

/**
 * Bullets opening with "war zuständig für…" feel passive. Action verbs
 * ("Beriet", "Organisierte") are the AT-norm.
 * @param {import("./profileSchema").CVProfile} p
 */
function ruleBulletsActive(p) {
  const list = Array.isArray(p.erfahrungen) ? p.erfahrungen : [];
  /** @type {string[]} */
  const passive = [];
  for (const e of list) {
    const bullets = Array.isArray(e?.bullets) ? e.bullets : [];
    for (const b of bullets) {
      const s = trim(b).toLowerCase();
      if (!s) continue;
      const opensActively = ACTIVE_VERB_OPENERS.some((v) => s.startsWith(v));
      if (!opensActively && PASSIVE_OPENERS.test(s)) passive.push(b);
    }
  }
  if (passive.length === 0) {
    if (list.length === 0) return null; // nothing to audit
    return { id: "bullets", severity: "ok", label: "Bullets aktivisch formuliert" };
  }
  return {
    id: "bullets",
    severity: "warn",
    label: "Bullets aktivisch formulieren",
    detail: `${passive.length} Eintr${passive.length === 1 ? "ag" : "äge"} fängt mit „war zuständig für…" an. „Beriet…" oder „Organisierte…" wirken stärker.`,
    fixHint: "Vorschläge ansehen →",
  };
}

/**
 * Erfahrungen should be reverse-chronological (newest first).
 * @param {import("./profileSchema").CVProfile} p
 */
function ruleDateOrder(p) {
  const list = (Array.isArray(p.erfahrungen) ? p.erfahrungen : [])
    .filter((e) => trim(e?.von));
  if (list.length < 2) return null;
  for (let i = 1; i < list.length; i += 1) {
    if (list[i - 1].von < list[i].von) {
      return {
        id: "order",
        severity: "warn",
        label: "Erfahrungen nicht reverse-chronologisch",
        detail: "Neueste Einträge sollten oben stehen.",
        fixHint: "Sortieren →",
      };
    }
  }
  return { id: "order", severity: "ok", label: "Daten reverse-chronologisch" };
}

/**
 * Photo recommendation depends on target branche.
 * Gastro / Handel / Pflege: photo helps. IT / Büro: photo neutral.
 * @param {import("./profileSchema").CVProfile} p
 */
function ruleFotoForBranche(p) {
  const branchen = (Array.isArray(p.branchen) ? p.branchen : []).map((b) => b.toLowerCase());
  const hasFoto = !!trim(p.foto);
  const customerFacing = ["gastro", "handel", "pflege", "tourismus", "service"];
  const wants = branchen.some((b) => customerFacing.some((c) => b.includes(c)));
  if (wants && !hasFoto) {
    return {
      id: "foto",
      severity: "info",
      label: "Foto würde hier helfen",
      detail: "Bei Gastro/Handel/Pflege erhöhen Bewerbungen mit Foto die Antwortrate.",
      fixHint: "Foto hinzufügen →",
    };
  }
  return { id: "foto", severity: "ok", label: "Foto-Empfehlung passend zur Branche" };
}

/** @param {import("./profileSchema").CVProfile} p */
function ruleProfessionalName(p) {
  const v = trim(p.vorname);
  const n = trim(p.nachname);
  if (!v || !n) return { id: "name", severity: "fail", label: "Vor- oder Nachname fehlt" };
  const allLower = v === v.toLowerCase() && n === n.toLowerCase();
  const allUpper = v === v.toUpperCase() && n === n.toUpperCase();
  if (allLower || allUpper) {
    return {
      id: "name",
      severity: "warn",
      label: "Name in Groß-/Kleinschreibung",
      detail: `„Davor Radeski" wirkt natürlicher als „davor radeski" oder „DAVOR RADESKI".`,
    };
  }
  return { id: "name", severity: "ok", label: "Name korrekt geschrieben" };
}
