# Bobine

Application web de cinéma : films à l'affiche, cinémas de Québec et leurs séances.

- **Frontend** : Vue 3, Vite, Vue Router, Pinia, Axios
- **Backend** : Node.js, Express 5, MongoDB (Mongoose), API TMDB pour les fiches de films, SerpApi pour les horaires

## Fonctionnalités

- Page d'accueil : les films qui ont une séance à venir, le mieux noté en vedette avec sa prochaine séance (et aussi en tête de la liste), filtres par jour, heure (dès une heure précise, au choix) et cinéma, recherche et filtre par genre, liste triée par note ou de A à Z, prochaines heures de chaque film avec leur format de salle (« STD » quand il n'est pas précisé), les cinémas
- « Bientôt à l'affiche » sur l'accueil : les 12 prochaines sorties au Canada les plus attendues selon TMDB, avec affiche et date de sortie (la même règle que la page du film : Canada, sinon États-Unis) ; chaque film ouvre sa page sur le site (résumé, bande-annonce, date de sortie au Canada ; pas de favori ni de séances avant sa sortie) ; les films qui ont déjà des séances n'y sont pas ; liste gardée 6 h par le serveur pour limiter les appels à TMDB
- Favoris : un bouton sur la page d'un film, et un onglet « Favoris » toujours présent sur l'accueil ; gardés dans le navigateur (pas de compte)
- Page d'un film : fiche avec date de sortie en salle au Canada (sinon la date mondiale de TMDB), réalisation et distribution, bande-annonce YouTube (chargée au clic), séances à venir par jour puis par cinéma (heure de Québec) ; chaque heure s'ajoute à l'agenda (fichier `.ics`, fin estimée : durée du film + 15 min de bandes-annonces) ; lien « Réserver » vers le site du cinéma ; bouton « Partager » (menu du téléphone, sinon copie du lien)
- Page « Ce soir » (`/ce-soir`) : toutes les séances de maintenant à minuit, tous cinémas confondus, triées par heure et regroupées par heure, avec cinéma et format ; les séances commencées depuis 15 min au plus restent affichées (« A commencé il y a 12 min ») ; filtre par cinéma ; quand il ne reste rien ce soir, les premières séances de demain ; une page restée ouverte passé minuit recharge et montre la nouvelle journée
- Page cinémas : Cineplex Odeon Beauport, Cineplex IMAX aux Galeries de la Capitale, Cineplex Odeon Ste-Foy, avec itinéraire, lien vers la page du cinéma sur cineplex.com et les affiches des films encore à l'affiche aujourd'hui (les heures sont sur la page du film), ou la prochaine séance ; bouton « Trier par distance » (position demandée au navigateur en haute précision, jamais envoyée au serveur ; avertissement si elle n'est connue qu'à plus de 2 km près, par exemple localisée par l'adresse IP ; coordonnées des cinémas vérifiées sur OpenStreetMap)
- Séances récupérées chaque jour depuis Google (via SerpApi) ; les films manquants sont créés depuis TMDB (fiche en français, résumé anglais si le français manque)
- Page `/admin` (non liée dans le menu) : saisir la clé `ADMIN_API_KEY` (gardée seulement dans l'onglet), ajouter un film par son identifiant TMDB, supprimer un film et ses séances
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

Le frontend appelle par défaut l'API déployée (`https://bobine-backend.onrender.com/api`). Pour utiliser le backend local, créer `frontend/.env.local` avec `VITE_API_URL=http://localhost:3000/api` (fichier ignoré par git), puis relancer `npm run dev`.

## Séances automatiques

`npm run sync-showtimes` (dans `backend/`) fait une recherche Google par cinéma via [SerpApi](https://serpapi.com), lit les horaires des 7 prochains jours, retrouve chaque film sur TMDB (et le crée s'il n'est pas en base), puis remplace les séances à venir du cinéma (les doublons renvoyés par Google sont retirés). Les séances passées sont gardées ; si Google ne renvoie rien pour un cinéma, ses séances ne sont pas touchées. Les séances dont le film n'existe plus sont supprimées.

La tâche GitHub Actions `.github/workflows/sync-showtimes.yml` la lance chaque jour vers 6 h (heure de Québec), et à la demande depuis l'onglet **Actions** (« Run workflow »). Elle a besoin de trois secrets dans **Settings > Secrets and variables > Actions > Repository secrets** : `MONGODB_URI`, `TMDB_API_KEY`, `SERPAPI_API_KEY`.

Quota : une recherche SerpApi par cinéma et par exécution, soit environ 90 par mois pour 3 cinémas, sous les 250 du plan gratuit. Une recherche identique relancée dans l'heure sort du cache et n'est pas comptée.

Limites connues : chaque titre Google est associé au premier résultat TMDB sorti dans les 18 derniers mois (sinon au premier résultat) ; une reprise d'un vieux film peut donc être associée à un film récent du même nom. Google ne donne ni prix ni places restantes, ni la langue (VO/VF) : seul le type de salle est gardé (Standard, IMAX, 3D, UltraAVX, ScreenX, DBOX).

## API

Les lectures (`GET`) sont publiques. Toute écriture exige le header `x-api-key` égal à `ADMIN_API_KEY` (sinon 401, ou 503 si la clé n'est pas configurée sur le serveur) :

```sh
curl -X POST https://bobine-backend.onrender.com/api/movies -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" -d '{"tmdbId": 693134}'
```

Le champ `website` d'un cinéma doit commencer par `http://` ou `https://` (sinon 400) : un lien `javascript:` s'exécuterait au clic sur le site. Le site n'affiche de toute façon que les liens http(s).

| Méthode | Route                 | Description                             |
|---------|-----------------------|-----------------------------------------|
| GET     | `/api/movies`         | Liste des films (`?showing=true` : seulement ceux qui ont une séance à venir) |
| GET     | `/api/movies/upcoming` | Prochaines sorties au Canada (TMDB, en cache 6 h) |
| GET     | `/api/movies/tmdb/:tmdbId` | Fiche d'une prochaine sortie lue chez TMDB (en cache 6 h) ; la fiche de la base si le film y est déjà ; 400 si l'id n'est pas un entier, 404 si TMDB ne le connaît pas |
| GET     | `/api/movies/:id`     | Détail d'un film                        |
| POST    | `/api/movies`         | Ajoute un film (`{ "tmdbId": 693134 }`) |
| DELETE  | `/api/movies/:id`     | Supprime un film et ses séances         |
| GET     | `/api/cinemas`        | Liste des cinémas                       |
| GET     | `/api/cinemas/:id`    | Détail d'un cinéma                      |
| POST    | `/api/cinemas`        | Ajoute un cinéma                        |
| GET     | `/api/showtimes`      | Liste des séances, triées par date. `?movie=<id>` : un seul film ; `?upcoming=true` : à venir seulement (`&since=15` : y compris celles commencées depuis 15 min au plus, 60 au maximum) ; `?populate=false` : ids du film et du cinéma au lieu des fiches complètes (liste légère) |
| GET     | `/api/showtimes/:id`  | Détail d'une séance                     |
| POST    | `/api/showtimes`      | Ajoute une séance                       |
| DELETE  | `/api/showtimes/:id`  | Supprime une séance                     |

## Tests

```sh
cd backend && npm test    # node:test — routes (dont suppression en cascade), clé API, service TMDB, lecture des horaires SerpApi
cd frontend && npm test   # Vitest + Vue Test Utils — accueil (filtres jour, heure, cinéma, favoris), favoris, page film (séances, bande-annonce, agenda, favoris, partage, réservation), cinémas (films du jour, tri par distance), page « Ce soir » (fenêtre jusqu'à minuit, séances commencées, passage de minuit, filtre), fin de séance pour l'agenda, géolocalisation, administration, recherche, fichier .ics
```

Pour tester l'affichage avec des données extrêmes (titres très longs, affiches cassées, liste vide, 300 séances), lancer `npm run dev` puis ajouter `?data=worst`, `empty`, `one` ou `huge` à l'adresse ; un sélecteur apparaît en bas de l'écran. Ces données (`frontend/src/dev/fixtures.js`) ne sont jamais incluses dans le build de production.

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
