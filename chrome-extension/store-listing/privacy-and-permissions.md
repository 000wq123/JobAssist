# Privacy-Practices-Angaben

Diese Angaben müssen mit dem veröffentlichten Verhalten und der Datenschutzerklärung übereinstimmen.

## Single purpose

Die Erweiterung unterstützt Nutzer beim bewussten Ausfüllen leerer Felder auf Online-Bewerbungsformularen, die sie über JobAssist geöffnet haben.

## Berechtigungen

### `activeTab`

Gewährt ausschließlich nach einem Klick auf das Erweiterungssymbol vorübergehenden Zugriff auf den aktuell sichtbaren Bewerbungs-Tab. Der Zugriff endet bei Navigation zu einer anderen Origin oder beim Schließen des Tabs.

### `scripting`

Fügt nach dem ausdrücklichen Klick des Nutzers den sichtbaren JobAssist-Helfer und dessen Styles in den aktuellen Bewerbungs-Tab ein. Es werden keine Skripte im Hintergrund in beliebige Webseiten injiziert.

### `storage`

Speichert das vom Nutzer eingegebene Bewerbungsprofil, dessen Einwilligungszeitpunkt und einen höchstens zwölf Stunden aktiven Bewerbungskontext ausschließlich lokal im Browser.
Profil, Einwilligung und Bewerbungskontext können jederzeit gemeinsam über `Lokale Daten löschen` im Popup entfernt werden.

### Zugriff auf `jobassist.tech`

Das deklarative Content Script läuft ausschließlich auf `jobassist.tech` und `www.jobassist.tech`. Es reagiert nur auf einen Klick auf Elemente mit `data-jobassist-apply`, damit Titel, Unternehmen, Quelle und ein vorhandenes Anschreiben lokal an den Bewerbungshelfer übergeben werden können.

## Datenkategorien für das Dashboard

- Personenbezogene Identifikationsdaten: Name, E-Mail, Telefon, Anschrift, LinkedIn-URL — lokale Speicherung nach Einwilligung.
- Vom Nutzer erzeugte Inhalte: vorhandenes Anschreiben — lokaler, zeitlich begrenzter Bewerbungskontext.
- Website-Inhalte/Formulardaten: Feldbezeichnungen und Leerstatus des aktuellen Tabs — flüchtige lokale Verarbeitung nach Klick.
- Kein Browserverlauf, keine Authentifizierungsdaten, keine Finanzdaten, keine Gesundheitsdaten und keine Standortverfolgung.

## Übertragung und Verkauf

- Keine Übertragung an JobAssist-Server oder andere Dritte durch die Erweiterung.
- Kein Verkauf und keine Verwendung für Werbung, Profiling oder Kreditwürdigkeitsprüfung.
- Kein menschlicher Zugriff auf lokal gespeicherte Erweiterungsdaten.
- Beim Ausfüllen werden Werte nur in das sichtbare Formular eingesetzt. Erst der Nutzer kann dieses Formular an den Arbeitgeber absenden.

## Limited Use

Die Nutzung der verarbeiteten Daten ist auf den beschriebenen Bewerbungszweck beschränkt und entspricht den Limited-Use-Anforderungen der Chrome Web Store User Data Policy.
