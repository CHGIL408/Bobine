import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HomeView from '../HomeView.vue'
import { getMovies, getCinemas } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({ getMovies: vi.fn(), getCinemas: vi.fn() }))

const MOVIES = [
  { _id: 'dune', title: 'Dune : Deuxième partie', genre: ['Science-Fiction', 'Aventure'], rating: 8.127, duration: 165, releaseDate: '2024-02-27T00:00:00.000Z', backdrop: 'https://image.tmdb.org/t/p/w500/dune.jpg', poster: 'p1' },
  { _id: 'opp', title: 'Oppenheimer', genre: ['Drame', 'Histoire'], rating: 8.025, duration: 181, releaseDate: '2023-07-19T00:00:00.000Z', poster: 'p2' },
  { _id: 'inc', title: 'Inception', genre: ['Action', 'Science-Fiction'], rating: 8.372, duration: 125, poster: 'p3' },
]
const CINEMAS = [{ _id: 'c1', name: 'Cinéma Cineplex Odeon Ste-Foy', address: '1200 Autoroute Duplessis', city: 'Québec' }]

const mountHome = async () => {
  const wrapper = mount(HomeView, {
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
  return wrapper
}
const rowTitles = (w) => w.findAll('tbody .identity a').map((a) => a.text())
const clickTab = (w, name) => w.findAll('[role=tab]').find((b) => b.text() === name).trigger('click')
const search = (w, text) => w.find('input[type=search]').setValue(text)

describe('HomeView', () => {
  beforeEach(() => {
    getMovies.mockReset().mockResolvedValue(MOVIES)
    getCinemas.mockReset().mockResolvedValue(CINEMAS)
  })

  it('résume le catalogue et met le mieux noté en vedette', async () => {
    const w = await mountHome()
    expect(w.find('.subline').text().replace(/\s+/g, ' ')).toBe(
      '3 films · le mieux noté : Inception, 8,4 /10',
    )
    expect(w.find('.feature h2').text()).toBe('Inception')
    expect(w.find('.feature a').attributes('href')).toBe('/movies/inc')
    expect(rowTitles(w)).toEqual(['Dune : Deuxième partie', 'Oppenheimer'])
  })

  it('formate note, durée et année à la française, avec un tiret si absent', async () => {
    const w = await mountHome()
    expect(w.find('.feature .meta').text()).toBe('— · 2 h 05 · Action, Science-Fiction')
    const dune = w.findAll('tbody tr')[0].findAll('td.num').map((td) => td.text())
    expect(dune).toEqual(['2024', '2 h 45', '8,1 /10'])
  })

  it("affiche l'image de fond en haute résolution", async () => {
    getMovies.mockResolvedValue([MOVIES[0]])
    const w = await mountHome()
    expect(w.find('.backdrop').attributes('src')).toBe('https://image.tmdb.org/t/p/w1280/dune.jpg')
  })

  it('filtre par genre et met à jour le compteur', async () => {
    const w = await mountHome()
    await clickTab(w, 'Drame')
    expect(w.find('.feature h2').text()).toBe('Oppenheimer')
    expect(w.find('.count').text()).toBe('1 film')
    expect(w.text()).toContain('Aucun autre film dans cette sélection.')
  })

  it('combine recherche et genre', async () => {
    const w = await mountHome()
    await clickTab(w, 'Science-Fiction')
    await search(w, 'DUNE')
    expect(w.find('.feature h2').text()).toBe('Dune : Deuxième partie')
    expect(w.find('.count').text()).toBe('1 film')
    await clickTab(w, 'Tous')
    expect(w.find('.feature h2').text()).toBe('Dune : Deuxième partie') // la recherche est conservée
  })

  it('affiche un message quand rien ne correspond', async () => {
    const w = await mountHome()
    await search(w, 'zzz')
    expect(w.find('.count').text()).toBe('0 film')
    expect(w.text()).toContain('Aucun film ne correspond à cette recherche.')
    expect(w.find('table').exists()).toBe(false)
  })

  it('liste les cinémas', async () => {
    const w = await mountHome()
    expect(w.find('.cinemas li').text()).toContain('Cinéma Cineplex Odeon Ste-Foy')
    expect(w.find('.cinemas li').text()).toContain('1200 Autoroute Duplessis, Québec')
  })

  it("affiche une erreur et permet de réessayer si l'API échoue", async () => {
    getMovies.mockRejectedValueOnce(new Error('réseau'))
    const w = await mountHome()
    expect(w.find('[role=alert]').text()).toContain('Impossible de charger les films.')
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.find('[role=alert]').exists()).toBe(false)
    expect(w.find('.feature h2').text()).toBe('Inception')
  })
})
