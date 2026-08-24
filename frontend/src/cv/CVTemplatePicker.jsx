import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Template definitions shown in the picker.
 * `id` is stored in profile.templateId and used by the PDF generator.
 */
export const TEMPLATES = [
  { id: "gray-header",   label: "Klassisch",      desc: "Diskret, übersichtlich — passt zu traditionellen österreichischen Arbeitgebern" },
  { id: "slim-sidebar",  label: "Modern",         desc: "Klare Typografie mit Seitenleiste — frisch und zeitgemäß" },
  { id: "tabellarisch",  label: "Kompakt",         desc: "Effizientes Layout für viel Erfahrung auf einer Seite" },
  { id: "dark-bands",    label: "Elegant",         desc: "Strukturierte Abschnitte mit typografischem Charakter" },
];

// ─── A4 dimensions for scaling ────────────────────────────────────────────────
const INNER_W = 595;  // A4 render width (pt)
const INNER_H = 842;  // A4 render height

// ─── Shared data helpers ──────────────────────────────────────────────────────
function profileName(p) { return [p.vorname, p.nachname].filter(Boolean).join(" ") || "Dein Name"; }
function profileContact(p) {
  return [p.email, p.telefon ? `+43 ${p.telefon}` : null].filter(Boolean).join("  ·  ");
}
function profileAddress(p) {
  return [[p.plz, p.ort].filter(Boolean).join(" "), p.strasse].filter(Boolean).join(", ");
}
function profileSchool(p) { return [p.schultyp, p.schulname].filter(Boolean).join(" — "); }
function profileJobs(p)   { return (p.erfahrungen || []).filter(j => j.organisation).sort((a, b) => (b.von || "").localeCompare(a.von || "")).slice(0, 3); }
function profileLangs(p)  { return (p.sprachkenntnisse || []).filter(l => l.sprache).slice(0, 3); }
function profileSkills(p) { return (p.faehigkeiten || []).slice(0, 6); }
function profileWeiterbildungen(p) { return (p.weiterbildungen || []).slice(0, 3); }
function profileAktivitaeten(p) { return (p.aktivitaeten || []).slice(0, 3); }
function fmtIsoDate(iso) {
  if (!iso) return "";
  const s = String(iso).trim();
  const [y, m, d] = s.split("-");
  if (!y || !m || isNaN(Number(y))) return s; // not ISO, return raw
  return d && !isNaN(Number(d)) ? `${d}.${m}.${y}` : `${m}.${y}`;
}
function rangeLabel(von, bis) {
  if (!von) return "";
  const v = fmtIsoDate(von) || String(von);
  const b = bis ? (fmtIsoDate(bis) || String(bis)) : "heute";
  return `${v} — ${b}`;
}

// ─── Mini CV renders ──────────────────────────────────────────────────────────
// All inner divs: width 595px, rendered as white paper, scaled via transform.

function GrayHeaderCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const weiter = profileWeiterbildungen(p), aktiv = profileAktivitaeten(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "10px", lineHeight: 1.45, color: "#111" };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff" }}>
      <div style={{ background: "#f2f2f2", padding: "24px 32px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{profileName(p)}</div>
          <div style={{ fontSize: "9px", color: "#666", marginTop: 4 }}>{profileContact(p) || "E-Mail · Telefon"}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9px", color: "#555" }}>
          {fmtIsoDate(p.geburtsdatum)}{p.geburtsort ? `, ${p.geburtsort}` : ""}
          {(profileAddress(p) || "Wien, Österreich").split(", ").map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      <div style={{ padding: "26px 32px 40px" }}>
        {p.profil && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#4a6fa5", marginBottom: 8 }}>PROFIL</div>
            <div style={{ fontSize: "10px", borderBottom: "1px solid #e5e5e5", paddingBottom: 12 }}>{p.profil}</div>
          </div>
        )}
        {[
          ["AUSBILDUNG", school || "HTL · Klasse"],
          ...(weiter.length ? [["WEITERBILDUNG", weiter.map(w => `${w.name}${w.institution ? ` — ${w.institution}` : ""}${w.jahr ? ` (${w.jahr})` : ""}`).join(" · ")]] : []),
          ["BERUFSERFAHRUNG", jobs.length ? jobs.map(j => `${j.titel || j.art || "Tätigkeit"} — ${j.organisation}${j.von ? ` (${rangeLabel(j.von, j.bis)})` : ""}`).join(" · ") : "—"],
          ["SPRACHEN", langs.map(l => `${l.sprache}${l.niveau ? ` (${l.niveau})` : ""}`).join(" · ") || "Deutsch"],
          ["KENNTNISSE", skills.join(" · ") || "—"],
          ...(aktiv.length ? [["AKTIVITÄTEN", aktiv.map(a => `${a.name}${a.organisation ? ` — ${a.organisation}` : ""}`).join(" · ")]] : []),
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#4a6fa5", marginBottom: 8 }}>{lbl}</div>
            <div style={{ fontSize: "10px", borderBottom: "1px solid #e5e5e5", paddingBottom: 12 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlimSidebarCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const weiter = profileWeiterbildungen(p), aktiv = profileAktivitaeten(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "10px", lineHeight: 1.45, color: "#111" };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff", display: "flex", minHeight: INNER_H }}>
      <div style={{ width: 170, background: "#f0f0f0", padding: "24px 16px", flexShrink: 0 }}>
        {p.foto ? (
          <img src={p.foto} alt="" style={{ width: 80, height: 96, borderRadius: 2, margin: "0 auto 16px", display: "block", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 80, height: 96, background: "#d0d0d0", borderRadius: 2, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: "#999" }}>
            {(p.vorname || "D")[0]}{(p.nachname || "R")[0]}
          </div>
        )}
        {[["KONTAKT", [`${fmtIsoDate(p.geburtsdatum)}${p.geburtsort ? `, ${p.geburtsort}` : ""}`, profileAddress(p) || "Wien", p.email, p.telefon ? `+43 ${p.telefon}` : null].filter(Boolean)],
          ["SPRACHEN", langs.map(l => `${l.sprache}${l.niveau ? ` — ${l.niveau}` : ""}`)],
          ["EDV", skills],
        ].map(([lbl, items]) => (
          <div key={lbl} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa", marginBottom: 6 }}>{lbl}</div>
            {(items.length ? items : ["—"]).map((it, i) => <div key={i} style={{ fontSize: "9px", color: "#444", marginBottom: 2 }}>{it}</div>)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "28px 22px 40px" }}>
        <div style={{ fontSize: "22px", fontWeight: 700 }}>{profileName(p)}</div>
        <div style={{ fontSize: "9px", color: "#666", marginBottom: 22, marginTop: 4 }}>{p.schultyp || "Schüler"} · {p.klasse || ""}</div>
        {p.profil && (
          <div style={{ marginBottom: 18, paddingBottom: 10, borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: "10px", lineHeight: 1.45 }}>{p.profil}</div>
          </div>
        )}
        {[
          ["AUSBILDUNG", school ? [`${school}${p.abschlussjahr ? ` — Abschluss geplant ${p.abschlussjahr}` : ""}`] : ["—"]],
          ...(weiter.length ? [["WEITERBILDUNG", weiter.map(w => `${w.name}${w.institution ? ` — ${w.institution}` : ""}${w.jahr ? ` (${w.jahr})` : ""}`)]] : []),
          ["BERUFSERFAHRUNG", jobs.length ? jobs.map(j => `${j.titel || j.art || "Tätigkeit"} — ${j.organisation}${j.von ? ` (${rangeLabel(j.von, j.bis)})` : ""}`) : ["—"]],
          ...(aktiv.length ? [["AKTIVITÄTEN", aktiv.map(a => `${a.name}${a.organisation ? ` — ${a.organisation}` : ""}`)]] : []),
        ].map(([lbl, rows]) => (
          <div key={lbl} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>{lbl}</div>
            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 8 }}>
              {rows.map((r, i) => <div key={i} style={{ fontSize: "10px", marginBottom: 4 }}>{r}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabellarischCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const weiter = profileWeiterbildungen(p), aktiv = profileAktivitaeten(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "10px", lineHeight: 1.45, color: "#111" };
  const TRow = ({ date, content }) => (
    <tr>
      <td style={{ width: 90, color: "#777", fontSize: "9px", paddingBottom: 8, verticalAlign: "top", paddingRight: 14 }}>{date}</td>
      <td style={{ paddingBottom: 8, verticalAlign: "top" }}>{content}</td>
    </tr>
  );
  const sections = [
    ["Ausbildung", [[p.abschlussjahr ? String(p.abschlussjahr - 4) : "2021", school || "HTL Spengergasse"]]],
    ...(weiter.length ? [["Weiterbildung", weiter.map(w => [w.jahr || "—", `${w.name}${w.institution ? ` — ${w.institution}` : ""}`])]] : []),
    ["Berufserfahrung", jobs.length ? jobs.map(j => [rangeLabel(j.von, j.bis) || "—", `${j.titel || j.art || "Tätigkeit"} — ${j.organisation}`]) : [["—", "—"]]],
    ["Sprachen", langs.length ? langs.map(l => [l.niveau || "Muttersprache", l.sprache]) : [["Muttersprache", "Deutsch"]]],
    ["EDV-Kenntnisse", skills.length ? [["", skills.join(", ")]] : [["—", "—"]]],
    ...(aktiv.length ? [["Aktivitäten", aktiv.map(a => [rangeLabel(a.von, a.bis) || "—", `${a.name}${a.organisation ? ` — ${a.organisation}` : ""}`])]] : []),
  ];
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff", padding: "32px 36px" }}>
      <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: 6 }}>{profileName(p)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "4px 16px", fontSize: "9px", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, color: "#555" }}>Geburtsdatum:</span><span>{fmtIsoDate(p.geburtsdatum) || "—"}{p.geburtsort ? `, ${p.geburtsort}` : ""}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>Telefon:</span><span>{p.telefon ? `+43 ${p.telefon}` : "—"}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>Adresse:</span><span>{profileAddress(p) || "Wien"}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>E-Mail:</span><span>{p.email || "—"}</span>
      </div>
      <div style={{ borderTop: "2px solid #111", marginBottom: 14 }} />
      {p.profil && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Profil</div>
          <div style={{ fontSize: "10px", lineHeight: 1.45 }}>{p.profil}</div>
        </div>
      )}
      {sections.map(([sec, rows]) => (
        <div key={sec} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{sec}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>{rows.map(([d, c], i) => <TRow key={i} date={d} content={c} />)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** Shared section wrapper for the dark-bands template (hoisted: stable identity). */
function DBSection({ title, children }) {
  return (
    <div key={title}>
      <div style={{ background: "#f5f5f5", padding: "6px 28px", fontSize: "8px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#888" }}>{title}</div>
      <div style={{ padding: "14px 28px" }}>{children}</div>
    </div>
  );
}

function DarkBandsCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const weiter = profileWeiterbildungen(p), aktiv = profileAktivitaeten(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "10px", lineHeight: 1.45, color: "#111" };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff" }}>
      <div style={{ background: "#1a1a1a", color: "#fff", padding: "24px 28px" }}>
        <div style={{ fontSize: "24px", fontWeight: 700 }}>{profileName(p)}</div>
        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{p.schultyp || "Schüler"} · {p.klasse || "Informatik"}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: "9px", color: "rgba(255,255,255,0.55)" }}>
          {[fmtIsoDate(p.geburtsdatum) + (p.geburtsort ? `, ${p.geburtsort}` : ""), profileContact(p) || "—", profileAddress(p) || "Wien"].filter(Boolean).map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
      {p.profil && (
        <DBSection title="Profil">
          <div style={{ fontSize: "10px", lineHeight: 1.45 }}>{p.profil}</div>
        </DBSection>
      )}
      <DBSection title="Ausbildung">
        {school ? (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>{school}</div>
            {p.abschlussjahr ? <div style={{ fontSize: "9px", color: "#555", marginTop: 2 }}>{`Abschluss geplant ${p.abschlussjahr}`}</div> : null}
          </div>
        ) : (
          <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>HTL Spengergasse</div>
        )}
      </DBSection>
      {weiter.length > 0 && (
        <DBSection title="Weiterbildung">
          {weiter.map((w, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>{w.name}</div>
              <div style={{ fontSize: "9px", color: "#555", marginTop: 2 }}>{[w.institution, w.jahr].filter(Boolean).join(" – ")}</div>
            </div>
          ))}
        </DBSection>
      )}
      <DBSection title="Berufserfahrung">
        {jobs.length ? jobs.map((j, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>{`${j.titel || j.art || "Tätigkeit"} — ${j.organisation}`}</div>
            <div style={{ fontSize: "9px", color: "#555", marginTop: 2 }}>{rangeLabel(j.von, j.bis)}</div>
            {(j.bullets || []).filter(b => b?.trim()).map((b, bi) => (
              <div key={bi} style={{ fontSize: "9px", color: "#555", marginTop: 2, marginLeft: 10 }}>› {b}</div>
            ))}
          </div>
        )) : <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>—</div>}
      </DBSection>
      <DBSection title="Kenntnisse & Sprachen">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[...(skills.length ? skills : []), ...langs.map(l => `${l.sprache}${l.niveau ? ` (${l.niveau})` : ""}`)].map((s, i) => (
            <span key={i} style={{ background: "#f0f0f0", borderRadius: 3, padding: "3px 8px", fontSize: "9px", color: "#333" }}>{s}</span>
          ))}
        </div>
      </DBSection>
      {aktiv.length > 0 && (
        <DBSection title="Aktivitäten">
          {aktiv.map((a, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: "10px", color: "#111" }}>{a.name}{a.organisation ? ` — ${a.organisation}` : ""}</div>
              {a.beschreibung ? <div style={{ fontSize: "9px", color: "#555", marginTop: 2 }}>{a.beschreibung}</div> : null}
            </div>
          ))}
        </DBSection>
      )}
    </div>
  );
}

const CV_RENDERS = {
  "gray-header":  GrayHeaderCV,
  "slim-sidebar": SlimSidebarCV,
  "tabellarisch": TabellarischCV,
  "dark-bands":   DarkBandsCV,
};


// ─── Text-list template selector button ───────────────────────────────────────
const TMPL_DOT = {
  "gray-header":  "#9ca3af",
  "slim-sidebar": "#d1d5db",
  "tabellarisch": "#1C3557",
  "dark-bands":   "#1a1a1a",
};

function TextCard({ tmpl, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tmpl.id)}
      className={[
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all focus:outline-none",
        selected
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/[0.06]"
          : "border-[var(--color-border)] hover:border-[rgba(255,255,255,0.18)]",
      ].join(" ")}
      aria-pressed={selected}
    >
      <span
        style={{ width: 12, height: 12, borderRadius: "50%", background: TMPL_DOT[tmpl.id], flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.12)" }}
      />
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-semibold leading-tight ${selected ? "text-[var(--color-accent-400)]" : "text-[var(--color-fg)]"}` }>{tmpl.label}</span>
        <span className="block text-[11px] text-[var(--color-fg-faint)] mt-0.5">{tmpl.desc}</span>
      </span>
      {selected && (
        <svg width="14" height="11" viewBox="0 0 14 11" fill="none" className="flex-shrink-0">
          <path d="M1 5.5L5 9.5L13 1" stroke="var(--color-accent-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ─── Large template preview for the right panel of FocusModeWizard ─────────────────
/**
 * Shows the currently selected template at full-panel width.
 * Replaces CVSummaryPanel on the “vorlage” wizard step.
 */
export function TemplatePreviewPanel({ profile, templateId, onJumpToTemplate }) {
  const id = templateId || profile?.templateId || "tabellarisch";
  const tmpl = TEMPLATES.find((t) => t.id === id) || TEMPLATES[2];
  const Render = CV_RENDERS[id];
  const [scale, setScale] = useState(0.5);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const measuredRef = useCallback((node) => {
    if (!node) return;
    const measure = () => {
      if (!node) return;
      setScale(node.offsetWidth / INNER_W);
    };
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  if (!Render) return null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Vorlage &mdash; <span className="text-[var(--color-fg-muted)]">{tmpl.label}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="text-[11px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            Vollbild
          </button>
          {onJumpToTemplate && (
            <button
              type="button"
              onClick={onJumpToTemplate}
              className="text-[11px] text-[var(--color-fg-faint)] hover:text-[var(--color-accent-400)] transition-colors"
            >
              Wechseln &rarr;
            </button>
          )}
        </div>
      </div>
      <div
        ref={measuredRef}
        className="relative"
        style={{
          width: "100%",
          height: INNER_H * scale,
          overflow: "hidden",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: INNER_W, height: INNER_H, background: "#fff" }}>
          <Render p={profile} />
        </div>
      </div>
      {lightboxOpen && (
        <TemplateLightbox
          templateId={id}
          profile={profile}
          onClose={() => setLightboxOpen(false)}
          onSelect={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Lightbox portal ──────────────────────────────────────────────────────────
/** Full-size preview modal — bottom sheet on mobile, centered dialog on desktop. */
export function TemplateLightbox({ templateId, profile, onClose, onSelect }) {
  const startIdx = TEMPLATES.findIndex((t) => t.id === templateId);
  const [activeIdx, setActiveIdx] = useState(startIdx < 0 ? 0 : startIdx);
  const activeId = TEMPLATES[activeIdx]?.id;
  const Render = CV_RENDERS[activeId];
  const [scale, setScale] = useState(0.48);
  const dialogRef = useRef(null);
  const previewRef = useCallback((node) => {
    if (!node) return;
    const measure = () => setScale(node.offsetWidth / INNER_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActiveIdx((i) => Math.min(TEMPLATES.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus trap: keep Tab cycling inside the lightbox.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    // Auto-focus first element on open
    const first = focusables()[0];
    if (first) first.focus();

    const onTab = (e) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    dialog.addEventListener("keydown", onTab);
    return () => dialog.removeEventListener("keydown", onTab);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-t-[20px] sm:rounded-[16px] w-full sm:max-w-[720px] overflow-hidden flex flex-col"
        style={{ maxHeight: "94dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nav bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex gap-1">
            <button type="button" onClick={() => setActiveIdx((i) => Math.max(0, i - 1))} disabled={activeIdx === 0}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30 text-sm hover:bg-gray-200 transition-colors">
              ←
            </button>
            <button type="button" onClick={() => setActiveIdx((i) => Math.min(TEMPLATES.length - 1, i + 1))} disabled={activeIdx === TEMPLATES.length - 1}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30 text-sm hover:bg-gray-200 transition-colors">
              →
            </button>
          </div>
          <span className="flex-1 text-[13px] font-semibold text-gray-700 text-center">{TEMPLATES[activeIdx]?.label}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={onClose}
              className="h-8 px-3 rounded-lg bg-gray-100 text-gray-600 text-[12px] font-medium hover:bg-gray-200 transition-colors">
              ✕
            </button>
            <button type="button" onClick={() => { onSelect(activeId); onClose(); }}
              className="h-8 px-3 rounded-lg text-[12px] font-semibold text-[#0b0b14] transition-colors"
              style={{ background: "var(--color-accent-500)" }}>
              Auswählen
            </button>
          </div>
        </div>

        {/* Template render */}
        <div className="overflow-y-auto flex-1 px-0 sm:px-3 py-3">
          <div ref={previewRef}
            style={{ width: "100%", height: INNER_H * scale, overflow: "hidden", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
            {Render && (
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: INNER_W, height: INNER_H, background: "#fff" }}>
                <Render p={profile} />
              </div>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 py-3 flex-shrink-0">
          {TEMPLATES.map((t, i) => (
            <button key={t.id} type="button" onClick={() => setActiveIdx(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === activeIdx ? "var(--color-accent-500)" : "#d1d5db" }} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Public scene component ───────────────────────────────────────────────────
/**
 * Template picker scene — 2×2 visual grid with expand-to-lightbox.
 * Desktop right panel shows the live template preview (handled by FocusModeWizard).
 *
 * @param {{ profile: any, onChange: (patch: any) => void }} props
 */
export function CVTemplatePicker({ profile, onChange }) {
  const selected = profile.templateId || "tabellarisch";
  const [lightboxId, setLightboxId] = useState(null);
  const [cardScale, setCardScale] = useState(0.26);

  const gridRef = useCallback((node) => {
    if (!node) return;
    const measure = () => {
      const firstCard = node.querySelector(':scope > div');
      if (firstCard) setCardScale(firstCard.offsetWidth / INNER_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[24px] sm:text-[28px] font-semibold leading-[1.15] text-[var(--color-fg)]">Wähle eine Vorlage</h2>
        <p className="text-[13px] text-[var(--color-fg-muted)]">Tippe zum Auswählen — Lupe für Vollbild-Vorschau.</p>
      </div>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
        {TEMPLATES.map((tmpl) => {
          const Render = CV_RENDERS[tmpl.id];
          if (!Render) return null;
          const isSelected = selected === tmpl.id;
          return (
            <div
              key={tmpl.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onChange({ templateId: tmpl.id })}
              onKeyDown={(e) => e.key === "Enter" && onChange({ templateId: tmpl.id })}
              className="relative rounded-xl overflow-hidden cursor-pointer transition-all select-none bg-[var(--color-bg-elev-1)]"
              style={{
                border: isSelected ? "2px solid var(--color-accent-500)" : "1px solid var(--color-border)",
                boxShadow: isSelected ? "0 0 0 3px rgba(124,125,240,0.18)" : "none",
              }}
            >
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                <div className="text-[13px] font-semibold text-[var(--color-fg)]">{tmpl.label}</div>
                <div className="text-[11px] text-[var(--color-fg-dim)] mt-0.5">{tmpl.desc}</div>
              </div>

              {/* Preview body */}
              <div className="relative overflow-hidden bg-[var(--color-bg)]" style={{ aspectRatio: `${INNER_W}/${INNER_H}` }}>
                <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left", width: INNER_W, height: INNER_H, background: "#fff", pointerEvents: "none" }}>
                  <Render p={profile} />
                </div>

                {/* Expand icon */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxId(tmpl.id); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                  aria-label="Vollbild-Vorschau"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>

                {isSelected && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-500)" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightboxId && (
        <TemplateLightbox
          templateId={lightboxId}
          profile={profile}
          onClose={() => setLightboxId(null)}
          onSelect={(id) => onChange({ templateId: id })}
        />
      )}
    </div>
  );
}
