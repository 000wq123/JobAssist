# JobAssist v1 — Backlog

Every atomic task. `[ ]` open · `[x]` done · `[!]` blocked · `[~]` WIP.
🧑 = you, 🤖 = me, 🧑🤖 = pair.

## P0 — Foundations

### Infra
- [x] 🧑 Railway account + backend project + Postgres
- [ ] 🧑 Railway env vars (DATABASE_URL, JWT_SECRET, LLM_API_KEY, BREVO_API_KEY, VAPID_PUB, VAPID_PRIV)
- [ ] 🧑 Deploy backend to Railway (smoke)
- [ ] 🧑 Frontend hosting (Railway or Vercel) + `.tech` domain attached
- [ ] 🧑 HTTPS verified
- [ ] 🧑 Brevo: add `.tech` domain + DKIM/SPF DNS records + verify sender
- [ ] 🧑 Test transactional send from Brevo → gmail
- [ ] 🧑🤖 Generate VAPID keypair, store in env
- [ ] 🧑 LLM provider key + spending cap

### Naming
- [ ] 🧑 Decide: keep "JobAssist" or rebrand
- [ ] 🧑 Subdomain layout: `app.X.tech` vs single domain

### DB migrations
- [ ] 🤖 Audit current schema
- [ ] 🤖 `profiles_v2` table
- [ ] 🤖 `inbox_items` table
- [ ] 🤖 `kv_wages` table
- [ ] 🤖 `applications` table
- [ ] 🤖 `deadlines` table
- [ ] 🤖 `web_push_subscriptions` table
- [ ] 🤖 `users`: add `plan`, `notification_channel`, `phone_e164`
- [ ] 🤖 `resumes`: stop writing `analysis_*`
- [ ] 🤖 Indexes: inbox(user_id,status,snooze), applications(user_id,applied_at), deadlines(cycle_closes)
- [ ] 🤖 Run on Railway

### Backend deprecations
- [ ] 🤖 `/ai-assistant/*` → 410 Gone
- [ ] 🤖 `/motivationsschreiben/*` → 410 Gone
- [ ] 🤖 Stop returning `match_score` field
- [ ] 🤖 `/resume/*/analyze` → return deprecation payload

### Match-score frontend removal
- [ ] 🤖 Delete `components/jobs/MatchScore.jsx`
- [ ] 🤖 `JobRow.jsx`: remove score block
- [ ] 🤖 `JobsPage.jsx`: remove score column + match-high/low sort
- [ ] 🤖 `DashboardPage.jsx`: remove score from cards
- [ ] 🤖 `JobDetailPage.jsx`: remove `xx %` hero + `QualifikationsCheck`
- [ ] 🤖 `applicationsState.js`: drop `filterMinMatch` and match sorts

### Lint debt
- [ ] 🤖 `SettingsPage`: drop unused `MapPin`, `Briefcase`
- [ ] 🤖 `BillingPage`: drop `UsageRow`, `currentPlan`
- [ ] 🤖 `services/api.js`: guard `console.log` behind `import.meta.env.DEV`
- [ ] 🤖 0 errors, 0 warnings

### Scraper baseline
- [ ] 🧑🤖 karriere.at scraper (cron, writes `jobs`)
- [ ] 🧑🤖 Dedup on `source_id`
- [ ] 🧑🤖 Field normalization
- [ ] 🧑🤖 Throttle ~1 req/2s
- [ ] 🧑🤖 Robots/ToS sanity check
- [ ] 🧑🤖 willhaben scraper (later)
- [ ] 🧑🤖 AMS scraper (later)

## P1 — CV Builder

### Data model
- [ ] 🤖 `cv/profileSchema.js` (JSDoc + default empty)
- [ ] 🤖 `cv/storage.js` (debounced localStorage)
- [ ] 🤖 `cv/validators.js` (per-step required)
- [ ] 🤖 `cv/completion.js` (% calc)
- [ ] 🤖 `STORAGE_KEYS.CV_PROFILE = "cv_profile_v1"` (cleared on logout)

