# Bobine

[![Tests](https://github.com/CHGIL408/Bobine/actions/workflows/tests.yml/badge.svg)](https://github.com/CHGIL408/Bobine/actions/workflows/tests.yml)
[![Synchronisation des séances](https://github.com/CHGIL408/Bobine/actions/workflows/sync-showtimes.yml/badge.svg)](https://github.com/CHGIL408/Bobine/actions/workflows/sync-showtimes.yml)

**Bobine** est une application web qui rassemble les films à l'affiche et les séances des cinémas de Québec. Les horaires sont synchronisés chaque jour depuis Google, et les fiches de films viennent de TMDB.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Synchronisation des séances](#synchronisation-des-séances)
- [API REST](#api-rest)
- [Tests et qualité](#tests-et-qualité)
- [Scripts](#scripts)
- [Licence](#licence)

## Fonctionnalités

### Accueil
- Films ayant au moins une séance à venir. Le mieux noté est mis en vedette avec sa prochaine séance, et il figure aussi en tête de la liste.
- Filtres par jour, par heure (à partir d'une heure précise), par cinéma et par format de salle (Standard, UltraAVX, IMAX, DBOX…). Recherche par titre et filtre par genre.
- Tri de la liste par note ou de A à Z.
- Prochaines heures de chaque film avec le format de salle (« STD » quand il n'est pas précisé).
- **Bientôt à l'affiche** : les 12 prochaines sorties au Canada les plus attendues selon TMDB.
  - Chaque film ouvre sa propre page sur le site : résumé, bande-annonce et date de sortie, sans favori ni séances avant sa sortie.
  - Les films qui ont déjà des séances sont exclus.
  - La liste est gardée 6 h en cache côté serveur.

### Page d'un film
- Fiche complète : date de sortie en salle au Canada, réalisation, distribution, note et résumé.
- Bande-annonce YouTube, chargée au clic via `youtube-nocookie`.
- Séances à venir groupées par jour puis par cinéma, à l'heure de Québec.
- Ajout d'une séance à l'agenda par un fichier `.ics`. La fin est estimée à la durée du film plus 15 min de bandes-annonces.
- Lien **Réserver** vers le site du cinéma et bouton **Partager** (menu natif du téléphone, sinon copie du lien).

### Ce soir (`/ce-soir`)
- Toutes les séances de maintenant à minuit, tous cinémas confondus, regroupées par heure.
- Les séances commencées depuis 15 min au plus restent visibles (« A commencé il y a 12 min »).
- Filtre par cinéma. S'il ne reste rien ce soir, les premières séances du lendemain s'affichent.
- Une page restée ouverte après minuit se met à jour toute seule.

### Cinémas
- Cineplex Odeon Beauport, Cineplex IMAX aux Galeries de la Capitale et Cineplex Odeon Ste-Foy.
- Itinéraire, lien vers cineplex.com et affiches des films à l'affiche aujourd'hui, ou à défaut la prochaine séance.
- **Trier par distance** :
  - La position est demandée au navigateur et n'est jamais envoyée au serveur.
  - Un avertissement s'affiche si elle n'est connue qu'à plus de 2 km près.
  - Les coordonnées des cinémas ont été vérifiées sur OpenStreetMap.

### Favoris
- Bouton sur la page d'un film et onglet **Favoris** sur l'accueil.
- Gardés dans le navigateur (`localStorage`), sans compte.

### Conditions et confidentialité (`/conditions`)
- Conditions d'utilisation et politique de confidentialité sur une même page, liées depuis le pied de page avec le copyright.
- La politique décrit ce que le site garde (favoris dans le navigateur, position jamais envoyée) et les services tiers contactés.

### Administration (`/admin`)
- Page non liée dans le menu, protégée par la clé `ADMIN_API_KEY`. La clé n'est gardée que dans l'onglet ouvert.
- Ajout d'un film par son identifiant TMDB : titre, résumé, affiche et note sont récupérés automatiquement.
- Suppression d'un film et de ses séances.

## Stack technique

| Couche       | Technologies                                                                 |
|--------------|------------------------------------------------------------------------------|
| Frontend     | Vue 3 (Composition API), Vite, Vue Router, Pinia, Axios                      |
| Backend      | Node.js, Express 5, MongoDB avec Mongoose                                    |
| Données      | [TMDB](https://www.themoviedb.org) pour les fiches, [SerpApi](https://serpapi.com) pour les horaires Google |
| Tests        | Vitest et Vue Test Utils (frontend), `node:test` (backend)                   |
| CI/CD        | GitHub Actions : tests à chaque push, synchronisation quotidienne des séances |
| Hébergement  | Frontend sur Vercel, API sur Render                                          |

## Architecture

```
backend/
  src/
    models/            Schémas Mongoose (films, cinémas, séances)
    routes/            Routes REST
    services/tmdb.js   Client TMDB (fiches, date de sortie au Canada, prochaines sorties)
    syncShowtimes.js   Synchronisation quotidienne des séances
frontend/
  src/
    views/             Pages (accueil, film, ce soir, cinémas, conditions, administration)
    components/        Composants partagés
    stores/            État Pinia (favoris)
    utils/             Dates à l'heure de Québec, agenda .ics, géolocalisation…
.github/workflows/     Tests et synchronisation quotidienne
```

**Date de sortie** : Bobine retient la sortie en salle au Canada. À défaut, elle prend celle des États-Unis, qui est presque toujours la même, puis la date mondiale de TMDB. La même règle sert pour la page d'un film et pour « Bientôt à l'affiche ».

## Démarrage rapide

**Prérequis** :
- Node.js `^20.19.0` ou `>=22.12.0`
- Une base MongoDB
- Un jeton d'accès TMDB
- Une clé SerpApi, seulement pour synchroniser les séances

### Backend

```sh
cd backend
npm install
cp .env.example .env   # puis remplir les variables (voir Configuration)
npm run dev            # http://localhost:3000
```

> `npm run seed` charge des données de démonstration. **Attention** : il vide d'abord les films, les cinémas et les séances.

### Frontend

```sh
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Par défaut, le frontend appelle l'API déployée (`https://bobine-backend.onrender.com/api`). Pour utiliser le backend local, créez `frontend/.env.local` (ignoré par git) :

```sh
VITE_API_URL=http://localhost:3000/api
```

## Configuration

Variables du fichier `backend/.env` :

| Variable          | Rôle                                                                                         |
|-------------------|----------------------------------------------------------------------------------------------|
| `PORT`            | Port de l'API (3000 par défaut)                                                              |
| `MONGODB_URI`     | Chaîne de connexion MongoDB, **avec le nom de la base** (`…mongodb.net/bobine?…`)            |
| `TMDB_API_KEY`    | « API Read Access Token » de TMDB (la longue chaîne `eyJ…`), et non la courte « API Key »    |
| `SERPAPI_API_KEY` | Clé SerpApi, utilisée par `npm run sync-showtimes`                                           |
| `ADMIN_API_KEY`   | Clé exigée pour toute écriture (`POST`, `DELETE`). Sans elle, les écritures sont refusées   |

Pour générer une clé d'administration :

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

En production, ces variables se définissent dans les variables d'environnement de Render.

## Synchronisation des séances

`npm run sync-showtimes` (dans `backend/`) fonctionne ainsi :

1. Une recherche Google par cinéma via SerpApi donne les horaires des 7 prochains jours.
2. Chaque titre est retrouvé sur TMDB. Le film est créé en base s'il n'y est pas encore : fiche en français, résumé anglais si le français manque.
3. Les séances à venir du cinéma sont remplacées, sans les doublons renvoyés par Google.

Règles de sécurité des données :
- Les séances passées sont conservées.
- Si Google ne renvoie rien pour un cinéma, ses séances restent intactes.
- Les séances dont le film n'existe plus sont supprimées.

**Planification** : le workflow `.github/workflows/sync-showtimes.yml` est programmé chaque jour à 10 h 17 UTC (5 h 17 l'hiver, 6 h 17 l'été à Québec) ; GitHub le lance souvent avec plusieurs heures de retard. Il peut aussi être lancé à la main depuis l'onglet **Actions** (« Run workflow »). Il a besoin des secrets `MONGODB_URI`, `TMDB_API_KEY` et `SERPAPI_API_KEY` dans **Settings › Secrets and variables › Actions**.

**Quota** : une recherche SerpApi par cinéma et par exécution, soit environ 90 par mois pour 3 cinémas. C'est sous la limite de 250 du plan gratuit. Une recherche identique relancée dans l'heure sort du cache et n'est pas comptée.

**Limites connues** :
- Chaque titre Google est associé au premier résultat TMDB sorti dans les 18 derniers mois, en écartant les films qui sortent dans plus d'un mois (une suite annoncée n'est jamais retenue). Une reprise d'un vieux film peut quand même être associée à un film récent du même nom.
- Google ne fournit ni les prix, ni les places restantes, ni la langue (VO ou VF). Seul le type de salle est conservé : Standard, IMAX, 3D, UltraAVX, ScreenX ou DBOX.

## API REST

Les lectures (`GET`) sont publiques. Toute écriture exige l'en-tête `x-api-key` égal à `ADMIN_API_KEY`. Sans cet en-tête, l'API répond `401`, ou `503` si la clé n'est pas configurée sur le serveur.

```sh
curl -X POST https://bobine-backend.onrender.com/api/movies \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tmdbId": 693134}'
```

### Films

| Méthode  | Route                      | Description                                                                 |
|----------|----------------------------|-----------------------------------------------------------------------------|
| `GET`    | `/api/movies`              | Liste des films. `?showing=true` : seulement ceux qui ont une séance à venir |
| `GET`    | `/api/movies/upcoming`     | Prochaines sorties au Canada (TMDB, cache de 6 h)                           |
| `GET`    | `/api/movies/tmdb/:tmdbId` | Fiche d'une prochaine sortie lue chez TMDB (cache de 6 h), ou la fiche en base si le film y est déjà. `400` si l'identifiant n'est pas un entier, `404` si TMDB ne le connaît pas |
| `GET`    | `/api/movies/:id`          | Détail d'un film                                                            |
| `POST`   | `/api/movies`              | Ajoute un film à partir de son identifiant TMDB : `{ "tmdbId": 693134 }`    |
| `DELETE` | `/api/movies/:id`          | Supprime un film et ses séances                                             |

### Cinémas

| Méthode | Route              | Description                                                        |
|---------|--------------------|--------------------------------------------------------------------|
| `GET`   | `/api/cinemas`     | Liste des cinémas                                                  |
| `GET`   | `/api/cinemas/:id` | Détail d'un cinéma                                                 |
| `POST`  | `/api/cinemas`     | Ajoute un cinéma. `website` doit commencer par `http://` ou `https://`, sinon `400` |

### Séances

| Méthode  | Route                | Description                                    |
|----------|----------------------|------------------------------------------------|
| `GET`    | `/api/showtimes`     | Liste des séances triées par date (paramètres ci-dessous) |
| `GET`    | `/api/showtimes/:id` | Détail d'une séance                            |
| `POST`   | `/api/showtimes`     | Ajoute une séance                              |
| `DELETE` | `/api/showtimes/:id` | Supprime une séance                            |

Paramètres de `GET /api/showtimes` :

| Paramètre         | Effet                                                                       |
|-------------------|-----------------------------------------------------------------------------|
| `movie=<id>`      | Séances d'un seul film                                                      |
| `upcoming=true`   | Séances à venir seulement                                                   |
| `since=<minutes>` | Avec `upcoming`, inclut les séances commencées depuis ce délai (60 au plus) |
| `populate=false`  | Identifiants du film et du cinéma au lieu des fiches complètes              |

## Tests et qualité

- `npm test` dans `backend/` (node:test : routes, clé API, service TMDB, lecture des horaires) et dans `frontend/` (Vitest : pages, favoris, agenda .ics, géolocalisation, recherche).
- Les tests n'utilisent ni la base ni le réseau : les modèles Mongoose, axios et l'API du frontend sont simulés.
- Ils s'exécutent sur GitHub Actions à chaque push et pull request (`.github/workflows/tests.yml`).

**Données extrêmes** : en développement, ajoutez `?data=worst`, `empty`, `one` ou `huge` à l'adresse pour tester l'affichage avec des titres très longs, des affiches cassées, une liste vide ou 300 séances. Un sélecteur apparaît alors en bas de l'écran. Ces données (`frontend/src/dev/fixtures.js`) ne sont jamais incluses dans le build de production.

## Scripts

### Backend

| Commande                 | Rôle                                                       |
|--------------------------|------------------------------------------------------------|
| `npm run dev`            | Serveur avec rechargement automatique (nodemon)            |
| `npm start`              | Serveur de production                                      |
| `npm test`               | Tests unitaires                                            |
| `npm run sync-showtimes` | Synchronise les séances depuis Google                      |
| `npm run seed`           | Remplace **toutes** les données par les données de démo    |

### Frontend

| Commande          | Rôle                          |
|-------------------|-------------------------------|
| `npm run dev`     | Serveur de développement      |
| `npm test`        | Tests unitaires (Vitest)      |
| `npm run build`   | Build de production           |
| `npm run preview` | Prévisualisation du build     |

## Licence

© 2026 Charles Gilbert. Tous droits réservés. Le code est public pour consultation dans le cadre d'un portfolio ; sa réutilisation demande une autorisation écrite.
