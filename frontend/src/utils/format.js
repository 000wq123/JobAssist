/**
 * Currency/number formatting helpers for de-AT.
 * Keep logic tiny and dependency-free so components can import directly.
 */

/**
 * Format a number as Euro using Austrian German locale by default.
 * @param {number} n
 * @param {Intl.NumberFormatOptions} [options]
 */
export function formatEuro(n, options = {}) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const nf = new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
  return nf.format(n);
}
