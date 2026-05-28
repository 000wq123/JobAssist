import Field from "./Field";
import ChipPicker from "./ChipPicker";

const JOB_ARTEN = [
  { value: "Praktikum",     label: "Praktikum" },
  { value: "Teilzeit",      label: "Teilzeit" },
  { value: "Samstagsjob",   label: "Samstagsjob" },
  { value: "Lehre",         label: "Lehre" },
  { value: "Ferialjob",     label: "Ferialjob" },
];

const BRANCHEN = [
  { value: "Gastro",        label: "Gastronomie" },
  { value: "Handel",        label: "Handel" },
  { value: "Buero",         label: "Büro / Verwaltung" },
  { value: "IT",            label: "IT" },
  { value: "Handwerk",      label: "Handwerk" },
  { value: "Pflege",        label: "Pflege / Soziales" },
  { value: "Kreativ",       label: "Kreativ / Medien" },
  { value: "Logistik",      label: "Logistik" },
  { value: "Tourismus",     label: "Tourismus" },
  { value: "Bildung",       label: "Bildung / Nachhilfe" },
  { value: "Egal",          label: "Egal — alles offen" },
];

/**
 * Step 6 — Was suchst du?
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 * @param {Record<string,string>} [props.errors]
 */
export default function StepSuche({ profile, onChange, errors = {} }) {
  const max = Number.isFinite(profile.maxAnfahrtMin) ? profile.maxAnfahrtMin : 30;

  return (
    <div className="flex flex-col gap-6">
      <ChipPicker
        label="Was suchst du?"
        options={JOB_ARTEN}
        value={profile.jobArten || []}
        onChange={(v) => onChange({ jobArten: v })}
        multiple
        error={errors.jobArten}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-[var(--color-fg-muted)]">
            Maximale Anfahrt
          </span>
          <span className="text-[12px] text-[var(--color-fg)]">
            {max === 90 ? "90+ min" : `${max} min`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={max}
          onChange={(e) => onChange({ maxAnfahrtMin: Number(e.target.value) })}
          aria-label="Maximale Anfahrtszeit in Minuten"
          className="w-full accent-[var(--color-accent-500)]"
        />
        <p className="text-[12px] text-[var(--color-fg-faint)]">
          Tür-zu-Tür mit Öffis. {max === 0 && "Nur Homeoffice oder Wohnort?"}
        </p>
      </div>

      <ChipPicker
        label="Branchen"
        options={BRANCHEN}
        value={profile.branchen || []}
        onChange={(v) => onChange({ branchen: v })}
        multiple
        hint="Mehrere möglich. „Egal“ schließt nichts aus."
      />

      <Field
        label="Verfügbar ab"
        name="verfuegbarAb"
        type="date"
        value={profile.verfuegbarAb}
        onChange={(v) => onChange({ verfuegbarAb: v })}
        hint="Frühestes Startdatum. Kann grob sein."
      />
    </div>
  );
}
