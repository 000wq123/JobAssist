import { test, expect } from "vitest";

import { generateMailtoLink, getJobContactDetails } from "../src/utils/emailHelpers.js";

test("getJobContactDetails prefers explicit contact email first", () => {
  const job = {
    contact_email: "job@example.com",
    location: "Vienna",
    research_data: JSON.stringify({
      contact_info: {
        email: "research@example.com",
        phone: "+431234567",
        location: "Graz",
        website: "https://company.test",
      },
    }),
  };

  const result = getJobContactDetails(job, "explicit@example.com");

  expect(result).toEqual({
    email: "explicit@example.com",
    phone: "+431234567",
    location: "Graz",
    website: "https://company.test",
  });
});

test("getJobContactDetails falls back through job and research data", () => {
  const job = {
    location: "Linz",
    research_data: JSON.stringify({
      contact_info: {
        phone: "+43111222",
      },
      known_data: {
        hq: "Salzburg",
      },
    }),
  };

  const result = getJobContactDetails(job);

  expect(result).toEqual({
    email: "",
    phone: "+43111222",
    location: "Salzburg",
    website: "",
  });
});

test("generateMailtoLink encodes recipient, subject, and CRLF body", () => {
  const link = generateMailtoLink(
    {
      title: "Frontend Engineer",
      contact_email: "jobs@example.com",
    },
    "Hallo\nWelt",
    "Max Mustermann",
  );

  expect(link.startsWith("mailto:jobs%40example.com?subject=")).toBe(true);
  expect(link.includes("Bewerbung%20als%20Frontend%20Engineer%20-%20Max%20Mustermann")).toBe(true);
  expect(link.includes("Hallo%0D%0AWelt")).toBe(true);
});

test("generateMailtoLink uses research email when direct contact email is missing", () => {
  const link = generateMailtoLink(
    {
      role: "Backend Engineer",
      research_data: JSON.stringify({
        contact_info: {
          email: "research@example.com",
        },
      }),
    },
    "Test",
    "Maria Musterfrau",
  );

  expect(link.startsWith("mailto:research%40example.com?subject=")).toBe(true);
});
