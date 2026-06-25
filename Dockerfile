# ---- Stage 1: build the React/Vite frontend ------------------------------- #
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: python runtime --------------------------------------------- #
FROM python:3.12-slim AS runtime
WORKDIR /app

# Python deps (fpdf2/rapidfuzz ship wheels; no build toolchain needed).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY cleared ./cleared
# Built SPA from stage 1 (api.py serves frontend/dist as the SPA root).
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Persist the SQLite DB to a mounted volume.
ENV CLEARED_DB_PATH=/data/cleared.db \
    CLEARED_ADMIN_EMAILS=demo@cleared.com.au \
    CLEARED_SEED_DEMO=1 \
    PORT=8000 \
    PYTHONUNBUFFERED=1
VOLUME ["/data"]
EXPOSE 8000

# Seeds demo data on first boot (when the DB is empty), then launches the server.
# Runs in offline mock mode unless ANTHROPIC_API_KEY is provided at runtime.
ENTRYPOINT ["docker-entrypoint.sh"]
