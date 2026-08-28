/**
 * CV Thumbnail renderer — an art-directed gallery representation of each
 * template, NOT a shrunken A4 page.
 *
 * The document renderer (cvPreview.jsx / CVTemplate.jsx) stays the exact A4
 * source for PDF, the fullscreen modal and the builder. This module renders a
 * compact composition of the SAME design system (same model, typography scale,
 * colors, sidebar/photo/header architecture) tuned to be legible at card size.
 *
 * Contract: every template here must be distinguishable at a glance — header
 * architecture, columns, accent, photo, density — using the shared DESIGN
 * sample data, never the live user profile.
 */
import { COLORS, BRAND, FONT, fmtRange } from "./cvModel.js";

/** Fixed thumbnail canvas (pt). Full A4 width; taller than the crop so the
 * viewport always shows dense content and only the lower part is cropped. */
export const THUMB = { W: 595.28, H: 600 };

/* Thumbnail type scale — deliberately larger than the document scale so the
 * header and first content sections stay readable in the large card crop. */
const T = {
  name: 31,
  role: 14,
  section: 12.5,
  body: 11.5,
  small: 10,
};

const SANS = FONT;
const SERIF = "Georgia, 'Times New Roman', serif";

/** Renders the art-directed thumbnail for a template id + model. */
export function renderCVThumbnail(id, model) {
  switch (id) {
    case "serif": return <ThumbExecutiveSerif model={model} />;
    case "kontrast": return <ThumbModern model={model} />;
    case "slim-sidebar": return <ThumbSidebar model={model} />;
    case "spartan": return <ThumbMinimal model={model} />;
    case "gray-header": return <ThumbPhoto model={model} />;
    case "dark-bands": return <ThumbExperience model={model} />;
    case "zentriert": return <ThumbGraduate model={model} />;
    case "tabellarisch": default: return <ThumbClassic model={model} />;
  }
}

const Canvas = ({ children, font = SANS }) => (
  <div style={{ width: THUMB.W, height: THUMB.H, boxSizing: "border-box", background: "var(--app-cv-paper, #F7F6F2)", fontFamily: font, color: COLORS.ink, overflow: "hidden" }}>
    {children}
  </div>
);

const THead = ({ name, role, contact, align = "left", pad = 34, bottom = 10, nameSize = T.name, roleStyle = {} }) => (
  <div style={{ padding: `${pad}px ${pad}px 0`, marginBottom: bottom }}>
    <div style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.08 }}>{name}</div>
    {role && <div style={{ fontSize: T.role, color: COLORS.muted, marginTop: 3, ...roleStyle }}>{role}</div>}
    {contact && <div style={{ fontSize: T.small, color: COLORS.dim, marginTop: 5 }}>{contact}</div>}
    {align === "center" && null}
  </div>
);

const TSection = ({ title, variant = "classic", children, marginBottom = 10 }) => {
  const rule =
    variant === "classic" ? { borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 3 } :
    variant === "serif" ? { borderBottom: `0.8px solid ${COLORS.hair}`, paddingBottom: 4 } :
    variant === "modern" ? { letterSpacing: 0.6 } : {};
  const color = variant === "modern" ? BRAND : variant === "sidebar" ? "#fff" : COLORS.ink;
  const family = variant === "serif" ? SERIF : SANS;
  return (
    <div style={{ marginBottom }}>
      <div style={{ fontFamily: family, fontSize: T.section, fontWeight: 700, textTransform: "uppercase", color, letterSpacing: 1, ...rule }}>{title}</div>
      {children}
    </div>
  );
};

const TRow = ({ left, right, sub, children }) => (
  <div style={{ marginTop: 5 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: T.body, fontWeight: 700 }}>{left}</span>
      {right && <span style={{ fontSize: T.small, color: COLORS.dim }}>{right}</span>}
    </div>
    {sub && <div style={{ fontSize: T.small, color: COLORS.muted }}>{sub}</div>}
    {children}
  </div>
);

