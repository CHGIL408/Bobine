const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const { getMovieById } = require('../services/tmdb');
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
    res.status(204).json({ message: 'Film supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
