# JobAssist v1 — Product Reboot

**Status**: Locked direction. Spec in progress. Last updated: 2026-05-17.

This document supersedes everything in `frontend/REVAMP_PROGRESS.md` from
a *product* point of view. The UI work logged there continues to apply to
the surviving pages, but the product itself is being rebuilt around a new
core.

---

## 0. The constitution (non-negotiable)

These decisions are locked. Re-litigating them costs the project velocity.

- **Market**: Austria only for 12 months. Bayern expansion considered Q1 2027.
- **Audience**: 16–19yo teens/young adults looking for Praktikum, Teilzeit,
  Lehre, Samstagsjob, or first Ferialjob.
- **Form factor**: Mobile-first. Desktop derives from mobile.
- **Design direction**: Calm. No gamification. (Existing rules from prior
  redesign brief apply.)
- **Moat**: Localization + autopilot. Not "AI features". AI is a means.
- **Stack**: React 19 + Tailwind v4 + Vite frontend, existing FastAPI
  backend, Manifest V3 browser extension (Chrome first, Firefox port
  later). Postgres (assumed).
- **Budget reality (locked 2026-05-17)**: **€0 operating budget, no
  business entity yet**. v1 ships free-for-all. Monetization (Stripe +
  WhatsApp) gated behind incorporation, deferred to v1.1.
- **Team**: 1 solo dev (16yo, AT-resident, target-audience native) + me as
  implementation pair. Founder == user, which is the strongest possible
  PM signal. German copy + UX feel decisions belong to the founder; I
  draft, founder approves or rewrites.
- **Hosting**: Railway (to be set up). Free tier covers v1.
- **Domain**: `.tech` owned. Naming open — possibly rebrand before v1
  launch, but not blocking work.
- **Job inventory**: scrape (not yet started). Means the moat data
  pipeline is empty today; getting karriere.at scraping running is a
  prerequisite before Autopilot can be tested end-to-end.
- **Incorporation**: ~1 month out. v1.1 (paywall + WhatsApp) becomes
  realistic shortly after, not Q3.
- **What dies**: standalone AI Assistant page, CV analyzer concept, match
  score `%`, standalone cover letter generator, generic dashboard
  widgets, all gamification scaffolding.

---

## 1. The v1 surface — six features

Each feature has: scope, replaces, backend needs, UI, definition of done.
Anything not listed here is **out of scope** for v1. No exceptions.

### 1.1 — CV Builder

**Replaces**: `ResumePage.jsx` (the broken analyzer).

**Scope**: Guided wizard that builds a structured profile through
questions a teen can actually answer. Not an upload-and-analyze flow.

**Sections** (one screen each on mobile, all visible on desktop):
1. **Persönliches** — name, address, DOB, phone, email, citizenship,
   working permit if non-EU.
2. **Schule** — current school, year, target degree (Matura/Lehre/HTL/HAK).
3. **Erfahrungen** — one card per experience. Pre-fill suggestions:
   Babysitten, Nachhilfe geben, Familienbetrieb, Ferialjob, ehrenamtlich,
   Sportverein, Schulprojekt. Each becomes a structured entry.
4. **Skills** — Führerschein, Sprachen (Deutsch, Englisch, weitere), MS
   Office / Google Workspace, soft-skill tags from a fixed list.
5. **Interessen** — hobbies and personality signals (free-text + tags).
6. **Was suchst du?** — Praktikum/Teilzeit/Samstagsjob/Lehre, max
   Anfahrt, Branchen, ab wann verfügbar.

**Outputs**:
- Clean 1-page A4 PDF (the user can download and email manually if
  needed).
- Structured JSON profile stored server-side, consumed by Autopilot.

**AI moment** (exactly one, by design):
- Per experience card, a *"Lass mir das ausformulieren"* button that
  takes the user's bullets and outputs one polished sentence in formal
  German. User can edit. No magic across the whole CV — only one
  experience at a time.

