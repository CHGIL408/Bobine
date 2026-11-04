// Dates et heures des séances, toujours en heure de Québec, quel que soit le fuseau du visiteur
export const TZ = 'America/Toronto'

// Date -> "2026-11-01"
export const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)

// "2026-11-01" -> "2026-11-02" : par le calendrier, pas en ajoutant 24 h (faux les jours de 23 h ou 25 h)
export const nextDayKey = (key) => {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ISO -> "16 h 30"
export const time = (iso) =>
  new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

// Format de salle affiché ; absent ou Standard -> "STD"
export const formatLabel = (format) => (!format || format === 'Standard' ? 'STD' : format)

// Séance -> "18 h 30 STD" / "18 h 30 DBOX"
export const timeWithFormat = (s) => `${time(s.datetime)} ${formatLabel(s.format)}`

// ISO -> minutes depuis minuit (16 h 30 -> 990)
export const minutesOfDay = (iso) => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(iso))
    .split(':')
    .map(Number)
  return h * 60 + m
}

// "2026-11-01" -> "Aujourd'hui" / "Demain" / "mar. 3 nov."
export const dayLabel = (key, now = new Date()) => {
  if (key === dayKey(now)) return "Aujourd'hui"
  if (key === nextDayKey(dayKey(now))) return 'Demain'
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-CA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

// Bandes-annonces et publicités avant le film, chez Cineplex : environ 15 min
export const TRAILERS_MINUTES = 15

// Heure de fin estimée d'une séance (Date, pour l'agenda), arrondie aux 5 min suivantes ; null si la durée est inconnue
export const endOf = (iso, duration) => {
  if (!duration) return null
  const end = new Date(iso).getTime() + (duration + TRAILERS_MINUTES) * 60e3
  const step = 5 * 60e3
  return new Date(Math.ceil(end / step) * step)
}
