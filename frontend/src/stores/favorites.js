import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const KEY = 'bobine:favoris'

// Lecture tolérante : stockage désactivé (navigation privée) ou contenu corrompu -> aucun favori
const read = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

// Films favoris, gardés dans ce navigateur (pas de compte)
export const useFavoritesStore = defineStore('favorites', () => {
  const ids = ref(read())

  watch(
    ids,
    (value) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(value))
      } catch {
        // stockage plein ou interdit : les favoris restent valables pour cette visite
      }
    },
    { deep: true },
  )

  const has = (id) => ids.value.includes(id)
  const toggle = (id) => {
    ids.value = has(id) ? ids.value.filter((x) => x !== id) : [...ids.value, id]
  }

  return { ids, has, toggle }
})