**Definition of done**:
- Median completion time < 15 minutes
- Resumable (you can drop out mid-wizard and come back)
- PDF preview before commit
- Mobile-first (no horizontal scrolling, all CTAs above the fold)
- Per-section "Bearbeiten" works once committed
- Lint clean, no console errors

**Hard delete list when this ships**:
- `ResumePage.jsx` entirely
- "0/5 erledigt" checklist + every reference to it
- Generic "Deine Stärken" panel
- "Tieferes Feedback im Chat" CTA

---

### 1.2 — Job Inbox

**Replaces**: `DashboardPage.jsx` (the "Heute" empty desert) + the
status-pipeline part of `JobsPage.jsx`.

**Scope**: One linear list of *next actions* across all jobs. Inbox
model (Things 3 / Linear inbox), not Kanban.

**Action sources** (in order of priority):
- "Du kannst diese Bewerbung jetzt absenden" (a draft you started)
- "X Tage seit Bewerbung bei Y — Schnitt: 8 Tage. Nachfragen?"
- "Bewerbungsfrist bei Z läuft in N Tagen ab"
- "Neue passende Stelle: A bei B"
- "Termin am 22. Mai — Gespräch vorbereiten?"
- *(Quarter 2)* "Antwort von C erkannt — Status ändern?"

**Each row**:
- Title (one line, max 60 chars)
- *Why this is here* (one sub-line)
- Primary action (open / submit / prepare)
- Secondary: snooze 1 day, snooze 1 week, dismiss

**Filters**: heute, diese Woche, später, erledigt. Default: heute + diese
Woche.

**Empty state**: "Alles erledigt. Schau später wieder rein." No
encouragement copy. Calm.

**Definition of done**:
- Mobile-first single column
- Swipe to dismiss / snooze on mobile
- Empty state is honest, no fake "Vorschläge"
- "Erledigt" archive accessible but not loud

**Hard delete list when this ships**:
- `DashboardPage.jsx` greeting + "Neu für dich" carousel + status
  counter strip
- The 5-bucket counter (Gemerkt/Beworben/Im Gespräch/Angebot/Erledigt)
  as a visible UI element. Buckets still exist in DB as a status enum.
- `JobsPage.jsx` group-by-status view (replaced by Inbox; raw jobs list
  becomes a "Alle gespeicherten Jobs" secondary view, not primary)

---

### 1.3 — Application Autopilot (THE MOAT)

**Scope**: Browser extension that detects application forms on Austrian
job sites and fills them from the user's profile.

**Sites covered in v1** (locked, no scope creep):
1. `karriere.at`
2. `willhaben.at` (Jobs section)
3. AMS `eJob-Room`

That is it. Three sites. Adding employer career-page support is v2.

**Architecture**:
- **Manifest V3** Chrome extension. Firefox port week 10.
- Content script per domain, declarative form selectors checked into a
  versioned JSON in the repo.
- Profile fetched via authenticated API call to JobAssist backend on
  extension load.
- "Mit JobAssist bewerben" button injected next to the site's native
  apply button. One click → fill all fields → user reviews → user
  submits on the destination site (we never proxy the submission).
- Cover-letter blurb: 1-paragraph, ≤150 words, generated server-side
  from profile JSON + the job description visible in the DOM, editable
  in a panel before fill.

**Backend additions**:
- `GET /api/profile/autopilot` — returns the profile JSON shape
  the extension expects
- `POST /api/applications/log` — records "user X applied to job Y on
  site Z at time T" so the Inbox can create follow-up reminders
- `POST /api/ai/cover-blurb` — generates the blurb (existing LLM
  plumbing reused)

**Free tier limit**: 3 autopilots / month.
**Pro tier**: unlimited.

**Definition of done**:
- All 3 sites: end-to-end fill + submit works manually verified on
  the top 50 active jobs per site
- ≥90% field-detection accuracy per site (measured against a 100-job
  manual test set)
