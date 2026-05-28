import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

/**
 * Austrian "tabellarischer Lebenslauf" — two-column professional template.
 *
 * Layout:
 *   LEFT SIDEBAR  (navy, 185 pt): photo · contact · languages · EDV · licence
 *   RIGHT MAIN   (white, 410 pt): name header · Ausbildung · Berufserfahrung ·
 *                                 Stärken · Interessen · signature
 *
 * Norms: DIN A4, reverse-chronological, DD.MM.YYYY dates, +43 phone prefix,
 *        CEFR language levels, optional photo in top-left of sidebar.
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

const SIDEBAR_W = 185;
const MAIN_W    = 410;

const COUNTRY_LABEL = {
  AT: "Österreich", DE: "Deutschland", IT: "Italien", HU: "Ungarn",
  SK: "Slowakei",   SI: "Slowenien",   CZ: "Tschechien", CH: "Schweiz",
  TR: "Türkei", BA: "Bosnien und Herzegowina", RS: "Serbien", HR: "Kroatien",
  UA: "Ukraine", SYRIA: "Syrien",
};

const SCHULTYP_LABEL = {
  AHS: "AHS", HTL: "HTL", HAK: "HAK", BHS: "BHS",
  NMS: "NMS / MS", PTS: "PTS", Sonstige: "",
};

const SOFT_SKILLS = new Set([
  "Teamfähigkeit", "Zuverlässigkeit", "Kommunikation", "Pünktlichkeit",
  "Lernbereitschaft", "Selbstständigkeit", "Organisationstalent",
  "Belastbarkeit", "Kreativität", "Genauigkeit",
]);

function fmtIsoDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

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

function formatTelefon(tel) {
  if (!tel) return "";
  return tel.startsWith("+") ? tel : `+43 ${tel}`;
}

const s = StyleSheet.create({
  page: {
    flexDirection: "row",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    backgroundColor: WHITE,
  },

  /* ── Sidebar ─────────────────────────────────────────────────── */
  sidebar: {
    width: SIDEBAR_W,
    minHeight: "100%",
    backgroundColor: NAVY,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 18,
  },
  photo: {
    width: 90,
    height: 112,
    borderRadius: 4,
    marginBottom: 20,
    alignSelf: "center",
  },
  photoPlaceholder: {
    width: 90,
    height: 112,
    borderRadius: 4,
    backgroundColor: NAVY2,
    marginBottom: 20,
    alignSelf: "center",
  },
  sideSection: {
    marginBottom: 18,
  },
  sideSectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    marginBottom: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: 4,
  },
  sideRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  sideLabel: {
    fontSize: 7.5,
    color: "rgba(255,255,255,0.5)",
    width: 14,
    marginTop: 1,
  },
  sideValue: {
    fontSize: 8.5,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
    lineHeight: 1.4,
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  langName: {
    fontSize: 8.5,
    color: "rgba(255,255,255,0.9)",
  },
  langLevel: {
    fontSize: 7.5,
    color: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  skillChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillChip: {
    fontSize: 7.5,
    color: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 4,
    marginRight: 4,
  },

  /* ── Main column ─────────────────────────────────────────────── */
  main: {
    width: MAIN_W,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 26,
    flex: 1,
  },
  nameBlock: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
  },
  firstName: {
    fontFamily: "Helvetica",
    fontSize: 22,
    color: INK,
    letterSpacing: 0.5,
  },
  lastName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: NAVY,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nameSubtitle: {
    fontSize: 10,
    color: MUTED,
    letterSpacing: 0.2,
  },

  /* Main sections */
  mainSection: {
    marginBottom: 14,
  },
  mainSectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 3,
    marginBottom: 9,
  },

  /* Education / experience entry */
  entry: {
    marginBottom: 9,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: INK,
    flex: 1,
    paddingRight: 8,
  },
  entryDate: {
    fontSize: 8.5,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    flexShrink: 0,
    marginTop: 1,
  },
  entryOrg: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 3,
  },
  entryArt: {
    fontSize: 8.5,
    color: DIM,
    marginBottom: 3,
  },
  bullet: {
    flexDirection: "row",
    marginLeft: 6,
    marginTop: 2,
  },
  bulletDot: {
    width: 8,
    color: ACCENT,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.4,
  },

  /* Inline tag chips (soft skills, hobbies) */
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    fontSize: 8.5,
    color: NAVY,
    backgroundColor: OFFWHITE,
    borderWidth: 0.5,
    borderColor: LINE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
  },

  /* Signature */
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    fontSize: 8.5,
    color: DIM,
  },
});

