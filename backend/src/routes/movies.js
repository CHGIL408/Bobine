const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const tmdb = require('../services/tmdb');
const { getMovieById } = tmdb;

// PROCHAINES SORTIES (TMDB), gardées 6 h en mémoire : quelques appels TMDB par jour au plus
const UPCOMING_TTL = 6 * 3600e3;
let upcomingCache = null; // { at, movies }
router.get('/upcoming', async (req, res) => {
  try {
    if (!upcomingCache || Date.now() - upcomingCache.at > UPCOMING_TTL) {
      upcomingCache = { at: Date.now(), movies: await tmdb.getUpcomingMovies() };
    }
    res.json(upcomingCache.movies);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});
router.resetUpcomingCache = () => { upcomingCache = null; }; // pour les tests

// GET TOUS LES FILMS (?showing=true : seulement ceux qui ont une séance à venir)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.showing === 'true') {
      filter._id = { $in: await Showtime.distinct('movie', { datetime: { $gte: new Date() } }) };
    }
    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET UN FILM
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AJOUT FILM
router.post('/', async (req, res) => {
  try {
    const tmdbData = await getMovieById(req.body.tmdbId);
    const movie = new Movie({ ...req.body, ...tmdbData });
    await movie.save();
    res.status(201).json(movie);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// SUPPRIMER UN FILM
router.delete('/:id', async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    await Showtime.deleteMany({ movie: req.params.id }); // ses séances n'ont plus de sens sans lui
    res.status(204).json({ message: 'Film supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
