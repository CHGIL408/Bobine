<template>
  <main class="home">
    <!-- grid: canvas 1152 = list 758.67 + gap 14 + cinemas 379.33 (2fr 1fr) -->
    <div class="title-row">
      <h1>À l'affiche</h1>
      <p v-if="status === 'ready'" class="subline">
        {{ countLabel(movies.length) }} · le mieux noté : {{ bestRated?.title ?? '—' }},
        <span class="nowrap">{{ rating(bestRated?.rating) }}<template v-if="bestRated?.rating"> /10</template></span>
      </p>
    </div>

    <div v-if="status === 'ready'" class="filters" role="group" aria-label="Quand et où">
      <select v-model="selectedDay" aria-label="Jour">
        <option value="">Cette semaine</option>
        <option v-for="day in days" :key="day.key" :value="day.key">{{ day.label }}</option>
      </select>
      <select v-model.number="after" aria-label="Heure">
        <option :value="0">Toute heure</option>
        <option v-for="h in [17, 19, 21]" :key="h" :value="h * 60">Dès {{ h }} h</option>
      </select>
      <select v-model="selectedCinema" aria-label="Cinéma">
        <option value="">Tous les cinémas</option>
        <option v-for="c in cinemas" :key="c._id" :value="c._id">{{ shortName(c.name) }}</option>
      </select>
      <button v-if="whenWhereSet" type="button" class="text-action" @click="resetWhenWhere">
        Réinitialiser
      </button>
    </div>

    <p v-if="status === 'error'" class="error" role="alert">
      Impossible de charger les films.
      <button type="button" class="text-action" @click="load">Réessayer</button>
    </p>

    <section v-else class="feature" aria-label="Film en vedette">
      <template v-if="lead">
        <img class="backdrop" :src="hiRes(lead.backdrop) || lead.poster" alt="" />
        <div class="lead-info">
          <h2>{{ lead.title }}</h2>
          <p class="meta">{{ year(lead) }} · {{ duration(lead.duration) }} · {{ lead.genre.join(', ') }}</p>
          <p class="rating num">
            {{ rating(lead.rating) }}<span v-if="lead.rating" class="unit"> /10</span>
          </p>
          <p class="synopsis">{{ lead.synopsis }}</p>
          <p v-if="nextOf(lead)" class="next num">
            Prochaine séance :
            <strong class="nowrap">{{ nextOf(lead).when }}</strong> ·
            <strong class="nowrap">{{ nextOf(lead).where }}</strong>
          </p>
          <RouterLink :to="`/movies/${lead._id}`" class="primary">Voir les séances</RouterLink>
        </div>
      </template>
      <p v-else-if="status === 'ready' && selectedGenre === FAVORITES && !favorites.ids.length" class="empty">
        Aucun favori pour l'instant. Ouvrez un film et touchez « Ajouter aux favoris ».
      </p>
      <p v-else-if="status === 'ready'" class="empty">Aucun film ne correspond à ces critères.</p>
    </section>

    <div class="columns">
      <section class="catalogue" aria-labelledby="catalogue-title">
        <h2 id="catalogue-title" class="visually-hidden">Tous les films</h2>
        <div class="tabs" role="tablist" aria-label="Genres">
          <button
            v-for="genre in genres"
            :key="genre"
            type="button"
            role="tab"
            :aria-selected="selectedGenre === genre"
            @click="selectedGenre = genre"
          >
            {{ genre }}
          </button>
        </div>

        <div class="toolbar">
          <SearchBar @search="query = $event" />
          <span v-if="status === 'ready'" class="count num">{{ countLabel(filteredMovies.length) }}</span>
        </div>

        <table v-if="rest.length">
          <thead>
            <tr>
              <th colspan="2">Film</th>
              <th>Prochaines séances</th>
              <th class="num">Durée</th>
              <th class="num">Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movie in rest" :key="movie._id">
              <td class="thumb"><img :src="movie.poster" alt="" loading="lazy" /></td>
              <td class="identity">
                <RouterLink :to="`/movies/${movie._id}`">{{ movie.title }}</RouterLink>
                <span class="sub">{{ movie.genre.join(', ') }}</span>
                <span class="sub phone-only num">{{ duration(movie.duration) }} · {{ nextTimes(movie) }}</span>
              </td>
              <td class="times num">{{ nextTimes(movie) }}</td>
              <td class="num">{{ duration(movie.duration) }}</td>
              <td class="num score">{{ rating(movie.rating) }}<span v-if="movie.rating" class="unit"> /10</span></td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="status === 'ready' && lead" class="empty">Aucun autre film dans cette sélection.</p>
      </section>

      <aside class="cinemas" aria-labelledby="cinemas-title">
        <div class="panel-head">
          <h2 id="cinemas-title">Cinémas</h2>
          <RouterLink to="/cinemas" class="text-action">Tout voir</RouterLink>
        </div>
        <ul>
          <li v-for="cinema in cinemas.slice(0, 4)" :key="cinema._id">
            <span class="name">{{ cinema.name }}</span>
            <span class="sub">{{ cinema.address }}, {{ cinema.city }}</span>
          </li>
        </ul>
        <p v-if="status === 'ready' && !cinemas.length" class="sub">Aucun cinéma pour le moment.</p>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { getMovies, getCinemas, getUpcomingShowtimes } from '../services/api.js'
