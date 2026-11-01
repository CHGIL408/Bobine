import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '../SearchBar.vue'

describe('SearchBar', () => {
  it('émet le texte saisi à chaque frappe', async () => {
    const wrapper = mount(SearchBar)
    await wrapper.find('input').setValue('dune')
    expect(wrapper.emitted('search')).toEqual([['dune']])
  })

  it('a un nom accessible', () => {
    const wrapper = mount(SearchBar)
    expect(wrapper.find('input').attributes('aria-label')).toBe('Rechercher un film')
  })
})
