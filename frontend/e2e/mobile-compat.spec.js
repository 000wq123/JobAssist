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

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
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

  // A 24px chip-remove hit area removes the tag — and must NOT also open the
  // picker popover (stopPropagation).
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Einstellungen" }).first()).toBeVisible({ timeout: 10_000 });
  const removeChip = page.getByRole("button", { name: "Technik/IT entfernen" });
  const chipBox = await removeChip.boundingBox();
  await page.touchscreen.tap(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
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

test("CV builder keeps its own chrome usable while scrolled", async ({ page }) => {
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
