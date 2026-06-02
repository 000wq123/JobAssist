/**
 * Simple commute + safety helpers for Austrian teen job search.
 * No external APIs — uses hardcoded city-pair estimates for common routes.
 */

const CITY_PAIRS = {
  "wien-wien": 25,
  "wien-graz": 145,
  "wien-linz": 185,
  "wien-salzburg": 295,
  "wien-innsbruck": 520,
  "wien-klagenfurt": 335,
  "wien-st. pölten": 65,
  "wien-sankt pölten": 65,
  "graz-wien": 145,
  "graz-linz": 220,
  "graz-salzburg": 300,
  "linz-wien": 185,
  "linz-graz": 220,
  "linz-salzburg": 130,
  "salzburg-wien": 295,
  "salzburg-linz": 130,
  "salzburg-graz": 300,
  "innsbruck-wien": 520,
};

function normalizeCity(city) {
  if (!city) return "";
  return city
    .toLowerCase()
    .replace(/[\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+\s*/, "");
}

function extractCity(location) {
  if (!location) return "";
  const first = location.split(",")[0];
  return normalizeCity(first);
}

/**
 * Estimate one-way commute time in minutes.
 * Returns null if no estimate available.
 */
export function estimateCommuteMinutes(userLocation, jobLocation) {
  const from = extractCity(userLocation);
  const to = extractCity(jobLocation);
  if (!from || !to) return null;
  if (from === to) return 30;
  const direct = CITY_PAIRS[`${from}-${to}`];
  if (direct) return Math.round(direct / 2.5);
  const reverse = CITY_PAIRS[`${to}-${from}`];
  if (reverse) return Math.round(reverse / 2.5);
  return null;
}

/**
 * Check if a job description mentions late/night shifts.
 */
export function mentionsLateShift(description) {
  if (!description) return false;
  const text = description.toLowerCase();
  const terms = [
    "nachtschicht", "spätschicht", "nachtdienst", "bis 22", "bis 23",
    "bis 24", "bis 0", "nachtarbeit", "nachts", "abenddienst", "bis 21",
  ];
  return terms.some((t) => text.includes(t));
}

/**
 * Check if a job description mentions split shifts.
 */
export function mentionsSplitShift(description) {
  if (!description) return false;
  const text = description.toLowerCase();
  const terms = [
    "geteilter dienst", "split shift", "teildienst", "zweischichtig",
    "morgens und abends", "vormittag und nachmittag", "unterbrochene arbeitszeit",
  ];
  return terms.some((t) => text.includes(t));
}
