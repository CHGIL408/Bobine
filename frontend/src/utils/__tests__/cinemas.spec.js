import { describe, it, expect } from 'vitest'
import { websiteOf } from '../cinemas'

describe('websiteOf', () => {
  it('garde les liens http(s) et écarte le reste', () => {
    expect(websiteOf({ website: 'https://www.cineplex.com' })).toBe('https://www.cineplex.com')
    expect(websiteOf({ website: 'HTTP://exemple.ca' })).toBe('HTTP://exemple.ca')
    expect(websiteOf({ website: 'javascript:alert(1)' })).toBeNull()
    expect(websiteOf({ website: ' javascript:alert(1)' })).toBeNull()
    expect(websiteOf({})).toBeNull()
    expect(websiteOf(undefined)).toBeNull()
  })
})
