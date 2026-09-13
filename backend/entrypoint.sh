#!/bin/sh
# Aplica migraciones y arranca uvicorn. En desarrollo con --reload; en
# producción (ENVIRONMENT=production) sin --reload y con varios workers.
set -e

echo "Aplicando migraciones de Alembic..."
alembic upgrade head

echo "Poblando datos iniciales (seed)..."
python -m scripts.seed

if [ "$ENVIRONMENT" = "production" ]; then
  echo "Iniciando uvicorn (producción)..."
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-2}"
else
  echo "Iniciando uvicorn (desarrollo, con --reload)..."
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
