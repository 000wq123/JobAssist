import { describe, expect, it } from "vitest";

import { parseJobSearchResponse } from "../src/utils/jobSearchResponse";

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
