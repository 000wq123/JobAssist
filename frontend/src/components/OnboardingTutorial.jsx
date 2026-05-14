import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, FileText, Briefcase, Bot, Bell, PenLine,
  ArrowRight, X, Check,
} from "lucide-react";
import useAuthStore from "../hooks/useAuthStore";

const LS_KEY = "onboarding_done";

const STEPS = [
  {
    icon: Sparkles,
    iconBg: "from-brand-500 to-accent-600",
    iconShadow: "shadow-brand-200",
    tag: "Willkommen",
    title: "Dein KI-Bewerbungsassistent",
    description:
      "JobAssist hilft dir, deinen Traumjob in Österreich zu finden. Lebenslauf analysieren, Anschreiben erstellen, Interviews üben — alles an einem Ort.",
    cta: null,
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 opacity-60 blur-2xl" />
        </div>
        <div className="relative flex gap-3">
          {["bg-blue-100 text-blue-600", "bg-violet-100 text-violet-600", "bg-emerald-100 text-emerald-600"].map((cls, i) => (
            <div key={i} className={`w-14 h-14 rounded-2xl ${cls} flex items-center justify-center shadow-sm`} style={{ transform: `translateY(${i === 1 ? -8 : 0}px)` }}>
              {i === 0 && <FileText className="w-6 h-6" />}
              {i === 1 && <Sparkles className="w-6 h-6" />}
              {i === 2 && <Briefcase className="w-6 h-6" />}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    iconBg: "from-brand-500 to-brand-600",
    iconShadow: "shadow-brand-200",
    tag: "Schritt 1",
    title: "Lebenslauf hochladen",
    description:
      "Lade deinen Lebenslauf als PDF oder TXT hoch. Die KI analysiert ihn, erkennt deine Stärken und nutzt ihn automatisch für alle Funktionen.",
    cta: { label: "Zu Lebensläufe", path: "/resume" },
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="w-48 bg-[#0d1117] rounded-2xl border-2 border-dashed border-brand-500/40 p-4 flex flex-col items-center gap-2 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-300" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-200">Lebenslauf.pdf</p>
            <p className="text-[10px] text-slate-500">PDF oder TXT · max 5 MB</p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-brand-500/20 overflow-hidden">
            <div className="h-full w-3/4 bg-brand-500 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Briefcase,
    iconBg: "from-emerald-500 to-teal-600",
    iconShadow: "shadow-emerald-200",
    tag: "Schritt 2",
    title: "Jobs suchen & verwalten",
    description:
      "Suche nach aktuellen Stellen in Österreich, speichere interessante Jobs und verwalte deinen Bewerbungsprozess mit dem Kanban-Board.",
    cta: { label: "Zu den Stellen", path: "/jobs" },
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center gap-3">
        {[
          { status: "Gespeichert", color: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-400", company: "Siemens AG" },
          { status: "Beworben", color: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400", company: "ÖBB" },
          { status: "Interview", color: "bg-green-500/10 border-green-500/20", dot: "bg-green-400", company: "AVL" },
        ].map((card, i) => (
          <div key={i} className={`w-28 rounded-xl border p-2.5 ${card.color} shadow-sm`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${card.dot}`} />
              <span className="text-[9px] font-bold text-slate-500 uppercase">{card.status}</span>
            </div>
            <p className="text-[11px] font-bold text-slate-200 leading-tight">{card.company}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Software Engineer</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: PenLine,
    iconBg: "from-violet-500 to-accent-600",
    iconShadow: "shadow-violet-200",
    tag: "Schritt 3",
    title: "Anschreiben & Motivationsschreiben",
    description:
      "Lass die KI ein personalisiertes Anschreiben oder Motivationsschreiben erstellen — abgestimmt auf die Stelle und dein Profil. In Sekunden.",
    cta: { label: "Motivationsschreiben erstellen", path: "/cover-letter" },
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="w-52 bg-[#0d1117] rounded-2xl border border-white/[0.07] shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <PenLine className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="h-2 w-24 rounded-full bg-white/[0.08]" />
          </div>
          {[28, 36, 20, 32].map((w, i) => (
            <div key={i} className="h-1.5 rounded-full bg-white/[0.05]" style={{ width: `${w * 1.5}px` }} />
          ))}
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 w-16 rounded-lg bg-violet-500/10" />
            <div className="h-5 w-12 rounded-lg bg-white/[0.05]" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Bot,
    iconBg: "from-indigo-500 to-violet-600",
    iconShadow: "shadow-indigo-200",
    tag: "Schritt 4",
    title: "KI-Assistent nutzen",
    description:
      "Stelle dem KI-Assistenten Fragen zu deiner Bewerbung, übe Vorstellungsgespräche im Simulator oder lass eine Stärkenanalyse erstellen.",
    cta: { label: "KI-Assistent öffnen", path: "/ai-assistant" },
    illustration: (
      <div className="relative w-full h-36 flex flex-col items-end justify-center gap-2 px-4">
        <div className="self-start max-w-[70%] bg-indigo-600 text-white text-[11px] px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
          Wie bereite ich mich auf ein Interview vor?
        </div>
        <div className="self-end max-w-[75%] bg-slate-100 text-slate-800 text-[11px] px-3 py-2 rounded-2xl rounded-br-sm shadow-sm">
          Hier sind 5 wichtige Tipps für dein nächstes Vorstellungsgespräch…
        </div>
        <div className="self-start max-w-[60%] bg-indigo-600 text-white text-[11px] px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
          Starte den Interview-Simulator!
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    iconBg: "from-amber-500 to-orange-500",
    iconShadow: "shadow-amber-200",
    tag: "Schritt 5",
    title: "Job-Alerts einrichten",
    description:
      "Richte automatische Job-Benachrichtigungen ein. Du bekommst täglich oder wöchentlich passende Stellenangebote direkt in deine E-Mail.",
    cta: { label: "Job-Alert erstellen", path: "/job-alerts" },
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="w-52 bg-[#0d1117] rounded-2xl border border-white/[0.07] shadow-sm overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Neuer Job-Alert</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-slate-400">Software Engineer · Wien</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-slate-400">Marketing Manager · Graz</span>
            </div>
            <div className="text-[9px] text-slate-500">Täglich um 08:00 Uhr</div>
          </div>
        </div>
      </div>
    ),
  },
];

/**
 * Multi-step onboarding overlay shown to first-time users.
 * Dismissed via localStorage and navigates to the relevant feature on completion.
 */
export default function OnboardingTutorial() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!token) return;
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      // Small delay so the main app loads first
      setVisible(true);
      return undefined;
    }
  }, [token]);

  const dismiss = () => {
    setClosing(true);
    setVisible(false);
    setClosing(false);
    localStorage.setItem(LS_KEY, "1");
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const handleCta = (path) => {
    dismiss();
    navigate(path);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-250 ${closing ? "opacity-0" : "opacity-100"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className={`relative w-full max-w-md bg-[#111827] border border-[#1f2937] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-250 ${closing ? "scale-95" : "scale-100"}`}>
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-xl text-slate-400 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Illustration area */}
        <div className="bg-gradient-to-br from-[#0f172a] to-[#111827] pt-8 pb-2">
          {current.illustration}
        </div>

        {/* Content */}
        <div className="px-7 pt-5 pb-7">
          {/* Tag + title */}
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-brand-300 mb-2">
            {current.tag}
          </span>
          <h2 className="text-xl font-extrabold text-slate-100 mb-2 leading-tight">{current.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{current.description}</p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step ? "w-6 h-2 bg-brand-500" : "w-2 h-2 bg-[#1f2937] hover:bg-[#2d3748]"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {current.cta && (
              <button
                onClick={() => handleCta(current.cta.path)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-300 text-sm font-bold hover:bg-brand-500/15 transition-colors"
              >
                {current.cta.label}
              </button>
            )}
            <button
              onClick={handleNext}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-600 text-white text-sm font-bold shadow-lg shadow-brand-500/30 hover:from-brand-400 hover:to-accent-500 transition-all ${current.cta ? "px-5" : "flex-1"}`}
            >
              {isLast ? (
                <><Check className="w-4 h-4" /> Los geht's!</>
              ) : (
                <>Weiter <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <button
            onClick={dismiss}
            className="w-full mt-3 text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            Tutorial überspringen
          </button>
        </div>
      </div>
    </div>
  );
}