- Cover blurb avg length ≤150 words, formal German register
- Extension auto-updates selector JSON from backend without requiring
  Chrome Store re-publish
- Privacy: extension never reads DOM outside the 3 whitelisted
  domains. Hard-coded in Manifest V3 `host_permissions`.

**Risk mitigation**:
- ATS selectors break → automated smoke tests run nightly, alert on
  failures, weekly review of selector health
- Chrome Store review delay → submit week 6, expect approval week
  8–9; ship "web bookmarklet" version week 5 as fallback so we don't
  block launch on Google

---

### 1.4 — Notifications (Email + Web Push)

**Scope**: Reach the user outside the app without a business entity,
without paying a provider, without Meta approval.

**Why not WhatsApp in v1**: Twilio + WhatsApp Business API requires a
registered business identity (UID/Gewerbeschein). We have neither. Even
the cheapest "developer account" path bills against a payment method
tied to a verified business. **WhatsApp moves to v1.1**, gated behind
incorporation. Until then, two free channels:

**Channel 1: Email**
- Provider: **Resend** free tier (3,000 emails/month, no card required).
  Sufficient for ≤100 active beta users.
- Transactional only: verification, password reset, inbox-derived
  reminders, deadline alerts, new-match alerts.
- Per-user digest preference: instant / daily / weekly.

**Channel 2: Web Push**
- Standard browser Push API + VAPID keys. **Zero cost**, no third party.
- Service worker registered on first inbox visit; permission prompt
  shown contextually (after first saved job, never on signup).
- iOS 16.4+ Safari supports Web Push for installed PWAs only → ship as
  installable PWA. Android Chrome supports natively.
- Same 3 notification kinds as the original WhatsApp templates:
  1. **New job match** — "{title} bei {company}, {city}"
  2. **Follow-up reminder** — "{days} Tage seit Bewerbung bei
     {company} — nachfragen?"
  3. **Deadline alert** — "Bewerbungsfrist bei {company} in {days}
     Tagen"
- Tap → opens the Inbox item directly.

**Tier model in v1**: both channels are **free for everyone** (no Pro
yet — see §4).

**Definition of done**:
- Email send via Resend works end-to-end with custom domain DKIM
- PWA installable on Android Chrome + iOS 16.4+ Safari
- Web push permission flow contextual (not on signup)
- Notification preferences page: per-channel × per-kind matrix toggle
- Unsubscribe link on every email (1-click, no login required)

**v1.1 migration path**: when incorporation happens, swap the
notification dispatcher to add WhatsApp as a third channel. The Inbox
producer code is identical — only the delivery adapter changes.

---

### 1.5 — "Lohnt sich das?" Advisor

**Scope**: For every job offer the user views, inline indicator of
whether the listed wage is fair against the relevant Kollektivvertrag.

**Data**:
- WKO Kollektivvertrag-Datenbank — 5 sectors locked for v1:
  1. Handel (Einzelhandel)
  2. Gastronomie & Hotellerie
  3. Pflege & Sozialdienste
  4. Büro / Allgemein
  5. Lager / Logistik
- AMS Berufslexikon for branch → KV mapping
- Internal table: `kv_wages` (sector, role_tier, age_bracket, gross_per_hour, valid_from, valid_to)

**UI on the job detail page**:
- Card below the job description with three-state badge:
  - **Passt** — at or above KV minimum
  - **Grenzwertig** — within 5% below KV minimum
  - **Zu niedrig** — more than 5% below
- One-line explanation: "Spar bietet 6,80 €/h. KV Handel sagt 7,20 €/h
  für deine Altersgruppe."
- Secondary CTA: "Vorlage zum höflichen Nachfragen" → opens prefilled
  email/message to the employer

**Definition of done**:
- 5 sectors covered with current KV rates
- 90% of jobs on the 3 supported job sites auto-classified into a
  sector (manual fallback for the 10%)
- Quarterly KV refresh job scheduled
- Templates in formal German, reviewed by a native speaker (not me)

---

