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
  });
  assert.strictEqual(requests.at(-1).url, '/movie/27205?language=fr-FR');
});

test('searchMovieId renvoie le premier résultat, ou null', async () => {
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
