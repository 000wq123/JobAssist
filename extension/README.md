# JobAssist Chrome Extension

Manifest V3 extension that adds a **"In JobAssist speichern"** floating button to job listing pages on supported Austrian job boards.

## Supported Sites

| Site | URL Pattern | Status |
|---|---|---|
| karriere.at | `https://www.karriere.at/jobs/*` | Ready |
| willhaben.at | `https://www.willhaben.at/iad/.../jobs-karriere/*` | Ready |
| AMS (Arbeitsmarktservice) | `https://jobs.ams.at/public/emas/jobsuchdetail/*` | Ready |

## How it works

1. Open any job detail page on a supported site.
2. A floating button appears in the bottom-right corner.
3. Click it to open JobAssist with the job title, company, and URL pre-filled.

## Installation (developer mode)

1. Generate the icon PNGs (see `icons/.gitkeep`).
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (toggle top-right).
4. Click **Load unpacked** and select this `extension/` folder.
5. Visit a job listing on karriere.at — the button should appear.

## Publish to Chrome Web Store

1. Zip the `extension/` folder (exclude `README.md` and `.gitkeep`).
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
3. Pay the $5 one-time developer registration fee.
4. Upload the zip and fill in store listing details.

## Files

- `manifest.json` — Extension manifest (V3)
- `content.js` — Injected into job listing pages; extracts data and renders the button
- `content.css` — Button styling (scoped to `.jobassist-*` classes)
- `popup.html` — Clicking the extension toolbar icon shows a quick-info popup
- `icons/` — Extension icons (16, 32, 48, 128 px PNGs)
