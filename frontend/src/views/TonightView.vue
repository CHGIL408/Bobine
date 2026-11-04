<template>
  <main class="page">
    <div class="title-row">
      <h1>Ce soir</h1>
      <p v-if="status === 'ready' && tonight.length" class="subline">{{ summary }}</p>
      <p v-else-if="status === 'loading'" class="subline" role="status">
        {{ slow ? SLOW_MESSAGE : 'Chargement des séances…' }}
      </p>
    </div>

    <div v-if="status === 'ready' && cinemas.length > 1" class="filters">
      <select v-model="selectedCinema" aria-label="Cinéma">
        <option value="">Tous les cinémas</option>
        <option v-for="c in cinemas" :key="c._id" :value="c._id">{{ shortName(c.name) }}</option>
      </select>
    </div>

    <p v-if="status === 'error'" class="panel message" role="alert">
      Impossible de charger les séances.
      <button type="button" class="text-action" @click="load">Réessayer</button>
    </p>

    <ul v-else-if="status === 'loading'" class="skeleton" aria-hidden="true">
      <li v-for="n in 6" :key="n">
        <span class="bar start-ph"></span>
        <span class="poster-ph"></span>
        <span class="lines"><span class="bar w-40"></span><span class="bar w-60"></span></span>
      </li>
    </ul>

    <template v-else>
      <p v-if="!tonight.length" class="panel message">
        Plus de séances ce soir<template v-if="selectedCinema"> dans ce cinéma</template>.
        <template v-if="tomorrow.length">Voici les premières de demain.</template>
      </p>

      <section
        v-for="block in blocks"
        :key="block.key"
        class="block"
        :aria-labelledby="`block-${block.key}`"
      >
        <h2 v-if="block.title" :id="`block-${block.key}`" class="block-title">{{ block.title }}</h2>
        <h2 v-else :id="`block-${block.key}`" class="visually-hidden">Séances de ce soir</h2>

        <div v-for="group in block.groups" :key="group.hour" class="hour">
          <h3 class="hour-label num">{{ group.hour }} h</h3>
          <ul class="rows">
            <li v-for="row in group.rows" :key="row.showtime._id" class="row">
              <span class="start num">{{ time(row.showtime.datetime) }}</span>
              <img v-if="imageOk(row.movie.poster)" :src="row.movie.poster" alt="" loading="lazy" class="poster" @error="imageFailed(row.movie.poster)" />
              <span v-else class="poster" aria-hidden="true"></span>
              <span class="identity">
                <RouterLink :to="`/movies/${row.movie._id}`">{{ row.movie.title }}</RouterLink>
                <!-- chaque morceau reste entier : la ligne se coupe entre le cinéma et le format -->
                <span class="sub num">
                  <span class="piece">{{ row.cinema }}</span> ·
                  <span class="piece format">{{ formatLabel(row.showtime.format) }}</span>
                </span>
                <span v-if="row.started" class="started">{{ row.started }}</span>
              </span>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { imageFailed, imageOk } from '@/utils/images'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { idOf, shortCinemaName as shortName } from '@/utils/cinemas'
import { SLOW_MESSAGE, useSlowLoading } from '@/utils/slowLoading'
import { getCinemas, getMovies, getUpcomingShowtimes } from '@/services/api'
import { dayKey, formatLabel, minutesOfDay, nextDayKey, time, TRAILERS_MINUTES } from '@/utils/time'

const status = ref('loading')
const showtimes = ref([])
const movies = ref([])
const cinemas = ref([])
const selectedCinema = ref('')
const now = ref(new Date())
// Le soir affiché : la date au chargement. Passé minuit, ce soir est fini, même si la page reste ouverte.
const evening = ref(dayKey(new Date()))

const { slow, start: startSlow, stop: stopSlow } = useSlowLoading()
const load = async () => {
  status.value = 'loading'
  startSlow()
  try {
    ;[showtimes.value, movies.value, cinemas.value] = await Promise.all([
      getUpcomingShowtimes({ since: TRAILERS_MINUTES }),
      getMovies({ showing: true }),
      getCinemas(),
    ])
    now.value = new Date()
    evening.value = dayKey(now.value)
    status.value = 'ready'
  } catch {
    status.value = 'error'
  } finally {
    stopSlow()
  }
}

// "a commencé" et la fin de soirée suivent l'heure qui passe, sans recharger
let clock
onMounted(() => {
  load()
  clock = setInterval(() => (now.value = new Date()), 60e3)
})
onUnmounted(() => clearInterval(clock))

const movieById = computed(() => new Map(movies.value.map((m) => [m._id, m])))
const cinemaById = computed(() => new Map(cinemas.value.map((c) => [c._id, c])))

// Séance -> ligne affichable ; null si le film n'est plus connu
const toRow = (s) => {
  const movie = movieById.value.get(idOf(s.movie))
  if (!movie) return null
  return {
    showtime: s,
    movie,
    cinema: shortName(cinemaById.value.get(idOf(s.cinema))?.name ?? ''),
    started: startedLabel(s.datetime),
  }
}

const inCinema = (s) => !selectedCinema.value || idOf(s.cinema) === selectedCinema.value

