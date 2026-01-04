# ------------ base image ------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (keep minimal; add others only if your pip deps need compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install python deps first (better cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create a tiny entrypoint that can optionally run migrate/collectstatic
# (DON'T do them by default on every boot)
RUN printf '%s\n' \
'#!/bin/sh' \
'set -e' \
'' \
'# Optional one-time tasks (control via env vars)' \
'if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then' \
'  echo "[entrypoint] Running migrations..."' \
'  python manage.py migrate --noinput' \
'fi' \
'' \
'if [ "${RUN_COLLECTSTATIC:-0}" = "1" ]; then' \
'  echo "[entrypoint] Collecting static..."' \
'  python manage.py collectstatic --noinput' \
'fi' \
'' \
'echo "[entrypoint] Starting gunicorn..."' \
'exec gunicorn backend.wsgi:application \\' \
'  --bind 0.0.0.0:${PORT:-8000} \\' \
'  --workers ${GUNICORN_WORKERS:-2} \\' \
'  --threads ${GUNICORN_THREADS:-4} \\' \
'  --timeout ${GUNICORN_TIMEOUT:-120}' \
> /app/entrypoint.sh \
 && chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
