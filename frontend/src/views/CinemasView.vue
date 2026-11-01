<template>
  <main class="page">
    <div class="title-row">
      <h1>Cinémas</h1>
      <p v-if="status === 'ready'" class="muted">{{ summary }}</p>
    </div>

    <p v-if="status === 'error'" class="tile message" role="alert">
      Impossible de charger les cinémas.
      <button type="button" class="text-action" @click="load">Réessayer</button>
    </p>
    <p v-else-if="status === 'ready' && !cinemas.length" class="tile message">
      Aucun cinéma pour le moment.
    </p>

    <ul v-else-if="status === 'loading'" class="grid" aria-busy="true" aria-label="Chargement des cinémas">
      <li v-for="n in 3" :key="n" class="tile skeleton"></li>
    </ul>

    <ul v-else class="grid">
      <li v-for="cinema in cinemas" :key="cinema._id" class="tile">
        <h2>{{ cinema.name }}</h2>
        <p class="muted">{{ cinema.address }}<br />{{ cinema.city }}</p>
        <p v-if="cinema.phone" class="num">
          <a :href="`tel:${cinema.phone}`">{{ cinema.phone }}</a>
        </p>
        <div class="actions">
          <a :href="mapUrl(cinema)" target="_blank" rel="noopener" class="primary">Itinéraire</a>
          <a v-if="cinema.website" :href="cinema.website" target="_blank" rel="noopener" class="text-action">
            Site web
          </a>
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCinemas } from '@/services/api'

const cinemas = ref([])
const status = ref('loading')

const load = async () => {
  status.value = 'loading'
  try {
    cinemas.value = await getCinemas()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}
onMounted(load)

const summary = computed(() => {
  const n = cinemas.value.length
  const cities = [...new Set(cinemas.value.map((c) => c.city))]
  return `${n} cinéma${n > 1 ? 's' : ''}${cities.length === 1 ? ` à ${cities[0]}` : ''}`
})

const mapUrl = (c) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${c.address}, ${c.city}`)}`
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

h1 {
  font-size: var(--fs-title);
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}

h2 {
  font-size: var(--fs-section);
  font-weight: 600;
  margin: 0;
}

p {
  margin: 0;
}

.muted {
  color: var(--muted);
  line-height: 1.5;
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

/* 3 cinémas pairs : colonnes égales, un seul gap */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gap);
  list-style: none;
  margin: 0;
  padding: 0;
}

.tile {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: var(--pad);
}

.grid .tile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  min-height: 190px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: auto;
  padding-top: 8px;
}

.primary {
  display: inline-flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 18px;
  border-radius: 999px;
  background: var(--text);
  color: #000;
  font-weight: 500;
  text-decoration: none;
  transition: transform 0.1s, background 0.15s;
}

.primary:hover {
  background: #e6e6e6;
}

.primary:active {
  transform: scale(0.97);
}

a {
  color: var(--text);
}

.text-action {
  background: none;
  border: 0;
  padding: 0;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.text-action:hover {
  text-decoration: underline;
}

.message {
  color: var(--muted);
}

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .page {
    padding: 20px 16px 48px;
  }

  h1 {
    font-size: 22px;
  }
}
</style>
