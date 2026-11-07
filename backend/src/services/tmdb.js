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

// Bande-annonce YouTube : la française d'abord, sinon l'anglaise, sinon n'importe laquelle
const pickTrailer = (videos = []) => {
  const trailers = videos.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  return (
    trailers.find((v) => v.iso_639_1 === 'fr') ??
    trailers.find((v) => v.iso_639_1 === 'en') ??
    trailers[0]
  )?.key ?? null;
};

// Sortie en salle (type 3, sinon 2 = limitée) au Canada, sinon aux États-Unis (même date presque toujours, et TMDB a
// souvent l'une sans l'autre), sinon la date mondiale de TMDB
const canadianRelease = (releaseDates, fallback) => {
  const first = (country, type) =>
    (releaseDates?.results?.find((r) => r.iso_3166_1 === country)?.release_dates ?? [])
      .filter((d) => d.type === type && d.release_date)
      .map((d) => d.release_date.slice(0, 10))
      .sort()[0];
  return first('CA', 3) ?? first('CA', 2) ?? first('US', 3) ?? first('US', 2) ?? fallback;
};

const getMovieById = async (tmdbId) => {
  const response = await tmdbApi.get(`/movie/${tmdbId}`, {
    params: {
      language: 'fr-FR',
      append_to_response: 'videos,credits,release_dates',
      include_video_language: 'fr,en,null',
    },
  });
  const movie = response.data;

  // Pas de résumé français : on prend l'anglais plutôt que rien
  let synopsis = movie.overview;
  if (!synopsis) {
    const en = await tmdbApi.get(`/movie/${tmdbId}`, { params: { language: 'en-US' } });
    synopsis = en.data.overview || '';
  }

  return {
    title: movie.title,
    synopsis,
    releaseDate: canadianRelease(movie.release_dates, movie.release_date),
    duration: movie.runtime,
    genre: movie.genres.map((g) => g.name),
    rating: movie.vote_average,
    poster: movie.poster_path ? `${TMDB_IMAGE_URL}${movie.poster_path}` : null,
    backdrop: movie.backdrop_path
      ? `${TMDB_IMAGE_URL}${movie.backdrop_path}`
      : null,
    director: movie.credits?.crew?.find((p) => p.job === 'Director')?.name ?? null,
    cast: (movie.credits?.cast ?? []).slice(0, 6).map((p) => p.name),
    trailerKey: pickTrailer(movie.videos?.results),
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

// Date du jour à Québec, "2026-11-04" (même format que release_date)
const todayInQuebec = (now) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(now);

// Prochaines sorties au Canada : les plus attendues (popularité TMDB), de la plus proche à la plus lointaine.
// /movie/upcoming renvoie aussi des films sortis il y a quelques jours : on ne garde que ceux pas encore sortis.
// Trier par date seulement remplirait la liste de petits films qui ne passeront pas chez Cineplex.
const getUpcomingMovies = async (now = new Date(), limit = 12) => {
  const pages = await Promise.all(
    [1, 2].map((page) =>
      tmdbApi.get('/movie/upcoming', { params: { language: 'fr-FR', region: 'CA', page } }),
    ),
  );
  const today = todayInQuebec(now);
  const seen = new Set();
  const top = pages
    .flatMap((p) => p.data.results)
    .filter((m) => m.release_date > today && !seen.has(m.id) && seen.add(m.id))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, limit);
  // même date que la page du film (Canada, sinon États-Unis) ; échec TMDB : on garde la date de la liste
  const dated = await Promise.all(
    top.map(async (m) => {
      const release_dates = await tmdbApi.get(`/movie/${m.id}/release_dates`).then((r) => r.data, () => null);
      return { ...m, release_date: canadianRelease(release_dates, m.release_date) };
    }),
  );
  return dated
    .filter((m) => m.release_date > today)
    .sort((a, b) => a.release_date.localeCompare(b.release_date))
    .map((m) => ({
      tmdbId: m.id,
      title: m.title,
      releaseDate: m.release_date,
      poster: m.poster_path ? `${TMDB_IMAGE_URL}${m.poster_path}` : null,
    }));
};

module.exports = { getMovieById, searchMovieId, getUpcomingMovies };
