# JobAssist Bewerbungshelfer

Store-fertige Manifest-V3-Erweiterung für den Weg von einer gespeicherten JobAssist-Stelle zum echten Bewerbungsformular.

## Was sie macht

- übernimmt beim Klick auf `Jetzt bewerben` Titel, Firma und vorhandenes Anschreiben;
- zeigt auf der externen Bewerbungsseite einen kleinen JobAssist-Helfer;
- füllt ausschließlich leere, eindeutig erkannte Felder und nur nach einem Klick;
- markiert Lebenslauf-Uploads, setzt Dateien aber aus Sicherheitsgründen niemals automatisch ein;
- speichert Profildaten ausschließlich in `chrome.storage.local`;
- erhält erst nach einem Klick auf das Erweiterungssymbol temporären Zugriff auf den aktuellen Tab;
- sendet und übermittelt niemals automatisch ein Formular.

## Lokal installieren

1. Öffne `chrome://extensions`.
2. Aktiviere oben rechts den **Entwicklermodus**.
3. Klicke **Entpackte Erweiterung laden**.
4. Wähle diesen Ordner: `chrome-extension/`.
5. Öffne die Erweiterung einmal und hinterlege deine Bewerbungsdaten.

Nach der Installation öffnet sich eine geführte Einrichtungsseite. Auf Arbeitgeberseiten wird ohne Klick auf das Erweiterungssymbol kein Code ausgeführt. Durch `activeTab` gilt der Zugriff nur für den aktuell aufgerufenen Tab und nicht dauerhaft für alle Webseiten.

Ein Funktionstest ohne echtes JobAssist-Konto steht unter `https://www.jobassist.tech/extension-demo` bereit.

## Release-Check

```bash
node --check chrome-extension/background.js
node --check chrome-extension/content/jobassist-bridge.js
node --check chrome-extension/content/application-assistant.js
node --check chrome-extension/popup/popup.js
node --check chrome-extension/onboarding/onboarding.js
node chrome-extension/scripts/validate-release.mjs
node chrome-extension/tests/ui-smoke.mjs
node chrome-extension/tests/smoke.mjs
```

## Store-Paket erstellen

```bash
sh chrome-extension/scripts/package.sh
```

Das ZIP wird unter `chrome-extension/dist/` erzeugt. Texte, Datenschutzangaben, Review-Anleitung und Release-Checkliste liegen unter `chrome-extension/store-listing/`; Store-Grafiken unter `chrome-extension/store-assets/`.

Vor dem Upload müssen die öffentliche Datenschutzerklärung und die Demo-Seite mit dem aktuellen Frontend deployt sein.
