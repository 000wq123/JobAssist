import { expect, test } from "@playwright/test";

const RUNTIME_AUDIT = Symbol("mobileRuntimeAudit");

function watchRuntimeErrors(page) {
  if (page[RUNTIME_AUDIT]) return page[RUNTIME_AUDIT];

  const failures = [];
  page.on("pageerror", (error) => {
    failures.push({ type: "pageerror", message: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push({ type: "console", message: message.text() });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failures.push({ type: "http", message: `${response.status()} ${response.url()}` });
    }
  });

  page[RUNTIME_AUDIT] = failures;
  return failures;
}

function expectNoRuntimeErrors(page, context) {
  expect(watchRuntimeErrors(page), `${context}: browser/runtime failures`).toEqual([]);
}

const initPayload = {
  me: { id: 1, email: "mobile@jobassist.tech", full_name: "Mobile Test", is_verified: true },
  profile: {
    id: 1,
    avatar: null,
    desired_locations: ["Wien"],
    job_types: ["Teilzeit"],
    industries: ["Technik/IT"],
    experience_level: "Noch in der Schule",
  },
  resumes: [{ id: 1, filename: "Lebenslauf.pdf" }],
  resumes_total: 1,
  cv: { has_content: true, completion_pct: 70, updated_at: "2026-08-30T10:00:00Z" },
  jobs_total: 2,
  jobs_by_status: { bookmarked: 1, applied: 1 },
  usage: [],
  plan: "max",
};

const jobs = [
  {
    id: 1,
    company: "JobAssist Österreich GmbH",
    role: "Junior Frontend Entwickler/in für mobile Anwendungen (m/w/d)",
    url: "https://example.com/jobs/1",
    status: "bookmarked",
    category: "samstagsjob",
    location: "Wien, Österreich",
    job_type: "Teilzeit",
    source: "karriere.at",
    description: "Entwickle barrierefreie und responsive Anwendungen für junge Bewerberinnen und Bewerber.",
    created_at: "2026-08-29T10:00:00Z",
    updated_at: "2026-08-30T10:00:00Z",
  },
  {
    id: 2,
    company: "Sehr Langer Firmenname für Responsive Tests AG",
    role: "Praktikum Softwareentwicklung und Qualitätssicherung",
    url: "https://example.com/jobs/2",
    status: "applied",
    location: "Graz, Österreich",
    job_type: "Praktikum",
    source: "AMS",
    created_at: "2026-08-25T10:00:00Z",
    updated_at: "2026-08-28T10:00:00Z",
  },
];

function seedMobileSession() {
  const me = { id: 1, email: "mobile@jobassist.tech", full_name: "Mobile Test", is_verified: true };
  sessionStorage.setItem("ja:access_token", "mobile-test-token");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: 1 }));
  localStorage.setItem("jobassist_theme_v1", "light");
  localStorage.setItem("auth_user", JSON.stringify(me));
  localStorage.setItem("cv_profile_v1", JSON.stringify({
    vorname: "Anna",
    nachname: "Berger",
    email: "anna@example.at",
    schulname: "HAK Wien",
    schultyp: "HAK",
    templateId: "tabellarisch",
    sprachkenntnisse: [{ sprache: "Deutsch", niveau: "Muttersprache" }],
  }));
  sessionStorage.setItem("ja:cv_builder_mode", "wizard");
}

async function installMobileApi(page) {
  watchRuntimeErrors(page);
  await page.addInitScript(seedMobileSession);
  await page.route("**/api/auth/refresh", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ access_token: "mobile-test-token" }),
  }));
  await page.route("**/api/init", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(initPayload),
  }));
  await page.route("**/api/profile/cv-library", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ entries: [] }),
  }));
  await page.route("**/api/profile/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({}),
  }));
  await page.route(/\/api\/profile\/?(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({}),
  }));
  await page.route("**/api/job-alerts/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ alerts: [{
      id: 1,
      keywords: "Frontend Entwickler",
      location: "Wien",
      job_type: "Teilzeit",
      email: "mobile@jobassist.tech",
      frequency: "daily",
      is_active: true,
      last_sent_at: "2026-08-30T08:00:00Z",
      updated_at: "2026-08-30T08:00:00Z",
    }] }),
  }));
  await page.route("**/api/jobs/response-baselines", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ median_days: 8, p25_days: 5, p75_days: 14, sample_size: 12 }),
  }));
  await page.route("**/api/kv-wages/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ category: "samstagsjob", region: "AT", year: 2025, kollektivvertrag: "KV Handel", hourly_min: 12.09, hourly_max: 14.5 }),
  }));
  await page.route(/\/api\/jobs\/1(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(jobs[0]),
  }));
  await page.route(/\/api\/jobs\/?(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: jobs, total: jobs.length, page: 1, page_size: 100, pages: 1 }),
  }));
  await page.route(/\/api\/jobs\/search\/.*/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ jobs: [
      {
        id: 201,
        role: "Frontend Entwickler:in",
        title: "Frontend Entwickler:in",
        company: "Search Result GmbH",
        location: "Wien",
        job_type: "Vollzeit",
        url: "https://example.com/jobs/201",
        source: "karriere.at",
        created_at: "2026-08-30T10:00:00Z",
      },
    ] }),
  }));
  await page.route("**/api/resume/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([]),
  }));
  await page.route("**/api/proxy/logo/best**", (route) => route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="20" fill="#e30613"/><text x="64" y="78" text-anchor="middle" fill="white" font-size="38">JA</text></svg>',
  }));
}

