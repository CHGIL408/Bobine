import axios from 'axios'

const api = axios.create({
  baseURL: 'https://bobine-backend.onrender.com/api',
})

export const getMovies = async (params) => {
  const response = await api.get('/movies', { params })
  return response.data
}

export const getMovie = async (id) => {
  const response = await api.get(`/movies/${id}`)
  return response.data
}

export const getShowtimes = async (movieId) => {
  const response = await api.get(`/showtimes?movie=${movieId}`)
  return response.data
}

export const getCinemas = async () => {
  const response = await api.get('/cinemas')
  return response.data
}

// Séances à venir sans les fiches film et cinéma (ids seulement) : liste légère pour filtrer l'accueil
export const getUpcomingShowtimes = async () => {
  const response = await api.get('/showtimes', { params: { upcoming: true, populate: false } })
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
