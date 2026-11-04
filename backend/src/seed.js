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
  // coordonnées vérifiées sur OpenStreetMap (utilisées pour trier les cinémas par distance)
  {
    name: 'Cinéma Cineplex Odeon Beauport',
    address: '825 Rue Clemenceau',
    city: 'Québec',
    location: { type: 'Point', coordinates: [-71.2087, 46.8699] },
    website: 'https://www.cineplex.com/fr/theatre/cinema-cineplex-odeon-beauport',
  },
  {
    name: 'Cinéma Cineplex IMAX aux Galeries de la Capitale',
    address: '5401 Boul. des Galeries',
    city: 'Québec',
    location: { type: 'Point', coordinates: [-71.2875, 46.8335] },
    website: 'https://www.cineplex.com/fr/theatre/cinema-cineplex-imax-aux-galeries-de-la-capitale',
  },
  {
    name: 'Cinéma Cineplex Odeon Ste-Foy',
    address: '1200 Autoroute Duplessis',
    city: 'Québec',
    location: { type: 'Point', coordinates: [-71.3523, 46.7864] },
    website: 'https://www.cineplex.com/fr/theatre/cinema-cineplex-odeon-saintefoy',
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
