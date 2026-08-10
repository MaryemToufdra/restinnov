# Frontend — Séjours & ménage

Application React + Vite + TypeScript + Tailwind CSS consommant l'API Laravel du dépôt (backend à la racine).

Deux routes, deux publics, une seule authentification (téléphone + mot de
passe, voir [README-DOCKER.md](../README-DOCKER.md#comptes--connexion)) :

- `/` — l'app Manager complète (Dashboard, Séjours, Appartements, Ménage,
  Maintenance), réservée au rôle `manager`.
- `/menage` — l'espace de l'agent de ménage (ses missions du jour, plein
  écran, sans la sidebar Manager), réservé au rôle `menage`, installable
  comme icône PWA indépendante (voir
  [README-DOCKER.md](../README-DOCKER.md#installer-sur-mobile-pwa)).

Un compte du mauvais rôle sur l'une ou l'autre route est redirigé
automatiquement vers celle qui correspond au sien.

## Prérequis

Le backend Laravel doit tourner sur `http://localhost:8000` (`php artisan serve`), avec au moins un appartement en base pour peupler le formulaire.

## Configuration

Copier `.env.example` en `.env` pour surcharger l'URL de l'API si besoin (par défaut `http://localhost:8000`) :

```
VITE_API_BASE_URL=http://localhost:8000
```

## Développement

```bash
npm install
npm run dev
```

L'application est servie sur `http://localhost:5173`.

## Tests

```bash
npm run test
```

## Build

```bash
npm run build
```
