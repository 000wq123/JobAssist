#!/usr/bin/env python3
import re

path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace any irregular whitespace (non-breaking space U+00A0, etc.) with regular spaces
# in the problematic line pattern
old = "`${Math.round(best.match_score)} % Passung`"
# The % might be preceded by U+00A0 instead of U+0020
# Find the pattern and fix it
pattern = r'`\$\{Math\.round\(best\.match_score\)\}\s+% Passung`'
replacement = '`${Math.round(best.match_score)} % Passung`'

new_content, count = re.subn(pattern, replacement, content)
if count:
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Fixed {count} occurrence(s)")
else:
    print("Pattern not found, trying line-based fix...")
    lines = content.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if "Math.round(best.match_score)" in line and "% Passung" in line:
            # Replace any non-ASCII whitespace before % with regular space
            fixed = re.sub(r'([^\x00-\x7F])', ' ', line)
            if fixed != line:
                lines[i] = fixed
                print(f"Fixed line {i+1}")
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Done")
