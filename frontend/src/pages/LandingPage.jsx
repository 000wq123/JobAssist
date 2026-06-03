import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Shield,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

/* ════════════════════════════════════════════════════════════════════════
   Landing page — Linear + Arc + Raycast + Cron composite.
   Dark, crafted, product-forward.
   ════════════════════════════════════════════════════════════════════════ */

/* ─── Deterministic PRNG (seeded) for starfield positions ──────────── */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic star positions so SSR/hydration never mismatches.
 * @param {number} count
 * @param {number} seed
 */
function generateStars(count, seed = 42) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.floor(rand() * 100),
    top: Math.floor(rand() * 100),
    size: rand() < 0.65 ? 1 : 2,
    opacity: 0.08 + rand() * 0.22,
    delay: +(rand() * 6).toFixed(2),
    duration: +(3 + rand() * 4).toFixed(2),
  }));
}

/* ─── Top navigation (glassmorphism, Linear style) ─────────────────── */
/**
 * Sticky top nav. Logo left, centered links, sign-in + CTA right.
 */
function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl backdrop-saturate-150 border-b border-white/[0.06]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-4 px-5 py-3 sm:px-8">
        <Link to="/" className="col-span-6 md:col-span-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7c7df0]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#ECECEF]">
            JobAssist
          </span>
        </Link>
        <nav className="col-span-6 hidden md:flex md:col-span-6 items-center justify-center gap-8 text-[14px] text-[#71717A]">
          <a href="#features" className="hover:text-[#ECECEF] transition-colors">
            Funktionen
          </a>
          <Link to="/pricing" className="hover:text-[#ECECEF] transition-colors">
            Preise
          </Link>
        </nav>
        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex rounded-lg px-3 py-2 text-[13px] font-medium text-[#71717A] hover:text-[#ECECEF] transition-colors"
          >
            Anmelden
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7c7df0] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#a5b4fc] glow-cta"
          >
            Kostenlos starten
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Starfield (Linear pattern) ──────────────────────────────────── */
/**
 * ~80 twinkling stars scattered across the hero background.
 */
