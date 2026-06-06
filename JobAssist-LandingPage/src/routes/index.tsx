import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import { EarthGlobe } from "@/components/EarthGlobe";
import {
  ArrowRight,
  Check,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  Search,
  Wallet,
  Send,
  Globe2,
  ShieldCheck,
  Smartphone,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobAssist — Praktikum & Teilzeitjobs in Österreich" },
      {
        name: "description",
        content:
          "Lebenslauf hochladen, passende Jobs in Österreich finden und Bewerbungen in Sekunden abschicken. Mit KV-Gehalts-Check.",
      },
      {
        property: "og:title",
        content: "JobAssist — Praktikum & Teilzeitjobs in Österreich",
      },
      {
        property: "og:description",
        content: "Praktikum, Teilzeit, Samstagsjob. Ohne Stress, mit KV-Check.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://jobassist.at/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://jobassist.at/" }],
  }),
  component: Landing,
});

/* ---------------- DESIGN TOKENS (dark / cosmic) ----------------
   bg:        #09090B
   surface:   white/[0.04] over backdrop-blur, border white/10
   text:      white, zinc-100, zinc-300, zinc-400, zinc-500
   accents:   violet #8B5CF6, indigo #6366F1, sky #3B82F6, lavender #C4B5FD
   gradient:  linear-gradient(96deg,#C4B5FD,#8B5CF6,#7DD3FC,#3B82F6)
----------------------------------------------------------------- */

/** Shared gradient text style — violet → sky blue. */
const GRADIENT_TEXT: React.CSSProperties = {
  backgroundImage: "linear-gradient(96deg, #C4B5FD 0%, #8B5CF6 30%, #7DD3FC 60%, #3B82F6 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Shared glass-morphism card class. */
const GLASS =
  "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_80px_-40px_rgba(139,92,246,0.35)]";

/**
 * Landing
 *
 * Root page component. Composes all landing-page sections in order.
 */
function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090B] font-sans text-zinc-100 antialiased">
      {/* page-wide cosmic ambient that bleeds between sections */}
      <PageAmbient />
      <Nav />
      <main className="relative">
        <Hero />
        <Journey />
        <Features />
        <SecondaryGrid />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}

/* --------------------------- PAGE AMBIENT --------------------------- */

/**
 * PageAmbient
 *
 * Decorative full-page radial gradient blobs and a subtle grid overlay.
 * Purely visual — hidden from assistive technology.
 */
function PageAmbient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* big violet pool top-center */}
      <div
        className="absolute left-1/2 top-[18%] h-[1100px] w-[1400px] -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(139,92,246,0.18), rgba(99,102,241,0.06) 45%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* sky-blue pool mid-right */}
      <div
        className="absolute right-[-10%] top-[55%] h-[800px] w-[900px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.16), rgba(125,211,252,0.05) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* lavender pool bottom-left */}
      <div
        className="absolute bottom-[5%] left-[-12%] h-[800px] w-[900px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(196,181,253,0.12), rgba(139,92,246,0.05) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* subtle grid for depth */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ----------------------------- NAV ----------------------------- */

/** Nav link definition. */
interface NavLink {
  l: string;
  h: string;
}

const NAV_LINKS: NavLink[] = [
  { l: "Funktionen", h: "#funktionen" },
  { l: "Preise", h: "#preise" },
  { l: "Wie funktioniert's", h: "#wie-funktionierts" },
  { l: "FAQ", h: "#faq" },
];

/**
 * Nav
 *
 * Fixed top navigation bar with logo, section links, and CTA buttons.
 */
