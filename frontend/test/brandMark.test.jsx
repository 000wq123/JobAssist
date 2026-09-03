import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BrandMark from "../src/components/BrandMark";

describe("BrandMark", () => {
  it("uses the optimized lightweight brand assets, not the 1024px master", () => {
    const { container } = render(<BrandMark size="sm" />);
    const source = container.querySelector("picture > source");
    const img = container.querySelector("img");
    expect(source).not.toBeNull();
    expect(source.getAttribute("type")).toBe("image/webp");
    expect(source.getAttribute("srcset")).toContain("/branding/jobassist-logo-96.webp");
    expect(img.getAttribute("src")).toBe("/branding/jobassist-logo-64.png");
    expect(img.getAttribute("src")).not.toContain("jobassist-logo.png");
    expect(img.getAttribute("width")).toBe("64");
  });

  it("never references the unrelated legacy /public/logos assets", () => {
    const { container } = render(<BrandMark size="md" />);
    expect(container.innerHTML).not.toContain("/logos/icon.webp");
    expect(container.innerHTML).not.toContain("/logos/logo.svg");
  });

  it("applies the size class and passes the accessible label to the image", () => {
    const { container } = render(<BrandMark size="lg" label="JobAssist" />);
    const img = container.querySelector("img");
    expect(img.getAttribute("alt")).toBe("JobAssist");
    expect(container.firstElementChild.className).toContain("h-10");
  });
});
