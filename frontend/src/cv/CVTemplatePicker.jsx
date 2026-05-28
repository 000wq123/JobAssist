import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import SceneShell from "../components/cv/focus/SceneShell";

/**
 * Template definitions shown in the picker.
 * `id` is stored in profile.templateId and used by the PDF generator.
 */
export const TEMPLATES = [
  { id: "gray-header",   label: "Grau-Header",     desc: "Schlichter Kopfbereich" },
  { id: "slim-sidebar",  label: "Schlanke Leiste",  desc: "Schmale Leiste links" },
  { id: "tabellarisch",  label: "Tabellarisch",     desc: "Klassisch österreichisch" },
  { id: "dark-bands",    label: "Dunkle Bänder",    desc: "Strukturierte Abschnitte" },
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
function profileJobs(p)   { return (p.jobs || []).filter(j => j.firma).slice(0, 2); }
function profileLangs(p)  { return (p.sprachkenntnisse || []).filter(l => l.sprache).slice(0, 3); }
function profileSkills(p) { return (p.skills || []).slice(0, 5); }

// ─── Mini CV renders ──────────────────────────────────────────────────────────
// All inner divs: width 595px, rendered as white paper, scaled via transform.

function GrayHeaderCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "8px", lineHeight: 1.4, color: "#111" };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff" }}>
      <div style={{ background: "#f2f2f2", padding: "22px 32px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{profileName(p)}</div>
          <div style={{ fontSize: "8px", color: "#666", marginTop: 3 }}>{profileContact(p) || "E-Mail · Telefon"}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "7px", color: "#555" }}>
          {(profileAddress(p) || "Wien, Österreich").split(", ").map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      <div style={{ padding: "20px 32px" }}>
        {[["AUSBILDUNG", school || "HTL · Klasse"], ["BERUFSERFAHRUNG", jobs.map(j => j.firma).join(" · ") || "—"],
          ["SPRACHEN", langs.map(l => `${l.sprache}${l.niveau ? ` (${l.niveau})` : ""}`).join(" · ") || "Deutsch"]
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "7px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#4a6fa5", marginBottom: 5 }}>{lbl}</div>
            <div style={{ fontSize: "8px", borderBottom: "1px solid #e5e5e5", paddingBottom: 8 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlimSidebarCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "8px", lineHeight: 1.4, color: "#111" };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff", display: "flex", minHeight: INNER_H }}>
      <div style={{ width: 155, background: "#f0f0f0", padding: "24px 14px", flexShrink: 0 }}>
        <div style={{ width: 80, height: 96, background: "#d0d0d0", borderRadius: 2, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: "#999" }}>
          {(p.vorname || "D")[0]}{(p.nachname || "R")[0]}
        </div>
        {[["KONTAKT", [p.gebdat, profileAddress(p) || "Wien", p.email, p.telefon ? `+43 ${p.telefon}` : null].filter(Boolean)],
          ["SPRACHEN", langs.map(l => `${l.sprache}${l.niveau ? ` — ${l.niveau}` : ""}`)],
          ["EDV", skills],
        ].map(([lbl, items]) => (
          <div key={lbl} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "6px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa", marginBottom: 5 }}>{lbl}</div>
            {(items.length ? items : ["—"]).map((it, i) => <div key={i} style={{ fontSize: "7px", color: "#444", marginBottom: 2 }}>{it}</div>)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "24px 20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>{profileName(p)}</div>
        <div style={{ fontSize: "7px", color: "#666", marginBottom: 16, marginTop: 3 }}>HTL-Schüler</div>
        {[["AUSBILDUNG", school ? [school] : ["—"]], ["BERUFSERFAHRUNG", jobs.length ? jobs.map(j => j.firma) : ["—"]]].map(([lbl, rows]) => (
          <div key={lbl} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "6.5px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999", marginBottom: 6 }}>{lbl}</div>
            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 6 }}>
              {rows.map((r, i) => <div key={i} style={{ fontSize: "8px", marginBottom: 3 }}>{r}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabellarischCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "8px", lineHeight: 1.4, color: "#111" };
  const TRow = ({ date, content }) => (
    <tr>
      <td style={{ width: 80, color: "#777", fontSize: "7px", paddingBottom: 6, verticalAlign: "top", paddingRight: 12 }}>{date}</td>
      <td style={{ paddingBottom: 6, verticalAlign: "top" }}>{content}</td>
    </tr>
  );
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff", padding: "28px 36px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: 4 }}>{profileName(p)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "3px 12px", fontSize: "7px", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: "#555" }}>Geburtsdatum:</span><span>{p.gebdat || "—"}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>Telefon:</span><span>{p.telefon ? `+43 ${p.telefon}` : "—"}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>Adresse:</span><span>{profileAddress(p) || "Wien"}</span>
        <span style={{ fontWeight: 700, color: "#555" }}>E-Mail:</span><span>{p.email || "—"}</span>
      </div>
      <div style={{ borderTop: "2px solid #111", marginBottom: 12 }} />
      {[
        ["Ausbildung", [[p.schuljahrVon || "2021", school || "HTL Spengergasse"]]],
        ["Berufserfahrung", jobs.length ? jobs.map(j => [j.von || "2023", j.firma]) : [["—", "—"]]],
        ["Sprachen", langs.length ? langs.map(l => [l.niveau || "Muttersprache", l.sprache]) : [["Muttersprache", "Deutsch"]]],
        ["EDV-Kenntnisse", skills.length ? [["Grundkenntnisse", skills.join(", ")]] : [["—", "—"]]],
      ].map(([sec, rows]) => (
        <div key={sec} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{sec}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>{rows.map(([d, c], i) => <TRow key={i} date={d} content={c} />)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function DarkBandsCV({ p }) {
  const school = profileSchool(p), jobs = profileJobs(p), langs = profileLangs(p), skills = profileSkills(p);
  const S = { fontFamily: "Arial,Helvetica,sans-serif", fontSize: "8px", lineHeight: 1.4 };
  return (
    <div style={{ ...S, width: INNER_W, background: "#fff" }}>
      <div style={{ background: "#1a1a1a", color: "#fff", padding: "22px 28px" }}>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>{profileName(p)}</div>
        <div style={{ fontSize: "7px", color: "rgba(255,255,255,0.5)", marginTop: 3 }}>HTL-Schüler · Informatik</div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "7px", color: "rgba(255,255,255,0.55)" }}>
          {[profileContact(p) || "—", profileAddress(p) || "Wien"].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
      {[
        ["Ausbildung", school ? [{ t: school, s: "Matura geplant 2026" }] : [{ t: "HTL Spengergasse", s: "Informatik" }]],
        ["Berufserfahrung", jobs.length ? jobs.map(j => ({ t: j.firma, s: j.titel || "Praktikum" })) : [{ t: "—", s: "" }]],
        ["Kenntnisse & Sprachen", null],
      ].map(([lbl, rows]) => (
        <div key={lbl}>
          <div style={{ background: "#f5f5f5", padding: "5px 28px", fontSize: "7px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#888" }}>{lbl}</div>
          <div style={{ padding: "10px 28px" }}>
            {rows ? rows.map((r, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: "8px" }}>{r.t}</div>
                {r.s && <div style={{ fontSize: "7px", color: "#555" }}>{r.s}</div>}
              </div>
            )) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...(skills.length ? skills : ["Python", "MS Office"]), ...langs.map(l => l.sprache)].map((s, i) => (
                  <span key={i} style={{ background: "#f0f0f0", borderRadius: 2, padding: "2px 6px", fontSize: "7px" }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
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

  const measuredRef = useCallback((node) => {
    if (node) setScale(node.offsetWidth / INNER_W);
  }, []);

  if (!Render) return null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Vorlage &mdash; <span className="text-[var(--color-fg-muted)]">{tmpl.label}</span>
        </p>
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
      <div
        ref={measuredRef}
        style={{
          width: "100%",
          aspectRatio: `${INNER_W}/${INNER_H}`,
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
      <div className="flex flex-col gap-2">
        {["\u00d6sterreichischer Standard", "ATS-kompatibel", "Jederzeit \u00e4nderbar"].map((hint) => (
          <div key={hint} className="flex items-center gap-2 text-[11px] text-[var(--color-fg-faint)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok,#34d399)] flex-shrink-0" />
            {hint}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lightbox portal ──────────────────────────────────────────────────────────
/** Full-size preview modal — bottom sheet on mobile, centered dialog on desktop. */
function TemplateLightbox({ templateId, profile, onClose, onSelect }) {
  const startIdx = TEMPLATES.findIndex((t) => t.id === templateId);
  const [activeIdx, setActiveIdx] = useState(startIdx < 0 ? 0 : startIdx);
  const activeId = TEMPLATES[activeIdx]?.id;
  const Render = CV_RENDERS[activeId];
  const [scale, setScale] = useState(0.48);

  const previewRef = useCallback((node) => {
    if (node) setScale(node.offsetWidth / INNER_W);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-[20px] sm:rounded-[16px] w-full sm:max-w-[460px] overflow-hidden flex flex-col"
        style={{ maxHeight: "92dvh" }}
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
        <div className="overflow-y-auto flex-1 p-4">
          <div ref={previewRef}
            style={{ width: "100%", aspectRatio: `${INNER_W}/${INNER_H}`, overflow: "hidden", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
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
    const measure = () => setCardScale((node.offsetWidth - 12) / 2 / INNER_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <SceneShell
      eyebrow="Vorlage"
      question="Welches Layout gefällt dir?"
      hint="Tippe zum Auswählen — Lupe für Vollbild-Vorschau."
    >
      <div ref={gridRef} className="grid grid-cols-2 gap-3 pt-2">
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
              className="relative rounded-xl overflow-hidden cursor-pointer transition-all select-none"
              style={{
                aspectRatio: `${INNER_W}/${INNER_H}`,
                border: isSelected ? "2px solid var(--color-accent-500)" : "2px solid var(--color-border)",
                boxShadow: isSelected ? "0 0 0 3px rgba(124,125,240,0.22)" : "none",
              }}
            >
              <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left", width: INNER_W, height: INNER_H, background: "#fff", pointerEvents: "none" }}>
                <Render p={profile} />
              </div>

              {/* Expand icon — always visible */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxId(tmpl.id); }}
                className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg flex items-center justify-center text-white"
                style={{ background: "rgba(0,0,0,0.55)" }}
                aria-label="Vollbild-Vorschau"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>

              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-500)" }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-[10px] font-medium"
                style={{ background: "var(--color-bg-elev-1,#111113)", color: "var(--color-fg-muted)" }}>
                {tmpl.label}
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
    </SceneShell>
  );
}
