import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useFavoritesStore } from '../favorites'

describe('favoris', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('ajoute et retire un film, et le garde dans le navigateur', async () => {
    const favorites = useFavoritesStore()
    favorites.toggle('m1')
    favorites.toggle('m2')
    expect(favorites.has('m1')).toBe(true)
    await nextTick()
    expect(JSON.parse(localStorage.getItem('bobine:favoris'))).toEqual(['m1', 'm2'])

    favorites.toggle('m1')
    await nextTick()
    expect(favorites.has('m1')).toBe(false)
    expect(JSON.parse(localStorage.getItem('bobine:favoris'))).toEqual(['m2'])
  })

  it('relit les favoris enregistrés', () => {
    localStorage.setItem('bobine:favoris', JSON.stringify(['m9']))
    expect(useFavoritesStore().has('m9')).toBe(true)
  })

  it('ignore un contenu corrompu', () => {
    localStorage.setItem('bobine:favoris', '{pas du json')
    expect(useFavoritesStore().ids).toEqual([])
    setActivePinia(createPinia())
    localStorage.setItem('bobine:favoris', JSON.stringify({ m1: true }))
    expect(useFavoritesStore().ids).toEqual([])
  })
})
