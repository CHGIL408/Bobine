import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TonightView from '../TonightView.vue'
import { getMovies, getCinemas, getUpcomingShowtimes } from '@/services/api'

vi.mock('@/services/api', () => ({
  getMovies: vi.fn(),
  getCinemas: vi.fn(),
  getUpcomingShowtimes: vi.fn(),
}))

const MOVIES = [
  { _id: 'wicker', title: 'Wicker', duration: 105, poster: 'w' },
  { _id: 'dune', title: 'Dune', duration: 165, poster: null },
  { _id: 'court', title: 'Court métrage', duration: null, poster: 'c' },
]
const CINEMAS = [
  { _id: 'c1', name: 'Cinéma Cineplex Odeon Beauport' },
  { _id: 'c2', name: 'Cinéma Cineplex Odeon Ste-Foy' },
]
// Heure de Québec en novembre 2026 : UTC-5. "Maintenant" = dimanche 1er nov., 19 h.
const at = (local) => new Date(`${local}-05:00`).toISOString()
const SHOWTIMES = [
  { _id: 'old', movie: 'dune', cinema: 'c1', datetime: at('2026-11-01T18:30:00') }, // 30 min : trop tard
  { _id: 's1', movie: 'wicker', cinema: 'c2', datetime: at('2026-11-01T18:50:00') }, // commencée il y a 10 min
  { _id: 's2', movie: 'dune', cinema: 'c1', datetime: at('2026-11-01T19:10:00'), format: 'IMAX' },
  { _id: 's3', movie: 'court', cinema: 'c1', datetime: at('2026-11-01T19:40:00') },
  { _id: 's4', movie: 'wicker', cinema: 'c1', datetime: at('2026-11-01T21:30:00'), format: 'Standard' },
  { _id: 's5', movie: 'inconnu', cinema: 'c1', datetime: at('2026-11-01T22:00:00') }, // film retiré
  { _id: 't1', movie: 'dune', cinema: 'c2', datetime: at('2026-11-02T13:00:00') },
]

const mountTonight = async () => {
  const w = mount(TonightView, {
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
  return w
}
const hours = (w) => w.findAll('.hour-label').map((h) => h.text())
const titles = (w) => w.findAll('.row a').map((a) => a.text())

describe('TonightView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date(at('2026-11-01T19:00:00')))
    getMovies.mockReset().mockResolvedValue(MOVIES)
    getCinemas.mockReset().mockResolvedValue(CINEMAS)
    getUpcomingShowtimes.mockReset().mockResolvedValue(SHOWTIMES)
  })
  afterEach(() => vi.useRealTimers())

  it("liste les séances d'ici minuit par heure, y compris celle commencée il y a moins de 15 min", async () => {
    const w = await mountTonight()
    expect(getUpcomingShowtimes).toHaveBeenCalledWith({ since: 15 })
    expect(w.find('.subline').text()).toBe('4 séances d’ici minuit')
    expect(hours(w)).toEqual(['18 h', '19 h', '21 h'])
    expect(titles(w)).toEqual(['Wicker', 'Dune', 'Court métrage', 'Wicker'])
    expect(w.findAll('.row .start').map((s) => s.text())).toEqual(['18 h 50', '19 h 10', '19 h 40', '21 h 30'])
    expect(w.find('.row a').attributes('href')).toBe('/movies/wicker')
  })

  it('indique le cinéma, le format et les séances déjà commencées', async () => {
    const w = await mountTonight()
    const rows = w.findAll('.row')
    expect(rows[0].find('.sub').text().replace(/\s+/g, ' ')).toBe('Odeon Ste-Foy · STD')
    expect(rows[0].find('.started').text()).toBe('A commencé il y a 10 min')
    expect(rows[1].find('.sub').text().replace(/\s+/g, ' ')).toBe('Odeon Beauport · IMAX')
    expect(rows[1].find('.started').exists()).toBe(false)
    expect(rows[2].find('.sub').text().replace(/\s+/g, ' ')).toBe('Odeon Beauport · STD')
  })

  it('filtre par cinéma', async () => {
    const w = await mountTonight()
    await w.find('select[aria-label="Cinéma"]').setValue('c2')
    expect(titles(w)).toEqual(['Wicker'])
  })

  it('retire une séance commencée depuis plus de 15 min quand l’heure avance', async () => {
    const w = await mountTonight()
    vi.advanceTimersByTime(6 * 60e3) // 19 h 06 : la séance de 18 h 50 a 16 min
    await flushPromises()
    expect(titles(w)[0]).toBe('Dune')
  })

  it('montre les premières séances de demain quand il ne reste rien ce soir', async () => {
    vi.setSystemTime(new Date(at('2026-11-01T23:30:00')))
    const w = await mountTonight()
    expect(w.find('.subline').exists()).toBe(false) // le message ci-dessous suffit
    expect(w.find('.message').text()).toContain('Plus de séances ce soir')
    expect(w.find('.block-title').text()).toBe('Demain')
    expect(titles(w)).toEqual(['Dune'])
  })

  it('montre la forme de la page pendant le chargement, puis explique une attente longue', async () => {
    getUpcomingShowtimes.mockReturnValue(new Promise(() => {}))
    const w = await mountTonight()
    expect(w.find('.skeleton').exists()).toBe(true)
    expect(w.find('[role=status]').text()).toBe('Chargement des séances…')
    vi.advanceTimersByTime(3000)
    await flushPromises()
    expect(w.find('[role=status]').text()).toMatch(/serveur se réveille/)
  })

  it('propose de réessayer en cas d’erreur', async () => {
    getUpcomingShowtimes.mockRejectedValueOnce(new Error('panne'))
    const w = await mountTonight()
    expect(w.find('[role=alert]').text()).toContain('Impossible de charger les séances.')
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(titles(w)).toHaveLength(4)
  })

  it("remplace une affiche qui ne se charge pas par la place vide prévue", async () => {
    const w = await mountTonight()
    const first = () => w.findAll('.row')[0]
    expect(first().find('img').exists()).toBe(true)
    await first().find('img').trigger('error')
    expect(first().find('img').exists()).toBe(false)
    expect(first().find('span.poster').exists()).toBe(true)
  })

  it('passé minuit, une page restée ouverte recharge et montre la nouvelle journée', async () => {
    // triées par heure, comme l'API
    getUpcomingShowtimes.mockResolvedValue([
      ...SHOWTIMES.slice(0, -1),
      { _id: 't0', movie: 'wicker', cinema: 'c1', datetime: at('2026-11-02T00:30:00') },
      SHOWTIMES.at(-1),
    ])
    vi.setSystemTime(new Date(at('2026-11-01T23:50:00')))
    const w = await mountTonight()
    expect(w.find('.block-title').text()).toBe('Demain')
    expect(titles(w)).toEqual(['Wicker', 'Dune'])

    vi.setSystemTime(new Date(at('2026-11-02T00:59:00')))
    vi.advanceTimersByTime(60e3) // 1 h : nouveau jour, la page recharge
    await flushPromises()
    expect(getUpcomingShowtimes).toHaveBeenCalledTimes(2)
    expect(w.find('.block-title').exists()).toBe(false)
    expect(w.find('.subline').text()).toBe('1 séance d’ici minuit') // la séance de 0 h 30 est passée
    expect(titles(w)).toEqual(['Dune'])
  })
})
