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
