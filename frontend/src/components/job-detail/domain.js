/**
 * Pure domain helpers for the job detail surface.
 * No React imports — safe to use in components and tests.
 */

/**
 * Parses a free-form salary string into a structured value.
 *
 * @param {string | null | undefined} raw
 * @returns {{unit: "hour"|"month"|"year", amount: number, max?: number, hourly?: number} | null}
 */
export function parseSalary(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\s+/g, " ").trim();

  const tokens = [...s.matchAll(/([0-9]+(?:[.,][0-9]{2,3})*(?:[.,][0-9]{1,2})?)/g)]
    .map((m) => normaliseNumber(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!tokens.length) return null;

  const isHourly  = /(\/h|\/std|pro stunde|pro h\b|hour)/.test(s);
  const isMonthly = /(\/mon|pro monat|monatlich|month)/.test(s);
  const looksAnnual = tokens.some((n) => n >= 10000);

  if (isHourly) {
    const amount = tokens[0];
    return { unit: "hour", amount, hourly: amount };
  }
  if (isMonthly) {
    const amount = tokens[0];
    return { unit: "month", amount, hourly: (amount * 12) / 2002 };
  }
  if (looksAnnual) {
    const amount = tokens[0];
    const max = tokens[1] && tokens[1] > amount ? tokens[1] : undefined;
    const ref = max ? (amount + max) / 2 : amount;
    return { unit: "year", amount, max, hourly: ref / 2002 };
  }
  return null;
}

/** Normalises German/English numeric strings like "25,000" / "1.234,50" to a Number. */
export function normaliseNumber(s) {
  if (!s) return NaN;
  const last = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (last === -1) return Number(s);
  const tail = s.slice(last + 1);
  if (tail.length === 1 || tail.length === 2) {
    return Number(s.slice(0, last).replace(/[.,]/g, "") + "." + tail);
  }
  return Number(s.replace(/[.,]/g, ""));
}

/** Whole days from now until the given ISO. Negative if past. */
export function daysUntil(iso) {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return Math.ceil((t.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Austrian statutory minimum wage floor (2025) used for the KV bar.
 */
export function kvMinimumFor(category) {
  switch ((category || "").toLowerCase()) {
    case "vollzeit":
    case "teilzeit":
    case "samstagsjob":
    case "geringfügig":
      return 12.09;
    case "lehre":
      return 3.75;
    case "praktikum":
      return 12.09;
    case "ferialjob":
      return 10.50;
    default:
      return 12.09;
  }
}

/** Human label for the `category` enum. */
export function categoryLabel(category) {
  switch ((category || "").toLowerCase()) {
    case "samstagsjob": return "Samstagsjob";
    case "praktikum":   return "Praktikum";
    case "teilzeit":    return "Teilzeit";
    case "vollzeit":    return "Vollzeit";
    case "lehre":       return "Lehre";
    case "ferialjob":   return "Ferialjob";
    case "geringfügig": return "Geringfügig";
    default:            return "Stelle";
  }
}

/** Best-effort initial / abbreviation for the company logo chip. */
export function logoAbbrev(company) {
  if (!company) return "?";
  const trimmed = company.trim();
  if (trimmed.length <= 5) return trimmed.toUpperCase();
  return trimmed.slice(0, 1).toUpperCase();
}

/** Deterministic gradient class for a company logo (calm palette). */
export function logoColor(company) {
  if (!company) return "bg-slate-700";
  const seed = company.charCodeAt(0) + (company.length || 1);
  const palettes = [
    "bg-gradient-to-br from-rose-600 to-rose-800",
    "bg-gradient-to-br from-amber-500 to-orange-700",
    "bg-gradient-to-br from-emerald-600 to-emerald-800",
    "bg-gradient-to-br from-sky-600 to-sky-800",
    "bg-gradient-to-br from-violet-600 to-violet-800",
    "bg-gradient-to-br from-fuchsia-600 to-fuchsia-800",
  ];
  return palettes[seed % palettes.length];
}
