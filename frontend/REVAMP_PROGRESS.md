# Linear-Style Revamp — Progress

> Direction A locked. See chat for full reasoning. This doc is a single-source-of-truth so the work survives session resets.

## Locked decisions

1. **Hero accent**: serif italic accent word killed entirely in-app. Stays on marketing/auth.
2. **Nav**: 240 px persistent left rail on desktop (≥ md). Mobile keeps existing bottom-nav. No hamburger drawer.
3. **Card chrome**: `Card` deprecated. New `Section` primitive: title + actions + children, bordered *only* for true data islands. Default = content on bare surface with hairline dividers.

## Phases

- [x] **Phase 1 — Foundation**
  - [x] Added in-app type scale: `--text-page-title` (24), `--text-subhead-lg` (19), `--text-subhead` (17), `--text-body-lg` (15), `--text-meta` (12), `--text-micro` (11)
  - Color palette already had success/warn/error/info-soft variants; no change
  - Inter font weights already loaded via index.css; no change

- [x] **Phase 2 — Shell**
  - [x] New `components/shell/LeftRail.jsx` — 240 px sticky rail with brand, search button, primary nav, secondary nav, user pill
  - [x] `AppShell.jsx` — desktop `flex-row` (rail + content), mobile `flex-col` (TopNav + content + bottom-nav). TopNav hidden ≥ md.
  - [x] Killed both ambient radial glows (Linear has no glow). Marketing/auth pages keep theirs.

- [x] **Phase 3 — Primitives**
  - [x] New `components/ui/Section.jsx` — unbordered by default; `bordered` opt-in for data islands
  - [x] `PageHeader.jsx` — stripped serif accent + size variants; legacy props accepted but ignored
  - [ ] `Card.jsx` — still used inside JobsPage detail panels & ResumePage subsections; not yet deprecated. Plan: leave for follow-up sweep after visual review.

- [x] **Phase 4 — Page ports** (lint clean after each)
  - [x] `DashboardPage.jsx` — KPI row de-boxed (hairlines), Section primitive for funnel/activity/top-matches/quick-actions, decorative section-header icon tiles dropped, fresh-account CTA stays bordered.
  - [x] `JobsPage.jsx` — saved-jobs list de-boxed, search panel kept bordered (input island), results list de-boxed.
  - [x] `AIAssistantPage.jsx` — discovery state vertically centered (kills dead zone), chrome pill removed, h1 retuned to page-title scale.
  - [x] `JobAlertsPage.jsx` — hero serif-accent removed.
  - [x] `ResumePage.jsx` — hero serif-accent removed; bottom CTA disambiguated ("Im Chat besprechen") so it no longer looks like a duplicate of the auto-analysis above.
  - [x] `SettingsPage.jsx` — hero serif-accent removed.
  - [x] `BillingPage.jsx` — hero serif-accent removed.
  - [x] `CoverLetterPage.jsx` — hero serif-accent removed.
  - [ ] `JobDetailPage.jsx` — no PageHeader, no chrome to strip; visual review pending.
  - Marketing/auth/legal pages keep the serif accent intentionally (locked decision).

- [~] **Phase 5 — Empty states + mobile**
  - [x] AI idle (dead zone resolved via vertical centering in Phase 4)
  - [x] Resume idle (duplicate CTA disambiguated in Phase 4)
  - [ ] Alerts detail idle — visual review pending
  - [ ] Bottom-nav clearance + sticky-action patterns to verify per page on a real device

- [x] **Phase 6 — Verify**
  - [x] `npm run lint` clean after every page port
  - [ ] Regex sweep for banned tokens
  - [ ] Visual review of every route

