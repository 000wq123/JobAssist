/**
 * CV Template Model — the single source of truth that drives BOTH renderers.
 *
 * Every template renders from this model:
 *   - the DOM/browser preview (CVTemplatePicker gallery + inspector + lightbox)
 *   - the react-pdf export (CVTemplate)
 *   - the live editor preview (CVLivePreview)
 *
 * Each template is described by:
 *   - `normalize(profile)` → a platform-neutral JSON structure (sections, rows,
 *     typography tokens). Renderers translate this model into either JSX or PDF
 *     elements. No renderer recomputes layout logic or hardcodes styling.
 *   - `columns(type)` → shared A4 metrics (margins, gutter, content widths) so
 *     both renderers lay out identically.
 *
 * This is the fix for the previous architecture where CVTemplatePicker.jsx
 * (DOM) and CVTemplate.jsx (PDF) each maintained a parallel, drifting copy of
 * the same 8 layout implementations.
 *
 * Template ids are STABLE — they persist into cv_profile_v1 and the server
 * profile, so saved/loaded CVs must keep resolving. The visual designs are new
 * archetypes, but the ids are the same set.
 */

export const A4 = {
  W: 595.28, // pt
  H: 841.89, // pt
  M: 42,     // default page margin (pt) — ~14.8mm
};

/** Shared typography scale (professional, printable). */
export const TYPE = {
  name: 22,
  role: 11.5,
  section: 9,     // uppercase section titles
  body: 10,
  small: 8.5,
  tiny: 7.8,
  line: 1.45,
};

export const COLORS = {
  ink: "#1a1a1a",
  muted: "#4a4a4a",
  dim: "#6b7280",
  line: "#d9d9d9",
  hair: "#e6e6e6",
  white: "#ffffff",
};

/** JobAssist brand red — the subtle accent in modern templates. */
export const BRAND = "#C8102E";

/** Default (db) font family. DOM uses this stack; PDF maps to Helvetica. */
export const FONT = "Helvetica, Arial, system-ui, sans-serif";

/** Stable design values persisted by the builder. */
export const CV_FONTS = {
  sans: FONT,
  serif: "Georgia, 'Times New Roman', serif",
};

/** Normalize legacy CSS font stacks and unknown values to a stable id. */
export function normalizeFontFamily(value) {
  if (value === "serif" || /(Georgia|Times|Instrument Serif)/i.test(String(value || ""))) return "serif";
  return "sans";
}

/** Only printable six-digit hex colors are accepted by both renderers. */
export function normalizeAccentColor(value) {
  const candidate = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : BRAND;
}

/** Format a date range like “2022”/“2022 – heute” from iso/month year parts. */
export function fmtRange(from, to) {
  const f = fmtYear(from);
  const t = to && to.toLowerCase() !== "heute" && to.toLowerCase() !== "present" ? fmtYear(to) : "heute";
  if (f && (t && t !== "heute")) return `${f} – ${t}`;
  if (f) return `${f} – heute`;
  return t && t !== "heute" ? `bis ${t}` : "";
}

function fmtYear(v) {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 4);
  return s;
}

/**
 * Normalize a raw profile into the neutral CV model consumed by renderers.
 * Returns a plain object; unknown/missing fields collapse to safe defaults.
 */
