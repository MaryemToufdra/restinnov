#!/bin/sh
set -e

cd /var/www

if [ ! -f .env ]; then
  echo "[entrypoint] Creating .env from .env.example"
  cp .env.example .env
fi

# Checking for vendor/autoload.php rather than just "does vendor/ exist":
# vendor/ is mounted as an anonymous volume (see docker-compose.yml), so the
# directory itself always exists as an empty mount point on first boot --
# `[ ! -d vendor ]` would never be true, and composer install would never run.
if [ ! -f vendor/autoload.php ]; then
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

# Idempotent (checks for an existing account before creating one) -- safe to
# run on every container start, not just the first.
echo "[entrypoint] Ensuring the default manager account exists"
php artisan db:seed --class=ManagerAccountSeeder --force

echo "[entrypoint] Linking storage"
php artisan storage:link || true

# Local-dev convenience: make sure the bind-mounted host directory is
# writable by the php-fpm worker (www-data), regardless of host UID.
chmod -R ugo+rwX storage bootstrap/cache || true

exec "$@"