- [x] **Phase 14 — Alerts: master/detail → flat list** (2026-05-17)
  Playbook said *"Alerts: collapsed to 'Meine Filter' sidebar entries + a
  dedicated 'Suchen für dich' cards page. Not master/detail."* The page was
  still master/detail. Even the screenshot before this change showed the
  classic violations: a left rail listing two alerts, a right detail panel
  duplicating the same `Aktiv` pill, and the title rendered twice. With
  only 2-3 alerts ever (Pro cap), a master/detail split with one item on
  each side wastes the whole viewport. Surgical fix:
  - **New `AlertRow` flat full-width card**. Single horizontal row per
    alert: keywords title + status pill on the left, meta line
    (`Wien · Praktikum · Täglich`), recency one-liner
    (`Letzte E-Mail vor 3 Tagen`), and inline action cluster
    (`Jetzt prüfen` secondary, `Bearbeiten` ghost, `…` overflow with
    Delete). Borders between rows, no card chrome around each row — same
    rhythm as Meine Liste's grouped list.
  - **Master/detail layout removed** entirely from the `JobAlertsPage`
    return: no left `<aside>`, no right `<main>`, no `selectedAlertId`
    state, no `mobileView` `list`/`detail` toggle, no
    `ChevronLeft → Zurück` mobile back chrome, no Card wrapper around
    the whole thing.
  - **Limit banners hoisted** to page level (one placement above the
    list) instead of one copy inside every detail panel render.
  - **Active/Pausiert status pill**: now inline next to the title in the
    card (small `h-5` chip), not a standalone `Badge` component. The
    duplicate one inside the old detail header is gone.
  - **Recency normalised** to short relative time (`heute`, `gestern`,
    `vor 3 Tagen`, `vor 2 Wochen`…) instead of full `15. Mai 2026 um 20:09`
    timestamp. Less cognitive load when scanning multiple alerts.
  - **Dead code removed**: deprecated `AlertListCard`, the entire
    `AlertDetailPanel`, the `useEffect` that synced selection, the
    `formatDate` helper, and six unused lucide icons + `Badge` import.
  - Lint: 0 errors, 6 pre-existing warnings (none in `JobAlertsPage`).
    Build: clean.

  What this still isn't, vs the full playbook ideal:
  - **`Meine Filter` sidebar block** (each alert becomes a left-nav entry
    that filters the jobs view) → would require touching `AppShell.jsx`
    and inventing a filtered jobs route. Deferred — flat-list is a strong
    intermediate that already removes the IA violation.
  - **`Suchen für dich` cards page** (newly matched jobs from all filters
    merged) → needs a new backend endpoint or client-side aggregation
    of alert run results. Deferred.

- [x] **Phase 13 — Accent-diet audit + calm-direction sweep** (2026-05-16)
  Critique pass on screenshots flagged the accent rule as "defined but not
  enforced". Audit + fixes:
  - **Rule operationalised**: ≤1 accent element per viewport. Accent reserved
    for active nav, focus rings, and *the single most-important CTA* per
    page. Everything else neutral.
  - **Settings** (`SettingsPage.jsx`):
    - Taxonomy chips (`Teilzeit`, `Praktikum`, branches…) demoted from
      `bg-accent-500/20 + text-accent-200` → `bg-bg-elev-2 + text-fg`.
      These were the most visible accent-diet violation in the app.
    - Top-right `Speichern` button: `variant="primary"` → `variant="secondary"`.
      The form is silent until dirty anyway; the chip pills speak for the
      change. Calmer.
  - **Alerts** (`JobAlertsPage.jsx`):
    - `Jetzt prüfen` per-alert button: primary → `secondary`. Two purple
      CTAs (`Neuer Alert` + `Jetzt prüfen`) on one screen was the diet
      violation. `Neuer Alert` keeps primary as the page's single CTA.
  - **Billing** (`BillingPage.jsx`):
    - Banner `Mehr erfahren` button + surrounding accent-tinted banner →
      neutral surface + neutral button. `Auf Pro upgraden` is the page's
      one primary action and stays accent.
    - **Bar chart colours killed**: yellow + blue + amber gradients
      replaced with single neutral `#fafafa` fill at variable opacity
      (`0.45 / 0.65 / 0.85`) reflecting intensity. Per playbook: no
      categorical colour for data viz.
    - `Aktion nötig` warning text inside the bar chart removed.
      Anxiety-inducing copy on what is neutral information.
    - `Optimal` / `Hohe Nutzung` / `Aktion nötig` health-judgment badges
      collapsed to a single calm `${pct}% belegt` fact. Same psychology
      as a streak — judging the user's behaviour — and explicitly killed.
    - Overall progress bar: categorical (`warning` / `info` / `success`
      tokens) → neutral foreground at opacity.
    - `UsageRow` badge: `Optimal` → just `${pct}%`.
  - **Dashboard** (`DashboardPage.jsx`):
    - `Hey.` (with trailing period and no name) replaced with `Heute.`
      when `userName` is empty. The previous fallback looked like a
      broken template.
  - **Meine Liste** (`JobsPage.jsx`):
    - Redundant status chip inside its own group is now hidden by default
      and surfaces as a low-emphasis `Status ändern` link on row hover /
      focus. Tap target preserved for the bottom-sheet status changer.
      Inside `Gemerkt` no row says "Gemerkt" anymore.
  - Lint: 0 errors. Build: clean.

  Still pending from the critique (separate phases):
  - **Alerts master/detail → filters-as-sidebar + Suchen für dich feed**
    (playbook violation, biggest remaining IA gap)
  - **KI-Assistent**: remove zoom controls, add a "Kontext: [job]"
    selector instead of (or as cheaper alternative to) per-job thread
    sidebar
  - **Vorschläge derivation engine** on Heute (the dismissible suggestion
    cards never appear because the engine isn't wired up; without them
    Heute looks half-empty)
  - **`0/5 erledigt`** gamification counter on Lebenslauf
  - **Mobile device pass** — every screen, every flow

