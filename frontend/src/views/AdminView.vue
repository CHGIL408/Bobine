<template>
  <main class="page">
    <div class="title-row">
      <h1>Administration</h1>
      <p class="muted">Ajouter ou supprimer des films. Les séances sont mises à jour chaque jour par la synchronisation.</p>
    </div>

    <form v-if="!apiKey" class="tile form" @submit.prevent="saveKey">
      <label for="key">Clé d'administration</label>
      <p id="key-help" class="muted">La valeur de <code>ADMIN_API_KEY</code>. Gardée seulement dans cet onglet.</p>
      <div class="row">
        <input id="key" v-model.trim="keyInput" type="password" autocomplete="off" aria-describedby="key-help" required />
        <button type="submit" class="primary">Continuer</button>
      </div>
    </form>

    <template v-else>
      <div class="columns">
        <form class="tile form" @submit.prevent="add">
          <h2>Ajouter un film</h2>
          <label for="tmdb">Identifiant TMDB</label>
          <p id="tmdb-help" class="muted">
            Le nombre dans l'adresse du film sur themoviedb.org, par exemple 27205 pour
            <span class="nowrap">themoviedb.org/movie/27205-inception</span>.
          </p>
          <div class="row">
            <input
              id="tmdb"
              v-model="tmdbInput"
              inputmode="numeric"
              autocomplete="off"
              aria-describedby="tmdb-help tmdb-status"
              required
            />
            <button type="submit" class="primary" :disabled="busy">{{ busy ? 'Ajout…' : 'Ajouter' }}</button>
          </div>
          <p id="tmdb-status" role="status" :class="['status', message.kind]">{{ message.text }}</p>
        </form>

        <div class="tile session">
          <h2>Session</h2>
          <p class="muted">La clé reste dans cet onglet jusqu'à sa fermeture.</p>
          <button type="button" class="text-action" @click="forgetKey">Oublier la clé</button>
        </div>
      </div>

      <section class="films" aria-labelledby="films-title">
        <div class="section-head">
          <h2 id="films-title">Films</h2>
          <p v-if="status === 'ready'" class="muted num">{{ movies.length }} en base</p>
        </div>
        <p v-if="status === 'error'" class="muted" role="alert">
          Impossible de charger les films.
          <button type="button" class="text-action" @click="load">Réessayer</button>
        </p>
        <ul v-else>
          <li v-for="movie in sortedMovies" :key="movie._id">
            <img v-if="imageOk(movie.poster)" :src="movie.poster" alt="" loading="lazy" @error="imageFailed(movie.poster)" />
            <span v-else class="thumb" aria-hidden="true"></span>
            <div>
              <RouterLink :to="`/movies/${movie._id}`">{{ movie.title }}</RouterLink>
              <span class="muted num">TMDB {{ movie.tmdbId ?? '—' }} · {{ movie.releaseDate?.slice(0, 4) ?? '—' }}</span>
            </div>
            <button
              type="button"
              class="danger"
              :aria-label="`Supprimer ${movie.title}`"
              :disabled="busy"
              @click="remove(movie)"
            >
              Supprimer
            </button>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<script setup>
import { imageFailed, imageOk } from '@/utils/images'
import { computed, onMounted, ref } from 'vue'
import { addMovie, deleteMovie, getMovies } from '@/services/api'

const STORAGE = 'bobine:admin-key'

const readKey = () => {
  try {
    return sessionStorage.getItem(STORAGE) ?? ''
  } catch {
    return ''
  }
}

const apiKey = ref(readKey())
const keyInput = ref('')
const movies = ref([])
const status = ref('loading')
const tmdbInput = ref('')
const busy = ref(false)
const message = ref({ kind: '', text: '' })

const load = async () => {
  status.value = 'loading'
  try {
    movies.value = await getMovies()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

const saveKey = () => {
  apiKey.value = keyInput.value
  keyInput.value = ''
  try {
    sessionStorage.setItem(STORAGE, apiKey.value)
  } catch {
    // stockage interdit : la clé reste en mémoire pour cette page
  }
  load()
}

const forgetKey = () => {
  apiKey.value = ''
  try {
    sessionStorage.removeItem(STORAGE)
  } catch {
    // rien à oublier
  }
}

onMounted(() => apiKey.value && load())

const sortedMovies = computed(() => movies.value.toSorted((a, b) => a.title.localeCompare(b.title, 'fr')))

// Message clair pour chaque refus de l'API ; une clé refusée est oubliée
const explain = (err) => {
  const code = err.response?.status
  if (code === 401) {
    forgetKey()
    return 'Clé refusée. Saisissez-la à nouveau.'
  }
  if (code === 503) return "L'écriture est désactivée : ADMIN_API_KEY n'est pas configurée sur le serveur."
  if (code === 400) return 'Film déjà présent, ou identifiant inconnu de TMDB.'
  return 'Le serveur ne répond pas. Réessayez dans un instant.'
}

const add = async () => {
  const id = Number(tmdbInput.value)
  if (!Number.isInteger(id) || id <= 0) {
    message.value = { kind: 'error', text: "L'identifiant TMDB est un nombre entier, par exemple 27205." }
    return
  }
  busy.value = true
  message.value = { kind: '', text: '' }
  try {
    const movie = await addMovie(id, apiKey.value)
    movies.value = [...movies.value, movie]
    message.value = { kind: 'ok', text: `« ${movie.title} » ajouté.` }
    tmdbInput.value = ''
  } catch (err) {
    message.value = { kind: 'error', text: explain(err) }
  } finally {
    busy.value = false
  }
}

const remove = async (movie) => {
  if (!window.confirm(`Supprimer « ${movie.title} » et toutes ses séances ?`)) return
  busy.value = true
  try {
    await deleteMovie(movie._id, apiKey.value)
    movies.value = movies.value.filter((m) => m._id !== movie._id)
    message.value = { kind: 'ok', text: `« ${movie.title} » supprimé.` }
  } catch (err) {
    message.value = { kind: 'error', text: explain(err) }
  } finally {
    busy.value = false
  }
}
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
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

.tile {
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: var(--pad);
}

.columns {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--gap);
  align-items: start;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 760px;
}

label {
  font-weight: 500;
  margin-top: 8px;
}

.row {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 14px;
  background: var(--ground);
  border: 1px solid var(--control);
  border-radius: 10px;
  color: var(--text);
  font: inherit;
}

input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

.primary {
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--text);
  color: var(--on-light);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.primary:disabled {
  background: var(--muted);
  cursor: progress;
}

.status {
  min-height: 20px;
  font-size: 13px;
}

.status.ok {
  color: var(--accent);
}

.status.error {
  color: var(--negative);
}

.session {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.text-action {
  background: none;
  border: 0;
  padding: 0;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.text-action:hover {
  text-decoration: underline;
}

.films {
  margin-top: 40px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.films ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.films li {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--border);
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

.films .muted {
  font-size: 13px;
}

.danger {
  height: 32px;
  padding: 0 14px;
  background: none;
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--negative);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.danger:hover {
  border-color: var(--negative);
}

.nowrap {
  white-space: nowrap;
}

code {
  color: var(--text);
}

@media (max-width: 760px) {
  .page {
    padding: 20px 16px 48px;
  }

  .columns {
    grid-template-columns: 1fr;
  }

  .row {
    flex-direction: column;
  }
}
</style>
