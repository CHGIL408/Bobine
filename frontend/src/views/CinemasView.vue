<template>
  <main class="page">
    <div class="title-row">
      <h1>Cinémas</h1>
      <p v-if="status === 'ready'" class="muted">{{ summary }}</p>
    </div>

    <div v-if="status === 'ready' && cinemas.length > 1" class="locate">
      <button type="button" class="secondary" :disabled="locating" @click="locate">
        {{ locating ? 'Localisation…' : position ? 'Mettre à jour ma position' : 'Trier par distance' }}
      </button>
      <span class="muted" role="status">{{ locateMessage }}</span>
    </div>

    <p v-if="status === 'error'" class="panel message" role="alert">
      Impossible de charger les cinémas.
      <button type="button" class="text-action" @click="load">Réessayer</button>
    </p>
    <p v-else-if="status === 'ready' && !cinemas.length" class="panel message">
      Aucun cinéma pour le moment.
    </p>

    <ul v-else-if="status === 'loading'" class="cinemas" aria-busy="true" aria-label="Chargement des cinémas">
      <li v-for="n in 3" :key="n" class="cinema">
        <span class="bar w-40"></span>
        <span class="bar w-25"></span>
        <span class="posters-ph"><span v-for="m in 6" :key="m"></span></span>
      </li>
    </ul>

    <!-- un cinéma par rangée ; au tri par distance, chaque rangée glisse vers sa nouvelle place -->
    <TransitionGroup v-else name="cinema" tag="ul" class="cinemas">
      <li v-for="cinema in sortedCinemas" :key="cinema._id" class="cinema">
        <div class="head">
          <div class="identity">
            <h2>{{ cinema.name }}</h2>
            <p class="muted">
              <span v-if="distanceOf(cinema) != null" class="distance num">À {{ formatDistance(distanceOf(cinema)) }}</span>
              {{ cinema.address }}, {{ cinema.city }}
              <template v-if="cinema.phone">
                · <a :href="`tel:${cinema.phone}`" class="num">{{ cinema.phone }}</a>
              </template>
            </p>
          </div>
          <div class="actions">
            <a :href="mapUrl(cinema)" target="_blank" rel="noopener" class="primary">Itinéraire</a>
            <a v-if="websiteOf(cinema)" :href="websiteOf(cinema)" target="_blank" rel="noopener" class="text-action">
              Site web
            </a>
          </div>
        </div>

        <section class="today" :aria-labelledby="`today-${cinema._id}`">
          <h3 :id="`today-${cinema._id}`" class="visually-hidden">Aujourd'hui au {{ cinema.name }}</h3>
          <ul v-if="todayAt(cinema).length" class="films">
            <li v-for="movie in todayAt(cinema)" :key="movie._id">
              <!-- title : le titre complet au survol, même coupé à 2 lignes ; les heures sont sur la page du film -->
              <RouterLink :to="`/movies/${movie._id}`" :title="movie.title">
                <img v-if="imageOk(movie.poster)" :src="movie.poster" alt="" loading="lazy" @error="imageFailed(movie.poster)" />
                <span v-else class="thumb" aria-hidden="true"></span>
                <span class="title">{{ movie.title }}</span>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="muted">
            Plus de séance aujourd'hui.
            <template v-if="nextAt(cinema)">
              Prochaine : <span class="nowrap">{{ nextAt(cinema).when }}</span>, {{ nextAt(cinema).title }}.
            </template>
          </p>
        </section>
      </li>
    </TransitionGroup>
  </main>
</template>

<script setup>
import { imageFailed, imageOk } from '@/utils/images'
import { computed, onMounted, ref } from 'vue'
import { getCinemas, getMovies, getUpcomingShowtimes } from '@/services/api'
import { idOf, websiteOf } from '@/utils/cinemas'
import { dayKey, dayLabel, time } from '@/utils/time'
import { cinemaPoint, distanceKm, formatDistance } from '@/utils/geo'

const cinemas = ref([])
const movies = ref([])
const showtimes = ref([])
const status = ref('loading')

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

// Films qui ont encore une séance aujourd'hui, celui qui commence le plus tôt en premier
const todayAt = (cinema) => {
  const today = dayKey(new Date())
  const movies = new Map()
  for (const s of upcomingByCinema.value.get(cinema._id) ?? []) {
    if (dayKey(new Date(s.datetime)) === today) movies.set(s.movie._id, movies.get(s.movie._id) ?? s.movie)
  }
  return [...movies.values()]
}

// Plus rien aujourd'hui : { when: 'Demain 13 h 05', title }
const nextAt = (cinema) => {
  const s = upcomingByCinema.value.get(cinema._id)?.[0]
  return s ? { when: `${dayLabel(dayKey(new Date(s.datetime)))} ${time(s.datetime)}`, title: s.movie.title } : null
}