- [x] **Phase 12 — Stellen-Detail hero (calm landing from Meine Liste)** (2026-05-16)
  After tapping a row in the new Meine Liste, the user landed on a busy 1400-line
  detail page that began with a 128 px circular gauge, an icon-tile delete
  button, and decorated boxes-in-boxes. The visual jump from the calm list to
  this page was the worst remaining UX seam. Surgical fix:
  - **Back link**: chrome stripped — now a small dim `← Stellen` text link.
  - **Hero header rebuilt**: full-width, no card chrome. 12-col grid with a
    calm typography pattern:
    - Left 8 cols: large role title (`32 px` desktop / `26 px` mobile,
      tracking-tight), one-line `Company · Location` meta, then a row of
      inline chips: status pill (semantic color, calm height), `Stellenanzeige
      öffnen` text link, `Löschen` text action. The 40 px boxed delete button
      is gone.
    - Right 4 cols: `Passung` eyebrow + big `87%` tabular number
      (`44 px`, tracking `-0.03em`) + small "Orientierungswert · Details unten"
      sub-line. The 128 px `CircularGauge` is no longer rendered in the hero
      (still used inside the detailed `Eignungs-Analyse` card on the right
      column for users who want the breakdown).
  - Hero ends with a hairline `border-b` divider. The rest of the page
    (sidebar, action grid, qualification card, gap analysis, interview prep,
    cover-letter modal) is **unchanged** — functional flows preserved.
  - Lint: 0 errors. Build: clean.

  Pending follow-ups for the detail page (separate phases):
  - Neutralize `QualifikationsCheck` purple accent bars + emoji decorations
    → calm foreground-with-opacity bars
  - Neutralize `BridgeTheGap` amber icon tiles → calm list with hairlines
  - Add a true `Warum X%?` expander panel (per-requirement +/− bullets)
    inline below the hero, replacing the multi-step decorated card
  - Add a calm `Kontext` footer with anxiety-reducing baselines
    ("Antworten dauern im Schnitt 8 Tage")