// "A commencé il y a 12 min" : vrai que la séance ait des bandes-annonces ou non (événement en direct)
const startedLabel = (iso) => {
  const minutes = Math.floor((now.value.getTime() - new Date(iso).getTime()) / 60e3)
  if (minutes < 0) return ''
  return minutes < 1 ? 'Vient de commencer' : `A commencé il y a ${minutes} min`
}

// Ce soir : d'il y a 15 min (bandes-annonces) jusqu'à minuit, heure de Québec
const tonight = computed(() => {
  const today = evening.value
  if (dayKey(now.value) !== today) return [] // minuit est passé
  const from = now.value.getTime() - TRAILERS_MINUTES * 60e3
  return showtimes.value
    .filter((s) => inCinema(s) && new Date(s.datetime).getTime() >= from && dayKey(new Date(s.datetime)) === today)
    .map(toRow)
    .filter(Boolean)
})

// Plus rien ce soir : les 8 premières séances de demain
const tomorrow = computed(() => {
  if (tonight.value.length) return []
  const next = nextDayKey(evening.value)
  return showtimes.value
    .filter((s) => inCinema(s) && dayKey(new Date(s.datetime)) === next)
    .slice(0, 8)
    .map(toRow)
    .filter(Boolean)
})

// Lignes -> [{ hour: 19, rows }] (déjà triées par heure par l'API)
const byHour = (rows) => {
  const groups = []
  for (const row of rows) {
    const hour = Math.floor(minutesOfDay(row.showtime.datetime) / 60)
    if (groups.at(-1)?.hour !== hour) groups.push({ hour, rows: [] })
    groups.at(-1).rows.push(row)
  }
  return groups
}

const blocks = computed(() =>
  tonight.value.length
    ? [{ key: 'tonight', title: '', groups: byHour(tonight.value) }]
    : tomorrow.value.length
      ? [{ key: 'tomorrow', title: 'Demain', groups: byHour(tomorrow.value) }]
      : [],
)

const summary = computed(() => {
  const n = tonight.value.length // affiché seulement s'il reste des séances ce soir
  return `${n} séance${n > 1 ? 's' : ''} d’ici minuit`
})
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

h1 {
  margin: 0;
  font-size: var(--fs-title);
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 0;
}

.title-row {
  margin-bottom: 20px;
}

.subline {
  margin-top: 4px;
  color: var(--muted);
}

.filters {
  margin-bottom: 8px;
}

.filters select {
  max-width: 100%; /* un nom de cinéma long ne doit pas élargir le menu au-delà de l'écran */
  height: var(--control-height);
  padding: 0 34px 0 14px;
  background-color: var(--surface);
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--text);
}

.filters select:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

/* une colonne de lecture : l'heure d'abord, puis le film et le cinéma */
.block,
.skeleton,
.message {
  max-width: 760px;
}

.block-title {
  margin: 28px 0 0;
  font-size: var(--fs-section);
  font-weight: 600;
}

.hour {
  margin-top: 24px;
}

.hour-label {
  margin: 0 0 4px;
  color: var(--faint);
  font-size: var(--fs-small);
  font-weight: 500;
}

.rows,
.skeleton {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row,
.skeleton li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
}

.row:hover {
  background: var(--surface);
}

.start {
  flex: none;
  width: 72px;
  font-size: 18px;
  font-weight: 600;
}

.poster {
  flex: none;
  width: 36px;
  height: 54px;
  object-fit: cover;
  border-radius: var(--radius-thumb);
  background: var(--surface);
}

.identity {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.identity a {
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
}

/* toute la ligne ouvre le film */
.identity a::after {
  content: '';
  position: absolute;
  inset: 0;
}

.identity a:focus-visible {
  outline: none;
}

.row:has(a:focus-visible) {
  outline: 2px solid var(--text);
  outline-offset: -2px;
}

.sub {
  color: var(--muted);
  font-size: 13px;
}

.piece {
  white-space: nowrap;
}

/* un nom de cinéma plus large que la ligne peut quand même se couper */
.piece:first-child {
  white-space: normal;
}

.format {
  color: var(--accent);
  font-size: var(--fs-small);
  font-weight: 600;
}

.started {
  color: var(--text);
  font-size: var(--fs-small);
  font-weight: 500;
}

.panel {
  padding: 28px var(--pad);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--muted);
}

.text-action {
  padding: 0;
  background: none;
  border: 0;
  color: var(--text);
  font-weight: 500;
}

.text-action:hover {
  text-decoration: underline;
}

button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

/* chargement */
.bar {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: var(--surface);
}

.start-ph {
  flex: none;
  width: 56px;
  height: 18px;
}

.poster-ph {
  flex: none;
  width: 36px;
  height: 54px;
  border-radius: var(--radius-thumb);
  background: var(--surface);
}

.skeleton .lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.w-40 {
  width: 40%;
}

.w-60 {
  width: 60%;
}

@media (max-width: 640px) {
  .page {
    padding: 20px 16px 48px;
  }

  h1 {
    font-size: 22px;
  }

  .row,
  .skeleton li {
    gap: 12px;
    padding: 12px 4px;
  }

  .start {
    width: 60px;
    font-size: 16px;
  }
}
</style>
