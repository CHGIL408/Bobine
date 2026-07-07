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

module.exports = { getMovieById };
