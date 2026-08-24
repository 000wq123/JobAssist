import { test, expect } from "vitest";

import {
  filterAndSortJobs,
  getDeadlineMeta,
  getDisabledReason,
  getMatchColorClass,
  getMatchSummary,
  parseJson,
  updateJobList,
} from "../src/utils/applicationsState.js";

test("parseJson returns parsed object or null", () => {
  expect(parseJson('{"summary":"Stark"}')).toEqual({ summary: "Stark" });
  expect(parseJson("not json")).toBe(null);
  expect(parseJson("")).toBe(null);
});

test("getMatchColorClass returns the unified brand palette regardless of score", () => {
  // The match-score is visualised via a single calm palette across all
  // bands, expressed through theme CSS variables (dark-mode safe).
  const expected = "bg-[var(--color-accent-500)]/10 text-[var(--color-accent-200)]";
  expect(getMatchColorClass(0)).toBe(expected);
  expect(getMatchColorClass(25)).toBe(expected);
  expect(getMatchColorClass(55)).toBe(expected);
  expect(getMatchColorClass(100)).toBe(expected);
});

test("getDeadlineMeta returns overdue, today, and future labels", () => {
  const now = new Date("2026-03-26T10:00:00.000Z").getTime();

  expect(getDeadlineMeta("2026-03-25T10:00:00.000Z", now)).toEqual({
    label: "Überfällig",
    className: "bg-red-100 text-red-800",
  });
  expect(getDeadlineMeta("2026-03-26T20:00:00.000Z", now)).toEqual({
    label: "Heute",
    className: "bg-orange-100 text-orange-800",
  });
  expect(getDeadlineMeta("2026-03-29T10:00:00.000Z", now)).toEqual({
    label: "3T",
    className: "bg-orange-100 text-orange-800",
  });
});

test("getMatchSummary prefers parsed summary", () => {
  expect(getMatchSummary('{"summary":"Sehr passend"}')).toBe("Sehr passend");
  expect(getMatchSummary("Direktes Feedback")).toBe("Direktes Feedback");
  expect(getMatchSummary("")).toBe("");
});

test("updateJobList replaces matching job by id", () => {
  const oldJobs = [
    { id: 1, title: "Old 1" },
    { id: 2, title: "Old 2" },
  ];
  const nextJob = { id: 2, title: "New 2" };

  expect(updateJobList(oldJobs, nextJob)).toEqual([
    { id: 1, title: "Old 1" },
    { id: 2, title: "New 2" },
  ]);
});

test("filterAndSortJobs applies search, status, match filter, and sorting", () => {
  const jobs = [
    {
      id: 1,
      role: "Frontend Engineer",
      company: "Alpha",
      status: "bookmarked",
      match_score: 72,
      salary: "50000",
      created_at: "2026-03-20T10:00:00.000Z",
    },
    {
      id: 2,
      role: "Backend Engineer",
      company: "Beta",
      status: "applied",
      match_score: 88,
      salary: "65000",
      created_at: "2026-03-25T10:00:00.000Z",
    },
    {
      id: 3,
      role: "QA Analyst",
      company: "Gamma",
      status: "applied",
      match_score: 40,
      salary: "45000",
      created_at: "2026-03-24T10:00:00.000Z",
    },
  ];

  expect(
    filterAndSortJobs(jobs, {
      searchQuery: "engineer",
      filterStatus: "applied",
      filterMinMatch: 60,
      sortBy: "salary-high",
    }).map((job) => job.id),
  ).toEqual([2]);

  expect(filterAndSortJobs(jobs, { sortBy: "match-low" }).map((job) => job.id)).toEqual([3, 1, 2]);
  expect(filterAndSortJobs(jobs, { sortBy: "recent" }).map((job) => job.id)).toEqual([2, 3, 1]);
});

test("getDisabledReason explains missing prerequisites and busy states", () => {
  expect(
    getDisabledReason({
      feature: "research",
      job: { company: "" },
      hasResume: true,
      isProcessing: false,
      draftLoading: false,
    }),
  ).toBe("Für Recherche fehlt der Firmenname");

  expect(
    getDisabledReason({
      feature: "match",
      job: { company: "ACME" },
      hasResume: false,
      isProcessing: false,
      draftLoading: false,
    }),
  ).toBe("Bitte zuerst einen Lebenslauf auswählen");

  expect(
    getDisabledReason({
      feature: "draft",
      job: { company: "ACME" },
      hasResume: true,
      isProcessing: false,
      draftLoading: true,
    }),
  ).toBe("Brief-Entwurf wird gerade erstellt");

  expect(
    getDisabledReason({
      feature: "cover",
      job: { company: "ACME" },
      hasResume: true,
      isProcessing: true,
      draftLoading: false,
    }),
  ).toBe("Aktion läuft bereits");
});
