import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MovieView from '../MovieView.vue'
import { getMovie, getShowtimes } from '@/services/api'

vi.mock('@/services/api', () => ({ getMovie: vi.fn(), getShowtimes: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 're' } }) }))

const BEAUPORT = { _id: 'b', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec' }
const IMAX = { _id: 'i', name: 'Cinéma Cineplex IMAX aux Galeries de la Capitale', address: '5401 Boul. des Galeries', city: 'Québec' }
const MOVIE = { _id: 're', title: 'Resident Evil', genre: ['Horreur'], rating: 7.3, duration: 95, releaseDate: '2026-09-18', synopsis: 'Bryan…', poster: 'p' }
// 1er nov. 2026 = heure normale à Québec (UTC-5)
const at = (local) => new Date(`${local}-05:00`).toISOString()
const SHOWTIMES = [
  { _id: 's0', cinema: BEAUPORT, datetime: at('2026-11-01T13:00:00'), format: 'Standard' }, // passée
  { _id: 's1', cinema: BEAUPORT, datetime: at('2026-11-01T19:30:00'), format: 'Standard' },
  { _id: 's2', cinema: IMAX, datetime: at('2026-11-01T16:30:00'), format: 'IMAX' },
  { _id: 's3', cinema: BEAUPORT, datetime: at('2026-11-01T16:30:00'), format: 'Standard' },
  { _id: 's4', cinema: IMAX, datetime: at('2026-11-03T21:00:00'), format: 'IMAX' },
  { _id: 's5', cinema: null, datetime: at('2026-11-01T20:00:00'), format: 'Standard' }, // cinéma supprimé
]

const mountView = async () => {
  const w = mount(MovieView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  return w
}
const cinemaRows = (w) =>
  w.findAll('.cinemas > li').map((li) => [li.find('.name').text(), li.findAll('.times li').map((t) => t.text())])

describe('MovieView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(at('2026-11-01T15:00:00')))
    getMovie.mockReset().mockResolvedValue(MOVIE)
    getShowtimes.mockReset().mockResolvedValue(SHOWTIMES)
  })
  afterEach(() => vi.useRealTimers())

  it('affiche la fiche du film', async () => {
    const w = await mountView()
    expect(w.find('h1').text()).toBe('Resident Evil')
    expect(w.find('.meta').text()).toBe('2026 · 1 h 35 · Horreur')
    expect(w.find('.rating').text()).toBe('7,3 /10')
  })

  it('groupe les séances à venir par jour, puis par cinéma, sans les passées', async () => {
    const w = await mountView()
    expect(w.findAll('[role=tab]').map((t) => t.text())).toEqual(["Aujourd'hui", 'mar. 3 nov.'])
    expect(cinemaRows(w)).toEqual([
      ['Cinéma Cineplex IMAX aux Galeries de la Capitale', ['16 h 30IMAX']],
      ['Cinéma Cineplex Odeon Beauport', ['16 h 30', '19 h 30']],
    ])
    expect(w.text()).toContain('4 séances à venir dans 2 cinémas')
  })

  it('change de jour', async () => {
    const w = await mountView()
    await w.findAll('[role=tab]')[1].trigger('click')
    expect(cinemaRows(w)).toEqual([['Cinéma Cineplex IMAX aux Galeries de la Capitale', ['21 h 00IMAX']]])
  })

  it("indique quand il n'y a aucune séance", async () => {
    getShowtimes.mockResolvedValue([])
    const w = await mountView()
    expect(w.text()).toContain('Aucune séance prévue pour ce film dans nos cinémas.')
  })

  it('affiche une erreur et permet de réessayer', async () => {
    getMovie.mockRejectedValueOnce(new Error('réseau'))
    const w = await mountView()
    expect(w.find('[role=alert]').text()).toContain('Impossible de charger ce film.')
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.find('h1').text()).toBe('Resident Evil')
  })
})
