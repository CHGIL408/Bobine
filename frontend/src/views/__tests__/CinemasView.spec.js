import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CinemasView from '../CinemasView.vue'
import { getCinemas, getMovies, getUpcomingShowtimes } from '@/services/api'

vi.mock('@/services/api', () => ({ getCinemas: vi.fn(), getMovies: vi.fn(), getUpcomingShowtimes: vi.fn() }))

const CINEMAS = [
  { _id: 'b', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec', website: 'https://www.cineplex.com', location: { coordinates: [-71.2056, 46.8601] } },
  { _id: 's', name: 'Cinéma Cineplex Odeon Ste-Foy', address: '1200 Autoroute Duplessis', city: 'Québec', phone: '418-555-0100', location: { coordinates: [-71.3523, 46.7864] } },
]
// 8 films ; "Maintenant" = dimanche 1er nov. 2026, 15 h à Québec (UTC-5)
const MOVIES = Array.from({ length: 8 }, (_, i) => ({ _id: `m${i}`, title: `Film ${i}`, poster: `p${i}` }))
const at = (local) => new Date(`${local}-05:00`).toISOString()
const SHOWTIMES = [
  { _id: 'past', movie: 'm0', cinema: 'b', datetime: at('2026-11-01T13:00:00') }, // déjà passée
  // Beauport aujourd'hui : m1 à 21 h 00 et 16 h 00, m2 à 18 h 30, puis m3…m7 plus tard
  { _id: 'a', movie: 'm1', cinema: 'b', datetime: at('2026-11-01T16:00:00') },
  { _id: 'b1', movie: 'm2', cinema: 'b', datetime: at('2026-11-01T18:30:00') },
  { _id: 'c', movie: 'm1', cinema: 'b', datetime: at('2026-11-01T21:00:00'), format: '3D' },
  ...[3, 4, 5, 6, 7].map((n) => ({ _id: `x${n}`, movie: `m${n}`, cinema: 'b', datetime: at(`2026-11-01T22:0${n}:00`) })),
  { _id: 'tom', movie: 'm1', cinema: 'b', datetime: at('2026-11-02T13:00:00') }, // demain : ne compte pas
  // Ste-Foy : plus rien aujourd'hui, prochaine demain 13 h 05
  { _id: 'sf', movie: 'm2', cinema: 's', datetime: at('2026-11-02T13:05:00') },
]

const mountView = async () => {
  const w = mount(CinemasView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
  return w
}
const cards = (w) => w.findAll('.grid > li')
const films = (card) => card.findAll('.films li').map((li) => [li.find('a').text(), li.find('.times').text()])

describe('CinemasView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(at('2026-11-01T15:00:00')))
    getCinemas.mockReset().mockResolvedValue(CINEMAS)
    getMovies.mockReset().mockResolvedValue(MOVIES)
    getUpcomingShowtimes.mockReset().mockResolvedValue(SHOWTIMES)
  })
  afterEach(() => vi.useRealTimers())

  it('liste les cinémas avec itinéraire, site et téléphone si connus', async () => {
    const w = await mountView()
    expect(w.find('.title-row p').text()).toBe('2 cinémas à Québec')
    const [beauport, stefoy] = cards(w)
    expect(beauport.find('h2').text()).toBe('Cinéma Cineplex Odeon Beauport')
    expect(beauport.find('.primary').attributes('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Cin%C3%A9ma%20Cineplex%20Odeon%20Beauport%2C%20825%20Rue%20Clemenceau%2C%20Qu%C3%A9bec',
    )
    expect(beauport.text()).toContain('Site web')
    expect(beauport.find('a[href^="tel:"]').exists()).toBe(false)
    expect(stefoy.find('a[href^="tel:"]').attributes('href')).toBe('tel:418-555-0100')
    expect(stefoy.text()).not.toContain('Site web')
    expect(getMovies).toHaveBeenCalledWith({ showing: true })
  })

  it("liste les films encore à l'affiche aujourd'hui, le plus tôt d'abord, 6 au maximum", async () => {
    const w = await mountView()
    const beauport = cards(w)[0]
    expect(films(beauport).slice(0, 3)).toEqual([
      ['Film 1', '16 h 00 · 21 h 00 3D'],
      ['Film 2', '18 h 30'],
      ['Film 3', '22 h 03'],
    ])
    expect(films(beauport)).toHaveLength(6) // m0 (séance passée) et la séance de demain sont exclus
    expect(beauport.find('.films a').attributes('href')).toBe('/movies/m1')
  })

  it('affiche les autres films à la demande', async () => {
    const w = await mountView()
    const more = cards(w)[0].find('button.more')
    expect(more.text()).toBe('Afficher 1 autre film')
    await more.trigger('click')
    expect(films(cards(w)[0])).toHaveLength(7)
    expect(cards(w)[0].find('button.more').text()).toBe('Afficher moins')
    expect(cards(w)[0].find('button.more').attributes('aria-expanded')).toBe('true')
  })

  it("indique la prochaine séance quand il n'y a plus rien aujourd'hui", async () => {
    const w = await mountView()
    const stefoy = cards(w)[1]
    expect(stefoy.find('.films').exists()).toBe(false)
    expect(stefoy.find('.today p').text().replace(/\s+/g, ' ')).toBe(
      "Plus de séance aujourd'hui. Prochaine : Demain 13 h 05, Film 2.",
    )
  })

  it('trie les cinémas du plus proche au plus loin', async () => {
    const getCurrentPosition = vi.fn((ok) => ok({ coords: { latitude: 46.7800, longitude: -71.3400 } })) // près de Ste-Foy
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    const w = await mountView()
    expect(cards(w).map((c) => c.find('h2').text())).toEqual(['Cinéma Cineplex Odeon Beauport', 'Cinéma Cineplex Odeon Ste-Foy'])
    await w.find('.locate button').trigger('click')
    expect(cards(w).map((c) => c.find('h2').text())).toEqual(['Cinéma Cineplex Odeon Ste-Foy', 'Cinéma Cineplex Odeon Beauport'])
    expect(cards(w)[0].find('.distance').text()).toBe('À 1,2 km')
    expect(w.find('.locate button').text()).toBe('Mettre à jour ma position')
    vi.unstubAllGlobals()
  })

  it('explique quand la localisation est refusée', async () => {
    const getCurrentPosition = vi.fn((ok, fail) => fail({ code: 1 }))
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    const w = await mountView()
    await w.find('.locate button').trigger('click')
    expect(w.find('.locate [role=status]').text()).toContain('Localisation refusée')
    expect(cards(w)[0].find('.distance').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('affiche une erreur et permet de réessayer', async () => {
    getCinemas.mockRejectedValueOnce(new Error('réseau'))
    const w = await mountView()
    expect(w.find('[role=alert]').exists()).toBe(true)
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.findAll('.grid > li h2')).toHaveLength(2)
  })
})
