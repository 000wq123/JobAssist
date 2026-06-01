#!/usr/bin/env python3
path = "/home/davorrr/Documents/JobAssist-main/frontend/src/pages/JobsPage.jsx"
with open(path, "rb") as f:
    content = f.read()

# Find the line with "match_score" and show hex around it
idx = content.find(b"match_score")
if idx != -1:
    snippet = content[max(0,idx-20):idx+40]
    print("Hex dump:")
    for i in range(0, len(snippet), 16):
        hex_part = ' '.join(f'{b:02x}' for b in snippet[i:i+16])
        ascii_part = ''.join(chr(b) if 32 <= b < 127 else '.' for b in snippet[i:i+16])
        print(f"  {i:04x}: {hex_part:<48} {ascii_part}")
