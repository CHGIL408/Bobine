# Bobine

Application web de cinéma : catalogue de films, cinémas et séances.

- **Frontend** : Vue 3, Vite, Vue Router, Pinia, Bootstrap, Axios
- **Backend** : Node.js, Express 5, MongoDB (Mongoose), API TMDB pour les fiches de films

## Fonctionnalités

- Liste des films avec recherche et filtre par genre
- Page détail d'un film
- Liste des cinémas
- Ajout d'un film à partir de son identifiant TMDB (titre, synopsis, affiche, note… récupérés automatiquement)

## Structure

```
backend/   API REST Express + MongoDB
frontend/  Application Vue 3
```

## Installation

Prérequis : Node.js `^20.19.0` ou `>=22.12.0`, une base MongoDB, une clé d'API TMDB.

### Backend

```sh
cd backend
npm install
cp .env.example .env   # puis remplir les variables
npm run seed           # optionnel : insère des films, cinémas et séances de démo
npm run dev            # http://localhost:3000
```

Variables du `.env` :

| Variable       | Rôle                                         |
|----------------|----------------------------------------------|
| `PORT`         | Port de l'API (3000 par défaut)              |
| `MONGODB_URI`  | Chaîne de connexion MongoDB                  |
| `TMDB_API_KEY` | Jeton d'accès (Bearer) de l'API TMDB         |

### Frontend

```sh
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Le frontend appelle par défaut l'API déployée (`https://bobine-backend.onrender.com/api`). Pour utiliser le backend local, changer `baseURL` dans `frontend/src/services/api.js` en `http://localhost:3000/api`.

## API

| Méthode | Route                 | Description                             |
|---------|-----------------------|-----------------------------------------|
| GET     | `/api/movies`         | Liste des films                         |
| GET     | `/api/movies/:id`     | Détail d'un film                        |
| POST    | `/api/movies`         | Ajoute un film (`{ "tmdbId": 693134 }`) |
| DELETE  | `/api/movies/:id`     | Supprime un film                        |
| GET     | `/api/cinemas`        | Liste des cinémas                       |
| GET     | `/api/cinemas/:id`    | Détail d'un cinéma                      |
| POST    | `/api/cinemas`        | Ajoute un cinéma                        |
| DELETE  | `/api/cinemas/:id`    | Supprime un cinéma                      |
| GET     | `/api/showtimes`      | Liste des séances                       |
| GET     | `/api/showtimes/:id`  | Détail d'une séance                     |
| POST    | `/api/showtimes`      | Ajoute une séance                       |
| DELETE  | `/api/showtimes/:id`  | Supprime une séance                     |

## Scripts frontend

| Commande          | Rôle                                |
|-------------------|-------------------------------------|
| `npm run dev`     | Serveur de développement            |
| `npm run build`   | Build de production                 |
| `npm run preview` | Prévisualise le build               |
| `npm run lint`    | Oxlint + ESLint                     |
| `npm run format`  | Prettier                            |