function Nav() {
  return (
    <div className="fixed inset-x-0 top-5 z-40 px-6">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg text-[12px] font-semibold text-black"
            style={{
              background: "linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)",
              boxShadow: "0 0 24px rgba(139,92,246,0.45)",
            }}
          >
            J
          </span>
          <span className="text-[15px] font-medium tracking-tight text-white">JobAssist</span>
        </a>

        <nav className="hidden md:block">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 backdrop-blur-xl">
            {NAV_LINKS.map((item) => (
              <a
                key={item.l}
                href={item.h}
                className="rounded-full px-4 py-1.5 text-[13.5px] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                {item.l}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="hidden px-3 text-[13.5px] text-zinc-300 transition hover:text-white sm:inline"
          >
            Anmelden
          </a>
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(139,92,246,0.35)] transition hover:border-white/25"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.55) 0%, rgba(76,29,149,0.55) 100%)",
            }}
          >
            Kostenlos starten
          </a>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- HERO ----------------------------- */

/**
 * Hero
 *
 * Full-viewport hero section with animated gradient headline,
 * sub-headline, and the EclipseStage (globe + dashboard mock-up).
 * Keyframes are defined in styles.css.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(139,92,246,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.10), transparent 70%)",
        }}
      />
      <StarField />

      <div className="relative mx-auto max-w-5xl px-6 pb-0 pt-32 text-center md:pt-36">
        <h1
          className="mx-auto mt-12 max-w-5xl bg-clip-text text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-transparent sm:text-6xl lg:text-[84px]"
          style={{
            backgroundImage:
              "linear-gradient(96deg, #C4B5FD 0%, #8B5CF6 30%, #7DD3FC 60%, #3B82F6 100%)",
            backgroundSize: "250% 250%",
            animation: "ja-gradient-shift 6s ease-in-out infinite",
          }}
        >
          Dein Weg in die Arbeitswelt.
        </h1>

        <p className="mx-auto mt-7 max-w-[680px] text-[19px] leading-[1.55] tracking-[-0.01em] text-zinc-300 sm:text-[21px]">
          Wir lesen deinen Lebenslauf. Du bekommst passende Jobs in Österreich — mit echtem
          KV-Gehalt.
        </p>
      </div>

      <EclipseStage />

      <div className="relative h-0">
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/5" />
      </div>
    </section>
  );
}

/* --------------------------- ECLIPSE STAGE --------------------------- */

/**
 * EclipseStage
 *
 * Renders the 3-D globe with orbit rings, horizon bloom, and the
 * MatchInterface dashboard card rising up from the glow.
 */
function EclipseStage() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-[1400px] overflow-hidden">
      {/* Globe + orbit + bloom — fixed height so dashboard can overlap */}
      <div className="relative h-[560px] w-full md:h-[760px]">
        <svg
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2"
          width="1400"
          height="900"
          viewBox="0 0 1400 900"
          fill="none"
        >
          {[280, 380, 480, 600].map((r, i) => (
            <ellipse
              key={r}
              cx="700"
              cy="600"
              rx={r * 1.4}
              ry={r * 0.55}
              stroke="rgba(167,139,250,0.18)"
              strokeWidth="1"
              strokeDasharray="2 6"
              opacity={0.85 - i * 0.15}
            />
          ))}
        </svg>

        {/* Globe */}
        <div className="absolute left-1/2 top-4 aspect-square w-[520px] -translate-x-1/2 md:w-[700px]">
          <div
            aria-hidden
            className="absolute inset-[-12%] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.35), rgba(139,92,246,0.08) 45%, transparent 72%)",
              filter: "blur(36px)",
            }}
          />
          <div
            className="absolute inset-0 overflow-hidden rounded-full drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]"
            style={{ transform: "translateZ(0)" }}
          >
            <EarthGlobe />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: "inset 0 0 80px rgba(59,130,246,0.18), 0 0 140px rgba(59,130,246,0.30)",
            }}
          />
        </div>

        {/* Horizon bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-120px] left-1/2 h-[520px] w-[1200px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(196,181,253,0.85), rgba(139,92,246,0.55) 25%, rgba(139,92,246,0.18) 50%, transparent 75%)",
            filter: "blur(40px)",
          }}
        />
        {/* Tighter inner core of the bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-40px] left-1/2 h-[200px] w-[700px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(237,223,255,0.9), rgba(167,139,250,0.4) 40%, transparent 75%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Dashboard rises up into the bloom */}
      <div className="relative z-10 mx-auto -mt-[420px] max-w-3xl px-6 pb-20 md:-mt-[560px]">
        <div className={`${GLASS} p-1`}>
          <MatchInterface />
        </div>
      </div>
    </div>
  );
}

/* ----------------------- STAR FIELD ----------------------- */

/** Individual star definition. */
interface Star {
  x: number;
  y: number;
  s: number;
  d: number;
}

