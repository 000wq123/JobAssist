import { Plus, Trash2 } from "lucide-react";
import ChipPicker from "./ChipPicker";
import TagInput from "./TagInput";

const FUEHRERSCHEIN_OPTIONS = [
  { value: "Keiner", label: "Noch keiner" },
  { value: "L17",    label: "L17" },
  { value: "B",      label: "B" },
];

const NIVEAU_OPTIONS = ["Muttersprache", "C2", "C1", "B2", "B1", "A2", "A1"];

const SOFTWARE_SUGGESTIONS = [
  "Word", "Excel", "PowerPoint", "Google Docs", "Canva",
  "Photoshop", "Figma", "VS Code", "Python", "JavaScript",
];

const SOFT_SKILLS = [
  { value: "Teamfähigkeit",     label: "Teamfähigkeit" },
  { value: "Zuverlässigkeit",   label: "Zuverlässigkeit" },
  { value: "Kommunikation",     label: "Kommunikation" },
  { value: "Pünktlichkeit",     label: "Pünktlichkeit" },
  { value: "Lernbereitschaft",  label: "Lernbereitschaft" },
  { value: "Selbstständigkeit", label: "Selbstständigkeit" },
  { value: "Organisationstalent", label: "Organisationstalent" },
  { value: "Belastbarkeit",     label: "Belastbarkeit" },
  { value: "Kreativität",       label: "Kreativität" },
  { value: "Genauigkeit",       label: "Genauigkeit" },
];

const COMMON_LANGS = ["Englisch", "Französisch", "Italienisch", "Spanisch", "Bosnisch/Kroatisch/Serbisch", "Türkisch", "Ungarisch"];

/**
 * Splits faehigkeiten into "software" tags vs "soft skills" using the canonical
 * SOFT_SKILLS list. Storage stays a single string[] per the schema.
 */
function splitFaehigkeiten(arr) {
  const set = new Set(SOFT_SKILLS.map((s) => s.value));
  const soft = [];
  const tech = [];
  for (const t of arr || []) {
    if (set.has(t)) soft.push(t);
    else tech.push(t);
  }
  return { soft, tech };
}

/**
 * Step 4 — Skills (Führerschein, Sprachen, Software, Soft Skills).
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 * @param {Record<string,string>} [props.errors]
 */
export default function StepSkills({ profile, onChange, errors = {} }) {
  const { soft, tech } = splitFaehigkeiten(profile.faehigkeiten);

  const setLangs = (next) => onChange({ sprachkenntnisse: next });
  const langs = Array.isArray(profile.sprachkenntnisse) ? profile.sprachkenntnisse : [];

  const updateLang = (i, patch) => {
    const next = langs.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    setLangs(next);
  };
  const removeLang = (i) => setLangs(langs.filter((_, idx) => idx !== i));
  const addLang = () => setLangs([...langs, { sprache: "", niveau: "B1" }]);

  const setSoftware = (next) => {
    onChange({ faehigkeiten: [...next, ...soft] });
  };
  const setSoft = (next) => {
    onChange({ faehigkeiten: [...tech, ...next] });
  };

  return (
    <div className="flex flex-col gap-6">
      <ChipPicker
        label="Führerschein"
        options={FUEHRERSCHEIN_OPTIONS}
        value={profile.fuehrerschein || "Keiner"}
        onChange={(v) => onChange({ fuehrerschein: v || "Keiner" })}
      />

      {/* Sprachen */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-[var(--color-fg-muted)]">
            Sprachen
          </span>
          {errors.sprachkenntnisse && (
            <span className="text-[12px] text-[var(--color-error)]">
              {errors.sprachkenntnisse}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {langs.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 items-center sm:grid-cols-[minmax(0,1fr)_140px_36px]"
            >
              <input
                value={l.sprache}
                onChange={(e) => updateLang(i, { sprache: e.target.value })}
                placeholder="Sprache"
                list="cv-lang-suggestions"
                className="h-9 min-w-0 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]"
              />
              <select
                value={l.niveau}
                onChange={(e) => updateLang(i, { niveau: e.target.value })}
                className="col-span-2 row-start-2 h-9 min-w-0 rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-2 text-[13px] text-[var(--color-fg)] sm:col-span-1 sm:row-auto"
              >
                {NIVEAU_OPTIONS.map((n) => (
                  <option key={n} value={n} className="bg-[var(--color-bg-elev-1)]">
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeLang(i)}
                aria-label={`${l.sprache || "Sprache"} entfernen`}
                disabled={langs.length <= 1}
                className="col-start-2 row-start-1 h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg-dim)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/50 disabled:opacity-30 disabled:cursor-not-allowed sm:col-auto sm:row-auto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <datalist id="cv-lang-suggestions">
          {COMMON_LANGS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={addLang}
          className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-[var(--color-border)] text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-200)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Sprache hinzufügen
        </button>
      </div>

      {/* Software / Computer */}
      <TagInput
        label="Computer / Software"
        value={tech}
        onChange={setSoftware}
        suggestions={SOFTWARE_SUGGESTIONS}
        placeholder="z. B. Excel, Photoshop"
        hint="Tippen, Enter zum Bestätigen. Klicke auf Vorschläge für schnelles Hinzufügen."
      />

      {/* Soft Skills */}
      <ChipPicker
        label="Soft Skills"
        options={SOFT_SKILLS}
        value={soft}
        onChange={setSoft}
        multiple
        max={5}
        hint="Wähle bis zu fünf, die wirklich zu dir passen."
      />
    </div>
  );
}
