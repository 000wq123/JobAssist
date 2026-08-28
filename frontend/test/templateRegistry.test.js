import { describe, expect, it } from "vitest";
import {
  CV_TEMPLATES,
  getTemplateMeta,
  TEMPLATE_FILTERS,
  templateMatchesFilter,
} from "../src/cv/templateRegistry.js";

describe("CV template registry", () => {
  it("exposes friendly display names for all 8 archetypes", () => {
    const names = CV_TEMPLATES.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining([
      "Klassisch", "Elegant", "Modern", "Mit Seitenleiste", "Einfach & klar", "Mit Foto", "Für mehr Erfahrung", "Schule & Praktikum",
    ]));
    expect(names).toHaveLength(8);
    for (const name of names) {
      expect(name).not.toMatch(/ATS|Executive|Professional|Recruiter|Informationsdichte/u);
    }
  });

  it("keeps stable ids that saved CVs and the PDF renderer depend on", () => {
    const ids = CV_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining([
      "tabellarisch", "serif", "kontrast", "slim-sidebar", "spartan", "gray-header", "dark-bands", "zentriert",
    ]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("satisfies the archetype metadata contract", () => {
    for (const t of CV_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(typeof t.bestFor).toBe("string");
      expect(t.bestFor.length > 0, `${t.id} bestFor`).toBe(true);
      expect(["yes", "no", "optional"]).toContain(t.photo);
      expect(["one-column", "two-column"]).toContain(t.layout);
      expect(["compact", "balanced", "spacious"]).toContain(t.density);
      expect(["maximized", "compatible"]).toContain(t.ats);
      expect(typeof t.style).toBe("string");
      expect(t.source).toBeTruthy();
      expect(t.license).toBeTruthy();
    }
  });

  it("looks up metadata with a safe default", () => {
    expect(getTemplateMeta("tabellarisch").name).toBe("Klassisch");
    expect(getTemplateMeta("does-not-exist").id).toBe("tabellarisch");
  });

  it("contains genuinely different layout and content profiles", () => {
    expect(CV_TEMPLATES.filter((t) => t.layout === "two-column")).toHaveLength(1);
    expect(CV_TEMPLATES.filter((t) => t.photo === "no").length).toBeGreaterThanOrEqual(1);
    expect(new Set(CV_TEMPLATES.map((t) => t.density)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(CV_TEMPLATES.map((t) => t.style)).size).toBeGreaterThanOrEqual(3);
  });

  it("filters meaningfully by audience and photo", () => {
    const first = CV_TEMPLATES.filter((t) => templateMatchesFilter(t, "first-application"));
    expect(first.every((t) => t.audience === "Für die erste Bewerbung")).toBe(true);
    expect(first.length).toBeGreaterThanOrEqual(2);

    const photo = CV_TEMPLATES.filter((t) => templateMatchesFilter(t, "photo"));
    expect(photo.every((t) => t.photo !== "no")).toBe(true);

    const noPhoto = CV_TEMPLATES.filter((t) => templateMatchesFilter(t, "nophoto"));
    expect(noPhoto.every((t) => t.photo === "no")).toBe(true);
  });

  it("provides only useful plain-language filter chips", () => {
    const keys = TEMPLATE_FILTERS.map((f) => f.key);
    expect(keys).toEqual(["all", "first-application", "modern", "classic", "photo", "nophoto", "experienced"]);
    expect(TEMPLATE_FILTERS.map((f) => f.label)).not.toContain("ATS-maximiert");
    expect(TEMPLATE_FILTERS.map((f) => f.label)).not.toContain("Informationsdichte");
  });
});