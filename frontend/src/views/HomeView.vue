<template>
  <div>
    <h1>Movies</h1>
    <ul>
      <li v-for="movie in movies" :key="movie.id">
        {{ movie.title }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getMovies } from '../services/api.js'

const movies = ref([])

onMounted(async () => {
  movies.value = await getMovies()
})
</script>
