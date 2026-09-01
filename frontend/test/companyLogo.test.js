import { describe, expect, it } from "vitest";
import { companyLogoKey } from "../src/components/job-detail/CompanyLogo";

describe("companyLogoKey", () => {
  it("uses company identity instead of a job listing URL", () => {
    expect(companyLogoKey("HOFER KG")).toBe("hofer");
    expect(companyLogoKey("HOFER Österreich")).toBe("hofer");
  });

  it("normalizes legal suffixes, casing and accents consistently", () => {
    expect(companyLogoKey("  BÖSCH GmbH  ")).toBe("bosch");
    expect(companyLogoKey("Bösch AG")).toBe("bosch");
  });
});
