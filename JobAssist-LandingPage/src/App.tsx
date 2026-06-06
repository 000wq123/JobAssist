import { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Search,
  FileText,
  Check,
  ArrowUpRight,
  Shield,
  Smartphone,
  Euro,
  MessageSquare,
  MapPin,
  Clock,
  Menu,
  X,
  UserCircle,
  Briefcase,
  Send,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   SVG NOISE FILTER
───────────────────────────────────────────────────────────── */
function NoiseFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="c3-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOGO
───────────────────────────────────────────────────────────── */
function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const txt = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-sm";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${sz} rounded-full flex items-center justify-center font-bold text-black`}
        style={{ background: "linear-gradient(135deg, #A4F4FD, #00d2ff)" }}
      >
        <span className={txt}>J</span>
      </div>
      <span className="font-bold text-white tracking-tight">JobAssist</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BACKGROUND VIDEO
───────────────────────────────────────────────────────────── */
function BackgroundVideo() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4"
      />
      <div className="absolute inset-0 bg-black/55" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR — floating pill
───────────────────────────────────────────────────────────── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const APP_URL = "https://app.jobassist.at";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="w-full max-w-4xl rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg px-4 h-14 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Funktionen", id: "funktionen" },
              { label: "KV-Check", id: "kv-check" },
              { label: "Preise", id: "preise" },
              { label: "FAQ", id: "faq" },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-medium text-white/65 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={`${APP_URL}/login`}
              className="hidden md:inline-flex text-sm font-medium text-white/65 hover:text-white transition-colors px-3 py-1.5"
            >
              Anmelden
            </a>
            <a
              href={`${APP_URL}/register`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-semibold text-sm px-4 py-2 hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Starten
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button
              className="md:hidden w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </motion.header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <Logo />
            <button
              onClick={() => setMobileOpen(false)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
          <nav className="flex flex-col gap-4">
            {[
              { label: "Funktionen", id: "funktionen" },
              { label: "KV-Check", id: "kv-check" },
              { label: "Preise", id: "preise" },
              { label: "FAQ", id: "faq" },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => scrollTo(link.id), 100);
                }}
                className="text-xl font-semibold text-white py-2 border-b border-white/8 text-left"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <a
              href={`${APP_URL}/register`}
              className="w-full text-center rounded-full bg-white text-black font-semibold text-sm px-5 py-3.5"
            >
              Kostenlos starten
            </a>
            <a
              href={`${APP_URL}/login`}
              className="w-full text-center rounded-full border border-white/15 text-white font-medium text-sm px-5 py-3.5"
            >
              Anmelden
            </a>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
const shinyStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, #ffffff 0%, #A4F4FD 30%, #00d2ff 50%, #A4F4FD 70%, #ffffff 100%)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter: "url(#c3-noise)",
};

