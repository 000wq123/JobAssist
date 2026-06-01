#!/usr/bin/env python3
path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Line 148 (0-indexed 147)
line = lines[147]
# Replace any non-ASCII whitespace before % with regular space
fixed = line.replace("\u00a0", " ").replace("\u200b", "").replace("\u200c", "").replace("\u200d", "")
if fixed != line:
    lines[147] = fixed
    print("Fixed irregular whitespace on line 148")
else:
    print("No irregular whitespace found on line 148")

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
