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

        <section class="today" :aria-labelledby="`today-${cinema._id}`">
          <h3 :id="`today-${cinema._id}`">Aujourd'hui</h3>
          <template v-if="todayAt(cinema).length">
            <ul class="films">
              <li v-for="row in visibleRows(cinema)" :key="row.movie._id">
                <img v-if="row.movie.poster" :src="row.movie.poster" alt="" loading="lazy" />
                <span v-else class="thumb" aria-hidden="true"></span>
                <div>
                  <RouterLink :to="`/movies/${row.movie._id}`">{{ row.movie.title }}</RouterLink>
                  <span class="times num">{{ row.times.join(' · ') }}</span>
                </div>
              </li>
            </ul>
            <button
              v-if="todayAt(cinema).length > LIMIT"
              type="button"
              class="text-action more"
              :aria-expanded="expanded.has(cinema._id)"
              @click="toggle(cinema._id)"
            >
              {{ expanded.has(cinema._id) ? 'Afficher moins' : moreLabel(todayAt(cinema).length - LIMIT) }}
            </button>
          </template>
          <p v-else class="muted">
            Plus de séance aujourd'hui.
            <template v-if="nextAt(cinema)">
              Prochaine : <span class="nowrap">{{ nextAt(cinema).when }}</span>, {{ nextAt(cinema).title }}.
            </template>
          </p>
        </section>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCinemas, getMovies, getUpcomingShowtimes } from '@/services/api'
import { dayKey, dayLabel, time } from '@/utils/time'

const LIMIT = 6 // films affichés par cinéma avant « Afficher les N autres »

const cinemas = ref([])
const movies = ref([])
const showtimes = ref([])
const status = ref('loading')
const expanded = ref(new Set())

const load = async () => {
  status.value = 'loading'
  try {
    ;[cinemas.value, movies.value, showtimes.value] = await Promise.all([
      getCinemas(),
      getMovies({ showing: true }),
      getUpcomingShowtimes(),
    ])
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

const idOf = (ref) => ref?._id ?? ref // id seul, ou objet peuplé

// Séances encore à venir, par cinéma (la liste arrive triée par date)
const upcomingByCinema = computed(() => {
  const now = new Date()
  const movieById = new Map(movies.value.map((m) => [m._id, m]))
  const byCinema = new Map()
  for (const s of showtimes.value) {
    const movie = movieById.get(idOf(s.movie))
    if (!movie || new Date(s.datetime) < now) continue
    const id = idOf(s.cinema)
    if (!byCinema.has(id)) byCinema.set(id, [])
    byCinema.get(id).push({ ...s, movie })
  }
  return byCinema
})

// [{ movie, times: ['18 h 30', '18 h 30 3D'] }] pour aujourd'hui, le film qui commence le plus tôt en premier
const todayAt = (cinema) => {
  const today = dayKey(new Date())
  const rows = new Map()
  for (const s of upcomingByCinema.value.get(cinema._id) ?? []) {
    if (dayKey(new Date(s.datetime)) !== today) continue
    if (!rows.has(s.movie._id)) rows.set(s.movie._id, { movie: s.movie, times: [] })
    rows.get(s.movie._id).times.push(s.format && s.format !== 'Standard' ? `${time(s.datetime)} ${s.format}` : time(s.datetime))
  }
  return [...rows.values()]
}

const visibleRows = (cinema) =>
  expanded.value.has(cinema._id) ? todayAt(cinema) : todayAt(cinema).slice(0, LIMIT)

const moreLabel = (n) => (n === 1 ? 'Afficher 1 autre film' : `Afficher les ${n} autres films`)

const toggle = (id) => {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

// Plus rien aujourd'hui : { when: 'Demain 13 h 05', title }
const nextAt = (cinema) => {
  const s = upcomingByCinema.value.get(cinema._id)?.[0]
  return s ? { when: `${dayLabel(dayKey(new Date(s.datetime)))} ${time(s.datetime)}`, title: s.movie.title } : null
}

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

.today {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

h3 {
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--muted);
  margin: 0 0 10px;
}

.films {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.films li {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  align-items: center;
}

.films img,
.films .thumb {
  width: 32px;
  height: 48px;
  object-fit: cover;
  border-radius: 3px;
  background: var(--raised);
  display: block;
}

.films a {
  display: block;
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
}

.films a:hover {
  text-decoration: underline;
}

.films .times {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 13px;
}

.more {
  margin-top: 12px;
}

.nowrap {
  white-space: nowrap;
}

.skeleton {
  min-height: 190px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-top: 4px;
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