async function settlePage(page) {
  // Entrance animations (e.g. animate-slide-up) start near opacity 0; audits
  // and screenshots must measure the resting layout, not a mid-fade frame.
  // Infinite animations (spinners/shimmer) are skipped — they never finish.
  // State flips while waiting can start a *new* transition late, so keep
  // settling until no finite animation is left running.
  for (let round = 0; round < 6; round++) {
    const running = await page.evaluate(() => {
      const finite = document.getAnimations()
        .filter((a) => a.effect?.getTiming?.().iterations !== Infinity);
      return Promise.allSettled(finite.map((a) => a.finished)).then(() => finite.length);
    });
    await page.evaluate(() => document.fonts.ready);
    if (running === 0) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(250);
}/**
 * Mobile hit-area audit: every visible actionable control must offer a
 * ≥44px tap target (WCAG 2.5.5 / Apple HIG). Hits are measured on the
 * element's border box, which includes padding added by the .tap-44 /
 * min-h-[44px] wrappers. Pure decorative/disabled/disabled-while-loading
 * controls are skipped.
 *
 * Truthfulness: the page is swept with *instant* scrolls (html carries
 * scroll-behavior:smooth, so rapid smooth scrolls never finish and bottom
 * sections would silently escape the audit), measuring the on-screen
 * controls at every stop. Offenders are deduplicated by their document
 * position, and the original scroll position is restored afterwards.
 * Controls that only exist after user interaction (open menus, dialogs)
 * must be audited separately in their own test with the interaction
 * performed first.
 */
const INLINE_TEXT_BLOCK = "p, li, h1, h2, h3, h4, h5, h6, dd, dt, figcaption, blockquote, td, th, summary";

/**
 * Mobile hit-area audit: every visible actionable control must offer a
 * ≥44px tap target (WCAG 2.5.5 / Apple HIG). Hits are measured on the
 * element's border box, which includes padding added by the .tap-44 /
 * min-h-[44px] wrappers.
 *
 * Coverage — genuinely actionable controls: links, buttons, toggle/choice
 * roles, selects, checkboxes AND the editable fields a user actually taps
 * (text/email/password/tel/url/number/search inputs, textareas). Pure
 * decorative/disabled/disabled-while-loading controls are skipped.
 *
 * Truthfulness — the page is swept with *instant* scrolls:
 *   - `html` carries scroll-behavior:smooth, so rapid smooth scrolls never
 *     finish and bottom sections would silently escape the audit;
 *   - the landing page's `.landing-v5` is itself a scroll container
 *     (overflow-x-hidden computes overflow-y:auto), so fixed-height
 *     window-scroll sweeps were measuring stale positions. Both scrollers
 *     are swept, still instantly.
 *   - fixed-position controls are measured once (their viewport rect does
 *     not depend on the scroll stop), then deduplicated by element node.
 *   - the original scroll position is restored afterwards.
 *
 * Inline-link exemption — WCAG 2.5.5 exempts links inside running text that
 * are not separated from neighbouring targets by a line box. The exemption
 * is applied ONLY when all of the following are true (no blanket "inline
 * link" pass):
 *   1. the computed display is `inline` (an inline-flex/inline-block link
 *      is a layout control, not running text);
 *   2. it sits inside a text-block container (p/li/heading/…);
 *   3. the intended expanded hit area is ACTUALLY present: the CSS layer
 *      slaps a hit-expansion pseudo-element on such links, verified here
 *      via the computed ::after style (position:absolute). Links without
 *      the expansion are audited like every other control.
 *
 * Hit delivery — for every measured control, elementFromPoint at the
 * control's center must resolve to the control or a descendant. A control
 * that is visually ≥44px but covered by an overlay (drawer scrim, popover
 * catch-all) is reported as an `overlay` offender. Menu items inside an
 * open popover pass because the popover's disposable catch-all wrapper
 * contains them; controls reachable only after interaction must be audited
 * in their own interaction-state test.
 */
async function auditTapTargets(page) {
  const offenders = await page.evaluate(async () => {
    // NOTE: defined inside the browser closure — page.evaluate cannot see
    // Node-module scope.
    const INLINE_TEXT_BLOCK = "p, li, h1, h2, h3, h4, h5, h6, dd, dt, figcaption, blockquote, td, th, summary";
    const originalY = window.scrollY;
    const scroller = document.scrollingElement || document.documentElement;
    const all = new Map(); // element → offender info

    const collect = () => {
      const selector = [
        "a[href]",
        "button:not(:disabled)",
        "[role='button']",
        "[role='switch']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='menuitem']",
        "[role='tab']",
        "input[type='checkbox']",
        "input[type='radio']",
        "label:has(> input[type='checkbox'])",
        // Editable fields are tapped by the user too — they must meet the
        // same hit-area floor as buttons on touch.
        "input[type='text']",
        "input[type='email']",
        "input[type='password']",
        "input[type='tel']",
        "input[type='url']",
        "input[type='number']",
        "input[type='search']",
        "input:not([type])",
        "textarea",
        "select",
      ].join(",");

      const entry = (el, reason, rect) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || null,
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
        cls: String(el.className || "").slice(0, 80),
        reason,
      });

      const candidates = Array.from(document.querySelectorAll(selector))
        .filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
          if (el.hasAttribute("aria-hidden") && el.getAttribute("aria-hidden") === "true") return false;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          return rect.top < window.innerHeight && rect.bottom > 0;
        })
        .filter((el) => {
          // Inline exemption: strict structural + "expanded hit area
          // actually present" test — see the function doc comment above.
          if (el.tagName !== "A") return true;
          const cs = getComputedStyle(el);
          if (cs.display !== "inline") return true;
          if (!el.closest(INLINE_TEXT_BLOCK)) return true;
          const after = getComputedStyle(el, "::after");
          if (after.position === "absolute" && after.content !== "none") return false;
          return true; // no expansion → audited like every other control
        });

      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        // A checkbox/radio inside a label that itself meets the floor is hit
        // through the label — the input glyph may stay small.
        const wrappingLabel = el.closest("label");
        if (
          (el.tagName === "INPUT" && (el.getAttribute("type") === "checkbox" || el.getAttribute("type") === "radio")) &&
          wrappingLabel &&
          wrappingLabel.getBoundingClientRect().width >= 43.5 &&
          wrappingLabel.getBoundingClientRect().height >= 43.5
        ) {
          continue;
        }
        if (rect.width >= 43.5 && rect.height >= 43.5) {
          // Size is fine, but the center must still be reachable: an overlay
          // above the control (sticky decoration, dropdown) makes it
          // un-tappable even at 44px. Persistent chrome (header, bottom nav,
          // modal scrim, popover catch-all — position:fixed OR sticky)
          // legitimately blocks content at transient sweep stops or modally
          // while open: the user scrolls content into the clear of pinned
          // chrome (its flow slot clears at max scroll), and modal states
          // are covered by the interaction tests + touch-through tests. A
          // cover counts only if neither it nor any ancestor is pinned.
          const at = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          if (at && at !== el && !el.contains(at)) {
            let coveredByChrome = false;
            for (let n = at; n && n.nodeType === 1; n = n.parentElement) {
              const pos = getComputedStyle(n).position;
              if (pos === "fixed" || pos === "sticky") { coveredByChrome = true; break; }
            }
            if (!coveredByChrome) {
              all.set(el, entry(el, "overlay", rect));
            }
          }
          continue;
        }
        all.set(el, entry(el, "size", rect));
      }
    };

    // Fixed-position controls keep the same viewport rect at every scroll
    // stop — measure them once up front, then sweep the flows.
    const stop1 = window.scrollY;
    window.scrollTo({ top: 0, behavior: "instant" });
    collect();
    window.scrollTo({ top: stop1, behavior: "instant" });

    const sweep = async (target) => {
      const step = Math.max(320, window.innerHeight * 0.8);
      const limit = (target.scrollHeight || 0) + step;
      for (let y = 0; y <= limit; y += step) {
        target.scrollTo({ top: y, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 30));
        collect();
        if ((target.scrollTop || 0) >= target.scrollHeight - 2) break;
      }
      // One final pass at the very bottom catches stragglers.
      target.scrollTo({ top: target.scrollHeight, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 30));
      collect();
    };

    await sweep(scroller);
    const landingScroller = document.querySelector(".landing-v5");
    if (landingScroller && landingScroller.scrollHeight > landingScroller.clientHeight) {
      const landingY = landingScroller.scrollTop;
      await sweep(landingScroller);
      landingScroller.scrollTo({ top: landingY, behavior: "instant" });
    }

    window.scrollTo({ top: originalY, behavior: "instant" });

    return Array.from(all.values()).sort((a, b) => (a.label + a.tag).localeCompare(b.label + b.tag));
  });
  return offenders;
}

