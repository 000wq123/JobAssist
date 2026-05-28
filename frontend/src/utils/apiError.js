export function getApiErrorMessage(err, fallback = "Etwas ist schiefgelaufen") {
  if (!err?.response) {
    return "Server nicht erreichbar. Bitte versuche es in einer Minute erneut.";
  }

  const detail = err?.response?.data?.detail;

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
