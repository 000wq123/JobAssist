/**
 * DOM/browser renderer — mirrors the PDF renderer (CVTemplate.jsx) exactly.
 * Both consume the SAME `model` from normalizeProfile(cvModel.js), so the
 * browser preview and exported PDF stay in parity for the same templateId.
 *
 * Each archetype here corresponds 1:1 to a component of the same name in
 * CVTemplate.jsx (AustrianClassic, ExecutiveSerif, ...). Layout detail is
 * intentionally kept close between the two files; the model is the contract
 * that keeps them from drifting.
 */
import { TYPE, COLORS, BRAND, FONT, fmtRange } from "./cvModel.js";
import { A4 } from "./cvModel.js";

/** @returns {object} scaled transform props for an A4 preview body. */
export function a4Scaled(width) {
  const scale = width / A4.W;
  return { width: A4.W, height: A4.H, transform: `scale(${scale})`, transformOrigin: "top left" };
}

/** Render a template's document body (DOM) for the given id + model. */
export function renderCVBody(id, model) {
  switch (id) {
    case "serif": return <ExecutiveSerif model={model} />;
    case "kontrast": return <ModernProfessional model={model} />;
    case "slim-sidebar": return <SidebarProfessional model={model} />;
    case "spartan": return <MinimalATS model={model} />;
    case "gray-header": return <PhotoClassic model={model} />;
    case "dark-bands": return <CompactExperience model={model} />;
    case "zentriert": return <GraduateStudent model={model} />;
    case "tabellarisch": default: return <AustrianClassic model={model} />;
  }
}

/* Section header that mirrors secStyle per archetype. */
const secClass = {
  classic: { borderBottom: "0.8px solid " + COLORS.line, paddingBottom: 3, marginBottom: 8, letterSpacing: 1.2 },
  serif: { borderBottom: "0.6px solid " + COLORS.hair, paddingBottom: 4, marginBottom: 8 },
  modern: { marginBottom: 8, letterSpacing: 0.6 },
  sidebar: { marginBottom: 6, letterSpacing: 0.6 },
};
const secFont = {
  classic: { fontFamily: FONT, fontSize: TYPE.section, fontWeight: 700, textTransform: "uppercase", color: COLORS.ink },
  serif: { fontFamily: "Georgia, serif", fontSize: TYPE.section + 1, fontWeight: 700, color: COLORS.ink },
  modern: { fontFamily: FONT, fontSize: TYPE.section, fontWeight: 700, color: BRAND },
  sidebar: { fontFamily: FONT, fontSize: TYPE.section - 0.5, fontWeight: 700, color: "#fff" },
};

function Section({ variant, title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...secClass[variant], ...secFont[variant] }}>{title}</div>
      {typeof children === "string" ? (
        <div style={{ fontFamily: FONT, fontSize: TYPE.body, color: COLORS.muted, lineHeight: 1.45 }}>{children}</div>
      ) : children}
    </div>
  );
}

function ContactLine({ model, color = COLORS.dim, sep = "  ·  " }) {
  const parts = [model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join(sep);
  return parts ? <div style={{ fontSize: TYPE.small, color, marginTop: 4 }}>{parts}</div> : null;
}

function Experience({ jobs, titleStyle = { fontWeight: 700, color: COLORS.ink } }) {
  if (!jobs.length) return <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>—</div>;
  return jobs.map((j, i) => (
    <div key={i} style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ flex: 1, ...titleStyle }}>{j.title}</span>
        <span style={{ fontSize: TYPE.small, color: COLORS.dim }}>{fmtRange(j.from, j.to)}</span>
      </div>
      {j.org ? <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{j.org}</div> : null}
      {j.bullets.map((b, bi) => (
        <div key={bi} style={{ display: "flex", marginTop: 2 }}>
          <span style={{ width: 9, fontSize: TYPE.small, color: COLORS.dim }}>•</span>
          <span style={{ flex: 1, fontSize: TYPE.small, color: COLORS.muted, lineHeight: 1.4 }}>{b}</span>
        </div>
      ))}
    </div>
  ));
}

