import { describe, it, expect } from 'vitest'
import { distanceKm, cinemaPoint, formatDistance } from '../geo'

describe('geo', () => {
  it('calcule la distance à vol d’oiseau', () => {
    // Château Frontenac -> Galeries de la Capitale : environ 6,9 km
    const km = distanceKm({ lat: 46.8119, lng: -71.2049 }, { lat: 46.8335, lng: -71.2875 })
    expect(km).toBeGreaterThan(6.5)
    expect(km).toBeLessThan(7.2)
    expect(distanceKm({ lat: 46.8, lng: -71.2 }, { lat: 46.8, lng: -71.2 })).toBe(0)
  })

  it('lit les coordonnées GeoJSON [longitude, latitude] du cinéma', () => {
    expect(cinemaPoint({ location: { coordinates: [-71.2875, 46.8335] } })).toEqual({ lat: 46.8335, lng: -71.2875 })
    expect(cinemaPoint({})).toBeNull()
    expect(cinemaPoint({ location: { coordinates: [] } })).toBeNull()
  })

  it('formate en mètres sous 1 km, sinon en km', () => {
    expect(formatDistance(0.423)).toBe('420 m')
    expect(formatDistance(3.24)).toBe('3,2 km')
    expect(formatDistance(12)).toBe('12 km')
  })
})