- [x] **Phase 11 — Tone-of-voice pass** (2026-05-16)
  Sweep across every toast, error message, and empty state to bring copy in
  line with the calm direction (state the fact, no exclamation theatre, no
  technical leakage to end users).
  - **`apiError.js`**: network-error fallback no longer mentions "API-URL,
    Domain und CORS-Konfiguration" — replaced with
    *"Server nicht erreichbar. Bitte versuche es in einer Minute erneut."*
  - **`EmptyState`** primitive verified calm: no accent-tinted icon tile, no
    decorated chrome — small neutral icon mark above title, left-aligned
    layout, `subtle` tone for inline use.
  - **CoverLetterPage**: 5 success toasts dropped exclamation marks
    (`Motivationsschreiben erstellt`, `In die Zwischenablage kopiert`,
    `TXT/Word/PDF heruntergeladen`).
  - **JobDetailPage**: 4 toasts softened (`Eignungs-Analyse erstellt`,
    `Anschreiben erstellt`, `Gesprächsvorbereitung erstellt`, `Kopiert`).
  - **JobAlertsPage**: dropped `!` on success; `Fehler beim …` errors
    rewritten as *X konnte nicht … werden*; empty-state copy tightened
    (`Noch keine Alerts` + new description).
  - **BillingPage**: `Upgrade erfolgreich! Willkommen bei deinem neuen Plan.`
    → `Plan aktiviert. Willkommen.`
  - **SettingsPage**: dropped `t("settings.savePreferences") ✓` decorative
    toast; `Konto wurde gelöscht` → `Konto gelöscht`; `Bild muss unter 5 MB
    sein` → `Bild ist zu groß. Maximal 5 MB.`; unused `t` removed.
  - **ResumePage**: `Maximalgröße: 5 MB` → `Datei ist zu groß. Maximal 5 MB.`
  - **AppShell** verification banner: `E-Mail wurde erneut gesendet` →
    `E-Mail gesendet`.
  - **ResearchModal**: `Die Recherche wurde sicher hinterlegt` →
    `Recherche gespeichert` (and matching error variant).
  Lint: 0 errors. Build: clean.

- [x] **Phase 10 — Calm direction port: Meine Liste (Jobs)** (2026-05-16)
  Second page ported. `JobsPage` rewritten end-to-end (path `/jobs`).
  - Header: "Meine Liste" + dynamic count ("X Stellen gespeichert").
  - **Status tabs replaced by always-visible status groups** (`Gemerkt /
    Beworben / Im Gespräch / Angebot / Erledigt`). Empty groups are hidden,
    rows within a group sorted newest-first.
  - New `SavedJobRow` (defined in-file): title + dim meta line
    (`company · location · vor X Tagen`) + **clickable status chip** + match
    score + arrow. No avatar tile, no decoration.
  - **`BottomSheet` primitive** added at `components/ui/BottomSheet.jsx`. Portals
    to `document.body`, locks body scroll, closes on Escape and backdrop click,
    grabber bar on mobile, rounded modal on desktop. Reusable.
  - Tapping a row's status chip opens the bottom sheet with 5 status options;
    the current status is labeled "aktuell". Selection fires an **optimistic**
    `jobApi.updateStatus` mutation with rollback on error.
  - Status key reconciled across pages: backend canonical = `bookmarked` (not
    `saved`). Dashboard `STATUS_BUCKETS` updated to match.
  - Search section (recommended / custom) retained functionally with a single
    structural cleanup: bordered island, calmer header, no inner Section
    wrapper. Search-results list reuses the existing `JobRow` for now.
  - File: 480 lines (was 426). Lint clean (0 errors).

- [x] **Phase 9 — Calm direction port: Heute (Dashboard)** (2026-05-16)
  After the user approved the static HTML demo at `demo/index.html`, ported the
  first page into the real app:
  - `DashboardPage` rewritten end-to-end as **Heute**. Same route (`/`).
  - Greeting (`Hey {name}.` + date) replaces the old time-based greeting.
  - **Vorschläge** — dismissible suggestion list derived from real data:
    1. *No resume* → "Lade deinen Lebenslauf hoch."
    2. *Stale applied job ≥ 7 days* → "X — vor N Tagen beworben. Im Schnitt 8 Tage."
    3. *Fresh high-match jobs in last 48 h* → "N starke Treffer seit gestern."
    4. *No alerts yet* → "Richte einen Alert ein."
    Each has primary + optional secondary + `Ignorieren`. Dismiss-IDs
    persist in `localStorage["heute_dismissed_v1"]`.
  - **Neu für dich** — 3-card carousel (mobile: horizontal scroll, desktop:
    grid). Source = high-match jobs from last 7 days, fallback to all-time top.
  - **Deine Liste** — 5-cell status counter strip with hairline dividers:
    Gemerkt · Beworben · Im Gespräch · Angebot · Erledigt. Tap → `/jobs`.
  - Empty state for zero-state users.
  - Dropped imports: KpiCard, FunnelChart, ActivitySparkline, Section, PageHeader,
    EmptyState, Search/ArrowRight from this file (still used by other pages so
    no deletions yet). Component file: 375 lines (was 444).

