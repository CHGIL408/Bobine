// Distance à vol d'oiseau en km entre deux points { lat, lng } (formule de haversine)
export const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// GeoJSON stocke [longitude, latitude]
export const cinemaPoint = (cinema) => {
  const [lng, lat] = cinema.location?.coordinates ?? []
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

// 3.24 -> "3,2 km" ; 0.42 -> "420 m"
export const formatDistance = (km) =>
  km < 1
    ? `${Math.round((km * 1000) / 10) * 10} m`
    : `${km.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} km`