function Hero() {
  const APP_URL = "https://app.jobassist.at";
  return (
    <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl"
      >
        <span className="text-white">Dein erster Job</span>
        <br />
        <span className="animate-shiny" style={shinyStyle}>
          Einfach gemacht
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-6 text-white/65 max-w-md text-base leading-relaxed"
      >
        Du beantwortest ein paar Fragen. Wir schreiben deinen Lebenslauf, suchen passende Jobs und
        prüfen, ob das Gehalt stimmt.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3"
      >
        <a
          href={`${APP_URL}/register`}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-bold text-sm px-7 py-3.5 hover:bg-white/90 active:scale-[0.98] transition-all"
        >
          Jetzt kostenlos starten
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
        <button
          onClick={() =>
            document.getElementById("funktionen")?.scrollIntoView({ behavior: "smooth" })
          }
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 text-white font-medium text-sm px-6 py-3.5 hover:bg-white/10 transition-colors"
        >
          So funktioniert's
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 text-xs text-white/35"
      >
        Keine Kreditkarte · Kein Abo · Sofort loslegen
      </motion.p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PARTNER MARQUEE — favicons via Google S2
───────────────────────────────────────────────────────────── */
function PartnerMarquee() {
  const brands = [
    { name: "SPAR", domain: "spar.at" },
    { name: "ÖBB", domain: "oebb.at" },
    { name: "voestalpine", domain: "voestalpine.com" },
    { name: "Billa", domain: "billa.at" },
    { name: "Wienerberger", domain: "wienerberger.com" },
    { name: "dm", domain: "dm.at" },
    { name: "Runtastic", domain: "runtastic.com" },
    { name: "Kapsch", domain: "kapsch.net" },
  ];
  const doubled = [...brands, ...brands];
  return (
    <section className="relative z-10 py-8 border-t border-b border-white/8 bg-black/20 backdrop-blur-sm">
      <p className="text-center text-xs uppercase tracking-widest text-white/30 mb-5">
        Jobs &amp; Lehrstellen bei diesen Unternehmen
      </p>
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-12 animate-marquee w-max">
          {doubled.map((b, i) => (
            <div key={`${b.name}-${i}`} className="flex items-center gap-2.5 shrink-0">
              <img
                src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=32`}
                alt={b.name}
                className="w-5 h-5 rounded-sm opacity-70"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm font-semibold text-white/50 whitespace-nowrap">
                {b.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FEATURES — professional icons, accurate descriptions
───────────────────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: FileText,
      title: "Lebenslauf-Assistent",
      desc: "Beantworte einfache Fragen zu Schule und bisherigen Erfahrungen. Du bekommst einen fertigen Lebenslauf als PDF — bereit zum Ausdrucken oder Versenden.",
      tags: ["Schritt-für-Schritt", "A4 PDF", "Auf Deutsch"],
    },
    {
      icon: Search,
      title: "Job-Suche",
      desc: "Wir durchsuchen karriere.at, ams.at und willhaben.at täglich für dich. Du siehst nur Stellen, die zu deinem Profil passen.",
      tags: ["karriere.at", "ams.at", "willhaben.at"],
    },
    {
      icon: Euro,
      title: "KV-Gehalts-Check",
      desc: "Jedes Inserat wird mit dem österreichischen Kollektivvertrag verglichen. Du siehst sofort, ob das angebotene Gehalt dem gesetzlichen Minimum entspricht.",
      tags: ["Brutto & Netto", "Stundenlohn", "KV-Einstufung"],
    },
    {
      icon: MessageSquare,
      title: "Interview-Vorbereitung",
      desc: "Übe typische Fragen für dein Vorstellungsgespräch. Du bekommst Feedback zu deinen Antworten — direkt und auf Österreichisch.",
      tags: ["Typische Fragen", "Direktes Feedback", "Österreichisch"],
    },
  ];

  return (
    <section id="funktionen" className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-14"
      >
        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Was JobAssist macht</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-xl">
          Vier Werkzeuge.
          <br />
          Ein Ziel.
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-5 bg-white/5 border border-white/10">
              <f.icon className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-white/55 leading-relaxed mb-4">{f.desc}</p>
            <div className="flex flex-wrap gap-2">
              {f.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-white/45 px-2.5 py-1 rounded-full border border-white/8 bg-white/[0.02]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOW IT WORKS — professional icons
───────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "1",
      icon: UserCircle,
      title: "Profil ausfüllen",
      body: "Name, Schule, was du schon gemacht hast — fertig. Dauert 5 Minuten.",
    },
    {
      n: "2",
      icon: Briefcase,
      title: "Passende Jobs sehen",
      body: "Wir suchen täglich für dich. Du bekommst nur Stellen, die wirklich passen.",
    },
    {
      n: "3",
      icon: Send,
      title: "Bewerben",
      body: "Anschreiben erstellen, Gehalt prüfen, abschicken. Alles in wenigen Minuten.",
    },
  ];

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-14"
      >
        <p className="text-xs uppercase tracking-widest text-white/40 mb-3">So geht's</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          In 3 Schritten zum Job
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                {s.n}
              </span>
              <s.icon className="h-5 w-5 text-white/40" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
            <p className="text-sm text-white/55 leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   KV CHECK — remove "Fair ✓" badge, fix gauge overflow
───────────────────────────────────────────────────────────── */
function KVCheck() {
  return (
    <section
      id="kv-check"
      className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/8"
    >
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-widest text-[#00d2ff] mb-4">KV-Gehalts-Check</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
            Wirst du fair
            <br />
            bezahlt?
          </h2>
          <p className="mt-5 text-white/55 text-base leading-relaxed">
            In Österreich gibt es für fast jeden Beruf einen Kollektivvertrag. Der legt fest, wie
            viel du mindestens verdienen musst. JobAssist prüft das automatisch — für jedes Inserat,
            das du dir anschaust.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Brutto-Gehalt sofort sichtbar",
              "Netto-Berechnung inklusive",
              "Stundenlohn für Teilzeit",
              "Überstunden-Rechner",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                <Check className="h-4 w-4 text-[#10b981] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-card rounded-2xl p-6 overflow-hidden"
        >
          <div className="mb-5">
            <p className="text-xs text-white/35 font-medium">SPAR Österreich</p>
            <p className="text-sm font-semibold text-white mt-0.5">Filialleitung (w/m/d)</p>
          </div>

          <div className="flex items-center justify-center py-4">
            <svg
              width="180"
              height="110"
              viewBox="0 0 180 110"
              style={{ outline: "none", display: "block" }}
            >
              <defs>
                <linearGradient id="kvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* track */}
              <path
                d="M 20 95 A 70 70 0 0 1 160 95"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* fill ~112% of arc */}
              <path
                d="M 20 95 A 70 70 0 0 1 152 72"
                fill="none"
                stroke="url(#kvGrad)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <text
                x="90"
                y="84"
                textAnchor="middle"
                fill="white"
                fontSize="24"
                fontWeight="700"
                fontFamily="Inter"
              >
                112%
              </text>
              <text
                x="90"
                y="100"
                textAnchor="middle"
                fill="rgba(255,255,255,0.35)"
                fontSize="9"
                fontFamily="Inter"
              >
                über KV-Minimum
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: "KV-Minimum", value: "€ 2.450", sub: "brutto" },
              { label: "Angebot", value: "€ 2.750", sub: "brutto" },
              { label: "Netto ca.", value: "€ 2.100", sub: "netto" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5"
              >
                <p className="text-xs text-white/35">{s.label}</p>
                <p className="text-sm font-bold text-white mt-1">{s.value}</p>
                <p className="text-[10px] text-white/25">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/35">
            <MapPin className="h-3 w-3" />
            <span>Wien · Handel KV · Stufe 3</span>
            <Clock className="h-3 w-3 ml-auto" />
            <span>Vollzeit</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   TRUST — professional icons, no "16-Jährigen" claim
───────────────────────────────────────────────────────────── */
function Trust() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-white/8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Shield,
            title: "Daten bleiben in der EU",
            desc: "Alles wird in Frankfurt gespeichert. Wir verkaufen keine Daten und geben nichts an Dritte weiter.",
          },
          {
            icon: Smartphone,
            title: "Funktioniert am Handy",
            desc: "Lebenslauf erstellen, Jobs suchen, bewerben — alles direkt am Handy. Kein Laptop nötig.",
          },
          {
            icon: Search,
            title: "Täglich aktualisiert",
            desc: "Neue Stellen werden täglich von karriere.at, ams.at und willhaben.at eingelesen. Du siehst immer aktuelle Inserate.",
          },
        ].map((item) => (
          <div key={item.title} className="glass-card rounded-2xl p-6">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 bg-white/5 border border-white/10">
              <item.icon className="h-5 w-5 text-white/60" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRICING — no yearly toggle, verified features only
───────────────────────────────────────────────────────────── */
function Pricing() {
  const APP_URL = "https://app.jobassist.at";

  const tiers = [
    {
      name: "Basic",
      price: "Kostenlos",
      cadence: "",
      desc: "Zum Ausprobieren. Keine Kreditkarte.",
      features: [
        "3 Bewerbungen pro Monat",
        "Job-Suche (karriere.at, ams.at)",
        "Basis Gehalts-Check",
        "Lebenslauf-Assistent",
      ],
      cta: "Kostenlos starten",
      href: `${APP_URL}/register`,
      highlight: false,
    },
    {
      name: "Pro",
      price: "€ 4,99",
      cadence: "/ Monat",
      desc: "Für alle, die schnell einen Job finden wollen.",
      features: [
        "Unbegrenzte Bewerbungen",
        "Anschreiben auf Deutsch",
        "Voller KV-Check",
        "Bewerbungs-Tracker",
        "Interview-Vorbereitung",
      ],
      cta: "Pro wählen",
      href: `${APP_URL}/register?plan=pro`,
      highlight: true,
    },
    {
      name: "Max",
      price: "€ 7,99",
      cadence: "/ Monat",
      desc: "Alles aus Pro, plus direkter Support.",
      features: ["Alles aus Pro", "Direkter Support per Chat", "Früher Zugang zu neuen Features"],
      cta: "Max wählen",
      href: `${APP_URL}/register?plan=max`,
      highlight: false,
    },
  ];

  return (
    <section id="preise" className="c3-pricing-section">
      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Preise</span>
        </div>
      </div>

      <div className="c3-grid">
        {tiers.map((t) => (
          <div key={t.name} className={`c3-card ${t.highlight ? "c3-card-pro" : ""}`}>
            {t.highlight && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#00d2ff",
                  background: "rgba(0,210,255,0.1)",
                  border: "1px solid rgba(0,210,255,0.2)",
                  borderRadius: "100px",
                  padding: "2px 10px",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Beliebt
              </span>
            )}
            <p className="c3-tier-small">{t.name}</p>
            <p className="c3-tier-large">
              {t.price}
              {t.cadence && (
                <span
                  style={{
                    fontSize: "1rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 400,
                    marginLeft: "4px",
                  }}
                >
                  {t.cadence}
                </span>
              )}
            </p>
            <p className="c3-desc">{t.desc}</p>
            <ul className="c3-list">
              {t.features.map((f) => (
                <li key={f}>
                  <span className="c3-check">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={t.href} className="c3-btn">
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAQ
───────────────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: "Ist JobAssist wirklich kostenlos?",
      a: "Ja. Basic ist kostenlos — 3 Bewerbungen pro Monat, ohne Kreditkarte. Du zahlst nur, wenn du mehr willst.",
    },
    {
      q: "Für wen ist das?",
      a: "Für Jugendliche in Österreich, die ihren ersten Job suchen — Lehre, Praktikum, Samstagsjob oder Ferialjob.",
    },
    {
      q: "Wie funktioniert der KV-Check?",
      a: "Wir lesen das Inserat, erkennen Branche und Einstufung und vergleichen mit dem aktuellen Kollektivvertrag. Du bekommst Brutto, Netto und Stundenlohn — sofort.",
    },
    {
      q: "Was passiert mit meinen Daten?",
      a: "Alles wird in der EU gespeichert (Frankfurt). Wir verkaufen nichts und geben keine Daten weiter — außer du schickst aktiv eine Bewerbung ab.",
    },
    {
      q: "Welche Jobbörsen werden durchsucht?",
      a: "karriere.at, ams.at und willhaben.at — täglich automatisch.",
    },
  ];

  return (
    <section
      id="faq"
      className="relative z-10 max-w-3xl mx-auto px-6 py-20 border-t border-white/8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Häufige Fragen</h2>
      </motion.div>

      <ul>
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.q} className="border-t border-white/8">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left gap-4"
              >
                <span className="text-sm font-semibold text-white">{it.q}</span>
                <span
                  className={`text-xl font-light text-white/35 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              {isOpen && <p className="pb-5 text-sm text-white/55 leading-relaxed">{it.a}</p>}
            </li>
          );
        })}
        <li className="border-t border-white/8" />
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────────────────────── */
function FinalCTA() {
  const APP_URL = "https://app.jobassist.at";
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-20 text-center"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, rgba(0,210,255,0.06), transparent 70%)",
          }}
        />
        <h2 className="relative text-3xl md:text-5xl font-bold tracking-tight leading-tight text-white">
          Starte jetzt.
          <br />
          Kostenlos.
        </h2>
        <p className="relative mt-5 text-white/50 max-w-sm mx-auto text-base leading-relaxed">
          Kein Lebenslauf? Kein Problem. Wir helfen dir von Anfang an.
        </p>
        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`${APP_URL}/register`}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-bold text-sm px-7 py-3.5 hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            Kostenlos starten
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="mailto:hallo@jobassist.at"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white font-medium text-sm px-6 py-3.5 hover:bg-white/5 transition-colors"
          >
            Frage stellen
          </a>
        </div>
        <p className="relative mt-4 text-xs text-white/25">
          Keine Kreditkarte · Kein Abo · Sofort loslegen
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOOTER — no description text
───────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/8 bg-black/20">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 text-xs text-white/25">© 2026 JobAssist · Wien</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
            Produkt
          </p>
          <ul className="space-y-2">
            {[
              { label: "Funktionen", href: "#funktionen" },
              { label: "KV-Check", href: "#kv-check" },
              { label: "Preise", href: "#preise" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
            Rechtliches
          </p>
          <ul className="space-y-2">
            {[
              { label: "Impressum", href: "/impressum" },
              { label: "Datenschutz", href: "/datenschutz" },
              { label: "AGB", href: "/agb" },
              { label: "Kontakt", href: "mailto:hallo@jobassist.at" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────────────────────── */
export function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white">
      <NoiseFilter />
      <BackgroundVideo />

      <Navbar />
      <Hero />
      <PartnerMarquee />
      <Features />
      <HowItWorks />
      <KVCheck />
      <Trust />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