// ─── Shared data extractor ──────────────────────────────────────────────────
function extractData(profile) {
  const p = profile || {};
  const fullName = [p.vorname, p.nachname].filter(Boolean).join(" ").trim() || "Lebenslauf";
  const adresse = [p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const tel = formatTelefon(p.telefon);
  const staat = COUNTRY_LABEL[p.staatsbuergerschaft] || p.staatsbuergerschaft || "";
  const schulLabel = [SCHULTYP_LABEL[p.schultyp] ?? p.schultyp, p.schulname].filter(Boolean).join(" – ") || "";
  const klasseLabel = p.klasse ? `Klasse ${p.klasse}` : "";
  const abschlussLabel = p.abschlussjahr ? `Abschluss geplant ${p.abschlussjahr}` : "";
  const hasSchule = !!(schulLabel || klasseLabel);
  const nameSubtitle = [schulLabel, klasseLabel].filter(Boolean).join(" · ");
  const erfahrungen = Array.isArray(p.erfahrungen) ? p.erfahrungen : [];
  const langs = Array.isArray(p.sprachkenntnisse) ? p.sprachkenntnisse.filter((l) => l.sprache?.trim()) : [];
  const skills = Array.isArray(p.faehigkeiten) ? p.faehigkeiten : [];
  const softSkills = skills.filter((sk) => SOFT_SKILLS.has(sk));
  const techSkills = skills.filter((sk) => !SOFT_SKILLS.has(sk));
  const _hobbyLine = (p.hobbies || "").split("\n")[0] || "";
  const hobbyTags = (_hobbyLine.includes(",")
    ? _hobbyLine.split(",").map((t) => t.trim().slice(0, 32)).filter(Boolean)
    : _hobbyLine.trim() ? [_hobbyLine.trim().slice(0, 32)] : []);
  const today = new Date();
  const todayStr = [String(today.getDate()).padStart(2, "0"), String(today.getMonth() + 1).padStart(2, "0"), today.getFullYear()].join(".");
  const ortToday = p.ort ? `${p.ort}, ${todayStr}` : todayStr;
  const hasFoto = typeof p.foto === "string" && p.foto.length > 10;
  return { p, fullName, adresse, tel, staat, schulLabel, klasseLabel, abschlussLabel, hasSchule, nameSubtitle, erfahrungen, langs, softSkills, techSkills, hobbyTags, ortToday, hasFoto };
}

// ─── Gray Header Template ─────────────────────────────────────────────────────
const BLUE = "#4a6fa5";

function GHSection({ title, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 1.5, color: BLUE, borderBottomWidth: 1, borderBottomColor: BLUE, paddingBottom: 3, marginBottom: 8 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function GrayHeaderTemplate({ profile }) {
  const d = extractData(profile);
  const { p, fullName, adresse, tel, staat, schulLabel, klasseLabel, abschlussLabel, hasSchule, nameSubtitle, erfahrungen, langs, softSkills, techSkills, hobbyTags, ortToday } = d;
  return (
    <Document title={`Lebenslauf \u2013 ${fullName}`} author={fullName}>
      <Page size="A4" style={{ fontFamily: "Helvetica", fontSize: 10, color: INK, backgroundColor: WHITE }}>
        <View style={{ backgroundColor: "#f2f2f2", padding: "28 36 20 36", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: BLUE }}>
          <View>
            <View style={{ flexDirection: "row" }}>
              {p.vorname ? <Text style={{ fontSize: 23, color: INK, marginRight: 5 }}>{p.vorname}</Text> : null}
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 23, color: INK }}>{p.nachname || fullName}</Text>
            </View>
            {nameSubtitle ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>{nameSubtitle}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {adresse ? <Text style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>{adresse}</Text> : null}
            {tel ? <Text style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>{tel}</Text> : null}
            {p.email ? <Text style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>{p.email}</Text> : null}
            {staat ? <Text style={{ fontSize: 8, color: DIM }}>{staat}</Text> : null}
          </View>
        </View>
        <View style={{ padding: "22 36 20 36", flex: 1 }}>
          {hasSchule && (
            <GHSection title="Ausbildung">
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{schulLabel || "Schule"}</Text>
              {klasseLabel ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{klasseLabel}</Text> : null}
              {abschlussLabel ? <Text style={{ fontSize: 8.5, color: BLUE, marginTop: 1 }}>{abschlussLabel}</Text> : null}
            </GHSection>
          )}
          {erfahrungen.length > 0 && (
            <GHSection title="Berufserfahrung">
              {erfahrungen.map((e) => (
                <View key={e.id} style={{ marginBottom: 9 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, flex: 1, paddingRight: 8 }}>{e.titel || e.art || "T\u00e4tigkeit"}</Text>
                    <Text style={{ fontSize: 8.5, color: BLUE }}>{rangeLabel(e.von, e.bis)}</Text>
                  </View>
                  {e.organisation ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{e.organisation}</Text> : null}
                  {(e.bullets || []).filter((b) => b?.trim()).map((b, i) => (
                    <View key={i} style={{ flexDirection: "row", marginTop: 2, marginLeft: 6 }}>
                      <Text style={{ width: 8, color: BLUE, fontSize: 9 }}>\u203a</Text>
                      <Text style={{ flex: 1, fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </GHSection>
          )}
          {langs.length > 0 && (
            <GHSection title="Sprachen">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {langs.map((l, i) => <Text key={i} style={{ fontSize: 9, color: INK, marginRight: 14, marginBottom: 3 }}>{l.sprache}{l.niveau ? ` \u2014 ${l.niveau}` : ""}</Text>)}
              </View>
            </GHSection>
          )}
          {techSkills.length > 0 && (
            <GHSection title="EDV / Tools">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {techSkills.map((sk, i) => (
                  <View key={i} style={{ backgroundColor: "#f0f0f0", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: INK }}>{sk}</Text>
                  </View>
                ))}
              </View>
            </GHSection>
          )}
          {softSkills.length > 0 && (
            <GHSection title="St\u00e4rken">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {softSkills.map((sk, i) => <Text key={i} style={{ fontSize: 9, color: MUTED, marginRight: 12, marginBottom: 3 }}>{sk}</Text>)}
              </View>
            </GHSection>
          )}
          {hobbyTags.length > 0 && (
            <GHSection title="Interessen">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {hobbyTags.map((h, i) => <Text key={i} style={{ fontSize: 9, color: MUTED, marginRight: 12, marginBottom: 3 }}>{h}</Text>)}
              </View>
            </GHSection>
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: "8 36", borderTopWidth: 0.5, borderTopColor: LINE, fontSize: 8.5, color: DIM }}>
          <Text>{ortToday}</Text>
          <Text>{fullName}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Slim Sidebar Template (light gray sidebar) ───────────────────────────────
function SlimSidebarTemplate({ profile }) {
  const d = extractData(profile);
  const { p, fullName, adresse, tel, staat, schulLabel, klasseLabel, abschlussLabel, hasSchule, nameSubtitle, erfahrungen, langs, softSkills, techSkills, hobbyTags, ortToday, hasFoto } = d;
  const sideTitle = { fontSize: 7, letterSpacing: 1.4, color: "#999", borderBottomWidth: 0.5, borderBottomColor: "#d0d0d0", paddingBottom: 4, marginBottom: 8, fontFamily: "Helvetica-Bold" };
  return (
    <Document title={`Lebenslauf \u2013 ${fullName}`} author={fullName}>
      <Page size="A4" style={{ flexDirection: "row", fontFamily: "Helvetica", fontSize: 10, color: INK, backgroundColor: WHITE }}>
        <View style={{ width: 148, minHeight: "100%", backgroundColor: "#f0f0f0", paddingTop: 28, paddingBottom: 28, paddingHorizontal: 14 }}>
          {hasFoto
            ? <Image style={{ width: 80, height: 96, borderRadius: 3, marginBottom: 18, alignSelf: "center" }} src={p.foto} />
            : <View style={{ width: 80, height: 96, backgroundColor: "#d8d8d8", borderRadius: 3, marginBottom: 18, alignSelf: "center" }} />}
          <View style={{ marginBottom: 16 }}>
            <Text style={sideTitle}>{"KONTAKT"}</Text>
            {p.geburtsdatum ? <Text style={{ fontSize: 8, color: "#444", marginBottom: 3, lineHeight: 1.4 }}>{fmtIsoDate(p.geburtsdatum)}</Text> : null}
            {adresse ? <Text style={{ fontSize: 8, color: "#444", marginBottom: 3, lineHeight: 1.4 }}>{adresse}</Text> : null}
            {tel ? <Text style={{ fontSize: 8, color: "#444", marginBottom: 3, lineHeight: 1.4 }}>{tel}</Text> : null}
            {p.email ? <Text style={{ fontSize: 8, color: "#444", marginBottom: 3, lineHeight: 1.4 }}>{p.email}</Text> : null}
            {staat ? <Text style={{ fontSize: 8, color: "#444", lineHeight: 1.4 }}>{staat}</Text> : null}
          </View>
          {langs.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={sideTitle}>{"SPRACHEN"}</Text>
              {langs.map((l, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: "#333" }}>{l.sprache}</Text>
                  {l.niveau ? <Text style={{ fontSize: 7, color: "#999" }}>{l.niveau}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {techSkills.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={sideTitle}>{"EDV"}</Text>
              {techSkills.map((sk, i) => <Text key={i} style={{ fontSize: 8, color: "#333", marginBottom: 3, lineHeight: 1.4 }}>{sk}</Text>)}
            </View>
          )}
          {p.fuehrerschein && p.fuehrerschein !== "Keiner" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={sideTitle}>{"F\u00dcHRERSCHEIN"}</Text>
              <Text style={{ fontSize: 8, color: "#333" }}>{p.fuehrerschein}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, paddingTop: 28, paddingBottom: 28, paddingHorizontal: 22 }}>
          <View style={{ marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {p.vorname ? <Text style={{ fontSize: 20, color: INK, marginRight: 5 }}>{p.vorname}</Text> : null}
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: INK }}>{p.nachname || fullName}</Text>
            </View>
            {nameSubtitle ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>{nameSubtitle}</Text> : null}
          </View>
          {hasSchule && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 7.5, letterSpacing: 1.4, color: "#999", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3, marginBottom: 8, fontFamily: "Helvetica-Bold" }}>{"AUSBILDUNG"}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{schulLabel || "Schule"}</Text>
              {klasseLabel ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{klasseLabel}</Text> : null}
              {abschlussLabel ? <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 1 }}>{abschlussLabel}</Text> : null}
            </View>
          )}
          {erfahrungen.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 7.5, letterSpacing: 1.4, color: "#999", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3, marginBottom: 8, fontFamily: "Helvetica-Bold" }}>{"BERUFSERFAHRUNG"}</Text>
              {erfahrungen.map((e) => (
                <View key={e.id} style={{ marginBottom: 9 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, flex: 1, paddingRight: 8 }}>{e.titel || e.art || "T\u00e4tigkeit"}</Text>
                    <Text style={{ fontSize: 8.5, color: MUTED }}>{rangeLabel(e.von, e.bis)}</Text>
                  </View>
                  {e.organisation ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{e.organisation}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {softSkills.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 7.5, letterSpacing: 1.4, color: "#999", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3, marginBottom: 8, fontFamily: "Helvetica-Bold" }}>{"ST\u00c4RKEN"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {softSkills.map((sk, i) => (
                  <View key={i} style={{ backgroundColor: "#e8e8e8", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: INK }}>{sk}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {hobbyTags.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 7.5, letterSpacing: 1.4, color: "#999", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingBottom: 3, marginBottom: 8, fontFamily: "Helvetica-Bold" }}>{"INTERESSEN"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {hobbyTags.map((h, i) => <Text key={i} style={{ fontSize: 9, color: MUTED, marginRight: 10, marginBottom: 3 }}>{h}</Text>)}
              </View>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: "auto", paddingTop: 10, borderTopWidth: 0.5, borderTopColor: LINE, fontSize: 8.5, color: DIM }}>
            <Text>{ortToday}</Text>
            <Text>{fullName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ─── Dark Bands Template ──────────────────────────────────────────────────────
const DB_PAD = 32;

function DBSection({ title, children }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ backgroundColor: "#f5f5f5", paddingVertical: 5, paddingLeft: DB_PAD, marginLeft: -DB_PAD, marginRight: -DB_PAD, marginBottom: 10, marginTop: 12 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 1.4, color: "#888" }}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function DarkBandsTemplate({ profile }) {
  const d = extractData(profile);
  const { p, fullName, adresse, tel, schulLabel, klasseLabel, abschlussLabel, hasSchule, nameSubtitle, erfahrungen, langs, softSkills, techSkills, hobbyTags, ortToday } = d;
  return (
    <Document title={`Lebenslauf \u2013 ${fullName}`} author={fullName}>
      <Page size="A4" style={{ fontFamily: "Helvetica", fontSize: 10, color: INK, backgroundColor: WHITE }}>
        <View style={{ backgroundColor: "#1a1a1a", padding: "26 32 22 32" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {p.vorname ? <Text style={{ fontSize: 22, color: WHITE, marginRight: 6 }}>{p.vorname}</Text> : null}
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: WHITE }}>{p.nachname || fullName}</Text>
          </View>
          {nameSubtitle ? <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{nameSubtitle}</Text> : null}
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {[adresse, tel, p.email].filter(Boolean).map((v, i) => (
              <Text key={i} style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", marginRight: 16 }}>{v}</Text>
            ))}
          </View>
        </View>
        <View style={{ flex: 1, paddingHorizontal: DB_PAD, paddingBottom: 24 }}>
          {hasSchule && (
            <DBSection title="Ausbildung">
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{schulLabel || "Schule"}</Text>
              {klasseLabel ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{klasseLabel}</Text> : null}
              {abschlussLabel ? <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 1 }}>{abschlussLabel}</Text> : null}
            </DBSection>
          )}
          {erfahrungen.length > 0 && (
            <DBSection title="Berufserfahrung">
              {erfahrungen.map((e) => (
                <View key={e.id} style={{ marginBottom: 9 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, flex: 1, paddingRight: 8 }}>{e.titel || e.art || "T\u00e4tigkeit"}</Text>
                    <Text style={{ fontSize: 8.5, color: MUTED }}>{rangeLabel(e.von, e.bis)}</Text>
                  </View>
                  {e.organisation ? <Text style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{e.organisation}</Text> : null}
                  {(e.bullets || []).filter((b) => b?.trim()).map((b, i) => (
                    <View key={i} style={{ flexDirection: "row", marginTop: 2, marginLeft: 6 }}>
                      <Text style={{ width: 8, color: MUTED, fontSize: 9 }}>\u203a</Text>
                      <Text style={{ flex: 1, fontSize: 9, color: MUTED, lineHeight: 1.4 }}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </DBSection>
          )}
          {(langs.length > 0 || techSkills.length > 0) && (
            <DBSection title="Kenntnisse & Sprachen">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {[...langs.map((l) => l.sprache + (l.niveau ? ` \u2014 ${l.niveau}` : "")), ...techSkills].map((v, i) => (
                  <View key={i} style={{ backgroundColor: "#f0f0f0", borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: INK }}>{v}</Text>
                  </View>
                ))}
              </View>
            </DBSection>
          )}
          {softSkills.length > 0 && (
            <DBSection title="St\u00e4rken">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {softSkills.map((sk, i) => <Text key={i} style={{ fontSize: 9, color: MUTED, marginRight: 12, marginBottom: 3 }}>{sk}</Text>)}
              </View>
            </DBSection>
          )}
          {hobbyTags.length > 0 && (
            <DBSection title="Interessen">
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {hobbyTags.map((h, i) => <Text key={i} style={{ fontSize: 9, color: MUTED, marginRight: 12, marginBottom: 3 }}>{h}</Text>)}
              </View>
            </DBSection>
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: "8 32", borderTopWidth: 0.5, borderTopColor: LINE, fontSize: 8.5, color: DIM }}>
          <Text>{ortToday}</Text>
          <Text>{fullName}</Text>
        </View>
      </Page>
    </Document>
  );
}

/* ── Sidebar sub-components ─────────────────────────────────────── */

function SideSection({ title, children }) {
  return (
    <View style={s.sideSection}>
      <Text style={s.sideSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SideRow({ value }) {
  if (!value) return null;
  return (
    <View style={s.sideRow}>
      <Text style={s.sideValue}>{value}</Text>
    </View>
  );
}

/* ── Main sub-components ─────────────────────────────────────────── */

function MainSection({ title, children }) {
  return (
    <View style={s.mainSection}>
      <Text style={s.mainSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * @param {{ profile: import("./profileSchema").CVProfile }} props
 */
function TabellarischTemplate({ profile }) {
  const p = profile || {};
  const fullName = [p.vorname, p.nachname].filter(Boolean).join(" ").trim() || "Lebenslauf";

  const adresse = [p.strasse, [p.plz, p.ort].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");

  const tel = formatTelefon(p.telefon);
  const staat = COUNTRY_LABEL[p.staatsbuergerschaft] || p.staatsbuergerschaft || "";

  const schulLabel = [SCHULTYP_LABEL[p.schultyp] ?? p.schultyp, p.schulname]
    .filter(Boolean).join(" – ") || "";
  const klasseLabel = p.klasse ? `Klasse ${p.klasse}` : "";
  const abschlussLabel = p.abschlussjahr
    ? `Abschluss geplant ${p.abschlussjahr}` : "";
  const hasSchule = schulLabel || klasseLabel;

  const nameSubtitle = [schulLabel, klasseLabel].filter(Boolean).join(" · ");

  const erfahrungen = Array.isArray(p.erfahrungen) ? p.erfahrungen : [];
  const langs = Array.isArray(p.sprachkenntnisse)
    ? p.sprachkenntnisse.filter((l) => l.sprache?.trim()) : [];
  const skills = Array.isArray(p.faehigkeiten) ? p.faehigkeiten : [];
  const softSkills = skills.filter((sk) => SOFT_SKILLS.has(sk));
  const techSkills = skills.filter((sk) => !SOFT_SKILLS.has(sk));

  const _hobbiesLine = (p.hobbies || "").split("\n")[0] || "";
  const hobbyTags = (_hobbiesLine.includes(",")
    ? _hobbiesLine.split(",").map((t) => t.trim().slice(0, 32)).filter(Boolean)
    : _hobbiesLine.trim() ? [_hobbiesLine.trim().slice(0, 32)] : []);

  const today = new Date();
  const todayStr = [
    String(today.getDate()).padStart(2, "0"),
    String(today.getMonth() + 1).padStart(2, "0"),
    today.getFullYear(),
  ].join(".");
  const ortToday = p.ort ? `${p.ort}, ${todayStr}` : todayStr;

  const hasFoto = typeof p.foto === "string" && p.foto.length > 10;

  return (
    <Document title={`Lebenslauf – ${fullName}`} author={fullName}>
      <Page size="A4" style={s.page}>

        {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
        <View style={s.sidebar}>

          {/* Photo */}
          {hasFoto ? (
            <Image style={s.photo} src={p.foto} />
          ) : (
            <View style={s.photoPlaceholder} />
          )}

          {/* Kontakt */}
          <SideSection title="Kontakt">
            {p.geburtsdatum ? (
              <SideRow value={fmtIsoDate(p.geburtsdatum)} />
            ) : null}
            {adresse ? <SideRow value={adresse} /> : null}
            {tel ? <SideRow value={tel} /> : null}
            {p.email ? <SideRow value={p.email} /> : null}
            {staat ? <SideRow value={staat} /> : null}
            {p.arbeitserlaubnis === true ? (
              <SideRow value="Arbeitserlaubnis vorhanden" />
            ) : null}
          </SideSection>

          {/* Sprachen */}
          {langs.length > 0 && (
            <SideSection title="Sprachen">
              {langs.map((l, i) => (
                <View style={s.langRow} key={i}>
                  <Text style={s.langName}>{l.sprache}</Text>
                  <Text style={s.langLevel}>{l.niveau}</Text>
                </View>
              ))}
            </SideSection>
          )}

          {/* EDV / Tools */}
          {techSkills.length > 0 && (
            <SideSection title="EDV / Tools">
              <View style={s.skillChips}>
                {techSkills.map((sk, i) => (
                  <Text key={i} style={s.skillChip}>{sk}</Text>
                ))}
              </View>
            </SideSection>
          )}

          {/* Führerschein */}
          {p.fuehrerschein && p.fuehrerschein !== "Keiner" && (
            <SideSection title="Führerschein">
              <Text style={s.sideValue}>{p.fuehrerschein}</Text>
            </SideSection>
          )}
        </View>

        {/* ── MAIN COLUMN ───────────────────────────────────────── */}
        <View style={s.main}>

          {/* Name header */}
          <View style={s.nameBlock}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {p.vorname ? (
                <Text style={s.firstName}>{p.vorname} </Text>
              ) : null}
              <Text style={s.lastName}>{p.nachname || fullName}</Text>
            </View>
            {nameSubtitle ? (
              <Text style={s.nameSubtitle}>{nameSubtitle}</Text>
            ) : null}
          </View>

          {/* Ausbildung */}
          {hasSchule && (
            <MainSection title="Ausbildung">
              <View style={s.entry} wrap={false}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{schulLabel || "Schule"}</Text>
                  {abschlussLabel ? (
                    <Text style={s.entryDate}>{abschlussLabel}</Text>
                  ) : null}
                </View>
                {klasseLabel ? (
                  <Text style={s.entryOrg}>{klasseLabel}</Text>
                ) : null}
              </View>
            </MainSection>
          )}

          {/* Berufserfahrung */}
          {erfahrungen.length > 0 && (
            <MainSection title="Berufserfahrung">
              {erfahrungen.map((e) => {
                const bullets = (e.bullets || []).filter((b) => b?.trim());
                const orgLine = e.organisation || "";
                const artLine = e.art || "";
                return (
                  <View style={s.entry} key={e.id} wrap={false}>
                    <View style={s.entryHeader}>
                      <Text style={s.entryTitle}>
                        {e.titel || e.art || "Tätigkeit"}
                      </Text>
                      <Text style={s.entryDate}>{rangeLabel(e.von, e.bis)}</Text>
                    </View>
                    {orgLine ? (
                      <Text style={s.entryOrg}>{orgLine}</Text>
                    ) : null}
                    {artLine && artLine !== e.titel ? (
                      <Text style={s.entryArt}>{artLine}</Text>
                    ) : null}
                    {bullets.map((b, i) => (
                      <View style={s.bullet} key={i}>
                        <Text style={s.bulletDot}>›</Text>
                        <Text style={s.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </MainSection>
          )}

          {/* Stärken */}
          {softSkills.length > 0 && (
            <MainSection title="Stärken">
              <View style={s.tagRow}>
                {softSkills.map((sk, i) => (
                  <Text key={i} style={s.tag}>{sk}</Text>
                ))}
              </View>
            </MainSection>
          )}

          {/* Interessen */}
          {hobbyTags.length > 0 && (
            <MainSection title="Interessen">
              <View style={s.tagRow}>
                {hobbyTags.map((h, i) => (
                  <Text key={i} style={s.tag}>{h}</Text>
                ))}
              </View>
            </MainSection>
          )}

          {/* Signature */}
          <View style={s.signatureRow}>
            <Text>{ortToday}</Text>
            <Text>{fullName}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

/** Routes to the correct PDF template based on profile.templateId. */
export default function CVTemplate({ profile }) {
  const id = profile?.templateId || "tabellarisch";
  if (id === "gray-header")  return <GrayHeaderTemplate  profile={profile} />;
  if (id === "slim-sidebar") return <SlimSidebarTemplate profile={profile} />;
  if (id === "dark-bands")   return <DarkBandsTemplate   profile={profile} />;
  return <TabellarischTemplate profile={profile} />;
}
