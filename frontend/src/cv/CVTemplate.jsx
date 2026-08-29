/**
 * PDF renderer — reads the SHARED cvModel (normalizeProfile) and renders 8
 * distinct professional archetypes. This file mirrors the DOM renderer in
 * CVTemplatePicker.jsx: both consume the same `model` produced by
 * normalizeProfile, so the browser preview and the exported PDF stay in
 * parity for the SAME templateId.
 *
 * Layout conventions per archetype are ORIGINAL implementations of established
 * professional-CV layout patterns (no copied third-party designs).
 */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { normalizeProfile, A4, TYPE, COLORS } from "./cvModel.js";

const SANS = "Helvetica";
const SERIF = "Times-Roman";
const FONTS = {
  sans: SANS,
  default: SANS,
  serif: SERIF,
};

/**
 * Section header primitive — one shared typographic treatment per archetype so
 * hierarchy stays consistent and printable.
 */
const secStyle = StyleSheet.create({
  classic: {
    fontFamily: SANS,
    fontSize: TYPE.section,
    letterSpacing: 1.2,
    fontWeight: "bold",
    color: COLORS.ink,
    textTransform: "uppercase",
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.line,
    paddingBottom: 3,
    marginBottom: 8,
  },
  serif: {
    fontFamily: SERIF,
    fontSize: TYPE.section + 1,
    fontWeight: "bold",
    color: COLORS.ink,
    marginBottom: 8,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.hair,
    paddingBottom: 4,
  },
  modern: {
    fontFamily: SANS,
    fontSize: TYPE.section,
    fontWeight: "bold",
    letterSpacing: 0.6,
    color: "#C8102E",
    marginBottom: 8,
  },
  sidebar: {
    fontFamily: SANS,
    fontSize: TYPE.section - 0.5,
    fontWeight: "bold",
    letterSpacing: 0.6,
    color: "#ffffff",
    marginBottom: 6,
  },
});

const modernSectionStyle = (model) => ({ ...secStyle.modern, color: model.accentColor });

/** Shared sections used by most archetypes. */
function ContactRow({ model }) {
  const c = model.contact;
  const parts = [c.city, c.email, c.phone].filter(Boolean).join("  ·  ");
  return parts ? (
    <Text style={{ fontSize: TYPE.small, color: COLORS.muted, marginTop: 4 }}>{parts}</Text>
  ) : null;
}

function ExperienceList({ jobs, style }) {
  if (!jobs.length) return <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>—</Text>;
  return jobs.map((j, i) => {
    const range = [j.from, j.to].filter(Boolean).join(" – ");
    return (
      <View key={i} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ ...style.jobTitle, flex: 1 }}>{j.title}</Text>
          {range && <Text style={{ fontSize: TYPE.small, color: COLORS.dim }}>{range}</Text>}
        </View>
        {j.org ? <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>{j.org}</Text> : null}
        {j.bullets.map((b, bi) => (
          <View key={bi} style={{ flexDirection: "row", marginTop: 2 }}>
            <Text style={{ width: 9, fontSize: TYPE.small, color: COLORS.dim }}>•</Text>
            <Text style={{ flex: 1, fontSize: TYPE.small, lineHeight: 1.4, color: COLORS.muted }}>{b}</Text>
          </View>
        ))}
      </View>
    );
  });
}

export default function CVTemplate({ profile }) {
  const id = profile?.templateId || "tabellarisch";
  const model = normalizeProfile(profile);
  const font = FONTS[model.fontFamily] || SANS;

  switch (id) {
    case "serif": return <ExecutiveSerif model={model} font={font} />;
    case "kontrast": return <ModernProfessional model={model} font={font} />;
    case "slim-sidebar": return <SidebarProfessional model={model} font={font} />;
    case "spartan": return <MinimalATS model={model} font={font} />;
    case "gray-header": return <PhotoClassic model={model} font={font} />;
    case "dark-bands": return <CompactExperience model={model} font={font} />;
    case "zentriert": return <GraduateStudent model={model} font={font} />;
    case "tabellarisch": default: return <AustrianClassic model={model} font={font} />;
  }
}

