import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Sparkles, Briefcase, FileText, Bell, Wand2,
  MessageSquare, Target, Search, TrendingUp, Shield, Zap, Globe, CheckCircle2,
  ChevronRight, Star, Quote, Twitter, Instagram, Youtube,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";
import { billingApi } from "../services/api";

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
          <a href="#faq" className="hover:text-[var(--color-fg)] transition-colors">FAQ</a>
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
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 pt-20 pb-12 sm:px-8 sm:pt-28 md:pt-32">
        <div className="col-span-12 flex flex-col items-center text-center">
          <Link to="/pricing" className="pill-banner mb-8">
            <span className="grid place-items-center h-5 w-5 rounded-full bg-[var(--color-accent-500)] text-white">
              <Sparkles className="h-3 w-3" />
            </span>
            <span>Neu: 7-Tage-Pro-Trial gratis</span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--color-fg-muted)]" />
          </Link>

          <h1 className="text-hero text-[var(--color-fg)] max-w-[14ch]">
            <span className="font-display italic text-[var(--color-accent-300)]">Bewerben.</span>{" "}
            Klar. Schnell. Mit KI.
          </h1>

          <p className="mt-6 max-w-[58ch] text-[16px] sm:text-[17px] leading-relaxed text-[var(--color-fg-muted)]">
            Lade deinen Lebenslauf hoch, finde passende Stellen in ganz Österreich und lass die KI
            Anschreiben, Match-Scores und Interview-Fragen für dich erledigen.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-5 py-3 text-[14px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
            >
              So funktioniert&apos;s
            </a>
          </div>

          <p className="mt-4 text-[12px] text-[var(--color-fg-dim)]">
            Keine Kreditkarte erforderlich · DSGVO-konform · Made in Austria
          </p>
        </div>

        <div className="col-span-12 mt-12 sm:mt-16">
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
    { c: "Siemens AG",   r: "Software Engineer",  s: 91 },
    { c: "ÖBB",          r: "Data Analyst",       s: 78 },
    { c: "AVL List",     r: "DevOps Engineer",    s: 64 },
    { c: "Red Bull",     r: "Product Manager",    s: 71 },
  ];
  return (
    <div className="browser-mockup mx-auto max-w-[1080px]">
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
              Guten Morgen, Davor
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

/* ─── Section 2: Press / customer logo strip (Plain pattern) ─── */
/**
 * Marquee strip of "as seen in" / customer logos.
 */
function LogoStrip() {
  const items = [
    "Siemens", "ÖBB", "Red Bull", "AVL List", "Erste Bank", "Bosch",
    "voestalpine", "Magna", "Wienerberger", "OMV", "A1 Telekom",
    "Andritz", "Raiffeisen", "Spar", "BAWAG", "Verbund", "STRABAG",
    "Mondi", "Lenzing", "Borealis", "KTM", "Doppelmayr", "Palfinger",
    "FACC", "Frequentis", "Infineon", "Egger", "Kapsch",
  ];
  // Duplicate for seamless loop
  const looped = [...items, ...items];
  return (
    <section className="border-y border-[var(--color-border-subtle)] py-10 overflow-hidden">
      <p className="text-center text-eyebrow text-[var(--color-fg-dim)] mb-6">
        Bewerber bei führenden Unternehmen in Österreich
      </p>
      <div className="logo-strip whitespace-nowrap">
        {looped.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="text-[18px] font-semibold tracking-tight text-[var(--color-fg-faint)] hover:text-[var(--color-fg-muted)] transition-colors"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── Section 3: Problem statement (Plain "Tools add distance" pattern) ─── */
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

/**
 * Headline with inline icon pills illustrating the chaos JobAssist replaces.
 */
function ProblemStatement() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-10 md:col-start-2 text-center">
          <h2 className="text-display text-[var(--color-fg)] leading-[1.1]">
            Bewerben heißt jonglieren mit{" "}
            <span className="inline-flex items-center gap-2 align-middle mx-2">
              <CompetitorLogo
                slug="linkedin"
                name="LinkedIn"
                color="#0A66C2"
              />
              <CompetitorLogo
                slug="indeed"
                name="Indeed"
                color="#003A9B"
              />
              <CompetitorLogo
                src="/logos/logo.svg"
                name="StepStone"
                color="#00217A"
                crop
              />
              <CompetitorLogo
                src="https://icon.horse/icon/karriere.at"
                name="karriere.at"
                bare
              />
              <CompetitorLogo
                slug="xing"
                name="Xing"
                color="#006567"
              />
            </span>
            <br />Werkzeugen.
          </h2>
          <p className="mt-6 max-w-[55ch] mx-auto text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
            Du wechselst zwischen Jobbörsen, Word-Dokumenten, Notizen und Mail —
            verlierst Überblick und Zeit. <strong className="text-[var(--color-fg)]">Es geht auch anders.</strong>
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
            <p className="text-eyebrow text-[var(--color-accent-300)] mb-3">Lebenslauf</p>
            <h2 className="text-display text-[var(--color-fg)]">
              Dein CV, optimiert für jede Stelle.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
              Lade dein PDF hoch — die KI extrahiert Skills, bewertet Stärken und Lücken,
              und schlägt konkrete Verbesserungen pro Stelle vor.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
            >
              Lebenslauf hochladen <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-3 self-end">
            {[
              { l: "Match-Genauigkeit",  v: "94%" },
              { l: "Bewertungszeit",   v: "8s"  },
              { l: "Skills extrahiert",  v: "47"  },
              { l: "Sprachen",           v: "DE/EN" },
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
    { l: "TypeScript",  v: 92, c: "var(--color-accent-500)" },
    { l: "React",       v: 88, c: "var(--color-accent-400)" },
    { l: "Python",      v: 76, c: "var(--color-success)" },
    { l: "AWS",         v: 64, c: "var(--color-warning)" },
    { l: "PostgreSQL",  v: 58, c: "var(--color-info)" },
  ];
  return (
    <div className="browser-mockup">
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
                <span className="col-span-3 text-[12px] text-[var(--color-fg-muted)]">{s.l}</span>
                <div className="col-span-8 h-1.5 rounded-full bg-[var(--color-bg-elev-2)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: s.c }} />
                </div>
                <span className="col-span-1 text-right text-[11px] font-semibold tabular-nums text-[var(--color-fg)]">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 p-5 sm:p-6 bg-[var(--color-bg-elev-1)]">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">KI-Vorschläge</p>
          <div className="space-y-3">
            {[
              "Ergänze Cloud-Zertifikate (AWS/Azure) — 73% deiner Zielstellen verlangen sie.",
              "Quantifiziere drei Erfolge im aktuellen Job mit konkreten Zahlen.",
              "Verkürze Berufserfahrung vor 2018 auf 2 Zeilen pro Position.",
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
        <h2 className="text-display text-[var(--color-fg)] max-w-[20ch] mx-auto">
          Alles, was du für deine Bewerbung brauchst.
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {FEATURE_CARDS.map(({ icon: Icon, title, desc, visual }) => (
          <div
            key={title}
            className="col-span-12 md:col-span-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 flex flex-col"
          >
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 mb-5 min-h-[180px] grid place-items-center">
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
          <p className="mt-1 text-[44px] font-bold tabular-nums text-[var(--color-accent-300)]">91<span className="text-[20px] text-[var(--color-fg-dim)]">%</span></p>
          <p className="text-[11px] text-[var(--color-fg-muted)]">Software Engineer · Siemens AG</p>
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
          <span className="text-[11px] text-[var(--color-fg-muted)]">Erstellt in 8 Sekunden</span>
        </div>
      </div>
    );
  }
  // interview
  return (
    <div className="grid grid-cols-12 gap-2 w-full">
      {[
        "Erzähl mir von einem schwierigen Projekt.",
        "Wie gehst du mit Konflikten um?",
        "Warum gerade diese Stelle?",
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
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Eine App. Jede Phase.</p>
          <h2 className="text-display text-[var(--color-fg)] max-w-[20ch] mx-auto">
            <span className="text-[var(--color-accent-700)]">Raum</span> für jede Phase deiner Suche.
          </h2>
          <p className="mt-5 max-w-[58ch] mx-auto text-[16px] leading-relaxed text-[var(--color-fg-muted)]">
            Von der ersten Recherche bis zur Vertragsunterschrift — alles an einem Ort,
            ohne Tabs, ohne verlorene Notizen.
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
    { c: "Siemens AG",     r: "Software Engineer", l: "Wien", s: 91, status: "Beworben" },
    { c: "ÖBB",            r: "Data Analyst",      l: "Wien", s: 78, status: "Interview" },
    { c: "AVL List",       r: "DevOps Engineer",   l: "Graz", s: 64, status: "Entwurf"   },
    { c: "Red Bull",       r: "Product Manager",   l: "Salzburg", s: 71, status: "Beworben" },
    { c: "voestalpine",    r: "Data Engineer",     l: "Linz", s: 82, status: "Interview" },
  ];
  return (
    <div className="browser-mockup max-w-[1080px] mx-auto">
      <div className="bg-[var(--color-bg)]">
        <div className="grid grid-cols-12 items-center gap-3 px-5 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="col-span-6 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[var(--color-fg-dim)]" />
            <span className="text-[12px] text-[var(--color-fg-muted)]">Software Engineer · Wien · Vollzeit</span>
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
        <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Wie JobAssist hilft</p>
        <h2 className="text-display text-[var(--color-fg)]">
          Bevor du klickst. Während du schreibst.
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div
          className="col-span-12 md:col-span-6 rounded-2xl border border-[var(--color-border)] p-7 flex flex-col"
          style={{ background: "linear-gradient(180deg, rgba(124,92,255,0.18) 0%, rgba(124,92,255,0.04) 100%)" }}
        >
          <p className="text-[14px] font-semibold text-[var(--color-fg)] mb-2">
            JobAssist <span className="rounded-md bg-[var(--color-accent-500)]/30 px-1.5 py-0.5 text-[var(--color-accent-200)]">liest</span> die Stelle für dich
          </p>
          <p className="text-[13px] text-[var(--color-fg-muted)] mb-6">
            Die KI extrahiert Anforderungen, Skills und Soft-Cues — und gleicht sie sofort mit deinem Profil ab.
          </p>
          <div className="mt-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] p-4">
            <div className="flex flex-wrap gap-1.5">
              {["Python", "AWS", "Scrum", "Englisch", "5+ Jahre"].map((tag) => (
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
            Wenn du Hilfe brauchst, <span className="font-display italic text-[var(--color-accent-300)]">assistiert</span> die KI sofort
          </p>
          <p className="text-[13px] text-[var(--color-fg-muted)] mb-6">
            Frag die KI direkt im Editor — Anschreiben verbessern, Lücke erklären, Argumente schärfen.
          </p>
          <div className="mt-auto space-y-2">
            {[
              { q: "Wie hebe ich meine Cloud-Erfahrung hervor?", a: "Antwort generiert" },
              { q: "Anschreiben formeller umschreiben",          a: "3 Varianten" },
              { q: "Lücke 2022 erklären",                        a: "Vorschlag bereit" },
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
  { icon: Briefcase,    cat: "Pipeline",     title: "Bewerbungs-Tracker",
    desc: "Behalte den Überblick über jede Bewerbung — Status, Deadlines, Notizen." },
  { icon: Wand2,        cat: "KI-Assistent", title: "Lebenslauf-Anpassung",
    desc: "Die KI passt deinen Lebenslauf auf die Stellenanzeige an — konkret und nachvollziehbar." },
  { icon: Bell,         cat: "Alerts",       title: "Job-Alerts",
    desc: "Tägliche oder wöchentliche Mails mit den passendsten Stellen — kuratiert, ohne Spam." },
  { icon: Globe,        cat: "Recherche",    title: "Firmen-Insights",
    desc: "Werte, Größe, Kultur — die KI fasst alles zusammen, was du vor dem Gespräch wissen musst." },
  { icon: Shield,       cat: "Privatsphäre", title: "DSGVO & EU AI Act",
    desc: "Daten in der EU, jederzeit löschbar. Compliance-by-default, ohne Tracking-Theater." },
  { icon: Zap,          cat: "Export",       title: "Deine Daten, dein Format",
    desc: "Exportiere deinen Lebenslauf als PDF. Dein Profil gehört dir — jederzeit löschbar." },
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
            Alles, was eine moderne Job-Suche braucht.
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

/* ─── Section 9: Big quote (Arc press-strip pattern, but full-bleed) ─── */
/**
 * One large testimonial — single voice, big quote.
 */
function BigQuote() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
      <div className="grid grid-cols-12">
        <div className="col-span-12 md:col-span-10 md:col-start-2">
          <Quote className="h-10 w-10 text-[var(--color-accent-500)]/40 mb-6" />
          <blockquote className="text-section font-display italic text-[var(--color-fg)] leading-[1.2]">
            &ldquo;Die KI hat meinen Lebenslauf in 8 Sekunden besser verstanden als die letzten drei Recruiter zusammen.
            Innerhalb von drei Wochen hatte ich zwei Vorstellungsgespräche.&rdquo;
          </blockquote>
          <div className="mt-8 grid grid-cols-12 items-center gap-3">
            <div className="col-span-1 h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-accent-500)] to-[var(--color-accent-700)] grid place-items-center text-white font-semibold">SM</div>
            <div className="col-span-11">
              <p className="text-[14px] font-semibold text-[var(--color-fg)]">Sarah M.</p>
              <p className="text-[12px] text-[var(--color-fg-dim)]">Software Engineer · Wien</p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-[var(--color-warning)] text-[var(--color-warning)]" />
            ))}
            <span className="ml-2 text-[12px] text-[var(--color-fg-dim)]">4.8/5 · Google Play</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section 10: Pricing teaser (Cron pattern — 3 plans + final CTA) ─── */

const LIMIT_LABELS = {
  cv_analysis: (v) => (v === -1 ? "Unbegrenzt Lebenslauf-Analysen" : `${v} Lebenslauf-Analysen / Monat`),
  cover_letter: (v) => (v === -1 ? "Unbegrenzt Anschreiben" : `${v} Anschreiben / Monat`),
  job_alerts: (v) => (v === -1 ? "Unbegrenzt Job-Alerts" : `${v} Job-Alerts`),
  ai_chat: (v) => (v === -1 ? "Unbegrenzt KI-Nachrichten" : `${v} KI-Nachrichten / Monat`),
  job_search: (v) => (v === -1 ? "Unbegrenzt Jobsuche" : `${v} Jobsuche / Tag`),
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
function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    billingApi.plans()
      .then((res) => {
        // Landing page only shows basic/pro/max (not enterprise)
        const order = ["basic", "pro", "max"];
        const ordered = order
          .map((k) => res.data.find((p) => p.key === k))
          .filter(Boolean);
        setPlans(ordered);
      })
      .catch(() => {
        // Graceful fallback: render nothing if the API is unavailable
        setPlans([]);
      });
  }, []);

  if (!plans.length) return null;

  return (
    <section
      id="faq"
      className="border-t border-[var(--color-border-subtle)]"
      style={{ background: "var(--color-bg-elev-1)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-14">
          <p className="text-eyebrow text-[var(--color-fg-dim)] mb-3">Preise</p>
          <h2 className="text-display text-[var(--color-fg)] max-w-[22ch] mx-auto">
            Starte kostenlos. Upgrade, wenn du mehr willst.
          </h2>
        </div>
        <div className="grid grid-cols-12 gap-4">
          {plans.map((p) => {
            const price = formatPrice(p.price);
            const features = buildFeatures(p);
            const isPopular = p.key === "pro";
            const cta = isPopular ? "Pro 7 Tage testen" : p.key === "max" ? "Max wählen" : "Kostenlos starten";
            return (
              <div
                key={p.key}
                className={`col-span-12 md:col-span-4 rounded-2xl border p-7 flex flex-col ${
                  isPopular
                    ? "border-[var(--color-accent-400)] bg-[var(--color-bg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)]"
                }`}
              >
                {isPopular && (
                  <span className="self-start mb-3 inline-flex rounded-full bg-[var(--color-accent-500)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-300)]">
                    Beliebt
                  </span>
                )}
                <h3 className="text-[16px] font-semibold text-[var(--color-fg)]">{p.name}</h3>
                <p className="text-[13px] text-[var(--color-fg-muted)]">
                  {p.key === "basic" ? "Zum Ausprobieren" : p.key === "pro" ? "Für aktive Bewerber" : "Ohne Limits"}
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
          })}
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
      <div className="relative mx-auto max-w-[900px] px-5 sm:px-8 py-32 text-center">
        <h2 className="text-hero text-[var(--color-fg)]">
          Es ist Zeit.
        </h2>
        <p className="mt-6 text-[16px] text-[var(--color-fg-muted)] max-w-[48ch] mx-auto">
          Erstelle in 30 Sekunden ein kostenloses Konto. Keine Kreditkarte erforderlich.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
          >
            Kostenlos starten
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-6 py-3 text-[14px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
          >
            Ich habe bereits ein Konto
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
              KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt.{" "}
              <span className="font-display italic text-[var(--color-accent-300)]">Made in Austria.</span>
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { l: "X",         href: "https://x.com/jobassist",            Icon: Twitter   },
                { l: "Instagram", href: "https://instagram.com/jobassist",    Icon: Instagram },
                { l: "YouTube",   href: "https://youtube.com/@jobassist",     Icon: Youtube   },
              ].map(({ l, href, Icon }) => (
                <a
                  key={l}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
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
            <div key={col.title} className="col-span-6 md:col-span-2 md:col-start-auto">
              <h4 className="text-eyebrow text-[var(--color-fg-dim)] mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
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
      <LogoStrip />
      <ProblemStatement />
      <ResumeShowcase />
      <FeatureGrid3 />
      <PastelSpaces />
      <TwoCardHelp />
      <FeatureGrid6 />
      <BigQuote />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}
