/**
 * CV Template Registry — single source of truth for template METADATA.
 *
 * The registry describes *what* a template is (name, description, best-for,
 * layout properties, density, ATS posture) — it does NOT hold rendering logic.
 * Rendering lives in `cvModel.js` (the shared data model) consumed by the DOM
 * preview renderer and the PDF renderer in parallel.
 *
 * Template ids are STABLE (persisted into cv_profile_v1 + the server profile),
 * so saved/loaded CVs resolve. The designs behind these ids are new archetypes;
 * only the ids are unchanged.
 *
 * License: all 8 layouts are ORIGINAL JobAssist implementations of established
 * professional-resume layout conventions (no third-party code is copied), so no
 * upstream license obligations apply. The `source`/`license` fields remain part
 * of the contract for any future imported template per THIRD-PARTY-NOTICES.md.
 */

export const CV_TEMPLATES = [
  {
    id: "tabellarisch",
    name: "Klassisch",
    description: "Klar und unkompliziert.",
    bestFor: "Büro · Verwaltung · Wirtschaft · Studium",
    audience: "Für die erste Bewerbung",
    photo: "no",
    layout: "one-column",
    density: "compact",
    ats: "maximized",
    style: "Klassisch",
    nhac: true,
    recommended: true,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "serif",
    name: "Elegant",
    description: "Ruhig, modern und etwas persönlicher.",
    bestFor: "Studium · Büro · kreative Bewerbungen",
    audience: "Klassisch",
    photo: "optional",
    layout: "one-column",
    density: "spacious",
    ats: "compatible",
    style: "Serif",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "kontrast",
    name: "Modern",
    description: "Frisch und übersichtlich.",
    bestFor: "IT · Marketing · Handel · Startups",
    audience: "Modern",
    photo: "optional",
    layout: "one-column",
    density: "balanced",
    ats: "compatible",
    style: "Modern",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "slim-sidebar",
    name: "Mit Seitenleiste",
    description: "Mehr Struktur auf einen Blick.",
    bestFor: "Praktika · Nebenjobs · vielseitige Bewerbungen",
    audience: "Modern",
    photo: "optional",
    layout: "two-column",
    density: "balanced",
    ats: "compatible",
    style: "Modern",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "spartan",
    name: "Einfach & klar",
    description: "Schlicht und besonders leicht lesbar.",
    bestFor: "Die erste Bewerbung · Online-Formulare · Ausbildung",
    audience: "Für die erste Bewerbung",
    photo: "no",
    layout: "one-column",
    density: "balanced",
    ats: "maximized",
    style: "Minimal",
    nhac: true,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "gray-header",
    name: "Mit Foto",
    description: "Persönlicher mit einem klassischen Foto.",
    bestFor: "Kundenkontakt · Tourismus · persönliche Bewerbungen",
    audience: "Mit Foto",
    photo: "optional",
    layout: "one-column",
    density: "balanced",
    ats: "compatible",
    style: "Klassisch",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "dark-bands",
    name: "Für mehr Erfahrung",
    description: "Mehr Platz für Jobs und Projekte.",
    bestFor: "Mehrere Praktika · Jobs · Projekte",
    audience: "Viel Erfahrung",
    photo: "no",
    layout: "one-column",
    density: "compact",
    ats: "compatible",
    style: "Modern",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
  {
    id: "zentriert",
    name: "Schule & Praktikum",
    description: "Ausbildung und erste Erfahrungen im Fokus.",
    bestFor: "Schule · Praktikum · Lehre · Berufseinstieg",
    audience: "Für die erste Bewerbung",
    photo: "optional",
    layout: "one-column",
    density: "balanced",
    ats: "compatible",
    style: "Modern",
    nhac: false,
    recommended: false,
    source: "original (JobAssist)",
    license: "proprietary-original",
    licenseUrl: null,
  },
];

/** Look up template metadata by id; falls back to the recommended default. */
export function getTemplateMeta(id) {
  return CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];
}

/**
 * Filter groups — derived from metadata. Includes only filters that actually
 * split the set meaningfully. ATS is split into "maximized" vs "compatible"
 * (a global all-ATS "ATS" filter is meaningless). No-photo vs photo-optional/no
 * is a genuinely useful orientation split.
 */
export const TEMPLATE_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "first-application", label: "Für die erste Bewerbung" },
  { key: "modern", label: "Modern" },
  { key: "classic", label: "Klassisch" },
  { key: "photo", label: "Mit Foto" },
  { key: "nophoto", label: "Ohne Foto" },
  { key: "experienced", label: "Viel Erfahrung" },
];

/** Whether a template matches a filter key. */
export function templateMatchesFilter(template, filterKey) {
  const t = template || {};
  switch (filterKey) {
    case "all": return true;
    case "first-application": return t.audience === "Für die erste Bewerbung";
    case "classic": return t.audience === "Klassisch" || t.style === "Klassisch";
    case "modern": return t.audience === "Modern" || t.style === "Modern" || t.style === "Minimal";
    case "nophoto": return t.photo === "no";
    case "photo": return t.photo === "optional" || t.photo === "yes";
    case "experienced": return t.audience === "Viel Erfahrung";
    default: return true;
  }
}