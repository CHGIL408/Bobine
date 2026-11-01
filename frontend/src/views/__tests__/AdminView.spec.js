import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AdminView from '../AdminView.vue'
import { addMovie, deleteMovie, getMovies } from '@/services/api'

vi.mock('@/services/api', () => ({ addMovie: vi.fn(), deleteMovie: vi.fn(), getMovies: vi.fn() }))

const MOVIES = [
  { _id: 'm2', title: 'Oppenheimer', tmdbId: 872585, releaseDate: '2023-07-19' },
  { _id: 'm1', title: 'Inception', tmdbId: 27205, releaseDate: '2010-07-15' },
]
const apiError = (status) => Object.assign(new Error('refus'), { response: { status } })

const mountView = async () => {
  const w = mount(AdminView, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
  return w
}
const login = async (w, key = 'cle-secrete') => {
  await w.find('#key').setValue(key)
  await w.find('form').trigger('submit')
  await flushPromises()
}
const titles = (w) => w.findAll('.films li a').map((a) => a.text())

describe('AdminView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    getMovies.mockReset().mockResolvedValue(MOVIES)
    addMovie.mockReset()
    deleteMovie.mockReset().mockResolvedValue()
  })
  afterEach(() => vi.restoreAllMocks())

  it("demande la clé avant tout, puis liste les films par ordre alphabétique", async () => {
    const w = await mountView()
    expect(w.find('#key').exists()).toBe(true)
    expect(getMovies).not.toHaveBeenCalled()
    await login(w)
    expect(sessionStorage.getItem('bobine:admin-key')).toBe('cle-secrete')
    expect(titles(w)).toEqual(['Inception', 'Oppenheimer'])
    expect(w.find('.section-head p').text()).toBe('2 en base')
  })

  it('reprend la clé gardée dans cet onglet', async () => {
    sessionStorage.setItem('bobine:admin-key', 'cle-secrete')
    const w = await mountView()
    expect(w.find('#key').exists()).toBe(false)
    expect(titles(w)).toHaveLength(2)
  })

  it('ajoute un film avec la clé', async () => {
    addMovie.mockResolvedValue({ _id: 'm3', title: 'Interstellar', tmdbId: 157336 })
    const w = await mountView()
    await login(w)
    await w.find('#tmdb').setValue('157336')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(addMovie).toHaveBeenCalledWith(157336, 'cle-secrete')
    expect(w.find('[role=status]').text()).toBe('« Interstellar » ajouté.')
    expect(titles(w)).toContain('Interstellar')
  })

  it("refuse un identifiant qui n'est pas un nombre entier sans appeler l'API", async () => {
    const w = await mountView()
    await login(w)
    await w.find('#tmdb').setValue('inception')
    await w.find('form').trigger('submit')
    expect(addMovie).not.toHaveBeenCalled()
    expect(w.find('[role=status]').text()).toContain('nombre entier')
  })

  it('explique un doublon (400)', async () => {
    addMovie.mockRejectedValue(apiError(400))
    const w = await mountView()
    await login(w)
    await w.find('#tmdb').setValue('27205')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role=status]').text()).toBe('Film déjà présent, ou identifiant inconnu de TMDB.')
  })

  it('oublie une clé refusée (401) et la redemande', async () => {
    addMovie.mockRejectedValue(apiError(401))
    const w = await mountView()
    await login(w, 'mauvaise')
    await w.find('#tmdb').setValue('27205')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(sessionStorage.getItem('bobine:admin-key')).toBeNull()
    expect(w.find('#key').exists()).toBe(true)
  })

  it('supprime un film après confirmation seulement', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const w = await mountView()
    await login(w)
    const button = () => w.find('button[aria-label="Supprimer Inception"]')
    await button().trigger('click')
    expect(deleteMovie).not.toHaveBeenCalled()
    await button().trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenLastCalledWith('Supprimer « Inception » et toutes ses séances ?')
    expect(deleteMovie).toHaveBeenCalledWith('m1', 'cle-secrete')
    expect(titles(w)).toEqual(['Oppenheimer'])
  })
})
