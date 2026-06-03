import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Search,
  Zap,
  Shield,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

/* ════════════════════════════════════════════════════════════════════════
   Landing page — Dark, minimal, Gen-Z-aligned.
   Three sections: Hero, How it works, Footer.
   ════════════════════════════════════════════════════════════════════════ */

/**
 * Sticky top navigation. Logo left, links center (desktop), CTA right.
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
          <a href="#how" className="hover:text-[#ECECEF] transition-colors">
            So funktioniert es
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7c7df0] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#a5b4fc] transition-colors"
          >
            Kostenlos starten
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Hero section — one headline, one sub, one CTA.
 * Dark background with subtle ambient gradient.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,92,255,0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 50%, rgba(124,92,255,0.06), transparent 50%)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 pt-14 pb-10 sm:px-8 sm:pt-20 sm:pb-12 md:pt-32">
        <div className="col-span-12 flex flex-col items-center text-center">
          <h1
            className="text-[#ECECEF] max-w-[18ch] font-semibold"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
            }}
          >
            Bewerben, ohne Panik.
          </h1>

          <p className="mt-5 sm:mt-6 max-w-[48ch] text-[15px] sm:text-[17px] leading-relaxed text-[#A1A1AA]">
            Lebenslauf hochladen, passende Stellen finden, Anschreiben generieren.
            Alles an einem Ort.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#7c7df0] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#a5b4fc] transition-colors"
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
            <span className="flex items-center gap-1.5">
              Keine Kreditkarte
            </span>
          </div>
        </div>

        {/* Product screenshot — dark UI, no browser chrome */}
        <div className="col-span-12 mt-10 sm:mt-16">
          <div className="mx-auto max-w-[860px] rounded-xl border border-white/[0.08] bg-[#111113] overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-[#52525B]" />
                <span className="text-[14px] text-[#ECECEF]">Praktikum Marketing</span>
                <span className="inline-block w-[2px] h-[16px] bg-[#a5b4fc] ml-0.5 animate-pulse" />
              </div>
              <div className="space-y-2">
                {[
                  { c: "Billa", r: "Praktikant Marketing", l: "Wien", s: 94 },
                  { c: "Hofer", r: "Werkstudent Marketing", l: "Wien", s: 87 },
                  { c: "Spar", r: "Aushilfe Verkauf", l: "Graz", s: 82 },
                ].map((j) => (
                  <div
                    key={j.c + j.r}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[#18181B] px-3 py-2.5"
                  >
                    <div className="h-8 w-8 rounded-md bg-[#7c7df0]/20 grid place-items-center text-[10px] font-bold text-[#a5b4fc] shrink-0">
                      {j.c[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#ECECEF] truncate">{j.r}</p>
                      <p className="text-[11px] text-[#71717A]">{j.c} · {j.l}</p>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-[#a5b4fc]">{j.s}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * How it works — three steps. No animations, no bloat.
 */
function HowItWorks() {
  const steps = [
    {
      icon: FileText,
      title: "Lebenslauf hochladen",
      desc: "Die KI analysiert deine Skills und Erfahrungen.",
    },
    {
      icon: Search,
      title: "Passende Stellen finden",
      desc: "Jobs mit Match-Score, gefiltert nach deinem Profil.",
    },
    {
      icon: Zap,
      title: "Bewerbung senden",
      desc: "Personalisiertes Anschreiben in Sekunden.",
    },
  ];

  return (
    <section id="how" className="mx-auto max-w-[1200px] px-5 sm:px-8 py-20 sm:py-28">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#52525B] mb-3">
        So funktioniert es
      </p>
      <h2
        className="text-center text-[#ECECEF] font-semibold max-w-[20ch] mx-auto mb-12 sm:mb-16"
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
          lineHeight: 1.1,
          letterSpacing: "-0.015em",
        }}
      >
        Drei Schritte zu deinem Job.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/[0.06] bg-[#111113] p-6 sm:p-7"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#7c7df0]/15 mb-5">
              <step.icon className="h-5 w-5 text-[#a5b4fc]" />
            </div>
            <p className="text-[11px] font-semibold text-[#52525B] mb-2">
              Schritt {i + 1}
            </p>
            <h3 className="text-[16px] font-semibold text-[#ECECEF] mb-2">
              {step.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-[#A1A1AA]">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Minimal footer — logo, links, copyright.
 */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-10 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-[#7c7df0]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[#ECECEF]">
              JobAssist
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-[#71717A]">
            <Link to="/pricing" className="hover:text-[#ECECEF] transition-colors">
              Preise
            </Link>
            <Link to="/privacy" className="hover:text-[#ECECEF] transition-colors">
              Datenschutz
            </Link>
            <Link to="/impressum" className="hover:text-[#ECECEF] transition-colors">
              Impressum
            </Link>
            <Link to="/contact" className="hover:text-[#ECECEF] transition-colors">
              Kontakt
            </Link>
          </div>
        </div>
        <p className="mt-8 text-[12px] text-[#52525B]">
          &copy; {new Date().getFullYear()} JobAssist
        </p>
      </div>
    </footer>
  );
}

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
      <HowItWorks />
      <Footer />
    </div>
  );
}
