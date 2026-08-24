import { Link } from "react-router-dom";
import LegalLayout from "../components/ui/LegalLayout";

/** Static terms of service page (Austrian AGB). */
export default function TermsPage() {
  const linkClass = "text-[var(--app-brand)] underline decoration-dotted underline-offset-2 hover:text-[var(--app-brand-hover)] transition-colors";
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-3";

  return (
    <LegalLayout
      title={<>Allgemeine <span className="font-display italic text-[var(--app-brand)]">Geschäfts­bedingungen</span></>}
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
            JobAssist ist derzeit kostenlos. Alle registrierten Nutzer:innen haben Zugang zum vollen Funktionsumfang.
            Zukünftige Tarifmodelle werden gesondert angekündigt.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>3. Kosten</h2>
          <p>JobAssist ist derzeit ein <strong className="text-[var(--color-fg)]">kostenloser Service</strong>.</p>
          <p className="mt-2">
            Es fallen keine Nutzungsgebühren an. Solange keine kostenpflichtigen Pläne aktiviert sind, bestehen keine
            Zahlungsverpflichtungen. Sollten in Zukunft kostenpflichtige Funktionen eingeführt werden, werden bestehende
            Nutzer:innen vorab informiert.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>4. Widerrufsbelehrung</h2>
          <div className="rounded-xl border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] p-4">
            <p className="font-semibold text-[var(--color-fg)] mb-2">Wichtiger Hinweis:</p>
            <p>
              Da JobAssist derzeit <strong className="text-[var(--color-fg)]">kostenlos</strong> ist und kein Kaufvertrag zustande kommt,
              besteht kein gesetzliches Widerrufsrecht im Sinne des FAGG. Du kannst dein Konto jederzeit
              in den Einstellungen löschen.
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
          <h2 className={h2Class}>7. Kontolöschung</h2>
          <p>
            Du kannst dein Konto jederzeit in den Einstellungen löschen. Die Löschung ist endgültig und
            entfernt alle deine Daten, Lebensläufe und gespeicherten Stellen.
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
