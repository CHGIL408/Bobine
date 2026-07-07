<template>
  <div class="home">
    <div class="container">
      <h1>Films</h1>
      <SearchBar @search="onSearch" />
      <div class="grid">
        <MovieCard v-for="movie in filteredMovies" :key="movie._id" :movie="movie" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getMovies } from '../services/api.js'
import MovieCard from '@/components/MovieCard.vue'
import SearchBar from '@/components/SearchBar.vue'

const movies = ref([])
const filteredMovies = ref([])

onMounted(async () => {
  movies.value = await getMovies()
  filteredMovies.value = movies.value
})

const onSearch = (recherche) => {
  filteredMovies.value = movies.value.filter((movie) =>
    movie.title.toLowerCase().includes(recherche.toLowerCase()),
  )
}
</script>
<style scoped>
.home {
  background-color: #141414;
  min-height: 100vh;
  padding: 2rem;
  /* max-width: 1200px; */
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2a2a2a;
}

h1 {
  text-align: center;
  color: #ffffff;
  font-size: 1.8rem;
  margin-bottom: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
}
</style>
