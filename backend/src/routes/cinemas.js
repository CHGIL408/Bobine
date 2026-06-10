const express = require('express');
const router = express.Router();
const Cinema = require('../models/Cinema');

// GET TOUS LES CINEMAS
router.get('/', async (req, res) => {
  try {
    const cinemas = await Cinema.find();
    res.json(cinemas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET UN CINEMA
router.get('/:id', async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id);
    res.json(cinema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AJOUT D'UN CINÉMA
router.post('/', async (req, res) => {
  try {
    const cinema = new Cinema(req.body);
    await cinema.save();
    res.status(201).json(cinema);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
