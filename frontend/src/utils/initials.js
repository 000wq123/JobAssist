/**
 * Shared display-initials helper for user avatars (sidebar, mobile drawer).
 *
 * Derives 1–2 uppercase letters from a name first; falls back to the email's
 * local part (the bit before "@") so an account without a stored name still
 * gets a stable, sensible avatar instead of a stray lowercase letter or "?".
 *
 * Examples:
 *   "Max Mustermann"      → "MM"
 *   "Anna"                → "AN"
 *   "" / "anna@x.com"     → "AN"  (local part "anna")
 *   "" / ""               → "?"
 *
 * @param {string|null|undefined} name
 * @param {string|null|undefined} email
 * @returns {string}
 */
export function getInitials(name, email) {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = (email || "").trim().split("@")[0].replace(/[^a-zA-Z0-9äöüßÄÖÜ]/g, "");
  if (local) return local.slice(0, 2).toUpperCase();
  return "?";
}
