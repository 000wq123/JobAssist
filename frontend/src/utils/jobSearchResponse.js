/**
 * Normalize the envelopes returned by the job-search providers.
 *
 * The backend's canonical contract is `{ jobs: [...] }`. The legacy aliases
 * remain accepted so older mocks and cached responses do not break the UI.
 */
export function parseJobSearchResponse(payload) {
  const envelope = payload && typeof payload === "object" ? payload : {};
  const candidates = Array.isArray(payload)
    ? payload
    : envelope.jobs ?? envelope.items ?? envelope.results ?? [];

  return {
    jobs: Array.isArray(candidates) ? candidates : [],
    error:
      typeof envelope.error === "string" && envelope.error.trim()
        ? envelope.error.trim()
        : null,
  };
}
