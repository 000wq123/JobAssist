import { useEffect, useState } from "react";

import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import Field from "./Field";
import ChipPicker from "./ChipPicker";

const ART_OPTIONS = [
  { value: "Praktikum",         label: "Praktikum" },
  { value: "Teilzeit",          label: "Teilzeit" },
  { value: "Babysitten",        label: "Babysitten" },
  { value: "Nachhilfe",         label: "Nachhilfe" },
  { value: "Ferialjob",         label: "Ferialjob" },
  { value: "Familienbetrieb",   label: "Familienbetrieb" },
  { value: "Ehrenamt",          label: "Ehrenamt" },
  { value: "Sport",             label: "Sport" },
  { value: "Schulprojekt",      label: "Schulprojekt" },
  { value: "Eigenes Projekt",   label: "Eigenes Projekt" },
  { value: "Sonstige",          label: "Sonstige" },
];

/** @returns {import("../../cv/profileSchema").CVExperience} */
function emptyExperience(prefill = {}) {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    art: "",
    titel: "",
    organisation: "",
    von: "",
    bis: "",
    bullets: [],
    ...prefill,
  };
}

/**
 * Modal editor for a single experience entry. Renders inside BottomSheet.
 * Pass `experience: null` for a fresh "add" flow; pass an existing entry to edit.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(exp: import("../../cv/profileSchema").CVExperience) => void} props.onSave
 * @param {(id: string) => void} [props.onDelete]
 * @param {import("../../cv/profileSchema").CVExperience | {art?:string,titel?:string} | null} props.experience
 */
export default function ExperienceEditor({
  open,
  onClose,
  onSave,
  onDelete,
  experience,
}) {
  const isExisting = !!(experience && experience.id);
  const [draft, setDraft] = useState(() => emptyExperience(experience || {}));
  const [bulletsText, setBulletsText] = useState(
    (experience?.bullets || []).join("\n"),
  );

  // Reset internal state when the editor opens with a new target.
  useEffect(() => {
    if (open) {
      setDraft(emptyExperience(experience || {}));
      setBulletsText((experience?.bullets || []).join("\n"));
    }
  }, [open, experience]);

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.art && draft.titel.trim() &&
    (!draft.von || !draft.bis || draft.von <= draft.bis);

  const handleSave = () => {
    if (!valid) return;
    const bullets = bulletsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    onSave({ ...draft, bullets });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isExisting ? "Erfahrung bearbeiten" : "Erfahrung hinzufügen"}
    >
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
        <ChipPicker
          label="Art"
          options={ART_OPTIONS}
          value={draft.art || null}
          onChange={(v) => set("art")(v || "")}
        />

        <Field
          label="Titel"
          name="exp-titel"
          required
          value={draft.titel}
          onChange={set("titel")}
          placeholder="z. B. Babysitterin Familie Müller"
        />

        <Field
          label="Wo? (optional)"
          name="exp-org"
          value={draft.organisation}
          onChange={set("organisation")}
          placeholder="Firma, Verein oder Privat"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Von"
            name="exp-von"
            type="month"
            value={draft.von}
            onChange={set("von")}
          />
          <Field
            label="Bis"
            name="exp-bis"
            type="month"
            value={draft.bis}
            onChange={set("bis")}
            hint={!draft.bis ? "Leer = laufend" : undefined}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="exp-bullets"
            className="text-[12px] font-medium text-[var(--color-fg-muted)]"
          >
            Was hast du gemacht? (eine Aufgabe pro Zeile)
          </label>
          <textarea
            id="exp-bullets"
            value={bulletsText}
            onChange={(e) => setBulletsText(e.target.value)}
            rows={4}
            placeholder={"Auf zwei Kinder (4 + 7) aufgepasst\nHausaufgaben begleitet\nAbendessen vorbereitet"}
            className="rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-3 py-2 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border)] mt-4">
        {isExisting && onDelete && (
          <Button
            variant="danger"
            onClick={() => {
              onDelete(draft.id);
              onClose();
            }}
          >
            Löschen
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave} disabled={!valid}>
          Speichern
        </Button>
      </div>
    </BottomSheet>
  );
}
