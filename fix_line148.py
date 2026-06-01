#!/usr/bin/env python3
path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Completely replace line 148 (index 147) with a clean version
old_line = lines[147]
new_line = '      sub: best.match_score != null ? `${Math.round(best.match_score)} % Passung` : null,\n'
lines[147] = new_line

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Replaced line 148")
print(f"Old: {old_line!r}")
print(f"New: {new_line!r}")