const STARS: Star[] = [
  { x: 8, y: 18, s: 1, d: 0 },
  { x: 22, y: 9, s: 2, d: 1.2 },
  { x: 38, y: 24, s: 1, d: 2.4 },
  { x: 51, y: 12, s: 1.5, d: 0.6 },
  { x: 64, y: 28, s: 1, d: 1.8 },
  { x: 78, y: 15, s: 2, d: 3 },
  { x: 88, y: 32, s: 1, d: 0.3 },
  { x: 14, y: 42, s: 1, d: 2.1 },
  { x: 30, y: 55, s: 1.5, d: 1.5 },
  { x: 72, y: 50, s: 1, d: 2.7 },
  { x: 92, y: 60, s: 1.5, d: 0.9 },
  { x: 6, y: 65, s: 1, d: 1.1 },
  { x: 46, y: 38, s: 1, d: 3.3 },
  { x: 58, y: 62, s: 1.5, d: 0.4 },
  { x: 82, y: 70, s: 1, d: 2.0 },
];

/**
 * StarField
 *
 * Renders a static set of twinkling star dots over the hero section.
 * Animation is defined in styles.css (`ja-twinkle`).
 */
function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {STARS.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.s}px`,
            height: `${p.s}px`,
            opacity: 0.4,
            animation: `ja-twinkle 4s ease-in-out ${p.d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------- SECTION LABEL ----------------------- */

/**
 * SectionLabel
 *
 * Small pill badge used as a section heading prefix.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-xl">
      <Sparkles className="h-3 w-3" style={{ color: "#C4B5FD" }} />
      {children}
    </div>
  );
}

/* ----------------------- MATCH INTERFACE ----------------------- */

/** Job listing shown in the hero dashboard mock-up. */
interface JobListing {
  id: string;
  title: string;
  company: string;
  city: string;
  hours: string;
  pay: string;
  match: number;
  active?: boolean;
}

const DEMO_JOBS: JobListing[] = [
  {
    id: "spar-wien",
    title: "Samstagsjob Detailhandel",
    company: "SPAR Österreich",
    city: "Wien, 1010",
    hours: "8h / Woche",
    pay: "€ 12,80 / h",
    match: 94,
    active: true,
  },
  {
    id: "runtastic-linz",
    title: "Praktikum Marketing",
    company: "Runtastic",
    city: "Linz",
    hours: "20h / Woche",
    pay: "€ 14,20 / h",
    match: 88,
  },
  {
    id: "dm-graz",
    title: "Ferialjob Lager",
    company: "dm drogerie",
    city: "Graz",
    hours: "Vollzeit",
    pay: "€ 13,40 / h",
    match: 81,
  },
];

/**
 * MatchInterface
 *
 * Dark glass card showing a list of AI-matched job listings.
 * Used as the hero dashboard mock-up.
 */
function MatchInterface() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B0B12]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold text-black"
            style={{ background: "linear-gradient(135deg,#C4B5FD,#8B5CF6)" }}
          >
            J
          </span>
          <span className="text-[12.5px] font-medium tracking-tight text-white">Deine Matches</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#7DD3FC", boxShadow: "0 0 8px #7DD3FC" }}
          />
          Live · 3 neu heute
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {DEMO_JOBS.map((j) => (
          <li
            key={j.id}
            className={`flex items-center gap-4 px-5 py-4 ${j.active ? "bg-white/[0.03]" : ""}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              <Building2 className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium tracking-tight text-white">
                {j.title}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-zinc-400">
                <span>{j.company}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {j.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {j.hours}
                </span>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-medium tabular-nums text-white">{j.pay}</div>
              <div className="text-[11px] text-zinc-500">KV-geprüft</div>
            </div>
            <div className="flex w-14 shrink-0 flex-col items-end">
              <div className="text-[13px] font-medium tabular-nums" style={GRADIENT_TEXT}>
                {j.match}%
              </div>
              <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${j.match}%`,
                    background: "linear-gradient(90deg,#C4B5FD,#8B5CF6,#3B82F6)",
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-5 py-3">
        <span className="inline-flex items-center gap-2 text-[12.5px] text-zinc-300">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#C4B5FD" }} />
          Anschreiben für SPAR fertig
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11.5px] font-medium text-white"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.55) 0%, rgba(76,29,149,0.55) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px rgba(139,92,246,0.35)",
          }}
        >
          Senden <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------- JOURNEY --------------------------- */

/** Step definition for the how-it-works section. */
interface JourneyStep {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    n: "1",
    icon: <Search className="h-4 w-4" />,
    title: "Match",
    body: "Wir lesen deinen Lebenslauf und finden täglich passende Jobs in deiner Stadt.",
  },
  {
    n: "2",
    icon: <Wallet className="h-4 w-4" />,
    title: "Gehalts-Check",
    body: "Jeder Job wird mit dem österreichischen Kollektivvertrag verglichen — brutto, netto, pro Stunde.",
  },
  {
    n: "3",
    icon: <Send className="h-4 w-4" />,
    title: "Express-Bewerbung",
    body: "Anschreiben in Sekunden generieren, einmal prüfen und direkt abschicken.",
  },
];