function AustrianClassic({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, padding: "42 48", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: TYPE.name + 2, fontWeight: 700 }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, color: COLORS.muted }}>{model.role}</div>}
        <ContactLine model={model} />
      </div>
      {model.profileText ? <Section variant="classic" title="Profil">{model.profileText}</Section> : null}
      <Section variant="classic" title="Berufserfahrung"><Experience jobs={model.jobs} /></Section>
      <Section variant="classic" title="Ausbildung">
        {model.education.degree || model.education.school ? (
          <div>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` · ${model.education.year}` : ""}</div>
        ) : <div style={{ color: COLORS.muted }}>—</div>}
      </Section>
      {model.languages.length ? <Section variant="classic" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Section> : null}
      {model.skills.length ? <Section variant="classic" title="Kenntnisse">{model.skills.join(", ")}</Section> : null}
      {model.interests.length ? <Section variant="classic" title="Interessen">{model.interests.join(", ")}</Section> : null}
    </div>
  );
}

const serifFont = "Georgia, 'Times New Roman', serif";

function ExecutiveSerif({ model }) {
  const P = { fontFamily: serifFont, fontSize: TYPE.body, color: COLORS.ink, padding: "44 50", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: TYPE.name + 2, fontFamily: serifFont }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, fontStyle: "italic", color: COLORS.muted, fontFamily: serifFont }}>{model.role}</div>}
        {model.contact.email || model.contact.phone ? (
          <div style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 6, fontFamily: serifFont }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("   ·   ")}</div>
        ) : null}
      </div>
      {model.profileText ? <Section variant="serif" title="Profil"><div style={{ fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted, fontFamily: serifFont }}>{model.profileText}</div></Section> : null}
      <Section variant="serif" title="Berufserfahrung">
        {model.jobs.map((j, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: TYPE.body + 1, fontWeight: 700 }}>{j.title}</span>
              <span style={{ fontSize: TYPE.small, color: COLORS.dim }}>{fmtRange(j.from, j.to)}</span>
            </div>
            {j.org && <div style={{ fontStyle: "italic", color: COLORS.muted }}>{j.org}</div>}
            {(j.bullets || []).map((b, bi) => (
              <div key={bi} style={{ display: "flex", marginTop: 2 }}>
                <span style={{ width: 10, color: COLORS.dim }}>—</span>
                <span style={{ flex: 1, fontSize: TYPE.small, color: COLORS.muted, lineHeight: 1.45 }}>{b}</span>
              </div>
            ))}
          </div>
        ))}
      </Section>
      <Section variant="serif" title="Ausbildung">
        {model.education.degree || model.education.school ? (
          <div style={{ fontFamily: serifFont }}>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` — ${model.education.year}` : ""}</div>
        ) : <div style={{ color: COLORS.muted }}>—</div>}
      </Section>
      {model.skills.length ? <Section variant="serif" title="Kompetenzen"><div style={{ fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted, fontFamily: serifFont }}>{model.skills.join("   ·   ")}</div></Section> : null}
      {model.languages.length ? <Section variant="serif" title="Sprachen"><div style={{ fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted, fontFamily: serifFont }}>{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</div></Section> : null}
    </div>
  );
}