function ThumbClassic({ model }) {
  const c = [model.contact.city, model.contact.email].filter(Boolean).join("  ·  ");
  return (
    <Canvas>
      <THead name={model.fullName} role={model.role} contact={c} />
      <div style={{ padding: "0 34px" }}>
        <TSection title="Profil" variant="classic">
          <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.4, marginTop: 3 }}>{model.profileText}</div>
        </TSection>
        <TSection title="Berufserfahrung" variant="classic">
          {model.jobs.slice(0, 2).map((j, i) => (
            <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
          ))}
        </TSection>
        <TSection title="Ausbildung" variant="classic">
          <div style={{ fontSize: T.body, marginTop: 3 }}>{model.education.degree} · {model.education.school} <span style={{ color: COLORS.dim, fontSize: T.small }}>{model.education.year}</span></div>
        </TSection>
        <div style={{ marginTop: 10, fontSize: T.section, fontWeight: 700, letterSpacing: 1, color: COLORS.ink, textTransform: "uppercase", borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 3 }}>Kenntnisse</div>
        <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.skills.slice(0, 6).join("  ·  ")}</div>
      </div>
    </Canvas>
  );
}

function ThumbExecutiveSerif({ model }) {
  const c = [model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("   ·   ");
  return (
    <Canvas font={SERIF}>
      <div style={{ padding: "40px 50px 0" }}>
        <div style={{ fontSize: T.name + 2, fontWeight: 700 }}>{model.fullName}</div>
        <div style={{ fontSize: T.role, fontStyle: "italic", color: COLORS.muted, marginTop: 4 }}>{model.role}</div>
        <div style={{ fontSize: T.small, color: COLORS.dim, marginTop: 7, borderBottom: `0.8px solid ${COLORS.hair}`, paddingBottom: 14, marginBottom: 12 }}>{c}</div>
        <TSection title="Profil" variant="serif">
          <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.5, fontStyle: "italic" }}>{model.profileText}</div>
        </TSection>
        <TSection title="Berufserfahrung" variant="serif">
          {model.jobs.slice(0, 2).map((j, i) => (
            <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={<span style={{ fontStyle: "italic" }}>{j.org}</span>} />
          ))}
        </TSection>
        <TSection title="Ausbildung" variant="serif">
          <div style={{ fontSize: T.body, marginTop: 3 }}>{model.education.degree} — {model.education.school} <span style={{ color: COLORS.dim, fontSize: T.small }}>{model.education.year}</span></div>
        </TSection>
        <TSection title="Kompetenzen" variant="serif">
          <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.5, marginTop: 3 }}>{model.skills.slice(0, 5).join("   ·   ")}</div>
        </TSection>
      </div>
    </Canvas>
  );
}

function ThumbModern({ model }) {
  const c = [model.contact.city, model.contact.email].filter(Boolean).join("  ·  ");
  return (
    <Canvas>
      <div style={{ padding: "38px 44px 0" }}>
        <div style={{ borderBottom: `2px solid ${BRAND}`, paddingBottom: 12, marginBottom: 14 }}>
          <div style={{ fontSize: T.name - 1, fontWeight: 700 }}>{model.fullName}</div>
          <div style={{ fontSize: T.role, color: COLORS.muted, marginTop: 3 }}>{model.role}</div>
          <div style={{ fontSize: T.small, color: COLORS.dim, marginTop: 5 }}>{c}</div>
        </div>
        <TSection title="Über mich" variant="modern">
          <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.4, marginTop: 3 }}>{model.profileText}</div>
        </TSection>
        <TSection title="Erfahrung" variant="modern">
          {model.jobs.slice(0, 2).map((j, i) => (
            <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
          ))}
        </TSection>
        <TSection title="Skills" variant="modern">
          <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.skills.slice(0, 6).join("  ·  ")}</div>
        </TSection>
        <div style={{ marginTop: 8, fontSize: T.section, fontWeight: 700, letterSpacing: 0.8, color: BRAND, textTransform: "uppercase" }}>Sprachen</div>
        <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.languages.map((l) => l.language).join("  ·  ")}</div>
      </div>
    </Canvas>
  );
}