function Starfield() {
  const stars = useMemo(() => generateStars(80), []);
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
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

/* ─── Product preview (simplified actual app UI) ────────────────────── */
/**
 * A simplified dark-mode Dashboard preview embedded in the hero.
 * Uses the real app's surface colors and layout patterns.
 */
function ProductPreview() {
  const jobs = [
    { c: "Billa", r: "Praktikant Marketing", l: "Wien", s: 94, badge: "bg-[#4ade80]/15 text-[#4ade80]" },
    { c: "Hofer", r: "Werkstudent Marketing", l: "Wien", s: 87, badge: "bg-[#fbbf24]/15 text-[#fbbf24]" },
    { c: "Spar", r: "Aushilfe Verkauf", l: "Graz", s: 82, badge: "bg-[#60a5fa]/15 text-[#60a5fa]" },
  ];

  return (
    <div className="mx-auto max-w-[880px]">
      {/* Status strip (actual app pattern) */}
      <div className="grid grid-cols-5 rounded-t-xl border border-white/[0.08] border-b-0 overflow-hidden" style={{ background: "#131318" }}>
        {[
          { label: "Bewerben", count: 3 },
          { label: "Antwort ausständig", count: 2 },
          { label: "Gespräch", count: 1 },
          { label: "Angebot", count: 0 },
          { label: "Erledigt", count: 1 },
        ].map((b) => (
          <div key={b.label} className="px-2 py-3 sm:px-4 sm:py-4 text-left border-r border-white/[0.06] last:border-r-0">
            <p className="text-[18px] sm:text-[24px] tabular-nums leading-none font-semibold" style={{ color: b.count > 0 ? "#ECECEF" : "#52525B" }}>
              {b.count}
            </p>
            <p className="mt-2 text-[9px] sm:text-[11px] truncate" style={{ color: "#71717A" }}>
              {b.label}
            </p>
          </div>
        ))}
      </div>

      {/* Job rows */}
      <div className="rounded-b-xl border border-white/[0.08] border-t-0 p-3 sm:p-4 space-y-2" style={{ background: "#111113" }}>
        {jobs.map((j) => (
          <div
            key={j.c + j.r}
            className="flex items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2.5"
            style={{ background: "#18181B" }}
          >
            <div className="h-8 w-8 rounded-md grid place-items-center text-[10px] font-bold shrink-0" style={{ background: "rgba(124,125,240,0.15)", color: "#a5b4fc" }}>
              {j.c[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#ECECEF] truncate">{j.r}</p>
              <p className="text-[11px] text-[#71717A]">{j.c} · {j.l}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${j.badge}`}>{j.s}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero (Raycast spotlight + Arc glow + Cron confidence) ─────── */
/**
 * Centered hero with layered ambient depth and embedded product UI.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layer 1: Arc-style purple ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 10%, rgba(124,92,255,0.10), transparent 55%), radial-gradient(ellipse 50% 40% at 70% 30%, rgba(124,92,255,0.06), transparent 50%)",
        }}
      />
      {/* Layer 2: Raycast-style spotlight focal point */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle 35% at 50% 35%, rgba(165,180,252,0.03), transparent)",
        }}
      />
      {/* Layer 3: Linear-style starfield */}
      <Starfield />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 pt-16 pb-8 sm:px-8 sm:pt-24 sm:pb-10 md:pt-36">
        <div className="col-span-12 flex flex-col items-center text-center">
          <h1
            className="text-[#ECECEF] max-w-[14ch] font-bold"
            style={{
              fontSize: "clamp(3rem, 8vw, 6.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
            }}
          >
            Bewerben, ohne Panik.
          </h1>

          <p className="mt-5 sm:mt-7 max-w-[42ch] text-[16px] sm:text-[17px] leading-relaxed text-[#A1A1AA]">
            Lebenslauf hochladen. Passende Stellen finden. Bewerbung senden.
          </p>

          <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#7c7df0] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#a5b4fc] glow-cta"
            >
              Kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#52525B]">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              DSGVO-konform
            </span>
            <span>Keine Kreditkarte</span>
            <span>Made in Austria</span>
          </div>
        </div>

        {/* Product UI preview fades into background */}
        <div
          className="col-span-12 mt-12 sm:mt-20"
          style={{
            maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          }}
        >
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

/* ─── Features (Linear numbered pattern) ───────────────────────────── */
/**
 * Three numbered steps with large faded numbers and arrow links.
 * Background elevated one step from hero.
 */
function Features() {
  const steps = [
    {
      num: "1",
      title: "Lebenslauf hochladen",
      desc: "Die KI liest deinen Lebenslauf und extrahiert Skills, Erfahrungen und Stärken.",
    },
    {
      num: "2",
      title: "Passende Stellen finden",
      desc: "Jobs mit Match-Score, gefiltert nach deinem Profil und deinem Standort.",
    },
    {
      num: "3",
      title: "Bewerbung senden",
      desc: "Personalisiertes Anschreiben in Sekunden. Ready to send.",
    },
  ];

  return (
    <section id="features" style={{ background: "#111113" }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-24 sm:py-32">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#52525B] mb-3">
          So funktioniert es
        </p>
        <h2
          className="text-center text-[#ECECEF] font-semibold max-w-[18ch] mx-auto mb-16 sm:mb-20"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Drei Schritte. Ein Job.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12">
          {steps.map((step) => (
            <div key={step.num} className="group">
              <span
                className="block text-[56px] font-bold leading-none tabular-nums select-none"
                style={{ color: "rgba(124,125,240,0.18)" }}
              >
                {step.num}
              </span>
              <div className="flex items-center gap-2 mt-3 mb-3">
                <h3 className="text-[18px] font-semibold text-[#ECECEF]">
                  {step.title}
                </h3>
                <ArrowUpRight className="h-4 w-4 text-[#71717A] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
              <p className="text-[14px] leading-relaxed text-[#A1A1AA] max-w-[34ch]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA (Cron "It's about time" pattern) ──────────────────── */
/**
 * Massive headline with bottom ambient glow.
 */
function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(124,92,255,0.10), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-[900px] px-5 sm:px-8 py-20 sm:py-32 text-center">
        <h2
          className="text-[#ECECEF] font-bold"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          Dein Job wartet.
        </h2>
        <p className="mt-5 sm:mt-6 text-[15px] sm:text-[16px] text-[#A1A1AA] max-w-[36ch] mx-auto">
          Kostenlos starten. Jederzeit kündbar.
        </p>
        <div className="mt-7 sm:mt-9 flex items-center justify-center px-4 sm:px-0">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#7c7df0] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#a5b4fc] glow-cta"
          >
            Kostenlos starten
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer (Linear/Resend weighted 4-column) ────────────────────── */
/**
 * Four-column footer with product, account, and legal links.
 */
function Footer() {
  const columns = [
    {
      title: "Produkt",
      links: [
        { label: "Funktionen", to: "#features" },
        { label: "Preise", to: "/pricing" },
        { label: "Changelog", to: "/changelog" },
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
    <footer className="border-t border-white/[0.06]" style={{ background: "#111113" }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 pb-10 sm:pt-20 sm:pb-12">
        <div className="grid grid-cols-12 gap-8 mb-14">
          {/* Brand column */}
          <div className="col-span-12 sm:col-span-6 md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#7c7df0]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[18px] font-semibold tracking-tight text-[#ECECEF]">
                JobAssist
              </span>
            </div>
            <p className="max-w-[34ch] text-[13px] leading-relaxed text-[#71717A]">
              KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt. Für Schüler, Studenten und Berufseinsteiger.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="col-span-12 sm:col-span-6 md:col-span-2 md:col-start-auto">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#52525B] mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[13px] text-[#71717A] hover:text-[#ECECEF] transition-colors"
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <span className="text-[12px] text-[#52525B]">
            &copy; {new Date().getFullYear()} JobAssist
          </span>
          <span className="text-[12px] text-[#52525B]">
            Made in Austria
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Public landing page composition.
   ════════════════════════════════════════════════════════════════════════ */
/**
 * Public marketing landing page shown at `/` for unauthenticated visitors.
 * Authenticated visitors are forwarded to /dashboard.
 */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="surface-dark relative min-h-screen overflow-x-clip font-sans">
      <TopNav />
      <Hero />
      <Features />
      <FinalCta />
      <Footer />
    </div>
  );
}