function ModernProfessional({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, padding: "40 46", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1.6px solid ${BRAND}` }}>
        <div style={{ fontSize: TYPE.name, fontWeight: 700 }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, color: COLORS.muted, marginTop: 2 }}>{model.role}</div>}
        <div style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 6 }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("  ·  ")}</div>
      </div>
      {model.profileText ? <Section variant="modern" title="Über mich"><div style={{ fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted }}>{model.profileText}</div></Section> : null}
      <Section variant="modern" title="Erfahrung"><Experience jobs={model.jobs} /></Section>
      <Section variant="modern" title="Ausbildung">
        <div>{[model.education.degree, model.education.school].filter(Boolean).join(" · ")}{model.education.year ? ` · ${model.education.year}` : ""}</div>
      </Section>
      {model.skills.length ? <Section variant="modern" title="Skills">{model.skills.join("  ·  ")}</Section> : null}
      {model.languages.length ? <Section variant="modern" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join("  ·  ")}</Section> : null}
    </div>
  );
}

function SidebarProfessional({ model }) {
  const sidebar = { width: 150, background: "#242a33", padding: "26 14", color: "#cfd6df" };
  const main = { flex: 1, padding: 26 };
  return (
    <div style={{ fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, width: A4.W, minHeight: A4.H, background: "#fff", display: "flex" }} className="cva4">
      <div style={sidebar}>
        {model.photo ? <img src={model.photo} alt="" style={{ width: 72, height: 92, objectFit: "cover", borderRadius: 4, alignSelf: "center", marginBottom: 14, display: "block" }} /> : null}
        <div style={{ marginBottom: 14 }}>
          <div style={secFont.sidebar}>Kontakt</div>
          {[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).map((t, i) => (
            <div key={i} style={{ fontSize: TYPE.tiny, marginBottom: 2 }}>{t}</div>
          ))}
        </div>
        {model.languages.length ? (
          <div style={{ marginBottom: 14 }}>
            <div style={secFont.sidebar}>Sprachen</div>
            {model.languages.map((l, i) => (
              <div key={i} style={{ fontSize: TYPE.tiny, marginBottom: 3 }}>{l.language}{l.level ? `\n${l.level}` : ""}</div>
            ))}
          </div>
        ) : null}
        {model.skills.length ? (
          <div style={{ marginBottom: 14 }}>
            <div style={secFont.sidebar}>EDV & Skills</div>
            <div style={{ fontSize: TYPE.tiny, lineHeight: 1.4 }}>{model.skills.join(", ")}</div>
          </div>
        ) : null}
      </div>
      <div style={main}>
        <div style={{ fontSize: TYPE.name, fontWeight: 700 }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, color: COLORS.muted }}>{model.role}</div>}
        {model.profileText ? <Section variant="modern" title="Profil"><div style={{ color: COLORS.muted }}>{model.profileText}</div></Section> : null}
        <Section variant="modern" title="Berufserfahrung"><Experience jobs={model.jobs} /></Section>
        <Section variant="modern" title="Ausbildung"><div>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` (${model.education.year})` : ""}</div></Section>
      </div>
    </div>
  );
}

function MinimalATS({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: "#111", padding: "40 46", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: TYPE.name, fontWeight: 700 }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, color: "#333" }}>{model.role}</div>}
        <div style={{ fontSize: TYPE.small, color: "#555", marginTop: 4 }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("  ·  ")}</div>
      </div>
      <Section variant="classic" title="Berufserfahrung"><Experience jobs={model.jobs} titleStyle={{ fontWeight: 700, color: "#111" }} /></Section>
      <Section variant="classic" title="Ausbildung"><div>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` · ${model.education.year}` : ""}</div></Section>
      {model.skills.length ? <Section variant="classic" title="Kenntnisse">{model.skills.join(", ")}</Section> : null}
      {model.languages.length ? <Section variant="classic" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Section> : null}
      {model.courses.length ? <Section variant="classic" title="Weiterbildung">{model.courses.map((c) => c.title || c.name || c).join(" · ")}</Section> : null}
    </div>
  );
}

function PhotoClassic({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, padding: "40 46", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        {model.photo ? <img src={model.photo} alt="" style={{ width: 64, height: 82, objectFit: "cover", borderRadius: 3, marginRight: 14 }} /> : null}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: TYPE.name + 1, fontWeight: 700 }}>{model.fullName}</div>
          {model.role && <div style={{ fontSize: TYPE.role, color: COLORS.muted }}>{model.role}</div>}
          <div style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 3 }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("  ·  ")}</div>
        </div>
      </div>
      {model.profileText ? <Section variant="classic" title="Profil">{model.profileText}</Section> : null}
      <Section variant="classic" title="Berufserfahrung"><Experience jobs={model.jobs} /></Section>
      <Section variant="classic" title="Ausbildung"><div>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` (${model.education.year})` : ""}</div></Section>
      {model.languages.length ? <Section variant="classic" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Section> : null}
      {model.skills.length ? <Section variant="classic" title="Kenntnisse">{model.skills.join(", ")}</Section> : null}
    </div>
  );
}

function CompactExperience({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, padding: "40 46", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1.4px solid ${COLORS.ink}`, paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontSize: TYPE.name, fontWeight: 700 }}>{model.fullName}</div>
        <div style={{ fontSize: TYPE.small, color: COLORS.dim }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join(" · ")}</div>
      </div>
      <Section variant="modern" title="Berufserfahrung">
        {model.jobs.map((j, i) => (
          <div key={i} style={{ display: "flex", marginBottom: 7 }}>
            <div style={{ width: 78, borderRight: `0.6px solid ${COLORS.line}`, paddingRight: 8 }}>
              <span style={{ fontSize: TYPE.small, color: COLORS.dim }}>{fmtRange(j.from, j.to)}</span>
            </div>
            <div style={{ flex: 1, paddingLeft: 10 }}>
              <div style={{ fontWeight: 700 }}>{j.title}</div>
              {j.org && <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{j.org}</div>}
            </div>
          </div>
        ))}
      </Section>
      <Section variant="modern" title="Ausbildung"><div>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` · ${model.education.year}` : ""}</div></Section>
      {model.skills.length ? <Section variant="modern" title="Kenntnisse">{model.skills.join(", ")}</Section> : null}
      {model.languages.length ? <Section variant="modern" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Section> : null}
    </div>
  );
}

