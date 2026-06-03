import { useState } from "react";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import TagInput from "./TagInput";
import api from "../../services/api";

const HOBBY_SUGGESTIONS = [
  "Fußball", "Lesen", "Gaming", "Musik", "Tanzen",
  "Klettern", "Fotografie", "Kochen", "Reisen", "Programmieren",
];

const HOBBIES_KEY = "_cv_hobby_tags";

/**
 * The schema stores hobbies as a freeform string. We surface it here as a
 * tag input + optional Kurzbeschreibung. To keep zero schema churn, the chip
 * tags are joined with ", " when written and split on commas when read.
 *
 * @param {object} props
 * @param {import("../../cv/profileSchema").CVProfile} props.profile
 * @param {(patch: Partial<import("../../cv/profileSchema").CVProfile>) => void} props.onChange
 */
export default function StepInteressen({ profile, onChange }) {
  const [polishing, setPolishing] = useState(false);

  const raw = profile.hobbies || "";
  const [firstLine, ...restLines] = raw.split("\n");
  const tags = firstLine
    ? firstLine.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const prose = restLines.join("\n");

  const join = (nextTags, nextProse) => {
    const tagsLine = nextTags.join(", ");
    const out = nextProse ? `${tagsLine}\n${nextProse}` : tagsLine;
    onChange({ hobbies: out });
  };

  const handlePolish = async () => {
    const input = prose.trim() || tags.join(", ");
    if (!input) { toast.error("Bitte erst etwas eingeben."); return; }
    setPolishing(true);
    try {
      const res = await api.post("/cv/polish-text", {
        text: input,
        context: `Hobbys: ${tags.join(", ")}`,
        max_chars: 220,
      });
      const improved = res.data?.result ?? res.data?.text ?? "";
      if (improved) join(tags, improved.slice(0, 250));
      else toast.error("Kein Ergebnis erhalten.");
    } catch {
      toast.error("KI-Optimierung nicht verfügbar. Bitte später erneut versuchen.");
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" data-key={HOBBIES_KEY}>
      <TagInput
        label="Hobbys"
        value={tags}
        onChange={(t) => join(t, prose)}
        suggestions={HOBBY_SUGGESTIONS}
        placeholder="Was machst du gern?"
        hint="Drei bis fünf Hobbys reichen. Sei ruhig konkret."
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="cv-hobby-prose"
            className="text-[12px] font-medium text-[var(--color-fg-muted)]"
          >
            Kurzbeschreibung (optional)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePolish}
              disabled={polishing}
              title="KI-Optimierung: Beschreibung verbessern"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all disabled:opacity-50 hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-300)]"
              style={{ borderColor: "rgba(124,125,240,0.3)", color: "var(--color-accent-400)" }}
            >
              <Sparkles className={`w-3 h-3 ${polishing ? "animate-pulse" : ""}`} />
              {polishing ? "Optimiert…" : "KI-Vorschlag"}
            </button>
            <span className="text-[11px] text-[var(--color-fg-faint)]">
              {prose.length}/250
            </span>
          </div>
        </div>
        <textarea
          id="cv-hobby-prose"
          value={prose}
          maxLength={250}
          onChange={(e) => join(tags, e.target.value)}
          placeholder="z. B. Spiele seit drei Jahren in einem Vereinsteam, trainiere zweimal pro Woche."
          rows={3}
          className="rounded-md border border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent-500)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.15)] focus:outline-none bg-[var(--color-bg-input)] px-3 py-2 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] resize-none"
        />
      </div>
    </div>
  );
}