async function expectMobileFrame(page, path, heading) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Menü öffnen" })).toBeVisible();
  await expect(page.getByRole("navigation").filter({ hasText: "Übersicht" }).last()).toBeVisible();
  await settlePage(page);

  const audit = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const main = document.getElementById("main-content");

    // Horizontal swipe strips (overflow-x auto/scroll that actually overflow)
    // legitimately hold content beyond the viewport — scrolling reaches it.
    const insideHorizontalScroller = (element) => {
      for (let n = element.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };

    const effOpacity = (element) => {
      let opacity = 1;
      for (let n = element; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
        opacity *= parseFloat(getComputedStyle(n).opacity) || 1;
      }
      return opacity;
    };

    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position === "fixed" || style.display === "none" || style.visibility === "hidden") return false;
        if (insideHorizontalScroller(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > viewportWidth + 1);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || "").slice(0, 120),
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        rect: element.getBoundingClientRect().toJSON(),
      }));

    // Once entrance animations have settled, no text-bearing content may stay
    // dimmed (a stuck fade or leftover loading veil reads as broken on phones).
    const dimmed = main
      ? Array.from(main.querySelectorAll("*"))
          .filter((element) => {
            const own = Array.from(element.childNodes)
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim()).join("").trim();
            if (!own) return false;
            // Disabled controls are legitimately styled dim — that is
            // affordance, not a stuck fade.
            if (element.matches(":disabled")) return false;
            const cs = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            if (!rect.width || cs.display === "none" || cs.visibility === "hidden") return false;
            return effOpacity(element) < 0.6;
          })
          .slice(0, 4)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: String(element.className || "").slice(0, 80),
            text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
            opacity: effOpacity(element),
          }))
      : [];

    // iOS Safari auto-zooms any focused control below 16px — every visible
    // focusable form control must sit at or above that floor.
    const smallControls = Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((element) => {
        const type = (element.getAttribute("type") || "").toLowerCase();
        if (["checkbox", "radio", "range", "file", "hidden", "submit", "button", "reset", "image"].includes(type)) return false;
        const cs = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (!rect.width || cs.display === "none" || cs.visibility === "hidden") return false;
        return parseFloat(cs.fontSize) < 16;
      })
      .slice(0, 6)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") || null,
        className: String(element.className || "").slice(0, 80),
        fontSize: getComputedStyle(element).fontSize,
        name: element.name || element.id || null,
      }));

    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders,
      dimmed,
      smallControls,
    };
  });

  expect(audit.documentWidth, `${path}: document overflow; ${JSON.stringify(audit.offenders)}`).toBeLessThanOrEqual(audit.viewportWidth + 1);
  expect(audit.bodyWidth, `${path}: body overflow; ${JSON.stringify(audit.offenders)}`).toBeLessThanOrEqual(audit.viewportWidth + 1);
  expect(audit.offenders, `${path}: visible elements leave the viewport`).toEqual([]);
  expect(audit.dimmed, `${path}: content still dimmed after animations settle`).toEqual([]);
  expect(
    audit.smallControls,
    `${path}: form controls below the 16px iOS zoom floor`,
  ).toEqual([]);

  const tapOffenders = await auditTapTargets(page);
  expect(
    tapOffenders,
    `${path}: actionable controls below the 44px mobile hit area`,
  ).toEqual([]);

  if (path === "/job-alerts") {
    const filterWidths = await page.getByLabel("Alerts filtern").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(filterWidths.scrollWidth, "all alert filters fit the 320px content column").toBeLessThanOrEqual(filterWidths.clientWidth + 1);
  }

  const width = page.viewportSize().width;
  const slug = path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "home";
  await page.screenshot({
    path: `test-results/screenshots/mobile-${width}-${slug}.png`,
    fullPage: true,
    animations: "disabled",
  });
  expectNoRuntimeErrors(page, path);
}

