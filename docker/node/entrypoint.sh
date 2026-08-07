#!/bin/sh
set -e

cd /app

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "[entrypoint] Creating frontend/.env from .env.example"
  cp .env.example .env
fi

# Checking for node_modules/.bin/vite rather than just "does node_modules/
# exist": node_modules/ is mounted as an anonymous volume (see
# docker-compose.yml), so the directory itself always exists as an empty
# mount point on first boot -- `[ ! -d node_modules ]` would never be true,
# and npm install would never run.
if [ ! -f node_modules/.bin/vite ]; then
  echo "[entrypoint] Installing npm dependencies"
  npm install
fi

exec "$@"
