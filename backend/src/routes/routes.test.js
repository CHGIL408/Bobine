// Tests des routes avec un vrai serveur Express et des modèles Mongoose simulés (aucune base requise)
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const tmdb = require('../services/tmdb');

// Remplacé avant le require de la route, qui déstructure getMovieById au chargement
tmdb.getMovieById = async (id) => ({ title: `Film ${id}`, genre: ['Drame'], rating: 7.5 });
const movieRoutes = require('./movies');
const showtimeRoutes = require('./showtimes');

// Requête Mongoose simulée : chaînable (.sort/.populate) et awaitable
const query = (data, calls = []) => ({
  sort(arg) { calls.push(['sort', arg]); return this; },
  populate(arg) { calls.push(['populate', arg]); return this; },
  then(resolve, reject) { return Promise.resolve(data).then(resolve, reject); },
});

let server;
let base;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/movies', movieRoutes);
  app.use('/api/showtimes', showtimeRoutes);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}/api`;
});

test.after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GET /showtimes?movie= filtre par film, trie par date et peuple film et cinéma', async (t) => {
  const calls = [];
  const find = t.mock.method(Showtime, 'find', () => query([{ _id: 's1' }], calls));
  const res = await fetch(`${base}/showtimes?movie=abc123`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), [{ _id: 's1' }]);
  assert.deepStrictEqual(find.mock.calls[0].arguments[0], { movie: 'abc123' });
  assert.deepStrictEqual(calls, [['sort', 'datetime'], ['populate', 'movie'], ['populate', 'cinema']]);
});

test('GET /showtimes sans filtre renvoie toutes les séances', async (t) => {
  const find = t.mock.method(Showtime, 'find', () => query([]));
  await fetch(`${base}/showtimes`);
  assert.deepStrictEqual(find.mock.calls[0].arguments[0], {});
});

test('GET /showtimes renvoie 500 si la base échoue', async (t) => {
  t.mock.method(Showtime, 'find', () => query(Promise.reject(new Error('panne'))));
  const res = await fetch(`${base}/showtimes`);
  assert.strictEqual(res.status, 500);
  assert.deepStrictEqual(await res.json(), { error: 'panne' });
});

test('POST /showtimes répond 201 avec la séance créée', async (t) => {
  t.mock.method(Showtime.prototype, 'save', async function () { return this; });
  const body = { movie: '6a4c72d6c01ade2eb8d32a7d', cinema: '6a4c71c983f08a983520e00b', datetime: '2026-11-02T23:00:00Z' };
  const res = await post('/showtimes', body);
  assert.strictEqual(res.status, 201);
  const json = await res.json();
  assert.strictEqual(json.movie, body.movie);
  assert.strictEqual(json.format, 'Standard');
});

test('POST /showtimes répond 400 si des champs obligatoires manquent', async () => {
  const res = await post('/showtimes', {});
  assert.strictEqual(res.status, 400);
  assert.match((await res.json()).error, /movie|cinema|datetime/);
});

test('GET /movies renvoie la liste des films', async (t) => {
  t.mock.method(Movie, 'find', async () => [{ title: 'Inception' }]);
  const res = await fetch(`${base}/movies`);
  assert.deepStrictEqual(await res.json(), [{ title: 'Inception' }]);
});

test('GET /movies?showing=true ne renvoie que les films avec une séance à venir', async (t) => {
  const distinct = t.mock.method(Showtime, 'distinct', async () => ['m1', 'm2']);
  const find = t.mock.method(Movie, 'find', async () => [{ title: 'Clayface' }]);
  const before = Date.now();
  await fetch(`${base}/movies?showing=true`);
  const [field, query] = distinct.mock.calls[0].arguments;
  assert.strictEqual(field, 'movie');
  assert.ok(query.datetime.$gte.getTime() >= before);
  assert.deepStrictEqual(find.mock.calls[0].arguments[0], { _id: { $in: ['m1', 'm2'] } });
});

test('GET /movies sans showing ne filtre pas', async (t) => {
  const find = t.mock.method(Movie, 'find', async () => []);
  await fetch(`${base}/movies`);
  assert.deepStrictEqual(find.mock.calls[0].arguments[0], {});
});

test('POST /movies complète le film avec les données TMDB', async (t) => {
  t.mock.method(Movie.prototype, 'save', async function () { return this; });
  const res = await post('/movies', { tmdbId: 27205 });
  assert.strictEqual(res.status, 201);
  const json = await res.json();
  assert.strictEqual(json.title, 'Film 27205');
  assert.strictEqual(json.tmdbId, 27205);
  assert.deepStrictEqual(json.genre, ['Drame']);
});

test('POST /movies répond 400 si la sauvegarde échoue (ex. doublon)', async (t) => {
  t.mock.method(Movie.prototype, 'save', async () => { throw new Error('E11000 duplicate key'); });
  const res = await post('/movies', { tmdbId: 27205 });
  assert.strictEqual(res.status, 400);
});
