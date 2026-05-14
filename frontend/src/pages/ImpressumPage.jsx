import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Static Austrian Impressum (legal notice) page as required by §5 ECG. */
export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-extrabold text-white mb-2">Impressum</h1>
        <p className="text-sm text-slate-500 mb-10">Angaben gemäß § 5 E-Commerce-Gesetz (ECG) und § 25 Mediengesetz (MedienG)</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-slate-300">
          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-4">Unternehmensangaben</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-white sm:w-48 flex-shrink-0">Name</dt>
                <dd className="text-slate-400">Davor Radeski</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-white sm:w-48 flex-shrink-0">Unternehmensgegenstand</dt>
                <dd className="text-slate-400">IT-Dienstleistungen / Softwareentwicklung</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-white sm:w-48 flex-shrink-0">Status</dt>
                <dd className="text-slate-400">Nicht gewerblich registriert — privates Projekt</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-white sm:w-48 flex-shrink-0">Anschrift</dt>
                <dd className="text-slate-400">Österreich</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-white sm:w-48 flex-shrink-0">E-Mail</dt>
                <dd className="text-slate-400">info@jobassist.tech</dd>
              </div>
            </dl>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-4">Medieninhaber & Herausgeber</h2>
            <p className="text-slate-400">
              Medieninhaber und Herausgeber dieser Website ist die oben genannte Person. Grundlegende Richtung des Mediums: Information über das Produkt JobAssist und KI-gestützte Bewerbungshilfe für den österreichischen Arbeitsmarkt.
            </p>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-4">Haftungsausschluss</h2>
            <p className="text-slate-400">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p className="mt-2 text-slate-400">
              Die von der KI generierten Inhalte stellen keine Rechts-, Karriere- oder Finanzberatung dar. Die Nutzung erfolgt auf eigene Verantwortung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Streitbeilegung</h2>
            <p className="text-slate-400">
              Online-Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p className="mt-2 text-slate-400">
              Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