/* ── 1. Austrian Classic ────────────────────────────────────────────────── */
function AustrianClassic({ model, font }) {
  return cv("Austrian Classic", model, font, secStyle.classic, (m) => (
    <>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name + 2, fontWeight: "bold", color: COLORS.ink }}>{m.fullName}</Text>
        {m.role && <Text style={{ fontSize: TYPE.role, color: COLORS.muted }}>{m.role}</Text>}
        <ContactRow model={m} />
      </View>
      {m.profileText ? <SectionT secStyle={secStyle.classic} title="Profil">{m.profileText}</SectionT> : null}
      <SectionT secStyle={secStyle.classic} title="Berufserfahrung">
        <ExperienceList jobs={m.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink } }} />
      </SectionT>
      <SectionT secStyle={secStyle.classic} title="Ausbildung">
        {m.education.school || m.education.degree ? (
          <Text style={{ fontSize: TYPE.body, color: COLORS.ink }}>{[m.education.degree, m.education.school].filter(Boolean).join(", ")}{m.education.year ? ` · ${m.education.year}` : ""}</Text>
        ) : <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>—</Text>}
      </SectionT>
      {m.languages.length ? <SectionT secStyle={secStyle.classic} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</SectionT> : null}
      {m.skills.length ? <SectionT secStyle={secStyle.classic} title="Kenntnisse">{m.skills.join(", ")}</SectionT> : null}
      {m.interests.length ? <SectionT secStyle={secStyle.classic} title="Interessen">{m.interests.join(", ")}</SectionT> : null}
    </>
  ));
}

/* ── 2. Executive Serif ─────────────────────────────────────────────────── */
function ExecutiveSerif({ model, font }) {
  return cv("Executive Serif", model, font, secStyle.serif, (m) => (
    <>
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name + 2, color: COLORS.ink }}>{m.fullName}</Text>
        {m.role && <Text style={{ fontFamily: font, fontSize: TYPE.role, fontStyle: "italic", color: COLORS.muted }}>{m.role}</Text>}
        {m.contact.email || m.contact.phone ? (
          <Text style={{ fontFamily: font, fontSize: TYPE.small, color: COLORS.dim, marginTop: 6 }}>
            {[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join("   ·   ")}
          </Text>
        ) : null}
      </View>
      {m.profileText ? <SectionT secStyle={{ ...secStyle.serif, fontFamily: font }} title="Profil"><Text style={{ fontFamily: font, fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted }}>{m.profileText}</Text></SectionT> : null}
      <SectionT secStyle={secStyle.serif} title="Berufserfahrung">
        {m.jobs.map((j, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: font, fontSize: TYPE.body + 1, fontWeight: "bold", color: COLORS.ink }}>{j.title}</Text>
              <Text style={{ fontFamily: font, fontSize: TYPE.small, color: COLORS.dim }}>{[j.from, j.to].filter(Boolean).join(" – ")}</Text>
            </View>
            {j.org && <Text style={{ fontFamily: font, fontSize: TYPE.body, fontStyle: "italic", color: COLORS.muted }}>{j.org}</Text>}
            {(j.bullets || []).map((b, bi) => (
              <View key={bi} style={{ flexDirection: "row", marginTop: 2 }}>
                <Text style={{ fontFamily: font, width: 10, fontSize: TYPE.body, color: COLORS.dim }}>—</Text>
                <Text style={{ fontFamily: font, flex: 1, fontSize: TYPE.small, color: COLORS.muted, lineHeight: 1.45 }}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </SectionT>
      <SectionT secStyle={secStyle.serif} title="Ausbildung">
        {m.education.degree || m.education.school ? (
          <Text style={{ fontFamily: font, fontSize: TYPE.body, color: COLORS.ink }}>
            {[m.education.degree, m.education.school].filter(Boolean).join(", ")}{m.education.year ? ` — ${m.education.year}` : ""}
          </Text>
        ) : <Text style={{ fontFamily: font, fontSize: TYPE.small, color: COLORS.muted }}>—</Text>}
      </SectionT>
      {m.skills.length ? <SectionT secStyle={{ ...secStyle.serif, fontFamily: font }} title="Kompetenzen"><Text style={{ fontFamily: font, fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted }}>{m.skills.join("   ·   ")}</Text></SectionT> : null}
      {m.languages.length ? <SectionT secStyle={{ ...secStyle.serif, fontFamily: font }} title="Sprachen"><Text style={{ fontFamily: font, fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted }}>{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</Text></SectionT> : null}
    </>
  ));
}

/* ── 3. Modern Professional ─────────────────────────────────────────────── */
function ModernProfessional({ model, font }) {
  return cv("Modern Professional", model, font, modernSectionStyle(model), (m) => (
    <>
      <View style={{ marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1.6, borderBottomColor: m.accentColor }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name, fontWeight: "bold", color: COLORS.ink }}>{m.fullName}</Text>
        {m.role && <Text style={{ fontSize: TYPE.role, color: COLORS.muted, marginTop: 2 }}>{m.role}</Text>}
        <Text style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 6 }}>{[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join("  ·  ")}</Text>
      </View>
      {m.profileText ? <SectionT secStyle={modernSectionStyle(m)} title="Über mich"><Text style={{ fontSize: TYPE.body, lineHeight: 1.5, color: COLORS.muted }}>{m.profileText}</Text></SectionT> : null}
      <SectionT secStyle={modernSectionStyle(m)} title="Erfahrung">
        <ExperienceList jobs={m.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink } }} />
      </SectionT>
      <SectionT secStyle={modernSectionStyle(m)} title="Ausbildung">
        <Text style={{ fontSize: TYPE.body, color: COLORS.ink }}>{[m.education.degree, m.education.school].filter(Boolean).join(" · ")}{m.education.year ? ` · ${m.education.year}` : ""}</Text>
      </SectionT>
      {m.skills.length ? <SectionT secStyle={modernSectionStyle(m)} title="Skills">{m.skills.join("  ·  ")}</SectionT> : null}
      {m.languages.length ? <SectionT secStyle={modernSectionStyle(m)} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join("  ·  ")}</SectionT> : null}
    </>
  ));
}

