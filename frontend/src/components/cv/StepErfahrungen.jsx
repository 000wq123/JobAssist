import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";

import ExperienceEditor from "./ExperienceEditor";

const SUGGESTION_CHIPS = [
  "Babysitten", "Nachhilfe", "Ferialjob", "Familienbetrieb",
  "Ehrenamt", "Sport", "Schulprojekt", "Eigenes Projekt",
];

/** "YYYY-MM" → "MM.YYYY" for compact display. Falls back to the raw value. */
function fmtMonth(s) {
  if (!s || !/^\d{4}-\d{2}/.test(s)) return s || "";
  const [y, m] = s.split("-");
  return `${m}.${y}`;
}

function rangeLabel(von, bis) {
  if (!von && !bis) return "";
  if (von && !bis) return `${fmtMonth(von)} — laufend`;
  if (!von && bis) return `bis ${fmtMonth(bis)}`;
  return `${fmtMonth(von)} – ${fmtMonth(bis)}`;
}

/**
 * Step 3 — Erfahrungen.
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 */
export default function StepErfahrungen({ profile, onChange }) {
  const list = Array.isArray(profile.erfahrungen) ? profile.erfahrungen : [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [target, setTarget] = useState(null);

  const openAdd = (prefill) => {
    setTarget(prefill || null);
    setEditorOpen(true);
  };
  const openEdit = (exp) => {
    setTarget(exp);
    setEditorOpen(true);
  };

  const upsert = (exp) => {
    const exists = list.some((e) => e.id === exp.id);
    const next = exists
      ? list.map((e) => (e.id === exp.id ? exp : e))
      : [...list, exp];
    onChange({ erfahrungen: next });
  };

  const remove = (id) => {
    onChange({ erfahrungen: list.filter((e) => e.id !== id) });
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ erfahrungen: next });
  };

  const isEmpty = list.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/40 p-5 flex flex-col gap-3">
          <p className="text-sm text-[var(--color-fg)]">
            Noch keine Erfahrung eingetragen.
          </p>
          <p className="text-[13px] text-[var(--color-fg-muted)]">
            Babysitten, Nachhilfe, Familienbetrieb zählen auch.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((exp, i) => (
            <li
              key={exp.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-3 flex gap-3"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
                    {exp.art || "Sonstige"}
                  </span>
                  {(exp.von || exp.bis) && (
                    <span className="text-[11px] text-[var(--color-fg-faint)]">
                      {rangeLabel(exp.von, exp.bis)}
                    </span>
                  )}
                </div>
                <p className="text-[14px] font-medium text-[var(--color-fg)] truncate">
                  {exp.titel || "Ohne Titel"}
                </p>
                {exp.organisation && (
                  <p className="text-[12px] text-[var(--color-fg-muted)] truncate">
                    {exp.organisation}
                  </p>
                )}
                {exp.bullets?.length > 0 && (
                  <p className="text-[12px] text-[var(--color-fg-faint)] line-clamp-2">
                    {exp.bullets.join(" · ")}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Nach oben"
                  className="h-11 w-11 -m-1.5 md:m-0 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, +1)}
                  disabled={i === list.length - 1}
                  aria-label="Nach unten"
                  className="h-11 w-11 -m-1.5 md:m-0 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => openEdit(exp)}
                aria-label={`${exp.titel || "Eintrag"} bearbeiten`}
                className="self-start h-11 w-11 -m-1.5 md:m-0 md:h-8 md:w-8 inline-flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => openAdd(null)}
          className="self-start inline-flex items-center gap-1.5 h-11 px-3.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[13px] font-medium text-[var(--color-fg)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elev-2)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Erfahrung hinzufügen
        </button>

        <div className="flex flex-col gap-1.5 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
            Schnell hinzufügen
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => openAdd({ art: s, titel: s })}
                className="min-h-[44px] px-3 rounded-full border border-dashed border-[var(--color-border)] text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-200)] transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ExperienceEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={upsert}
        onDelete={remove}
        experience={target}
      />
    </div>
  );
}
