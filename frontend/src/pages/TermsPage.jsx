import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Static terms of service page. */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Link>

        <h1 className="mb-2 text-3xl font-extrabold text-slate-100">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="mb-10 text-sm text-slate-400">Stand: 23. März 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[15px] leading-relaxed text-slate-300">
          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">1. Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Plattform <strong>JobAssist</strong>
              {" "} (nachfolgend „Dienst"), betrieben von JobAssist (siehe{" "}
              <Link to="/impressum" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">
                Impressum
              </Link>
              ). Der Dienst richtet sich an Nutzer in Österreich und unterstützt bei der Stellensuche auf dem österreichischen Arbeitsmarkt.
            </p>
            <p>Mit der Registrierung oder Nutzung des Dienstes akzeptierst du diese AGB in vollem Umfang.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">2. Leistungsbeschreibung</h2>
            <p>JobAssist bietet KI-gestützte Werkzeuge zur Unterstützung bei der Jobsuche, darunter:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Analyse von Lebensläufen (CV-Analysen) mittels künstlicher Intelligenz</li>
              <li>Erstellung von Motivationsschreiben</li>
              <li>Job-Alerts per E-Mail</li>
              <li>KI-Chat-Assistent für Bewerbungsfragen</li>
              <li>Jobsuche und Pipeline-Tracking</li>
            </ul>
            <p className="mt-2">
              Der Umfang der verfügbaren Funktionen richtet sich nach dem gewählten Plan (Basic, Pro, Max oder Enterprise).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">3. Preise und Zahlung</h2>
            <p>Der <strong>Basic-Plan</strong> ist kostenlos und bietet eingeschränkte Funktionen.</p>
            <p>
              Der <strong>Pro-Plan</strong> kostet <strong>€4,99 pro Monat</strong> und beinhaltet u.a. 15 Lebenslauf-Analysen,
              25 Anschreiben, 10 aktive Job-Alerts und 200 KI-Nachrichten pro Monat.
            </p>
            <p>
              Der <strong>Max-Plan</strong> kostet <strong>€7,99 pro Monat</strong> und bietet unbegrenzte Nutzung aller Funktionen.
            </p>
            <p>Es wird keine MwSt. ausgewiesen.</p>
            <p>
              Die Zahlungsabwicklung erfolgt über <strong>Stripe</strong>. Abonnements verlängern sich automatisch monatlich
              und können jederzeit vor dem nächsten Abrechnungszeitraum gekündigt werden.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">4. Widerrufsbelehrung (digitale Inhalte)</h2>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="mb-2 font-semibold text-slate-100">Wichtiger Hinweis zum Widerrufsrecht:</p>
              <p>
                Als Verbraucher hast du grundsätzlich ein <strong>14-tägiges Widerrufsrecht</strong> ab Vertragsabschluss
                gemäß § 11 FAGG (Fern- und Auswärtsgeschäfte-Gesetz).
              </p>
              <p className="mt-2">
                Da es sich bei JobAssist um einen <strong>digitalen Dienst</strong> handelt, der sofort nach der Zahlung
                bereitgestellt wird, stimmst du mit dem Kauf ausdrücklich zu, dass die Leistung sofort beginnt, und bestätigst,
                dass du damit dein Widerrufsrecht verlierst, sobald der Dienst vollständig erbracht oder die KI-Funktionen genutzt wurden (§ 18 Abs. 1 Z 11 FAGG).
              </p>
              <p className="mt-2">
                Wurde der Dienst noch nicht genutzt (keine KI-Analyse, kein Anschreiben generiert, kein KI-Chat), kannst du
                innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. Der Widerruf ist per E-Mail an{" "}
                <strong>info@jobassist.tech</strong> zu richten.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">5. Nutzungsbedingungen</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Du musst mindestens 16 Jahre alt sein, um den Dienst zu nutzen.</li>
              <li>Jede Person darf nur ein Konto erstellen.</li>
              <li>Die von der KI generierten Inhalte (Anschreiben, Analysen) sind Vorschläge und keine rechtsverbindliche Beratung.</li>
              <li>Du bist selbst verantwortlich für die Richtigkeit und Verwendung der generierten Inhalte.</li>
              <li>Ein Missbrauch des Dienstes (z.B. automatisierte Massenzugriffe, Weiterverkauf) ist untersagt.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">6. Verfügbarkeit und Haftung</h2>
            <p>
              Wir bemühen uns, den Dienst rund um die Uhr verfügbar zu halten, können aber keine 100%ige Verfügbarkeit garantieren.
              Wartungsarbeiten und technische Störungen sind möglich.
            </p>
            <p>
              Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Für die Richtigkeit der KI-generierten Inhalte
              übernehmen wir keine Gewähr.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">7. Kündigung</h2>
            <p>
              Du kannst dein Abonnement jederzeit über die Kontoeinstellungen oder das Stripe-Kundenportal kündigen.
              Die Kündigung wird zum Ende des laufenden Abrechnungszeitraums wirksam. Nach der Kündigung behältst du Zugang zu den Basic-Funktionen.
            </p>
            <p>Wir behalten uns das Recht vor, Konten bei Verstoß gegen diese AGB zu sperren oder zu löschen.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">8. Änderungen der AGB</h2>
            <p>
              Wir können diese AGB jederzeit anpassen. Wesentliche Änderungen werden dir per E-Mail mitgeteilt.
              Durch die weitere Nutzung des Dienstes nach Inkrafttreten der Änderungen stimmst du den neuen AGB zu.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-100">9. Anwendbares Recht und Gerichtsstand</h2>
            <p>
              Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist das sachlich zuständige Gericht in Österreich.
              Für Verbraucher gelten die zwingenden Bestimmungen des Konsumentenschutzgesetzes (KSchG).
            </p>
            <p className="mt-2">
              Online-Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO: Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
