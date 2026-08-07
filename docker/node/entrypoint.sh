#!/bin/sh
set -e

cd /app

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "[entrypoint] Creating frontend/.env from .env.example"
  cp .env.example .env
fi

if [ ! -d node_modules ]; then
  echo "[entrypoint] Installing npm dependencies"
  npm install
fi

exec "$@"
