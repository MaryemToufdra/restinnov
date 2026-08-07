# RestinnovApp — Docker

Run the whole app (Laravel API + React/Vite frontend + MySQL) with a single
command, using nothing on your machine but Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (bundled
  with Docker Desktop, or the `docker compose` plugin on Linux).
- Nothing else. You do **not** need PHP, Composer, Node, npm, or MySQL
  installed on your host.

## Quick start

```bash
git clone <repo-url> RestinnovApp
cd RestinnovApp
docker compose up
```

That's it. On first run this will:

1. Build the `app` (PHP-FPM), `frontend` (Vite/Node) and pull the `nginx`
   and `db` (MySQL) images.
2. Inside `app`, automatically:
   - copy `.env.example` to `.env` if `.env` doesn't exist yet,
   - run `composer install`,
   - generate `APP_KEY` if missing,
   - wait for MySQL to accept connections,
   - run `php artisan migrate`,
   - run `php artisan storage:link`.
3. Inside `frontend`, automatically run `npm install`, then start the Vite
   dev server with hot reload.

The first run takes a few minutes (dependency installs). Subsequent runs are
fast — those steps are skipped once `vendor/` and `node_modules/` already
exist.

Once it settles, open:

- **Frontend (React app):** http://localhost:5173
- **Backend API:** http://localhost:8000/api/...
- **MySQL** (optional, for a GUI client like TablePlus/DBeaver):
  `localhost:3306`, database `restinnov`, user `restinnov`, password
  `restinnov` (root password: `root`).

Stop everything with `Ctrl+C`, or run it in the background:

```bash
docker compose up -d
```

## Services

| Service    | Image           | What it does                                   | Port on host |
|------------|-----------------|-------------------------------------------------|--------------|
| `app`      | built locally   | PHP-FPM running the Laravel app                 | —            |
| `nginx`    | `nginx:alpine`  | Serves Laravel, proxies `.php` requests to `app`| `8000`       |
| `db`       | `mysql:8.0`     | MySQL database, data persisted in a named volume| `3306`       |
| `frontend` | built locally   | Vite dev server for the React app, hot reload   | `5173`       |

The database's data lives in the named volume `dbdata` — it survives
`docker compose down` and container restarts. It is only removed if you
explicitly run `docker compose down -v`.

## Everyday commands

Run an artisan command:

```bash
docker compose exec app php artisan migrate:fresh
docker compose exec app php artisan tinker
```

Run the backend test suite:

```bash
docker compose exec app php artisan test
```

Run the frontend test suite:

```bash
docker compose exec frontend npm test
```

Tail logs for one service:

```bash
docker compose logs -f app
docker compose logs -f nginx
```

Rebuild images after changing a `Dockerfile` (not needed for ordinary code
changes — those are picked up live through the bind mounts):

```bash
docker compose up --build
```

Stop everything:

```bash
docker compose down
```

Stop everything **and wipe the database**:

```bash
docker compose down -v
```

## How the pieces fit together

- `app` and `frontend` don't bake your source code into the image — the
  project directory is bind-mounted in (`.:/var/www` and `./frontend:/app`),
  so edits on your host are reflected immediately, no rebuild needed.
- `composer install` / `npm install` run once, at container start, via
  `docker/php/entrypoint.sh` and `docker/node/entrypoint.sh` — only when
  `vendor/`/`node_modules/` are missing, so restarts are fast.
- `.env` (backend) and `frontend/.env` are created automatically from their
  `.env.example` on first run if they don't already exist. You never need to
  create or edit either file to use Docker.
- **You never need to touch your local `.env` for Docker, even if you
  already have one from running the app outside Docker** (e.g. with a local
  MySQL/XAMPP setup, where it's typically `DB_HOST=127.0.0.1`). The `app`
  service in `docker-compose.yml` sets `DB_CONNECTION`, `DB_HOST` (`db`),
  `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD` directly as
  container environment variables. Laravel's env loader never overwrites a
  variable that's already set in the process environment when it reads
  `.env` — so these always take priority over whatever is in the
  bind-mounted `.env` file, Docker or not. Your local `.env` is read-only
  as far as the database connection is concerned.
- `vendor/` and `frontend/node_modules/` each get their own **anonymous
  volume** (`/var/www/vendor` and `/app/node_modules` in
  `docker-compose.yml`), layered on top of the bind mount. Without this,
  the bind mount would expose whatever `vendor/`/`node_modules/` already
  exists on your host *inside* the container — and if you're on
  Windows/macOS, that directory contains native binaries built for your
  host OS (e.g. `lightningcss.linux-x64-musl.node` is Linux-only), which
  crash immediately inside the Linux container. The anonymous volumes keep
  each container's own, correctly-built dependencies isolated from the
  host's copy.
- `nginx` and `app` only start serving traffic once `db` is confirmed ready
  (via Docker healthchecks), so there's no need to manually retry after a
  cold start.

## Troubleshooting

**`SQLSTATE[HY000] [2002] Connection refused (... Host: 127.0.0.1 ...)`**
This means the `app` container is not picking up the `DB_HOST=db` variable
from `docker-compose.yml` — most likely because you ran `docker compose up`
before this was fixed, and the container (and its now-stale anonymous
`vendor/` volume) predates the fix. Recreate it:

```bash
docker compose down -v
docker compose up --build
```

If it still happens after that, confirm the `app` service actually has the
`environment:` block in `docker-compose.yml` (`DB_HOST: db`, etc.) — if it's
missing, you're on an older version of this file.

**`Error: Cannot find module '.../lightningcss.linux-x64-musl.node'`
(or any other `.node` binary) in the frontend**
Same root cause as above: a container built/started before the anonymous
`node_modules` volume was added ended up with your host's (non-Linux)
`node_modules` mounted straight through. Fix:

```bash
docker compose down -v
docker compose up --build
```

**"port is already allocated" on 8000, 5173, or 3306**
Something on your host is already using that port (a local MySQL install is
the most common culprit for 3306). Either stop that service, or remap the
port in `docker-compose.yml`, e.g. change `"3306:3306"` to `"3307:3306"`.

**Changes to `composer.json` or `package.json` don't seem to apply**
`composer install`/`npm install` only run automatically when
`vendor/`/`node_modules/` are missing. After adding a dependency, run:

```bash
docker compose exec app composer install
docker compose exec frontend npm install
```

**Permission errors writing to `storage/` or `bootstrap/cache/`**
The entrypoint already runs a `chmod` on every start to keep this working
across host/container UID mismatches. If you still hit this, run:

```bash
docker compose exec app chmod -R ugo+rwX storage bootstrap/cache
```

**Start over from a totally clean state**

```bash
docker compose down -v
rm -f .env frontend/.env
docker compose up --build
```

## Running without Docker

If you'd rather run the app directly on your machine, switch `.env` back to
SQLite (`DB_CONNECTION=sqlite`, no other `DB_*` value needed) and follow the
usual Laravel + Vite workflow (`composer install`, `php artisan serve`,
`cd frontend && npm install && npm run dev`). This Docker setup is optional,
not required.
