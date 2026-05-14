import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** Static GDPR-compliant privacy policy page. */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-extrabold text-white mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-slate-500 mb-10">Stand: 5. April 2026 — gemäß DSGVO (EU-Datenschutz-Grundverordnung)</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-slate-300">
          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-3">1. Verantwortliche Stelle</h2>
            <p>
              Verantwortlich für die Datenverarbeitung ist der Betreiber von JobAssist (siehe <Link to="/impressum" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">Impressum</Link>). Bei Fragen zum Datenschutz erreichst du uns unter <strong className="text-white">info@jobassist.tech</strong>.
            </p>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-3">2. Welche Daten wir erheben</h2>
            <p>Wir verarbeiten folgende personenbezogene Daten:</p>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">a) Registrierungsdaten</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>E-Mail-Adresse</li>
              <li>Name (optional)</li>
              <li>Passwort (verschlüsselt gespeichert, bcrypt)</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">b) Bewerbungsdaten</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hochgeladene Lebensläufe (PDF-Dateien)</li>
              <li>Generierte Motivationsschreiben</li>
              <li>Gespeicherte Stellenangebote und Bewerbungsstatus</li>
              <li>Jobsuche-Präferenzen und Suchverläufe</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">c) Nutzungsdaten</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Feature-Nutzung (Anzahl Analysen, Anschreiben, Chat-Nachrichten)</li>
              <li>Geräte- und Browser-Informationen (User-Agent)</li>
              <li>Zeitpunkt des letzten Logins</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">d) Geräte-Fingerabdruck (bei Registrierung)</h3>
            <p>
              Bei der Registrierung erstellen wir einen anonymisierten Geräte-Fingerabdruck aus technischen Browser-Merkmalen (z.&nbsp;B. Bildschirmauflösung, installierte Schriftarten, Grafikkarten-Rendering, Zeitzone). Daraus wird ein eindeutiger Hash-Wert generiert und gespeichert. Es werden <strong>keine personenbezogenen Daten</strong> wie Name, IP-Adresse oder Cookies für den Fingerabdruck verwendet. Der Fingerabdruck dient ausschließlich der Missbrauchsprävention (Verhinderung mehrerer Gratiskonten pro Gerät) und wird nicht für Werbezwecke genutzt.
            </p>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">d) Zahlungsdaten</h3>
            <p>
              Zahlungsinformationen (Kreditkarte, IBAN) werden <strong>ausschließlich von Stripe</strong> verarbeitet und gespeichert. Wir haben keinen Zugriff auf deine vollständigen Zahlungsdaten. Wir speichern lediglich die Stripe-Kunden-ID und den Abonnementstatus.
            </p>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-3">3. Zweck und Rechtsgrundlage der Verarbeitung</h2>
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-2 pr-4 font-semibold text-white">Zweck</th>
                  <th className="text-left py-2 font-semibold text-white">Rechtsgrundlage</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-[#1e293b]">
                  <td className="py-2 pr-4">Bereitstellung des Dienstes</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
                </tr>
                <tr className="border-b border-[#1e293b]">
                  <td className="py-2 pr-4">KI-Analyse deines Lebenslaufs</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
                </tr>
                <tr className="border-b border-[#1e293b]">
                  <td className="py-2 pr-4">Zahlungsabwicklung über Stripe</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
                </tr>
                <tr className="border-b border-[#1e293b]">
                  <td className="py-2 pr-4">Job-Alert E-Mails</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</td>
                </tr>
                <tr className="border-b border-[#1e293b]">
                  <td className="py-2 pr-4">Missbrauchsprävention</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Geräte-Fingerabdruck (Verhinderung von Mehrfachkonten)</td>
                  <td className="py-2">Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-3">4. KI-Verarbeitung (Lebenslauf-Analyse)</h2>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
              <p>
                Wenn du einen Lebenslauf hochlädst oder ein Anschreiben generierst, werden die Inhalte an <strong className="text-white">Groq, Inc.</strong> (KI-API) übermittelt, um die Analyse oder Textgenerierung durchzuführen. Die Übermittlung erfolgt verschlüsselt (TLS).
              </p>
              <p className="mt-2">
                Groq betreibt eine <strong className="text-white">Zero Data Retention</strong>-Richtlinie: Anfragedaten werden nicht gespeichert, nicht protokolliert und nicht zum Training von KI-Modellen verwendet. Deine Daten verlassen Groqs Infrastruktur nicht dauerhaft.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Datenspeicherung</h2>
            <p>
              Deine Daten werden in einer <strong>Neon-Datenbank</strong> (PostgreSQL) gespeichert. Die Server befinden sich in der EU. Die Verbindung zur Datenbank ist verschlüsselt.
            </p>
            <p>
              Hochgeladene Dateien (Lebensläufe) werden sicher gespeichert und sind nur für dein Konto zugänglich.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Auftragsverarbeiter (Drittanbieter)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stripe</strong> (Stripe, Inc.) — Zahlungsabwicklung. <a href="https://stripe.com/at/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">Datenschutz von Stripe</a></li>
              <li><strong>Neon</strong> (Neon, Inc.) — Datenbank-Hosting (PostgreSQL, EU-Server)</li>
              <li><strong>Vercel</strong> — Hosting der Web-Applikation</li>
              <li><strong>Groq, Inc.</strong> — KI-API zur Analyse und Textgenerierung (Zero Data Retention). <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">Datenschutz von Groq</a></li>
            </ul>
            <p className="mt-2">
              Mit allen Auftragsverarbeitern bestehen entsprechende Vereinbarungen gemäß Art. 28 DSGVO.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Deine Rechte (DSGVO)</h2>
            <p>Du hast jederzeit das Recht auf:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Auskunft</strong> — Welche Daten wir über dich gespeichert haben (Art. 15 DSGVO)</li>
              <li><strong>Berichtigung</strong> — Korrektur unrichtiger Daten (Art. 16 DSGVO)</li>
              <li><strong>Löschung</strong> — Löschung deiner Daten, „Recht auf Vergessenwerden" (Art. 17 DSGVO)</li>
              <li><strong>Einschränkung</strong> — Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li><strong>Datenübertragbarkeit</strong> — Export deiner Daten in einem maschinenlesbaren Format (Art. 20 DSGVO)</li>
              <li><strong>Widerspruch</strong> — Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Zur Ausübung deiner Rechte schreibe an <strong>info@jobassist.tech</strong>. Wir antworten innerhalb von 30 Tagen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Datenlöschung und Aufbewahrung</h2>
            <p>
              Bei Löschung deines Kontos werden alle personenbezogenen Daten (Profil, Lebensläufe, Anschreiben, Stellenangebote) innerhalb von 30 Tagen gelöscht. Rechnungsdaten werden gemäß der gesetzlichen Aufbewahrungspflicht (7 Jahre, BAO) aufbewahrt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Cookies und lokale Speicherung</h2>
            <p>
              JobAssist verwendet <strong>keine Tracking-Cookies</strong> und keine Werbe-Tracker. Wir verwenden ausschließlich technisch notwendige Speicherung (localStorage) für die Anmeldesitzung und das Zwischenspeichern von UI-Daten zur Beschleunigung der Anwendung.
            </p>
          </section>

          <section className="bg-[#111827] rounded-xl border border-[#1e293b] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-white mb-3">10. Geräte-Fingerabdruck</h2>
            <p>
              Um Missbrauch (z.&nbsp;B. mehrfache Gratiskonten) zu verhindern, setzen wir bei der Registrierung ein clientseitiges Fingerprinting-Verfahren ein (<strong>FingerprintJS Open Source</strong>). Dabei werden folgende Browser- und Geräteeigenschaften lokal im Browser ausgewertet:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>Canvas- und WebGL-Rendering-Eigenschaften der Grafikkarte</li>
              <li>Bildschirmauflösung und Farbtiefe</li>
              <li>Systemschriftarten und installierte Plugins</li>
              <li>Zeitzone und Spracheinstellung</li>
              <li>Browser-Version und Betriebssystem</li>
            </ul>
            <p className="mt-3">
              Aus diesen Merkmalen wird ein anonymisierter Hash-Wert (Fingerabdruck) berechnet und bei Kontoerstellung gespeichert. Dieser Hash enthält <strong>keine direkt personenbezogenen Daten</strong> und lässt keinen Rückschluss auf deine Identität zu.
            </p>
            <p className="mt-3">
              <strong>Zweck:</strong> Verhinderung von Mehrfachregistrierungen auf demselben Gerät zur Umgehung von Nutzungslimits.<br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).<br />
              <strong>Drittanbieter:</strong> Keiner — das Fingerprinting läuft vollständig im Browser, es werden keine Daten an externe Dienste übermittelt.<br />
              <strong>Speicherdauer:</strong> Der Fingerabdruck wird zusammen mit deinem Konto gespeichert und bei Kontolöschung entfernt.
            </p>
            <p className="mt-3 text-slate-400 text-sm">
              Du kannst der Verarbeitung widersprechen, indem du uns unter <strong className="text-white">info@jobassist.tech</strong> kontaktierst. In diesem Fall kann die Nutzung des Dienstes eingeschränkt sein.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Beschwerderecht</h2>
            <p>
              Du hast das Recht, eine Beschwerde bei der zuständigen Datenschutzbehörde einzureichen:
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Österreichische Datenschutzbehörde<br />
              Barichgasse 40–42, 1030 Wien<br />
              <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 hover:underline transition-colors">www.dsb.gv.at</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
