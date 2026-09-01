export function getApiErrorMessage(err, fallback = "Etwas ist schiefgelaufen") {
  if (!err?.response) {
    if (err?.name === "AbortError") {
      return "Die Anfrage dauert länger als erwartet. Bitte versuche es erneut.";
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "Du bist gerade offline. Prüfe deine Internetverbindung und versuche es erneut.";
    }

    return "Die Verbindung zum JobAssist-Server konnte nicht hergestellt werden. Bitte versuche es erneut.";
  }

  const detail = err?.response?.data?.detail;

  if (detail === "Internal server error") {
    const requestId = err?.response?.data?.request_id;
    return requestId && requestId !== "-"
      ? `Interner Serverfehler. Referenz: ${requestId}`
      : "Interner Serverfehler. Bitte versuche es erneut.";
  }

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const firstMessage = detail.find((item) => typeof item?.msg === "string")?.msg;
    if (firstMessage) return firstMessage;
  }

  if (detail && typeof detail === "object" && typeof detail.message === "string") {
    return detail.message;
  }

  const error = err?.response?.data?.error;
  if (typeof error === "string") return error;

  return fallback;
}
