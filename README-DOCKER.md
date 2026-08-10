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

1. Build the `app` (PHP-FPM), `scheduler` (same image as `app`), `frontend`
   (Vite/Node) and pull the `nginx` and `db` (MySQL) images.
2. Inside `app` and `scheduler`, automatically:
   - copy `.env.example` to `.env` if `.env` doesn't exist yet,
   - run `composer install`,
   - generate `APP_KEY` if missing,
   - wait for MySQL to accept connections,
   - run `php artisan migrate`,
   - run `php artisan storage:link`.
3. Inside `frontend`, automatically run `npm install`, then start the Vite
   dev server with hot reload.
4. `scheduler` then starts `php artisan schedule:work`, which fires the
   app's scheduled jobs (`sejours:activer-en-cours` daily,
   `sejours:checkout-automatique` daily at 11:00) for as long as it runs.

The first run takes a few minutes (dependency installs). Subsequent runs are
fast — those steps are skipped once `vendor/` and `node_modules/` already
exist.

Once it settles, open:

- **Manager app:** http://localhost:5173 (sidebar: Dashboard, Séjours,
  Appartements, Ménage, Maintenance)
- **Cleaning agent app:** http://localhost:5173/menage (full-screen "Mes
  missions", no Manager sidebar — see "Comptes & connexion" below and
  "Installer sur mobile" further down)
- **Backend API:** http://localhost:8000/api/...
- **MySQL** (optional, for a GUI client like TablePlus/DBeaver):
  `localhost:3306`, database `restinnov`, user `restinnov`, password
  `restinnov` (root password: `root`).

### Comptes & connexion

The whole app requires logging in (téléphone + mot de passe) — there is no
anonymous access. A default **manager** account is created automatically on
first start (the `app`/`scheduler` entrypoint runs a seeder that's a no-op
if it already exists, so it's safe on every restart too):

- **Téléphone :** `0600000000`
- **Mot de passe :** `ChangeMe123!`

Override these before first start with `MANAGER_DEFAULT_TELEPHONE` /
`MANAGER_DEFAULT_PASSWORD` in `.env` (backend), and **change the password
after first login** — there is no in-app "change password" screen yet, so do
it via `php artisan tinker` (`$u = App\Models\Utilisateur::where('telephone', '0600000000')->first(); $u->password = Hash::make('...'); $u->save();`) or a fresh seed with different env values.

Create additional accounts (agents ménage, maintenance) as the manager, from
**Ménage → Ajouter un agent** — set a téléphone + mot de passe there for
anyone who needs to log in themselves (an agent record without a password
can still be assigned to appartements/missions, just can't log in).

Stop everything with `Ctrl+C`, or run it in the background:

```bash
docker compose up -d
```

## Services

| Service     | Image           | What it does                                              | Port on host |
|-------------|-----------------|-------------------------------------------------------------|--------------|
| `app`       | built locally   | PHP-FPM running the Laravel app                            | —            |
| `scheduler` | built locally (same image as `app`) | Runs `php artisan schedule:work`, the long-running process that fires the app's scheduled jobs (see below) | —            |
| `nginx`     | `nginx:alpine`  | Serves Laravel, proxies `.php` requests to `app`            | `8000`       |
| `db`        | `mysql:8.0`     | MySQL database, data persisted in a named volume            | `3306`       |
| `frontend`  | built locally   | Vite dev server for the React app, hot reload                | `5173`       |

`scheduler` is what makes the two scheduled jobs in `routes/console.php` actually
run on a real clock:

- `sejours:activer-en-cours` (daily) — moves "à venir" séjours to "en cours"
  once their arrival date has passed.
- `sejours:checkout-automatique` (daily at 11:00) — checks out "en cours"
  séjours departing today, exactly like the manual "Confirmer le checkout"
  button.

Without this service running, those commands still exist and can be run
by hand (`docker compose exec app php artisan sejours:activer-en-cours`),
but nothing triggers them on a schedule.

The database's data lives in the named volume `dbdata` — it survives
`docker compose down` and container restarts. It is only removed if you
explicitly run `docker compose down -v`.

## Everyday commands

Run an artisan command:

```bash
docker compose exec app php artisan migrate:fresh
docker compose exec app php artisan tinker
```

`migrate:fresh` wipes every table, including the default manager account —
re-seed it right after:

```bash
docker compose exec app php artisan db:seed --class=ManagerAccountSeeder
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
docker compose logs -f scheduler
```

Trigger one of the scheduled jobs on demand, instead of waiting for its
scheduled time:

```bash
docker compose exec app php artisan sejours:activer-en-cours
docker compose exec app php artisan sejours:checkout-automatique
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

## Installer sur mobile (PWA)

`/` (Manager) et `/menage` (agent de ménage) sont deux PWA indépendantes sur
la même origine : chacune a son propre `manifest.json`
(`frontend/public/manifest.json` et `frontend/public/manifest-menage.json`,
avec leur propre `name`/`short_name`/`start_url`/`scope`), et l'app bascule
le `<link rel="manifest">` (et le titre, la couleur de thème, le
`apple-mobile-web-app-title` pour iOS) entre les deux au moment du rendu de
chaque route — voir `frontend/src/pwa/usePwaIdentity.ts`. Résultat : une
icône "Add to Home Screen" posée depuis `/menage` installe une app à part,
nommée "Ménage", distincte de celle posée depuis `/`.

Pour qu'un agent de ménage installe son icône :

1. Se connecter sur `http://<votre-domaine>/menage` avec son compte
   (téléphone + mot de passe créé par le manager).
2. **Chrome Android :** menu ⋮ en haut à droite → **"Ajouter à l'écran
   d'accueil"** (ou un bandeau "Installer l'application" peut apparaître
   automatiquement). Confirmer le nom proposé ("Ménage") et valider.
3. **Safari iOS :** bouton Partager (carré avec flèche vers le haut) →
   **"Sur l'écran d'accueil"**. iOS ignore le manifest et lit le titre/icône
   posés par l'app à ce moment précis, donc bien rester sur `/menage` (pas
   `/`) avant d'ouvrir ce menu.

