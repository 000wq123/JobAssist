#!/usr/bin/env bash
# JobAssist local dev launcher — starts backend + frontend together.
#
# Usage:
#   ./scripts/dev.sh              # start both (Ctrl+C stops both)
#   ./scripts/dev.sh backend      # backend only
#   ./scripts/dev.sh frontend     # frontend only
#
# Requires:
#   backend/.venv with requirements installed  (see docs/LOCAL_SETUP.md)
#   frontend/node_modules                      (npm install)
#   backend/.env present                       (copy from backend/.env.example)

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PY="$BACKEND/.venv/bin/python"

BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; } || return 1
}

if [ ! -x "$PY" ]; then
  echo "✗ backend/.venv not found. Create it first:" >&2
  echo "    cd backend && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
if [ ! -f "$BACKEND/.env" ]; then
  echo "✗ backend/.env missing. Copy and fill in: cp backend/.env.example backend/.env" >&2
  exit 1
fi
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "✗ frontend/node_modules missing. Run: cd frontend && npm install" >&2
  exit 1
fi

MODE="${1:-all}"

start_backend() {
  if port_in_use 8000; then
    echo "⚠ Port 8000 already in use — assuming your backend is already running."
    return 0
  fi
  echo "▶ Backend  → http://localhost:8000  (docs at /docs)"
  (cd "$BACKEND" && exec .venv/bin/uvicorn app.main:app --reload --port 8000) &
  BACKEND_PID=$!
}

start_frontend() {
  if port_in_use 5173; then
    echo "⚠ Port 5173 already in use — assuming your frontend dev server is already running."
    return 0
  fi
  echo "▶ Frontend → http://localhost:5173"
  (cd "$FRONTEND" && exec npm run dev -- --strictPort) &
  FRONTEND_PID=$!
}

case "$MODE" in
  backend)  start_backend ;;
  frontend) start_frontend ;;
  all)      start_backend; sleep 1; start_frontend ;;
  *) echo "Usage: $0 [all|backend|frontend]" >&2; exit 1 ;;
esac

echo ""
echo "  Ready. Open http://localhost:5173 — register/login, then"
echo "  Stellen → Finden to search Austrian jobs (Adzuna is configured)."
echo "  Backend health: curl localhost:8000/health/dependencies"
echo ""
wait
