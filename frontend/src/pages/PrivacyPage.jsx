import { Link } from "react-router-dom";
import LegalLayout from "../components/ui/LegalLayout";

/** Static GDPR-compliant privacy policy page. */
export default function PrivacyPage() {
  const linkClass = "text-[var(--app-brand)] underline decoration-dotted underline-offset-2 hover:text-[var(--app-brand-hover)] transition-colors";
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-3";
  const h3Class = "text-[14px] font-semibold text-[var(--color-fg)] mt-4 mb-2";

  return (
    <LegalLayout
      title={<><span className="font-display italic text-[var(--app-brand)]">Datenschutz</span>­erklärung</>}
      subtitle="Stand: 5. April 2026 — gemäß DSGVO (EU-Datenschutz-Grundverordnung)"
    >
      <div className="space-y-6 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
        <section className={sectionClass}>
          <h2 className={h2Class}>1. Verantwortliche Stelle</h2>
          <p>
            Verantwortlich für die Datenverarbeitung ist der Betreiber von JobAssist (siehe{" "}
            <Link to="/impressum" className={linkClass}>Impressum</Link>). Bei Fragen zum Datenschutz erreichst
            du uns unter <strong className="text-[var(--color-fg)]">info@jobassist.tech</strong>.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>2. Welche Daten wir erheben</h2>
          <p>Wir verarbeiten folgende personenbezogene Daten:</p>

          <h3 className={h3Class}>a) Registrierungsdaten</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>E-Mail-Adresse</li>
            <li>Name (optional)</li>
            <li>Passwort (verschlüsselt gespeichert, bcrypt)</li>
          </ul>

          <h3 className={h3Class}>b) Bewerbungsdaten</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hochgeladene Lebensläufe (PDF-Dateien)</li>
            <li>Generierte Motivationsschreiben</li>
            <li>Gespeicherte Stellenangebote und Bewerbungsstatus</li>
            <li>Jobsuche-Präferenzen und Suchverläufe</li>
          </ul>

          <h3 className={h3Class}>c) Nutzungsdaten</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Feature-Nutzung (Anzahl Analysen, Anschreiben, Chat-Nachrichten)</li>
            <li>Geräte- und Browser-Informationen (User-Agent)</li>
            <li>Zeitpunkt des letzten Logins</li>
          </ul>

          <h3 className={h3Class}>d) Geräte-Fingerabdruck (bei Registrierung)</h3>
          <p>
            Bei der Registrierung erstellen wir einen anonymisierten Geräte-Fingerabdruck aus technischen
            Browser-Merkmalen (z.&nbsp;B. Bildschirmauflösung, installierte Schriftarten, Grafikkarten-Rendering,
            Zeitzone). Daraus wird ein eindeutiger Hash-Wert generiert und gespeichert. Es werden{" "}
            <strong className="text-[var(--color-fg)]">keine personenbezogenen Daten</strong> wie Name,
            IP-Adresse oder Cookies für den Fingerabdruck verwendet. Der Fingerabdruck dient ausschließlich der
            Missbrauchsprävention (Verhinderung mehrerer Gratiskonten pro Gerät) und wird nicht für Werbezwecke
            genutzt.
          </p>

          <h3 className={h3Class}>e) Zahlungsdaten</h3>
          <p>
            Zahlungsinformationen (Kreditkarte, IBAN) werden{" "}
            <strong className="text-[var(--color-fg)]">ausschließlich von Stripe</strong> verarbeitet und
            gespeichert. Wir haben keinen Zugriff auf deine vollständigen Zahlungsdaten. Wir speichern lediglich
            die Stripe-Kunden-ID und den Abonnementstatus.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>3. Zweck und Rechtsgrundlage der Verarbeitung</h2>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-[13px] border-collapse mt-2">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 pr-4 font-semibold text-[var(--color-fg)]">Zweck</th>
                  <th className="text-left py-2 font-semibold text-[var(--color-fg)]">Rechtsgrundlage</th>
                </tr>
              </thead>
              <tbody className="text-[var(--color-fg-muted)]">
                {[
                  ["Bereitstellung des Dienstes", "Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)"],
                  ["KI-Analyse deines Lebenslaufs", "Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)"],
                  ["Zahlungsabwicklung über Stripe", "Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)"],
                  ["Job-Alert E-Mails", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)"],
                  ["Missbrauchsprävention", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)"],
                  ["Geräte-Fingerabdruck (Verhinderung von Mehrfachkonten)", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)"],
                ].map(([zweck, basis]) => (
                  <tr key={zweck} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-2 pr-4">{zweck}</td>
                    <td className="py-2">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>4. KI-Verarbeitung (Lebenslauf-Analyse)</h2>
          <div className="rounded-xl border border-[var(--app-brand)]/25 bg-[var(--app-brand)]/10 p-4">
            <p>
              Wenn du einen Lebenslauf hochlädst oder ein Anschreiben generierst, werden die Inhalte an{" "}
              <strong className="text-[var(--color-fg)]">Groq, Inc.</strong> (KI-API) übermittelt, um die Analyse
              oder Textgenerierung durchzuführen. Die Übermittlung erfolgt verschlüsselt (TLS).
            </p>
            <p className="mt-2">
              Groq betreibt eine <strong className="text-[var(--color-fg)]">Zero Data Retention</strong>-Richtlinie:
              Anfragedaten werden nicht gespeichert, nicht protokolliert und nicht zum Training von KI-Modellen
              verwendet. Deine Daten verlassen Groqs Infrastruktur nicht dauerhaft.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>5. Datenspeicherung</h2>
          <p>
            Deine Daten werden in einer <strong className="text-[var(--color-fg)]">Neon-Datenbank</strong>{" "}
            (PostgreSQL) gespeichert. Die Server befinden sich in der EU. Die Verbindung zur Datenbank ist
            verschlüsselt.
          </p>
          <p className="mt-2">
            Hochgeladene Dateien (Lebensläufe) werden sicher gespeichert und sind nur für dein Konto zugänglich.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>6. Auftragsverarbeiter (Drittanbieter)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-[var(--color-fg)]">Stripe</strong> (Stripe, Inc.) — Zahlungsabwicklung.{" "}
              <a href="https://stripe.com/at/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Datenschutz von Stripe
              </a>
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Neon</strong> (Neon, Inc.) — Datenbank-Hosting (PostgreSQL, EU-Server)
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Vercel</strong> — Hosting der Web-Applikation
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Groq, Inc.</strong> — KI-API zur Analyse und Textgenerierung
              (Zero Data Retention).{" "}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Datenschutz von Groq
              </a>
            </li>
          </ul>
          <p className="mt-2">
            Mit allen Auftragsverarbeitern bestehen entsprechende Vereinbarungen gemäß Art. 28 DSGVO.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>7. Deine Rechte (DSGVO)</h2>
          <p>Du hast jederzeit das Recht auf:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-[var(--color-fg)]">Auskunft</strong> — Welche Daten wir über dich gespeichert haben (Art. 15 DSGVO)</li>
            <li><strong className="text-[var(--color-fg)]">Berichtigung</strong> — Korrektur unrichtiger Daten (Art. 16 DSGVO)</li>
            <li><strong className="text-[var(--color-fg)]">Löschung</strong> — Löschung deiner Daten, „Recht auf Vergessenwerden" (Art. 17 DSGVO)</li>
            <li><strong className="text-[var(--color-fg)]">Einschränkung</strong> — Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li><strong className="text-[var(--color-fg)]">Datenübertragbarkeit</strong> — Export deiner Daten in einem maschinenlesbaren Format (Art. 20 DSGVO)</li>
            <li><strong className="text-[var(--color-fg)]">Widerspruch</strong> — Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p className="mt-2">
            Zur Ausübung deiner Rechte schreibe an <strong className="text-[var(--color-fg)]">info@jobassist.tech</strong>.
            Wir antworten innerhalb von 30 Tagen.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>8. Datenlöschung und Aufbewahrung</h2>
          <p>
            Bei Löschung deines Kontos werden alle personenbezogenen Daten (Profil, Lebensläufe, Anschreiben,
            Stellenangebote) innerhalb von 30 Tagen gelöscht. Rechnungsdaten werden gemäß der gesetzlichen
            Aufbewahrungspflicht (7 Jahre, BAO) aufbewahrt.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>9. Cookies und lokale Speicherung</h2>
          <p>
            JobAssist verwendet <strong className="text-[var(--color-fg)]">keine Tracking-Cookies</strong> und keine
            Werbe-Tracker. Wir verwenden ausschließlich technisch notwendige Speicherung (localStorage) für die
            Anmeldesitzung und das Zwischenspeichern von UI-Daten zur Beschleunigung der Anwendung.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>10. Geräte-Fingerabdruck</h2>
          <p>
            Um Missbrauch (z.&nbsp;B. mehrfache Gratiskonten) zu verhindern, setzen wir bei der Registrierung ein
            clientseitiges Fingerprinting-Verfahren ein (<strong className="text-[var(--color-fg)]">FingerprintJS Open Source</strong>).
            Dabei werden folgende Browser- und Geräteeigenschaften lokal im Browser ausgewertet:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-3">
            <li>Canvas- und WebGL-Rendering-Eigenschaften der Grafikkarte</li>
            <li>Bildschirmauflösung und Farbtiefe</li>
            <li>Systemschriftarten und installierte Plugins</li>
            <li>Zeitzone und Spracheinstellung</li>
            <li>Browser-Version und Betriebssystem</li>
          </ul>
          <p className="mt-3">
            Aus diesen Merkmalen wird ein anonymisierter Hash-Wert (Fingerabdruck) berechnet und bei
            Kontoerstellung gespeichert. Dieser Hash enthält{" "}
            <strong className="text-[var(--color-fg)]">keine direkt personenbezogenen Daten</strong> und lässt
            keinen Rückschluss auf deine Identität zu.
          </p>
          <p className="mt-3">
            <strong className="text-[var(--color-fg)]">Zweck:</strong> Verhinderung von Mehrfachregistrierungen auf demselben Gerät zur Umgehung von Nutzungslimits.<br />
            <strong className="text-[var(--color-fg)]">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).<br />
            <strong className="text-[var(--color-fg)]">Drittanbieter:</strong> Keiner — das Fingerprinting läuft vollständig im Browser, es werden keine Daten an externe Dienste übermittelt.<br />
            <strong className="text-[var(--color-fg)]">Speicherdauer:</strong> Der Fingerabdruck wird zusammen mit deinem Konto gespeichert und bei Kontolöschung entfernt.
          </p>
          <p className="mt-3 text-[13px]">
            Du kannst der Verarbeitung widersprechen, indem du uns unter{" "}
            <strong className="text-[var(--color-fg)]">info@jobassist.tech</strong> kontaktierst. In diesem Fall
            kann die Nutzung des Dienstes eingeschränkt sein.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>11. Beschwerderecht</h2>
          <p>
            Du hast das Recht, eine Beschwerde bei der zuständigen Datenschutzbehörde einzureichen:
          </p>
          <p className="mt-2 text-[13px]">
            Österreichische Datenschutzbehörde<br />
            Barichgasse 40–42, 1030 Wien<br />
            <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className={linkClass}>
              www.dsb.gv.at
            </a>
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
