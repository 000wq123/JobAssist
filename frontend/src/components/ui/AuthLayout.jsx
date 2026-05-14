import { Sparkles, Target, FileText, MessageSquare } from "lucide-react";

const features = [
  { icon: Target, title: "Intelligentes Matching", desc: "KI-gestützter Lebenslauf-Stellen-Abgleich" },
  { icon: FileText, title: "Motivationsschreiben", desc: "Maßgeschneiderte Schreiben in Sekunden" },
  { icon: MessageSquare, title: "Vorstellungsgespräch", desc: "Individuelle Fragen basierend auf deinem Profil" },
];

/**
 * Two-panel auth shell: branding on the left, form slot on the right.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-[#08090c] relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-56 h-56 xl:w-80 xl:h-80 2xl:w-96 2xl:h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-52 h-52 xl:w-72 xl:h-72 2xl:w-80 2xl:h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-44 h-44 xl:w-56 xl:h-56 2xl:w-64 2xl:h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-center px-8 xl:px-12 2xl:px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">JobAssist</span>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            Finde deinen Traumjob<br />mit KI an deiner Seite
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-md">
            Lade deinen Lebenslauf hoch, füge eine Stellenbeschreibung ein und erhalte sofort Match-Bewertungen, maßgeschneiderte Motivationsschreiben und Gesprächsvorbereitung.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-white/60 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:p-8 bg-[#08090c] min-h-screen">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-100">JobAssist</span>
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
