// Tests du service TMDB avec axios simulé (aucun appel réseau)
const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');

const responses = {};
const requests = [];
// axios.create est appelé au chargement de tmdb.js : on le remplace avant le require.
// Une réponse peut dépendre de la langue : responses[url] = { 'fr-FR': …, 'en-US': … }
axios.create = () => ({
  get: async (url, config) => {
    requests.push({ url, config });
    const data = responses[url.split('?')[0]];
    return { data: data?.[config?.params?.language] ?? data };
  },
});
const { getMovieById, searchMovieId, getUpcomingMovies } = require('./tmdb');

test('getMovieById transforme la réponse TMDB en film Bobine', async () => {
  responses['/movie/27205'] = {
    title: 'Inception',
    overview: 'Dom Cobb est un voleur…',
    release_date: '2010-07-15',
    runtime: 148,
    genres: [{ name: 'Action' }, { name: 'Science-Fiction' }],
    vote_average: 8.372,
    poster_path: '/poster.jpg',
    backdrop_path: null,
    credits: {
      crew: [{ job: 'Producer', name: 'Emma Thomas' }, { job: 'Director', name: 'Christopher Nolan' }],
      cast: ['DiCaprio', 'Gordon-Levitt', 'Page', 'Hardy', 'Watanabe', 'Murphy', 'Caine'].map((name) => ({ name })),
    },
    videos: {
      results: [
        { site: 'YouTube', type: 'Teaser', iso_639_1: 'fr', key: 'teaser-fr' },
        { site: 'Vimeo', type: 'Trailer', iso_639_1: 'fr', key: 'vimeo-fr' },
        { site: 'YouTube', type: 'Trailer', iso_639_1: 'en', key: 'trailer-en' },
        { site: 'YouTube', type: 'Trailer', iso_639_1: 'fr', key: 'trailer-fr' },
      ],
    },
  };
  const movie = await getMovieById(27205);
  assert.deepStrictEqual(movie, {
    title: 'Inception',
    synopsis: 'Dom Cobb est un voleur…',
    releaseDate: '2010-07-15',
    duration: 148,
    genre: ['Action', 'Science-Fiction'],
    rating: 8.372,
    poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdrop: null,
    director: 'Christopher Nolan',
    cast: ['DiCaprio', 'Gordon-Levitt', 'Page', 'Hardy', 'Watanabe', 'Murphy'],
    trailerKey: 'trailer-fr',
  });
  assert.strictEqual(requests.at(-1).url, '/movie/27205');
  assert.deepStrictEqual(requests.at(-1).config.params, {
    language: 'fr-FR',
    append_to_response: 'videos,credits,release_dates',
    include_video_language: 'fr,en,null',
  });
});

test('getMovieById prend la sortie en salle au Canada, sinon aux États-Unis, sinon la date mondiale', async () => {
  const base = { title: 'X', genres: [], release_date: '2026-09-01' };
  const ca = (release_dates) => ({ release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ type: 3, release_date: '2026-08-01T00:00:00.000Z' }] }, { iso_3166_1: 'CA', release_dates }] } });
  responses['/movie/3'] = { ...base, ...ca([
    { type: 1, release_date: '2026-08-15T00:00:00.000Z' },
    { type: 3, release_date: '2026-09-19T00:00:00.000Z' },
    { type: 3, release_date: '2026-09-12T00:00:00.000Z' },
  ]) };
  assert.strictEqual((await getMovieById(3)).releaseDate, '2026-09-12');
  responses['/movie/4'] = { ...base, ...ca([{ type: 2, release_date: '2026-09-05T00:00:00.000Z' }]) };
  assert.strictEqual((await getMovieById(4)).releaseDate, '2026-09-05');
  responses['/movie/6'] = { ...base, release_dates: { results: [{ iso_3166_1: 'FR', release_dates: [{ type: 3, release_date: '2026-11-04T00:00:00.000Z' }] }, { iso_3166_1: 'US', release_dates: [{ type: 3, release_date: '2026-11-11T00:00:00.000Z' }] }] } };
  assert.strictEqual((await getMovieById(6)).releaseDate, '2026-11-11'); // Soldat fantôme : pas de date canadienne sur TMDB
  responses['/movie/5'] = base;
  assert.strictEqual((await getMovieById(5)).releaseDate, '2026-09-01');
});

test("getMovieById sans distribution ni vidéo renvoie des champs vides", async () => {
  responses['/movie/1'] = { title: 'Inconnu', genres: [], poster_path: null, backdrop_path: null };
  const movie = await getMovieById(1);
  assert.strictEqual(movie.director, null);
  assert.deepStrictEqual(movie.cast, []);
  assert.strictEqual(movie.trailerKey, null);
});

test('searchMovieId préfère un film sorti récemment', async () => {
  const now = new Date('2026-11-01T12:00:00Z');
  responses['/search/movie'] = {
    results: [
      { id: 50031, release_date: '1936-11-06' },
      { id: 1500001, release_date: '' },
      { id: 1500002, release_date: '2026-10-10' },
    ],
  };
  assert.strictEqual(await searchMovieId('Rembrandt', now), 1500002);
});

