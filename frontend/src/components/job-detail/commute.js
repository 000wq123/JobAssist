/** Text-only safety helpers for Austrian teen job search. */

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
