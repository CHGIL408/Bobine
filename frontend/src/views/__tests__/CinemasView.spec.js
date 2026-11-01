import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CinemasView from '../CinemasView.vue'
import { getCinemas } from '@/services/api'

vi.mock('@/services/api', () => ({ getCinemas: vi.fn() }))

const CINEMAS = [
  { _id: 'b', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec', website: 'https://www.cineplex.com' },
  { _id: 's', name: 'Cinéma Cineplex Odeon Ste-Foy', address: '1200 Autoroute Duplessis', city: 'Québec', phone: '418-555-0100' },
]

describe('CinemasView', () => {
  beforeEach(() => getCinemas.mockReset().mockResolvedValue(CINEMAS))

  it('liste les cinémas avec itinéraire, site et téléphone si connus', async () => {
    const w = mount(CinemasView)
    await flushPromises()
    expect(w.find('.title-row p').text()).toBe('2 cinémas à Québec')
    const [beauport, stefoy] = w.findAll('.grid > li')
    expect(beauport.find('h2').text()).toBe('Cinéma Cineplex Odeon Beauport')
    expect(beauport.find('.primary').attributes('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Cin%C3%A9ma%20Cineplex%20Odeon%20Beauport%2C%20825%20Rue%20Clemenceau%2C%20Qu%C3%A9bec',
    )
    expect(beauport.text()).toContain('Site web')
    expect(beauport.find('a[href^="tel:"]').exists()).toBe(false)
    expect(stefoy.find('a[href^="tel:"]').attributes('href')).toBe('tel:418-555-0100')
    expect(stefoy.text()).not.toContain('Site web')
  })

  it('affiche une erreur et permet de réessayer', async () => {
    getCinemas.mockRejectedValueOnce(new Error('réseau'))
    const w = mount(CinemasView)
    await flushPromises()
    expect(w.find('[role=alert]').exists()).toBe(true)
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.findAll('.grid > li h2')).toHaveLength(2)
  })
})