test("searchMovieId écarte une suite pas encore sortie, même plus récente", async () => {
  const now = new Date('2026-11-12T12:00:00Z');
  responses['/search/movie'] = {
    results: [
      { id: 1461519, release_date: '2027-07-22' }, // A Minecraft Movie Squared
      { id: 950387, release_date: '2025-04-04' }, // Minecraft, le film (reprise, > 18 mois)
    ],
  };
  assert.strictEqual(await searchMovieId('A Minecraft Movie', now), 950387);
  // une avant-première, quelques jours avant la sortie, reste acceptée
  responses['/search/movie'] = { results: [{ id: 7, release_date: '2026-11-20' }, { id: 8, release_date: '2010-01-01' }] };
  assert.strictEqual(await searchMovieId('Avant-première', now), 7);
});

test('searchMovieId garde le premier résultat sans film récent, ou renvoie null', async () => {
  responses['/search/movie'] = { results: [{ id: 1381071 }, { id: 18 }] };
  assert.strictEqual(await searchMovieId('Godzilla Minus Zero'), 1381071);
  assert.deepStrictEqual(requests.at(-1).config.params, {
    query: 'Godzilla Minus Zero',
    language: 'fr-FR',
    region: 'CA',
  });

  responses['/search/movie'] = { results: [] };
  assert.strictEqual(await searchMovieId('Film inexistant'), null);
});

test("getMovieById prend le résumé anglais quand le français est vide", async () => {
  responses['/movie/2'] = {
    'fr-FR': { title: 'Vous voyez tout', overview: '', genres: [], poster_path: null, backdrop_path: null },
    'en-US': { overview: 'A documentary about seeing everything.' },
  };
  const movie = await getMovieById(2);
  assert.strictEqual(movie.title, 'Vous voyez tout');
  assert.strictEqual(movie.synopsis, 'A documentary about seeing everything.');
  assert.strictEqual(requests.at(-1).config.params.language, 'en-US');
});

test('getUpcomingMovies garde les films pas encore sortis à Québec, triés par date, sans doublon', async () => {
  // 4 nov. 2026, 23 h à Québec = 5 nov. en UTC : "aujourd'hui" doit rester le 4
  const now = new Date('2026-11-05T04:00:00Z');
  responses['/movie/upcoming'] = {
    results: [
      { id: 1, title: 'Déjà sorti', release_date: '2026-10-30', poster_path: '/a.jpg' },
      { id: 2, title: 'Sort aujourd’hui', release_date: '2026-11-04', poster_path: null },
      { id: 3, title: 'Plus tard', release_date: '2026-12-19', poster_path: null },
      { id: 4, title: 'Demain', release_date: '2026-11-05', poster_path: '/d.jpg' },
    ],
  };
  // les pages 1 et 2 renvoient la même réponse simulée : les doublons doivent disparaître
  const movies = await getUpcomingMovies(now);
  assert.deepStrictEqual(movies, [
    { tmdbId: 4, title: 'Demain', releaseDate: '2026-11-05', poster: 'https://image.tmdb.org/t/p/w500/d.jpg' },
    { tmdbId: 3, title: 'Plus tard', releaseDate: '2026-12-19', poster: null },
  ]);
  assert.deepStrictEqual(requests.filter((r) => r.url === '/movie/upcoming').at(-1).config.params, { language: 'fr-FR', region: 'CA', page: 2 });
});

test('getUpcomingMovies prend la même date que la page du film (Canada, sinon États-Unis)', async () => {
  const now = new Date('2026-11-01T12:00:00Z');
  responses['/movie/upcoming'] = { results: [{ id: 70, title: 'Soldat fantôme', release_date: '2026-11-04' }] };
  responses['/movie/70/release_dates'] = { results: [{ iso_3166_1: 'US', release_dates: [{ type: 3, release_date: '2026-11-11T00:00:00.000Z' }, { type: 3, release_date: null }] }] };
  const [movie] = await getUpcomingMovies(now);
  assert.strictEqual(movie.releaseDate, '2026-11-11');
  delete responses['/movie/70/release_dates'];
});

test('getUpcomingMovies garde les plus populaires, puis les trie par date', async () => {
  const now = new Date('2026-11-04T12:00:00Z');
  responses['/movie/upcoming'] = {
    results: [
      { id: 1, title: 'Petit film', release_date: '2026-11-06', popularity: 2 },
      { id: 2, title: 'Grosse sortie', release_date: '2026-11-20', popularity: 90 },
      { id: 3, title: 'Attendu', release_date: '2026-11-13', popularity: 40 },
    ],
  };
  const movies = await getUpcomingMovies(now, 2);
  assert.deepStrictEqual(movies.map((m) => m.title), ['Attendu', 'Grosse sortie']);
});