- [x] **Phase 8 — Structural revamp** (2026-05-16, after user feedback "I do not think anything has changed")
  Bold structural changes, not just colour tweaks. The previous accent diet
  reduced chroma but kept all the chrome — boxes-in-boxes, icon tiles next to
  every heading, small numbers, tight gaps. Replaced with:
  - `KpiCard` rewritten Resend-style: no icon, no icon tile, no uppercase eyebrow.
    Just big tabular number (44–48 px) + tiny sentence-case label + sub-line.
    Optional `accent` prop to tint the number when value crosses threshold.
  - `FunnelChart` + `ActivitySparkline` switched from accent-purple bars to
    foreground-with-opacity bars; thinner 1 px tracks; bigger value typography.
  - `PageHeader` title scale bumped from 22/24 px → 28/34 px with tighter letter-spacing.
  - `Section` title bumped from 17 px → 19/20 px with bigger header→body gap.
  - `AppShell` main padding bumped (px-5/8/14, pt-8/10/14) — generous breathing room.
  - `DashboardPage` complete rewrite: KPIs sit naked on the surface with vertical hairlines,
    section gaps `gap-12 lg:gap-16`, Top-Matches and Direkt-Loslegen rows have NO icon tiles
    (just bold title + dim hint + arrow), big match-score numbers (18 px) per row.
  - `ResumePage` complete rewrite: dropped all 6 chrome icon tiles, score is now a flat
    52–60 px display number on the bare surface, Skills + Optimieren are flat sections
    side-by-side, Documents list is a flat divided list with no avatars.
  - `JobAlertsPage` detail panel: dropped the 4-cell icon-tile grid for `Ort/Art/Wie oft/E-Mail`;
    replaced with a flat 2-column `<dl>` with hairline separators. Big 22–24 px alert title.
    "Letzte E-Mail" reduced from a Card to a one-liner.
  - `SettingsPage`: dropped icon tiles next to `Profilfoto`/`Jobsuche`/`Präferenzen`,
    dropped the `rounded-xl border bg-white/[0.04]` card wrappers around form sections,
    increased grid gap to `gap-10 lg:gap-14`.
  - `BillingPage`: dropped the icon tile next to "Aktiver Plan", dropped the redundant
    `Detail-Übersicht` row list (the bar chart already shows the same data — audit point #13),
    replaced the rainbow-gradient health bar with a thin neutral bar.

- [x] **Phase 7 — Accent diet** (post-audit, 2026-05-16)
  Reserve `--color-accent-*` for: primary CTAs, active nav/selection, focus rings,
  and at most one "this is what matters here" element per view. Everything else
  goes neutral.
  - [x] `ResumePage` — 4 chrome icon-tiles + Aktiv eyebrow + checkbox hover neutralized
  - [x] `SettingsPage` — Profilfoto / Jobsuche / Präferenzen icons + avatar fallback box + 3× hover-borders neutralized
  - [x] `JobAlertsPage` — Letzte E-Mail icon + back-button + limit banner switched to warning tone (was accent)
  - [x] `JobsPage` (`JobRow`) — row hover, initials hover, "TREFFER" eyebrow ×11 dropped, ArrowRight hover neutralized
  - [x] `AIAssistantPage` — bot icon glow + accent box + green status dot killed; resume-dropdown, "+ Neu" button, "Empfehlung für dich" eyebrow, 4 suggestion-card icon-tiles all neutralized; context-job CTA outer container kept accent (signal)
  - [x] `JobDetailPage` — Eignungs-Analyse expander icon, EU AI Act notice (compliance not brand), tooltip Info, stepper hover, external-link colors neutralized
  - [x] `DashboardPage` — greeting period bug fixed (`Guten Tag.` when no name), Top-Matches + Quick-Actions row hover chrome neutralized, "Direkt loslegen" item grammar normalized
  - [x] `BillingPage` — plan-card radial gradient + glow blur removed, plan icon-tile neutralized, inline "Ändern/Bearbeiten" links muted

## Resume instructions for future sessions

If a fresh session inherits this, read this file first, then run:
```bash
grep -nE 'PageHeader|<Card' frontend/src/pages/ | head -40
```
to see which pages still use the deprecated primitives.