function ThumbSidebar({ model }) {
  const sb = { width: 180, boxSizing: "border-box", flexShrink: 0, background: "#242a33", padding: "30px 18px", color: "#cfd6df" };
  return (
    <Canvas>
      <div style={{ display: "flex", width: THUMB.W, height: THUMB.H, boxSizing: "border-box" }}>
        <div style={sb}>
          <div style={{ width: 92, height: 118, background: "#3a424d", borderRadius: 4, margin: "0 auto 16px" }} />
          <div style={{ fontSize: T.section - 1, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Kontakt</div>
          <div style={{ fontSize: T.small, lineHeight: 1.5, marginBottom: 14 }}>{model.contact.city}<br />{model.contact.email}</div>
          <div style={{ fontSize: T.section - 1, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Sprachen</div>
          {model.languages.slice(0, 3).map((l, i) => <div key={i} style={{ fontSize: T.small, marginBottom: 3 }}>{l.language} — {l.level}</div>)}
          <div style={{ fontSize: T.section - 1, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase", marginTop: 14, marginBottom: 5 }}>EDV</div>
          <div style={{ fontSize: T.small, lineHeight: 1.45 }}>{model.skills.slice(0, 4).join(", ")}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "30px 26px" }}>
          <div style={{ fontSize: T.name, fontWeight: 700 }}>{model.fullName}</div>
          <div style={{ fontSize: T.role, color: COLORS.muted, marginTop: 2 }}>{model.role}</div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>Profil</div>
            <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.4 }}>{model.profileText}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>Berufserfahrung</div>
            {model.jobs.slice(0, 2).map((j, i) => (
              <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>Ausbildung</div>
            <div style={{ fontSize: T.body }}>{model.education.degree} · {model.education.school}</div>
          </div>
        </div>
      </div>
    </Canvas>
  );
}

function ThumbMinimal({ model }) {
  const c = [model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).join("  ·  ");
  return (
    <Canvas>
      <div style={{ padding: "38px 44px 0" }}>
        <div style={{ fontSize: T.name, fontWeight: 700 }}>{model.fullName}</div>
        <div style={{ fontSize: T.role, color: "#333", marginTop: 3 }}>{model.role}</div>
        <div style={{ fontSize: T.small, color: "#555", marginTop: 5 }}>{c}</div>
      </div>
      <div style={{ padding: "14px 44px 0" }}>
        <div style={{ fontSize: T.section, fontWeight: 700, letterSpacing: 1.2, color: "#111", textTransform: "uppercase", marginBottom: 4 }}>Berufserfahrung</div>
        {model.jobs.slice(0, 3).map((j, i) => (
          <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
        ))}
        <div style={{ marginTop: 12, fontSize: T.section, fontWeight: 700, letterSpacing: 1.2, color: "#111", textTransform: "uppercase", marginBottom: 4 }}>Ausbildung</div>
        <div style={{ fontSize: T.body }}>{model.education.degree} · {model.education.school} <span style={{ color: "#555", fontSize: T.small }}>{model.education.year}</span></div>
        <div style={{ marginTop: 12, fontSize: T.section, fontWeight: 700, letterSpacing: 1.2, color: "#111", textTransform: "uppercase", marginBottom: 4 }}>Kenntnisse</div>
        <div style={{ fontSize: T.small, color: "#444" }}>{model.skills.slice(0, 7).join(", ")}</div>
      </div>
    </Canvas>
  );
}

function ThumbPhoto({ model }) {
  const c = [model.contact.city, model.contact.email].filter(Boolean).join("  ·  ");
  return (
    <Canvas>
      <div style={{ padding: "38px 44px 0", display: "flex", gap: 16, marginBottom: 12 }}>
        <div style={{ width: 74, height: 96, background: "#e5e7eb", borderRadius: 4, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: T.name, fontWeight: 700 }}>{model.fullName}</div>
          <div style={{ fontSize: T.role, color: COLORS.muted, marginTop: 3 }}>{model.role}</div>
          <div style={{ fontSize: T.small, color: COLORS.dim, marginTop: 5 }}>{c}</div>
        </div>
      </div>
      <div style={{ padding: "0 44px" }}>
        <TSection title="Profil" variant="classic">
          <div style={{ fontSize: T.small, color: COLORS.muted, lineHeight: 1.4, marginTop: 3 }}>{model.profileText}</div>
        </TSection>
        <TSection title="Berufserfahrung" variant="classic">
          {model.jobs.slice(0, 2).map((j, i) => (
            <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
          ))}
        </TSection>
        <TSection title="Sprachen" variant="classic">
          <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.languages.map((l) => l.language).join(" · ")}</div>
        </TSection>
        <div style={{ marginTop: 8, fontSize: T.section, fontWeight: 700, letterSpacing: 1, color: COLORS.ink, textTransform: "uppercase", borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 3 }}>Kenntnisse</div>
        <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.skills.slice(0, 6).join("  ·  ")}</div>
      </div>
    </Canvas>
  );
}

function ThumbExperience({ model }) {
  const c = [model.contact.city, model.contact.email].filter(Boolean).join(" · ");
  return (
    <Canvas>
      <div style={{ padding: "34px 44px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${COLORS.ink}`, paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ fontSize: T.name - 1, fontWeight: 700 }}>{model.fullName}</div>
          <div style={{ fontSize: T.small, color: COLORS.dim }}>{c}</div>
        </div>
        <div style={{ fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Berufserfahrung</div>
        {model.jobs.slice(0, 3).map((j, i) => (
          <div key={i} style={{ display: "flex", marginTop: 6 }}>
            <div style={{ width: 82, borderRight: `1px solid ${COLORS.line}`, paddingRight: 8, fontSize: T.small, color: COLORS.dim }}>{fmtRange(j.from, j.to)}</div>
            <div style={{ flex: 1, paddingLeft: 12 }}>
              <div style={{ fontSize: T.body, fontWeight: 700 }}>{j.title}</div>
              <div style={{ fontSize: T.small, color: COLORS.muted }}>{j.org}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>Ausbildung</div>
        <div style={{ fontSize: T.body }}>{model.education.degree} · {model.education.school} <span style={{ color: COLORS.dim, fontSize: T.small }}>{model.education.year}</span></div>
        <div style={{ marginTop: 12, fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>Kenntnisse</div>
        <div style={{ fontSize: T.small, color: COLORS.muted }}>{model.skills.slice(0, 7).join("  ·  ")}</div>
      </div>
    </Canvas>
  );
}

function ThumbGraduate({ model }) {
  const c = [model.contact.city, model.contact.email].filter(Boolean).join("  ·  ");
  return (
    <Canvas>
      <div style={{ padding: "36px 44px 0" }}>
        <div style={{ fontSize: T.name, fontWeight: 700 }}>{model.fullName}</div>
        <div style={{ fontSize: T.role, color: COLORS.muted, marginTop: 3 }}>{model.role}</div>
        <div style={{ fontSize: T.small, color: COLORS.dim, marginTop: 5 }}>{c}</div>
      </div>
      <div style={{ padding: "14px 44px 0" }}>
        <TSection title="Ausbildung" variant="modern">
          <div style={{ fontSize: T.body, fontWeight: 700, marginTop: 3 }}>{model.education.degree}</div>
          <div style={{ fontSize: T.small, color: COLORS.muted }}>{model.education.school} · Abschluss {model.education.year}</div>
        </TSection>
        <TSection title="Erfahrung" variant="modern">
          {model.jobs.slice(0, 2).map((j, i) => (
            <TRow key={i} left={j.title} right={fmtRange(j.from, j.to)} sub={j.org} />
          ))}
        </TSection>
        <TSection title="Projekte" variant="modern">
          <div style={{ fontSize: T.body, fontWeight: 700, marginTop: 3 }}>Digitaler Onboarding-Prozess</div>
          <div style={{ fontSize: T.small, color: COLORS.muted }}>Reduktion der Einarbeitungszeit um 25 %</div>
        </TSection>
        <div style={{ marginTop: 8, fontSize: T.section, fontWeight: 700, color: BRAND, letterSpacing: 0.8, textTransform: "uppercase" }}>Kenntnisse</div>
        <div style={{ fontSize: T.small, color: COLORS.muted, marginTop: 3 }}>{model.skills.slice(0, 6).join(" · ")}</div>
      </div>
    </Canvas>
  );
}
