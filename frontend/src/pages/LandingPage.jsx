import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, FileText, Search, MessageSquare } from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

/**
 * Attaches IntersectionObserver to .reveal elements for scroll animation.
 * @param {React.RefObject} ref
 */
function useReveal(ref) {
  useEffect(() => {
    const root = ref?.current ?? document;
    const els = root.querySelectorAll(".reveal");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ref]);
}

/** Floating company logos data */
const FLOATING_LOGOS = [
  { name: "Spar", bg: "#007e3a", x: "12%", y: "20%", delay: "0s", size: 52 },
  { name: "OMV", bg: "#003B7C", x: "78%", y: "15%", delay: "0.5s", size: 48 },
  { name: "A1", bg: "#E4002B", x: "85%", y: "55%", delay: "1s", size: 44 },
  { name: "Billa", bg: "#e60000", x: "8%", y: "60%", delay: "1.5s", size: 46 },
  { name: "ÖBB", bg: "#E2001A", x: "22%", y: "78%", delay: "0.3s", size: 42 },
  { name: "Post", bg: "#FFD100", x: "72%", y: "75%", delay: "0.8s", size: 44 },
  { name: "KTM", bg: "#FF6900", x: "55%", y: "85%", delay: "1.2s", size: 40 },
  { name: "Raiff.", bg: "#FFE500", x: "35%", y: "12%", delay: "0.6s", size: 46 },
  { name: "Hofer", bg: "#003882", x: "90%", y: "35%", delay: "1.8s", size: 42 },
  { name: "dm", bg: "#002D5F", x: "5%", y: "40%", delay: "2s", size: 40 },
];

/** Dashboard demo steps */
const DEMO_STEPS = [
  { action: "Jobsuche öffnen", screen: "search" },
  { action: "Filter: Wien, Lehrstelle", screen: "filter" },
  { action: "Job auswählen", screen: "detail" },
  { action: "Bewerben klicken", screen: "apply" },
];

