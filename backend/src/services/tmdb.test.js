// Tests du service TMDB avec axios simulé (aucun appel réseau)
const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');

const responses = {};
const requests = [];
// axios.create est appelé au chargement de tmdb.js : on le remplace avant le require
axios.create = () => ({
  get: async (url, config) => {
    requests.push({ url, config });
    return { data: responses[url.split('?')[0]] };
  },
});
const { getMovieById, searchMovieId } = require('./tmdb');

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
    append_to_response: 'videos,credits',
    include_video_language: 'fr,en,null',
  });
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