/* ── 4. Sidebar Professional ────────────────────────────────────────────── */
function SidebarProfessional({ model, font }) {
  const sbw = 150;
  return (
    <Document title={`Lebenslauf – ${model.fullName}`} author={model.fullName}>
      <Page size="A4" style={{ flexDirection: "row", fontFamily: font, fontSize: TYPE.body, color: COLORS.ink, backgroundColor: COLORS.white }}>
        {/* Sidebar */}
        <View style={{ width: sbw, backgroundColor: "#242a33", paddingTop: 26, paddingBottom: 26, paddingHorizontal: 14 }}>
          {model.photo ? (
            <Image src={model.photo} style={{ width: 72, height: 92, borderRadius: 4, alignSelf: "center", marginBottom: 14 }} />
          ) : (
            <View style={{ width: 72, height: 92, backgroundColor: "#3a4350", alignSelf: "center", marginBottom: 14 }} />
          )}
          <SidebarBlock title="Kontakt" style={secStyle.sidebar}>
            {[model.contact.city, model.contact.email, model.contact.phone].filter(Boolean).map((t, i) => (
              <Text key={i} style={{ fontSize: TYPE.tiny, color: "#cfd6df", marginBottom: 2 }}>{t}</Text>
            ))}
          </SidebarBlock>
          {model.languages.length ? (
            <SidebarBlock title="Sprachen" style={secStyle.sidebar}>
              {model.languages.map((l, i) => (
                <Text key={i} style={{ fontSize: TYPE.tiny, color: "#cfd6df", marginBottom: 3 }}>{l.language}{l.level ? `\n${l.level}` : ""}</Text>
              ))}
            </SidebarBlock>
          ) : null}
          {model.skills.length ? (
            <SidebarBlock title="EDV & Skills" style={secStyle.sidebar}>
              <Text style={{ fontSize: TYPE.tiny, color: "#cfd6df", lineHeight: 1.4 }}>{model.skills.join(", ")}</Text>
            </SidebarBlock>
          ) : null}
          {model.austrian.staatsbuergerschaft ? (
            <SidebarBlock title="Sonstiges" style={secStyle.sidebar}>
              <Text style={{ fontSize: TYPE.tiny, color: "#cfd6df" }}>Staatsbürgerschaft: {model.austrian.staatsbuergerschaft}</Text>
            </SidebarBlock>
          ) : null}
        </View>
        {/* Main */}
        <View style={{ flex: 1, padding: 26 }}>
          <Text style={{ fontSize: TYPE.name, fontWeight: "bold", color: COLORS.ink }}>{model.fullName}</Text>
          {model.role && <Text style={{ fontSize: TYPE.role, color: COLORS.muted, marginTop: 2 }}>{model.role}</Text>}
          {model.profileText ? <SectionT secStyle={modernSectionStyle(model)} title="Profil"><Text style={{ fontSize: TYPE.body, color: COLORS.muted }}>{model.profileText}</Text></SectionT> : null}
          <SectionT secStyle={modernSectionStyle(model)} title="Berufserfahrung">
            <ExperienceList jobs={model.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink } }} />
          </SectionT>
          <SectionT secStyle={modernSectionStyle(model)} title="Ausbildung">
            <Text style={{ fontSize: TYPE.body, color: COLORS.ink }}>{[model.education.degree, model.education.school].filter(Boolean).join(", ")}{model.education.year ? ` (${model.education.year})` : ""}</Text>
          </SectionT>
        </View>
      </Page>
    </Document>
  );
}