export function normalizeProfile(profile = {}) {
  const p = profile || {};
  const list = (value) => (Array.isArray(value) ? value : []);
  const fullName = [p.vorname, p.nachname].filter(Boolean).join(" ") || "Name";
  const role = p.role || p.beruf || p.wunschposition || p.studienfeld || "";

  // Contact block (rendered differently per template, but same underlying data).
  const contact = {
    email: p.email || "",
    phone: normalizePhone(p.telefon),
    city: [p.plz, p.ort].filter(Boolean).join(" "),
    address: p.strasse || "",
    birth: p.geburtsdatum || "",
    birthPlace: p.geburtsort || "",
  };

  const education = { school: p.schule || p.schulname || "", degree: p.abschluss || p.schultyp || "", year: p.abschlussjahr || "" };
  const skills = list(p.faehigkeiten || p.skills).filter(Boolean).slice(0, 10);
  const languages = list(p.sprachkenntnisse || p.sprachen).filter(Boolean).slice(0, 6).map((l) =>
    typeof l === "string" ? { language: l } : { language: l.sprache || l.language || "", level: l.niveau || l.level || "" });
  const jobs = list(p.erfahrungen || p.berufserfahrung)
    .filter((j) => j && (j.organisation || j.titel || j.art))
    .map((j) => ({
      title: j.titel || j.art || "Berufserfahrung",
      org: j.organisation || "",
      from: j.von || "",
      to: j.bis || "",
      bullets: (j.bullets || j.aufgaben || []).filter((b) => b && b.trim()),
    }))
    .slice(0, 8);
  const interests = Array.isArray(p.interessen)
    ? p.interessen.filter(Boolean).slice(0, 5)
    : String(p.hobbys || "").split("\n", 1)[0].split(",").map((item) => item.trim()).filter(Boolean).slice(0, 5);

  return {
    fullName,
    role,
    contact,
    education,
    jobs,
    skills,
    languages,
    projects: list(p.projekte).filter(Boolean).slice(0, 4).map((x) => (typeof x === "string" ? { title: x } : x)),
    certifications: list(p.zertifikate).filter(Boolean).slice(0, 4).map((x) => (typeof x === "string" ? { title: x } : x)),
    courses: list(p.weiterbildung || p.weiterbildungen).filter(Boolean).slice(0, 4).map((x) => (typeof x === "string" ? { title: x } : x)),
    interests,
    activities: list(p.aktivitaeten).filter(Boolean).slice(0, 4),
    profileText: p.profil || "",
    photo: p.showPhoto === false ? "" : (p.photo || p.foto || p.foto_url || ""),
    accentColor: normalizeAccentColor(p.accentColor),
    fontFamily: normalizeFontFamily(p.fontFamily),
    austrian: {
      class: p.klasse || "",
      arbeitserlaubnis: p.arbeitserlaubnis || "",
      fuehrerschein: p.fuehrerschein || "",
      staatsbuergerschaft: p.staatsbuergerschaft || "",
    },
    raw: p,
  };
}

function normalizePhone(t) {
  if (!t) return "";
  if (typeof t !== "string") t = String(t);
  return t.startsWith("+") ? t : `+43 ${t}`;
}

/**
 * Build a design-preview dataset for the catalogue/inspector.
 * This is SAMPLE content — clearly separated from a user's real profile so the
 * chooser can demonstrate realistic hierarchy without pretending this belongs
 * to the logged-in user. NEVER pass this to the editor/PDF (real data only).
 */
export const DESIGN_PREVIEW = {
  profile: {
    vorname: "Anna",
    nachname: "Berger",
    role: "Projektmanagerin · Business Operations",
    email: "anna.berger@example.at",
    telefon: "660 1234567",
    strasse: "Herrengasse 12",
    plz: "1010",
    ort: "Wien",
    geburtsdatum: "",
    profil:
      "Projektmanagerin mit 6 Jahren Erfahrung in der Koordination operativer Teams und der Einführung digitaler Workflows. Pragmatisch, strukturiert und kommunikationsstark.",
    schulname: "WU Wien",
    abschluss: "Master in Business Administration",
    abschlussjahr: "2018",
    erfahrungen: [
      { titel: "Senior Projektmanagerin", organisation: "Kapsch Group", von: "2022", bis: "heute", bullets: ["Leitung cross-funktionaler Projekte mit 8 Mitgliedern", "Aufbau eines internen Reporting-Systems"] },
      { titel: "Projektmanagerin", organisation: "Österreichische Post", von: "2019", bis: "2022", bullets: ["Rollout eines neuen Filialkonzepts in 40 Standorten"] },
      { titel: "Junior Consultant", organisation: "Deloitte Österreich", von: "2018", bis: "2019", bullets: ["Mitwirkung an Prozessoptimierung im öffentlichen Sektor"] },
    ],
    faehigkeiten: ["Projektmanagement", "Agiles Arbeiten", "MS Project", "Jira & Confluence", "Kanban", "Kostenplanung", "Präsentationen", "Teamführung"],
    sprachkenntnisse: [
      { sprache: "Deutsch", niveau: "Muttersprache" },
      { sprache: "Englisch", niveau: "Verhandlungssicher (C1)" },
      { sprache: "Französisch", niveau: "Gut (B2)" },
    ],
    projekte: [
      { titel: "Digitaler Onboarding-Prozess", beschreibung: "Reduktion der Einarbeitungszeit um 25 %", von: "2023" },
    ],
    weiterbildung: [
      { name: "PRINCE2 Practitioner", institution: "AXELOS", jahr: "2021" },
    ],
    interessen: ["Laufen", "Klassische Musik", "Reisen"],
  },
  label: "Beispielvorschau",
};
