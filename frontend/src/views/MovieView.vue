<template>
  <main class="page">
    <a href="/" class="back" @click.prevent="backToList">← Films</a>

    <p v-if="status === 'error'" class="panel message" role="alert">
      Impossible de charger ce film.
      <button type="button" class="text-action" @click="load">Réessayer</button>
    </p>

    <template v-else>
      <section class="film" aria-labelledby="film-title">
        <img v-if="imageOk(movie.poster)" class="poster" :src="movie.poster" alt="" @error="imageFailed(movie.poster)" />
        <div v-else class="poster" aria-hidden="true"></div>
        <div class="info">
          <h1 id="film-title">{{ movie.title ?? 'Chargement…' }}</h1>
          <p v-if="movie.title" class="meta num">
            {{ year }} · {{ duration }} · {{ movie.genre?.join(', ') || '—' }}
          </p>
          <p v-if="movie.title" class="rating num">{{ rating }}<span v-if="movie.rating" class="unit"> /10</span></p>
          <p class="synopsis">{{ movie.synopsis }}</p>
          <dl v-if="movie.director || movie.cast?.length" class="credits">
            <template v-if="movie.director">
              <dt>Réalisation</dt>
              <dd>{{ movie.director }}</dd>
            </template>
            <template v-if="movie.cast?.length">
              <dt>Avec</dt>
              <dd>{{ movie.cast.join(', ') }}</dd>
            </template>
          </dl>
          <div v-if="movie._id" class="buttons">
            <button
              v-if="movie.trailerKey"
              type="button"
              class="primary"
              :aria-expanded="showTrailer"
              aria-controls="trailer"
              @click="showTrailer = !showTrailer"
            >
              {{ showTrailer ? 'Masquer la bande-annonce' : 'Voir la bande-annonce' }}
            </button>
            <button
              type="button"
              class="secondary fav"
              :aria-pressed="favorites.has(movie._id)"
              @click="favorites.toggle(movie._id)"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 13.5 2.6 8.3A3.2 3.2 0 0 1 8 4.2a3.2 3.2 0 0 1 5.4 4.1Z"
                  :fill="favorites.has(movie._id) ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
              {{ favorites.has(movie._id) ? 'Dans mes favoris' : 'Ajouter aux favoris' }}
            </button>
            <button type="button" class="secondary share" @click="share">Partager</button>
            <span class="share-status" role="status">{{ shareStatus }}</span>
          </div>
        </div>
      </section>

      <section v-if="showTrailer" id="trailer" class="trailer" aria-label="Bande-annonce">
        <!-- youtube-nocookie : aucun cookie de suivi avant la lecture ; chargé seulement au clic -->
        <iframe
          :src="`https://www.youtube-nocookie.com/embed/${movie.trailerKey}?autoplay=1&rel=0`"
          :title="`Bande-annonce de ${movie.title}`"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </section>

      <section class="showtimes" aria-labelledby="showtimes-title">
        <div class="section-head">
          <h2 id="showtimes-title">Séances</h2>
          <p v-if="status === 'ready'" class="muted num">
            {{ summary }}<template v-if="summary"> · touchez une heure pour l'ajouter à votre agenda</template>
          </p>
          <p v-else-if="status === 'loading'" class="muted" role="status">
            {{ slow ? SLOW_MESSAGE : 'Chargement des séances…' }}
          </p>
        </div>

        <template v-if="days.length">
          <div class="tabs" role="group" aria-label="Jours">
            <button
              v-for="day in days"
              :key="day.key"
              type="button"
              :aria-pressed="day.key === selectedDay"
              @click="selectedDay = day.key"
            >
              {{ day.label }}
            </button>
          </div>

          <ul class="cinemas">
            <li v-for="group in currentDay.cinemas" :key="group.cinema._id">
              <div class="cinema">
                <span class="name">{{ group.cinema.name }}</span>
                <span class="muted">{{ group.cinema.address }}, {{ group.cinema.city }}</span>
                <a
                  v-if="websiteOf(group.cinema)"
                  :href="websiteOf(group.cinema)"
                  target="_blank"
                  rel="noopener"
                  class="book"
                  :aria-label="`Réserver au ${group.cinema.name} (site du cinéma, nouvel onglet)`"
                >
                  Réserver ↗
                </a>
              </div>
              <ul class="times num" :aria-label="`Heures au ${group.cinema.name}`">
                <li v-for="s in group.showtimes" :key="s._id">
                  <a
                    :href="icsHref(showtimeIcs({ showtime: s, movie }))"
                    :download="fileName(s)"
                    :aria-label="`Ajouter la séance de ${time(s.datetime)} en ${formatLabel(s.format) === 'STD' ? 'format standard' : s.format} au ${group.cinema.name} à mon agenda`"
                  >
                    {{ time(s.datetime) }}<span v-if="formatLabel(s.format) !== 'STD'" class="format">{{ formatLabel(s.format) }}</span>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </template>
        <p v-else-if="status === 'ready'" class="panel message">
          Aucune séance prévue pour ce film dans nos cinémas.
        </p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { imageFailed, imageOk } from '@/utils/images'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMovie, getShowtimes } from '@/services/api'
