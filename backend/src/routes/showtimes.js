const express = require('express');
const router = express.Router();
const Showtime = require('../models/Showtime');

router.get('/', async (req, res) => {
  try {
    // ?movie=<id> : un seul film ; ?upcoming=true : séances à venir ;
    // ?populate=false : ids seulement (liste légère pour filtrer côté navigateur)
    const filter = {};
    if (req.query.movie) filter.movie = req.query.movie;
    if (req.query.upcoming === 'true') filter.datetime = { $gte: new Date() };
    let query = Showtime.find(filter).sort('datetime');
    query =
      req.query.populate === 'false'
        ? query.select('movie cinema datetime format')
        : query.populate('movie').populate('cinema');
    res.json(await query);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id);
    res.json(showtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const showtime = new Showtime(req.body);
    await showtime.save();
    res.status(201).json(showtime);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Showtime.findByIdAndDelete(req.params.id);
    res.status(204).json({ message: 'Showtime supprimé avec succès' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
