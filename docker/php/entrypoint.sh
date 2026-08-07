#!/bin/sh
set -e

cd /var/www

if [ ! -f .env ]; then
  echo "[entrypoint] Creating .env from .env.example"
  cp .env.example .env
fi

if [ ! -d vendor ]; then
  echo "[entrypoint] Installing Composer dependencies"
  composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  echo "[entrypoint] Generating APP_KEY"
  php artisan key:generate --force
fi

echo "[entrypoint] Waiting for the database to accept connections"
until php -r '
  $host = getenv("DB_HOST") ?: "db";
  $port = getenv("DB_PORT") ?: "3306";
  $db   = getenv("DB_DATABASE") ?: "restinnov";
  $user = getenv("DB_USERNAME") ?: "restinnov";
  $pass = getenv("DB_PASSWORD") ?: "restinnov";
  new PDO("mysql:host={$host};port={$port};dbname={$db}", $user, $pass);
' 2>/dev/null; do
  sleep 2
done
echo "[entrypoint] Database is up"

echo "[entrypoint] Running migrations"
php artisan migrate --force

echo "[entrypoint] Linking storage"
php artisan storage:link || true

# Local-dev convenience: make sure the bind-mounted host directory is
# writable by the php-fpm worker (www-data), regardless of host UID.
chmod -R ugo+rwX storage bootstrap/cache || true

exec "$@"
