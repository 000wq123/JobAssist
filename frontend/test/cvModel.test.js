import { describe, expect, it } from "vitest";
import { normalizeProfile, DESIGN_PREVIEW, A4 } from "../src/cv/cvModel.js";

describe("cvModel normalizeProfile", () => {
  it("collapses empty/partial profiles to safe defaults without throwing", () => {
    const m = normalizeProfile({});
    expect(m.fullName).toBe("Name");
    expect(Array.isArray(m.jobs)).toBe(true);
    expect(Array.isArray(m.skills)).toBe(true);
    expect(Array.isArray(m.languages)).toBe(true);
    expect(m.accentColor).toBeTruthy();
  });

  it("maps real profile fields into the canonical model", () => {
    const m = normalizeProfile({
      vorname: "Anna", nachname: "Berger",
      role: "Projektmanagerin",
      telefon: "6601234567", ort: "Wien",
      faehigkeiten: ["Agil", "Kanban"],
      sprachkenntnisse: [{ sprache: "Deutsch", niveau: "Muttersprache" }],
      erfahrungen: [{ titel: "PM", organisation: "ACME", von: "2022", bis: "heute", bullets: ["Leitete X"] }],
      geburtsdatum: "",
    });
    expect(m.fullName).toBe("Anna Berger");
    expect(m.role).toBe("Projektmanagerin");
    expect(m.contact.phone).toBe("+43 6601234567"); // +43 prefix applied
    expect(m.skills).toContain("Agil");
    expect(m.languages[0].language).toBe("Deutsch");
    expect(m.jobs[0]).toMatchObject({ title: "PM", org: "ACME", to: "heute" });
    expect(m.jobs[0].bullets[0]).toBe("Leitete X");
  });

  it("keeps Austrian-specific fields", () => {
    const m = normalizeProfile({ staatsbuergerschaft: "Österreich", fuehrerschein: "B", arbeitserlaubnis: "ja" });
    expect(m.austrian.staatsbuergerschaft).toBe("Österreich");
    expect(m.austrian.fuehrerschein).toBe("B");
    expect(m.austrian.arbeitserlaubnis).toBe("ja");
  });
});

describe("design preview dataset", () => {
  it("is clearly separated from a live user profile (sample only for the catalogue)", () => {
    const preview = normalizeProfile(DESIGN_PREVIEW.profile);
    // The preview is intentionally rich so templates show real hierarchy.
    expect(preview.fullName).toBe("Anna Berger");
    expect(preview.jobs.length).toBeGreaterThanOrEqual(2);
    expect(preview.languages.length).toBeGreaterThanOrEqual(2);
    expect(preview.skills.length).toBeGreaterThanOrEqual(5);
    // The label makes the sample nature explicit for the UI.
    expect(DESIGN_PREVIEW.label).toBe("Beispielvorschau");
  });
});

describe("A4 metrics", () => {
  it("is a deterministic A4 sheet in points", () => {
    expect(A4.W).toBeGreaterThan(500);
    expect(A4.H - A4.W).toBeCloseTo(246.6, 1); // ~210×297mm ratio
  });
});