/**
 * JobAssist Landing Page — New design from scratch.
 * Circular header, floating logos hero, tools section, dashboard demo, feature widgets.
 */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const [scrolled, setScrolled] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const pageRef = useRef(null);

  useReveal(pageRef);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Auto-advance demo
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((s) => (s + 1) % DEMO_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div ref={pageRef} className="landing-page-white min-h-screen bg-white">
      {/* ─── Circular Pill Header (Mobbin-style) ───────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-5">
        <nav
          className={[
            "flex items-center gap-2 md:gap-5 h-12 px-3 md:px-6 rounded-full transition-all duration-300",
            scrolled
              ? "bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-[#f0f0f0]"
              : "bg-white/70 backdrop-blur-lg border border-[#f0f0f0]/50",
          ].join(" ")}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0B0B0F]">
              <span className="text-[10px] font-bold text-white">JA</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-[#0B0B0F] hidden sm:block">JobAssist</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-5 ml-4">
            <a href="#tools" className="text-[13px] text-[#666] hover:text-[#0B0B0F] transition-colors">Features</a>
            <a href="#demo" className="text-[13px] text-[#666] hover:text-[#0B0B0F] transition-colors">Demo</a>
            <a href="#preise" className="text-[13px] text-[#666] hover:text-[#0B0B0F] transition-colors">Preise</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-3">
            <Link to="/login" className="text-[13px] text-[#666] hover:text-[#0B0B0F] transition-colors hidden sm:block">
              Login
            </Link>
            <Link
              to="/register"
              className="h-8 px-4 inline-flex items-center rounded-full bg-[#0B0B0F] text-white text-[12px] font-semibold hover:bg-[#333] transition-colors"
            >
              Starten
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero: Big name + floating logos ───────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Floating company logos in background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {FLOATING_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="grid place-items-center rounded-2xl opacity-[0.08] animate-[floatSlow_8s_ease-in-out_infinite]"
              style={{
                position: "fixed",
                left: logo.x,
                top: logo.y,
                width: `${logo.size}px`,
                height: `${logo.size}px`,
                backgroundColor: logo.bg,
                animationDelay: logo.delay,
              }}
            >
              <span className="text-white text-[10px] font-bold">{logo.name}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="reveal flex flex-col items-center text-center z-10">
          <h1
            className="text-[#0B0B0F] font-extrabold leading-[0.9] tracking-[-0.05em]"
            style={{ fontSize: "clamp(4rem, 12vw, 9rem)" }}
          >
            JobAssist
          </h1>
          <p
            className="text-[#666] font-medium tracking-[-0.01em] mt-4"
            style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)" }}
          >
            Dein Weg in die Arbeitswelt.
          </p>
          <div className="reveal reveal-delay-2 mt-10">
            <Link
              to="/register"
              className="h-12 px-7 inline-flex items-center gap-2 rounded-full bg-[#0B0B0F] text-white text-[14px] font-semibold hover:bg-[#333] transition-colors"
            >
              Kostenlos starten
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Tools Section ─────────────────────────────────────────── */}
      <section id="tools" className="bg-[#FAFAFA] border-t border-[#f0f0f0] py-28 md:py-36">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="reveal">
            <span
              className="text-[#0B0B0F] font-bold leading-[1.1] tracking-[-0.03em] block"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              Bewerben heißt jonglieren mit
            </span>
            {/* Inline platform icons */}
            <span className="flex items-center justify-center gap-2.5 my-5">
              <img src="https://cdn.simpleicons.org/linkedin/0A66C2" alt="LinkedIn" className="h-9 w-9 md:h-11 md:w-11 rounded-xl" />
              <img src="https://cdn.simpleicons.org/indeed/003A9B" alt="Indeed" className="h-9 w-9 md:h-11 md:w-11 rounded-xl" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Karriere.at_Logo.svg/120px-Karriere.at_Logo.svg.png" alt="karriere.at" className="h-9 md:h-11 rounded-xl" />
              <img src="https://cdn.simpleicons.org/kununu/99C613" alt="kununu" className="h-9 w-9 md:h-11 md:w-11 rounded-xl" />
              <img src="https://cdn.simpleicons.org/xing/006567" alt="XING" className="h-9 w-9 md:h-11 md:w-11 rounded-xl" />
            </span>
            <span
              className="text-[#0B0B0F] font-bold leading-[1.1] tracking-[-0.03em] block"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              Werkzeugen.
            </span>
          </h2>
          <p className="reveal reveal-delay-1 text-[#666] text-[16px] md:text-[17px] leading-relaxed mt-7 max-w-xl mx-auto">
            Du wechselst zwischen Jobbörsen, Word-Dokumenten, Notizen und Mail — verlierst Überblick und Zeit.{" "}
            <strong className="text-[#0B0B0F]">Es geht auch anders.</strong>
          </p>
        </div>
      </section>

      {/* ─── Dashboard Demo ────────────────────────────────────────── */}
      <section id="demo" className="py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="reveal text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999] block mb-3">
              Live Demo
            </span>
            <h2
              className="reveal reveal-delay-1 text-[#0B0B0F] font-bold tracking-[-0.025em] leading-[1.08]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              So findest du deinen Job.
            </h2>
          </div>

          {/* Demo browser frame */}
          <div className="reveal reveal-delay-2 rounded-2xl border border-[#e5e5e5] bg-[#FAFAFA] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e5e5] bg-white">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-7 px-4 rounded-md bg-[#f5f5f5] border border-[#e5e5e5] flex items-center text-[11px] text-[#999]">
                  app.jobassist.at/dashboard
                </div>
              </div>
            </div>

            {/* Demo content */}
            <div className="grid grid-cols-12 min-h-[400px]">
              {/* Sidebar */}
              <div className="col-span-3 border-r border-[#e5e5e5] bg-white p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-6 rounded-full bg-[#0B0B0F] grid place-items-center">
                    <span className="text-[8px] font-bold text-white">JA</span>
                  </div>
                  <span className="text-[12px] font-semibold text-[#0B0B0F]">JobAssist</span>
                </div>
                <div className="flex flex-col gap-1">
                  {["Dashboard", "Jobsuche", "Bewerbungen", "Lebenslauf", "Anschreiben"].map((item, i) => (
                    <div
                      key={item}
                      className={[
                        "text-[12px] px-3 py-2 rounded-lg transition-colors",
                        i === 1 ? "bg-[#0B0B0F] text-white font-medium" : "text-[#666] hover:bg-[#f5f5f5]",
                      ].join(" ")}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main area */}
              <div className="col-span-12 md:col-span-9 p-6 md:p-8">
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-6">
                  {DEMO_STEPS.map((step, i) => (
                    <button
                      key={step.action}
                      type="button"
                      onClick={() => setDemoStep(i)}
                      className={[
                        "text-[11px] px-3 py-1.5 rounded-full border transition-all",
                        i === demoStep
                          ? "bg-[#0B0B0F] text-white border-[#0B0B0F]"
                          : "bg-white text-[#999] border-[#e5e5e5]",
                      ].join(" ")}
                    >
                      {step.action}
                    </button>
                  ))}
                </div>

                {/* Demo screens */}
                {demoStep === 0 && (
                  <div className="space-y-3">
                    <div className="h-10 rounded-lg border border-[#e5e5e5] bg-white px-4 flex items-center text-[13px] text-[#999]">
                      <Search size={14} className="mr-2 text-[#ccc]" />
                      Was suchst du?
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      {["Lehrstelle", "Praktikum", "Ferialjob", "Teilzeit"].map((tag) => (
                        <span key={tag} className="col-span-3 text-center text-[11px] py-2 rounded-lg bg-[#f5f5f5] text-[#666] border border-[#e5e5e5]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {demoStep === 1 && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#0B0B0F] text-white">Wien</span>
                      <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#0B0B0F] text-white">Lehrstelle</span>
                      <span className="text-[11px] px-3 py-1.5 rounded-full border border-[#e5e5e5] text-[#666]">+ Filter</span>
                    </div>
                    <p className="text-[12px] text-[#999]">23 Ergebnisse</p>
                  </div>
                )}
                {demoStep === 2 && (
                  <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-[14px] font-semibold text-[#0B0B0F]">Lehrling Bürokauffrau (m/w/d)</h4>
                        <p className="text-[12px] text-[#666] mt-1">Raiffeisen Landesbank · Wien · Lehrstelle</p>
                      </div>
                      <span className="text-[10px] font-medium text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">93% Match</span>
                    </div>
                    <p className="text-[12px] text-[#999] mt-4 leading-relaxed">
                      Wir suchen eine/n motivierte/n Lehrling für unsere Filiale in Wien...
                    </p>
                  </div>
                )}
                {demoStep === 3 && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-14 w-14 rounded-full bg-[#22c55e]/10 grid place-items-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-[14px] font-semibold text-[#0B0B0F]">Bewerbung abgeschickt!</p>
                    <p className="text-[12px] text-[#999] mt-1">Lebenslauf + Anschreiben wurden übermittelt.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three Feature Widgets ─────────────────────────────────── */}
      <section className="bg-[#FAFAFA] border-t border-[#f0f0f0] py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="reveal text-[#0B0B0F] font-bold tracking-[-0.025em] leading-[1.08]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Alles was du brauchst.
            </h2>
            <p className="reveal reveal-delay-1 text-[#666] text-[15px] mt-4">
              Drei Tools. Ein Account. Null Chaos.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-4 md:gap-5">
            {/* Widget 1 — CV Builder */}
            <div className="reveal col-span-12 md:col-span-4 rounded-2xl border border-[#e5e5e5] bg-white p-7 flex flex-col">
              <div className="h-11 w-11 rounded-xl bg-[#0B0B0F] grid place-items-center mb-5">
                <FileText size={18} className="text-white" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#0B0B0F] mb-2">Lebenslauf-Builder</h3>
              <p className="text-[14px] text-[#666] leading-relaxed flex-1">
                Fragen beantworten, PDF runterladen. ATS-optimiert, professionell, fertig in 5 Minuten.
              </p>
              <div className="mt-6 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  <span className="text-[10px] text-[#999]">Schritt 4/5</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e5e5e5]">
                  <div className="h-1.5 rounded-full bg-[#0B0B0F] w-[80%]" />
                </div>
              </div>
            </div>

            {/* Widget 2 — Job Search */}
            <div className="reveal col-span-12 md:col-span-4 rounded-2xl border border-[#e5e5e5] bg-white p-7 flex flex-col" style={{ transitionDelay: "80ms" }}>
              <div className="h-11 w-11 rounded-xl bg-[#0B0B0F] grid place-items-center mb-5">
                <Search size={18} className="text-white" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#0B0B0F] mb-2">Smarte Jobsuche</h3>
              <p className="text-[14px] text-[#666] leading-relaxed flex-1">
                Lehrstellen, Praktika, Ferialjobs in deiner Nähe. Filter setzen, finden, bewerben.
              </p>
              <div className="mt-6 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] p-4">
                <div className="flex gap-1.5">
                  <span className="text-[9px] px-2 py-1 rounded-full bg-[#0B0B0F] text-white">Wien</span>
                  <span className="text-[9px] px-2 py-1 rounded-full bg-[#0B0B0F] text-white">Lehrstelle</span>
                  <span className="text-[9px] px-2 py-1 rounded-full border border-[#e5e5e5] text-[#999]">IT</span>
                </div>
              </div>
            </div>

            {/* Widget 3 — Cover Letter */}
            <div className="reveal col-span-12 md:col-span-4 rounded-2xl border border-[#e5e5e5] bg-white p-7 flex flex-col" style={{ transitionDelay: "160ms" }}>
              <div className="h-11 w-11 rounded-xl bg-[#0B0B0F] grid place-items-center mb-5">
                <MessageSquare size={18} className="text-white" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#0B0B0F] mb-2">Anschreiben-Generator</h3>
              <p className="text-[14px] text-[#666] leading-relaxed flex-1">
                Stellenanzeige einfügen — persönliches Anschreiben in 30 Sekunden.
              </p>
              <div className="mt-6 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] p-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0B0B0F] animate-pulse" />
                  <span className="text-[10px] text-[#999]">Generiert...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────── */}
      <section id="preise" className="py-28 md:py-36">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="reveal text-[#0B0B0F] font-bold tracking-[-0.025em] leading-[1.08]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Einfache Preise.
            </h2>
            <p className="reveal reveal-delay-1 text-[#666] text-[15px] mt-4">
              Gratis starten. Upgrade wenn du mehr willst.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {[
              { name: "Free", price: "€0", sub: "für immer", features: ["1 Lebenslauf", "5 Anschreiben/Mo", "Jobsuche", "Tracker"], highlighted: false },
              { name: "Pro", price: "€4,99", sub: "/Monat", features: ["25 Anschreiben/Mo", "Interview-Übung", "CV Feedback", "20 Suchen/Tag"], highlighted: true },
              { name: "Max", price: "€7,99", sub: "/Monat", features: ["Unbegrenzt", "Alle Features", "Prioritäts-Support", "API Zugang"], highlighted: false },
            ].map((plan, i) => (
              <div
                key={plan.name}
                className={[
                  "reveal col-span-12 md:col-span-4 rounded-2xl p-7 flex flex-col border",
                  plan.highlighted ? "bg-[#0B0B0F] border-[#0B0B0F] text-white" : "bg-white border-[#e5e5e5]",
                ].join(" ")}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className={["text-[13px] font-medium", plan.highlighted ? "text-white/60" : "text-[#999]"].join(" ")}>
                  {plan.name}
                </span>
                <div className="flex items-baseline gap-1 mt-1 mb-5">
                  <span className={["text-[34px] font-bold tracking-tight", plan.highlighted ? "text-white" : "text-[#0B0B0F]"].join(" ")}>
                    {plan.price}
                  </span>
                  <span className={["text-[13px]", plan.highlighted ? "text-white/40" : "text-[#999]"].join(" ")}>
                    {plan.sub}
                  </span>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className={["text-[13px]", plan.highlighted ? "text-white/70" : "text-[#666]"].join(" ")}>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={[
                    "h-10 inline-flex items-center justify-center rounded-full text-[13px] font-semibold transition-colors",
                    plan.highlighted
                      ? "bg-white text-[#0B0B0F] hover:bg-white/90"
                      : "bg-[#f5f5f5] text-[#0B0B0F] hover:bg-[#ebebeb]",
                  ].join(" ")}
                >
                  Starten
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-[#f0f0f0] bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto px-6 py-28 md:py-36 text-center">
          <h2
            className="reveal text-[#0B0B0F] font-bold tracking-[-0.03em] leading-[1.0]"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
          >
            Bereit loszulegen?
          </h2>
          <p className="reveal reveal-delay-1 text-[#666] text-[15px] mt-5">
            Kostenlos. Keine Kreditkarte. Kein Abo.
          </p>
          <div className="reveal reveal-delay-2 mt-9">
            <Link
              to="/register"
              className="h-12 px-7 inline-flex items-center gap-2 rounded-full bg-[#0B0B0F] text-white text-[14px] font-semibold hover:bg-[#333] transition-colors"
            >
              Jetzt starten
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-[#f0f0f0]">
        <div className="grid grid-cols-12 max-w-6xl mx-auto px-6 py-10 items-start gap-y-6">
          <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-[#0B0B0F]">
                <span className="text-[8px] font-bold text-white">JA</span>
              </div>
              <span className="text-[13px] font-semibold text-[#0B0B0F]">JobAssist</span>
            </div>
            <p className="text-[12px] text-[#999] leading-relaxed mt-1">
              Bewerbungstools für Österreich.
            </p>
          </div>
          <div className="col-span-6 md:col-span-2">
            <h4 className="text-[11px] font-semibold text-[#0B0B0F] uppercase tracking-[0.05em] mb-3">Produkt</h4>
            <div className="flex flex-col gap-2">
              <a href="#tools" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">Features</a>
              <a href="#demo" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">Demo</a>
              <a href="#preise" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">Preise</a>
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <h4 className="text-[11px] font-semibold text-[#0B0B0F] uppercase tracking-[0.05em] mb-3">Rechtliches</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacy" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">Datenschutz</Link>
              <Link to="/terms" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">AGB</Link>
              <Link to="/impressum" className="text-[12px] text-[#666] hover:text-[#0B0B0F] transition-colors">Impressum</Link>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex items-end justify-start md:justify-end">
            <span className="text-[11px] text-[#ccc]">© 2025 JobAssist</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
