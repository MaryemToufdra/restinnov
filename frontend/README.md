# Frontend — Séjours & ménage

Application React + Vite + TypeScript + Tailwind CSS consommant l'API Laravel du dépôt (backend à la racine).

Elle affiche sur un seul écran :
- un formulaire de création de séjour (`POST /api/sejours`)
- la liste des séjours existants (`GET /api/sejours`)
- un bouton de confirmation de checkout par séjour non terminé (`PATCH /api/sejours/{id}/checkout`), qui affiche la mission de ménage créée et l'agent assigné (ou "non assigné")

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
