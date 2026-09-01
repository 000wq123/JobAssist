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
    unavailableSources: Array.isArray(envelope.unavailable_sources)
      ? envelope.unavailable_sources.filter((source) => typeof source === "string" && source.trim())
      : [],
  };
}

/** Preserve provider metadata when a search result becomes a saved job. */
export function toSavedJobPayload(job) {
  return {
    role: job?.title || job?.role || "Stelle",
    company: job?.company || "",
    description: job?.description || "",
    url: job?.full_url || job?.url || "",
    salary_text: job?.salary_text || job?.salary || null,
    location: job?.location || null,
    job_type: job?.job_type || job?.jobType || null,
    source: job?.source || null,
    source_id: job?.source_id || null,
    posted_at: job?.posted_at || job?.updated || null,
    expires_at: job?.expires_at || null,
  };
}
