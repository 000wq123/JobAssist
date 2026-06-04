import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Target,
  FileText,
  CheckCircle2,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

/* ════════════════════════════════════════════════════════════════════════
   LandingPage v2 — Full dark. Linear × Arc × Stripe composite.
   Electric violet accent. No gradients on interactive elements.
   ════════════════════════════════════════════════════════════════════════ */

/* ─── Deterministic PRNG for starfield ─────────────────────────────── */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic star positions.
 * @param {number} count
 * @param {number} seed
 */
function generateStars(count, seed = 42) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.floor(rand() * 100),
    top: Math.floor(rand() * 100),
    size: rand() < 0.7 ? 1 : 1.5,
    opacity: 0.06 + rand() * 0.18,
    delay: +(rand() * 6).toFixed(2),
    duration: +(3 + rand() * 5).toFixed(2),
  }));
}

/* ─── Top navigation ────────────────────────────────────────────────── */
/**
 * Sticky top nav. Logo left, links center, CTA right.
 */
function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-[#0C0C10]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-4 px-5 py-3.5 sm:px-8">
        {/* Logo */}
        <Link to="/" className="col-span-6 md:col-span-3 flex items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-[#6152F3]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[#EEEEF2]">
            JobAssist
          </span>
        </Link>

        {/* Center links */}
        <nav className="col-span-6 hidden md:flex md:col-span-6 items-center justify-center gap-7 text-[13.5px] text-[#6B6B78]">
          <a href="#features" className="hover:text-[#A0A0AB] transition-colors duration-150">
            Funktionen
          </a>
          <Link to="/pricing" className="hover:text-[#A0A0AB] transition-colors duration-150">
            Preise
          </Link>
        </nav>

        {/* Right CTAs */}
        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-[13px] font-medium text-[#6B6B78] hover:text-[#A0A0AB] transition-colors duration-150"
          >
            Anmelden
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#6152F3] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#7C6BFF] transition-colors duration-150 glow-cta"
          >
            Kostenlos starten
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Starfield ─────────────────────────────────────────────────────── */
/**
 * Subtle twinkling stars scattered across the hero background.
 */
function Starfield() {
  const stars = useMemo(() => generateStars(90), []);
  return (
    <div aria-hidden="true" className="pointer-events-none overflow-hidden" style={{ position: "absolute", inset: 0 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            backgroundColor: `rgba(255,255,255,${s.opacity})`,
            ["--twinkle-dur"]: `${s.duration}s`,
            ["--twinkle-del"]: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Product preview ───────────────────────────────────────────────── */
/**
 * Simplified dark-mode app UI preview embedded in the hero.
 */
function ProductPreview() {
  const jobs = [
    { c: "Billa", r: "Praktikant Marketing", l: "Wien", s: 94, color: "#34D399" },
    { c: "Hofer", r: "Werkstudent Marketing", l: "Wien", s: 87, color: "#FBBF24" },
    { c: "Spar",  r: "Aushilfe Verkauf",      l: "Graz", s: 82, color: "#60A5FA" },
  ];

  return (
    <div className="mx-auto max-w-[820px]">
      {/* Status strip */}
      <div
        className="grid grid-cols-5 rounded-t-xl border border-white/[0.07] border-b-0 overflow-hidden"
        style={{ background: "#111116" }}
      >
        {[
          { label: "Bewerben",          count: 3 },
          { label: "Antwort ausständig", count: 2 },
          { label: "Gespräch",          count: 1 },
          { label: "Angebot",           count: 0 },
          { label: "Erledigt",          count: 1 },
        ].map((b) => (
          <div
            key={b.label}
            className="px-2 py-3 sm:px-4 sm:py-4 text-left border-r border-white/[0.05] last:border-r-0"
          >
            <p
              className="text-[18px] sm:text-[22px] tabular-nums leading-none font-semibold"
              style={{ color: b.count > 0 ? "#EEEEF2" : "#44444F" }}
            >
              {b.count}
            </p>
            <p className="mt-1.5 text-[9px] sm:text-[10.5px] truncate" style={{ color: "#6B6B78" }}>
              {b.label}
            </p>
          </div>
        ))}
      </div>

      {/* Job rows */}
      <div
        className="rounded-b-xl border border-white/[0.07] border-t-0 p-3 sm:p-4 space-y-2"
        style={{ background: "#0C0C10" }}
      >
        {jobs.map((j) => (
          <div
            key={j.c + j.r}
            className="flex items-center gap-3 rounded-lg border border-white/[0.05] px-3 py-2.5"
            style={{ background: "#111116" }}
          >
            <div
              className="h-8 w-8 rounded-md grid place-items-center text-[10px] font-bold shrink-0"
              style={{ background: "rgba(97,82,243,0.15)", color: "#9D8FFF" }}
            >
              {j.c[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#EEEEF2] truncate">{j.r}</p>
              <p className="text-[11px] text-[#6B6B78]">{j.c} · {j.l}</p>
            </div>
            <span
              className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md shrink-0"
              style={{
                background: `${j.color}18`,
                color: j.color,
                border: `1px solid ${j.color}30`,
              }}
            >
              {j.s}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────── */
/**
 * Centered hero with ambient depth and embedded product UI.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow — top center */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(97,82,243,0.12), transparent 60%), " +
            "radial-gradient(ellipse 40% 30% at 75% 20%, rgba(97,82,243,0.06), transparent 50%)",
        }}
      />
      {/* Starfield */}
      <Starfield />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 pt-20 pb-8 sm:px-8 sm:pt-28 sm:pb-10 md:pt-40">
        <div className="col-span-12 flex flex-col items-center text-center">

          {/* Eyebrow pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-[#A0A0AB]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            KI-Bewerbungsassistent · Made in Austria
          </div>

          {/* Headline */}
          <h1
            className="text-[#EEEEF2] max-w-[16ch] font-bold"
            style={{
              fontSize: "clamp(2.8rem, 7.5vw, 6rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
            }}
          >
            Bewerben,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #9D8FFF 0%, #6152F3 60%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ohne Panik.
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-6 sm:mt-7 max-w-[44ch] text-[15px] sm:text-[16px] leading-relaxed text-[#6B6B78]">
            Lebenslauf hochladen. Passende Stellen finden. Bewerbung senden.
            Alles an einem Ort — für Schüler, Studenten und Berufseinsteiger.
          </p>

          {/* CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#6152F3] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#7C6BFF] transition-colors duration-150 glow-cta"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-[14px] font-medium text-[#A0A0AB] hover:bg-white/[0.07] hover:text-[#EEEEF2] transition-colors duration-150"
            >
              Anmelden
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11.5px] text-[#44444F]">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              DSGVO-konform
            </span>
            <span className="h-3 w-px bg-white/[0.08]" aria-hidden="true" />
            <span>Keine Kreditkarte</span>
            <span className="h-3 w-px bg-white/[0.08]" aria-hidden="true" />
            <span>Kostenlos starten</span>
          </div>
        </div>

        {/* Product preview — fades into background */}
        <div
          className="col-span-12 mt-14 sm:mt-20"
          style={{
            maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
          }}
        >
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────────── */
/**
 * Three feature cards with icons, titles, and descriptions.
 */
function Features() {
  const features = [
    {
      icon: FileText,
      color: "#9D8FFF",
      bg: "rgba(97,82,243,0.12)",
      title: "Lebenslauf hochladen",
      desc: "Die KI liest deinen Lebenslauf und extrahiert Skills, Erfahrungen und Stärken — automatisch.",
    },
    {
      icon: Target,
      color: "#34D399",
      bg: "rgba(52,211,153,0.12)",
      title: "Passende Stellen finden",
      desc: "Jobs mit Match-Score, gefiltert nach deinem Profil und Standort. Kein manuelles Suchen mehr.",
    },
    {
      icon: Zap,
      color: "#FBBF24",
      bg: "rgba(251,191,36,0.12)",
      title: "Bewerbung senden",
      desc: "Personalisiertes Anschreiben in Sekunden. Direkt aus der App — ready to send.",
    },
  ];

  return (
    <section id="features" style={{ background: "#0C0C10" }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">

        {/* Section header */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#44444F] mb-3">
            So funktioniert es
          </p>
          <h2
            className="text-[#EEEEF2] font-semibold max-w-[20ch] mx-auto"
            style={{
              fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Drei Schritte. Ein Job.
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/[0.06] p-6 sm:p-7 flex flex-col gap-4"
              style={{ background: "#111116" }}
            >
              <div
                className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: f.bg }}
              >
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#EEEEF2] mb-2">{f.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-[#6B6B78]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof strip */}
        <div
          className="mt-12 sm:mt-16 rounded-xl border border-white/[0.06] px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x sm:divide-white/[0.06]"
          style={{ background: "#111116" }}
        >
          {[
            { stat: "< 60s", label: "Anschreiben erstellen" },
            { stat: "100%", label: "DSGVO-konform" },
            { stat: "Gratis", label: "Kostenlos starten" },
          ].map((item) => (
            <div key={item.stat} className="text-center sm:px-6">
              <p
                className="text-[28px] font-bold tabular-nums"
                style={{
                  background: "linear-gradient(135deg, #9D8FFF 0%, #6152F3 60%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {item.stat}
              </p>
              <p className="mt-1 text-[12.5px] text-[#6B6B78]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────────────── */
/**
 * Bottom CTA section with ambient glow.
 */
function FinalCta() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#0C0C10" }}>
      {/* Bottom ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(97,82,243,0.12), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[860px] px-5 sm:px-8 py-24 sm:py-36 text-center">

        {/* Checklist */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
          {["Kostenlos starten", "Kein Abo nötig", "Jederzeit kündbar"].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-[12.5px] text-[#6B6B78]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
              {item}
            </span>
          ))}
        </div>

        <h2
          className="text-[#EEEEF2] font-bold"
          style={{
            fontSize: "clamp(2.4rem, 6.5vw, 5rem)",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
          }}
        >
          Dein Job wartet.
        </h2>
        <p className="mt-5 sm:mt-6 text-[15px] sm:text-[16px] text-[#6B6B78] max-w-[36ch] mx-auto">
          Starte jetzt — kostenlos, ohne Kreditkarte.
        </p>
        <div className="mt-8 sm:mt-10 flex items-center justify-center px-4 sm:px-0">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#6152F3] px-8 py-3.5 text-[14px] font-semibold text-white hover:bg-[#7C6BFF] transition-colors duration-150 glow-cta"
          >
            Kostenlos starten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────── */
/**
 * Minimal footer with brand, links, and legal.
 */
function Footer() {
  const columns = [
    {
      title: "Produkt",
      links: [
        { label: "Funktionen", to: "#features" },
        { label: "Preise", to: "/pricing" },
      ],
    },
    {
      title: "Konto",
      links: [
        { label: "Anmelden", to: "/login" },
        { label: "Registrieren", to: "/register" },
        { label: "Hilfe", to: "/contact" },
      ],
    },
    {
      title: "Rechtliches",
      links: [
        { label: "Datenschutz", to: "/privacy" },
        { label: "Impressum", to: "/impressum" },
        { label: "AGB", to: "/terms" },
        { label: "Kontakt", to: "/contact" },
      ],
    },
  ];

  return (
    <footer
      className="border-t border-white/[0.05]"
      style={{ background: "#0C0C10" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-14 pb-10 sm:pt-18 sm:pb-12">
        <div className="grid grid-cols-12 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-12 sm:col-span-5 md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[#6152F3]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[16px] font-semibold tracking-tight text-[#EEEEF2]">
                JobAssist
              </span>
            </div>
            <p className="max-w-[32ch] text-[13px] leading-relaxed text-[#44444F]">
              KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt.
              Für Schüler, Studenten und Berufseinsteiger.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="col-span-6 sm:col-span-3 md:col-span-2">
              <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#44444F] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[13px] text-[#6B6B78] hover:text-[#A0A0AB] transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-white/[0.05]">
          <span className="text-[11.5px] text-[#44444F]">
            &copy; {new Date().getFullYear()} JobAssist
          </span>
          <span className="text-[11.5px] text-[#44444F]">
            Made in Austria 🇦🇹
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Page composition
   ════════════════════════════════════════════════════════════════════════ */
/**
 * Public marketing landing page shown at `/` for unauthenticated visitors.
 * Authenticated visitors are forwarded to /dashboard.
 */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen overflow-x-clip font-sans" style={{ background: "#0C0C10", color: "#EEEEF2" }}>
      <TopNav />
      <Hero />
      <Features />
      <FinalCta />
      <Footer />
    </div>
  );
}
