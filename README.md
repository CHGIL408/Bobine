# Bobine

Application web de cinéma : films à l'affiche, cinémas de Québec et leurs séances.

- **Frontend** : Vue 3, Vite, Vue Router, Pinia, Bootstrap, Axios
- **Backend** : Node.js, Express 5, MongoDB (Mongoose), API TMDB pour les fiches de films, SerpApi pour les horaires

## Fonctionnalités

- Page d'accueil : les films qui ont une séance à venir, le mieux noté en vedette avec sa prochaine séance, filtres par jour, heure (dès 17 h, 19 h, 21 h) et cinéma, recherche et filtre par genre, prochaines heures de chaque film, les cinémas
- Favoris : un bouton sur la page d'un film, puis un onglet « Favoris » sur l'accueil ; gardés dans le navigateur (pas de compte)
- Page d'un film : fiche avec réalisation et distribution, bande-annonce YouTube (chargée au clic), séances à venir par jour puis par cinéma (heure de Québec) ; chaque heure s'ajoute à l'agenda (fichier `.ics`)
- Page cinémas : Cineplex Odeon Beauport, Cineplex IMAX aux Galeries de la Capitale, Cineplex Odeon Ste-Foy, avec itinéraire, site et les films encore à l'affiche aujourd'hui (heures et format), ou la prochaine séance
- Séances récupérées chaque jour depuis Google (via SerpApi) ; les films manquants sont créés depuis TMDB (fiche en français, résumé anglais si le français manque)
- Ajout d'un film à partir de son identifiant TMDB (titre, synopsis, affiche, note… récupérés automatiquement), protégé par clé API

## Structure

```
backend/            API REST Express + MongoDB
  src/syncShowtimes.js  Synchronisation des séances (SerpApi + TMDB)
frontend/           Application Vue 3
.github/workflows/  Tâche quotidienne de synchronisation des séances
```

## Installation

Prérequis : Node.js `^20.19.0` ou `>=22.12.0`, une base MongoDB, un jeton d'accès TMDB, une clé SerpApi (seulement pour synchroniser les séances).

### Backend

```sh
cd backend
npm install
cp .env.example .env   # puis remplir les variables
npm run seed           # optionnel : données de démo — ⚠ vide d'abord films, cinémas et séances
npm run dev            # http://localhost:3000
```

Variables du `.env` :

| Variable          | Rôle                                                                                  |
|-------------------|---------------------------------------------------------------------------------------|
| `PORT`            | Port de l'API (3000 par défaut)                                                       |
| `MONGODB_URI`     | Chaîne de connexion MongoDB, **avec le nom de la base** (`…mongodb.net/bobine?…`)     |
| `TMDB_API_KEY`    | « API Read Access Token » de TMDB (la longue chaîne `eyJ…`), pas la courte « API Key » |
| `SERPAPI_API_KEY` | Clé SerpApi, pour `npm run sync-showtimes`                                            |
| `ADMIN_API_KEY`   | Clé exigée pour toute écriture (`POST`, `DELETE`) ; sans elle, les écritures sont refusées |

Pour générer une clé : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. À mettre aussi dans les variables d'environnement de Render.

### Frontend

```sh
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Le frontend appelle par défaut l'API déployée (`https://bobine-backend.onrender.com/api`). Pour utiliser le backend local, changer `baseURL` dans `frontend/src/services/api.js` en `http://localhost:3000/api`.

## Séances automatiques

`npm run sync-showtimes` (dans `backend/`) fait une recherche Google par cinéma via [SerpApi](https://serpapi.com), lit les horaires des 7 prochains jours, retrouve chaque film sur TMDB (et le crée s'il n'est pas en base), puis remplace les séances à venir du cinéma. Les séances passées sont gardées ; si Google ne renvoie rien pour un cinéma, ses séances ne sont pas touchées. Les séances dont le film n'existe plus sont supprimées.

La tâche GitHub Actions `.github/workflows/sync-showtimes.yml` la lance chaque jour vers 6 h (heure de Québec), et à la demande depuis l'onglet **Actions** (« Run workflow »). Elle a besoin de trois secrets dans **Settings > Secrets and variables > Actions > Repository secrets** : `MONGODB_URI`, `TMDB_API_KEY`, `SERPAPI_API_KEY`.

Quota : une recherche SerpApi par cinéma et par exécution, soit environ 90 par mois pour 3 cinémas, sous les 250 du plan gratuit. Une recherche identique relancée dans l'heure sort du cache et n'est pas comptée.

Limites connues : chaque titre Google est associé au premier résultat TMDB sorti dans les 18 derniers mois (sinon au premier résultat) ; une reprise d'un vieux film peut donc être associée à un film récent du même nom. Google ne donne ni prix ni places restantes.

## API

Les lectures (`GET`) sont publiques. Toute écriture exige le header `x-api-key` égal à `ADMIN_API_KEY` (sinon 401, ou 503 si la clé n'est pas configurée sur le serveur) :

```sh
curl -X POST https://bobine-backend.onrender.com/api/movies -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" -d '{"tmdbId": 693134}'
```

| Méthode | Route                 | Description                             |
|---------|-----------------------|-----------------------------------------|
| GET     | `/api/movies`         | Liste des films (`?showing=true` : seulement ceux qui ont une séance à venir) |
| GET     | `/api/movies/:id`     | Détail d'un film                        |
| POST    | `/api/movies`         | Ajoute un film (`{ "tmdbId": 693134 }`) |
| DELETE  | `/api/movies/:id`     | Supprime un film                        |
| GET     | `/api/cinemas`        | Liste des cinémas                       |
| GET     | `/api/cinemas/:id`    | Détail d'un cinéma                      |
| POST    | `/api/cinemas`        | Ajoute un cinéma                        |
| GET     | `/api/showtimes`      | Liste des séances, triées par date. `?movie=<id>` : un seul film ; `?upcoming=true` : à venir seulement ; `?populate=false` : ids du film et du cinéma au lieu des fiches complètes (liste légère) |
| GET     | `/api/showtimes/:id`  | Détail d'une séance                     |
| POST    | `/api/showtimes`      | Ajoute une séance                       |
| DELETE  | `/api/showtimes/:id`  | Supprime une séance                     |

## Tests

```sh
cd backend && npm test    # node:test — routes, clé API, service TMDB, lecture des horaires SerpApi
cd frontend && npm test   # Vitest + Vue Test Utils — accueil (filtres jour, heure, cinéma, favoris), favoris, page film (séances, bande-annonce, agenda), cinémas (films du jour), recherche, fichier .ics
```

Les tests n'utilisent ni la base ni le réseau : les modèles Mongoose, axios et l'API du frontend sont simulés. Ils tournent sur GitHub à chaque push et pull request (`.github/workflows/tests.yml`, onglet **Actions**).

## Scripts backend

| Commande                 | Rôle                                                  |
|--------------------------|-------------------------------------------------------|
| `npm run dev`            | Serveur avec rechargement automatique (nodemon)       |
| `npm start`              | Serveur                                               |
| `npm test`               | Tests unitaires                                       |
| `npm run sync-showtimes` | Synchronise les séances depuis Google                 |
| `npm run seed`           | Remplace **toutes** les données par les données de démo |

## Scripts frontend

| Commande          | Rôle                                |
|-------------------|-------------------------------------|
| `npm run dev`     | Serveur de développement            |
| `npm test`        | Tests unitaires (Vitest)            |
| `npm run build`   | Build de production                 |
| `npm run preview` | Prévisualise le build               |
| `npm run lint`    | Oxlint + ESLint                     |
| `npm run format`  | Prettier                            |
