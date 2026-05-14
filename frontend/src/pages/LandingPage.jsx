import { Link, Navigate } from "react-router-dom";
import {
  Sparkles, Target, MessageSquare, Briefcase, Bell, Bot,
  ArrowRight, Zap, Shield, TrendingUp, Wand2,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

const FEATURES = [
  {
    icon: Target,
    title: "Intelligentes Matching",
    desc: "Lade deinen Lebenslauf einmal hoch — die KI bewertet jede Stelle in Sekunden und zeigt dir, wo du wirklich passt.",
    accent: "from-indigo-500/20 to-indigo-500/5",
    iconCls: "text-indigo-300",
  },
  {
    icon: Wand2,
    title: "Anschreiben in Sekunden",
    desc: "Personalisierte Motivationsschreiben — auf den Ton, die Stelle und dein Profil zugeschnitten. Keine leeren Seiten mehr.",
    accent: "from-violet-500/20 to-violet-500/5",
    iconCls: "text-violet-300",
  },
  {
    icon: MessageSquare,
    title: "Gesprächsvorbereitung",
    desc: "Übe Vorstellungsgespräche mit individuellen Fragen, basierend auf dem konkreten Job und deinem Lebenslauf.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    iconCls: "text-emerald-300",
  },
  {
    icon: Bell,
    title: "Job-Alerts",
    desc: "Tägliche oder wöchentliche Mails mit den besten passenden Stellen in Österreich — automatisch, kuratiert, ohne Spam.",
    accent: "from-amber-500/20 to-amber-500/5",
    iconCls: "text-amber-300",
  },
];

const STEPS = [
  { n: "01", title: "Lebenslauf hochladen", desc: "PDF oder TXT — die KI analysiert Stärken und Lücken." },
  { n: "02", title: "Stellen entdecken", desc: "Empfohlene Jobs in Österreich oder eigene Suche mit Bezirks-Filter." },
  { n: "03", title: "Bewerben & üben", desc: "Anschreiben, Match-Score und Interview-Fragen — alles an einem Ort." },
];

const PRICING_TEASER = [
  { name: "Basic", price: "Gratis", desc: "Zum Ausprobieren", popular: false },
  { name: "Pro", price: "€4,99", suffix: "/Monat", desc: "Für aktive Bewerber", popular: true },
  { name: "Max", price: "€7,99", suffix: "/Monat", desc: "Unbegrenzte Power", popular: false },
];

const TRUST = [
  { icon: Shield, label: "DSGVO-konform" },
  { icon: Zap, label: "EU AI Act ready" },
  { icon: TrendingUp, label: "Made in Austria" },
];

/**
 * Top navigation bar for the public landing page.
 * Pure presentational; no state.
 */
function TopNav() {
  return (
    <header
      className="sticky top-0 z-30 w-full border-b backdrop-blur-md"
      style={{ background: "rgba(10,10,10,0.78)", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-12 items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link to="/" className="col-span-6 md:col-span-3 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">JobAssist</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-400">KI-gestützt</p>
          </div>
        </Link>

        <nav className="col-span-6 hidden md:flex md:col-span-6 items-center justify-center gap-7 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Funktionen</a>
          <a href="#how" className="hover:text-white transition-colors">So funktioniert&apos;s</a>
          <Link to="/pricing" className="hover:text-white transition-colors">Preise</Link>
        </nav>

        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2 sm:gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Anmelden
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/35"
          >
            Jetzt starten <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Full-bleed hero with headline, sub, CTAs, and a CSS-only product mock. */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(91,79,232,0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 30%, rgba(139,92,246,0.12), transparent 70%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-12 gap-6 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            <Sparkles className="h-3 w-3" /> KI-Bewerbung für Österreich
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Bewerben war noch nie<br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
              so klar und schnell
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Lade deinen Lebenslauf hoch, finde passende Stellen in ganz Österreich und lass die KI Anschreiben, Match-Scores und Gesprächsfragen für dich erledigen.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/40"
            >
              Kostenlos starten <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              So funktioniert&apos;s
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
            {TRUST.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-400" /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex items-center">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

/** CSS-only mock of the dashboard, used as the hero visual. */
function HeroMock() {
  return (
    <div
      className="relative w-full rounded-2xl p-4 sm:p-5"
      style={{
        background: "linear-gradient(180deg, #161616 0%, #0c0c0c 100%)",
        boxShadow: "0 30px 80px rgba(91,79,232,0.20), 0 0 0 1px rgba(139,92,246,0.18) inset",
      }}
    >
      <div className="flex items-center gap-1.5 mb-4">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">JobAssist · Übersicht</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Match", value: "82%", color: "text-emerald-300" },
          { label: "Beworben", value: "12", color: "text-indigo-300" },
          { label: "Interview", value: "3", color: "text-violet-300" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 mb-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">Pipeline</p>
        <div className="flex gap-1">
          {[60, 45, 30, 18].map((w, i) => (
            <div key={i} className="flex-1 h-2 rounded-full overflow-hidden bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${w}%`,
                  background: ["#5B4FE8", "#8B5CF6", "#2DD4BF", "#F59E0B"][i],
                  boxShadow: `0 0 8px ${["#5B4FE8", "#8B5CF6", "#2DD4BF", "#F59E0B"][i]}66`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {[
          { c: "Siemens AG", r: "Software Engineer", s: 91, color: "#2DD4BF" },
          { c: "ÖBB", r: "Data Analyst", s: 78, color: "#5B4FE8" },
          { c: "AVL List", r: "DevOps Engineer", s: 64, color: "#F59E0B" },
        ].map((j) => (
          <div key={j.c} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="h-7 w-7 rounded-md bg-white/5 grid place-items-center">
              <Briefcase className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-200 truncate">{j.r}</p>
              <p className="text-[10px] text-slate-500 truncate">{j.c}</p>
            </div>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: j.color }}>{j.s}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Feature grid section. */
function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="mb-12 max-w-2xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400">Funktionen</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Alles, was du für deine Bewerbung brauchst.
        </h2>
        <p className="mt-3 text-base text-slate-400">
          Vier KI-Werkzeuge, die nahtlos zusammenarbeiten — vom Lebenslauf bis zum Vorstellungsgespräch.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc, accent, iconCls }) => (
          <div
            key={title}
            className="col-span-12 sm:col-span-6 rounded-2xl border border-white/[0.06] p-6 transition-colors hover:border-white/[0.12]"
            style={{ background: "linear-gradient(180deg, #161616 0%, #0e0e0e 100%)" }}
          >
            <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent}`}>
              <Icon className={`h-5 w-5 ${iconCls}`} />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "How it works" three-step section. */
function HowItWorks() {
  return (
    <section id="how" className="border-y border-white/5" style={{ background: "linear-gradient(180deg, #0c0c0c 0%, #0a0a0a 100%)" }}>
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mb-12 max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">In 3 Schritten</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Vom Lebenslauf zum Vorstellungsgespräch.
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="col-span-12 md:col-span-4 rounded-2xl border border-white/[0.06] p-6"
              style={{ background: "#161616" }}
            >
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold tracking-tight text-white">{s.n}</span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:inline h-4 w-4 text-slate-600" />
                )}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Pricing teaser linking out to /pricing for the full breakdown. */
function PricingTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="mb-10 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">Preise</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Starte kostenlos. Upgrade wenn du mehr willst.
        </h2>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {PRICING_TEASER.map((p) => (
          <div
            key={p.name}
            className={`col-span-12 sm:col-span-4 rounded-2xl border p-6 transition-all ${
              p.popular
                ? "border-indigo-400/50 shadow-lg shadow-indigo-500/15"
                : "border-white/[0.06]"
            }`}
            style={{ background: "linear-gradient(180deg, #161616 0%, #0e0e0e 100%)" }}
          >
            {p.popular && (
              <span className="mb-3 inline-flex rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Beliebt
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{p.name}</h3>
            <p className="text-sm text-slate-400">{p.desc}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-white">{p.price}</span>
              {p.suffix && <span className="text-sm text-slate-500">{p.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
        >
          Alle Pläne im Detail <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/** Final CTA + footer. */
function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(91,79,232,0.18), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Bot className="mx-auto h-9 w-9 text-violet-300" />
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Bereit, deinen Traumjob zu finden?
        </h2>
        <p className="mt-3 text-base text-slate-400">
          Erstelle in 30 Sekunden ein kostenloses Konto. Keine Kreditkarte erforderlich.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/40"
          >
            Kostenlos starten <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            Ich habe bereits ein Konto
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Public landing footer with legal links. */
function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto grid max-w-7xl grid-cols-12 items-center gap-4 px-5 py-8 sm:px-8">
        <div className="col-span-12 md:col-span-6 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm text-slate-400">© {new Date().getFullYear()} JobAssist. Made in Austria.</span>
        </div>
        <div className="col-span-12 md:col-span-6 flex flex-wrap items-center justify-start gap-4 text-xs text-slate-500 md:justify-end">
          <Link to="/terms" className="hover:text-slate-200 transition-colors">AGB</Link>
          <Link to="/privacy" className="hover:text-slate-200 transition-colors">Datenschutz</Link>
          <Link to="/impressum" className="hover:text-slate-200 transition-colors">Impressum</Link>
          <Link to="/contact" className="hover:text-slate-200 transition-colors">Kontakt</Link>
        </div>
      </div>
    </footer>
  );
}

/**
 * Public marketing landing page shown at `/` for unauthenticated visitors.
 * Authenticated users are redirected straight to `/dashboard`.
 */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
      <TopNav />
      <Hero />
      <Features />
      <HowItWorks />
      <PricingTeaser />
      <FinalCta />
      <Footer />
    </div>
  );
}
