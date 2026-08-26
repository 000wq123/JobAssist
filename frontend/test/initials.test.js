import { describe, it, expect } from "vitest";
import { getInitials } from "../src/utils/initials";

describe("getInitials", () => {
  it("uses first letters of first + last name", () => {
    expect(getInitials("Max Mustermann", "max@example.com")).toBe("MM");
    expect(getInitials("Anna Maria Huber", "anna@example.com")).toBe("AH");
  });

  it("uppercases a single-word name (two letters)", () => {
    expect(getInitials("anna", "anna@example.com")).toBe("AN");
    expect(getInitials("Anna", "anna@example.com")).toBe("AN");
  });

  it("falls back to the email local part when the name is missing", () => {
    expect(getInitials("", "anna@example.com")).toBe("AN");
    expect(getInitials(null, "anna@example.com")).toBe("AN");
    expect(getInitials(undefined, "a@example.com")).toBe("A");
    expect(getInitials("   ", "max.mustermann@example.com")).toBe("MA");
  });

  it("never returns a lowercase letter when a name or email exists", () => {
    const out = getInitials("anna", "anna@example.com");
    expect(out).toBe(out.toUpperCase());
    const out2 = getInitials("", "anna@example.com");
    expect(out2).toBe(out2.toUpperCase());
  });

  it("returns '?' only when nothing is available", () => {
    expect(getInitials(null, null)).toBe("?");
    expect(getInitials("", "")).toBe("?");
    expect(getInitials(undefined, undefined)).toBe("?");
  });

  it("strips punctuation from the email fallback", () => {
    expect(getInitials(null, "anna.muster@example.com")).toBe("AN");
  });
});
