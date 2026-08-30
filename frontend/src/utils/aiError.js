/**
 * Friendly German messages for AI endpoint failures.
 *
 * AI routes (/cover-letter, /interview, /ai, /jobs/match, /research) fail in
 * a handful of predictable ways. The raw `detail` from the backend is often
 * technical ("AI service error. Please try again."), and when the response
 * never arrives (502 without CORS headers on older deploys, network drop) the
 * browser error has no body at all. This helper maps each case to a message
 * a user can act on, preferring specific backend info when present.
 */

const USAGE_MESSAGE = (detail) => {
  const used = Number.isFinite(detail?.used) ? detail.used : null;
  const limit = Number.isFinite(detail?.limit) ? detail.limit : null;
  const quota = used != null && limit != null ? ` (${used}/${limit})` : "";
  return `Limit des Tarifs für diese Funktion erreicht${quota}. Für mehr Nutze den Pro-Tarif.`;
};

export function getAiErrorMessage(err, fallback = "KI-Funktion gerade nicht verfügbar. Bitte versuche es gleich erneut.") {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;

  // Backend usage-limit payload: { error: "usage_limit", used, limit, message }
  if (detail && typeof detail === "object" && detail.error === "usage_limit") {
    return USAGE_MESSAGE(detail);
  }

  switch (status) {
    case 429:
      return "Zu viele Anfragen. Bitte warte ein paar Sekunden und versuche es erneut.";
    case 503:
      return "KI-Dienst ist kurzzeitig nicht erreichbar. Bitte versuche es in einer Minute erneut.";
    case 502:
      return "Die KI konnte diese Anfrage gerade nicht verarbeiten. Bitte versuche es erneut.";
    case 403:
      // 403 is either usage_limit (handled above) or email verification.
      if (typeof detail === "object" && detail?.message) return detail.message;
      return "Bitte bestätige zuerst deine E-Mail-Adresse.";
    default:
      break;
  }

  // No response at all → network/CORS failure; the request never reached us.
  if (!err?.response) {
    return "Server nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.";
  }

  // Known backend string details are fine to show as-is; anything else falls back.
  if (typeof detail === "string" && detail.length > 0 && detail.length <= 160) {
    return detail;
  }

  return fallback;
}