### Wizard shell
- [ ] 🤖 `pages/CVBuilderPage.jsx` (6 steps, autosave, resumable)
- [ ] 🤖 Step indicator "Schritt X von 6" (no progress bar — calm)
- [ ] 🤖 Next / Zurück / Speichern
- [ ] 🤖 Route `/lebenslauf`; old `/resume` → 301
- [ ] 🤖 Update sidebar/topnav target to `/lebenslauf`

### Step 1 — Persönliches
- [ ] 🤖 Vorname, Nachname (required)
- [ ] 🤖 Geburtsdatum (dd.mm.yyyy)
- [ ] 🤖 Strasse, PLZ, Ort
- [ ] 🤖 Telefon (+43)
- [ ] 🤖 Email (prefill from auth)
- [ ] 🤖 Staatsbürgerschaft (default AT)
- [ ] 🤖 Arbeitserlaubnis (conditional, non-EU/EFTA)
- [ ] 🧑 Copy review

### Step 2 — Schule
- [ ] 🤖 Schule (autocomplete from seed list)
- [ ] 🤖 Schultyp (AHS/HTL/HAK/BHS/NMS/PTS/Sonstige)
- [ ] 🤖 Klasse, geplanter Abschluss, Abschlussjahr
- [ ] 🤖 Seed CSV: top 100 AT schools

### Step 3 — Erfahrungen
- [ ] 🤖 Card list (add/edit/delete/reorder)
- [ ] 🤖 Empty-state copy: "Babysitten, Nachhilfe, Familienbetrieb zählen auch."
- [ ] 🤖 Suggestion chips (Babysitten, Nachhilfe, Ferialjob, Familienbetrieb, Ehrenamt, Sport, Schulprojekt, Eigenes Projekt)
- [ ] 🤖 Editor modal: Art/Titel/Org/Von/Bis/Bullets
- [ ] 🤖 "Ausformulieren" AI button per experience
- [ ] 🤖 Backend `/api/ai/rewrite-experience` (≤2 Sätze, formal)
- [ ] 🧑 Copy review

### Step 4 — Skills
- [ ] 🤖 Führerschein (Keiner/L17/B)
- [ ] 🤖 Sprachen (Sprache + CEFR/Muttersprache, default DE/MS)
- [ ] 🤖 Computer/Software (tag input + suggestions)
- [ ] 🤖 Soft Skills (multi-select from fixed list, max 5)
- [ ] 🧑 Final soft-skills list review

### Step 5 — Interessen
- [ ] 🤖 Hobbys (free-tag)
- [ ] 🤖 Kurzbeschreibung (≤250 char)
- [ ] 🤖 Optional "Ausformulieren"

### Step 6 — Was suchst du?
- [ ] 🤖 Job-Art chips (Praktikum/Teilzeit/Samstag/Lehre/Ferialjob)
- [ ] 🤖 Max Anfahrt (slider 0–90 min)
- [ ] 🤖 Branchen (canonical list)
- [ ] 🤖 Verfügbar ab (date)

### Review + PDF
- [ ] 🤖 Review screen, inline-editable
- [ ] 🤖 PDF: `@react-pdf/renderer`, A4 1-page, calm template
- [ ] 🤖 Filename `Lebenslauf_<Nachname>_<Vorname>.pdf`
- [ ] 🧑 Visual review mobile + desktop + print

### Backend persistence
- [ ] 🤖 `GET /api/profile/v2`
- [ ] 🤖 `PUT /api/profile/v2`
- [ ] 🤖 `PATCH /api/profile/v2/section/:name`
- [ ] 🤖 Server-side validation mirroring frontend
- [ ] 🤖 Dual-write (localStorage + API), last-write-wins on login

### Old retirement
- [ ] 🤖 Delete `pages/ResumePage.jsx`
- [ ] 🤖 Delete `components/resume/SkillBars.jsx`
- [ ] 🤖 Stop computing `analysis_*` on resumes table

## P2 — Jobs simplification