import { useFavoritesStore } from '@/stores/favorites'
import { showtimeIcs, icsHref } from '@/utils/ics'
import { websiteOf } from '@/utils/cinemas'
import { dayKey, dayLabel, formatLabel, time } from '@/utils/time'
import { SLOW_MESSAGE, useSlowLoading } from '@/utils/slowLoading'


const route = useRoute()
const router = useRouter()

// Venu de l'accueil : on y revient par l'historique, pour retrouver la position dans la liste.
// Arrivé directement (lien partagé) : le lien mène simplement à l'accueil.
const backToList = () => {
  if (window.history.state?.back === '/') router.back()
  else router.push('/')
}
const favorites = useFavoritesStore()
const movie = ref({})
const showtimes = ref([])
const status = ref('loading')
const selectedDay = ref('')
const showTrailer = ref(false)
const shareStatus = ref('')
// confirmation passagère : elle s'efface après 2,5 s
let shareTimer
const announce = (message) => {
  shareStatus.value = message
  clearTimeout(shareTimer)
  shareTimer = setTimeout(() => (shareStatus.value = ''), 2500)
}
onUnmounted(() => clearTimeout(shareTimer))

// Menu de partage du téléphone si le navigateur en a un, sinon copie du lien
const share = async () => {
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ title: movie.value.title, text: `${movie.value.title} au cinéma`, url })
    } catch {
      // partage annulé par l'utilisateur : rien à signaler
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    announce('Lien copié')
  } catch {
    clearTimeout(shareTimer) // le lien à copier reste affiché : un ancien « Lien copié » ne doit pas l'effacer
    shareStatus.value = `Copiez ce lien : ${url}`
  }
}

const { slow, start: startSlow, stop: stopSlow } = useSlowLoading()
const load = async () => {
  status.value = 'loading'
  startSlow()
  try {
    ;[movie.value, showtimes.value] = await Promise.all([
      getMovie(route.params.id),
      getShowtimes(route.params.id),
    ])
    status.value = 'ready'
    document.title = `${movie.value.title} · Bobine`
    selectedDay.value = days.value[0]?.key ?? ''
  } catch {
    status.value = 'error'
  } finally {
    stopSlow()
  }
}
onMounted(load)

