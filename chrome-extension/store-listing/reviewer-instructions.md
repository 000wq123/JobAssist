# Testanleitung für den Chrome-Web-Store-Review

Für den Funktionstest ist kein JobAssist-Konto erforderlich.

1. Installieren Sie die Erweiterung. Die lokale Einrichtungsseite öffnet sich automatisch.
2. Tragen Sie beliebige Testdaten ein, akzeptieren Sie die lokale Speicherung und schließen Sie die Einrichtung ab.
3. Öffnen Sie `https://www.jobassist.tech/extension-demo`.
4. Klicken Sie auf `Demo starten`. Ein Demo-Bewerbungsformular öffnet sich in einem neuen Tab.
5. Öffnen Sie das JobAssist-Erweiterungssymbol und klicken Sie auf `Diese Seite ausfüllen`.
6. Klicken Sie im sichtbaren Helfer auf `Leere Felder ausfüllen`.

Erwartetes Ergebnis:

- Nur leere, eindeutig erkannte Felder werden befüllt.
- Bereits befüllte Felder werden nicht überschrieben.
- Das Datei-Uploadfeld wird nur markiert; es wird keine Datei ausgewählt.
- Das Formular wird niemals automatisch abgesendet.
- Die Erweiterung führt ohne Klick keine Skripte auf der Demo-Arbeitgeberseite aus.

Supportkontakt für den Review: `hallo@jobassist.tech`

