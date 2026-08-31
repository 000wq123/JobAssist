import { Link } from "react-router-dom";
import LegalLayout from "../components/ui/LegalLayout";

/** Static GDPR-compliant privacy policy page (DSGVO / österreichisches DSG). */
export default function PrivacyPage() {
  const linkClass = "text-[var(--app-brand)] underline decoration-dotted underline-offset-2 hover:text-[var(--app-brand-hover)] transition-colors";
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-3";
  const h3Class = "text-[14px] font-semibold text-[var(--color-fg)] mt-4 mb-2";

  return (
    <LegalLayout
      title={<><span className="font-display italic text-[var(--app-brand)]">Datenschutz</span>­erklärung</>}
      subtitle="Stand: 30. August 2026 — gemäß DSGVO (EU-Datenschutz-Grundverordnung) und österreichischem Datenschutzgesetz (DSG)"
    >
      <div className="space-y-6 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
        <section className={sectionClass}>
          <h2 className={h2Class}>1. Verantwortliche Stelle</h2>
          <p>
            Verantwortlich für die Datenverarbeitung ist der Betreiber von JobAssist (Davor Radeski, Österreich,
            siehe <Link to="/impressum" className={linkClass}>Impressum</Link>). Bei Fragen zum Datenschutz erreichst
            du uns unter <strong className="text-[var(--color-fg)]">hallo@jobassist.tech</strong>.
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
            Derzeit ist JobAssist <strong className="text-[var(--color-fg)]">kostenlos</strong>; es werden{" "}
            <strong className="text-[var(--color-fg)]">keine Zahlungsdaten erhoben</strong>. Sollten in Zukunft
            kostenpflichtige Pläne angeboten werden, werden Zahlungsinformationen (z.&nbsp;B. Kreditkarte){" "}
            <strong className="text-[var(--color-fg)]">ausschließlich von Stripe</strong> verarbeitet und
            gespeichert; wir haben keinen Zugriff auf vollständige Zahlungsdaten, sondern speichern lediglich die
            Stripe-Kunden-ID und den Abonnementstatus. Diese Stelle wird vor Aktivierung von Bezahlfunktionen
            entsprechend aktualisiert.
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
                  ["Job-Alert E-Mails", "Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)"],
                  ["Server- und Zugriffsprotokolle (Sicherheit, Fehlerbehebung)", "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)"],
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
          <p className="mt-3 text-[13px]">
            Derzeit findet <strong className="text-[var(--color-fg)]">keine Zahlungsabwicklung</strong> statt
            (kostenlose Nutzung). Erfolgt in Zukunft eine Bezahlung über Stripe, dient dafür Art. 6 Abs. 1 lit. b
            DSGVO (Vertragserfüllung) als Rechtsgrundlage.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>4. KI-Verarbeitung (Lebenslauf-Analyse)</h2>
          <div className="rounded-xl border border-[var(--app-brand)]/25 bg-[var(--app-brand)]/10 p-4">
            <p>
              Wenn du einen Lebenslauf hochlädst oder ein Anschreiben generierst, werden die Inhalte an{" "}
              <strong className="text-[var(--color-fg)]">Groq, Inc.</strong> (USA) übermittelt, um die Analyse
              oder Textgenerierung durchzuführen. Die Übermittlung erfolgt verschlüsselt (TLS).
            </p>
            <p className="mt-2">
              Nach Angaben von Groq gilt eine <strong className="text-[var(--color-fg)]">Zero Data
              Retention</strong>-Richtlinie: Anfragedaten werden nicht dauerhaft gespeichert und nicht zum
              Training von KI-Modellen verwendet. Da Groq seinen Sitz in den USA hat, erfolgt die Übermittlung
              auf Grundlage der Standardvertragsklauseln (Art. 46 DSGVO) bzw. des EU-US Data Privacy Framework,
              soweit jeweils anwendbar.
            </p>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>5. Datenspeicherung und Hosting</h2>
          <p>
            Deine Daten werden in einer <strong className="text-[var(--color-fg)]">Neon</strong>-Datenbank
            (PostgreSQL) gespeichert. Die Datenbankregion befindet sich in der EU (Frankfurt, eu-central-1). Die
            Verbindung zur Datenbank ist verschlüsselt.
          </p>
          <p className="mt-2">
            Die Web-Applikation wird bei <strong className="text-[var(--color-fg)]">Vercel</strong> (Frontend)
            und <strong className="text-[var(--color-fg)]">Railway</strong> (Backend) gehostet. Beide sind
            US-amerikanische Anbieter; eine Übermittlung von Daten in die USA erfolgt auf Grundlage der
            Standardvertragsklauseln (Art. 46 DSGVO) bzw. des EU-US Data Privacy Framework, soweit jeweils
            anwendbar.
          </p>
          <p className="mt-2">
            Hochgeladene Dateien (Lebensläufe) werden sicher gespeichert und sind nur für dein Konto zugänglich.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>6. Server- und Zugriffsprotokolle</h2>
          <p>
            Beim Aufruf der Website und bei API-Anfragen speichern die Hosting-Anbieter (Vercel, Railway)
            technische Zugriffsprotokolle (u.&nbsp;a. IP-Adresse, Zeitstempel, aufgerufene Ressource,
            User-Agent). Diese dienen der Sicherheit, der Fehleranalyse und der Abwehr von Missbrauch und werden
            nach kurzer Zeit automatisch gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse).
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>7. Auftragsverarbeiter (Drittanbieter)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-[var(--color-fg)]">Brevo</strong> (Frankreich) — Versand von
              transaktionalen E-Mails (E-Mail-Bestätigung, Passwort-Reset, Job-Alerts).{" "}
              <a href="https://www.brevo.com/legal/dataprotectionagreement/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Datenschutz von Brevo
              </a>
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Railway</strong> (USA) — Backend-Hosting
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Vercel</strong> (USA) — Frontend-Hosting
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Neon</strong> (USA; Datenbankregion EU) —
              PostgreSQL-Datenbank
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Groq, Inc.</strong> (USA) — KI-API zur Analyse und
              Textgenerierung (Zero Data Retention).{" "}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Datenschutz von Groq
              </a>
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Google Fonts</strong> (USA) — Schriftarten werden
              direkt von Google-Servern geladen; dabei wird deine IP-Adresse an Google übermittelt.{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Datenschutz von Google
              </a>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-[var(--color-fg)]">Optional bzw. derzeit nicht aktiv:</strong> Sentry
            (Fehler- und Performance-Monitoring) und Stripe (Zahlungsabwicklung) sind derzeit{" "}
            <strong className="text-[var(--color-fg)]">nicht aktiviert</strong>. Sie würden bei Aktivierung an
            dieser Stelle aufgenommen.
          </p>
          <p className="mt-2">
            Soweit gesetzlich erforderlich, bestehen mit den Auftragsverarbeitern Vereinbarungen gemäß
            Art. 28 DSGVO. Für Übermittlungen in Drittländer (insbesondere USA) gelten die
            Standardvertragsklauseln (Art. 46 DSGVO) bzw. der EU-US Data Privacy Framework, soweit jeweils
            anwendbar.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>8. Deine Rechte (DSGVO)</h2>
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
            Zur Ausübung deiner Rechte schreibe an <strong className="text-[var(--color-fg)]">hallo@jobassist.tech</strong>.
            Wir antworten innerhalb von 30 Tagen.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>9. Datenlöschung und Aufbewahrung</h2>
          <p>
            Bei Löschung deines Kontos werden alle personenbezogenen Daten (Profil, Lebensläufe, Anschreiben,
            Stellenangebote) innerhalb von 30 Tagen gelöscht. Da der Dienst derzeit kostenlos ist, fallen keine
            Rechnungsdaten an; bei einer zukünftigen Zahlungsabwicklung gelten die gesetzlichen
            Aufbewahrungsfristen (u.&nbsp;a. 7 Jahre gemäß BAO).
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>10. Cookies und lokale Speicherung</h2>
          <p>
            JobAssist verwendet <strong className="text-[var(--color-fg)]">keine Tracking-Cookies</strong> und
            keine Werbe-Tracker. Wir verwenden ausschließlich technisch notwendige Speicherung (localStorage) für
            die Anmeldesitzung, das Zwischenspeichern von UI-Daten zur Beschleunigung der Anwendung und die
            Speicherung deiner Cookie-Einwilligung. Beim ersten Besuch wird ein Hinweis (Cookie-Banner) eingeblendet.
          </p>
          <p className="mt-2">
            Schriftarten werden über Google Fonts von Servern von Google geladen (siehe Abschnitt 7); dabei wird
            deine IP-Adresse an Google übermittelt. Eine Einwilligung hierfür ist nicht erforderlich, da die
            Schriftarten technisch notwendig für die Darstellung sind.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>11. Geräte-Fingerabdruck</h2>
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
            <strong className="text-[var(--color-fg)]">hallo@jobassist.tech</strong> kontaktierst. In diesem Fall
            kann die Nutzung des Dienstes eingeschränkt sein.
          </p>
        </section>

        <section id="browser-extension" className={`${sectionClass} scroll-mt-8`}>
          <h2 className={h2Class}>12. Chrome-Erweiterung „JobAssist Bewerbungshelfer“</h2>
          <p>
            Die Erweiterung hat den einzigen Zweck, dich beim Ausfüllen von Online-Bewerbungsformularen zu
            unterstützen. Sie wird auf einer Arbeitgeberseite nur aktiv, wenn du das Erweiterungssymbol anklickst,
            und erhält dann vorübergehend Zugriff auf den aktuellen Tab.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-3">
            <li>
              <strong className="text-[var(--color-fg)]">Lokal gespeicherte Profildaten:</strong> Vor- und
              Nachname, E-Mail-Adresse, Telefonnummer, Anschrift, Ort und optional LinkedIn-URL.
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Temporäre Bewerbungsdaten:</strong> Stellenbezeichnung,
              Unternehmen, Ort, Quelle und vorhandenes Anschreiben. Der aktive Bewerbungskontext läuft nach
              spätestens zwölf Stunden ab.
            </li>
            <li>
              <strong className="text-[var(--color-fg)]">Formularerkennung:</strong> Nach deinem Klick werden
              Beschriftungen und der Leerstatus sichtbarer Formularfelder im aktuellen Tab lokal ausgewertet.
              Passwörter sowie versteckte oder bereits ausgefüllte Felder werden nicht verarbeitet.
            </li>
          </ul>
          <p className="mt-3">
            Diese Daten werden ausschließlich in <strong className="text-[var(--color-fg)]">chrome.storage.local</strong>{" "}
            auf deinem Gerät gespeichert oder verarbeitet. Die Erweiterung übermittelt sie nicht an JobAssist,
            verkauft sie nicht, verwendet sie nicht für Werbung und erstellt keinen Browserverlauf. Beim Ausfüllen
            werden Angaben lediglich in die sichtbaren Felder der von dir geöffneten Arbeitgeberseite eingesetzt;
            erst du entscheidest, ob du das Formular an den jeweiligen Arbeitgeber absendest.
          </p>
          <p className="mt-3">
            Die Nutzung von Daten durch die Erweiterung ist auf diesen beschriebenen Zweck beschränkt und entspricht
            den Limited-Use-Anforderungen der Chrome Web Store User Data Policy. Du kannst deine lokalen Profildaten
            jederzeit im Erweiterungs-Popup ändern, dort über „Lokale Daten löschen“ vollständig entfernen oder
            durch Entfernen der Erweiterung aus Chrome löschen.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>13. Beschwerderecht</h2>
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
