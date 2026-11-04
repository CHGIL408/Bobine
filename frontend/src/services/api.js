import axios from 'axios'

const api = axios.create({
  baseURL: 'https://bobine-backend.onrender.com/api',
})

// Développement seulement : ?data=worst|empty|one|huge remplace les réponses par des données extrêmes
// (src/dev/fixtures.js). import.meta.env.DEV vaut false au build : ce code disparaît en production.
export const devData =
  import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('data') : null
const fake = async (what, id) => (await import('../dev/fixtures.js')).fixture(devData, what, id)

export const getMovies = async (params) => {
  if (devData) return fake('movies')
  const response = await api.get('/movies', { params })
  return response.data
}

export const getMovie = async (id) => {
  if (devData) return fake('movie', id)
  const response = await api.get(`/movies/${id}`)
  return response.data
}

export const getShowtimes = async (movieId) => {
  if (devData) return fake('movieShowtimes', movieId)
  const response = await api.get(`/showtimes?movie=${movieId}`)
  return response.data
}

export const getCinemas = async () => {
  if (devData) return fake('cinemas')
  const response = await api.get('/cinemas')
  return response.data
}

// Séances à venir sans les fiches film et cinéma (ids seulement) : liste légère pour filtrer l'accueil
// options.since : inclut aussi les séances commencées depuis ce nombre de minutes
export const getUpcomingShowtimes = async (options = {}) => {
  if (devData) return fake('showtimes')
  const response = await api.get('/showtimes', { params: { upcoming: true, populate: false, ...options } })
  return response.data
}

// Écritures : exigent la clé d'administration (header x-api-key)
export const addMovie = async (tmdbId, apiKey) => {
  const response = await api.post('/movies', { tmdbId }, { headers: { 'x-api-key': apiKey } })
  return response.data
}

export const deleteMovie = async (id, apiKey) => {
  await api.delete(`/movies/${id}`, { headers: { 'x-api-key': apiKey } })
}

// Prochaines sorties au Canada (TMDB, mises en cache par le serveur) : films pas encore en salle
export const getComingSoon = async () => {
  if (devData) return fake('comingSoon')
  const response = await api.get('/movies/upcoming')
  return response.data
}
