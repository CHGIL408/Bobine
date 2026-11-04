import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MovieView from '../MovieView.vue'
import { getMovie, getShowtimes } from '@/services/api'

vi.mock('@/services/api', () => ({ getMovie: vi.fn(), getShowtimes: vi.fn() }))
const router = { back: vi.fn(), push: vi.fn() }
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 're' } }), useRouter: () => router }))

const BEAUPORT = { _id: 'b', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec' }
const IMAX = { _id: 'i', name: 'Cinéma Cineplex IMAX aux Galeries de la Capitale', address: '5401 Boul. des Galeries', city: 'Québec', website: 'https://www.cineplex.com' }
const MOVIE = { _id: 're', title: 'Resident Evil', genre: ['Horreur'], rating: 7.3, duration: 95, releaseDate: '2026-09-18', synopsis: 'Bryan…', poster: 'p', director: 'Zach Cregger', cast: ['Austin Abrams', 'Kali Reis'], trailerKey: 'JvUuW2n4lC4' }
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
  const w = mount(MovieView, {
    global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return w
}
const cinemaRows = (w) =>
  w.findAll('.cinemas > li').map((li) => [li.find('.name').text(), li.findAll('.times li').map((t) => t.text())])

describe('MovieView', () => {
  beforeEach(() => {
    localStorage.clear()
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
    expect(document.title).toBe('Resident Evil · Bobine')
  })

  it('groupe les séances à venir par jour, puis par cinéma, sans les passées', async () => {
    const w = await mountView()
    expect(w.findAll('.tabs button').map((t) => t.text())).toEqual(["Aujourd'hui", 'mar. 3 nov.'])
    expect(cinemaRows(w)).toEqual([
      ['Cinéma Cineplex IMAX aux Galeries de la Capitale', ['16 h 30IMAX']],
      ['Cinéma Cineplex Odeon Beauport', ['16 h 30STD', '19 h 30STD']],
    ])
    expect(w.text()).toContain('4 séances à venir dans 2 cinémas')
  })

  it('propose de réserver sur le site du cinéma quand il est connu', async () => {
    const w = await mountView()
    const [imax, beauport] = w.findAll('.cinemas > li')
    expect(imax.find('a.book').attributes('href')).toBe('https://www.cineplex.com')
    expect(imax.find('a.book').attributes('target')).toBe('_blank')
    expect(beauport.find('a.book').exists()).toBe(false)
  })

  it('change de jour', async () => {
    const w = await mountView()
    await w.findAll('.tabs button')[1].trigger('click')
    expect(cinemaRows(w)).toEqual([['Cinéma Cineplex IMAX aux Galeries de la Capitale', ['21 h 00IMAX']]])
  })

  it("affiche un tiret au lieu de 0,0 quand personne n'a encore voté", async () => {
    getMovie.mockResolvedValue({ ...MOVIE, rating: 0 })
    const w = await mountView()
    expect(w.find('.rating').text()).toBe('—')
  })

  it('affiche la réalisation et la distribution', async () => {
    const w = await mountView()
    const credits = w.findAll('.credits dt, .credits dd').map((e) => e.text())
    expect(credits).toEqual(['Réalisation', 'Zach Cregger', 'Avec', 'Austin Abrams, Kali Reis'])
  })

  it('charge la bande-annonce seulement au clic', async () => {
    const w = await mountView()
    expect(w.find('iframe').exists()).toBe(false)
    const button = w.find('button.primary')
    expect(button.text()).toBe('Voir la bande-annonce')
    await button.trigger('click')
    expect(w.find('iframe').attributes('src')).toBe(
      'https://www.youtube-nocookie.com/embed/JvUuW2n4lC4?autoplay=1&rel=0',
    )
    expect(button.attributes('aria-expanded')).toBe('true')
    await button.trigger('click')
    expect(w.find('iframe').exists()).toBe(false)
  })

  it('ajoute le film aux favoris et le retire', async () => {
    const w = await mountView()
    const fav = w.find('button.fav')
    expect(fav.text()).toBe('Ajouter aux favoris')
    expect(fav.attributes('aria-pressed')).toBe('false')
    await fav.trigger('click')
    expect(fav.text()).toBe('Dans mes favoris')
    expect(fav.attributes('aria-pressed')).toBe('true')
    await fav.trigger('click')
    expect(fav.text()).toBe('Ajouter aux favoris')
  })

  it('partage avec le menu du téléphone quand il existe', async () => {
    const shareSpy = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { ...navigator, share: shareSpy })
    const w = await mountView()
    await w.find('button.share').trigger('click')
    expect(shareSpy).toHaveBeenCalledWith({
      title: 'Resident Evil',
      text: 'Resident Evil au cinéma',
      url: window.location.href,
    })
    vi.unstubAllGlobals()
  })

  it('copie le lien sinon, et le dit', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })
    const w = await mountView()
    await w.find('button.share').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(w.find('[role=status]').text()).toBe('Lien copié')
    vi.unstubAllGlobals()
  })

  it("n'affiche ni bouton ni distribution quand TMDB n'en a pas", async () => {
    getMovie.mockResolvedValue({ ...MOVIE, director: null, cast: [], trailerKey: null })
    const w = await mountView()
    expect(w.find('button.primary').exists()).toBe(false)
    expect(w.find('.credits').exists()).toBe(false)
    expect(w.find('button.fav').exists()).toBe(true)
  })

  it("chaque heure télécharge la séance pour l'agenda", async () => {
    const w = await mountView()
    const link = w.find('.times a')
    expect(link.attributes('download')).toBe('resident-evil-2026-11-01-16-h-30.ics')
    expect(link.attributes('aria-label')).toBe(
      'Ajouter la séance de 16 h 30 en IMAX au Cinéma Cineplex IMAX aux Galeries de la Capitale à mon agenda',
    )
    const ics = decodeURIComponent(link.attributes('href').replace('data:text/calendar;charset=utf-8,', ''))
    expect(ics).toContain('SUMMARY:Resident Evil (IMAX)')
    expect(ics).toContain('DTSTART:20261101T213000Z')
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

  it("« ← Films » revient en arrière depuis l'accueil, sinon ouvre l'accueil", async () => {
    const w = await mountView()
    router.back.mockReset()
    router.push.mockReset()

    window.history.replaceState({ back: '/' }, '')
    await w.find('a.back').trigger('click')
    expect(router.back).toHaveBeenCalledOnce()

    window.history.replaceState({ back: null }, '')
    await w.find('a.back').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/')
  })
})