- [ ] 🤖 `JobsPage`: flat list, sort by recency
- [ ] 🤖 Filter chips: Praktikum/Teilzeit/Samstag/Lehre/Alle
- [ ] 🤖 Search bar (company OR role)
- [ ] 🤖 "Gespeichert" toggle filter
- [ ] 🤖 Pagination / infinite scroll
- [ ] 🤖 Empty-state copy
- [ ] 🤖 `JobDetailPage`: clean hero (title/company/loc/date/save)
- [ ] 🤖 Description render
- [ ] 🤖 "Lohnt sich das?" card placeholder
- [ ] 🤖 "Mit JobAssist bewerben" CTA placeholder
- [ ] 🤖 Status changer dropdown
- [ ] 🤖 Strip cover-letter standalone (defer)
- [ ] 🤖 `DashboardPage` interim: greeting + "Zu deiner Liste" CTA, "Inbox kommt bald"

## P3 — Job Inbox

### Backend
- [ ] 🤖 Cron: regen Inbox every 6h per user
- [ ] 🤖 Rule: draft application (>3d Interesse, no apply)
- [ ] 🤖 Rule: follow-up (>7d since apply, no response)
- [ ] 🤖 Rule: deadline ≤14d, profile matches
- [ ] 🤖 Rule: new match (<48h, profile matches)
- [ ] 🤖 Rule: interview reminder (if interview date logged)
- [ ] 🤖 Dedupe within 48h
- [ ] 🤖 `GET /api/inbox?filter=…`
- [ ] 🤖 `PATCH /api/inbox/:id` (done/dismissed/snoozed)
- [ ] 🤖 `POST /api/inbox/:id/action`

### Frontend
- [ ] 🤖 `pages/InboxPage.jsx` at `/dashboard`
- [ ] 🤖 Filter chips: Heute · Diese Woche · Später · Erledigt
- [ ] 🤖 Item card: title, reason, primary action, `⋯` menu
- [ ] 🤖 Swipe gestures (snooze right, dismiss left) mobile
- [ ] 🤖 Empty state: "Alles erledigt."
- [ ] 🤖 Optimistic UI
- [ ] 🤖 Loading skeleton
- [ ] 🤖 "Ich habe mich beworben" button on JobDetail
- [ ] 🤖 Delete old `DashboardPage.jsx`

## P4 — "Lohnt sich das?"

- [ ] 🧑 Identify KV sources (WKO PDFs) for 5 sectors
- [ ] 🧑🤖 Transcribe KV min hourly × age brackets (16/17/18+)
- [ ] 🤖 `data/kv-wages.csv` committed
- [ ] 🤖 Ingestion script → `kv_wages` table
- [ ] 🤖 Document quarterly refresh in README
- [ ] 🤖 Sector classifier (regex first, LLM fallback)
- [ ] 🤖 Cache classification on `jobs.inferred_sector`
- [ ] 🤖 Evaluator function (passt/grenzwertig/zu_niedrig/kein_signal)
- [ ] 🤖 `GET /api/wages/check?job_id=X`
- [ ] 🤖 3-state badge component
- [ ] 🤖 Reasoning text + expandable "Wie wird das berechnet?"
- [ ] 🤖 Templates: ask_for_kv_minimum / ask_about_trinkgeld / decline_low_offer
- [ ] 🤖 "Kopieren" + mailto: actions
- [ ] 🧑 Copy review of templates

## P5 — Bewerbungsfristen Calendar

- [ ] 🧑 Compile top 30 AT Lehrbetriebe + cycle dates
- [ ] 🧑 Pflichtpraktikum windows per Schultyp
- [ ] 🤖 `data/deadlines-seed.csv`
- [ ] 🤖 Ingestion script
- [ ] 🤖 `pages/CalendarPage.jsx` at `/kalender`
- [ ] 🤖 Mobile list view + filter chips
- [ ] 🤖 Sidebar nav entry
- [ ] 🤖 Inbox generator pulls deadlines 14/7/2/0d out

## P6 — Application Autopilot (Chrome ext)

⚠️ Needs P0 scraper + P1 profile shape.

### Scaffold
- [ ] 🧑🤖 `extension/` dir, Manifest V3, `host_permissions` 3 domains
- [ ] 🤖 Background service worker
- [ ] 🤖 Content script loader
- [ ] 🤖 Popup UI (sign-in + recent applications)
- [ ] 🧑 Chrome Web Store publisher ($5)
- [ ] 🤖 Build pipeline → `extension/dist.zip`

### Auth
- [ ] 🤖 `/extension-auth` page in app issues long-lived token bound to ext ID
- [ ] 🤖 Token in `chrome.storage.local`
- [ ] 🤖 Refresh on 401

