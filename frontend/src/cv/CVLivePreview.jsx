/**
 * CVLivePreview — a scaled HTML replica of the Tabellarisch CV template.
 * Renders a pixel-accurate white/navy two-column preview inside the wizard
 * sidebar so users see exactly what their PDF will look like.
 *
 * @param {{ profile: import("./profileSchema").CVProfile, width?: number }} props
 */

const NAVY   = "#1C3557";
const NAVY2  = "#244069";
const WHITE  = "#FFFFFF";
const OFFWHITE = "#F8F9FA";
const INK    = "#1A1A2E";
const MUTED  = "#4A5568";
const DIM    = "#718096";
const LINE   = "#E2E8F0";
const ACCENT = "#2B6CB0";

const SOFT_SKILLS_SET = new Set([
  "Teamfähigkeit", "Zuverlässigkeit", "Kommunikation", "Pünktlichkeit",
  "Lernbereitschaft", "Selbstständigkeit", "Organisationstalent",
  "Belastbarkeit", "Kreativität", "Genauigkeit",
]);

const SCHULTYP_LABEL = {
  AHS: "AHS", HTL: "HTL", HAK: "HAK", BHS: "BHS",
  NMS: "NMS / MS", PTS: "PTS", Sonstige: "",
};

function fmtMonth(s) {
  if (!s || !/^\d{4}-\d{2}/.test(s)) return s || "";
  const [y, m] = s.split("-");
  return `${m}.${y}`;
}

function rangeLabel(von, bis) {
  if (!von && !bis) return "";
  if (von && !bis) return `${fmtMonth(von)} – laufend`;
  if (!von && bis) return `bis ${fmtMonth(bis)}`;
  return `${fmtMonth(von)} – ${fmtMonth(bis)}`;
}

function SideHeading({ title }) {
  return (
    <div style={{
      fontSize: 7.5, fontWeight: 700, letterSpacing: "1.5px",
      textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
      borderBottom: "0.5px solid rgba(255,255,255,0.15)",
      paddingBottom: 4, marginBottom: 7,
    }}>
      {title}
    </div>
  );
}

function MainHeading({ title }) {
  return (
    <div style={{
      fontSize: 8, fontWeight: 700, letterSpacing: "1.8px",
      textTransform: "uppercase", color: NAVY,
      borderBottom: `1px solid ${NAVY}`, paddingBottom: 3, marginBottom: 9,
    }}>
      {title}
    </div>
  );
}

/**
 * @param {{ profile: import("./profileSchema").CVProfile, width?: number }} props
 */
