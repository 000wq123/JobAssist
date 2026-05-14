# Job Application Assistant — Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (local or Railway)

---

## Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# → Edit .env with your DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY

# Run database migrations (auto-created on first run via lifespan)
# OR use Alembic if you set it up:
# alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# → Edit .env.local if you need a specific VITE_API_URL

# Start dev server (proxies /api → localhost:8000)
npm run dev
```

App available at: http://localhost:5173

---

## Deployment

### Backend → Railway
1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. Add environment variables from `.env.example`
4. Railway auto-detects Python and runs uvicorn

### Frontend → Vercel
1. Import repo into Vercel
2. Set root directory to `frontend/`
3. Add `VITE_API_URL=https://your-railway-app.railway.app/api`
4. Deploy

---

## Project Structure

```
job-application-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic-settings)
│   │   │   ├── database.py      # Async SQLAlchemy engine
│   │   │   └── security.py      # JWT auth helpers
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── claude_service.py   # All Claude API calls
│   │   │   └── resume_parser.py    # PDF/TXT text extraction
│   │   └── api/routes/          # FastAPI routers
│   │       ├── auth.py
│   │       ├── resume.py
│   │       ├── jobs.py
│   │       ├── cover_letter.py
│   │       └── interview.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx              # Routes
    │   ├── main.jsx             # Entry point
    │   ├── index.css            # Tailwind + component classes
    │   ├── services/api.js      # Axios API client
    │   ├── hooks/useAuthStore.js # Zustand auth state
    │   ├── components/layout/   # Sidebar layout
    │   └── pages/               # Route pages
    ├── package.json
    └── .env.example
```