const CORE_ROUTES = [
  // The dashboard uses a short fallback while hydration resolves the
  // clock-dependent greeting.
  ["/dashboard", /^(?:Hallo|Guten (?:Morgen|Nachmittag|Abend)), Mobile\.$/],
  ["/jobs", "Meine Stellen"],
  ["/jobs?tab=finden", "Jobs finden"],
  ["/jobs/1", /Junior Frontend Entwickler/],
  ["/job-alerts", "Job-Alerts"],
  ["/settings", "Einstellungen"],
  ["/lebenslauf", "Persönliche Daten"],
];

test.describe("authenticated app (320/375px)", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await installMobileApi(page);
  });

  test("core authenticated pages fit a 320px phone", async ({ page }) => {
    for (const [path, heading] of CORE_ROUTES) {
      await expectMobileFrame(page, path, heading);
    }
  });

  test("core pages keep a 375px phone clean", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [path, heading] of CORE_ROUTES) {
      await expectMobileFrame(page, path, heading);
    }
  });

  test("mobile navigation keeps every primary destination reachable", async ({ page }) => {
    await page.goto("/dashboard");
    const bottomNav = page.getByRole("navigation").filter({ hasText: "Übersicht" }).last();
    for (const label of ["Übersicht", "Stellen", "Lebenslauf"]) {
      const link = bottomNav.getByRole("link", { name: label });
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(90);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole("button", { name: "Menü öffnen" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigationsmenü" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Alerts" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Einstellungen" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Abmelden" })).toBeVisible();
    expectNoRuntimeErrors(page, "mobile navigation");
  });
});

test("touch devices at tablet width keep the 16px input floor", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  test.skip(!coarse, "emulator does not report pointer: coarse — device QA covers this branch");
  await installMobileApi(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Einstellungen" }).first()).toBeVisible({ timeout: 10_000 });
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((el) => {
        const type = (el.getAttribute("type") || "").toLowerCase();
        return !["checkbox", "radio", "range", "file", "hidden", "submit", "button", "reset", "image"].includes(type);
      })
      .map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(sizes.length, "settings form controls present").toBeGreaterThan(0);
  expect(Math.min(...sizes), "all touch-device form controls at the 16px floor").toBeGreaterThanOrEqual(16);
  expectNoRuntimeErrors(page, "tablet settings");
  await context.close();
});

test("touch gestures hit the intended phone-sized controls", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await installMobileApi(page);

  // Wrapped filter tabs stay individually tappable — each tap actually
  // switches the filter.
  await page.goto("/job-alerts");
  await expect(page.getByRole("heading", { name: "Job-Alerts" }).first()).toBeVisible({ timeout: 10_000 });
  const alertCard = page.getByRole("heading", { name: "Frontend Entwickler", exact: true });
  await expect(alertCard).toBeVisible({ timeout: 5_000 });
  const pausedTab = page.getByRole("button", { name: "Pausiert", exact: true });
  const pausedBox = await pausedTab.boundingBox();
  await page.touchscreen.tap(pausedBox.x + pausedBox.width / 2, pausedBox.y + pausedBox.height / 2);
  await expect(alertCard).toBeHidden({ timeout: 5_000 });
  const allTab = page.getByRole("button", { name: "Alle Alerts", exact: true });
  const allBox = await allTab.boundingBox();
  await page.touchscreen.tap(allBox.x + allBox.width / 2, allBox.y + allBox.height / 2);
  await expect(alertCard).toBeVisible({ timeout: 5_000 });

  // Compact phone labels keep all four filters on one row; the fourth option
  // must be directly reachable rather than stranded or silently clipped.
  const alertFilters = page.getByLabel("Alerts filtern");
  const filterWidths = await alertFilters.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(filterWidths.scrollWidth).toBeLessThanOrEqual(filterWidths.clientWidth + 1);
  const expiredTab = page.getByRole("button", { name: "Abgelaufen" });
  const expiredBox = await expiredTab.boundingBox();
  expect(expiredBox.x).toBeGreaterThanOrEqual(0);
  expect(expiredBox.x + expiredBox.width).toBeLessThanOrEqual(391);
  await page.touchscreen.tap(expiredBox.x + expiredBox.width / 2, expiredBox.y + expiredBox.height / 2);
  await expect(alertCard).toBeHidden({ timeout: 5_000 });

  // The chip-remove control removes the tag on a real tap — and must NOT
  // also open the picker popover (stopPropagation). The tap lands on the
  // element's center, i.e. the visual × glyph inside the 44px wrapper; the
  // wrapper size is asserted separately.
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Einstellungen" }).first()).toBeVisible({ timeout: 10_000 });
  const removeChip = page.getByRole("button", { name: "Technik/IT entfernen" });
  await removeChip.scrollIntoViewIfNeeded();
  await removeChip.tap();
  await expect(page.getByText("Technik/IT")).toBeHidden({ timeout: 5_000 });

  // 36px card action rows navigate on tap.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /^(?:Hallo|Guten (?:Morgen|Nachmittag|Abend)), Mobile\.$/ }).first()).toBeVisible({ timeout: 10_000 });
  const manage = page.getByRole("button", { name: "Verwalten" });
  await manage.scrollIntoViewIfNeeded();
  const manageBox = await manage.boundingBox();
  await page.touchscreen.tap(manageBox.x + manageBox.width / 2, manageBox.y + manageBox.height / 2);
  await expect(page).toHaveURL(/\/job-alerts/);

  // The CV step rail must be reachable by an actual touch swipe, not only
  // programmatic scrollTo.
  await page.goto("/lebenslauf");
  await expect(page.getByRole("heading", { name: "Persönliche Daten" }).first()).toBeVisible({ timeout: 10_000 });
  const rail = page.locator("div.overflow-x-auto").first();
  const railBox = await rail.boundingBox();
  const cdp = await context.newCDPSession(page);
  const maxScroll = await rail.evaluate((el) => el.scrollWidth - el.clientWidth);
  // Swipe like a user would: repeated flicks until the end is reached —
  // synthetic touch drags carry no fling momentum, so one short drag won't
  // cover the full scroll distance.
  for (let swipe = 0; swipe < 3; swipe++) {
    const before = await rail.evaluate((el) => el.scrollLeft);
    if (before >= maxScroll - 2) break;
    const y = railBox.y + railBox.height / 2;
    const startX = railBox.x + railBox.width - 24;
    const endX = Math.max(railBox.x + 8, startX - (maxScroll - before) - 60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y, id: 1 }] });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + ((endX - startX) * step) / 6, y, id: 1 }],
      });
      await page.waitForTimeout(30);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(350);
  }
  await expect.poll(async () => {
    const box = await rail.getByRole("button", { name: "Prüfen & Exportieren" }).boundingBox();
    return box ? box.x + box.width : Number.POSITIVE_INFINITY;
  }, { timeout: 5_000 }).toBeLessThanOrEqual(391);

  expectNoRuntimeErrors(page, "mobile touch gestures");

  await context.close();
});

