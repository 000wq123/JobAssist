import { describe, expect, it } from "vitest";

import { parseJobSearchResponse, toSavedJobPayload } from "../src/utils/jobSearchResponse";

describe("parseJobSearchResponse", () => {
  it("reads the canonical backend jobs envelope", () => {
    const job = { source_id: "job-1", title: "IT Praktikum" };

    expect(parseJobSearchResponse({ jobs: [job], total_count: 1 })).toEqual({
      jobs: [job],
      error: null,
    });
  });

  it("surfaces provider errors instead of presenting a false empty result", () => {
    expect(
      parseJobSearchResponse({
        jobs: [],
        total_count: 0,
        error: "Jobsuche vorübergehend nicht verfügbar.",
      })
    ).toEqual({
      jobs: [],
      error: "Jobsuche vorübergehend nicht verfügbar.",
    });
  });

  it("keeps legacy response shapes compatible", () => {
    expect(parseJobSearchResponse({ items: [{ title: "Legacy" }] }).jobs).toHaveLength(1);
    expect(parseJobSearchResponse(null)).toEqual({ jobs: [], error: null });
  });
});

describe("toSavedJobPayload", () => {
  it("keeps the metadata needed by the application workspace", () => {
    expect(toSavedJobPayload({
      title: "IT Praktikum",
      company: "JobAssist",
      description: "Hilf beim Testen.",
      full_url: "https://example.com/jobs/it",
      salary: "€ 1.500 / Monat",
      location: "Wien",
      job_type: "Praktikum",
      source: "Adzuna",
      source_id: "adzuna-1",
      updated: "2026-08-29T10:00:00Z",
    })).toEqual({
      role: "IT Praktikum",
      company: "JobAssist",
      description: "Hilf beim Testen.",
      url: "https://example.com/jobs/it",
      salary_text: "€ 1.500 / Monat",
      location: "Wien",
      job_type: "Praktikum",
      source: "Adzuna",
      source_id: "adzuna-1",
      posted_at: "2026-08-29T10:00:00Z",
      expires_at: null,
    });
  });

  it("preserves source_id so the backend can dedupe repeated saves", () => {
    // Regression: dropping source_id defeated the backend upsert and a
    // repeated "Merken" on the same listing created duplicate rows.
    const payload = toSavedJobPayload({
      title: "Lagerhilfe",
      source: "willhaben",
      source_id: "wh-42",
      full_url: "https://www.willhaben.at/iad/job/detail/42",
    });
    expect(payload.source_id).toBe("wh-42");
    expect(payload.source).toBe("willhaben");
  });

  it("falls back to url as identity when the provider has no source_id", () => {
    const payload = toSavedJobPayload({
      title: "Dev",
      url: "https://example.com/job/7",
    });
    expect(payload.source_id).toBeNull();
    expect(payload.url).toBe("https://example.com/job/7");
  });
});
