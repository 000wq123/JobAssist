/**
 * Canonical Lebenslauf profile shape (Austrian CV builder).
 * Stays in lockstep with backend `profiles_v2` table.
 *
 * @typedef {Object} CVExperience
 * @property {string} id
 * @property {string} art          - "Praktikum" | "Teilzeit" | "Babysitten" | "Nachhilfe" | "Ferialjob" | "Ehrenamt" | "Schulprojekt" | "Eigenes Projekt" | "Sonstige"
 * @property {string} titel
 * @property {string} organisation
 * @property {string} von          - "YYYY-MM"
 * @property {string} bis          - "YYYY-MM" or "" (= laufend)
 * @property {string[]} bullets
 *
 * @typedef {Object} CVLanguage
 * @property {string} sprache
 * @property {"Muttersprache"|"A1"|"A2"|"B1"|"B2"|"C1"|"C2"} niveau
 *
 * @typedef {Object} CVProfile
 * @property {string} vorname
 * @property {string} nachname
 * @property {string} geburtsdatum     - ISO "YYYY-MM-DD" (rendered as DD.MM.YYYY in PDF)
 * @property {string} strasse
 * @property {string} plz
 * @property {string} ort
 * @property {string} telefon
 * @property {string} email
 * @property {string} staatsbuergerschaft
 * @property {boolean|null} arbeitserlaubnis
 * @property {string} schulname
 * @property {"AHS"|"HTL"|"HAK"|"BHS"|"NMS"|"PTS"|"Sonstige"|""} schultyp
 * @property {string} klasse
 * @property {number|null} abschlussjahr
 * @property {CVExperience[]} erfahrungen
 * @property {CVLanguage[]} sprachkenntnisse
 * @property {string[]} faehigkeiten   - software / soft skills tags
 * @property {string} hobbies
 * @property {string} fuehrerschein    - "Keiner" | "L17" | "B"
 * @property {string[]} jobArten       - ["Praktikum","Teilzeit",...]
 * @property {number} maxAnfahrtMin
 * @property {string[]} branchen
 * @property {string} verfuegbarAb     - "YYYY-MM-DD"
 * @property {string} foto             - data URL or "" (optional, AT-CV norm)
 * @property {number} _version
 */

export const CV_PROFILE_VERSION = 2;

/** @returns {CVProfile} */
export function emptyProfile() {
  return {
    vorname: "",
    nachname: "",
    geburtsdatum: "",
    strasse: "",
    plz: "",
    ort: "",
    telefon: "",
    email: "",
    staatsbuergerschaft: "AT",
    arbeitserlaubnis: null,
    schulname: "",
    schultyp: "",
    klasse: "",
    abschlussjahr: null,
    erfahrungen: [],
    sprachkenntnisse: [{ sprache: "Deutsch", niveau: "Muttersprache" }],
    faehigkeiten: [],
    hobbies: "",
    fuehrerschein: "Keiner",
    jobArten: [],
    maxAnfahrtMin: 30,
    branchen: [],
    verfuegbarAb: "",
    foto: "",
    templateId: "tabellarisch",
    _version: CV_PROFILE_VERSION,
  };
}

/** Six wizard steps, in order. */
export const STEPS = /** @type {const} */ ([
  { id: "personal",     label: "Persönliches" },
  { id: "schule",       label: "Schule" },
  { id: "erfahrungen",  label: "Erfahrungen" },
  { id: "skills",       label: "Skills" },
  { id: "interessen",   label: "Interessen" },
  { id: "suche",        label: "Was suchst du?" },
]);