test("search result actions keep 44px hit areas at phone widths", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installMobileApi(page);

  await page.goto("/jobs?tab=finden");
  await expect(page.getByRole("heading", { name: "Jobs finden" }).first()).toBeVisible({ timeout: 10_000 });
  // Run the mocked search so the result rows render. Each row exposes three
  // actions: the external link, the bookmark toggle and the apply CTA.
  await page.getByPlaceholder("Stichwort, Firma, Beruf…").fill("Frontend");
  await page.getByRole("button", { name: "Suchen", exact: true }).click();
  await settlePage(page);

  for (const [name, kind] of [["Original", "link"], ["Merken", "button"], ["Bewerbung vorbereiten", "button"]]) {
    const control = page.getByRole(kind, { name, exact: true }).first();
    const box = await control.boundingBox();
    expect(box, `"${name}" control visible`).not.toBeNull();
    expect(box.height, `"${name}" hit area height`).toBeGreaterThanOrEqual(44);
    expect(box.width, `"${name}" hit area width`).toBeGreaterThanOrEqual(44);
  }
  await context.close();
});

test("settings chip removal offers a full-size tap target", async ({ page }) => {
  await installMobileApi(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Einstellungen" }).first()).toBeVisible({ timeout: 10_000 });
  await settlePage(page);

  // The × wrapper is a full 44px tap target; the visual glyph stays small.
  const remove = page.getByRole("button", { name: "Technik/IT entfernen" });
  await remove.scrollIntoViewIfNeeded();
  const box = await remove.boundingBox();
  expect(box.height, "chip remove hit area height").toBeGreaterThanOrEqual(44);
  expect(box.width, "chip remove hit area width").toBeGreaterThanOrEqual(44);
});

// Controls that only exist AFTER an interaction (popover menus, drawer) are
// invisible to the static audit — audited here with the interaction performed.
test.describe("interaction states keep 44px controls", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await installMobileApi(page);
  });

  test("settings dropdown popover items are full targets while open", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Einstellungen" }).first()).toBeVisible({ timeout: 10_000 });
    await settlePage(page);

    const dropdown = page.getByRole("button", { name: "Stellenarten wählen…" });
    await dropdown.scrollIntoViewIfNeeded();
    await dropdown.click();
    await expect(page.getByRole("checkbox").first()).toBeVisible();
    const offenders = await auditTapTargets(page);
    expect(offenders, `settings popover open: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test("job detail status menu keeps 44px items while open", async ({ page }) => {
    await page.goto("/jobs/1");
    await expect(page.getByRole("heading", { name: /Junior Frontend Entwickler/ }).first()).toBeVisible({ timeout: 10_000 });
    await settlePage(page);

    await page.getByRole("button", { name: /Status ändern/ }).click();
    await expect(page.getByRole("menuitem").first()).toBeVisible();
    const offenders = await auditTapTargets(page);
    expect(offenders, `status menu open: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test("app shell drawer is audited while open", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /^(?:Hallo|Guten (?:Morgen|Nachmittag|Abend)), Mobile\.$/ }).first()).toBeVisible({ timeout: 10_000 });
    await settlePage(page);

    await page.getByRole("button", { name: "Menü öffnen" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigationsmenü" });
    await expect(drawer).toBeVisible();
    const offenders = await auditTapTargets(page);
    expect(offenders, `app drawer open: ${JSON.stringify(offenders)}`).toEqual([]);
  });
});

