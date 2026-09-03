import Field from "./Field";
import ChipPicker from "./ChipPicker";

const SCHULTYP_OPTIONS = [
  { value: "AHS",      label: "AHS" },
  { value: "HTL",      label: "HTL" },
  { value: "HAK",      label: "HAK" },
  { value: "BHS",      label: "BHS" },
  { value: "NMS",      label: "NMS / MS" },
  { value: "PTS",      label: "PTS" },
  { value: "Sonstige", label: "Andere" },
];

const NOW_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => NOW_YEAR + i);

/**
 * Step 2 — Schule.
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 * @param {Record<string,string>} [props.errors]
 */
export default function StepSchule({ profile, onChange, errors = {} }) {
  const set = (k) => (v) => onChange({ [k]: v });

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Schule"
        name="schulname"
        required
        value={profile.schulname}
        onChange={set("schulname")}
        placeholder="z. B. BG/BRG Wien Hütteldorferstraße"
        autoComplete="organization"
        error={errors.schulname}
      />

      <ChipPicker
        label="Schultyp"
        options={SCHULTYP_OPTIONS}
        value={profile.schultyp || null}
        onChange={(v) => onChange({ schultyp: v || "" })}
        error={errors.schultyp}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Klasse"
          name="klasse"
          value={profile.klasse}
          onChange={set("klasse")}
          placeholder="z. B. 7B"
          maxLength={6}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cv-abschlussjahr"
            className="text-[12px] font-medium text-[var(--color-fg-muted)]"
          >
            Geplanter Abschluss
          </label>
          <select
            id="cv-abschlussjahr"
            value={profile.abschlussjahr ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ abschlussjahr: v ? Number(v) : null });
            }}
            className="h-11 w-full rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-fg)]"
          >
            <option value="" className="bg-[var(--color-bg-elev-1)]">— Jahr wählen —</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y} className="bg-[var(--color-bg-elev-1)]">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