/* ── 5. Minimal ATS ─────────────────────────────────────────────────────── */
function MinimalATS({ model, font }) {
  return cv("Minimal ATS", model, font, secStyle.classic, (m) => (
    <>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name, fontWeight: "bold", color: "#111111" }}>{m.fullName}</Text>
        {m.role && <Text style={{ fontSize: TYPE.role, color: "#333333" }}>{m.role}</Text>}
        <Text style={{ fontSize: TYPE.small, color: "#555555", marginTop: 4 }}>{[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join("  ·  ")}</Text>
      </View>
      <SectionT secStyle={{ ...secStyle.classic, borderBottomWidth: 0.5 }} title="Berufserfahrung">
        <ExperienceList jobs={m.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: "#111111" } }} />
      </SectionT>
      <SectionT secStyle={{ ...secStyle.classic, borderBottomWidth: 0.5 }} title="Ausbildung">
        <Text style={{ fontSize: TYPE.body, color: "#111111" }}>{[m.education.degree, m.education.school].filter(Boolean).join(", ")}{m.education.year ? ` · ${m.education.year}` : ""}</Text>
      </SectionT>
      {m.skills.length ? <SectionT secStyle={{ ...secStyle.classic, borderBottomWidth: 0.5 }} title="Kenntnisse">{m.skills.join(", ")}</SectionT> : null}
      {m.languages.length ? <SectionT secStyle={{ ...secStyle.classic, borderBottomWidth: 0.5 }} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</SectionT> : null}
      {m.courses.length ? <SectionT secStyle={{ ...secStyle.classic, borderBottomWidth: 0.5 }} title="Weiterbildung">{m.courses.map((c) => c.title || c.name || c).join(" · ")}</SectionT> : null}
    </>
  ));
}

/* ── 6. Photo Classic ───────────────────────────────────────────────────── */
function PhotoClassic({ model, font }) {
  return cv("Photo Classic", model, font, secStyle.classic, (m) => (
    <>
      <View style={{ flexDirection: "row", marginBottom: 10, alignItems: "center" }}>
        {m.photo ? <Image src={m.photo} style={{ width: 64, height: 82, borderRadius: 3, marginRight: 14 }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font, fontSize: TYPE.name + 1, fontWeight: "bold", color: COLORS.ink }}>{m.fullName}</Text>
          {m.role && <Text style={{ fontSize: TYPE.role, color: COLORS.muted }}>{m.role}</Text>}
          <Text style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 3 }}>{[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join("  ·  ")}</Text>
        </View>
      </View>
      {m.profileText ? <SectionT secStyle={secStyle.classic} title="Profil">{m.profileText}</SectionT> : null}
      <SectionT secStyle={secStyle.classic} title="Berufserfahrung">
        <ExperienceList jobs={m.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink } }} />
      </SectionT>
      <SectionT secStyle={secStyle.classic} title="Ausbildung">
        <Text style={{ fontSize: TYPE.body, color: COLORS.ink }}>{[m.education.degree, m.education.school].filter(Boolean).join(", ")}{m.education.year ? ` (${m.education.year})` : ""}</Text>
      </SectionT>
      {m.languages.length ? <SectionT secStyle={secStyle.classic} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</SectionT> : null}
      {m.skills.length ? <SectionT secStyle={secStyle.classic} title="Kenntnisse">{m.skills.join(", ")}</SectionT> : null}
    </>
  ));
}