// "Resident Evil" + 2026-11-01 16 h 30 -> resident-evil-2026-11-01-16-h-30.ics
const fileName = (s) =>
  `${movie.value.title}-${dayKey(new Date(s.datetime))}-${time(s.datetime)}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.ics'

// Séances à venir, par jour puis par cinéma, dans l'ordre chronologique
const days = computed(() => {
  const now = new Date()
  const upcoming = showtimes.value
    .filter((s) => s.cinema && new Date(s.datetime) >= now)
    .toSorted((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const byDay = new Map()
  for (const s of upcoming) {
    const key = dayKey(new Date(s.datetime))
    if (!byDay.has(key)) byDay.set(key, new Map())
    const cinemas = byDay.get(key)
    if (!cinemas.has(s.cinema._id)) cinemas.set(s.cinema._id, { cinema: s.cinema, showtimes: [] })
    cinemas.get(s.cinema._id).showtimes.push(s)
  }
  return [...byDay].map(([key, cinemas]) => ({
    key,
    label: dayLabel(key, now),
    cinemas: [...cinemas.values()].toSorted((a, b) => a.cinema.name.localeCompare(b.cinema.name)),
  }))
})

const currentDay = computed(() => days.value.find((d) => d.key === selectedDay.value) ?? days.value[0])

const summary = computed(() => {
  const n = days.value.reduce((t, d) => t + d.cinemas.reduce((u, c) => u + c.showtimes.length, 0), 0)
  const cinemas = new Set(days.value.flatMap((d) => d.cinemas.map((c) => c.cinema._id))).size
  if (!n) return ''
  return `${n} séance${n > 1 ? 's' : ''} à venir dans ${cinemas} cinéma${cinemas > 1 ? 's' : ''}`
})

const year = computed(() => movie.value.releaseDate?.slice(0, 4) ?? '—')
const duration = computed(() => {
  const d = movie.value.duration
  return d ? `${Math.floor(d / 60)} h ${String(d % 60).padStart(2, '0')}` : '—'
})
const rating = computed(() =>
  !movie.value.rating // TMDB met 0 quand personne n'a encore voté
    ? '—'
    : movie.value.rating.toLocaleString('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
)
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 24px 64px;
}

h1 {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.015em;
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

.muted,
.meta {
  color: var(--muted);
}

.back {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--muted);
  font-weight: 500;
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .back:hover {
    color: var(--text);
  }
}

.film {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  padding: var(--pad);
  background: var(--surface);
  border-radius: var(--radius-card);
}

.poster {
  width: 220px;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 8px;
  background: var(--raised);
  display: block;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
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
  max-width: 68ch;
  color: var(--muted);
  line-height: 1.6;
  font-size: 15px;
}

.showtimes {
  margin-top: 40px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

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
  color: var(--idle);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: color 150ms ease;
}

.tabs button[aria-pressed='true'] {
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .tabs button:hover {
    color: var(--text);
  }
}

.tabs button[aria-pressed='true'] {
  border-bottom-color: var(--text);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cinemas > li {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 2fr;
  gap: 24px;
  align-items: start;
  padding: 18px 0;
  border-top: 1px solid var(--border);
}

.cinemas > li:first-child {
  border-top: 0;
}

.cinema {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-weight: 500;
}

.cinema .muted {
  font-size: 13px;
}

.times {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.times a {
  display: inline-flex;
  gap: 6px;
  height: var(--control-height);
  padding: 0 14px;
  align-items: center;
  background: var(--surface);
  border-radius: 999px;
  color: var(--text);
  font-weight: 500;
  text-decoration: none;
  transition: background 150ms ease, transform 160ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .times a:hover {
    background: var(--raised);
  }
}

.times a:active {
  transform: scale(0.97);
}

.credits {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 0;
  max-width: 68ch;
}

.credits dt {
  color: var(--faint);
  font-weight: 400;
}

.credits dd {
  margin: 0;
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--control-height);
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--on-light);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: transform 160ms var(--ease-out), background 150ms ease;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--control-height);
  padding: 0 16px;
  background: none;
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 150ms ease, transform 160ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .secondary:hover {
    border-color: var(--text);
  }
}

.secondary:active {
  transform: scale(0.97);
}

.secondary svg {
  width: 16px;
  height: 16px;
}

.book {
  align-self: flex-start;
  padding: 4px 0; /* zone de toucher d'au moins 24 px */
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .book:hover {
    text-decoration: underline;
  }
}

.share-status {
  align-self: center;
  color: var(--muted);
  font-size: 13px;
  transition: opacity 150ms var(--ease-out);

  @starting-style {
    opacity: 0;
  }
}

.share-status:empty {
  display: none;
}

.fav[aria-pressed='true'] svg {
  color: var(--accent);
}

@media (hover: hover) and (pointer: fine) {
  .primary:hover {
    background: var(--primary-hover);
  }
}

.primary:active {
  transform: scale(0.97);
}

.trailer {
  margin-top: var(--gap);
  /* le lecteur apparaît en fondu au lieu de surgir et de pousser les séances d'un coup */
  transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);

  @starting-style {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .trailer {
    transition: opacity 200ms var(--ease-out); /* sans transform : il n'y a plus de glissement */
  }
}

.trailer iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: var(--radius-card);
  background: var(--surface);
}

.format {
  color: var(--accent);
  font-size: var(--fs-small);
  font-weight: 600;
}

.panel {
  background: var(--surface);
  border-radius: var(--radius-card);
}

.message {
  padding: 24px var(--pad);
  color: var(--muted);
}

.text-action {
  background: none;
  border: 0;
  padding: 0;
  margin-left: 6px;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .text-action:hover {
    text-decoration: underline;
  }
}

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .page {
    padding: 16px 16px 48px;
  }

  .film {
    grid-template-columns: 96px 1fr;
    gap: 16px;
    padding: 16px;
  }

  .poster {
    width: 96px;
    grid-row: span 3;
  }

  h1 {
    font-size: 22px;
  }

  .rating {
    font-size: 24px;
  }

  .synopsis,
  .credits,
  .buttons {
    grid-column: 1 / -1;
  }

  .buttons > * {
    flex: 1 1 auto;
  }

  .primary {
    grid-column: 1 / -1;
  }

  .info {
    display: contents;
  }

  .info > :not(.synopsis, .credits, .primary, .buttons) {
    grid-column: 2;
  }

  .section-head {
    flex-direction: column;
    gap: 4px;
  }

  .cinemas > li {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
