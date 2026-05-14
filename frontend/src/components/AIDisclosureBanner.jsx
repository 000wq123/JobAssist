import { Info } from "lucide-react";

const CONFIGS = {
  cover_letter: {
    title: "KI-generierter Entwurf",
    text: "Dieser Text wurde von einer KI erstellt. Überprüfe und passe ihn an, bevor du ihn versendest.",
    article: "Art. 50 Abs. 1 EU AI Act",
  },
  interview: {
    title: "KI-generierte Übungsfragen",
    text: "Diese Fragen dienen der Vorbereitung. Sie spiegeln nicht zwingend reale Interviews wider.",
    article: "Art. 50 Abs. 1 EU AI Act",
  },
  company_research: {
    title: "KI-generierte Zusammenfassung",
    text: "Diese Informationen basieren auf öffentlichen Quellen und können veraltet sein. Bitte verifiziere kritische Angaben.",
    article: "Art. 50 Abs. 1 EU AI Act",
  },
  ai_chat: {
    title: "Du chattest mit einer KI",
    text: "Dies ist kein Mensch. Die KI kann Fehler machen. Für rechtliche oder finanzielle Fragen wende dich an einen Fachmann.",
    article: "Art. 50 Abs. 1 EU AI Act — Pflicht zur Offenlegung bei GPAI-Interaktion",
  },
};

/**
 * EU AI Act disclosure banner shown above AI-generated content.
 * @param {object} props
 * @param {'cover_letter'|'interview'|'company_research'|'ai_chat'} props.feature
 */
export default function AIDisclosureBanner({ feature }) {
  const info = CONFIGS[feature];
  if (!info) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-300" aria-hidden="true" />
      <div>
        <strong className="text-brand-200">{info.title}</strong>
        <p className="mt-0.5 text-slate-300">{info.text}</p>
        <p className="mt-1 text-[11px] text-brand-300/70">{info.article}</p>
      </div>
    </div>
  );
}
