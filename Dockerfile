FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cleared ./cleared

# Persist the SQLite DB to a mounted volume.
ENV CLEARED_DB_PATH=/data/cleared.db
VOLUME ["/data"]

EXPOSE 8000
# Runs in mock mode unless ANTHROPIC_API_KEY is provided at runtime.
CMD ["uvicorn", "cleared.api:app", "--host", "0.0.0.0", "--port", "8000"]