L'icône actuelle (`frontend/public/favicon.svg`) est un SVG — accepté par
les navigateurs modernes pour le manifest et `apple-touch-icon`, mais un
jeu d'icônes PNG dédié (192×192 et 512×512 a minima) donnerait un résultat
plus net sur les anciens appareils ; aucun outil de conversion SVG→PNG
n'était disponible dans cet environnement pour en générer un.

## How the pieces fit together

- `app` and `frontend` don't bake your source code into the image — the
  project directory is bind-mounted in (`.:/var/www` and `./frontend:/app`),
  so edits on your host are reflected immediately, no rebuild needed.
- `composer install` / `npm install` run once, at container start, via
  `docker/php/entrypoint.sh` and `docker/node/entrypoint.sh` — only when
  dependencies aren't actually installed yet, so restarts are fast. The
  check looks for a file the install produces (`vendor/autoload.php`,
  `node_modules/.bin/vite`), not just whether the directory exists: since
  `vendor/`/`node_modules/` are anonymous volumes (see below), the
  directory itself always exists as an empty mount point on first boot, so
  a plain "does the directory exist" check would never trigger the install.
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
- `scheduler` runs `docker/php/entrypoint.sh` too (composer install,
  migrations, the works — all idempotent, so running them a second time
  alongside `app` is harmless) before settling into `php artisan
  schedule:work`. It has its **own** anonymous `vendor/` volume, separate
  from `app`'s — anonymous volumes aren't shared between services even
  when they use the same image — so it does its own (parallel, equally
  fast) dependency install on first boot rather than reusing `app`'s.

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

**`require(/var/www/vendor/autoload.php): Failed to open stream`, or
`sh: vite: not found` / `Cannot find module '.../lightningcss.linux-x64-
musl.node'` in the frontend**
These all mean dependencies were never actually installed in the
container. `vendor/` and `node_modules/` are anonymous volumes (see
above) — on their very first mount they exist as an empty directory, and
`entrypoint.sh` checks for a specific installed file
(`vendor/autoload.php`, `node_modules/.bin/vite`) rather than just
whether the directory exists, precisely so an empty volume is correctly
detected as "needs installing". If you're hitting this, you're most
likely on a container/volume from before that check was fixed. Recreate
it:

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
