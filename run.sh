#!/usr/bin/env bash
# Cleared — one-command demo runner (macOS / Linux).
#
# Usage:
#   ./run.sh             install, build (if needed), seed demo data, launch
#   BUILD=1 ./run.sh     force a fresh frontend build
#   FRESH=1 ./run.sh     delete the local DB first (clean slate)
#   PORT=9000 ./run.sh   run on a different port
#
# Then open http://localhost:8000 and log in with:
#   demo@cleared.com.au / demo1234   (this account is also an admin)
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8000}"
echo "==> Cleared demo runner"

# 1. Python venv + deps
if [ ! -x "venv/bin/python" ]; then
  echo "==> Creating virtualenv..."
  python3 -m venv venv
fi
PY="./venv/bin/python"
echo "==> Installing Python dependencies..."
"$PY" -m pip install --quiet --upgrade pip
"$PY" -m pip install --quiet -r requirements.txt

# 2. Frontend build (only if missing, unless BUILD=1)
if [ "${BUILD:-0}" = "1" ] || [ ! -f "frontend/dist/index.html" ]; then
  echo "==> Building frontend..."
  ( cd frontend && npm install --no-audit --no-fund && npm run build )
else
  echo "==> Frontend already built (set BUILD=1 to rebuild)."
fi

# 3. Environment
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  export CLEARED_MOCK=1
  echo "==> No ANTHROPIC_API_KEY found - running in offline mock mode."
else
  echo "==> ANTHROPIC_API_KEY found - assessments will use Claude."
fi
export CLEARED_ADMIN_EMAILS="demo@cleared.com.au"
export CLEARED_SECRET_KEY="${CLEARED_SECRET_KEY:-$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')}"

if [ "${FRESH:-0}" = "1" ]; then
  echo "==> Removing existing database (FRESH=1)..."
  rm -f data/cleared.db data/cleared.db-wal data/cleared.db-shm
fi

# 4. Seed demo data
echo "==> Seeding demo data..."
"$PY" -m cleared.cli seed-demo

# 5. Launch
cat <<EOF

============================================================
  Cleared is starting on http://localhost:${PORT}
  Login:  demo@cleared.com.au  /  demo1234  (admin)
  API docs:  http://localhost:${PORT}/docs
  Press Ctrl+C to stop.
============================================================

EOF
exec "$PY" -m uvicorn cleared.api:app --host 0.0.0.0 --port "${PORT}"
