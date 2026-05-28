/**
 * Completion % is a simple ratio of filled / total weighted slots.
 * Stable order so the bar doesn't jitter when fields are filled.
 *
 * @param {import("./profileSchema").CVProfile} p
 * @returns {number} integer 0-100
 */
export function computeCompletion(p) {
  if (!p) return 0;

  const slots = [
    // Persönliches — 6 (essentials weight higher by repetition)
    p.vorname?.trim(),
    p.nachname?.trim(),
    p.geburtsdatum?.trim(),
    p.plz?.trim() && p.ort?.trim(),
    p.telefon?.trim(),
    p.email?.trim(),
    // Schule — 2
    p.schulname?.trim(),
    p.schultyp,
    // Erfahrungen — 1 (any)
    Array.isArray(p.erfahrungen) && p.erfahrungen.length > 0,
    // Skills — 2
    Array.isArray(p.sprachkenntnisse) && p.sprachkenntnisse.length > 0,
    Array.isArray(p.faehigkeiten) && p.faehigkeiten.length > 0,
    // Interessen — 1
    p.hobbies?.trim(),
    // Suche — 2
    Array.isArray(p.jobArten) && p.jobArten.length > 0,
    Array.isArray(p.branchen) && p.branchen.length > 0,
  ];

  const filled = slots.filter(Boolean).length;
  return Math.round((filled / slots.length) * 100);
}