import { dayKey, dayLabel, minutesOfDay, timeWithFormat } from '@/utils/time'
import SearchBar from '@/components/SearchBar.vue'
import { useFavoritesStore } from '@/stores/favorites'

const favorites = useFavoritesStore()
const movies = ref([])
const cinemas = ref([])
const status = ref('loading')
const query = ref('')
const selectedGenre = ref('Tous')
const showtimes = ref([])
const selectedDay = ref('') // '' = toute la semaine, sinon "2026-11-01"
const after = ref(0) // minutes depuis minuit
const selectedCinema = ref('')

const load = async () => {
  status.value = 'loading'
  try {
    ;[movies.value, cinemas.value, showtimes.value] = await Promise.all([
      getMovies({ showing: true }),
      getCinemas(),
      getUpcomingShowtimes(),
    ])
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}
onMounted(load)

const FAVORITES = 'Favoris' // toujours visible, pour qu'on sache que la fonction existe
const genres = computed(() => ['Tous', FAVORITES, ...new Set(movies.value.flatMap((m) => m.genre))])

const idOf = (ref) => ref?._id ?? ref // id seul, ou objet peuplé
const whenWhereSet = computed(() => Boolean(selectedDay.value || after.value || selectedCinema.value))
const resetWhenWhere = () => {
  selectedDay.value = ''
  after.value = 0
  selectedCinema.value = ''
}

const days = computed(() =>
  [...new Set(showtimes.value.map((s) => dayKey(new Date(s.datetime))))]
    .sort()
    .map((key) => ({ key, label: dayLabel(key) })),
)

// Séances à venir qui respectent jour, heure et cinéma, groupées par film (déjà triées par date)
const matchingByMovie = computed(() => {
  const now = new Date()
  const byMovie = new Map()
  for (const s of showtimes.value) {
    if (new Date(s.datetime) < now) continue
    if (selectedDay.value && dayKey(new Date(s.datetime)) !== selectedDay.value) continue
    if (after.value && minutesOfDay(s.datetime) < after.value) continue
    if (selectedCinema.value && idOf(s.cinema) !== selectedCinema.value) continue
    const id = idOf(s.movie)
    if (!byMovie.has(id)) byMovie.set(id, [])
    byMovie.get(id).push(s)
  }
  return byMovie
})
const matching = (movie) => matchingByMovie.value.get(movie._id) ?? []

const filteredMovies = computed(() => {
  const q = query.value.trim().toLowerCase()
  return movies.value
    .filter(
      (m) =>
        m.title.toLowerCase().includes(q) &&
        (selectedGenre.value === 'Tous' ||
          (selectedGenre.value === FAVORITES ? favorites.has(m._id) : m.genre.includes(selectedGenre.value))) &&
        (!whenWhereSet.value || matching(m).length > 0),
    )
    .toSorted((a, b) => b.rating - a.rating)
})

const bestRated = computed(() => movies.value.toSorted((a, b) => b.rating - a.rating)[0])
const lead = computed(() => filteredMovies.value[0])
const rest = computed(() => filteredMovies.value.slice(1))

const shortName = (name) => name.replace(/^Cinéma Cineplex /, '')
const cinemaName = (id) => shortName(cinemas.value.find((c) => c._id === id)?.name ?? '')

// { when: "Aujourd'hui 19 h 30", where: "Odeon Beauport" }
const nextOf = (movie) => {
  const s = matching(movie)[0]
  if (!s) return null
  return { when: `${dayLabel(dayKey(new Date(s.datetime)))} ${timeWithFormat(s)}`, where: cinemaName(idOf(s.cinema)) }
}

// "Aujourd'hui 16 h 30, 19 h 30 IMAX, 21 h 35" : les 3 premières heures du premier jour qui correspond
const nextTimes = (movie) => {
  const list = matching(movie)
  if (!list.length) return '—'
  const key = dayKey(new Date(list[0].datetime))
  const sameDay = list.filter((s) => dayKey(new Date(s.datetime)) === key).slice(0, 3)
  return `${dayLabel(key)} ${sameDay.map(timeWithFormat).join(', ')}`
}

const countLabel = (n) => `${n} film${n > 1 ? 's' : ''}`
// TMDB met 0 quand personne n'a encore voté : pas une vraie note
const rating = (r) =>
  !r ? '—' : r.toLocaleString('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const duration = (d) => (d ? `${Math.floor(d / 60)} h ${String(d % 60).padStart(2, '0')}` : '—')
const year = (m) => m.releaseDate?.slice(0, 4) ?? '—'
// TMDB serves the same backdrop at higher sizes; w500 blurs at lead width
const hiRes = (url) => url?.replace('/w500/', '/w1280/')
</script>

<style scoped>
.home {
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

.subline,
.sub,
.meta,
.count,
th {
  color: var(--muted);
}

.title-row {
  margin-bottom: 20px;
}

/* quand et où : une rangée de menus au-dessus du film en vedette */
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--gap);
}

.filters select {
  height: var(--control-height);
  padding: 0 34px 0 14px;
  background-color: var(--surface);
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.filters select:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

.nowrap {
  white-space: nowrap;
}

.next {
  color: var(--muted);
}

.next strong {
  color: var(--text);
  font-weight: 500;
}

td.times.num {
  color: var(--muted);
  padding-left: 16px;
  text-align: left;
  white-space: nowrap;
}

.subline {
  margin-top: 4px;
}

/* feature: the best-rated film of the current selection */
.feature {
  display: grid;
  grid-template-columns: 7fr 5fr;
  background: var(--surface);
  border-radius: var(--radius-card);
  overflow: hidden;
  min-height: 360px;
}

.backdrop {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  display: block;
}

.lead-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 28px var(--pad);
}

.lead-info h2 {
  font-size: 24px;
  letter-spacing: -0.01em;
}

.rating {
  font-size: 30px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.1;
}

.unit {
  font-size: var(--fs-body);
  font-weight: 400;
  color: var(--faint);
}

.synopsis {
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.primary {
  align-self: flex-start;
  margin-top: auto;
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

.catalogue {
  min-width: 0;
}

.columns {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--gap);
  margin-top: 32px;
  align-items: start;
}

/* genre tabs: underline on a full-width rule */
.tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs button {
  flex: none;
  padding: 0 0 10px;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: #bbbbbb;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.tabs button:hover,
.tabs button[aria-selected='true'] {
  color: var(--text);
}

.tabs button[aria-selected='true'] {
  border-bottom-color: var(--text);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 22px 0 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-size: var(--fs-small);
  font-weight: 400;
  text-align: left;
  padding: 10px 0;
}

th.num,
td.num {
  text-align: right;
}

tbody tr {
  position: relative;
  border-top: 1px solid var(--border);
}

tbody tr:hover {
  background: var(--surface);
}

td {
  padding: 12px 0;
  vertical-align: middle;
}

td.num {
  width: 72px;
  white-space: nowrap;
  padding-left: 12px;
}

td.score {
  padding-right: 12px;
  color: var(--accent);
  font-weight: 600;
}

th:last-child {
  padding-right: 12px;
}

.thumb {
  width: 60px;
  padding-left: 12px;
}

.thumb img {
  width: 48px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-thumb);
  display: block;
}

.identity {
  padding-left: 12px;
}

.identity a {
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
}

/* the whole row opens the film */
.identity a::after {
  content: '';
  position: absolute;
  inset: 0;
}

.identity a:focus-visible {
  outline: none;
}

tr:has(a:focus-visible) {
  outline: 2px solid var(--text);
  outline-offset: -2px;
}

.sub {
  display: block;
  margin-top: 4px;
  font-size: 13px;
}

.phone-only {
  display: none;
}

.cinemas {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: var(--pad);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.cinemas ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cinemas li {
  padding: 12px 0;
  border-top: 1px solid #1f1f1f;
}

.cinemas li:first-child {
  border-top: 0;
}

.name {
  font-weight: 500;
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

.empty,
.error {
  padding: 28px var(--pad);
  color: var(--muted);
}

.error {
  background: var(--surface);
  border-radius: var(--radius-card);
}

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

/* tablet and phone */
@media (max-width: 900px) {
  .columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home {
    padding: 20px 16px 48px;
  }

  h1 {
    font-size: 22px;
  }

  .feature {
    grid-template-columns: 1fr;
  }

  .backdrop {
    min-height: 0;
    aspect-ratio: 16 / 9;
  }

  .lead-info {
    padding: 18px 16px 20px;
  }

  .synopsis {
    -webkit-line-clamp: 3;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar :deep(.search) {
    width: 100%;
  }

  .toolbar .count {
    font-size: var(--fs-small);
  }

  thead,
  td.num:not(.score) {
    display: none;
  }

  .filters select {
    flex: 1 1 calc(50% - 5px);
    min-width: 0;
  }

  .phone-only {
    display: block;
  }
}
</style>
