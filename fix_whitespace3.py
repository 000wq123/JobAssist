#!/usr3/env python3
path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find and replace the exact problematic substring
# The issue is an irregular whitespace between } and %
old = "`${Math.round(best.match_score)}"
# Find position
idx = content.find(old)
if idx != -1:
    # Check the next few chars
    snippet = content[idx:idx+50]
    print("Found snippet:", repr(snippet))
    # Replace everything from the old pattern to the end of the line with clean version
    start = content.find(old)
    end = content.find("` : null,", start) + len("` : null,")
    bad = content[start:end]
    good = "`${Math.round(best.match_score)} % Passung` : null,"
    print("Bad:", repr(bad))
    print("Good:", repr(good))
    content = content.replace(bad, good, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found")