/* ── 7. Compact Experience ──────────────────────────────────────────────── */
function CompactExperience({ model, font }) {
  return cv("Compact Experience", model, font, modernSectionStyle(model), (m) => (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1.4, borderBottomColor: COLORS.ink, paddingBottom: 8, marginBottom: 12 }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name, fontWeight: "bold", color: COLORS.ink }}>{m.fullName}</Text>
        <Text style={{ fontSize: TYPE.small, color: COLORS.dim }}>{[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join(" · ")}</Text>
      </View>
      <SectionT secStyle={modernSectionStyle(m)} title="Berufserfahrung">
        {m.jobs.map((j, i) => (
          <View key={i} style={{ flexDirection: "row", marginBottom: 7 }}>
            <View style={{ width: 78, borderRightWidth: 0.6, borderRightColor: COLORS.line, paddingRight: 8 }}>
              <Text style={{ fontSize: TYPE.small, color: COLORS.dim }}>{[j.from, j.to].filter(Boolean).join(" – ")}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={{ fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink }}>{j.title}</Text>
              {j.org && <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>{j.org}</Text>}
            </View>
          </View>
        ))}
      </SectionT>
      <SectionT secStyle={modernSectionStyle(m)} title="Ausbildung">
        <Text style={{ fontSize: TYPE.body, color: COLORS.ink }}>{[m.education.degree, m.education.school].filter(Boolean).join(", ")}{m.education.year ? ` · ${m.education.year}` : ""}</Text>
      </SectionT>
      {m.skills.length ? <SectionT secStyle={modernSectionStyle(m)} title="Kenntnisse">{m.skills.join(", ")}</SectionT> : null}
      {m.languages.length ? <SectionT secStyle={modernSectionStyle(m)} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</SectionT> : null}
    </>
  ));
}

/* ── 8. Graduate / Student ──────────────────────────────────────────────── */
function GraduateStudent({ model, font }) {
  return cv("Graduate Student", model, font, modernSectionStyle(model), (m) => (
    <>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontFamily: font, fontSize: TYPE.name + 1, fontWeight: "bold", color: COLORS.ink }}>{m.fullName}</Text>
        {m.role && <Text style={{ fontSize: TYPE.role, color: COLORS.muted }}>{m.role}</Text>}
        <Text style={{ fontSize: TYPE.small, color: COLORS.dim, marginTop: 4 }}>{[m.contact.city, m.contact.email, m.contact.phone].filter(Boolean).join(" · ")}</Text>
      </View>
      <SectionT secStyle={modernSectionStyle(m)} title="Ausbildung">
        <Text style={{ fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink }}>{m.education.degree || m.education.school || "—"}</Text>
        {(m.education.school && m.education.degree) ? <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>{m.education.school}</Text> : null}
        {m.education.year ? <Text style={{ fontSize: TYPE.small, color: COLORS.dim }}>Abschluss: {m.education.year}</Text> : null}
      </SectionT>
      {m.jobs.length ? (
        <SectionT secStyle={modernSectionStyle(m)} title="Erfahrung">
          <ExperienceList jobs={m.jobs} style={{ jobTitle: { fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink } }} />
        </SectionT>
      ) : null}
      {m.projects.length ? (
        <SectionT secStyle={modernSectionStyle(m)} title="Projekte">
          {m.projects.map((p, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: TYPE.body, fontWeight: "bold", color: COLORS.ink }}>{p.titel || p.title || p}</Text>
              {p.beschreibung ? <Text style={{ fontSize: TYPE.small, color: COLORS.muted }}>{p.beschreibung}</Text> : null}
            </View>
          ))}
        </SectionT>
      ) : null}
      {m.skills.length ? <SectionT secStyle={modernSectionStyle(m)} title="Kenntnisse">{m.skills.join(" · ")}</SectionT> : null}
      {m.languages.length ? <SectionT secStyle={modernSectionStyle(m)} title="Sprachen">{m.languages.map((l) => l.language + (l.level ? ` (${l.level})` : "")).join(" · ")}</SectionT> : null}
      {m.interests.length ? <SectionT secStyle={modernSectionStyle(m)} title="Interessen">{m.interests.join(" · ")}</SectionT> : null}
      {m.certifications.length ? <SectionT secStyle={modernSectionStyle(m)} title="Zertifikate">{m.certifications.map((c) => c.titel || c.title || c).join(" · ")}</SectionT> : null}
    </>
  ));
}

/* ── Shared wrappers ────────────────────────────────────────────────────── */
function SectionT({ secStyle: sst, title, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={sst}>{title.toUpperCase()}</Text>
      {typeof children === "string" ? (
        <Text style={{ fontSize: TYPE.body, color: COLORS.muted, lineHeight: 1.45 }}>{children}</Text>
      ) : children}
    </View>
  );
}

function SidebarBlock({ title, style, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={style}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** Wrap every one-column archetype in a consistent A4 page envelope. */
function cv(docTitle, m, font, section, body) {
  return (
    <Document title={`Lebenslauf – ${m.fullName}`} author={m.fullName}>
      <Page size="A4" style={{ fontFamily: font, fontSize: TYPE.body, color: COLORS.ink, backgroundColor: COLORS.white, padding: `${A4.M} ${A4.M + 6} ${A4.M} ${A4.M + 6}` }}>
        {body(m)}
      </Page>
    </Document>
  );
}
