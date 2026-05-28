import { Link } from "react-router-dom";
import LegalLayout from "../components/ui/LegalLayout";

/** Static terms of service page (Austrian AGB). */
export default function TermsPage() {
  const linkClass = "text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] hover:underline transition-colors";
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-3";

  return (
    <LegalLayout
      title={<>Allgemeine <span className="font-display italic text-[var(--color-accent-300)]">Geschäfts­bedingungen</span></>}
      subtitle="Stand: 23. März 2026"
    >
      <div className="space-y-6 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
        <section className={sectionClass}>
          <h2 className={h2Class}>1. Geltungsbereich</h2>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Plattform <strong className="text-[var(--color-fg)]">JobAssist</strong>
            {" "}(nachfolgend „Dienst"), betrieben von JobAssist (siehe{" "}
            <Link to="/impressum" className={linkClass}>Impressum</Link>
            ). Der Dienst richtet sich an Nutzer in Österreich und unterstützt bei der Stellensuche auf dem österreichischen Arbeitsmarkt.
          </p>
          <p className="mt-2">Mit der Registrierung oder Nutzung des Dienstes akzeptierst du diese AGB in vollem Umfang.</p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>2. Leistungsbeschreibung</h2>
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

        <section className={sectionClass}>
          <h2 className={h2Class}>3. Preise und Zahlung</h2>
          <p>Der <strong className="text-[var(--color-fg)]">Basic-Plan</strong> ist kostenlos und bietet eingeschränkte Funktionen.</p>
          <p className="mt-2">
            Der <strong className="text-[var(--color-fg)]">Pro-Plan</strong> kostet <strong className="text-[var(--color-fg)]">€4,99 pro Monat</strong> und beinhaltet u.a. 15 Lebenslauf-Analysen,
            25 Anschreiben, 10 aktive Job-Alerts und 200 KI-Nachrichten pro Monat.
          </p>
          <p className="mt-2">
            Der <strong className="text-[var(--color-fg)]">Max-Plan</strong> kostet <strong className="text-[var(--color-fg)]">€7,99 pro Monat</strong> und bietet unbegrenzte Nutzung aller Funktionen.
          </p>
          <p className="mt-2">Es wird keine MwSt. ausgewiesen.</p>
          <p className="mt-2">
            Die Zahlungsabwicklung erfolgt über <strong className="text-[var(--color-fg)]">Stripe</strong>. Abonnements verlängern sich automatisch monatlich
            und können jederzeit vor dem nächsten Abrechnungszeitraum gekündigt werden.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>4. Widerrufsbelehrung (digitale Inhalte)</h2>
          <div className="rounded-xl border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] p-4">
            <p className="font-semibold text-[var(--color-fg)] mb-2">Wichtiger Hinweis zum Widerrufsrecht:</p>
            <p>
              Als Verbraucher hast du grundsätzlich ein <strong className="text-[var(--color-fg)]">14-tägiges Widerrufsrecht</strong> ab Vertragsabschluss
              gemäß § 11 FAGG (Fern- und Auswärtsgeschäfte-Gesetz).
            </p>
            <p className="mt-2">
              Da es sich bei JobAssist um einen <strong className="text-[var(--color-fg)]">digitalen Dienst</strong> handelt, der sofort nach der Zahlung
              bereitgestellt wird, stimmst du mit dem Kauf ausdrücklich zu, dass die Leistung sofort beginnt, und bestätigst,
              dass du damit dein Widerrufsrecht verlierst, sobald der Dienst vollständig erbracht oder die KI-Funktionen genutzt wurden (§ 18 Abs. 1 Z 11 FAGG).
            </p>
            <p className="mt-2">
              Wurde der Dienst noch nicht genutzt (keine KI-Analyse, kein Anschreiben generiert, kein KI-Chat), kannst du
              innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. Der Widerruf ist per E-Mail an{" "}
              <strong className="text-[var(--color-fg)]">info@jobassist.tech</strong> zu richten.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>5. Nutzungsbedingungen</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Du musst mindestens 16 Jahre alt sein, um den Dienst zu nutzen.</li>
            <li>Jede Person darf nur ein Konto erstellen.</li>
            <li>Die von der KI generierten Inhalte (Anschreiben, Analysen) sind Vorschläge und keine rechtsverbindliche Beratung.</li>
            <li>Du bist selbst verantwortlich für die Richtigkeit und Verwendung der generierten Inhalte.</li>
            <li>Ein Missbrauch des Dienstes (z.B. automatisierte Massenzugriffe, Weiterverkauf) ist untersagt.</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>6. Verfügbarkeit und Haftung</h2>
          <p>
            Wir bemühen uns, den Dienst rund um die Uhr verfügbar zu halten, können aber keine 100%ige Verfügbarkeit garantieren.
            Wartungsarbeiten und technische Störungen sind möglich.
          </p>
          <p className="mt-2">
            Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Für die Richtigkeit der KI-generierten Inhalte
            übernehmen wir keine Gewähr.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>7. Kündigung</h2>
          <p>
            Du kannst dein Abonnement jederzeit über die Kontoeinstellungen oder das Stripe-Kundenportal kündigen.
            Die Kündigung wird zum Ende des laufenden Abrechnungszeitraums wirksam. Nach der Kündigung behältst du Zugang zu den Basic-Funktionen.
          </p>
          <p className="mt-2">Wir behalten uns das Recht vor, Konten bei Verstoß gegen diese AGB zu sperren oder zu löschen.</p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>8. Änderungen der AGB</h2>
          <p>
            Wir können diese AGB jederzeit anpassen. Wesentliche Änderungen werden dir per E-Mail mitgeteilt.
            Durch die weitere Nutzung des Dienstes nach Inkrafttreten der Änderungen stimmst du den neuen AGB zu.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>9. Anwendbares Recht und Gerichtsstand</h2>
          <p>
            Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist das sachlich zuständige Gericht in Österreich.
            Für Verbraucher gelten die zwingenden Bestimmungen des Konsumentenschutzgesetzes (KSchG).
          </p>
          <p className="mt-2">
            Online-Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO: Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className={linkClass}>
              https://ec.europa.eu/consumers/odr
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
