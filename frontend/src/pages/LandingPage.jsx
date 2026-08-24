import { useState, useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Check, ChevronDown, Search,
  Menu, X, Play,
  ShieldCheck, ExternalLink, Bookmark, MapPin, Briefcase,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

/* ═══════════════════════════════════════════════════════════════════════════
   JOBASSIST LANDING PAGE — Light-only, Austrian Red, Asymmetric Workflow
   ───────────────────────────────────────────────────────────────────────────
   Always light. Workflow canvas replaces six-card grid.
   Product UI is the artwork. Truth-grounded copy throughout.
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal(ref) {
  useEffect(() => {
    const root = ref?.current ?? document;
    const els = root.querySelectorAll(".lv5-reveal");
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("lv5-visible"); obs.unobserve(e.target); } }); },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ref]);
}

/* ───────────────────────────────────────────────────────────────
   NAVIGATION
   ─────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Funktionen", href: "#funktionen" },
  { label: "So funktioniert's", href: "#so-funktionierts" },
  { label: "KV-Check", href: "#kv-check" },
  { label: "Open Source", href: "#open-source" },
];

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      {/* Floating pill navbar — desktop */}
      <header className="lv5-header fixed top-3.5 left-1/2 -translate-x-1/2 z-50 hidden lg:block">
        <div className="rounded-full border bg-white px-1.5 py-1.5 flex items-center gap-1 shadow-[0_2px_16px_rgba(0,0,0,0.07)] border-[#e8e8e5]">
          <a href="#hero" className="flex items-center gap-2 flex-shrink-0 pl-2 pr-1" aria-label="JobAssist Startseite">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-[#e30613]">
              <span className="text-white text-[10px] font-bold leading-none">JA</span>
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[#111]">JobAssist</span>
          </a>
          <nav className="flex items-center gap-0.5" aria-label="Hauptnavigation">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="px-3 py-1.5 rounded-full text-[13.5px] font-medium text-[#565656] hover:text-[#111] transition-colors duration-150">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0 pl-1 pr-1">
            <Link to="/login" className="text-[13.5px] font-medium text-[#565656] hover:text-[#111] transition-colors duration-150 px-2 py-1.5">Anmelden</Link>
            <Link to="/register" className="inline-flex items-center h-[38px] px-4 rounded-full text-white text-[13.5px] font-semibold bg-[#e30613] hover:bg-[#c9000b] transition-colors duration-150">Kostenlos starten</Link>
          </div>
        </div>
      </header>

      {/* Mobile: static top bar */}
      <header className="lv5-header lg:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-[#e8e8e5]">
        <div className="flex items-center justify-between h-[60px] px-4">
          <a href="#hero" className="flex items-center gap-2.5 flex-shrink-0" aria-label="JobAssist Startseite">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-[#e30613]">
              <span className="text-white text-[10px] font-bold leading-none">JA</span>
            </span>
            <span className="text-[16px] font-bold tracking-[-0.02em] text-[#111]">JobAssist</span>
          </a>
          <div className="flex items-center gap-3">
            <Link to="/register" className="inline-flex items-center h-[36px] px-4 rounded-full text-white text-[13px] font-semibold bg-[#e30613] hover:bg-[#c9000b] transition-colors duration-150">Kostenlos starten</Link>
            <button type="button" onClick={() => setMobileOpen(true)} className="grid place-items-center w-10 h-10 rounded-sm text-[#111]" aria-label="Menü öffnen">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="fixed inset-y-0 right-0 z-[70] w-[85vw] max-w-sm flex flex-col bg-white lg:hidden">
            <div className="flex items-center justify-between h-[60px] px-4 border-b border-[#e8e8e5]">
              <span className="text-[16px] font-bold text-[#111]">JobAssist</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="grid place-items-center w-10 h-10 rounded-sm text-[#111]" aria-label="Menü schließen"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-sm text-[15px] font-medium text-[#111]">{l.label}</a>
              ))}
              <hr className="my-3 border-[#e8e8e5]" />
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-sm text-[15px] font-medium text-[#111]">Anmelden</Link>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

/* ───────────────────────────────────────────────────────────────
   DASHBOARD MOCKUP — light product preview
   ─────────────────────────────────────────────────────────────── */
const DASH_JOBS = [
  { role: "Marketing Manager (m/w/d)", company: "Sanitas GmbH", status: "Antwort erhalten", date: "12. Mai", color: "#4a6d94", bg: "rgba(110,143,181,.10)" },
  { role: "Projektleiter:in IT", company: "ÖBB-Infrastruktur AG", status: "Im Gespräch", date: "9. Mai", color: "#3f7a4a", bg: "rgba(93,159,104,.10)" },
  { role: "HR Generalist (m/w/d)", company: "ACCENTURE", status: "Eingereicht", date: "5. Mai", color: "#75591f", bg: "rgba(183,150,73,.10)" },
  { role: "Sales Specialist B2B", company: "Hilti Austria", status: "Gespeichert", date: "2. Mai", color: "#5a5a62", bg: "rgba(0,0,0,.04)" },
];

function DashboardMockup() {
  return (
    <div aria-hidden="true" className="rounded-lg overflow-hidden border w-full bg-white border-[#e8e8e5]" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.07)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-[#faf9f7] border-[#e8e8e5]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" /><div className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[11px] ml-1 text-[#6f6f6f]">Übersicht — JobAssist</span>
        <span className="ml-auto text-[10px] text-[#5c5c5c] bg-[#f0efec] px-2 py-0.5 rounded-sm">⌘K Suchen…</span>
      </div>
      <div className="flex" style={{ minHeight: "380px" }}>
        <div className="hidden md:flex flex-col w-[152px] flex-shrink-0 border-r p-3 gap-0.5 bg-[#faf9f7] border-[#f0f0ed]">
          {["Dashboard","Stellen","Lebenslauf","Anschreiben","Alerts"].map((item) => (
            <div key={item} className="text-[11px] px-2 py-1.5 rounded-sm" style={{ color: item === "Dashboard" ? "#111" : "#5f5f5f", background: item === "Dashboard" ? "#fff" : "transparent", fontWeight: item === "Dashboard" ? 600 : 400 }}>{item}</div>
          ))}
          <div className="mt-auto border-t pt-3 border-[#f0f0ed]">
            <div className="text-[11px] px-2 py-1.5 rounded-sm text-[#5f5f5f]">⚙ Einstellungen</div>
            <div className="flex items-center gap-2 px-2 py-1.5 mt-1 text-[#5f5f5f] text-[11px]">
              <div className="w-5 h-5 rounded-full bg-[#6152F3] grid place-items-center text-[9px] text-white font-bold">L</div>
              <span>Lisa M.</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-5 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f6f6f] mb-1">Sonntag, 23. Aug.</p>
          <p className="text-[14px] font-semibold text-[#111]">Guten Morgen, Lisa!</p>
          <p className="text-[12px] mt-0.5 text-[#5f5f5f]">Hier ist deine aktuelle Übersicht.</p>
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[{v:"12",l:"Bewerbungen"},{v:"4",l:"Antworten"},{v:"2",l:"Gespräche"},{v:"1",l:"Angebote"}].map(m => (
              <div key={m.l} className="text-center">
                <div className="text-[26px] font-bold leading-none tracking-[-0.03em] text-[#111]">{m.v}</div>
                <div className="text-[11px] mt-1 leading-tight text-[#5f5f5f]">{m.l}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mt-5 mb-2.5 text-[#6f6f6f]">Letzte Bewerbungen</p>
          {DASH_JOBS.map((j) => (
            <div key={j.role} className="flex items-center gap-3 py-2.5 border-b border-[#f0f0ed] last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate text-[#111]">{j.role}</div>
                <div className="text-[11px] mt-0.5 text-[#5f5f5f]">{j.company}</div>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-sm flex-shrink-0" style={{ background: j.bg, color: j.color }}>{j.status}</span>
              <span className="text-[11px] flex-shrink-0 hidden sm:inline text-[#6f6f6f]">{j.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   FLOATING KV CARD
   ─────────────────────────────────────────────────────────────── */
function FloatingKvCard() {
  return (
    <div aria-hidden="true" className="rounded-[6px] border bg-white p-4 w-[200px] flex-shrink-0 border-[#e8e8e5]"
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-[#e30613]" />
        <span className="text-[11px] font-bold text-[#111]">KV-Check</span>
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[#6f6f6f] mb-0.5">Handel · Sachbearbeiter:in</div>
      <div className="text-[26px] font-bold tracking-[-0.03em] text-[#111] mt-1">2.548 €</div>
      <div className="text-[10px] text-[#5f5f5f] mt-0.5">Brutto / Monat (Vollzeit)</div>
      <div className="text-[9px] text-[#6f6f6f] mt-1.5">WKO-Daten 2025</div>
      <div className="mt-2 pt-2 border-t border-[#e8e8e5] flex items-end gap-[2px] h-[24px]">
        {[8,12,16,22,24].map((h, i) => (
          <div key={i} className="w-[9px] rounded-t-[1px]" style={{ height: `${h}px`, background: i === 4 ? "#e30613" : "#fff1f1" }} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   REPO PREVIEW
   ─────────────────────────────────────────────────────────────── */
function RepoPreview() {
  return (
    <div className="rounded-[6px] border bg-white overflow-hidden border-[#e8e8e5]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-[#faf9f7] border-[#e8e8e5]">
        <svg className="w-3.5 h-3.5 text-[#5f5f5f]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
        <span className="text-[12px] font-medium text-[#111]">davorrr/JobAssist</span>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-sm text-[#e30613] bg-[#fff1f1]">AGPL-3.0</span>
      </div>
      <div className="p-4 font-mono text-[11.5px] leading-relaxed text-[#565656]">
        <div className="text-[#111]">JobAssist/</div>
        <div className="ml-3">├── backend/</div><div className="ml-3">├── frontend/</div><div className="ml-3">├── docs/</div>
        <div className="ml-3">├── extension/</div><div className="ml-3">├── README.md</div><div className="ml-3">└── LICENSE</div>
      </div>
      <div className="px-4 pb-4 flex flex-wrap gap-1.5">
        {["React","FastAPI","PostgreSQL","AGPL-3.0"].map(t => (
          <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-sm text-[#5f5f5f] bg-[#f6f6f4]">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   WORKFLOW CANVAS — asymmetric product UI storytelling
   ─────────────────────────────────────────────────────────────── */

const WORKFLOW_CARD = "rounded-[6px] border bg-white border-[#e8e8e5]";

function WorkflowCanvas() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── 01: Lebenslauf (tall left column) ──────────────── */}
        <div className={`lg:col-span-3 lv5-reveal lv5-delay-2 ${WORKFLOW_CARD}`} style={{ minHeight: "280px" }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#f0f0ed]">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">01</span>
            <span className="text-[12px] font-bold text-[#111]">Lebenslauf</span>
          </div>
          <div className="p-4 text-[12px] leading-relaxed">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-14 rounded-sm bg-[#e0e0e0] grid place-items-center text-[18px] font-bold text-[#999]">LM</div>
              <div>
                <div className="font-semibold text-[#111] text-[13px]">Lisa Muster</div>
                <div className="text-[#5f5f5f] text-[11px]">Projektmanagerin</div>
                <div className="text-[#6f6f6f] text-[10px]">Wien, Österreich</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f] mb-1">Über mich</div>
                <div className="text-[#565656] text-[11px] leading-[1.5]">Organisierte Projektmanagerin mit 5+ Jahren Erfahrung in der Digitalwirtschaft.</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f] mb-1">Erfahrung</div>
                <div className="text-[#111] text-[11px] font-medium">Senior PM · TechCorp</div>
                <div className="text-[#6f6f6f] text-[10px]">2021 – heute</div>
                <div className="text-[#111] text-[11px] font-medium mt-1.5">Junior PM · StartUp AG</div>
                <div className="text-[#6f6f6f] text-[10px]">2019 – 2021</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f] mb-1">Bildung</div>
                <div className="text-[#111] text-[11px] font-medium">M.Sc. BWL · WU Wien</div>
                <div className="text-[#6f6f6f] text-[10px]">2017 – 2019</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 02: Jobs finden (wide top center) ────────────────── */}
        <div className={`lg:col-span-6 lv5-reveal lv5-delay-2 ${WORKFLOW_CARD}`}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#f0f0ed]">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">02</span>
            <span className="text-[12px] font-bold text-[#111]">Jobs finden</span>
          </div>
          <div className="p-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-medium px-2 py-1 rounded-sm bg-[#fff1f1] text-[#e30613]">IT</span>
              <span className="text-[11px] font-medium px-2 py-1 rounded-sm bg-[#fff1f1] text-[#e30613]">Wien</span>
              <span className="text-[11px] font-medium px-2 py-1 rounded-sm bg-[#fff1f1] text-[#e30613]">Praktikum</span>
              <div className="flex items-center gap-1 flex-1 min-w-0 ml-1 h-[28px] rounded-[3px] border border-[#e8e8e5] px-2.5 text-[11px] text-[#6f6f6f]">
                <Search className="w-3 h-3" /> Stichwort, Firma...
              </div>
            </div>
            {/* Source pills */}
            <div className="flex items-center gap-1.5 mb-3">
              {["karriere.at","willhaben","AMS"].map(s => (
                <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-[#f6f6f4] text-[#5f5f5f]">{s}</span>
              ))}
            </div>
            {/* Job rows */}
            <div className="space-y-0 divide-y divide-[#f0f0ed]">
              {[
                { role:"IT Projektmanager:in", company:"Erste Digital GmbH", type:"Vollzeit", when:"vor 2 Std." },
                { role:"Praktikum Software Development", company:"Dynatrace", type:"Praktikum", when:"vor 1 Tag" },
                { role:"Business Analyst", company:"Raiffeisen", type:"Vollzeit", when:"vor 3 Tagen" },
              ].map(j => (
                <div key={j.role} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate text-[#111]">{j.role}</div>
                    <div className="flex items-center gap-2 text-[10.5px] text-[#5f5f5f] mt-0.5">
                      <span>{j.company}</span>
                      <span className="text-[#e8e8e5]">·</span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />Wien</span>
                      <span className="text-[#e8e8e5]">·</span>
                      <span className="flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{j.type}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6f6f6f] flex-shrink-0">{j.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 02A: Job speichern (small right popover) ────────── */}
        <div className={`lg:col-span-3 lv5-reveal lv5-delay-3 ${WORKFLOW_CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">02A</span>
            <span className="text-[11px] font-bold text-[#111]">Job speichern</span>
          </div>
          <div className="rounded-[4px] border border-[#e30613]/20 bg-[#fff1f1]/50 p-3">
            <Bookmark className="w-4 h-4 text-[#e30613] mb-1.5" />
            <div className="text-[11px] font-semibold text-[#111]">Stelle gespeichert</div>
            <div className="text-[12px] font-medium text-[#111] mt-1">IT Projektmanager:in</div>
            <div className="text-[11px] text-[#5f5f5f]">Erste Digital GmbH</div>
            <div className="mt-2 pt-2 border-t border-[#e30613]/15">
              <span className="text-[10px] font-medium text-[#e30613]">Zur Stellenübersicht →</span>
            </div>
          </div>
        </div>

        {/* ── 03: KV-Check (bottom left) ────────────────────── */}
        <div className={`lg:col-span-3 lv5-reveal lv5-delay-3 ${WORKFLOW_CARD} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">03</span>
            <span className="text-[11px] font-bold text-[#111]">KV-Gehalts-Check</span>
          </div>
          <div className="space-y-2">
            {[
              {l:"Branche",v:"Handel"},{l:"Position",v:"Sachbearbeiter:in"},{l:"Stundenausmaß",v:"38,5 h / Woche"},{l:"Stufe",v:"III / 3. Jahr"}
            ].map(f => (
              <div key={f.l}>
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#6f6f6f] mb-0.5">{f.l}</div>
                <div className="h-[28px] rounded-[3px] border border-[#e8e8e5] px-2 flex items-center text-[11px] text-[#111]">{f.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#f0f0ed] flex items-end justify-between">
            <div>
              <div className="text-[28px] font-bold tracking-[-0.04em] text-[#111]">2.548 €</div>
              <div className="text-[10px] text-[#5f5f5f]">Brutto / Monat (Vollzeit)</div>
            </div>
            <div className="flex items-end gap-[2px] h-[28px]">
              {[8,14,18,24,28].map((h,k) => (
                <div key={k} className="w-[10px] rounded-t-[1px]" style={{height:`${h}px`,background:k===4?"#e30613":"#fff1f1"}} />
              ))}
            </div>
          </div>
        </div>

        {/* ── 04: Anschreiben (bottom center) ────────────────── */}
        <div className={`lg:col-span-5 lv5-reveal lv5-delay-4 ${WORKFLOW_CARD}`}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#f0f0ed]">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">04</span>
            <span className="text-[12px] font-bold text-[#111]">Anschreiben</span>
          </div>
          <div className="p-4">
            {/* Mini toolbar */}
            <div className="flex items-center gap-1 mb-3 pb-2 border-b border-[#f0f0ed]">
              {["B","I","U","·","Link","·","AI ✦"].map(b => (
                <span key={b} className="text-[10px] px-1.5 py-0.5 rounded-sm text-[#5f5f5f] hover:text-[#111] cursor-default">{b}</span>
              ))}
            </div>
            <div className="text-[11px] leading-relaxed text-[#565656] space-y-2">
              <p className="font-semibold text-[#111] text-[12px]">Sehr geehrte Damen und Herren,</p>
              <p>mit großem Interesse habe ich Ihre Stellenausschreibung für die Position <span className="text-[#111] font-medium">IT Projektmanager:in</span> bei <span className="text-[#111] font-medium">Erste Digital GmbH</span> gelesen.</p>
              <p>In meiner aktuellen Position als Senior Projektmanagerin bei TechCorp konnte ich umfassende Erfahrung in der Leitung digitaler Transformationsprojekte sammeln — von der Konzeption bis zur erfolgreichen Implementierung.</p>
              <p className="font-medium text-[#111]">Mit freundlichen Grüßen</p>
              <p className="text-[#111]">Lisa Muster</p>
            </div>
          </div>
        </div>

        {/* ── 05: Bewerbungen verfolgen (bottom right) ─────────── */}
        <div className={`lg:col-span-4 lv5-reveal lv5-delay-4 ${WORKFLOW_CARD}`}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#f0f0ed]">
            <span className="text-[10px] font-mono font-bold text-[#e30613] bg-[#fff1f1] w-5 h-5 rounded-sm grid place-items-center">05</span>
            <span className="text-[12px] font-bold text-[#111]">Bewerbungen verfolgen</span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1 mb-3 overflow-x-auto" tabIndex={0} role="group" aria-label="Anwendungs-Vorschau">
              {["Alle","Eingereicht","Im Gespräch","Antwort erhalten","Archiviert"].map((tab,i) => (
                <span key={tab} className="text-[10px] font-medium px-2 py-1 rounded-[3px] whitespace-nowrap cursor-default"
                  style={{color:i===0?"#111":"#5f5f5f",background:i===0?"#f6f6f4":"transparent"}}>{tab}</span>
              ))}
            </div>
            <div className="divide-y divide-[#f0f0ed]">
              {[
                {role:"Marketing Manager",co:"Sanitas GmbH",s:"Antwort erhalten",d:"12. Mai",c:"#4a6d94",bg:"rgba(110,143,181,.10)"},
                {role:"Projektleiter:in IT",co:"ÖBB-Infrastruktur AG",s:"Im Gespräch",d:"9. Mai",c:"#3f7a4a",bg:"rgba(93,159,104,.10)"},
                {role:"HR Generalist",co:"ACCENTURE",s:"Eingereicht",d:"5. Mai",c:"#75591f",bg:"rgba(183,150,73,.10)"},
              ].map(r => (
                <div key={r.role} className="flex items-center gap-2 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium truncate text-[#111]">{r.role}</div>
                    <div className="text-[10.5px] text-[#5f5f5f]">{r.co}</div>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex-shrink-0" style={{background:r.bg,color:r.c}}>{r.s}</span>
                  <span className="text-[10px] text-[#6f6f6f] flex-shrink-0 hidden sm:inline">{r.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   FAQ — two independent columns (no shared grid rows)
   ─────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { id: "open-source", q: "Ist JobAssist wirklich Open Source?", a: "Ja. Unter der AGPL-3.0. Der gesamte Quellcode ist öffentlich auf GitHub einsehbar — verwenden, verändern, selbst hosten." },
  { id: "self-host", q: "Kann ich JobAssist selbst hosten?", a: "Ja. Python 3.11+, Node.js 20+, PostgreSQL und ein Groq API-Schlüssel. Die Dokumentation beschreibt die lokale Installation." },
  { id: "sources", q: "Welche Jobbörsen durchsucht ihr?", a: "Karriere.at, willhaben.at und AMS direkt, plus Adzuna und Jooble für weitere österreichische Quellen." },
  { id: "data", q: "Was passiert mit meinen Daten?", a: "Kein Verkauf, keine Weitergabe an Dritte. Daten verlassen die Plattform nur bei aktiver Bewerbung." },
  { id: "free", q: "Ist JobAssist kostenlos?", a: "Ja. Alle Funktionen sind ohne Kosten nutzbar. Keine Paywall, keine Abos — Open Source." },
  { id: "contribute", q: "Kann ich mitentwickeln?", a: "Ja. Bugs melden, Scraper reparieren, Features beitragen. Pull Requests willkommen im Repository." },
];

const FAQ_LEFT = FAQ_ITEMS.filter((_, i) => i % 2 === 0);  // 0, 2, 4
const FAQ_RIGHT = FAQ_ITEMS.filter((_, i) => i % 2 === 1); // 1, 3, 5

function FaqItem({ question, answer, open, onToggle }) {
  return (
    <div className="border-b border-[#e8e8e5]">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-3.5 text-left gap-3 group" aria-expanded={open}>
        <span className="text-[13.5px] font-medium transition-colors duration-150" style={{ color: open ? "#111" : "#565656" }}>{question}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300" style={{ color: open ? "#e30613" : "#9a9a9a", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <div className={`lv5-faq-answer ${open ? "lv5-open" : ""}`}>
        <div><p className="pb-3.5 pr-6 text-[12.5px] leading-relaxed text-[#5f5f5f]">{answer}</p></div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   SECTION WRAPPER
   ─────────────────────────────────────────────────────────────── */
function Section({ children, id, bg }) {
  return (
    <section id={id} className="py-[72px] md:py-[88px]" style={{ background: bg || "#ffffff" }}>
      <div className="mx-auto max-w-[1240px] px-4 md:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const [faqOpen, setFaqOpen] = useState(null);
  const mainRef = useRef(null);

  useReveal(mainRef);

  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div ref={mainRef} className="landing-v5 relative min-h-screen antialiased max-w-full overflow-x-hidden">
      <Nav />
      <main>
        {/* ═══ HERO ══════════════════════════════════════════════════ */}
        <section id="hero" className="relative pt-[100px] pb-[48px] md:pt-[112px] md:pb-[56px] overflow-hidden bg-white">
          <div className="mx-auto max-w-[1280px] px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-start min-w-0">
              <div className="lg:col-span-5 min-w-0">
                <div className="lv5-reveal flex items-center gap-2 mb-4">
                  <span aria-hidden className="block w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "7px solid #e30613" }} />
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#e30613]">Für Österreich. Für deine Karriere.</span>
                </div>
                <h1 className="lv5-reveal lv5-delay-1 font-bold tracking-[-0.045em] leading-[0.98] text-balance text-[#111]"
                  style={{ fontSize: "clamp(2.5rem, 5.5vw, 3.875rem)", maxWidth: "500px" }}>
                  Bewerbungen.<br />Einfach gemacht.
                </h1>
                <p className="lv5-reveal lv5-delay-2 mt-4 text-[15.5px] leading-[1.6] max-w-[440px] text-[#565656]">
                  JobAssist unterstützt dich bei jedem Schritt deiner Bewerbung — vom Lebenslauf bis Gehaltscheck.
                </p>
                <ul className="lv5-reveal lv5-delay-3 mt-5 space-y-2">
                  {[
                    "Lebenslauf & Anschreiben in Minuten erstellen",
                    "Stellen auf unterstützten österreichischen Jobbörsen finden",
                    "Gehalt mit Kollektivvertrag-Richtsätzen vergleichen",
                    "Bewerbungen und Rückmeldungen an einem Ort verfolgen",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#565656]">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#e30613]" />{item}
                    </li>
                  ))}
                </ul>
                <div className="lv5-reveal lv5-delay-4 mt-7 flex flex-col sm:flex-row items-start gap-3">
                  <Link to="/register" className="inline-flex items-center h-[44px] px-6 rounded-[3px] text-white text-[14px] font-semibold bg-[#e30613] hover:bg-[#c9000b] transition-colors duration-150">Kostenlos starten</Link>
                  <a href="#funktionen" className="inline-flex items-center gap-2 h-[44px] px-6 rounded-[3px] border border-[#dcdcd8] text-[14px] font-medium text-[#111] hover:border-[#e30613] transition-colors duration-150">
                    <Play className="w-3 h-3" /> So funktioniert&apos;s
                  </a>
                </div>
                <div className="lv5-reveal lv5-delay-4 mt-5 flex items-center gap-3 text-[12px] text-[#6f6f6f]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Transparent. Open Source. AGPL-3.0.</span>
                  <span aria-hidden className="w-px h-3 bg-[#e8e8e5]" />
                  <a href="https://github.com/davorrr/JobAssist" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline text-[#4f4f4f]">Quellcode auf GitHub</a>
                </div>
              </div>
              <div className="lg:col-span-7 lv5-reveal lv5-delay-2 min-w-0">
                <DashboardMockup />
                <div className="flex justify-end -mt-[80px] mr-[6px] relative z-10">
                  <FloatingKvCard />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-[56px] md:mt-[64px] mx-auto max-w-[1240px] px-4 md:px-6 lg:px-8">
            <hr className="border-[#e8e8e5]" />
          </div>
        </section>

        {/* ═══ WORKFLOW — replaces old feature grid + product demo ══ */}
        <Section id="funktionen" bg="#faf9f7">
          <div className="lv5-reveal text-center mb-3">
            <div className="flex items-center justify-center gap-2">
              <span aria-hidden className="block w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "7px solid #e30613" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#e30613]">Alles, was du für deine Bewerbung brauchst</span>
            </div>
          </div>
          <h2 className="lv5-reveal lv5-delay-1 text-center font-semibold tracking-[-0.03em] leading-[1.1] text-[#111] mb-10 md:mb-14"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.125rem)" }}>
            Ein Ablauf. Alle Werkzeuge.
          </h2>
          <WorkflowCanvas />
        </Section>

        {/* ═══ OPEN SOURCE — warm off-white ═════════════════════════ */}
        <Section id="open-source" bg="#ffffff">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-w-0">
            <div className="lg:col-span-6 min-w-0 lv5-reveal">
              <div className="flex items-center gap-2 mb-3">
                <span aria-hidden className="block w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "7px solid #e30613" }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#e30613]">Open Source</span>
              </div>
              <h2 className="font-semibold tracking-[-0.03em] leading-[1.1] text-[#111]" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.125rem)" }}>Offen. Transparent. Für alle.</h2>
              <p className="mt-3 text-[15px] leading-relaxed max-w-[480px] text-[#565656]">
                JobAssist ist Open Source unter der AGPL-3.0. Der Quellcode ist öffentlich einsehbar, Beiträge sind willkommen und du kannst JobAssist auch selbst betreiben.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href="https://github.com/davorrr/JobAssist" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-[42px] px-5 rounded-[3px] border border-[#111] text-[13px] font-semibold text-[#111] hover:bg-[#111] hover:text-white transition-colors duration-150">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                  Auf GitHub ansehen
                </a>
                <a href="https://github.com/davorrr/JobAssist#readme" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-[#5f5f5f] hover:text-[#111] transition-colors">Dokumentation →</a>
              </div>
              <div className="mt-5 pt-3 border-t border-[#e8e8e5] flex flex-wrap items-center gap-3">
                <span className="text-[12px] font-medium text-[#111]">Mitentwickeln?</span>
                <span className="text-[12px] text-[#5f5f5f]">Bugs melden, Scraper reparieren oder neue Features beitragen.</span>
                <a href="https://github.com/davorrr/JobAssist" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#e30613] hover:text-[#c9000b] transition-colors duration-150">Zum Repository <ExternalLink className="w-3 h-3" /></a>
              </div>
            </div>
            <div className="lg:col-span-6 lv5-reveal lv5-delay-2 min-w-0"><RepoPreview /></div>
          </div>
        </Section>

        {/* ═══ FAQ — two independent columns ══════════════════════ */}
        <Section id="faq" bg="#faf9f7">
          <h2 className="lv5-reveal text-center font-semibold tracking-[-0.03em] leading-[1.1] mb-8 md:mb-10 text-[#111]"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.125rem)" }}>Häufige Fragen</h2>
          <div className="lv5-reveal grid grid-cols-1 md:grid-cols-2 gap-x-8 max-w-[960px] mx-auto">
            <div>
              {FAQ_LEFT.map((item) => (
                <FaqItem key={item.id} question={item.q} answer={item.a} open={faqOpen === item.id} onToggle={() => setFaqOpen(faqOpen === item.id ? null : item.id)} />
              ))}
            </div>
            <div>
              {FAQ_RIGHT.map((item) => (
                <FaqItem key={item.id} question={item.q} answer={item.a} open={faqOpen === item.id} onToggle={() => setFaqOpen(faqOpen === item.id ? null : item.id)} />
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ FINAL CTA — light red/pink container ═══════════════ */}
        <Section bg="#ffffff">
          <div className="lv5-reveal rounded-[8px] border border-[#e30613]/15 p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            style={{ background: "#fdf2f2" }}>
            <div className="max-w-[540px]">
              <h2 className="font-semibold tracking-[-0.03em] leading-[1.15] text-[#111]"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>Bereit für deinen nächsten Karriereschritt?</h2>
              <p className="mt-2 text-[15px] text-[#565656]">Erstelle dein Profil und starte deine nächste Bewerbung mit JobAssist.</p>
            </div>
            <div className="flex-shrink-0 text-center sm:text-right">
              <Link to="/register" className="inline-flex items-center h-[48px] px-8 rounded-[3px] text-white text-[15px] font-semibold bg-[#e30613] hover:bg-[#c9000b] transition-colors duration-150">Kostenlos starten</Link>
              <p className="mt-2 text-[12px] text-[#6f6f6f]">Keine Kreditkarte · Keine Paywall · Open Source</p>
            </div>
          </div>
        </Section>
      </main>

      {/* ═══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="py-14 md:py-16 bg-[#f7f6f3]">
        <div className="mx-auto max-w-[1240px] px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 min-w-0">
            <div className="col-span-2 md:col-span-4 min-w-0">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="grid h-7 w-7 place-items-center rounded-sm bg-[#e30613]"><span className="text-white text-[10px] font-bold leading-none">JA</span></span>
                <span className="text-[16px] font-bold tracking-[-0.02em] text-[#111]">JobAssist</span>
              </div>
              <p className="text-[13px] text-[#5f5f5f]">Bewerbungstools für den österreichischen Arbeitsmarkt.</p>
              <p className="text-[12px] mt-3 text-[#6f6f6f]">Open Source · AGPL-3.0</p>
              <p className="text-[12px] mt-1 text-[#6f6f6f]">© {new Date().getFullYear()} JobAssist</p>
            </div>
            <div className="md:col-span-2 min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 text-[#6f6f6f]">Produkt</h4>
              <div className="flex flex-col gap-2">
                {[{label:"Funktionen",href:"#funktionen"},{label:"KV-Check",href:"#funktionen"},{label:"Jobbörsen",href:"#funktionen"},{label:"Bewerbungs-Tracker",href:"#funktionen"}].map(l=>(
                  <a key={l.label} href={l.href} className="text-[13px] text-[#5f5f5f] hover:text-[#111] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 text-[#6f6f6f]">Open Source</h4>
              <div className="flex flex-col gap-2">
                {[{label:"GitHub",href:"https://github.com/davorrr/JobAssist"},{label:"Dokumentation",href:"https://github.com/davorrr/JobAssist#readme"},{label:"Lizenz (AGPL-3.0)",href:"https://github.com/davorrr/JobAssist/blob/main/LICENSE"}].map(l=>(
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#5f5f5f] hover:text-[#111] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 text-[#6f6f6f]">Ressourcen</h4>
              <div className="flex flex-col gap-2">
                {[{label:"So funktioniert's",href:"#funktionen"},{label:"FAQ",href:"#faq"},{label:"Open Source",href:"#open-source"}].map(l=>(
                  <a key={l.label} href={l.href} className="text-[13px] text-[#5f5f5f] hover:text-[#111] transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 min-w-0">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 text-[#6f6f6f]">Rechtliches</h4>
              <div className="flex flex-col gap-2 mb-4">
                {[{label:"Datenschutz",to:"/privacy"},{label:"AGB",to:"/terms"},{label:"Impressum",to:"/impressum"}].map(l=>(
                  <Link key={l.label} to={l.to} className="text-[13px] text-[#5f5f5f] hover:text-[#111] transition-colors">{l.label}</Link>
                ))}
              </div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 text-[#6f6f6f]">Kontakt</h4>
              <a href="mailto:hallo@jobassist.tech" className="text-[13px] text-[#5f5f5f] hover:text-[#111] transition-colors">hallo@jobassist.tech</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}