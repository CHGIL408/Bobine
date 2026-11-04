import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import HomeView from '../HomeView.vue'
import { getMovies, getCinemas, getUpcomingShowtimes } from '@/services/api.js'

vi.mock('@/services/api.js', () => ({
  getMovies: vi.fn(),
  getCinemas: vi.fn(),
  getUpcomingShowtimes: vi.fn(),
}))

const MOVIES = [
  { _id: 'dune', title: 'Dune : Deuxième partie', genre: ['Science-Fiction', 'Aventure'], rating: 8.127, duration: 165, releaseDate: '2024-02-27T00:00:00.000Z', backdrop: 'https://image.tmdb.org/t/p/w500/dune.jpg', poster: 'p1' },
  { _id: 'opp', title: 'Oppenheimer', genre: ['Drame', 'Histoire'], rating: 8.025, duration: 181, releaseDate: '2023-07-19T00:00:00.000Z', poster: 'p2' },
  { _id: 'inc', title: 'Inception', genre: ['Action', 'Science-Fiction'], rating: 8.372, duration: 125, poster: 'p3' },
]
const CINEMAS = [
  { _id: 'c1', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec' },
  { _id: 'c2', name: 'Cinéma Cineplex Odeon Ste-Foy', address: '1200 Autoroute Duplessis', city: 'Québec' },
]
// Heure de Québec en novembre 2026 : UTC-5. "Maintenant" = dimanche 1er nov., 15 h.
const at = (local) => new Date(`${local}-05:00`).toISOString()
const SHOWTIMES = [
  { _id: 's1', movie: 'opp', cinema: 'c1', datetime: at('2026-11-01T13:00:00') }, // déjà passée
  { _id: 's2', movie: 'dune', cinema: 'c2', datetime: at('2026-11-01T16:30:00') },
  { _id: 's3', movie: 'inc', cinema: 'c1', datetime: at('2026-11-01T19:30:00') },
  { _id: 's4', movie: 'dune', cinema: 'c2', datetime: at('2026-11-01T21:35:00'), format: 'DBOX' },
  { _id: 's5', movie: 'inc', cinema: 'c2', datetime: at('2026-11-02T16:00:00') },
  { _id: 's6', movie: 'opp', cinema: 'c1', datetime: at('2026-11-02T18:00:00') },
  { _id: 's7', movie: 'dune', cinema: 'c1', datetime: at('2026-11-03T20:00:00') },
]

const mountHome = async () => {
  const wrapper = mount(HomeView, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  })
  await flushPromises()
  return wrapper
}
const rowTitles = (w) => w.findAll('tbody .identity a').map((a) => a.text())
const leadTitle = (w) => w.find('.feature h2').text()
const count = (w) => w.find('.count').text()
const clickTab = (w, name) => w.findAll('[role=tab]').find((b) => b.text() === name).trigger('click')
const search = (w, text) => w.find('input[type=search]').setValue(text)
const choose = (w, label, value) => w.find(`select[aria-label="${label}"]`).setValue(value)

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(at('2026-11-01T15:00:00')))
    getMovies.mockReset().mockResolvedValue(MOVIES)
    getCinemas.mockReset().mockResolvedValue(CINEMAS)
    getUpcomingShowtimes.mockReset().mockResolvedValue(SHOWTIMES)
  })
  afterEach(() => vi.useRealTimers())

  it('résume le catalogue et met le mieux noté en vedette', async () => {
    const w = await mountHome()
    expect(w.find('.subline').text().replace(/\s+/g, ' ')).toBe(
      '3 films · le mieux noté : Inception, 8,4 /10',
    )
    expect(leadTitle(w)).toBe('Inception')
    expect(w.find('.feature a').attributes('href')).toBe('/movies/inc')
    expect(rowTitles(w)).toEqual(['Dune : Deuxième partie', 'Oppenheimer'])
    expect(getMovies).toHaveBeenCalledWith({ showing: true })
  })

  it('formate note et durée à la française, avec un tiret si absent', async () => {
    const w = await mountHome()
    expect(w.find('.feature .meta').text()).toBe('— · 2 h 05 · Action, Science-Fiction')
    const dune = w.findAll('tbody tr')[0].findAll('td.num:not(.times)').map((td) => td.text())
    expect(dune).toEqual(['2 h 45', '8,1 /10'])
  })

  it("affiche un tiret au lieu de 0,0 quand personne n'a encore voté", async () => {
    getMovies.mockResolvedValue([MOVIES[2], { ...MOVIES[1], rating: 0 }])
    const w = await mountHome()
    expect(w.find('tbody td.score').text()).toBe('—')
  })

  it('indique la prochaine séance du film en vedette et les prochaines heures de chaque film', async () => {
    const w = await mountHome()
    expect(w.find('.next').text().replace(/\s+/g, ' ')).toBe(
      "Prochaine séance : Aujourd'hui 19 h 30 STD · Odeon Beauport",
    )
    const times = w.findAll('tbody td.times').map((td) => td.text())
    expect(times).toEqual(["Aujourd'hui 16 h 30 STD, 21 h 35 DBOX", 'Demain 18 h 00 STD']) // la séance de 13 h est passée
  })

  it("propose les jours qui ont des séances et l'ensemble des cinémas", async () => {
    const w = await mountHome()
    const options = (label) => w.find(`select[aria-label="${label}"]`).findAll('option').map((o) => o.text())
    expect(options('Jour')).toEqual(['Cette semaine', "Aujourd'hui", 'Demain', 'mar. 3 nov.'])
    expect(options('Cinéma')).toEqual(['Tous les cinémas', 'Odeon Beauport', 'Odeon Ste-Foy'])
  })

  it('filtre par jour', async () => {
    const w = await mountHome()
    await choose(w, 'Jour', '2026-11-02')
    expect(leadTitle(w)).toBe('Inception')
    expect(w.find('.next').text()).toContain('Demain 16 h 00 STD · Odeon Ste-Foy')
    expect(rowTitles(w)).toEqual(['Oppenheimer'])
    expect(count(w)).toBe('2 films')
  })

  it("filtre par heure (« dès 21 h »)", async () => {
    const w = await mountHome()
    await choose(w, 'Heure', String(21 * 60))
    expect(leadTitle(w)).toBe('Dune : Deuxième partie')
    expect(count(w)).toBe('1 film')
  })

  it('filtre par cinéma', async () => {
    const w = await mountHome()
    await choose(w, 'Cinéma', 'c1')
    expect(count(w)).toBe('3 films')
    expect(w.findAll('tbody td.times').map((td) => td.text())).toEqual(['mar. 3 nov. 20 h 00 STD', 'Demain 18 h 00 STD'])
  })

  it('affiche un message sans résultat, puis réinitialise jour, heure et cinéma', async () => {
    const w = await mountHome()
    expect(w.find('.filters button').exists()).toBe(false)
    await choose(w, 'Jour', '2026-11-02')
    await choose(w, 'Heure', String(21 * 60))
    expect(count(w)).toBe('0 film')
    expect(w.text()).toContain('Aucun film ne correspond à ces critères.')
    await w.find('.filters button').trigger('click')
    expect(count(w)).toBe('3 films')
    expect(w.find('.filters button').exists()).toBe(false)
  })

  it('combine genre, recherche et filtres de séance', async () => {
    const w = await mountHome()
    await clickTab(w, 'Science-Fiction')
    await search(w, 'DUNE')
    expect(leadTitle(w)).toBe('Dune : Deuxième partie')
    await choose(w, 'Cinéma', 'c1')
    expect(w.find('.next').text()).toContain('mar. 3 nov. 20 h 00 STD · Odeon Beauport')
    await clickTab(w, 'Tous')
    expect(count(w)).toBe('1 film') // la recherche « dune » est conservée
  })

  it("montre toujours l'onglet Favoris et explique comment en ajouter", async () => {
    const w = await mountHome()
    expect(w.findAll('[role=tab]').map((t) => t.text()).slice(0, 2)).toEqual(['Tous', 'Favoris'])
    await clickTab(w, 'Favoris')
    expect(count(w)).toBe('0 film')
    expect(w.text()).toContain("Aucun favori pour l'instant")
  })

  it('filtre sur les favoris', async () => {
    localStorage.setItem('bobine:favoris', JSON.stringify(['opp', 'film-plus-a-l-affiche']))
    const w = await mountHome()
    await clickTab(w, 'Favoris')
    expect(leadTitle(w)).toBe('Oppenheimer')
    expect(count(w)).toBe('1 film')
  })

  it("affiche l'image de fond en haute résolution", async () => {
    getMovies.mockResolvedValue([MOVIES[0]])
    const w = await mountHome()
    expect(w.find('.backdrop').attributes('src')).toBe('https://image.tmdb.org/t/p/w1280/dune.jpg')
  })

  it('liste les cinémas', async () => {
    const w = await mountHome()
    expect(w.find('.cinemas li').text()).toContain('Cinéma Cineplex Odeon Beauport')
    expect(w.find('.cinemas li').text()).toContain('825 Rue Clemenceau, Québec')
  })

  it("affiche une erreur et permet de réessayer si l'API échoue", async () => {
    getMovies.mockRejectedValueOnce(new Error('réseau'))
    const w = await mountHome()
    expect(w.find('[role=alert]').text()).toContain('Impossible de charger les films.')
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.find('[role=alert]').exists()).toBe(false)
    expect(leadTitle(w)).toBe('Inception')
  })
})