/**
 * Journey
 *
 * Three-step "how it works" section with a glass card grid.
 */
function Journey() {
  return (
    <section id="wie-funktionierts" className="relative scroll-mt-24">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-16">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <SectionLabel>Wie funktioniert's?</SectionLabel>
            <h2 className="mt-4 max-w-xl text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[40px]">
              Drei Schritte vom Lebenslauf <span style={GRADIENT_TEXT}>zur Bewerbung.</span>
            </h2>
          </div>
          <div className="hidden text-right text-[12.5px] text-zinc-400 md:block">
            Ø 47 Sekunden
            <br />
            <span className="text-white">pro Bewerbung</span>
          </div>
        </div>
        <div className={GLASS}>
          <div className="grid grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {JOURNEY_STEPS.map((s, i) => (
              <div key={s.title} className="relative p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[12px] font-medium tabular-nums text-white">
                    {s.n}
                  </span>
                  <span style={{ color: "#C4B5FD" }}>{s.icon}</span>
                </div>
                <h3 className="mt-5 text-[18px] font-medium tracking-tight text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{s.body}</p>
                {i < JOURNEY_STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full border border-white/15 bg-[#0B0B12] p-1 text-zinc-200 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- FEATURES --------------------------- */

/**
 * Features
 *
 * Two-column feature showcase: WageAdvisor and AIMatch cards.
 */
function Features() {
  return (
    <section id="funktionen" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <SectionLabel>Funktionen</SectionLabel>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            Drei Werkzeuge, die deinen ersten Job <span style={GRADIENT_TEXT}>näher bringen.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <WageAdvisor />
          <AIMatch />
        </div>
      </div>
    </section>
  );
}

/**
 * WageAdvisor
 *
 * Feature card showing the KV salary comparison widget.
 */
function WageAdvisor() {
  return (
    <div className={`${GLASS} p-8`}>
      <h3 className="text-xl font-medium tracking-tight text-white">Gehalts-Check</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-400">
        Jedes Inserat — direkt gegen den österreichischen Kollektivvertrag. Du siehst sofort dein
        faires Brutto und Netto pro Stunde.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">
            Fairer Stundenlohn
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11.5px]"
            style={{ color: "#C4B5FD" }}
          >
            <ShieldCheck className="h-3 w-3" /> KV-geprüft
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span
            className="text-[64px] font-semibold leading-none tracking-[-0.04em]"
            style={GRADIENT_TEXT}
          >
            € 12,80
          </span>
          <span className="text-[13px] text-zinc-400">/ h</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-[12.5px]">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Inserat
            </div>
            <div className="mt-1.5 font-medium tabular-nums text-zinc-200">€ 11,40</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              KV-Minimum
            </div>
            <div className="mt-1.5 font-medium tabular-nums text-zinc-200">€ 12,10</div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              Empfohlen
            </div>
            <div className="mt-1.5 font-medium tabular-nums text-white">€ 12,80</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AIMatch
 *
 * Feature card showing an AI-generated cover letter preview.
 */
function AIMatch() {
  return (
    <div className={`${GLASS} p-8`}>
      <h3 className="text-xl font-medium tracking-tight text-white">AI Anschreiben</h3>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-400">
        Pro Inserat ein eigenes Anschreiben — auf Österreichisch, nicht generisch. Kurz prüfen und
        abschicken.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-5 text-[13.5px] leading-relaxed text-zinc-200">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-[12px] text-zinc-500">
          <Mail className="h-3 w-3" />
          <span>An: bewerbung@spar.at</span>
        </div>

        <p className="mt-3 font-medium text-white">Sehr geehrte Frau Huber,</p>
        <p className="mt-2 text-zinc-400">
          Ihr Inserat für den Samstagsjob bei SPAR passt genau zu meinem Schulalltag. Seit zwei
          Jahren arbeite ich in der Schul-Cafeteria und kenne Kassensystem und Lager aus der Praxis.
        </p>
        <p className="mt-2 text-zinc-400">
          Mit freundlichen Grüßen,
          <br />
          Lisa M.
        </p>
      </div>
    </div>
  );
}

/* ------------------------- SECONDARY GRID ------------------------- */

/** Feature item definition for the secondary grid. */
interface FeatureItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: "jobbörsen",
    icon: <Globe2 className="h-4 w-4" />,
    title: "Alle Jobbörsen",
    body: "ams.at · karriere.at · willhaben.at · stepstone.at — automatisch durchsucht.",
  },
  {
    id: "mobile",
    icon: <Smartphone className="h-4 w-4" />,
    title: "Mobile-first",
    body: "Komplette Bewerbung am Handy, in unter zwei Minuten — auf dem Schulweg fertig.",
  },
  {
    id: "datenschutz",
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Daten in der EU",
    body: "Hosting in Frankfurt. Kein Verkauf, kein Tracking, keine Weitergabe an Recruiter.",
  },
  {
    id: "kv",
    icon: <Wallet className="h-4 w-4" />,
    title: "KV-Datenbank",
    body: "Aktuelle Kollektivverträge für Handel, Gastro, Industrie und IT — Stand 2026.",
  },
  {
    id: "tracker",
    icon: <Send className="h-4 w-4" />,
    title: "Bewerbungs-Tracker",
    body: "Sieh auf einen Blick, welche Bewerbung wo gelesen oder beantwortet wurde.",
  },
  {
    id: "sprache",
    icon: <Sparkles className="h-4 w-4" />,
    title: "Auf Österreichisch",
    body: "AI versteht Matura, BHS, HTL, Lehre — und spricht so, wie hier wirklich geschrieben wird.",
  },
];

/**
 * SecondaryGrid
 *
 * Six-cell feature grid with icon, title, and description per cell.
 */
function SecondaryGrid() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 divide-x divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl md:grid-cols-3">
          {FEATURE_ITEMS.map((it) => (
            <div key={it.id} className="p-8">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"
                style={{ color: "#C4B5FD" }}
              >
                {it.icon}
              </span>
              <h3 className="mt-5 text-[15.5px] font-medium tracking-tight text-white">
                {it.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- PRICING ---------------------------- */

/** Pricing tier definition. */
interface PricingTier {
  id: string;
  name: string;
  price: string;
  cadence: string;
  desc: string;
  cta: string;
  highlight: boolean;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "basic",
    name: "Basic",
    price: "€ 0",
    cadence: "für immer",
    desc: "Zum Reinschnuppern.",
    cta: "Kostenlos starten",
    highlight: false,
    features: ["3 Bewerbungen pro Monat", "Alle Jobbörsen", "Basis Gehalts-Check"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€ 4,99",
    cadence: "/ Monat",
    desc: "Für alle, die wirklich suchen.",
    cta: "Pro wählen",
    highlight: true,
    features: [
      "Unbegrenzte Bewerbungen",
      "AI Anschreiben (DE-AT)",
      "Voller Gehalts-Check",
      "Bewerbungs-Tracker",
    ],
  },
  {
    id: "max",
    name: "Max",
    price: "€ 7,99",
    cadence: "/ Monat",
    desc: "Mit Autopilot. Du suchst, wir bewerben.",
    cta: "Max wählen",
    highlight: false,
    features: ["Alles aus Pro", "Bewerbungs-Autopilot", "Interview-Coach", "Lebenslauf-Review"],
  },
];

/** Inline style for the highlighted Pro card background. */
const PRO_CARD_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(160deg, rgba(139,92,246,0.22) 0%, rgba(59,130,246,0.14) 50%, rgba(15,15,20,0.6) 100%)",
};

/**
 * Pricing
 *
 * Three-tier pricing section with Basic, Pro (highlighted), and Max plans.
 */
function Pricing() {
  return (
    <section id="preise" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <SectionLabel>Preise</SectionLabel>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            Faire Preise. So <span style={GRADIENT_TEXT}>transparent</span> wie der KV.
          </h2>
          <p className="mt-4 text-[15px] text-zinc-400">
            Starte gratis. Upgrade nur, wenn du es wirklich brauchst.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((t) => {
            const isPro = t.highlight;
            const cardCls = isPro
              ? "relative flex h-full flex-col rounded-2xl border border-white/15 p-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-30px_rgba(139,92,246,0.55)]"
              : `${GLASS} flex h-full flex-col p-8`;

            return (
              <div key={t.id} className={cardCls} style={isPro ? PRO_CARD_STYLE : undefined}>
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium tracking-tight text-white">{t.name}</div>
                  {isPro && (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-white">
                      Beliebt
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className="text-4xl font-semibold tracking-[-0.03em]"
                    style={isPro ? GRADIENT_TEXT : { color: "white" }}
                  >
                    {t.price}
                  </span>
                  <span className="text-[13px] text-zinc-400">{t.cadence}</span>
                </div>
                <p className="mt-3 text-[13.5px] text-zinc-400">{t.desc}</p>

                <ul className="mt-6 flex-1 space-y-3 text-[13.5px]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#C4B5FD" }} />
                      <span className="text-zinc-200">{f}</span>
                    </li>
                  ))}
                </ul>

                {isPro ? (
                  <a
                    href="/register?plan=pro"
                    className="mt-8 block w-full rounded-xl border border-white/15 px-5 py-3 text-center text-[14px] font-medium text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(76,29,149,0.7) 100%)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 30px rgba(139,92,246,0.4)",
                    }}
                  >
                    {t.cta}
                  </a>
                ) : (
                  <a
                    href={t.id === "basic" ? "/register" : `/register?plan=${t.id}`}
                    className="mt-8 block w-full rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-center text-[14px] font-medium text-white hover:bg-white/[0.08]"
                  >
                    {t.cta}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ FAQ ------------------------------ */

/** FAQ item definition. */
interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Ist das wirklich kostenlos?",
    a: "Ja. Basic ist und bleibt gratis — 3 Bewerbungen pro Monat, ohne Kreditkarte. Du upgradest nur, wenn du mehr willst.",
  },
  {
    q: "Wie funktioniert der Gehalts-Check?",
    a: "Wir lesen das Inserat, erkennen Branche und Einstufung und vergleichen mit dem aktuellen österreichischen Kollektivvertrag. Du bekommst Brutto, Netto und Stundenlohn — fertig.",
  },
  {
    q: "Was passiert mit meinen Daten?",
    a: "Alles wird in der EU gehostet (Frankfurt). Wir verkaufen nichts und teilen keine Daten mit Recruitern, außer du schickst aktiv eine Bewerbung ab.",
  },
  {
    q: "Dürfen meine Eltern mithelfen?",
    a: "Klar. Du kannst Bewerbungen vor dem Absenden teilen — per Link, ohne dass deine Eltern einen Account brauchen.",
  },
];

/**
 * FAQ
 *
 * Accordion-style frequently asked questions section.
 * Uses local `useState` — no external accordion dependency needed.
 */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            Häufige Fragen.
          </h2>
        </div>
        <ul className="mt-10">
          {FAQ_ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <li key={it.q} className="border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-medium tracking-tight text-white">{it.q}</span>
                  <span
                    className="ml-4 text-[18px] leading-none text-zinc-400 transition-transform"
                    style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="max-w-3xl pb-6 pr-8 text-[14.5px] leading-relaxed text-zinc-400">
                    {it.a}
                  </p>
                )}
              </li>
            );
          })}
          <li className="border-t border-white/10" />
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------- FOOTER ---------------------------- */

/**
 * Footer
 *
 * Site footer with logo, copyright, and legal/contact links.
 */
function Footer() {
  return (
    <footer className="relative border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-6 w-6 place-items-center rounded-md text-[12px] font-semibold text-black"
            style={{ background: "linear-gradient(135deg,#C4B5FD,#8B5CF6)" }}
          >
            J
          </span>
          <span className="text-[13.5px] font-medium tracking-tight text-white">JobAssist</span>
          <span className="ml-2 text-[12px] text-zinc-500">© 2026 · Wien</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-zinc-400">
          <a href="/impressum" className="hover:text-white">
            Impressum
          </a>
          <a href="/datenschutz" className="hover:text-white">
            Datenschutz
          </a>
          <a href="/kontakt" className="hover:text-white">
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}