### 1.6 — Bewerbungsfristen Calendar

**Scope**: Personalized deadline awareness for Austrian
Lehre/Praktikum/Ferialjob cycles.

**Data**:
- Manually curated table: top 30 Austrian Lehrbetriebe + their
  application cycle (cycle_open, cycle_close, sector, region)
- Schultyp → Praktikumspflicht-Fenster mapping (HTL/HAK/BHS/AHS rules)
- AMS Lehrstellenbörse: weekly scrape

**UI**:
- Dedicated `/kalender` page (month or list view, mobile-first list)
- Inbox integration: deadlines within 14 days surface as Inbox items
- Personalized: filtered by user's school type + target sectors

**Definition of done**:
- 30 Lehrbetriebe seeded
- Personalization works (HTL student sees HTL Praktikumspflicht
  windows, etc.)
- Reminders fire 14 / 7 / 2 / 0 days before deadline via
  Inbox + email + web push (WhatsApp post-incorporation)

---

## 2. What dies (the deprecation list)

These are deleted *before* new feature work starts. Week 1 task. Reduces
mental load and surface area.

### Frontend pages to delete
- `frontend/src/pages/AIAssistantPage.jsx` + all routes + the
  4 quick-action tiles + the empfehlung banner
- `frontend/src/pages/CoverLetterPage.jsx` (functionality absorbed into
  Autopilot's cover blurb)
- The "Streak" scaffolding (already mostly stripped, verify zero refs)

### Frontend pages to rebuild from scratch
- `ResumePage.jsx` → CV Builder (1.1)
- `DashboardPage.jsx` → Job Inbox (1.2)
- `JobsPage.jsx` → simplified raw list, no status grouping

### Frontend pages to keep, lightly touch
- `JobAlertsPage.jsx` — already calm after Phase 14; integrate WhatsApp
  delivery toggle
- `JobDetailPage.jsx` — add "Lohnt sich das?" advisor card + "Mit
  JobAssist bewerben" extension hook
- `SettingsPage.jsx` — add WhatsApp number + verification + delivery
  preferences
- `BillingPage.jsx` — repricing per section 4

### Backend endpoints to delete
- `/api/ai/chat` (the open-ended chat — keep the LLM plumbing, kill
  the user-facing route)
- `/api/resumes/analyze` (the generic checklist generator)
- `/api/cover-letters/standalone` (absorbed)
- Match-score columns on jobs API response (keep computing the field
  if backend uses it internally, but stop returning it to the
  frontend)

### Database
- Don't *drop* columns yet. Stop *writing* to them. Schedule drop in
  v1.1 cleanup pass once we're confident nothing reads them.

---

## 3. Sprint plan (10 weeks)

Removing WhatsApp + paywall work frees ~2 weeks. Target: closed beta in
**week 10** instead of 12.

Assumption: **one engineer (you) + an LLM pair (me)**. If a 2nd engineer
joins, see §7.

| Week | Primary focus | Secondary (parallel) |
|------|---------------|----------------------|
| 1 | Spec lock + delete dead pages + Resend signup + DB migrations | KV data ingestion script (sector 1: Handel) |
| 2 | CV Builder structure (sections 1–3) | KV ingestion (sectors 2–3) |
| 3 | CV Builder structure (sections 4–6) + PDF export | KV ingestion (sectors 4–5) + VAPID keys generated |
| 4 | Job Inbox UI + reminder engine | Autopilot extension scaffold + manifest |
| 5 | Job Inbox actions + snooze + filters | Autopilot: karriere.at content script |
| 6 | Autopilot: karriere.at end-to-end + cover blurb | PWA manifest + service worker + web push wiring |
| 7 | Autopilot: willhaben content script | Email templates via Resend + unsubscribe flow |
| 8 | Autopilot: AMS eJob-Room | "Lohnt sich das?" advisor UI + KV mapping |
| 9 | Bewerbungsfristen calendar + seed data | Notification preferences page + Chrome Store submit |
| 10 | End-to-end testing + bug bash + closed beta (20 users) | — |

**Critical path items** (cannot slip):
- Week 6: Chrome Store submission ($5 one-time, 2-week review)
- Week 6: PWA / web push (iOS Safari only honors push on installable PWAs)
- Week 9: Chrome Store submission must be done by here at latest

**Cuttable if behind**:
- Bewerbungsfristen calendar reduces to a static `/kalender` page with
  5 hand-curated entries
- AMS eJob-Room support deferred to v1.1 if karriere.at + willhaben land first
- Firefox port deferred to v1.1

**Free-as-in-beer cost audit** (per month, ≤100 users):
- Resend: 3,000 emails free → €0
- Web Push: VAPID keys, self-hosted → €0
- Hosting: existing infra → €0 (assumed)
- LLM (cover blurbs + CV "ausformulieren"): ~5,000 calls × $0.001
  avg = $5/mo out of your pocket → ~€5
- Chrome Web Store publisher: $5 one-time → ~€5 total ever
- Domain: assumed already owned → €0

**Total v1 burn: ~€5–10/month from your wallet**, no business
entity needed. Sustainable until incorporation.

---

## 4. Pricing — deferred to v1.1

**v1 ships free for everyone.** No paywall, no Stripe, no tiers.
Rationale:
- No business entity → can't legally collect payment in AT as a
  proper business yet
- No proof the product works → unethical to charge first 50 beta
  users for an unproven thing
- Free distribution maximizes early signal and word-of-mouth

What we **DO** ship in v1 that *prepares* the paywall:
- Per-feature usage counters in the backend (so we know what
  "Pro-worthy" actually is once we turn it on)
- Soft limits via UI copy only ("Im kostenlosen Versuch verfügbar
  bis Pro-Start") — no enforcement, just expectation-setting
- Account model that already distinguishes `plan: 'free' | 'pro' |
  'family'` (defaulting to `'free'` for everyone)

### v1.1 plan (post-incorporation, target Q3 2026)

Tiers as previously specified — kept here for continuity:

- **Free** — CV Builder, Inbox, 3 Autopilots/month, email + push,
  basic "Lohnt sich das?", Kalender
- **Pro €4,90/mo** or **€39/year** — unlimited Autopilots, WhatsApp,
  full "Lohnt sich das?", Pro-only Inbox features TBD
- **Family €9,90/mo** (Q4) — Pro + parent view + quarterly coaching call

**Anti-sharing mechanics** — implementation deferred to v1.1:
- WhatsApp number binding (needs WhatsApp, which needs entity)
- Device fingerprint soft throttle at >3 active devices
- Stripe Customer = account
- *(Q2)* Voice profile binding for mock interviews
- *(Q2)* Gmail OAuth binding

The architecture from §1.4 ensures the v1.1 flip is a configuration
change, not a rewrite.

---

## 5. Database schema deltas

Backend migrations needed week 1. Approximate shape:

```sql
-- New: structured profile (CV Builder output)
CREATE TABLE profiles_v2 (
  user_id           uuid PRIMARY KEY,
  personal          jsonb NOT NULL DEFAULT '{}',
  school            jsonb NOT NULL DEFAULT '{}',
  experiences       jsonb NOT NULL DEFAULT '[]',
  skills            jsonb NOT NULL DEFAULT '{}',
  interests         jsonb NOT NULL DEFAULT '{}',
  preferences       jsonb NOT NULL DEFAULT '{}',
  completion_pct    int  NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- New: inbox items (next actions)
CREATE TABLE inbox_items (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  kind        text NOT NULL, -- 'application_draft', 'followup', 'deadline', 'new_match', 'interview'
  title       text NOT NULL,
  reason      text NOT NULL,
  payload     jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'open', -- open/snoozed/done/dismissed
  snooze_until timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- New: Kollektivvertrag wage table
CREATE TABLE kv_wages (
  id              serial PRIMARY KEY,
  sector          text NOT NULL,
  role_tier       text NOT NULL,
  age_bracket     text NOT NULL,
  gross_per_hour  numeric(6,2) NOT NULL,
  valid_from      date NOT NULL,
  valid_to        date,
  source_url      text NOT NULL
);

-- New: WhatsApp delivery
CREATE TABLE whatsapp_recipients (
  user_id        uuid PRIMARY KEY,
  phone_e164     text NOT NULL UNIQUE,
  verified_at    timestamptz,
  opted_out_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- New: application log (for Inbox + tracking)
CREATE TABLE applications (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL,
  job_id          uuid,           -- nullable: extension may log a one-off
  source_site     text NOT NULL,  -- 'karriere.at' | 'willhaben' | 'ams'
  applied_at      timestamptz NOT NULL DEFAULT now(),
  via             text NOT NULL,  -- 'autopilot' | 'manual'
  status          text NOT NULL DEFAULT 'sent' -- sent / responded / interview / offer / rejected / withdrawn
);

-- New: deadline catalog
CREATE TABLE deadlines (
  id              serial PRIMARY KEY,
  employer        text NOT NULL,
  sector          text,
  region          text,
  cycle_opens     date NOT NULL,
  cycle_closes    date NOT NULL,
  applies_to      text[] NOT NULL, -- ['HTL','HAK','AHS','BHS'] etc.
  source_url      text NOT NULL
);
```

Existing tables touched:
- `resumes` — keep upload functionality, deprecate analysis fields
- `users` — add `notification_channel` enum ('email','whatsapp')
- `subscriptions` / `billing` — adjust to new tier structure

---

## 6. Repo structure changes

```
JobAssist-main/
├── frontend/                    (existing React app)
├── backend/                     (existing FastAPI app)
├── extension/                   ★ NEW — Manifest V3 Chrome extension
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   │   ├── karriere-at.js
│   │   ├── willhaben.js
│   │   └── ams.js
│   ├── selectors/
│   │   ├── karriere-at.json    (selector versioning, hot-loaded)
│   │   ├── willhaben.json
│   │   └── ams.json
│   ├── popup/                   (extension UI)
│   └── shared/
├── data/                        ★ NEW — manually curated source data
│   ├── kv-wages.csv
│   ├── deadlines-seed.csv
│   └── employer-mapping.csv
└── PRODUCT_V1.md                (this file)
```

---

## 7. Open decisions (lock by end of week 1)

1. **Solo dev or team?** Sprint plan assumes solo. If you have a 2nd
   engineer, autopilot timeline compresses to weeks 4–7.
2. **Backend hosting**: stays where it is? Hobbyist plan is fine for
   ≤100 beta users. Reassess at v1.1.
3. **Job inventory source**: are we scraping karriere.at or paying for
   a feed? Affects autopilot prioritization. If we already scrape, the
   selectors we already have are gold.
4. **Naming**: keep "JobAssist"? Generic. Rebrand cheap-and-free in
   v1 (just a domain swap + logo) if you feel strongly.
5. **Beta cohort source**: AMS Jugendberatung? WKO Lehrlingsstelle?
   Schulen direkt? Reddit r/Austria? Determines week 1 outreach.
6. **Email sending domain**: do you own a domain we can attach DKIM
   for Resend? If not, beta can run on a `*.resend.dev` subdomain
   short term.
7. **Incorporation timeline**: when do you plan to register the
   Gewerbe / GmbH? Determines when v1.1 work (Stripe + WhatsApp
   + Pro tier) can begin. Doesn't block v1.

### Locked (no need to re-decide)

- ~~Pricing exact numbers~~ — deferred entirely to v1.1
- ~~First-Job-Guarantee~~ — moot until paid tier exists
- ~~WhatsApp provider~~ — Twilio when entity exists, not before

---

## 8. Success metrics (locked KPIs)

Measured weekly from beta launch (week 10) onwards.

**North-star**: *Applications submitted per active user per week.*
This is the only metric that proves the moat works.

**Supporting**:
- Autopilot success rate (% of started form-fills that reach submit)
- D1 / D7 / D30 retention
- Web Push opt-in rate among new signups (proxy for the future
  WhatsApp opt-in rate)
- Email open rate (digest vs instant)
- "Lohnt sich das?" engagement rate per job-detail-view
- **Pro-readiness signal**: % of users who hit (would-have-hit) the
  3-autopilots-per-month soft limit. Tells us paywall is worth
  enforcing in v1.1.
- NPS at 30 days (target: ≥40 — high bar for a job-search app)

**Anti-metrics** (we explicitly don't optimize):
- Time-in-app (calm direction — fast in, fast out)
- DAU (a teen who applied yesterday shouldn't open us today)
- Notifications sent per day (would tempt growth-hacking)

---

## 9. What stays the same

To prevent over-rewriting, this is the *don't touch* list:

- Auth (login, signup, password reset, email verification)
- Settings page structure (just add WhatsApp + delivery prefs)
- Legal pages (Impressum, Privacy, Terms)
- Existing job-inventory ingestion (whatever's producing rows in the
  jobs table — keep running)
- Stripe integration plumbing (just adjust the tiers it sells)
- The design tokens / accent diet rules from the prior redesign
- `frontend/REVAMP_PROGRESS.md` work on the calm direction — surviving
  pages stay calm

---

## 10. What I (Cascade) commit to

- Spec each of the 6 features into implementation tickets before code
- Maintain the selector JSONs and a test harness for autopilot
- Draft all German copy (template messages, blurbs, CTAs) for native
  review
- Update this doc at every meaningful decision point — no quiet drift
- Push back if a request reintroduces dead concepts (AI chat page,
  match scores, gamification, generic dashboards)

---

## Appendix A: Things explicitly considered and rejected

- **Mock interview voice mode in v1** — rejected. ChatGPT is good
  enough for now. Move to v2 when we have the Pro user base to justify
  the infra.
- **Gmail OAuth integration in v1** — rejected. High eng cost
  + Google review delay. v2.
- **Parent mode in v1** — rejected. Different UX surface. Killer
  feature for Family tier; ship in Q2 with proof of Pro retention.
- **Peer-baselines feature in v1** — rejected. Cold-start (needs
  N users). Q3 once we have data.
- **Generic AI chat refactor** — rejected. Concept itself is wrong.
- **Building a CRM-style pipeline view** — rejected. Inbox model wins.
- **Selling cover letters as a paid feature** — rejected. Absorbed
  into Autopilot's blurb generator. Cover letters alone are not a
  business.
- **Match score retention** — rejected. Replace with "passt / passt
  mit Lücken / passt nicht" binary on job detail; even that is
  optional. Backend may still compute, never returns to frontend.

---

## Appendix B: Death certificates

For sentimental closure, here is what specifically dies and why.

| Feature | Cause of death | Replaced by |
|---|---|---|
| AI Assistant page | Commodity wrapper around ChatGPT | In-context AI moments inside Autopilot + CV Builder |
| CV Analyzer + checklist | Teens have no CV to analyze | CV Builder (1.1) |
| Cover Letter standalone page | Single-use, commoditized | Cover blurb inside Autopilot (1.3) |
| Match score % | False precision, no real signal | Optional 3-state "passt" badge on job detail |
| Streak / gamification | Already mostly gone | Nothing |
| Generic dashboard | No reason to land here without an action | Job Inbox (1.2) |
| Status-grouped jobs page | Manual updates, Kanban for 11 items | Job Inbox (1.2) |
| Email-first alerts (as the *only* channel) | Teens don't read email frequently | Email + Web Push in v1 (1.4), WhatsApp added in v1.1 |
| Generic salary chat ("Was ist üblich?") | No specific info, no trust | "Lohnt sich das?" with KV data (1.5) |

May they rest. Pour one out.