### Profile + selectors
- [ ] 🤖 `GET /api/profile/autopilot` (flat shape for form-fill)
- [ ] 🤖 Cache profile extension-side
- [ ] 🤖 `extension/selectors/karriere-at.json` (50+ fields)
- [ ] 🤖 `extension/selectors/willhaben.json`
- [ ] 🤖 `extension/selectors/ams.json`
- [ ] 🤖 `GET /api/extension/selectors/:domain` hot-load

### Content scripts
- [ ] 🤖 karriere.at: detect form, inject button, fill, review panel
- [ ] 🤖 User submits on destination site (we don't proxy)
- [ ] 🤖 willhaben (after karriere lands)
- [ ] 🤖 AMS (after willhaben lands)

### Cover blurb + logging
- [ ] 🤖 `POST /api/ai/cover-blurb` (≤150 words formal DE)
- [ ] 🤖 Cache per (user, job)
- [ ] 🤖 Editable textarea in review panel
- [ ] 🤖 `POST /api/applications/log`
- [ ] 🤖 Triggers Inbox follow-up scheduling

### Health
- [ ] 🤖 Nightly selector smoke test (top-100 jobs/site)
- [ ] 🤖 Status endpoint: % working today

### Store submission
- [ ] 🧑 Privacy URL + extension section
- [ ] 🧑 Screenshots + listing copy
- [ ] 🧑 Submit, respond to review

## P7 — Notifications (Email + Web Push)

### PWA
- [ ] 🤖 `public/manifest.json` (icons 192/512/maskable, standalone)
- [ ] 🧑🤖 App icons design
- [ ] 🤖 `service-worker.js` (offline app shell)
- [ ] 🤖 Android install prompt (`beforeinstallprompt`)
- [ ] 🤖 iOS Safari install instructions modal

### Web push
- [ ] 🤖 SW push event handler
- [ ] 🤖 Notification click → opens Inbox item URL
- [ ] 🤖 Prompt timing: after first saved job, not signup
- [ ] 🤖 `POST/DELETE /api/push/subscribe`
- [ ] 🤖 Backend `pywebpush` dispatcher
- [ ] 🤖 Notification dispatcher interface (WhatsApp slots in later)
- [ ] 🧑 E2E test Android Chrome
- [ ] 🧑 E2E test iOS PWA (Safari 16.4+)

### Email (Brevo)
- [ ] 🤖 SDK integration
- [ ] 🤖 Templates: verify, reset, digest (daily/weekly), match, follow-up, deadline
- [ ] 🤖 1-click unsubscribe (signed token)
- [ ] 🤖 Frequency limiter (max 1 instant per kind per 6h)
- [ ] 🧑 Copy review

### Preferences UI
- [ ] 🤖 `SettingsPage` → "Benachrichtigungen"
- [ ] 🤖 Per-channel + per-kind toggles
- [ ] 🤖 Digest frequency (sofort/täglich/wöchentlich)

## P8 — Settings, legal, polish

- [ ] 🤖 Settings: profile editable fields
- [ ] 🤖 Settings: Konto löschen (Gefahrenzone bottom)
- [ ] 🤖 `GET /api/users/me/export` (GDPR JSON dump)
- [ ] 🤖 Decide Foto-Upload: ship or remove
- [ ] 🧑🤖 Privacy: web push section
- [ ] 🧑🤖 Privacy: scraping disclosure
- [ ] 🧑🤖 Privacy: extension data flow
- [ ] 🧑🤖 Impressum: Railway + Brevo as processors
- [ ] 🧑🤖 Cookie banner copy
- [ ] 🧑🤖 Terms: beta clause, drop paywall language
- [ ] 🤖 Nav final order: Dashboard · Stellen · Lebenslauf · Alerts · Kalender · Einstellungen
- [ ] 🤖 Stub "Abonnement" until v1.1
- [ ] 🤖 Mobile bottom nav: 4 + Mehr
- [ ] 🤖 First-run after signup → `/lebenslauf` (no tour modal)
- [ ] 🤖 Banner on Inbox until profile ≥50% complete

## P9 — Pre-launch testing

- [ ] 🧑 Android Chrome real device — full path
- [ ] 🧑 iOS Safari real device — full path
- [ ] 🧑 PWA install Android + iOS
- [ ] 🧑 Push delivery Android
- [ ] 🧑 Push delivery iOS PWA
- [ ] 🧑 Email delivery — inbox not spam, DKIM/SPF green
- [ ] 🧑 Extension on karriere.at × 5 jobs
- [ ] 🧑 Extension on willhaben × 5
- [ ] 🧑 Extension on AMS × 5
- [ ] 🧑 CV Builder full flow on mobile <15 min
- [ ] 🧑 PDF in Adobe + Preview + Google Drive
- [ ] 🧑 Print on A4 paper
- [ ] 🧑 Lighthouse: PWA ≥90, Perf ≥80, A11y ≥95
- [ ] 🧑 axe-core: 0 criticals
- [ ] 🤖 Confirm `host_permissions` = 3 domains exactly
- [ ] 🤖 No PII in client error logs
- [ ] 🤖 Cookie consent gates analytics
- [ ] 🤖 /me/delete really deletes
- [ ] 🤖 Rate-limit auth endpoints
- [ ] 🤖 CORS `.tech` origins only
- [ ] 🤖 CSP headers

## P10 — Beta launch

- [ ] 🧑 AMS Jugendberatung outreach email + Loom
- [ ] 🧑 WKO Lehrlingsstelle outreach
- [ ] 🧑 5 AT Schulen (HTL/HAK/BHS) outreach
- [ ] 🧑 Reddit r/Austria + r/wien post
- [ ] 🧑 WhatsApp 10 friends
- [ ] 🧑 Optional: TikTok/IG short of Autopilot in action
- [ ] 🧑 Feedback channel (Discord/Telegram/typeform)
- [ ] 🧑🤖 Plausible or Umami self-hosted on Railway
- [ ] 🧑 GitHub Issues bug template
- [ ] 🧑 Status page
- [ ] 🧑🤖 Beta README (what works, what doesn't)
- [ ] 🧑🤖 2-min Loom demo
- [ ] 🧑 Watch: CV completion, Autopilot fills, fill→submit %, inbox act/dismiss, push opt-in, D1

## P11 — v1.1 prep (parallel)

### Incorporation
- [ ] 🧑 Decide form (Einzelunternehmen/GmbH/FlexCo)
- [ ] 🧑 Register Gewerbe, UID issued
- [ ] 🧑 Business bank account
- [ ] 🧑 Steuerberater consult
- [ ] 🧑 GDPR rep in Impressum

### Twilio + WhatsApp
- [ ] 🧑 Sign up Twilio with business identity
- [ ] 🧑 Register WhatsApp sender number
- [ ] 🧑 Submit 3 templates for Meta (match/followup/deadline)
- [ ] 🤖 Wire WhatsApp into dispatcher
- [ ] 🤖 OTP phone binding
- [ ] 🤖 STOP opt-out

### Stripe + paywall
- [ ] 🧑 Stripe account business
- [ ] 🧑 Products: Pro €4,90/mo, €39/yr
- [ ] 🤖 Subscription state machine
- [ ] 🤖 Webhook handler
- [ ] 🤖 Enforce Autopilot 3/mo on free
- [ ] 🤖 Paywall modal (calm)
- [ ] 🤖 Decide trial (14d? skip?)

### Family tier (later)
- [ ] 🤖 Parent role + read-only view
- [ ] 🤖 Anregungen channel
- [ ] 🤖 Stripe Family product

## Parking lot (NOT in v1)

Mock interview voice · Gmail auto-detect · Parent mode · Peer baselines · Employer-specific salary intel · LinkedIn-style sharing · Job-posting features · Native iOS/Android · AI chat page · Match % · Streaks/gamification.

## Open one-shot decisions

- [ ] 🧑 Naming (keep/rebrand)
- [ ] 🧑 Domain layout (`app.X.tech` vs single)
- [ ] 🧑 Frontend host (Railway vs Vercel)
- [ ] 🧑 LLM provider (Groq llama-3 70B = free-ish, Anthropic Haiku = cheap, OpenAI 4o-mini = balanced)
- [ ] 🧑 PWA icon direction
- [ ] 🧑 Email digest: opt-in or opt-out at signup