// The CV builder's phone chrome (sticky top bar + swipeable section pills)
// only exists below the lg breakpoint, so run at a phone viewport.
test.describe("CV builder phone chrome", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CV builder keeps its own chrome usable while scrolled", async ({ page }) => {
  await installMobileApi(page);
  await page.goto("/lebenslauf");
  await expect(page.getByRole("heading", { name: "Persönliche Daten" }).first()).toBeVisible({ timeout: 10_000 });

  // The step rail is an intentional horizontal swipe strip: it must really
  // scroll, and the last step must end up fully inside the viewport.
  const rail = page.locator("div.overflow-x-auto").first();
  await expect(rail.getByRole("button", { name: "Prüfen & Exportieren" })).toBeAttached();
  const railBox = await rail.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(railBox.scrollWidth, "step rail should overflow and be swipeable").toBeGreaterThan(railBox.clientWidth);
  await rail.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  const lastStep = await rail.getByRole("button", { name: "Prüfen & Exportieren" }).boundingBox();
  expect(lastStep.x).toBeGreaterThanOrEqual(-1);
  expect(lastStep.x + lastStep.width).toBeLessThanOrEqual(page.viewportSize().width + 1);

  // Deep in the form, the CV page's own top bar (back + PDF) must stay above
  // the app shell header instead of sliding underneath it.
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(150);
  const reachable = await page.evaluate(() => {
    const receives = (el) => {
      const r = el.getBoundingClientRect();
      const at = document.elementFromPoint(
        r.left + r.width / 2,
        Math.min(r.top + r.height / 2, window.innerHeight - 1),
      );
      return Boolean(at && (at === el || el.contains(at)));
    };
    const buttons = Array.from(document.querySelectorAll("button"));
    const pdf = buttons.find((b) => b.textContent.trim() === "PDF");
    const back = buttons.find((b) => b.textContent.trim() === "Übersicht");
    return { pdf: pdf ? receives(pdf) : null, back: back ? receives(back) : null };
  });
  expect(reachable, "CV top bar controls must remain clickable while scrolled").toEqual({ pdf: true, back: true });
  expectNoRuntimeErrors(page, "CV builder sticky controls");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Public landing page — no API mocking required; runs on the preview build.
// ═══════════════════════════════════════════════════════════════════════

test.describe("landing page 320px", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("landing page fits a 320px phone and reveals all content", async ({ page }) => {
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    // Scroll through the page so IntersectionObserver reveals every section,
    // then verify no .lv5-reveal element was left invisible. Scrolling must
    // be *instant*: html carries scroll-behavior:smooth, so rapid two-arg
    // scrollTo() calls never finish animating and bottom sections would
    // never intersect. .landing-v5 has overflow-x-hidden (computed
    // overflow-y:auto), so scroll the container too in case it ever becomes
    // the real scroller.
    await page.evaluate(async () => {
      const scroller = document.scrollingElement || document.documentElement;
      const container = document.querySelector(".landing-v5");
      const max = scroller.scrollHeight;
      const step = window.innerHeight * 0.7;
      for (let y = 0; y <= max + step; y += step) {
        window.scrollTo({ top: y, behavior: "instant" });
        container?.scrollTo?.({ top: y, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 120));
        if (window.scrollY >= max - 2) break;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(700);
    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".lv5-reveal:not(.lv5-visible)")).map(
        (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      ),
    );
    expect(hidden, "reveal elements stuck invisible after scrolling").toEqual([]);

    // No horizontal overflow at 320px.
    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.document, "landing document width").toBeLessThanOrEqual(widths.viewport + 1);

    // Cookie banner (fresh context → not yet consented): anchored near the
    // bottom safe area, both buttons ≥44px, and it must not cover the hero
    // CTA after scroll-to-top. The CTA locator is scoped to section#hero —
    // the fixed header holds a "Kostenlos starten" link too, and .first()
    // on an unscoped locator can pick that one, silently weakening the
    // overlap assertion.
    const banner = page.locator("[data-cookie-consent-banner]");
    if (await banner.count()) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(banner).toBeVisible();
      const bannerBox = await banner.boundingBox();
      const heroCta = page
        .locator("section#hero")
        .getByRole("link", { name: /Kostenlos starten|Starten/ })
        .first();
      await expect(heroCta, "hero CTA present in section#hero").toBeVisible();
      const ctaBox = await heroCta.boundingBox();
      const overlaps =
        ctaBox &&
        bannerBox.x < ctaBox.x + ctaBox.width &&
        bannerBox.x + bannerBox.width > ctaBox.x &&
        bannerBox.y < ctaBox.y + ctaBox.height &&
        bannerBox.y + bannerBox.height > ctaBox.y;
      expect(overlaps, "cookie banner must not cover the hero CTA").toBeFalsy();
      // Genuine coverage: the hero CTA (at its resting scroll position) must
      // sit entirely ABOVE the banner — banner top starts at or below the
      // CTA's bottom edge. This is the real acceptance criterion: a user
      // landing on the page sees the CTA, not a banner over it.
      expect(
        bannerBox.y,
        "banner top starts at or below the hero CTA bottom edge",
      ).toBeGreaterThanOrEqual(ctaBox.y + ctaBox.height - 1);
      const ctaClickable = await heroCta.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return Boolean(at && (at === el || el.contains(at)));
      });
      expect(ctaClickable, "hero CTA center receives the tap, not the banner").toBe(true);
      expect(bannerBox.y + bannerBox.height, "banner sits near the viewport bottom").toBeGreaterThan(400);
      for (const label of ["Nur notwendige", "Alle akzeptieren"]) {
        const btn = banner.getByRole("button", { name: label });
        const box = await btn.boundingBox();
        expect(box.height, `${label} hit area`).toBeGreaterThanOrEqual(44);
        expect(box.width, `${label} hit area`).toBeGreaterThanOrEqual(44);
      }
      await banner.getByRole("button", { name: "Alle akzeptieren" }).click();
      await expect(banner).toBeHidden();
    }

    expect(failures, "landing page runtime errors").toEqual([]);
  });

  test("landing drawer traps focus, closes on Escape and restores focus", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    const hamburger = page.getByRole("button", { name: "Menü öffnen" });
    await hamburger.click();
    const drawer = page.getByRole("dialog", { name: "Navigationsmenü" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-modal", "true");

    // Body scroll locked while open.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    // Drawer links are ≥44px tall.
    for (const link of await drawer.locator("a").all()) {
      const box = await link.boundingBox();
      expect(box.height, `drawer link ${(await link.textContent())?.trim()}`).toBeGreaterThanOrEqual(44);
    }

    // Focus is trapped inside the dialog.
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Navigationsmenü"]');
      return dialog && dialog.contains(document.activeElement);
    });
    expect(inside, "focus moved into the drawer").toBeTruthy();

    // Escape closes and focus returns to the hamburger.
    await drawer.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(hamburger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });

  test("header CTA stays on one line at 320px", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    // The mobile top bar is the fixed-position lg:hidden header. Its CTA
    // shows the short xs label at 320px; role locators resolve to the
    // visible label only.
    const header = page.locator("header.lg\\:hidden");
    const headerCta = header.getByRole("link", { name: /Kostenlos starten|Starten/ });
    await expect(headerCta).toBeVisible();

    // The hit area is 44px tall and the visible label occupies exactly one
    // line box at 320px (no wrapping).
    const box = await headerCta.boundingBox();
    expect(box.height, "header CTA height").toBeGreaterThanOrEqual(44);
    const lineCount = await headerCta.evaluate((el) => {
      const visible = Array.from(el.querySelectorAll("span")).find((s) => s.offsetParent !== null) || el;
      return visible.getClientRects().length;
    });
    expect(lineCount, "CTA label renders on a single line at 320px").toBe(1);
  });

  test("extension-demo has no horizontal overflow at 320px", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: 1 }));
    });
    for (const path of ["/extension-demo", "/extension-demo?form=1"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
      await settlePage(page);

      // Regression: the text-4xl German compound words ("Bewerbungshelfer")
      // used to push document scrollWidth to 331px on a 320px phone.
      const widths = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.document, `${path} document width`).toBeLessThanOrEqual(widths.viewport + 1);
      expect(widths.body, `${path} body width`).toBeLessThanOrEqual(widths.viewport + 1);

      // The headline itself must wrap, not just the containers.
      const h1Box = await page.locator("h1").first().boundingBox();
      expect(h1Box.x, "h1 starts inside the viewport").toBeGreaterThanOrEqual(-1);
      expect(h1Box.x + h1Box.width, "h1 ends inside the viewport").toBeLessThanOrEqual(widths.viewport + 1);
    }
  });

  test("cookie banner clears the hero CTA even with a 34px safe-area inset", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    const banner = page.locator("[data-cookie-consent-banner]");
    await expect(banner).toBeVisible();

    const heroCta = page
      .locator("section#hero")
      .getByRole("link", { name: /Kostenlos starten|Starten/ })
      .first();
    await expect(heroCta).toBeVisible();

    // The banner reads the inset through --ja-safe-area-bottom so tests can
    // simulate real notch geometry (env() itself is always 0 in Chromium).
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--ja-safe-area-bottom", "34px");
    });
    await page.waitForTimeout(300);

    // The COMPLETE CTA box must stay clear of the banner — not merely its
    // center — and the gap must remain positive with the inset applied.
    const geo = await page.evaluate(() => {
      const banner = document.querySelector("[data-cookie-consent-banner]");
      const cta = Array.from(document.querySelectorAll("section#hero a[href='/register']"))
        .find((el) => el.getBoundingClientRect().width > 0);
      const b = banner.getBoundingClientRect();
      const c = cta.getBoundingClientRect();
      return { bannerTop: b.y, ctaTop: c.y, ctaBottom: c.y + c.height, gap: b.y - (c.y + c.height) };
    });
    expect(geo.gap, "banner keeps a positive gap below the FULL hero CTA (34px inset simulated)").toBeGreaterThan(0);
    expect(
      geo.bannerTop,
      "banner top at or below the CTA bottom edge",
    ).toBeGreaterThanOrEqual(geo.ctaBottom - 1);

    // The inset path must really be exercised: the banner (which carries the
    // inset padding) grows by exactly the simulated 34px, while the consent
    // buttons stay a flat 44px — the inset never stretches the controls.
    const bannerHeight = await banner.evaluate((el) => el.getBoundingClientRect().height);
    expect(bannerHeight, "banner grows by the simulated inset").toBeGreaterThan(100);
    const btnHeights = await banner.evaluateAll((els) =>
      els.flatMap((el) => Array.from(el.querySelectorAll("button")).map((b) => b.getBoundingClientRect().height)),
    );
    expect(Math.min(...btnHeights), "consent buttons stay a flat 44px").toBeGreaterThanOrEqual(44);
    expect(Math.max(...btnHeights), "consent buttons never stretch with the inset").toBeLessThan(50);
  });

  test("cookie banner heading stays on one line at 320px", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const banner = page.locator("[data-cookie-consent-banner]");
    await expect(banner).toBeVisible();
    await page.waitForSelector("section#hero a[href='/register']", { timeout: 10_000 });

    const result = await banner.evaluate((banner) => {
      const h2 = banner.querySelector("h2");
      const range = document.createRange();
      range.selectNodeContents(h2);
      // The 44px-tall inline-flex privacy link shares the text's visual line
      // but its box extends ~14px above the 15px text rects — cluster by
      // VERTICAL CENTER (all boxes on one line share it), not top.
      const centers = [];
      for (const r of Array.from(range.getClientRects()).filter((x) => x.width > 1)) {
        const mid = r.top + r.height / 2;
        if (!centers.some((c) => Math.abs(c - mid) <= 6)) centers.push(mid);
      }
      const link = h2.querySelector("a");
      const after = link ? getComputedStyle(link, "::after") : null;
      return {
        lines: centers.length,
        hasExpansion: Boolean(after && after.position === "absolute"),
        bannerH: banner.getBoundingClientRect().height,
      };
    });
    expect(result.lines, "cookie banner heading occupies exactly one line at 320px").toBe(1);
    // The link is intentionally short (one-line design); its 44px-class tap
    // area comes from the documented inline-link hit expansion.
    expect(result.hasExpansion, "privacy link has the inline hit-area expansion").toBe(true);
    expect(result.bannerH, "banner stays compact").toBeLessThanOrEqual(140);
  });

  test("touch taps land on controls through banner and drawer overlays", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 700 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    // State 1: the cookie banner is a fixed overlay at the bottom. Tapping
    // both consent buttons must actually reach them.
    const banner = page.locator("[data-cookie-consent-banner]");
    await expect(banner).toBeVisible();
    const accept = banner.getByRole("button", { name: "Alle akzeptieren" });
    await accept.tap();
    await expect(banner).toBeHidden();

    // State 2: the drawer scrim covers the page — drawer links must still
    // receive their taps through the overlay stack.
    await page.getByRole("button", { name: "Menü öffnen" }).tap();
    const drawer = page.getByRole("dialog", { name: "Navigationsmenü" });
    await expect(drawer).toBeVisible();
    const drawerLink = drawer.getByRole("link", { name: "Open Source" });
    await drawerLink.tap();
    await expect(drawer).toHaveCount(0);
    await expect(page).toHaveURL(/#open-source/);

    expectNoRuntimeErrors(page, "touch through overlays");
    await context.close();
  });

  test("landing keeps every actionable control at 44px", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    await settlePage(page);
    const offenders = await auditTapTargets(page);
    expect(offenders, "landing tap targets below 44px").toEqual([]);
  });

  test("landing controls keep 44px hit areas with drawer and menu open", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    await settlePage(page);

    // State 1: the mobile drawer is open — its scrim covers the page, its
    // own links plus the fixed header must stay tappable.
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigationsmenü" });
    await expect(drawer).toBeVisible();
    let offenders = await auditTapTargets(page);
    expect(offenders, `landing drawer open: ${JSON.stringify(offenders)}`).toEqual([]);

    // State 2: close the drawer, then audit with the FAQ accordion open.
    await drawer.getByRole("button", { name: "Menü schließen" }).click();
    await expect(drawer).toHaveCount(0);
    const faqButton = page.getByRole("button", { name: /Ist JobAssist kostenlos/ }).first();
    await faqButton.scrollIntoViewIfNeeded();
    await faqButton.click();
    await page.waitForTimeout(250);
    offenders = await auditTapTargets(page);
    expect(offenders, `landing FAQ open: ${JSON.stringify(offenders)}`).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Public routes beyond the landing page — the tap-target audit must cover
// them too (they ship their own headers, footers and forms).
// ═══════════════════════════════════════════════════════════════════════

test.describe("public routes keep 44px controls at 320px", () => {
  test.use({ viewport: { width: 320, height: 720 } });

  const PUBLIC_ROUTES = [
    ["/login", "Willkommen zurück."],
    ["/register", "Konto erstellen."],
    ["/terms", /Geschäftsbedingungen/],
    ["/privacy", /Datenschutz/],
    ["/impressum", /Impressum/],
    ["/contact", /Kontakt/],
    ["/forgot-password", "Passwort vergessen?"],
    // Without a token these pages render their error/invalid states.
    ["/reset-password", "Ungültiger Link"],
    ["/verify-email", "Bestätigung fehlgeschlagen"],
    ["/unsubscribe", "Abmeldung fehlgeschlagen"],
  ];

  for (const [path, heading] of PUBLIC_ROUTES) {
    test(`audit ${path}`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: 1 }));
      });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 15_000 });
      await settlePage(page);
      const offenders = await auditTapTargets(page);
      expect(offenders, `${path}: tap targets below 44px: ${JSON.stringify(offenders)}`).toEqual([]);
    });
  }

  test("extension-demo keeps every control tappable at 320px", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cookie_consent_v1", JSON.stringify({ essential: true, analytics: false, ts: 1 }));
    });
    for (const [path, heading] of [
      ["/extension-demo", /Bewerbungshelfer/],
      ["/extension-demo?form=1", "Junior Projektassistenz"],
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: 15_000 });
      await settlePage(page);
      const offenders = await auditTapTargets(page);
      expect(offenders, `${path}: tap targets below 44px: ${JSON.stringify(offenders)}`).toEqual([]);
    }
  });
});

