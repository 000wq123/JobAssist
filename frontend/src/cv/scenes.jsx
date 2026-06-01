/**
 * Ordered scene list for the focus-mode Lebenslauf wizard.
 * Each scene declares: id, title, render(), optional condition/validate.
 * Pflichtpraktikum is conditional on schultyp ∈ {HAK,HTL} && klasse ≥ 3.
 */
import { useState } from "react";
import { Plus, Trash2, Pencil, Wand2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import SceneShell from "../components/cv/focus/SceneShell";
import BigField from "../components/cv/focus/BigField";
import ChipPickerV2 from "../components/cv/focus/ChipPickerV2";
import AuditList from "../components/cv/focus/AuditList";
import { runAudit, summarize } from "./audit";
import { aiApi } from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const required = (v) => v && String(v).trim().length > 0;
const PLZ_OK = /^\d{4}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;
const uid = () => Math.random().toString(36).slice(2, 10);

// ─────────────────────────────────────────────────────────────────────────────
// AI Polish Button
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Wand icon button that sends `value` to the AI polish endpoint and calls
 * `onResult` with the improved text. Use `square` for tall icon-only variant
 * (e.g. inside bullet rows) vs. the default pill variant.
 *
 * @param {{ value: string, context: string, onResult: (t: string) => void, square?: boolean }} props
 */
function AiPolishButton({ value, context, onResult, square = false }) {
  const [busy, setBusy] = useState(false);
  const handlePolish = async () => {
    if (!value?.trim()) return;
    setBusy(true);
    try {
      const res = await aiApi.polish(value.trim(), context);
      const improved = res.data?.text || res.data?.result || value;
      onResult(improved);
    } catch {
      toast.error("KI-Optimierung gerade nicht verfügbar.");
    } finally {
      setBusy(false);
    }
  };

  if (square) {
    return (
      <button
        type="button"
        onClick={handlePolish}
        disabled={busy || !value?.trim()}
        title="Mit KI verbessern"
        className="h-[54px] w-[44px] flex-shrink-0 rounded-[14px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-accent-300)] hover:border-[rgba(124,125,240,0.35)] disabled:opacity-40 inline-flex items-center justify-center transition-colors"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePolish}
      disabled={busy || !value?.trim()}
      title="Mit KI verbessern"
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-all disabled:opacity-40"
      style={busy
        ? { background: "rgba(124,125,240,0.12)", color: "#a5b4fc", border: "1px solid rgba(124,125,240,0.25)" }
        : { background: "rgba(124,125,240,0.07)", color: "var(--color-fg-muted)", border: "1px solid var(--color-border-subtle)" }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
      {busy ? "Wird verbessert…" : "KI"}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Intro
// ─────────────────────────────────────────────────────────────────────────────
function Intro() {
  return (
    <SceneShell
      eyebrow="Lebenslauf"
      question={<>Ein paar Fragen.<br />Danach hast du deinen<br />Lebenslauf als PDF.</>}
      hint="Etwa drei Minuten. Du kannst jederzeit aufhören — wir speichern automatisch."
    >
      <div />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Name
// ─────────────────────────────────────────────────────────────────────────────
function Name({ profile, onChange }) {
  return (
    <SceneShell question="Wie heißt du?" hint="So, wie es im Pass steht.">
      <div className="grid grid-cols-2 gap-[10px]">
        <BigField value={profile.vorname} onChange={(v) => onChange({ vorname: v })} placeholder="Vorname" autoComplete="given-name" />
        <BigField value={profile.nachname} onChange={(v) => onChange({ nachname: v })} placeholder="Nachname" autoComplete="family-name" />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Geburtsdatum
// ─────────────────────────────────────────────────────────────────────────────
function Geburtsdatum({ profile, onChange }) {
  const [y, m, d] = (profile.geburtsdatum || "").split("-");
  const set = (next) => {
    const merged = { y: y || "", m: m || "", d: d || "", ...next };
    if (!merged.y && !merged.m && !merged.d) onChange({ geburtsdatum: "" });
    else onChange({ geburtsdatum: `${(merged.y || "").padStart(4, "0")}-${(merged.m || "").padStart(2, "0")}-${(merged.d || "").padStart(2, "0")}` });
  };
  return (
    <SceneShell question="Wann hast du Geburtstag?" hint="Auf österreichischen Lebensläufen üblich. Wenn du nicht möchtest, lass es offen.">
      <div className="flex flex-col gap-[10px]">
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-[10px]">
          <BigField value={d ? String(parseInt(d, 10) || "") : ""} onChange={(v) => set({ d: v.replace(/\D/g, "") })} placeholder="TT" inputMode="numeric" maxLength={2} center="true" />
          <BigField value={m ? String(parseInt(m, 10) || "") : ""} onChange={(v) => set({ m: v.replace(/\D/g, "") })} placeholder="MM" inputMode="numeric" maxLength={2} center="true" />
          <BigField value={y ? String(parseInt(y, 10) || "") : ""} onChange={(v) => set({ y: v.replace(/\D/g, "") })} placeholder="JJJJ" inputMode="numeric" maxLength={4} center="true" />
        </div>
        <BigField value={profile.geburtsort || ""} onChange={(v) => onChange({ geburtsort: v })} placeholder="Geburtsort (z. B. Wien)" />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Adresse
// ─────────────────────────────────────────────────────────────────────────────
function Adresse({ profile, onChange }) {
  return (
    <SceneShell question="Wo wohnst du?" hint="Straße, PLZ, Ort.">
      <div className="flex flex-col gap-[10px]">
        <BigField value={profile.strasse} onChange={(v) => onChange({ strasse: v })} placeholder="Straße + Hausnummer" autoComplete="street-address" />
        <div className="grid grid-cols-[110px_1fr] gap-[10px]">
          <BigField value={profile.plz} onChange={(v) => onChange({ plz: v.replace(/\D/g, "").slice(0, 4) })} placeholder="PLZ" inputMode="numeric" maxLength={4} autoComplete="postal-code" />
          <BigField value={profile.ort} onChange={(v) => onChange({ ort: v })} placeholder="Ort" autoComplete="address-level2" />
        </div>
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Kontakt
// ─────────────────────────────────────────────────────────────────────────────
function Kontakt({ profile, onChange }) {
  return (
    <SceneShell question="Wie kann man dich erreichen?" hint="Telefon und E-Mail. Beides landet im Lebenslauf-Header.">
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-stretch h-[54px] rounded-[14px] overflow-hidden bg-[var(--color-bg-input)] border border-[var(--color-border)] focus-within:border-[var(--color-accent-500)]">
          <span className="px-[14px] inline-flex items-center text-[var(--color-fg-muted)] border-r border-[var(--color-border-subtle)] font-mono text-[14px]">+43</span>
          <input value={profile.telefon} onChange={(e) => onChange({ telefon: e.target.value })} placeholder="664 1234567" inputMode="tel" autoComplete="tel" className="flex-1 h-full bg-transparent border-0 outline-none px-4 text-[16px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]" />
        </div>
        <BigField value={profile.email} onChange={(v) => onChange({ email: v })} placeholder="E-Mail" type="email" inputMode="email" autoComplete="email" />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5b. Profil
// ─────────────────────────────────────────────────────────────────────────────
function Profil({ profile, onChange }) {
  return (
    <SceneShell question="Über dich" hint="2–3 Sätze über dich, deine Stärken und was du suchst. Optional, aber überzeugend.">
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <AiPolishButton
            value={profile.profil}
            context="Kurzes Persönlichkeitsprofil für einen österreichischen Lebenslauf, 2–3 Sätze, motiviert und authentisch"
            onResult={(text) => onChange({ profil: text })}
          />
        </div>
        <textarea
          value={profile.profil || ""}
          onChange={(e) => onChange({ profil: e.target.value })}
          placeholder="z. B. Ich bin eine engagierte HTL-Schülerin mit Leidenschaft für Software-Entwicklung und Suche nach einem Praktikum, um erste Berufserfahrungen zu sammeln."
          rows={4}
          className="w-full rounded-[14px] px-[18px] py-[14px] text-[16px] bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] outline-none focus:border-[var(--color-accent-500)] focus:bg-[var(--color-bg-elev-1)] resize-none"
        />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Staatsbürgerschaft
// ─────────────────────────────────────────────────────────────────────────────
const STAATSBUERGERSCHAFT_OPTIONS = [
  { value: "AT", label: "Österreich" },
  { value: "DE", label: "Deutschland" },
  { value: "EU", label: "Andere EU" },
  { value: "OTHER", label: "Andere" },
];
function Staatsbuergerschaft({ profile, onChange }) {
  return (
    <SceneShell question="Welche Staatsbürgerschaft?" hint={`Bei AT/EU brauchst du nichts zu beachten. Bei „Andere" fragen wir nach der Arbeitserlaubnis.`}>
      <ChipPickerV2 options={STAATSBUERGERSCHAFT_OPTIONS} value={profile.staatsbuergerschaft} onChange={(v) => onChange({ staatsbuergerschaft: v })} layout="cols2" />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Schultyp
// ─────────────────────────────────────────────────────────────────────────────
const SCHULTYP_OPTIONS = [
  { value: "AHS", label: "AHS" }, { value: "HTL", label: "HTL" }, { value: "HAK", label: "HAK" },
  { value: "BHS", label: "BHS" }, { value: "NMS", label: "NMS" }, { value: "PTS", label: "PTS" },
  { value: "Sonstige", label: "Andere" },
];
function Schultyp({ profile, onChange }) {
  return (
    <SceneShell question="Welche Schule besuchst du?" hint="Tipp einfach an, was passt.">
      <ChipPickerV2 options={SCHULTYP_OPTIONS} value={profile.schultyp} onChange={(v) => onChange({ schultyp: v })} layout="cols3" />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SchulDetails
// ─────────────────────────────────────────────────────────────────────────────
function SchulDetails({ profile, onChange }) {
  const currentYear = new Date().getFullYear();
  return (
    <SceneShell question="Erzähl uns von deiner Schule." hint="Name, Klasse und voraussichtliches Abschlussjahr.">
      <div className="flex flex-col gap-[10px]">
        <BigField value={profile.schulname} onChange={(v) => onChange({ schulname: v })} placeholder="Name der Schule (z. B. BHAK Wien 10)" />
        <div className="grid grid-cols-[1fr_1fr] gap-[10px]">
          <BigField value={profile.klasse} onChange={(v) => onChange({ klasse: v })} placeholder="Klasse (z. B. 4A)" />
          <BigField
            value={profile.abschlussjahr ? String(profile.abschlussjahr) : ""}
            onChange={(v) => {
              const n = parseInt(v.replace(/\D/g, ""), 10);
              onChange({ abschlussjahr: Number.isFinite(n) ? n : null });
            }}
            placeholder={`Abschluss (z. B. ${currentYear + 1})`}
            inputMode="numeric"
            maxLength={4}
          />
        </div>
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8b. Weiterbildung (courses, certificates)
// ─────────────────────────────────────────────────────────────────────────────
function Weiterbildung({ profile, onChange }) {
  const list = profile.weiterbildungen || [];
  const set = (i, patch) => onChange({ weiterbildungen: list.map((w, j) => (i === j ? { ...w, ...patch } : w)) });
  const add = () => onChange({ weiterbildungen: [...list, { name: "", institution: "", jahr: "" }] });
  const remove = (i) => onChange({ weiterbildungen: list.filter((_, j) => j !== i) });
  return (
    <SceneShell question="Weiterbildungen oder Zertifikate?" hint="Erste-Hilfe-Kurs, Sprachzertifikate, Online-Kurse — alles zählt.">
      <div className="flex flex-col gap-[10px]">
        {list.map((w, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_100px_44px] gap-[8px]">
            <BigField value={w.name} onChange={(v) => set(i, { name: v })} placeholder="Kurs / Zertifikat" />
            <BigField value={w.institution} onChange={(v) => set(i, { institution: v })} placeholder="Institution" />
            <BigField value={w.jahr} onChange={(v) => set(i, { jahr: v.replace(/\D/g, "").slice(0, 4) })} placeholder="Jahr" inputMode="numeric" maxLength={4} />
            <button type="button" onClick={() => remove(i)} aria-label="Entfernen" className="h-[54px] w-[44px] rounded-[14px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-error)] inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={add} className="h-[52px] rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] inline-flex items-center justify-center gap-2 text-[14px]"><Plus className="h-4 w-4" /> Weiterbildung hinzufügen</button>
        {list.length === 0 && (
          <p className="text-[12px] text-[var(--color-fg-faint)] mt-1">Du kannst auch direkt weiter — optional.</p>
        )}
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Pflichtpraktikum (CONDITIONAL: HAK/HTL && klasse 3+)
// ─────────────────────────────────────────────────────────────────────────────
function pflichtRequired(p) {
  return (p.schultyp === "HAK" || p.schultyp === "HTL") && /^[345]/.test(String(p.klasse || ""));
}
function Pflichtpraktikum({ profile, onChange }) {
  const has = (profile.erfahrungen || []).some(
    (e) => /pflichtpraktikum/i.test(e?.art || "") || /pflichtpraktikum/i.test(e?.titel || "")
  );
  const setHas = (yes) => {
    const list = profile.erfahrungen || [];
    if (yes && !has) {
      onChange({
        erfahrungen: [
          { id: uid(), art: "Pflichtpraktikum", titel: "Pflichtpraktikum", organisation: "", von: "", bis: "", bullets: [] },
          ...list,
        ],
      });
    } else if (!yes && has) {
      onChange({
        erfahrungen: list.filter(
          (e) => !(/pflichtpraktikum/i.test(e?.art || "") || /pflichtpraktikum/i.test(e?.titel || ""))
        ),
      });
    }
  };
  return (
    <SceneShell
      question="Pflichtpraktikum schon gemacht?"
      hint={`${profile.schultyp} fordert eines ab der 3. Klasse — meist über den Sommer. Ohne wirken Bewerbungen oft unvollständig.`}
    >
      <div className="flex flex-col gap-[10px]">
        <ChoiceBig title="Ja, ist eingetragen" subtitle="Wir öffnen den Eintrag im nächsten Schritt zum Ausfüllen." selected={has} onClick={() => setHas(true)} />
        <ChoiceBig title="Noch nicht" subtitle={`Wir markieren es als „geplant für Sommer ${new Date().getFullYear()}".`} selected={!has} onClick={() => setHas(false)} />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Erfahrungen — list editor
// ─────────────────────────────────────────────────────────────────────────────
const ART_OPTIONS = [
  "Praktikum", "Pflichtpraktikum", "Teilzeit", "Babysitten", "Nachhilfe",
  "Ferialjob", "Ehrenamt", "Schulprojekt", "Eigenes Projekt", "Sonstige",
];
function Erfahrungen({ profile, onChange }) {
  const list = profile.erfahrungen || [];
  const [editingId, setEditingId] = useState(null);
  const editing = list.find((e) => e.id === editingId);

  const upsert = (e) => {
    const exists = list.some((x) => x.id === e.id);
    onChange({ erfahrungen: exists ? list.map((x) => (x.id === e.id ? e : x)) : [...list, e] });
  };
  const remove = (id) => onChange({ erfahrungen: list.filter((x) => x.id !== id) });
  const startNew = () =>
    setEditingId((() => {
      const id = uid();
      upsert({ id, art: "Praktikum", titel: "", organisation: "", von: "", bis: "", bullets: [] });
      return id;
    })());

  if (editing) {
    return (
      <SceneShell question="Erfahrung bearbeiten" hint={`Tipp: Aktivische Bullets („Beriet…", „Organisierte…") wirken stärker.`}>
        <ExperienceEditorInline
          entry={editing}
          onChange={(patch) => upsert({ ...editing, ...patch })}
          onDone={() => setEditingId(null)}
          onRemove={() => { remove(editing.id); setEditingId(null); }}
        />
      </SceneShell>
    );
  }

  return (
    <SceneShell question="Hast du schon Berufserfahrung?" hint="Auch Babysitten, Nachhilfe, Schulprojekte oder Sportverein-Funktionen zählen.">
      <div className="flex flex-col gap-[10px]">
        {list.map((e) => (
          <div key={e.id} className="p-[14px] rounded-[14px] bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[var(--color-fg)] truncate">{e.titel || e.art || "(noch unbenannt)"}</div>
              <div className="text-[12px] text-[var(--color-fg-muted)] truncate">
                {[e.organisation, e.von && (e.bis ? `${e.von} – ${e.bis}` : `${e.von} – laufend`)].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setEditingId(e.id)} aria-label="Bearbeiten" className="h-9 w-9 inline-flex items-center justify-center rounded-[10px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => remove(e.id)} aria-label="Löschen" className="h-9 w-9 inline-flex items-center justify-center rounded-[10px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-error)]"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={startNew} className="h-[52px] rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)] inline-flex items-center justify-center gap-2 text-[14px] font-medium">
          <Plus className="h-4 w-4" /> Erfahrung hinzufügen
        </button>
        {list.length === 0 && (
          <p className="text-[12px] text-[var(--color-fg-faint)] mt-1">Du kannst auch direkt weiter — Erfahrungen sind optional.</p>
        )}
      </div>
    </SceneShell>
  );
}

function ExperienceEditorInline({ entry, onChange, onDone, onRemove }) {
  const setBullet = (i, v) => {
    const b = [...(entry.bullets || [])];
    b[i] = v;
    onChange({ bullets: b });
  };
  const addBullet = () => onChange({ bullets: [...(entry.bullets || []), ""] });
  const removeBullet = (i) => onChange({ bullets: (entry.bullets || []).filter((_, j) => j !== i) });

  return (
    <div className="flex flex-col gap-[10px]">
      <select
        value={entry.art || ""}
        onChange={(e) => onChange({ art: e.target.value })}
        className="w-full h-[54px] rounded-[14px] px-[14px] text-[16px] bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent-500)]"
      >
        {ART_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <BigField value={entry.titel} onChange={(v) => onChange({ titel: v })} placeholder="Titel (z. B. Verkauf Aushilfe)" />
      <BigField value={entry.organisation} onChange={(v) => onChange({ organisation: v })} placeholder="Organisation (z. B. SPAR Filiale Mariahilf)" />
      <div className="grid grid-cols-2 gap-[10px]">
        <BigField value={entry.von} onChange={(v) => onChange({ von: v })} placeholder="Von (YYYY-MM)" />
        <BigField value={entry.bis} onChange={(v) => onChange({ bis: v })} placeholder="Bis (YYYY-MM, leer = laufend)" />
      </div>
      <div className="mt-1">
        <p className="text-[12px] text-[var(--color-fg-muted)] mb-1.5">Aufgaben (optional, je 1 Zeile)</p>
        {(entry.bullets || []).map((b, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <BigField value={b} onChange={(v) => setBullet(i, v)} placeholder='z. B. "Beriet Kund:innen an der Kassa"' />
            <AiPolishButton
              value={b}
              context="Bullet-Point für Berufserfahrung im Lebenslauf, aktive Formulierung (z.B. 'Beriet Kund:innen...')"
              onResult={(text) => setBullet(i, text)}
              square
            />
            <button type="button" onClick={() => removeBullet(i)} className="h-[54px] w-[54px] rounded-[14px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-error)] inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={addBullet} className="text-[12.5px] text-[var(--color-accent-300)] hover:underline">+ Aufgabe hinzufügen</button>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 h-[48px] rounded-[12px] bg-[var(--color-fg)] text-[#0b0b10] font-semibold text-[14px]">Fertig</button>
        <button type="button" onClick={onRemove} className="h-[48px] px-4 rounded-[12px] border border-[var(--color-border)] text-[var(--color-error)] text-[13px]">Eintrag löschen</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Sprachen
// ─────────────────────────────────────────────────────────────────────────────
const NIVEAU_OPTIONS = ["Muttersprache", "C2", "C1", "B2", "B1", "A2", "A1"];
function Sprachen({ profile, onChange }) {
  const list = profile.sprachkenntnisse || [];
  const set = (i, patch) => onChange({ sprachkenntnisse: list.map((l, j) => (i === j ? { ...l, ...patch } : l)) });
  const add = () => onChange({ sprachkenntnisse: [...list, { sprache: "", niveau: "B1" }] });
  const remove = (i) => onChange({ sprachkenntnisse: list.filter((_, j) => j !== i) });
  return (
    <SceneShell question="Welche Sprachen sprichst du?" hint="Mindestens eine. Niveau nach CEFR (A1–C2 oder Muttersprache).">
      <div className="flex flex-col gap-[10px]">
        {list.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_140px_44px] gap-[8px]">
            <BigField value={row.sprache} onChange={(v) => set(i, { sprache: v })} placeholder="Sprache" />
            <select
              value={row.niveau}
              onChange={(e) => set(i, { niveau: e.target.value })}
              className="h-[54px] rounded-[14px] px-[12px] text-[15px] bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent-500)]"
            >
              {NIVEAU_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button type="button" onClick={() => remove(i)} aria-label="Entfernen" className="h-[54px] w-[44px] rounded-[14px] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-error)] inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={add} className="h-[52px] rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] inline-flex items-center justify-center gap-2 text-[14px]"><Plus className="h-4 w-4" /> Sprache hinzufügen</button>
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Skills (faehigkeiten — soft + software combined)
// ─────────────────────────────────────────────────────────────────────────────
const SKILLS_OPTIONS = [
  { value: "Teamfähigkeit", label: "Teamfähigkeit" },
  { value: "Zuverlässigkeit", label: "Zuverlässigkeit" },
  { value: "Kommunikation", label: "Kommunikation" },
  { value: "Pünktlichkeit", label: "Pünktlichkeit" },
  { value: "Lernbereitschaft", label: "Lernbereitschaft" },
  { value: "Selbstständigkeit", label: "Selbstständigkeit" },
  { value: "Organisationstalent", label: "Organisationstalent" },
  { value: "Belastbarkeit", label: "Belastbarkeit" },
  { value: "Kreativität", label: "Kreativität" },
  { value: "Genauigkeit", label: "Genauigkeit" },
  { value: "MS Office", label: "MS Office" },
  { value: "Google Workspace", label: "Google Workspace" },
  { value: "Photoshop", label: "Photoshop" },
  { value: "Programmieren", label: "Programmieren" },
];
function Skills({ profile, onChange }) {
  return (
    <SceneShell question="Was kannst du gut?" hint="Stärken und Tools. Was nicht in der Liste steht, kannst du selbst hinzufügen.">
      <ChipPickerV2
        options={SKILLS_OPTIONS}
        value={profile.faehigkeiten || []}
        onChange={(v) => onChange({ faehigkeiten: v })}
        multiple
        max={10}
        allowCustom
        customLabel="+ Eigene"
        customPrompt="Eigene Stärke oder Tool"
      />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Führerschein
// ─────────────────────────────────────────────────────────────────────────────
const FUEHRERSCHEIN_OPTIONS = [
  { value: "Keiner", label: "Keiner" },
  { value: "L17", label: "L17" },
  { value: "B", label: "B" },
];
function Fuehrerschein({ profile, onChange }) {
  return (
    <SceneShell question="Hast du einen Führerschein?" hint="L17 = Begleitetes Fahren ab 17. B = der normale PKW-Führerschein.">
      <ChipPickerV2 options={FUEHRERSCHEIN_OPTIONS} value={profile.fuehrerschein} onChange={(v) => onChange({ fuehrerschein: v || "Keiner" })} layout="cols3" />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Hobbys
// ─────────────────────────────────────────────────────────────────────────────
function Hobbys({ profile, onChange }) {
  return (
    <SceneShell question="Was machst du in deiner Freizeit?" hint={`Konkret hilft mehr als allgemein. „Fußball im SV Donaustadt" wirkt stärker als „Sport".`}>
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <AiPolishButton
            value={profile.hobbies}
            context="Hobbys und Freizeitaktivitäten für einen österreichischen Lebenslauf, klar und prägnant formuliert"
            onResult={(text) => onChange({ hobbies: text })}
          />
        </div>
        <textarea
          value={profile.hobbies || ""}
          onChange={(e) => onChange({ hobbies: e.target.value })}
          placeholder="z. B. Fußball, Lesen, Programmieren …"
          rows={4}
          className="w-full rounded-[14px] px-[18px] py-[14px] text-[16px] bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] outline-none focus:border-[var(--color-accent-500)] focus:bg-[var(--color-bg-elev-1)] resize-none"
        />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14b. Aktivitäten (Vereine, Sport, Ehrenamt)
// ─────────────────────────────────────────────────────────────────────────────
function Aktivitaeten({ profile, onChange }) {
  const list = profile.aktivitaeten || [];
  const set = (i, patch) => onChange({ aktivitaeten: list.map((a, j) => (i === j ? { ...a, ...patch } : a)) });
  const add = () => onChange({ aktivitaeten: [...list, { name: "", organisation: "", beschreibung: "", von: "", bis: "" }] });
  const remove = (i) => onChange({ aktivitaeten: list.filter((_, j) => j !== i) });
  return (
    <SceneShell question="Engagierst du dich außerhalb der Schule?" hint="Vereine, Sportteams, Schülervertretung, Ehrenamt — alles, das zeigt, wer du bist.">
      <div className="flex flex-col gap-[10px]">
        {list.map((a, i) => (
          <div key={i} className="p-[14px] rounded-[14px] bg-[var(--color-bg-elev-1)] border border-[var(--color-border)]">
            <div className="grid grid-cols-[1fr_1fr] gap-[8px] mb-2">
              <BigField value={a.name} onChange={(v) => set(i, { name: v })} placeholder="Tätigkeit (z. B. Fußball)" />
              <BigField value={a.organisation} onChange={(v) => set(i, { organisation: v })} placeholder="Verein / Organisation" />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-[8px] mb-2">
              <BigField value={a.von} onChange={(v) => set(i, { von: v })} placeholder="Von (MM/JJJJ)" />
              <BigField value={a.bis} onChange={(v) => set(i, { bis: v })} placeholder="Bis (MM/JJJJ oder laufend)" />
            </div>
            <BigField value={a.beschreibung} onChange={(v) => set(i, { beschreibung: v })} placeholder="Kurze Beschreibung (optional)" />
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => remove(i)} className="text-[12px] text-[var(--color-fg-faint)] hover:text-[var(--color-error)]">Entfernen</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="h-[52px] rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] inline-flex items-center justify-center gap-2 text-[14px]"><Plus className="h-4 w-4" /> Aktivität hinzufügen</button>
        {list.length === 0 && (
          <p className="text-[12px] text-[var(--color-fg-faint)] mt-1">Du kannst auch direkt weiter — optional.</p>
        )}
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. JobArten — clustered accordion
// ─────────────────────────────────────────────────────────────────────────────
const JOBARTEN_CLUSTERS = [
  { eyebrow: "Alltag", options: ["Samstagsjob", "Aushilfe", "Geringfügig"] },
  { eyebrow: "Praktikum", options: ["Pflichtpraktikum", "Freiwilliges Praktikum", "Schnupperlehre"] },
  { eyebrow: "Länger", options: ["Teilzeit", "Lehre", "Ferialjob", "Saisonarbeit"] },
  { eyebrow: "Nach der Schule", options: ["Volontariat", "FSJ", "FUJ", "Au-Pair"] },
];
function JobArten({ profile, onChange }) {
  const sel = profile.jobArten || [];
  const toggle = (v) => onChange({ jobArten: sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v] });
  const [open, setOpen] = useState({ Alltag: true, Praktikum: true });
  const customs = sel.filter((v) => !JOBARTEN_CLUSTERS.some((c) => c.options.includes(v)));
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <SceneShell question="Was suchst du gerade?" hint="Tipp eine Gruppe an, um Optionen zu sehen. Mehreres möglich.">
      <div className="flex flex-col gap-[8px]">
        {JOBARTEN_CLUSTERS.map((c) => {
          const isOpen = !!open[c.eyebrow];
          const count = c.options.filter((o) => sel.includes(o)).length;
          return (
            <div key={c.eyebrow}>
              <button type="button" onClick={() => setOpen({ ...open, [c.eyebrow]: !isOpen })} className="w-full px-4 py-[14px] rounded-[14px] bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elev-2)] flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-faint)]">{c.eyebrow}</span>
                <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">{count} ausgewählt</span>
                <span className={"ml-auto text-[var(--color-fg-muted)] transition-transform " + (isOpen ? "rotate-90 text-[var(--color-fg)]" : "")}>›</span>
              </button>
              {isOpen && (
                <div className="mt-2 mb-1 flex flex-wrap gap-2 px-1">
                  {c.options.map((o) => {
                    const on = sel.includes(o);
                    return (
                      <button key={o} type="button" onClick={() => toggle(o)} className={"min-h-[38px] px-[14px] rounded-full text-[13.5px] font-medium border transition-colors " + (on ? "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)] text-[var(--color-fg)]" : "bg-[var(--color-bg-elev-1)] border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")}>{o}</button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {customs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {customs.map((v) => (
              <button key={v} type="button" onClick={() => toggle(v)} className="min-h-[38px] pl-[14px] pr-[10px] rounded-full text-[13.5px] font-medium border bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)] text-[var(--color-fg)] inline-flex items-center gap-2">
                {v}<span className="inline-flex w-[18px] h-[18px] items-center justify-center rounded-full bg-white/10 text-[var(--color-fg-muted)]">×</span>
              </button>
            ))}
          </div>
        )}
        {!showAdd ? (
          <button type="button" onClick={() => setShowAdd(true)} className="mt-1 h-[44px] rounded-[14px] border border-dashed border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] text-[13px]">+ Eigene Job-Art</button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (draft.trim() && !sel.includes(draft.trim())) onChange({ jobArten: [...sel, draft.trim()] }); setDraft(""); setShowAdd(false); }} className="flex gap-2 mt-1">
            <BigField value={draft} onChange={setDraft} placeholder="z. B. Fahrradkurier" />
            <button type="submit" className="h-[54px] px-4 rounded-[14px] bg-[var(--color-accent-500)] text-white font-semibold text-[14px]">OK</button>
          </form>
        )}
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Branchen
// ─────────────────────────────────────────────────────────────────────────────
const BRANCHEN_OPTIONS = [
  { value: "Handel", label: "Handel" }, { value: "Gastro", label: "Gastronomie" },
  { value: "Tourismus", label: "Tourismus" }, { value: "Pflege", label: "Pflege" },
  { value: "Büro", label: "Büro" }, { value: "IT", label: "IT" },
  { value: "Handwerk", label: "Handwerk" }, { value: "Bildung", label: "Bildung" },
  { value: "Sport", label: "Sport" }, { value: "Kultur", label: "Kultur" },
];
function Branchen({ profile, onChange }) {
  return (
    <SceneShell question="In welchen Branchen?" hint="Was du dir vorstellen kannst. Mehreres möglich.">
      <ChipPickerV2 options={BRANCHEN_OPTIONS} value={profile.branchen || []} onChange={(v) => onChange({ branchen: v })} multiple allowCustom customLabel="+ Eigene Branche" customPrompt="Eigene Branche" />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. WannWo (verfuegbarAb + maxAnfahrtMin)
// ─────────────────────────────────────────────────────────────────────────────
function WannWo({ profile, onChange }) {
  const minutes = Number.isFinite(profile.maxAnfahrtMin) ? profile.maxAnfahrtMin : 30;
  return (
    <SceneShell question="Ab wann und wie weit?" hint="Anfangsdatum und maximale Anfahrt in Minuten.">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[12px] text-[var(--color-fg-muted)] mb-1.5">Verfügbar ab</p>
          <input
            type="date"
            value={profile.verfuegbarAb || ""}
            onChange={(e) => onChange({ verfuegbarAb: e.target.value })}
            className="w-full h-[54px] rounded-[14px] px-[18px] text-[16px] bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent-500)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] text-[var(--color-fg-muted)]">Maximale Anfahrt</p>
            <p className="font-mono text-[12px] text-[var(--color-fg)] tabular-nums">{minutes} min</p>
          </div>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => onChange({ maxAnfahrtMin: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--color-accent-500)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--color-fg-faint)] mt-1 font-mono">
            <span>5 min</span><span>30</span><span>60</span><span>120</span>
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. Foto (optional + contextual hint)
// ─────────────────────────────────────────────────────────────────────────────
function Foto({ profile, onChange }) {
  const [err, setErr] = useState("");
  const onFile = (file) => {
    setErr("");
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErr("Datei zu groß (max 4 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => onChange({ foto: typeof reader.result === "string" ? reader.result : "" });
    reader.onerror = () => setErr("Datei konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  };
  const branchen = profile.branchen || [];
  const customerFacing = ["Handel", "Gastro", "Tourismus", "Pflege"].some((b) => branchen.includes(b));
  return (
    <SceneShell question="Foto?" hint="Optional. In Österreich nicht mehr verpflichtend. Bei Gastro, Handel oder Pflege wird es trotzdem oft erwartet.">
      <div className="flex flex-col items-center gap-3">
        {profile.foto ? (
          <div className="flex flex-col items-center gap-2">
            { /* eslint-disable-next-line jsx-a11y/img-redundant-alt */ }
            <img src={profile.foto} alt="Bewerbungsfoto" className="w-[170px] h-[212px] object-cover rounded-[14px] border border-[var(--color-border)]" />
            <button type="button" onClick={() => onChange({ foto: "" })} className="text-[12.5px] text-[var(--color-fg-faint)] hover:text-[var(--color-error)]">Foto entfernen</button>
          </div>
        ) : (
          <label className="w-[170px] h-[212px] rounded-[14px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elev-1)] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--color-accent-500)] hover:bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]">
            <span className="text-[13px]">Foto wählen</span>
            <span className="font-mono text-[10px] text-[var(--color-fg-faint)]">JPG · PNG · max 4 MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        )}
        {err && <p className="text-[12px] text-[var(--color-error)]">{err}</p>}
        {customerFacing && !profile.foto && (
          <div className="mt-2 max-w-[300px] p-[10px_14px] rounded-[12px] bg-[rgba(124,92,255,0.14)] border border-[rgba(124,92,255,0.40)] text-[12px] text-[var(--color-fg)] leading-[1.5]">
            <span className="font-semibold text-[var(--color-accent-300)]">Tipp.</span>{" "}
            Bei {branchen.find((b) => ["Handel", "Gastro", "Tourismus", "Pflege"].includes(b))} bekommen Bewerbungen mit Foto öfter Antwort.
          </div>
        )}
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 19. Konformitäts-Check
// ─────────────────────────────────────────────────────────────────────────────
function Check({ profile, ctx }) {
  const results = runAudit(profile);
  const c = summarize(results);
  const total = results.length;
  return (
    <SceneShell question="Letzter Check." hint="Wir prüfen deinen Lebenslauf nach österreichischen Standards — Inhalt, nicht Schriftart.">
      <p className="text-[30px] leading-[1.1] text-[var(--color-fg)]" style={{ fontFamily: "'Instrument Serif', ui-serif, Georgia, serif" }}>
        <span className="text-[var(--color-success)]">{c.ok}</span> von {total} Punkten ok.
      </p>
      <div className="mt-5">
        <AuditList
          results={results}
          onFix={(id) => {
            const map = {
              phone: "kontakt", email: "kontakt", plz: "adresse", cefr: "sprachen",
              schule: "schultyp", pflicht: "pflichtpraktikum",
              exp: "erfahrungen", bullets: "erfahrungen", order: "erfahrungen",
              foto: "foto", name: "name",
            };
            if (map[id]) ctx.jumpTo(map[id]);
          }}
        />
      </div>
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. Fertig
// ─────────────────────────────────────────────────────────────────────────────
function Fertig() {
  return (
    <SceneShell eyebrow="Lebenslauf" question="Fertig." hint="Dein Lebenslauf ist bereit. Du kannst ihn jederzeit ändern — er speichert sich von selbst.">
      <div />
    </SceneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline ChoiceCard (used in Pflichtpraktikum)
// ─────────────────────────────────────────────────────────────────────────────
function ChoiceBig({ title, subtitle, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={"w-full text-left p-[18px] rounded-[14px] border transition-colors " + (selected ? "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.40)]" : "bg-[var(--color-bg-elev-1)] border-[var(--color-border)] hover:bg-[var(--color-bg-elev-2)]")}>
      <div className="text-[15px] font-semibold text-[var(--color-fg)]">{title}</div>
      {subtitle && <div className="text-[12.5px] text-[var(--color-fg-muted)] mt-1 leading-[1.45]">{subtitle}</div>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────
const validators = {
  name: (p) => {
    const e = {};
    if (!required(p.vorname)) e.vorname = "Vorname fehlt.";
    else if (!required(p.nachname)) e.nachname = "Nachname fehlt.";
    return e;
  },
  adresse: (p) => (p.plz && !PLZ_OK.test(p.plz)) ? { plz: "PLZ ist 4 Ziffern." } : {},
  kontakt: (p) => {
    const e = {};
    if (!required(p.email)) e.email = "E-Mail fehlt.";
    else if (!EMAIL_OK.test(p.email.trim())) e.email = "E-Mail ungültig.";
    return e;
  },
  schultyp: (p) => required(p.schultyp) ? {} : { schultyp: "Bitte Schultyp wählen." },
  schulDetails: (p) => required(p.schulname) ? {} : { schulname: "Schulname fehlt." },
  sprachen: (p) => (Array.isArray(p.sprachkenntnisse) && p.sprachkenntnisse.some((l) => required(l.sprache))) ? {} : { sprachkenntnisse: "Mindestens eine Sprache." },
  jobArten: (p) => (Array.isArray(p.jobArten) && p.jobArten.length > 0) ? {} : { jobArten: "Wähle mindestens eine Job-Art." },
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENES — final ordered list
// ─────────────────────────────────────────────────────────────────────────────
/** @type {import("../components/cv/focus/FocusModeWizard").SceneDef[]} */
export const SCENES = [
  { id: "name",                  title: "Name",             render: Name,              validate: validators.name },
  { id: "geburtsdatum",          title: "Geburtsdatum",     render: Geburtsdatum,      showSkip: () => true, skipLabel: "überspringen" },
  { id: "adresse",               title: "Adresse",          render: Adresse,           validate: validators.adresse },
  { id: "kontakt",               title: "Kontakt",          render: Kontakt,           validate: validators.kontakt },
  { id: "profil",                title: "Profil",           render: Profil,            showSkip: () => true, skipLabel: "überspringen" },
  { id: "staatsbuergerschaft",   title: "Staatsbürgerschaft", render: Staatsbuergerschaft },
  { id: "schultyp",              title: "Schultyp",         render: Schultyp,          validate: validators.schultyp },
  { id: "schul-details",         title: "Schule",           render: SchulDetails,      validate: validators.schulDetails },
  { id: "weiterbildung",         title: "Weiterbildung",    render: Weiterbildung,     showSkip: () => true, skipLabel: "überspringen" },
  { id: "pflichtpraktikum",      title: "Pflichtpraktikum", render: Pflichtpraktikum,  condition: pflichtRequired },
  { id: "erfahrungen",           title: "Erfahrungen",      render: Erfahrungen },
  { id: "sprachen",              title: "Sprachen",         render: Sprachen,          validate: validators.sprachen },
  { id: "skills",                title: "Skills",           render: Skills },
  { id: "fuehrerschein",         title: "Führerschein",     render: Fuehrerschein },
  { id: "hobbys",                title: "Hobbys",           render: Hobbys,            showSkip: () => true, skipLabel: "überspringen" },
  { id: "aktivitaeten",          title: "Aktivitäten",      render: Aktivitaeten,      showSkip: () => true, skipLabel: "überspringen" },
  { id: "jobarten",              title: "Job-Arten",        render: JobArten,          validate: validators.jobArten },
  { id: "branchen",              title: "Branchen",         render: Branchen },
  { id: "wann-wo",               title: "Wann + Wo",        render: WannWo },
  { id: "foto",                  title: "Foto",             render: Foto,              showSkip: () => true, skipLabel: "ohne Foto fortfahren" },
  { id: "check",                 title: "Check",            render: Check },
  { id: "fertig",                title: "Fertig",           render: Fertig,            primaryLabel: "Weiter zur Vorschau", primaryAccent: true },
];
