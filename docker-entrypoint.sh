#!/bin/sh
# Container entrypoint: seed demo data on an empty DB, then launch the server.
set -e

PORT="${PORT:-8000}"

if [ "${CLEARED_SEED_DEMO:-1}" = "1" ]; then
  USERS="$(python -c 'from cleared import store; print(store.admin_overview()["users"])' 2>/dev/null || echo 0)"
  if [ "$USERS" = "0" ]; then
    echo "==> Empty database — seeding demo data..."
    python -m cleared.cli seed-demo || echo "(seed skipped)"
  else
    echo "==> Database already has $USERS user(s) — skipping seed."
  fi
fi

echo "==> Starting Cleared on :$PORT"
exec uvicorn cleared.api:app --host 0.0.0.0 --port "$PORT"