test.describe("landing manifest + icons", () => {
  test("web manifest is linked, parseable and branded", async ({ request }) => {
    const res = await request.get("/site.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.short_name).toBe("JobAssist");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `${icon.src} reachable`).toBe(200);
    }
  });

  test("index.html links manifest, apple touch icon and the optimized brand asset", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="manifest"][href="/site.webmanifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

    // The landing page is code-split: the header BrandMark markup does not
    // exist until the lazy chunk executes, which can land well after
    // domcontentloaded. Locator assertions retry until then (a bare
    // page.evaluate raced the hydration and failed intermittently —
    // demonstrated with --repeat-each=20 before this fix).
    const picture = page.locator("picture").first();
    await expect(picture).toBeAttached({ timeout: 15_000 });
    await expect(picture.locator('source[type="image/webp"][srcset*="jobassist-logo-96.webp"]')).toBeAttached();
    await expect(picture.locator('img[src="/branding/jobassist-logo-64.png"]')).toBeAttached();
    // And it renders the actual pixels, not just the markup.
    await expect(picture.locator("img")).toBeVisible();
  });

  test("optimized brand assets are small and served", async ({ request }) => {
    const png = await request.get("/branding/jobassist-logo-64.png");
    expect(png.status()).toBe(200);
    expect(Number(png.headers()["content-length"])).toBeLessThan(20_000);
    const webp = await request.get("/branding/jobassist-logo-96.webp");
    expect(webp.status()).toBe(200);
    expect(Number(webp.headers()["content-length"])).toBeLessThan(20_000);
  });
});
