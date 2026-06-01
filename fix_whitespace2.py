#!/usr/bin/env python3
path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

lines = content.splitlines(keepends=True)
for i, line in enumerate(lines):
    if "Math.round(best.match_score)" in line and "% Passung" in line:
        # Normalize all non-ASCII chars to ASCII equivalents
        fixed = line.encode('ascii', 'ignore').decode('ascii')
        # The % might have been removed, so reconstruct
        fixed = fixed.replace(" Passung", " % Passung")
        lines[i] = fixed
        print(f"Fixed line {i+1}: {fixed.strip()!r}")

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
print("Done")
