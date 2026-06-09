const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/Movie');
const Cinema = require('./models/Cinema');
const Showtime = require('./models/Showtime');

const movies = [
  {
    title: 'Dune: Partie 2',
    synopsis:
      'Paul Atreides unit les Fremen pour mener la guerre contre les conspirateurs.',
    releaseDate: new Date('2024-03-01'),
    duration: 166,
    genre: ['Science-Fiction', 'Action'],
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    rating: 8.5,
    tmdbId: 693134,
    language: 'fr',
  },
  {
    title: 'Oppenheimer',
    synopsis: "L'histoire du père de la bombe atomique.",
    releaseDate: new Date('2023-07-19'),
    duration: 180,
    genre: ['Drame', 'Histoire'],
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
    rating: 8.9,
    tmdbId: 872585,
    language: 'fr',
  },
];

const cinemas = [
  {
    name: 'Cineplex Odeon Quartier Latin',
    address: '350 Rue Emery',
    city: 'Montréal',
    location: { type: 'Point', coordinates: [-73.5614, 45.5122] },
    phone: '514-849-2244',
    website: 'https://www.cineplex.com',
  },
  {
    name: 'Cinéma Guzzo Marché Central',
    address: "9191 Boul de l'Acadie",
    city: 'Montréal',
    location: { type: 'Point', coordinates: [-73.6683, 45.5372] },
    phone: '514-384-5501',
    website: 'https://www.cinemaguzzo.com',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Vider les collections
    await Movie.deleteMany();
    await Cinema.deleteMany();
    await Showtime.deleteMany();
    console.log('🗑️  Collections vidées');

    // Insérer les films et cinémas
    const insertedMovies = await Movie.insertMany(movies);
    const insertedCinemas = await Cinema.insertMany(cinemas);
    console.log('🎬 Films insérés');
    console.log('🏢 Cinémas insérés');

    // Créer des séances
    const showtimes = [
      {
        movie: insertedMovies[0]._id,
        cinema: insertedCinemas[0]._id,
        datetime: new Date('2025-07-01T19:00:00'),
        format: 'IMAX',
        availableSeats: 120,
        price: 18.99,
      },
      {
        movie: insertedMovies[0]._id,
        cinema: insertedCinemas[1]._id,
        datetime: new Date('2025-07-01T21:30:00'),
        format: 'Standard',
        availableSeats: 80,
        price: 13.99,
      },
      {
        movie: insertedMovies[1]._id,
        cinema: insertedCinemas[0]._id,
        datetime: new Date('2025-07-02T18:00:00'),
        format: 'VOST',
        availableSeats: 95,
        price: 14.99,
      },
    ];

    await Showtime.insertMany(showtimes);
    console.log('🕐 Séances insérées');

    console.log('✅ Seed terminé avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur seed:', err);
    process.exit(1);
  }
};

seed();
