import { describe, expect, it } from "vitest";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { cvPdfFileName } from "../src/cv/exportPdf.jsx";
import CVTemplate from "../src/cv/CVTemplate.jsx";
import { DESIGN_PREVIEW } from "../src/cv/cvModel.js";
import { CV_TEMPLATES } from "../src/cv/templateRegistry.js";

describe("CV PDF filename", () => {
  it("uses the real profile name and strips unsafe filename characters", () => {
    expect(cvPdfFileName({ vorname: "Davor/", nachname: "Radeški<script>" })).toBe("Davor_Radeškiscript_Lebenslauf.pdf");
  });

  it("falls back for an empty profile", () => {
    expect(cvPdfFileName({})).toBe("Lebenslauf_Lebenslauf.pdf");
  });

  it("renders every registered template from one raw profile", async () => {
    for (const template of CV_TEMPLATES) {
      const profile = { ...DESIGN_PREVIEW.profile, hobbys: "Laufen, Reisen\nSeit mehreren Jahren aktiv.", templateId: template.id };
      const blob = await pdf(React.createElement(CVTemplate, { profile })).toBlob();
      expect(blob.type, template.id).toBe("application/pdf");
      expect(blob.size, template.id).toBeGreaterThan(1000);
    }
  }, 30_000);
});
