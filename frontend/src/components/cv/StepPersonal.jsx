import Field from "./Field";

const EU_EFTA = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "CH",
]);

const COUNTRIES = [
  { code: "AT", label: "Österreich" },
  { code: "DE", label: "Deutschland" },
  { code: "IT", label: "Italien" },
  { code: "HU", label: "Ungarn" },
  { code: "SK", label: "Slowakei" },
  { code: "SI", label: "Slowenien" },
  { code: "CZ", label: "Tschechien" },
  { code: "CH", label: "Schweiz" },
  { code: "TR", label: "Türkei" },
  { code: "BA", label: "Bosnien-Herzegowina" },
  { code: "RS", label: "Serbien" },
  { code: "HR", label: "Kroatien" },
  { code: "UA", label: "Ukraine" },
  { code: "SYRIA", label: "Syrien" },
  { code: "OTHER", label: "Anderes Land" },
];

/**
 * Step 1 — Persönliches.
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 * @param {Record<string,string>} [props.errors]
 */
export default function StepPersonal({ profile, onChange, errors = {} }) {
  const set = (k) => (v) => onChange({ [k]: v });

  const needsArbeitserlaubnis = !EU_EFTA.has(profile.staatsbuergerschaft);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Vorname"
          name="vorname"
          required
          value={profile.vorname}
          onChange={set("vorname")}
          autoComplete="given-name"
          error={errors.vorname}
        />
        <Field
          label="Nachname"
          name="nachname"
          required
          value={profile.nachname}
          onChange={set("nachname")}
          autoComplete="family-name"
          error={errors.nachname}
        />
      </div>

      <Field
        label="Geburtsdatum"
        name="geburtsdatum"
        type="date"
        value={profile.geburtsdatum}
        onChange={set("geburtsdatum")}
        autoComplete="bday"
        error={errors.geburtsdatum}
        hint="Auf österreichischen Lebensläufen üblich. Wenn du nicht möchtest, lass es offen."
      />

      <Field
        label="Straße + Hausnummer"
        name="strasse"
        value={profile.strasse}
        onChange={set("strasse")}
        autoComplete="street-address"
      />

      <div className="grid grid-cols-[100px_1fr] gap-3">
        <Field
          label="PLZ"
          name="plz"
          value={profile.plz}
          onChange={(v) => onChange({ plz: v.replace(/\D/g, "").slice(0, 4) })}
          placeholder="1010"
          maxLength={4}
          inputMode="numeric"
          pattern="\d{4}"
          autoComplete="postal-code"
          error={errors.plz}
        />
        <Field
          label="Ort"
          name="ort"
          value={profile.ort}
          onChange={set("ort")}
          placeholder="Wien"
          autoComplete="address-level2"
        />
      </div>

      <Field
        label="Telefon"
        name="telefon"
        type="tel"
        value={profile.telefon}
        onChange={set("telefon")}
        prefix="+43"
        placeholder="664 1234567"
        autoComplete="tel-national"
        error={errors.telefon}
      />

      <Field
        label="E-Mail"
        name="email"
        type="email"
        value={profile.email}
        onChange={set("email")}
        placeholder="vorname.nachname@example.com"
        autoComplete="email"
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cv-staatsbuergerschaft"
          className="text-[12px] font-medium text-[var(--color-fg-muted)]"
        >
          Staatsbürgerschaft
        </label>
        <select
          id="cv-staatsbuergerschaft"
          value={profile.staatsbuergerschaft || "AT"}
          onChange={(e) => onChange({ staatsbuergerschaft: e.target.value })}
          className="h-9 w-full rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-fg)]"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-[var(--color-bg-elev-1)]">
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {needsArbeitserlaubnis && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3 flex flex-col gap-2">
          <p className="text-[12px] font-medium text-[var(--color-fg-muted)]">
            Arbeitserlaubnis vorhanden?
          </p>
          <p className="text-[12px] text-[var(--color-fg-faint)]">
            In Österreich brauchen Drittstaatsangehörige meist eine
            Beschäftigungsbewilligung. Wenn du unsicher bist, lass es offen.
          </p>
          <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Arbeitserlaubnis vorhanden">
            {[
              { v: true, label: "Ja" },
              { v: false, label: "Nein" },
              { v: null, label: "Weiß nicht" },
            ].map((opt) => {
              const selected = profile.arbeitserlaubnis === opt.v;
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ arbeitserlaubnis: opt.v })}
                  className={
                    "min-h-[40px] px-4 rounded-md border text-[13px] font-medium transition-colors " +
                    (selected
                      ? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/15 text-[var(--color-accent-200)]"
                      : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)]")
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