function GraduateStudent({ model }) {
  const P = { fontFamily: FONT, fontSize: TYPE.body, color: COLORS.ink, padding: "40 46", width: A4.W, minHeight: A4.H, background: "#fff" };
  return (
    <div style={P} className="cva4">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: TYPE.name + 1, fontWeight: 700 }}>{model.fullName}</div>
        {model.role && <div style={{ fontSize: TYPE.role, color: COLORS.muted }}>{model.role}</div>}
        <div style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 4 }}>{[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join(" · ")}</div>
      </div>
      <Section variant="modern" title="Ausbildung">
        <div style={{ fontWeight: 700 }}>{model.education.degree || model.education.school || "—"}</div>
        {model.education.school && model.education.degree ? <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{model.education.school}</div> : null}
        {model.education.year ? <div style={{ fontSize: TYPE.small, color: COLORS.dim }}>Abschluss: {model.education.year}</div> : null}
      </Section>
      {model.jobs.length ? <Section variant="modern" title="Erfahrung"><Experience jobs={model.jobs} /></Section> : null}
      {model.projects.length ? (
        <Section variant="modern" title="Projekte">
          {model.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>{p.titel || p.title || p}</div>
              {p.beschreibung ? <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{p.beschreibung}</div> : null}
            </div>
          ))}
        </Section>
      ) : null}
      {model.skills.length ? <Section variant="modern" title="Kenntnisse">{model.skills.join(" · ")}</Section> : null}
      {model.languages.length ? <Section variant="modern" title="Sprachen">{model.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Section> : null}
      {model.interests.length ? <Section variant="modern" title="Interessen">{model.interests.join(" · ")}</Section> : null}
      {model.certifications.length ? <Section variant="modern" title="Zertifikate">{model.certifications.map((c) => c.titel || c.title || c).join(" · ")}</Section> : null}
    </div>
  );
}