// Position du visiteur, demandée seulement au clic (jamais envoyée au serveur)
const position = ref(null)
const locating = ref(false)
const locateMessage = ref('')

const locate = () => {
  if (!navigator.geolocation) {
    locateMessage.value = 'Votre navigateur ne permet pas de vous localiser.'
    return
  }
  locating.value = true
  locateMessage.value = ''
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      position.value = { lat: coords.latitude, lng: coords.longitude }
      locating.value = false
      // sans GPS (ordinateur), le navigateur peut se fier à l'adresse IP : position à plusieurs km près
      locateMessage.value =
        coords.accuracy > 2000
          ? `Position approximative (à ${formatDistance(coords.accuracy / 1000)} près) : l’ordre peut être faux.`
          : 'Du plus proche au plus loin, à vol d’oiseau.'
    },
    (err) => {
      locating.value = false
      locateMessage.value =
        err.code === 1
          ? 'Localisation refusée. Autorisez-la dans votre navigateur pour trier par distance.'
          : 'Impossible de vous localiser pour le moment.'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  )
}

const distanceOf = (cinema) => {
  const point = cinemaPoint(cinema)
  return position.value && point ? distanceKm(position.value, point) : null
}

// Sans position : l'ordre de l'API ; avec : du plus proche au plus loin, cinémas sans coordonnées à la fin
const sortedCinemas = computed(() =>
  position.value
    ? cinemas.value.toSorted((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity))
    : cinemas.value,
)

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

/* tri par distance : les rangées glissent vers leur nouvelle place */
.cinema-move {
  transition: transform 300ms var(--ease-in-out);
}

@media (prefers-reduced-motion: reduce) {
  .cinema-move {
    transition: none;
  }
}

.locate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: -4px 0 8px;
}

.secondary {
  height: var(--control-height);
  padding: 0 16px;
  background: none;
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: transform 160ms var(--ease-out), border-color 150ms ease;
}

.secondary:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .secondary:hover {
    border-color: var(--text);
  }
}

.secondary:disabled {
  color: var(--muted);
  cursor: progress;
}

/* un cinéma par rangée, séparées par un trait : pas de cartes, moins chargé */
.cinemas {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cinema {
  padding: 24px 0 28px;
  border-top: 1px solid var(--border);
}

.cinema:first-child {
  border-top: 0;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-bottom: 16px;
}

.identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.distance {
  margin-right: 6px;
  color: var(--accent);
  font-weight: 600;
}

/* les films du jour : une rangée d'affiches qui défile, l'heure sous chacune */
.films {
  display: flex;
  gap: var(--gap);
  /* 4 px autour : le contour de focus d'une affiche n'est pas rogné par le défilement */
  margin: 0 -4px;
  padding: 4px 4px 8px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}

/* à la souris, pas de défilement horizontal à la molette : toutes les affiches, sur plusieurs lignes */
@media (hover: hover) and (pointer: fine) {
  .films {
    flex-wrap: wrap;
    overflow: visible;
  }
}

.films li {
  flex: none;
  width: 120px;
  scroll-snap-align: start;
}

.films a {
  display: block;
  color: var(--text);
  text-decoration: none;
}

.films img,
.films .thumb {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-thumb);
  background: var(--surface);
}

.films .title {
  display: -webkit-box;
  margin-top: 8px;
  font-weight: 500;
  line-height: 1.3;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (hover: hover) and (pointer: fine) {
  .films a:hover .title {
    text-decoration: underline;
  }
}

.nowrap {
  white-space: nowrap;
}

/* chargement : la forme des rangées, sans contenu */
.bar {
  display: block;
  height: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: var(--surface);
}

.bar.w-40 {
  width: 40%;
  height: 16px;
}

.bar.w-25 {
  width: 25%;
}

.posters-ph {
  display: flex;
  gap: var(--gap);
  margin-top: 16px;
  overflow: hidden;
}

.posters-ph span {
  flex: none;
  width: 120px;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius-thumb);
  background: var(--surface);
}

.actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 18px;
}

.primary {
  display: inline-flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 18px;
  border-radius: 999px;
  background: var(--text);
  color: var(--on-light);
  font-weight: 500;
  text-decoration: none;
  transition: transform 160ms var(--ease-out), background 150ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .primary:hover {
    background: var(--primary-hover);
  }
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

@media (hover: hover) and (pointer: fine) {
  .text-action:hover {
    text-decoration: underline;
  }
}

.panel {
  padding: 28px var(--pad);
  border-radius: var(--radius-card);
  background: var(--surface);
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
