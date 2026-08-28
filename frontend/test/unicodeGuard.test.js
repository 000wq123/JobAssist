import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard: German UI copy must never render escaped sequences like
 * `Stichwort, Firma, Beruf\u2026` or `Zur\u00fcck` on screen.
 *
 * A literal `\uXXXX` inside a JSX text node, placeholder, aria-label, or a
 * string literal that ends up in the DOM is a bug — it displays as raw
 * escape text instead of the intended character.
 *
 * Legitimate exceptions (checked below):
 *  - `\ufeff` BOM prefix for Word .doc exports (exportPdf / modals)
 *  - `\uXXXX` escapes inside react-pdf Text nodes (CVTemplate) — these are
 *    decoded by the PDF engine and never appear in the DOM.
 */
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(jsx|js)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const ALLOWED_FILES = new Set([
  // \ufeff BOM for Word documents — required by the .doc export format.
  join(process.cwd(), "src/cv/exportPdf.jsx"),
  join(process.cwd(), "src/components/job-detail/CoverLetterModal.jsx"),
  join(process.cwd(), "src/components/job-detail/InterviewSheet.jsx"),
  // \u00c4 inside react-pdf <Text> — decoded by the PDF engine, not the DOM.
  join(process.cwd(), "src/cv/CVTemplate.jsx"),
]);

describe("unicode escape guard", () => {
  it("never shows literal \\uXXXX escapes in source that reaches the UI", () => {
    const files = walk(join(process.cwd(), "src"));
    const offenders = [];

    for (const file of files) {
      if (ALLOWED_FILES.has(file)) continue;
      const src = readFileSync(file, "utf8");
      // Literal backslash-u followed by 4 hex digits inside any string or JSX
      // text. Legit runtime escapes (e.g. JSON.parse targets) don't use a
      // literal backslash in source.
      const matches = src.match(/\\u[0-9a-fA-F]{4}/g);
      if (matches && matches.length) {
        const line = src
          .split("\n")
          .findIndex((l) => /\\u[0-9a-fA-F]{4}/.test(l));
        offenders.push(`${file}:${line + 1} → ${matches.join(", ")}`);
      }
    }

    expect(offenders, `Escaped unicode in user-visible source:\n${offenders.join("\n")}`).toEqual([]);
  });
});
