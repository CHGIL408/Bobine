const axios = require('axios');
require('dotenv').config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  },
});

const getMovieById = async (tmdbId) => {
  const response = await tmdbApi.get(`/movie/${tmdbId}?language=fr-FR`);
  const movie = response.data;

  return {
    title: movie.title,
    synopsis: movie.overview,
    releaseDate: movie.release_date,
    duration: movie.runtime,
    genre: movie.genres.map((g) => g.name),
    rating: movie.vote_average,
    poster: movie.poster_path ? `${TMDB_IMAGE_URL}${movie.poster_path}` : null,
    backdrop: movie.backdrop_path
      ? `${TMDB_IMAGE_URL}${movie.backdrop_path}`
      : null,
  };
};

const RECENT_DAYS = 548; // ~18 mois : un film en salle est sorti récemment (ou sort bientôt)

// Préfère le premier résultat sorti récemment : "Rembrandt" en salle n'est pas le film de 1936.
// shortcut: une reprise d'un vieux film (ex. ressortie d'Halloween) prendra une version récente du même nom s'il en existe une
const searchMovieId = async (title, now = new Date()) => {
  const response = await tmdbApi.get('/search/movie', {
    params: { query: title, language: 'fr-FR', region: 'CA' },
  });
  const results = response.data.results;
  const cutoff = now.getTime() - RECENT_DAYS * 864e5;
  const recent = results.find((m) => m.release_date && Date.parse(m.release_date) >= cutoff);
  return (recent ?? results[0])?.id ?? null;
};

module.exports = { getMovieById, searchMovieId };
