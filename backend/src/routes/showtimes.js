const express = require('express');
const router = express.Router();
const Showtime = require('../models/Showtime');

router.get('/', async (req, res) => {
  try {
    const filter = req.query.movie ? { movie: req.query.movie } : {};
    const showtimes = await Showtime.find(filter)
      .sort('datetime')
      .populate('movie')
      .populate('cinema');
    res.json(showtimes);
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
