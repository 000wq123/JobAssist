# JobAssist

> Open-Source Bewerbungstools für Österreich — Praktikum, Teilzeit, Lehre, Samstagsjob, Ferialjob.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-teal.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/davorrr/JobAssist?style=social)](https://github.com/davorrr/JobAssist)

---

## Was JobAssist kann

- **Lebenslauf-Builder** — Fragen beantworten, A4-PDF exportieren.
- **Job-Suche** — karriere.at, willhaben.at, AMS, Stepstone.
- **KV-Check** — Angebot gegen Kollektivvertrag abgleichen.
- **Anschreiben** — Automatisch generiert, auf Österreichisch.
- **Autopilot** — Browser-Erweiterung: ein Klick auf karriere.at, Formular ausgefüllt.

JobAssist ist Open Source (AGPL-3.0). Der gesamte Code liegt auf GitHub.

👉 **[jobassist.tech](https://jobassist.tech)** — registrieren und loslegen.

---

## Für Entwickler:innen

### Mitmachen

Die **Scraper** sind der beste Einstiegspunkt. Sie durchsuchen karriere.at, willhaben.at und das AMS — und brechen, wenn die Jobbörsen ihr Design ändern. Python-Kenntnisse reichen.

```
backend/app/services/scrapers/
  ├── base.py       — Basisklasse (Rate Limiting, Caching, Headers)
  ├── karriere.py   — karriere.at
  ├── willhaben.py  — willhaben.at
  └── ams.py        — jobs.ams.at
```

Die **Kollektivvertrag-Daten** ändern sich jährlich:

```
backend/app/api/routes/kv_wage.py
```

### Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | React 19, Vite, Tailwind v4, TanStack Query, Zustand |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy 2 async, Alembic |
| **Datenbank** | PostgreSQL (Produktion), SQLite (lokal) |
| **AI** | Groq (Llama, Mixtral) |
| **Job-Daten** | Adzuna API, Jooble API, native Scraper |
| **E-Mail** | Brevo (SMTP + HTTP API) |
| **Monitoring** | Sentry |

### Lokal starten

```bash
git clone https://github.com/davorrr/JobAssist.git
cd JobAssist

# Backend
cp backend/.env.example backend/.env
# → SECRET_KEY, DATABASE_URL, GROQ_API_KEY ausfüllen
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload     # → http://localhost:8000

# Frontend (zweites Terminal)
cd frontend
npm install
npm run dev                        # → http://localhost:5173
```

> Details: [`docs/guides/SETUP.md`](docs/guides/SETUP.md)

### Tests & Linting

```bash
# Frontend
cd frontend && npm run lint && npm run test && npm run test:e2e

# Backend
cd backend && pytest && ruff check .
```

### CI/CD

- **Frontend:** Vercel (Deploy bei Push auf `main`)
- **Backend:** Railway (Deploy bei Push auf `main`)
- **Tests:** GitHub Actions (CI bei jedem PR)

---

## Projekt-Struktur

```text
backend/         FastAPI, SQLAlchemy, Alembic, pytest
frontend/        React SPA, Vitest, Playwright, Tailwind
docs/            Setup, Deployment, Security, Operations
scripts/         Wartungsskripte
extension/       Chrome Extension (Manifest V3)
```

---

## Roadmap

- [x] CV Builder (Wizard, 4 Templates, PDF-Export)
- [x] Job-Suche (5 Quellen)
- [x] KV-Gehalts-Check (Brutto, Netto, Stundenlohn)
- [x] Anschreiben (Österreichisches Deutsch, Groq)
- [x] Browser Extension (Autopilot)
- [x] Job Alerts (tägliche E-Mail)
- [x] Bewerbungs-Tracker (Status, Notizen, Deadlines)
- [ ] WhatsApp-Integration
- [ ] Lehre-Suche (spezialisierte Filter)
- [ ] Community KV-Daten (User-Updates)

---

## Lizenz

**GNU Affero General Public License v3.0 (AGPL-3.0)**.

- ✅ Verwenden, verändern, weitergeben.
- ✅ Wer eine modifizierte Version hostet, muss den Quellcode veröffentlichen.
- ❌ Nicht als proprietäres SaaS-Produkt verkaufen.

[`LICENSE`](LICENSE)

---

## Beitragen

1. **Issue öffnen** — Bug oder Feature-Idee.
2. **Fork + Branch** — `git checkout -b fix/willhaben-selector`
3. **Änderung + Tests** — PR stellen.

> Issues und PRs auf Deutsch oder Englisch. Code-Kommentare auf Englisch.

---

## Kontakt

- **E-Mail:** [hallo@jobassist.tech](mailto:hallo@jobassist.tech)
- **Issues:** [GitHub Issues](https://github.com/davorrr/JobAssist/issues)
