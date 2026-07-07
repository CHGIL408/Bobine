<template>
  <div class="movie-page">
    <button class="back-btn" @click="$router.back()">← Retour</button>
    <div class="movie-hero">
      <img :src="movie.poster" :alt="movie.title" class="poster" />
      <div class="movie-details">
        <h1>{{ movie.title }}</h1>
        <div class="badges">
          <span class="badge" v-for="genre in movie.genre" :key="genre">{{ genre }}</span>
        </div>
        <p class="rating">⭐ {{ movie.rating?.toFixed(1) }} / 10</p>
        <p class="duration">🕐 {{ movie.duration }} min</p>
        <p class="synopsis">{{ movie.synopsis }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.movie-page {
  background-color: #141414;
  min-height: 100vh;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: #ffffff;
}

.back-btn {
  background: none;
  border: 1px solid #444;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2rem;
  font-size: 14px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #2a2a2a;
}

.movie-hero {
  display: flex;
  gap: 3rem;
  align-items: flex-start;
}

.poster {
  width: 250px;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
  flex-shrink: 0;
}

.movie-details {
  flex: 1;
}

.movie-details h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1rem;
}

.badge {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #ccc;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.rating {
  font-size: 1.2rem;
  color: #f5c518;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.duration {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 1.5rem;
}

.synopsis {
  font-size: 15px;
  line-height: 1.8;
  color: #ccc;
  max-width: 700px;
}
</style>

<script setup>
import { getMovie } from '@/services/api'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const id = route.params.id
const movie = ref({})

onMounted(async () => {
  movie.value = await getMovie(id)
})
</script>