export default function CVLivePreview({ profile, width = 320 }) {
  const p = profile || {};

  const A4_W = 595;
  const A4_H = 842;
  const scale = width / A4_W;

  const vorname = p.vorname || "";
  const nachname = p.nachname || "";
  const fullName = [vorname, nachname].filter(Boolean).join(" ");

  const tel = p.telefon ? (p.telefon.startsWith("+") ? p.telefon : `+43 ${p.telefon}`) : "";
  const contact = [
    [p.plz, p.ort].filter(Boolean).join(" "),
    p.strasse,
    tel,
    p.email,
  ].filter(Boolean);

  const schulLabel = [SCHULTYP_LABEL[p.schultyp] ?? p.schultyp, p.schulname].filter(Boolean).join(" – ") || "";
  const klasseLabel = p.klasse ? `Klasse ${p.klasse}` : "";
  const hasSchule = !!(schulLabel || klasseLabel);
  const nameSubtitle = [schulLabel, klasseLabel].filter(Boolean).join(" · ");

  const erfahrungen = (Array.isArray(p.erfahrungen) ? p.erfahrungen : [])
    .filter((e) => e.organisation || e.titel || e.art);

  const langs = (Array.isArray(p.sprachkenntnisse) ? p.sprachkenntnisse : [])
    .filter((l) => l.sprache?.trim());

  const skills = Array.isArray(p.faehigkeiten) ? p.faehigkeiten : [];
  const softSkills = skills.filter((sk) => SOFT_SKILLS_SET.has(sk));
  const techSkills = skills.filter((sk) => !SOFT_SKILLS_SET.has(sk));

  const hobbyRaw = (p.hobbies || "").trim();
  const hobbyTags = hobbyRaw.includes(",")
    ? hobbyRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : hobbyRaw ? [hobbyRaw] : [];

  const hasFoto = typeof p.foto === "string" && p.foto.length > 10;

  return (
    <div
      style={{
        width,
        height: Math.round(A4_H * scale),
        overflow: "hidden",
        borderRadius: 8,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div
        style={{
          width: A4_W,
          height: A4_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          display: "flex",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 10,
          lineHeight: 1.4,
          background: WHITE,
          color: INK,
        }}
      >
        {/* ── Navy sidebar ─────────────────────────────────────────────── */}
        <div style={{ width: 185, minHeight: "100%", background: NAVY, padding: "32px 18px", flexShrink: 0 }}>
          {hasFoto
            ? <img src={p.foto} alt="" style={{ width: 90, height: 112, borderRadius: 4, marginBottom: 20, objectFit: "cover", display: "block", marginLeft: "auto", marginRight: "auto" }} />
            : <div style={{ width: 90, height: 112, borderRadius: 4, background: NAVY2, marginBottom: 20, marginLeft: "auto", marginRight: "auto" }} />}

          {contact.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SideHeading title="Kontakt" />
              {contact.map((c, i) => (
                <div key={i} style={{ fontSize: 8.5, color: "rgba(255,255,255,0.9)", marginBottom: 4, wordBreak: "break-all" }}>{c}</div>
              ))}
            </div>
          )}

          {langs.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SideHeading title="Sprachen" />
              {langs.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.9)" }}>{l.sprache}</span>
                  {l.niveau && (
                    <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.12)", padding: "1.5px 4px", borderRadius: 3 }}>
                      {l.niveau}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {techSkills.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SideHeading title="EDV / Tools" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {techSkills.slice(0, 8).map((sk, i) => (
                  <span key={i} style={{ fontSize: 7.5, color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.10)", padding: "2px 5px", borderRadius: 3, marginBottom: 2 }}>{sk}</span>
                ))}
              </div>
            </div>
          )}

          {p.fuehrerschein && p.fuehrerschein !== "Keiner" && (
            <div style={{ marginBottom: 18 }}>
              <SideHeading title="Führerschein" />
              <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.9)" }}>{p.fuehrerschein}</span>
            </div>
          )}
        </div>

        {/* ── Main column ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: "32px 26px 32px 26px" }}>
          {/* Name block */}
          <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1.5px solid ${NAVY}` }}>
            <div>
              {vorname && <span style={{ fontSize: 22, color: INK, letterSpacing: 0.5 }}>{vorname} </span>}
              <span style={{ fontSize: 22, fontWeight: 700, color: NAVY, letterSpacing: 0.5 }}>
                {nachname || (!vorname ? <span style={{ color: DIM, fontWeight: 400, fontSize: 18 }}>Name noch nicht eingegeben</span> : "")}
              </span>
            </div>
            {nameSubtitle && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{nameSubtitle}</div>}
          </div>

          {/* Ausbildung */}
          {hasSchule && (
            <div style={{ marginBottom: 14 }}>
              <MainHeading title="Ausbildung" />
              <div style={{ fontWeight: 700, fontSize: 10, color: INK }}>{schulLabel || "Schule"}</div>
              {klasseLabel && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{klasseLabel}</div>}
              {p.abschlussjahr && <div style={{ fontSize: 8.5, color: ACCENT, marginTop: 1 }}>Abschluss geplant {p.abschlussjahr}</div>}
            </div>
          )}

          {/* Berufserfahrung */}
          {erfahrungen.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <MainHeading title="Berufserfahrung" />
              {erfahrungen.slice(0, 3).map((e, i) => (
                <div key={i} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700, fontSize: 10, color: INK, flex: 1, paddingRight: 8 }}>{e.titel || e.art || "Tätigkeit"}</div>
                    <div style={{ fontSize: 8.5, color: ACCENT, fontWeight: 700, flexShrink: 0 }}>{rangeLabel(e.von, e.bis)}</div>
                  </div>
                  {e.organisation && <div style={{ fontSize: 9, color: MUTED }}>{e.organisation}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Stärken */}
          {softSkills.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <MainHeading title="Stärken" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {softSkills.map((sk, i) => (
                  <span key={i} style={{ fontSize: 8.5, color: NAVY, background: OFFWHITE, border: `0.5px solid ${LINE}`, padding: "2px 6px", borderRadius: 3 }}>{sk}</span>
                ))}
              </div>
            </div>
          )}

          {/* Interessen */}
          {hobbyTags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <MainHeading title="Interessen" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {hobbyTags.map((h, i) => (
                  <span key={i} style={{ fontSize: 8.5, color: NAVY, background: OFFWHITE, border: `0.5px solid ${LINE}`, padding: "2px 6px", borderRadius: 3 }}>{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder rows when nothing filled yet */}
          {!hasSchule && erfahrungen.length === 0 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <MainHeading title="Ausbildung" />
                <div style={{ fontSize: 9, color: DIM }}>—</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <MainHeading title="Berufserfahrung" />
                <div style={{ fontSize: 9, color: DIM }}>—</div>
              </div>
            </div>
          )}

          {/* Signature row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 10, borderTop: `0.5px solid ${LINE}`, fontSize: 8.5, color: DIM }}>
            <span>{p.ort || ""}</span>
            <span>{fullName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
