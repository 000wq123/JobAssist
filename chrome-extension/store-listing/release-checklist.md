# Chrome Web Store Release Checklist

## Paket

- [ ] `manifest.json` ist Manifest V3 und die Version wurde erhöht.
- [ ] Keine `https://*/*`, `http://*/*` oder `<all_urls>` Host-Berechtigung.
- [ ] ZIP enthält nur Laufzeitdateien; keine Tests, Store-Assets oder Quelldateien.
- [ ] `node chrome-extension/scripts/validate-release.mjs` besteht.
- [ ] `node chrome-extension/tests/ui-smoke.mjs` besteht.
- [ ] `node chrome-extension/tests/smoke.mjs` besteht.

## Öffentliche Seiten

- [ ] `https://www.jobassist.tech/privacy#browser-extension` ist öffentlich erreichbar und entspricht dem Code.
- [ ] `https://www.jobassist.tech/contact` ist öffentlich erreichbar.
- [ ] `https://www.jobassist.tech/extension-demo` ist öffentlich erreichbar und ohne Login testbar.
- [ ] Domain-Inhaberschaft ist in Google Search Console bestätigt.

## Listing

- [ ] Name, Kurzbeschreibung und ausführliche Beschreibung aus `de-DE.md` eingetragen.
- [ ] Kategorie `Produktivität` und primäre Sprache `Deutsch` gewählt.
- [ ] Store-Icon `store-assets/icon-128.png` hochgeladen.
- [ ] Screenshot `store-assets/screenshot-application-helper-1280x800.png` hochgeladen.
- [ ] Screenshot `store-assets/screenshot-onboarding-1280x800.png` hochgeladen.
- [ ] Kleine Promo-Kachel `store-assets/promo-small-440x280.png` hochgeladen.
- [ ] Datenschutz- und Berechtigungsangaben aus `privacy-and-permissions.md` vollständig übertragen.
- [ ] Review-Anleitung aus `reviewer-instructions.md` eingetragen.

## Manuelle Abnahme

- [ ] Installation auf einem frischen Chrome-Profil getestet.
- [ ] First-run-Onboarding und Einwilligung getestet.
- [ ] Demo auf hellem und dunklem Systemdesign getestet.
- [ ] Bestehende Formularwerte bleiben unverändert.
- [ ] Passwortfelder werden ignoriert.
- [ ] Geschützte Seiten (`chrome://`, Chrome Web Store) zeigen eine verständliche Fehlermeldung.
- [ ] Entfernen der Erweiterung löscht die lokalen Erweiterungsdaten.
- [ ] Finale Einreichung und rechtliche Bestätigungen durch den Kontoinhaber durchgeführt.
