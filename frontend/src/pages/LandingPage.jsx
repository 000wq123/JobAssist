import { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Sparkles, Briefcase, FileText, Bell, Wand2,
  MessageSquare, Target, Search, TrendingUp, Shield, Zap, Globe, CheckCircle2,
  ChevronRight, Quote, Twitter, Instagram, Youtube,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";
import { billingApi } from "../services/api";

/* ─── Simple fade-in on scroll hook ─── */
function useFadeIn(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function FadeIn({ children, className = "" }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)" }}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Landing page — Phase 2 redesign.
   Patterns borrowed from Arc/Dia, Cron, Cluely, Plain, Resend.
   Each section is a self-contained component below.
   ════════════════════════════════════════════════════════════════════════ */

/* ─── Top navigation (Plain/Resend pattern: small logo, center links, right CTA) ── */
/**
 * Sticky top nav. Logo left, centered links, sign-in + CTA right.
 */
function TopNav() {
  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-md backdrop-saturate-150 relative"
      style={{ background: "rgba(255,255,255,0.72)" }}
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link to="/" className="col-span-6 md:col-span-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-accent-500)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-fg)]">JobAssist</span>
        </Link>
        <nav className="col-span-6 hidden md:flex md:col-span-6 items-center justify-center gap-8 text-[14px] text-[var(--color-fg-muted)]">
          <a href="#features" className="hover:text-[var(--color-fg)] transition-colors">Funktionen</a>
          <a href="#how" className="hover:text-[var(--color-fg)] transition-colors">So funktioniert&apos;s</a>
          <Link to="/pricing" className="hover:text-[var(--color-fg)] transition-colors">Preise</Link>
        </nav>
        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Anmelden
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
          >
            Jetzt starten
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      {/* Subtle accent hairline at the bottom for definition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(124,92,255,0.45) 50%, transparent 100%)",
        }}
      />
    </header>
  );
}

/* ─── Section 1: Hero (Cron pattern — huge centered headline + product mockup) ── */
/**
 * Centered hero. Serif display headline + sub + CTAs + floating dashboard mockup.
 */
function Hero() {
  return (
    <section className="relative">
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 pt-14 pb-10 sm:px-8 sm:pt-20 sm:pb-12 md:pt-32">
        <div className="col-span-12 flex flex-col items-center text-center">
          <Link to="/pricing" className="pill-banner mb-6 sm:mb-8">
            <span className="grid place-items-center h-5 w-5 rounded-full bg-[var(--color-accent-500)] text-white">
              <Sparkles className="h-3 w-3" />
            </span>
            <span>7 Tage Pro gratis — kein Risiko</span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--color-fg-muted)]" />
          </Link>

          <h1 className="text-hero text-[var(--color-fg)] max-w-[20ch]">
            Dein nächster Job wartet. Wir helfen dir, ihn zu finden.
          </h1>

          <p className="mt-5 sm:mt-6 max-w-[52ch] text-[15px] sm:text-[17px] leading-relaxed text-[var(--color-fg-muted)]">
            Die KI-gestützte Plattform für deine Bewerbungen. Lebenslauf hochladen, passende Stellen finden, Anschreiben generieren lassen.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-5 py-3 text-[14px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
            >
              So funktioniert&apos;s
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-[12px] text-[var(--color-fg-dim)]">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              DSGVO-konform
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              In 2 Minuten starten
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              Made in Austria
            </span>
          </div>
        </div>

        <div className="col-span-12 mt-8 sm:mt-16 overflow-x-auto scrollbar-hide sm:overflow-visible">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

/**
 * Hero product mockup — JobAssist dashboard rendered with `.browser-mockup` chrome.
 */
function DashboardMockup() {
  const jobs = [
    { c: "Billa",              r: "Aushilfe Verkauf",         s: 91 },
    { c: "McDonald's",          r: "Servicekraft",             s: 78 },
    { c: "Sporthaus Schuster",  r: "Teilzeit Lager",           s: 64 },
    { c: "Rathaus Wien",        r: "Praktikum Verwaltung",     s: 71 },
  ];
  return (
    <div className="browser-mockup mx-auto max-w-full sm:max-w-[1080px]">
      <div className="grid grid-cols-12 gap-0">
        {/* Sidebar */}
        <aside className="col-span-3 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] p-4 hidden md:block">
          <div className="flex items-center gap-2 mb-5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent-500)]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[12px] font-semibold text-[var(--color-fg)]">JobAssist</span>
          </div>
          <nav className="space-y-1">
            {[
              { i: TrendingUp, l: "Dashboard",   active: true  },
              { i: Briefcase,  l: "Stellen",     active: false },
              { i: FileText,   l: "Lebenslauf",  active: false },
              { i: Wand2,      l: "KI-Assistent", active: false },
              { i: Bell,       l: "Job-Alerts",  active: false },
            ].map(({ i: Icon, l, active }) => (
              <div
                key={l}
                className={`grid grid-cols-12 items-center gap-2 rounded-md px-2.5 py-2 text-[12px] ${
                  active
                    ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)]"
                }`}
              >
                <Icon className="col-span-2 h-3.5 w-3.5" />
                <span className="col-span-10">{l}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 p-5 sm:p-6 bg-[var(--color-bg)]">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">
              Übersicht
            </p>
            <h3 className="mt-1 text-[18px] font-semibold text-[var(--color-fg)]">
              Guten Morgen, Lisa
            </h3>
          </div>

          <div className="grid grid-cols-12 gap-3 mb-5">
            {[
              { l: "Match-Score",   v: "82%", d: "+4% vs Vorwoche" },
              { l: "Beworben",      v: "12",  d: "diese Woche"      },
              { l: "Interviews",    v: "3",   d: "anstehend"        },
            ].map((kpi) => (
              <div
                key={kpi.l}
                className="col-span-12 sm:col-span-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">
                  {kpi.l}
                </p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--color-fg)]">
                  {kpi.v}
                </p>
                <p className="text-[10px] text-[var(--color-fg-dim)]">{kpi.d}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
            <div className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border-subtle)]">
              <p className="col-span-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">
                Top-Matches
              </p>
              <span className="col-span-5 justify-self-end text-[10px] text-[var(--color-fg-dim)]">
                {jobs.length} aktive Stellen
              </span>
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {jobs.map((j) => (
                <div key={j.c} className="grid grid-cols-12 items-center gap-3 px-4 py-2.5">
                  <div className="col-span-1 h-6 w-6 rounded-md bg-[var(--color-bg-elev-2)] grid place-items-center">
                    <Briefcase className="h-3 w-3 text-[var(--color-fg-muted)]" />
                  </div>
                  <div className="col-span-7 min-w-0">
                    <p className="text-[12px] font-medium text-[var(--color-fg)] truncate">{j.r}</p>
                    <p className="text-[10px] text-[var(--color-fg-dim)] truncate">{j.c}</p>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent-500)]"
                        style={{ width: `${j.s}%` }}
                      />
                    </div>
                  </div>
                  <span className="col-span-1 sm:col-span-1 text-right text-[12px] font-bold tabular-nums text-[var(--color-fg)]">
                    {j.s}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Section 2: Problem statement (Plain "Tools add distance" pattern) ─── */
/**
 * App-icon-style brand mark for a competitor.
 *
 * Three rendering modes:
 *  - default: monochrome SVG inside a brand-colored tile, white-tinted via CSS
 *  - `crop`:  source is a wide wordmark; clip via overflow to show only the
 *             leftmost icon portion (height-locked, natural width)
 *  - `bare`:  source is a full pre-styled app icon; render at full tile size,
 *             no brand-color background, no white filter
 *
 * @param {{
 *   slug?: string,
 *   src?: string,
 *   name: string,
 *   color?: string,
 *   crop?: boolean,
 *   bare?: boolean,
 * }} props
 */
function CompetitorLogo({ slug, src, name, color, crop = false, bare = false }) {
  const url = src ?? `https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/${slug}.svg`;

  if (bare) {
    return (
      <span
        className="grid place-items-center h-12 w-12 rounded-xl shrink-0 overflow-hidden bg-white"
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
        title={name}
        role="img"
        aria-label={name}
      >
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          style={{ imageRendering: "auto" }}
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  if (crop) {
    return (
      <span
        className="flex items-center justify-start h-12 w-12 rounded-xl shrink-0 overflow-hidden"
        style={{ background: color, boxShadow: `0 4px 12px ${color}59` }}
        title={name}
        role="img"
        aria-label={name}
      >
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="h-full max-w-none w-auto block shrink-0"
          style={{ filter: "brightness(0) invert(1)" }}
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className="grid place-items-center h-12 w-12 rounded-xl shrink-0"
      style={{ background: color, boxShadow: `0 4px 12px ${color}59` }}
      title={name}
      role="img"
      aria-label={name}
    >
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="h-7 w-7"
        style={{ filter: "brightness(0) invert(1)" }}
        loading="lazy"
      />
    </span>
  );
}

/* ─── Trust strip (Stripe pattern — used by logos) ─── */
function TrustStrip() {
  const companies = [
    { name: "Billa", color: "#E2001A" },
    { name: "McDonald's", color: "#FFC72C" },
    { name: "Hofer", color: "#CC0000" },
    { name: "Spar", color: "#D1151D" },
    { name: "MediaMarkt", color: "#DF0000" },
    { name: "Zara", color: "#000000" },
  ];
  return (
    <section className="border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-8 sm:py-10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg-dim)] mb-6">
          Jobs bei Firmen wie
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {companies.map((c) => (
            <span
              key={c.name}
              className="text-[13px] sm:text-[15px] font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-default"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Stats strip (Linear pattern — big numbers) ─── */
function StatsStrip() {
  const stats = [
    { value: "15.000+", label: "Bewerbungen geschrieben" },
    { value: "3.200+", label: "Aktive Nutzer" },
    { value: "94%", label: "Bewerben erfolgreich" },
    { value: "4.8", label: "Nutzerbewertung" },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-16 sm:py-20">
      <div className="grid grid-cols-12 gap-6 sm:gap-8">
        {stats.map((s, i) => (
          <div key={i} className="col-span-6 md:col-span-3 text-center">
            <p className="text-[32px] sm:text-[40px] font-bold tabular-nums text-[var(--color-accent-400)]">
              {s.value}
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-fg-muted)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Headline with inline icon pills illustrating the chaos JobAssist replaces.
 */
function ProblemStatement() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-10 md:col-start-2 text-center">
          <h2 className="text-display text-[var(--color-fg)] leading-[1.15]">
            Bewerben ist kompliziert. Muss es nicht sein.
          </h2>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
            <CompetitorLogo slug="linkedin" name="LinkedIn" color="#0A66C2" />
            <CompetitorLogo slug="indeed" name="Indeed" color="#003A9B" />
            <CompetitorLogo src="/logos/logo.svg" name="StepStone" color="#00217A" crop />
            <CompetitorLogo src="https://icon.horse/icon/karriere.at" name="karriere.at" bare />
            <CompetitorLogo slug="xing" name="Xing" color="#006567" />
          </div>
          <p className="mt-6 max-w-[50ch] mx-auto text-[15px] sm:text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
            LinkedIn, Indeed, StepStone — du brauchst keinen weiteren Tab.
            <strong className="text-[var(--color-fg)]"> Alles an einem Ort.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 4: Resume showcase (Resend full-bleed dark pattern) ─── */
/**
 * Big product showcase — Resume optimizer.
 */
function ResumeShowcase() {
  return (
    <section className="border-y border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-12 gap-8 mb-12">
          <div className="col-span-12 md:col-span-7">
            <p className="text-eyebrow text-[var(--color-accent-300)] mb-3">Lebenslauf-Check</p>
            <h2 className="text-display text-[var(--color-fg)]">
              Dein Lebenslauf. Perfekt auf jede Stelle zugeschnitten.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
              Die KI analysiert deinen Lebenslauf, zeigt dir was fehlt und passt ihn automatisch an jede Bewerbung an.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
            >
              Kostenlos ausprobieren <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-3 self-end">
            {[
              { l: "Formatierung",     v: "OK" },
              { l: "Sprachen",         v: "DE/EN" },
              { l: "Hobbies",          v: "3" },
              { l: "Praktika",         v: "1" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">{s.l}</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-[var(--color-fg)]">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        <ResumeMockup />
      </div>
    </section>
  );
}

/**
 * Mockup of the resume analysis page used inside ResumeShowcase.
 */
function ResumeMockup() {
  const skills = [
    { l: "MS Office",      v: 92 },
    { l: "Teamfähigkeit",  v: 88 },
    { l: "Kundenkontakt",  v: 76 },
    { l: "Deutsch",        v: 64 },
    { l: "Englisch",       v: 58 },
  ];
  return (
    <div className="browser-mockup max-w-full">
      <div className="grid grid-cols-12 bg-[var(--color-bg)]">
        <div className="col-span-12 md:col-span-7 p-5 sm:p-6 border-r border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[var(--color-accent-300)]" />
            <span className="text-[13px] font-semibold text-[var(--color-fg)]">Lebenslauf_2026.pdf</span>
            <span className="ml-auto rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">
              Analysiert
            </span>
          </div>
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Top Skills</p>
          <div className="space-y-2.5">
            {skills.map((s) => (
              <div key={s.l} className="grid grid-cols-12 items-center gap-3">
                <span className="col-span-4 sm:col-span-3 text-[12px] text-[var(--color-fg-muted)]">{s.l}</span>
                <div className="col-span-6 sm:col-span-8 h-1.5 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent-500)]"
                    style={{ width: `${s.v}%`, opacity: 0.35 + (s.v / 100) * 0.65 }}
                  />
                </div>
                <span className="col-span-2 sm:col-span-1 text-right text-[11px] font-semibold tabular-nums text-[var(--color-fg)]">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 p-5 sm:p-6 bg-[var(--color-bg-elev-1)]">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">KI-Vorschläge</p>
          <div className="space-y-3">
            {[
              "Ergänze deine Sprachkenntnisse — 60% der Stellen wünschen Englisch.",
              "Füge ein Praktikum oder ein Ehrenamt als erste Erfahrung ein.",
              "Schreibe eine Kurzbeschreibung zu deinen Hobbys — das zeigt Persönlichkeit.",
            ].map((tip, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-start gap-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-3"
              >
                <CheckCircle2 className="col-span-1 h-4 w-4 mt-0.5 text-[var(--color-accent-400)]" />
                <p className="col-span-11 text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section 5: 3-card features (Cluely "Undetectable in every way" pattern) ─── */
const FEATURE_CARDS = [
  {
    icon: Target,
    title: "Intelligentes Matching",
    desc: "Die KI bewertet jede Stelle in Sekunden — du siehst auf einen Blick, wo du wirklich passt.",
    visual: "match",
  },
  {
    icon: Wand2,
    title: "Anschreiben in Sekunden",
    desc: "Personalisierte Motivationsschreiben — auf Ton, Stelle und Profil zugeschnitten.",
    visual: "letter",
  },
  {
    icon: MessageSquare,
    title: "Interview-Vorbereitung",
    desc: "Übe mit Fragen, die exakt auf den Job und deinen Lebenslauf zugeschnitten sind.",
    visual: "interview",
  },
];

/**
 * 3-column feature grid with custom mini-visuals per card.
 */
function FeatureGrid3() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="text-center mb-14">
        <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Funktionen</p>
        <h2 className="text-display text-[var(--color-fg)] max-w-[22ch] mx-auto">
          Dein persönlicher Bewerbungs-Assistent.
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {FEATURE_CARDS.map(({ icon: Icon, title, desc, visual }) => (
          <div
            key={title}
            className="col-span-12 md:col-span-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 flex flex-col"
          >
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-3 sm:p-5 mb-5 min-h-[120px] sm:min-h-[180px] grid place-items-center">
              <FeatureCardVisual variant={visual} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-[var(--color-accent-300)]" />
              <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">{title}</h3>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Tiny visual rendered inside each feature card.
 * @param {{ variant: "match" | "letter" | "interview" }} props
 */
function FeatureCardVisual({ variant }) {
  if (variant === "match") {
    return (
      <div className="grid grid-cols-12 items-center gap-3 w-full">
        <div className="col-span-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">Match-Score</p>
          <p className="mt-1 text-[32px] sm:text-[44px] font-bold tabular-nums text-[var(--color-accent-300)]">91<span className="text-[16px] sm:text-[20px] text-[var(--color-fg-dim)]">%</span></p>
          <p className="text-[11px] text-[var(--color-fg-muted)]">Aushilfe Verkauf · Billa · Wien</p>
        </div>
      </div>
    );
  }
  if (variant === "letter") {
    return (
      <div className="grid grid-cols-12 gap-1.5 w-full">
        {[100, 85, 92, 70, 88, 60].map((w, i) => (
          <div
            key={i}
            className="col-span-12 h-1.5 rounded-full bg-[var(--color-bg-elev-2)]"
            style={{ width: `${w}%` }}
          />
        ))}
        <div className="col-span-12 mt-2 inline-flex items-center gap-1.5">
          <span className="grid place-items-center h-5 w-5 rounded-md bg-[var(--color-accent-500)]">
            <Wand2 className="h-3 w-3 text-white" />
          </span>
          <span className="text-[11px] text-[var(--color-fg-muted)]">Persönlich und nachvollziehbar</span>
        </div>
      </div>
    );
  }
  // interview
  return (
    <div className="grid grid-cols-12 gap-2 w-full">
      {[
        "Warum möchtest du bei uns arbeiten?",
        "Erzähl mir von deiner Schule.",
        "Hast du schon Erfahrung im Verkauf?",
      ].map((q, i) => (
        <div
          key={i}
          className="col-span-12 grid grid-cols-12 items-center gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-2.5 py-1.5"
        >
          <span className="col-span-1 text-[10px] font-bold tabular-nums text-[var(--color-fg-dim)]">0{i + 1}</span>
          <span className="col-span-11 text-[11px] text-[var(--color-fg-muted)] truncate">{q}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section 6: Light pastel "Space for every stage" (Arc/Dia pattern) ─── */
/**
 * Light-mode pastel section showcasing the Jobs page.
 */
function PastelSpaces() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F6EFD8 0%, #FBC8B5 100%)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-12">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Eine Plattform. Alle Stages.</p>
          <h2 className="text-display text-[var(--color-fg)] max-w-[22ch] mx-auto">
            <span className="text-[var(--color-accent-700)]">Von der</span> ersten Bewerbung bis zum Vertrag.
          </h2>
          <p className="mt-5 max-w-[52ch] mx-auto text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
            Speichern, bewerben, nachfassen — der ganze Prozess an einem Ort.
          </p>
        </div>
        <JobsMockup />
      </div>
    </section>
  );
}

/**
 * Mockup of the Jobs page rendered on the light pastel surface.
 */
function JobsMockup() {
  const jobs = [
    { c: "Billa",              r: "Aushilfe Verkauf",      l: "Wien",     s: 91, status: "Beworben" },
    { c: "McDonald's",          r: "Servicekraft",          l: "Wien",     s: 78, status: "Interview" },
    { c: "Sporthaus Schuster",  r: "Teilzeit Lager",        l: "Graz",     s: 64, status: "Entwurf"   },
    { c: "Bäckerei Gruber",     r: "Samstagsjob",           l: "Salzburg", s: 71, status: "Beworben" },
    { c: "Rathaus Wien",        r: "Praktikum Verwaltung",  l: "Linz",     s: 82, status: "Interview" },
  ];
  return (
    <div className="browser-mockup max-w-full sm:max-w-[1080px] mx-auto">
      <div className="bg-[var(--color-bg)]">
        <div className="grid grid-cols-12 items-center gap-3 px-5 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="col-span-6 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[var(--color-fg-dim)]" />
            <span className="text-[12px] text-[var(--color-fg-muted)]">Aushilfe · Wien</span>
          </div>
          <div className="col-span-6 justify-self-end flex gap-2">
            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-fg-muted)]">5 Filter</span>
            <span className="rounded-full bg-[var(--color-accent-500)] px-2.5 py-1 text-[11px] font-semibold text-white">{jobs.length} Treffer</span>
          </div>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {jobs.map((j) => (
            <div key={j.c} className="grid grid-cols-12 items-center gap-3 px-5 py-3">
              <div className="col-span-1 h-8 w-8 rounded-md bg-[var(--color-bg-elev-2)] grid place-items-center">
                <Briefcase className="h-3.5 w-3.5 text-[var(--color-fg-muted)]" />
              </div>
              <div className="col-span-5 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--color-fg)] truncate">{j.r}</p>
                <p className="text-[11px] text-[var(--color-fg-dim)] truncate">{j.c} · {j.l}</p>
              </div>
              <div className="col-span-3 hidden sm:block">
                <span className="text-[11px] text-[var(--color-fg-muted)]">{j.status}</span>
              </div>
              <div className="col-span-2 hidden sm:block">
                <div className="h-1.5 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-accent-500)]" style={{ width: `${j.s}%` }} />
                </div>
              </div>
              <span className="col-span-1 text-right text-[12px] font-bold tabular-nums text-[var(--color-fg)]">{j.s}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Section 7: 2-card "How it helps" (Cluely meeting pattern) ─── */
/**
 * Two-card row demonstrating the assistant's two superpowers.
 */
function TwoCardHelp() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="mb-12 max-w-[40ch]">
        <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">So funktioniert's</p>
        <h2 className="text-display text-[var(--color-fg)]">
          Intelligenter. Schneller. Besser.
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div
          className="col-span-12 md:col-span-6 rounded-2xl border border-[var(--color-border)] p-7 flex flex-col"
          style={{ background: "linear-gradient(180deg, rgba(124,92,255,0.18) 0%, rgba(124,92,255,0.04) 100%)" }}
        >
          <p className="text-[14px] font-semibold text-[var(--color-fg)] mb-2">
            JobAssist liest die Stelle für dich
          </p>
          <p className="text-[13px] text-[var(--color-fg-muted)] mb-6">
            Die KI liest die Anforderungen der Stelle und vergleicht sie mit deinem Profil.
          </p>
          <div className="mt-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] p-4">
            <div className="flex flex-wrap gap-1.5">
              {["Kassieren", "Kundenkontakt", "Deutsch", "Englisch", "keine Erfahrung nötig"].map((tag) => (
                <span key={tag} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-2)] px-2 py-1 text-[11px] text-[var(--color-fg-muted)] whitespace-nowrap">{tag}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-12 items-center gap-2">
              <span className="col-span-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-fg-dim)]">Match</span>
              <div className="col-span-7 h-1.5 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                <div className="h-full w-[91%] rounded-full bg-[var(--color-accent-400)]" />
              </div>
              <span className="col-span-2 text-right text-[12px] font-bold text-[var(--color-fg)]">91%</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-7 flex flex-col">
          <p className="text-[14px] font-semibold text-[var(--color-fg)] mb-2">
            Wenn du Hilfe brauchst, hilft die KI sofort
          </p>
          <p className="text-[13px] text-[var(--color-fg-muted)] mb-6">
            Frag die KI direkt im Editor — Anschreiben verbessern, Lücken erklären, Argumente schärfen.
          </p>
          <div className="mt-auto space-y-2">
            {[
              { q: "Wie schreibe ich ohne Berufserfahrung?", a: "Antwort bereit" },
              { q: "Bewerbung für Teilzeit umformulieren",   a: "3 Varianten" },
              { q: "Was zählt als Praktikum?",               a: "Erklärung bereit" },
            ].map((m, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 py-2">
                <Wand2 className="col-span-1 h-3.5 w-3.5 text-[var(--color-accent-300)]" />
                <span className="col-span-7 text-[12px] text-[var(--color-fg-muted)] truncate">{m.q}</span>
                <span className="col-span-4 text-right text-[10px] text-[var(--color-fg-dim)]">{m.a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 8: 6-card grid (Plain dark grid pattern) ─── */
const GRID_FEATURES = [
  { icon: Briefcase,    cat: "Übersicht",    title: "Meine Stellen",
    desc: "Alle Bewerbungen an einem Ort. Du siehst sofort, bei welchen Firmen du dich beworben hast." },
  { icon: Wand2,        cat: "Lebenslauf",   title: "Auf die Stelle anpassen",
    desc: "Die KI zeigt dir, was du im Lebenslauf ergänzen oder ändern solltest — ganz einfach." },
  { icon: Bell,         cat: "Benachrichtigungen", title: "Jobs per Mail",
    desc: "Passende Stellen kommen direkt in dein Postfach. Du musst nicht selbst suchen." },
  { icon: Globe,        cat: "Infos",        title: "Firmen vor dem Gespräch",
    desc: "Wie groß ist die Firma? Wie ist die Kultur? Die KI bereitet dich auf das Gespräch vor." },
  { icon: Shield,       cat: "Datenschutz",  title: "Deine Daten, dein Profil",
    desc: "Alle Daten bleiben in Österreich. Du kannst dein Profil jederzeit löschen." },
  { icon: Zap,          cat: "Download",     title: "Lebenslauf als PDF",
    desc: "Lade deinen fertigen Lebenslauf herunter und schicke ihn mit deiner Bewerbung ab." },
];

/**
 * Dark 6-card feature grid with category eyebrows.
 */
function FeatureGrid6() {
  return (
    <section
      className="border-y border-[var(--color-border-subtle)]"
      style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,92,255,0.08), transparent 70%), var(--color-bg)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <div className="mb-14 max-w-[36ch]">
          <p className="text-eyebrow text-[var(--color-accent-300)] mb-3">Plattform</p>
          <h2 className="text-display text-[var(--color-fg)]">
            Alles, was du für deine Karriere brauchst.
          </h2>
        </div>
        <div className="grid grid-cols-12 gap-4">
          {GRID_FEATURES.map(({ icon: Icon, cat, title, desc }) => (
            <div
              key={title}
              className="group col-span-12 sm:col-span-6 lg:col-span-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 hover:border-[var(--color-accent-500)]/40 hover:bg-[var(--color-bg-elev-2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(124,92,255,0.45)] transition-all duration-200"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-accent-500)]/10 mb-5">
                <Icon className="h-4 w-4 text-[var(--color-accent-300)]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-300)] mb-1.5">{cat}</p>
              <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section 9: Testimonials (Stripe pattern — 3-card social proof) ─── */
const TESTIMONIALS = [
  {
    quote: "Ich hatte null Ahnung, wie man ein Anschreiben schreibt. JobAssist hat mir einen Entwurf gemacht, den ich nur noch anpassen musste. Nach zwei Wochen hatte ich ein Gespräch bei Billa.",
    name: "Lisa K.",
    role: "Schülerin",
    location: "Graz",
    initials: "LK",
  },
  {
    quote: "Ich habe in einer Woche 8 Bewerbungen geschrieben — vorher hätte ich das in einem Monat geschafft. Der Zeitaufwand ist ein Bruchteil.",
    name: "Max H.",
    role: "Student",
    location: "Wien",
    initials: "MH",
  },
  {
    quote: "Die Job-Alerts sind Gold wert. Ich muss nicht mehr stundenlang suchen — passende Stellen kommen direkt in mein Postfach.",
    name: "Sarah M.",
    role: "BWL-Studentin",
    location: "Linz",
    initials: "SM",
  },
];

/**
 * Three-card testimonial grid — social proof section.
 */
function BigQuote() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="text-center mb-14">
        <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Was Nutzer sagen</p>
        <h2 className="text-display text-[var(--color-fg)] max-w-[24ch] mx-auto">
          Tausende haben bereits ihren Job gefunden.
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="col-span-12 md:col-span-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 flex flex-col"
          >
            <Quote className="h-8 w-8 text-[var(--color-accent-500)]/30 mb-4" />
            <blockquote className="text-[14px] leading-relaxed text-[var(--color-fg)] flex-1">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--color-accent-500)] to-[var(--color-accent-700)] grid place-items-center text-white text-[12px] font-semibold shrink-0">
                {t.initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-fg)]">{t.name}</p>
                <p className="text-[11px] text-[var(--color-fg-dim)]">{t.role} · {t.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Section 10: Pricing teaser (Cron pattern — 3 plans + final CTA) ─── */

const LIMIT_LABELS = {
  cv_analysis: (v) => (v === -1 ? "Unbegrenzte Lebenslauf-Checks" : `${v} Lebenslauf-Checks / Monat`),
  cover_letter: (v) => (v === -1 ? "Unbegrenzte Bewerbungen" : `${v} Bewerbungen / Monat`),
  job_alerts: (v) => (v === -1 ? "Unbegrenzte Job-Alerts" : `${v} Job-Alerts`),
  ai_chat: (v) => (v === -1 ? "Unbegrenzte Fragen an die KI" : `${v} Fragen an die KI / Monat`),
  job_search: (v) => (v === -1 ? "Unbegrenzte Suche" : `${v} Suchen / Tag`),
};

function formatPrice(price) {
  if (price === null || price === undefined) return { text: "Auf Anfrage", suffix: "" };
  if (price === 0) return { text: "€0", suffix: "" };
  return { text: `€${String(price).replace(".", ",")}`, suffix: "/Monat" };
}

function buildFeatures(plan) {
  const feats = Object.entries(plan.limits || {})
    .map(([key, val]) => LIMIT_LABELS[key]?.(val))
    .filter(Boolean);
  if (plan.key === "max") {
    feats.push("Firmen-Insights", "Priority-Support");
  } else if (plan.key === "pro") {
    feats.push("Interview-Prep");
  }
  return feats;
}

/**
 * Pricing teaser with 3 plans and a "see all" link.
 * Fetches plan limits/prices from the backend so marketing copy never drifts
 * from the single source of truth in plans.py.
 */
function PlanCard({ plan, isPopular, className = "" }) {
  const price = formatPrice(plan.price);
  const features = buildFeatures(plan);
  const cta = isPopular ? "Pro 7 Tage testen" : plan.key === "max" ? "Max wählen" : "Kostenlos starten";
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-7 flex flex-col ${
        isPopular
          ? "border-[var(--color-accent-400)] bg-[var(--color-bg)]"
          : "border-[var(--color-border)] bg-[var(--color-bg)]"
      } ${className}`}
    >
      {isPopular && (
        <span className="self-start mb-3 inline-flex rounded-full bg-[var(--color-accent-500)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-300)]">
          Empfohlen
        </span>
      )}
      <h3 className="text-[16px] font-semibold text-[var(--color-fg)]">{plan.name}</h3>
      <p className="text-[13px] text-[var(--color-fg-muted)]">
        {plan.key === "basic" ? "Zum Ausprobieren" : plan.key === "pro" ? "Für aktive Bewerber" : "Ohne Limits"}
      </p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[40px] font-bold tracking-tight text-[var(--color-fg)]">{price.text}</span>
        {price.suffix && <span className="text-[13px] text-[var(--color-fg-dim)]">{price.suffix}</span>}
      </div>
      <ul className="mt-6 space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="grid grid-cols-12 gap-2 text-[13px] text-[var(--color-fg-muted)]">
            <CheckCircle2 className="col-span-1 h-4 w-4 text-[var(--color-accent-400)] mt-0.5" />
            <span className="col-span-11">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${
          isPopular
            ? "bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-400)]"
            : "border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
        }`}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Pricing() {
  const [plans, setPlans] = useState([]);
  const [activeMobilePlan, setActiveMobilePlan] = useState("pro");

  useEffect(() => {
    billingApi.plans()
      .then((res) => {
        // Landing page only shows basic/pro/max (not enterprise)
        const order = ["basic", "pro", "max"];
        const ordered = order
          .map((k) => res.data.find((p) => p.key === k))
          .filter(Boolean);
        setPlans(ordered);
        // Default active mobile tab to the popular plan if available
        if (ordered.find((p) => p.key === "pro")) {
          setActiveMobilePlan("pro");
        } else if (ordered.length) {
          setActiveMobilePlan(ordered[0].key);
        }
      })
      .catch(() => {
        // Graceful fallback: render nothing if the API is unavailable
        setPlans([]);
      });
  }, []);

  if (!plans.length) {
    return (
      <section id="pricing" className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32 text-center">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Preise</p>
          <h2 className="text-display text-[var(--color-fg)] mb-6">Starte kostenlos. Upgrade, wenn du mehr willst.</h2>
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors">
            Preise ansehen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      id="pricing"
      className="border-t border-[var(--color-border-subtle)]"
      style={{ background: "var(--color-bg-elev-1)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-14">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Preise</p>
          <h2 className="text-display text-[var(--color-fg)] max-w-[22ch] mx-auto">
            Starte kostenlos. Mehr Funktionen, wenn du sie brauchst.
          </h2>
        </div>

        {/* Mobile tab switcher */}
        <div className="md:hidden flex justify-center gap-2 mb-8">
          {plans.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveMobilePlan(p.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] ${
                activeMobilePlan === p.key
                  ? "bg-[var(--color-accent-500)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid grid-cols-12 gap-4">
          {plans.map((p) => (
            <PlanCard key={p.key} plan={p} isPopular={p.key === "pro"} className="col-span-4" />
          ))}
        </div>

        {/* Mobile: single active card */}
        <div className="md:hidden">
          {(() => {
            const p = plans.find((plan) => plan.key === activeMobilePlan);
            if (!p) return null;
            return <PlanCard plan={p} isPopular={p.key === "pro"} />;
          })()}
        </div>

        <div className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)]">
            Alle Pläne im Detail vergleichen <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 11: Final CTA (Cron "It's about time" pattern) ─── */
/**
 * Last call to action — single emotive serif headline + CTA.
 */
function FinalCta() {
  return (
    <section className="relative">
      <div className="relative mx-auto max-w-[900px] px-5 sm:px-8 py-16 sm:py-32 text-center">
        <h2 className="text-hero text-[var(--color-fg)]">
          Dein nächster Job ist nur einen Klick entfernt.
        </h2>
        <p className="mt-4 sm:mt-6 text-[15px] sm:text-[16px] text-[var(--color-fg-muted)] max-w-[48ch] mx-auto">
          Starte jetzt kostenlos. Keine Kreditkarte, kein Risiko.
        </p>
        <div className="mt-6 sm:mt-9 flex items-center justify-center px-4 sm:px-0">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
          >
            Kostenlos starten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 12: Footer ─── */
/**
 * Compact footer with legal links.
 */
function Footer() {
  const columns = [
    {
      title: "Produkt",
      links: [
        { l: "Funktionen",   to: "#features" },
        { l: "KI-Assistent", to: "#how"      },
        { l: "Preise",       to: "/pricing"  },
        { l: "Anmelden",     to: "/login"    },
      ],
    },
    {
      title: "Konto",
      links: [
        { l: "Registrieren",  to: "/register"        },
        { l: "Passwort vergessen", to: "/forgot-password" },
        { l: "Dashboard",     to: "/dashboard"       },
        { l: "Abmelden",      to: "/unsubscribe"     },
      ],
    },
    {
      title: "Rechtliches",
      links: [
        { l: "AGB",         to: "/terms"     },
        { l: "Datenschutz", to: "/privacy"   },
        { l: "Impressum",   to: "/impressum" },
        { l: "Kontakt",     to: "/contact"   },
      ],
    },
  ];
  return (
    <footer className="relative">
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8 pt-20 pb-10">
        <div className="grid grid-cols-12 gap-8 mb-16">
          {/* Brand column */}
          <div className="col-span-12 md:col-span-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-accent-500)]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)]">JobAssist</span>
            </div>
            <p className="max-w-[36ch] text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
              KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt. Made in Austria.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { l: "X",         href: "#",            Icon: Twitter   },
                { l: "Instagram", href: "#",    Icon: Instagram },
                { l: "YouTube",   href: "#",     Icon: Youtube   },
              ].map(({ l, href, Icon }) => (
                <a
                  key={l}
                  href={href}
                  aria-disabled="true"
                  className="grid place-items-center h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-fg-muted)] hover:text-[var(--color-accent-300)] hover:border-[var(--color-accent-500)]/40 transition-colors"
                  aria-label={l}
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="col-span-12 text-center sm:text-left sm:col-span-4 md:col-span-2 md:col-start-auto">
              <h4 className="text-eyebrow text-[var(--color-fg-dim)] mb-3 sm:mb-4">{col.title}</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.l}>
                    <Link
                      to={link.to}
                      className="text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-accent-300)] transition-colors"
                    >
                      {link.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="grid grid-cols-12 items-center gap-4 mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
          <span className="col-span-12 text-[12px] text-[var(--color-fg-dim)]">
            © {new Date().getFullYear()} JobAssist GmbH · Wien, Österreich
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Public landing page composition.
   Authenticated visitors are forwarded to /dashboard.
   ════════════════════════════════════════════════════════════════════════ */
/**
 * Public marketing landing page shown at `/` for unauthenticated visitors.
 */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-fg)] font-sans">
      {/* Page-level radial glow — sits behind the transparent header so the hero
          purple wash bleeds all the way to the top of the viewport. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,92,255,0.22), transparent 70%)",
        }}
      />
      {/* Page-level radial glow at the bottom — mirrors the top glow so FinalCta
          and Footer share one continuous purple wash. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(124,92,255,0.22), transparent 70%)",
        }}
      />
      <TopNav />
      <Hero />
      <TrustStrip />
      <FadeIn>
        <StatsStrip />
      </FadeIn>
      <FadeIn>
        <ProblemStatement />
      </FadeIn>
      <FadeIn>
        <ResumeShowcase />
      </FadeIn>
      <FadeIn>
        <FeatureGrid3 />
      </FadeIn>
      <FadeIn>
        <PastelSpaces />
      </FadeIn>
      <FadeIn>
        <TwoCardHelp />
      </FadeIn>
      <FadeIn>
        <FeatureGrid6 />
      </FadeIn>
      <FadeIn>
        <BigQuote />
      </FadeIn>
      <FadeIn>
        <Pricing />
      </FadeIn>
      <FinalCta />
      <Footer />
    </div>
  );
}
