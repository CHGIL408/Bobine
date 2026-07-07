<template>
  <div class="movie-card" @click="$router.push(`/movies/${movie._id}`)">
    <img :src="props.movie.poster" :alt="props.movie.title" />
    <div class="movie-info">
      <h3>{{ props.movie.title }}</h3>
      <p>⭐ {{ props.movie.rating.toFixed(1) }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  movie: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
.movie-card {
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
}

.movie-card:hover {
  transform: scale(1.05);
  z-index: 1;
}

.movie-card img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.movie-info {
  padding: 8px 2px;
}

.movie-info h3 {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.movie-info p {
  font-size: 12px;
  color: #f5c518;
  font-weight: 600;
}
</style>
