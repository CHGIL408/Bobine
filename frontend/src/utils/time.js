// Dates et heures des séances, toujours en heure de Québec, quel que soit le fuseau du visiteur
export const TZ = 'America/Toronto'

// Date -> "2026-11-01"
export const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)

// ISO -> "16 h 30"
export const time = (iso) =>
  new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

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
  if (key === dayKey(new Date(now.getTime() + 864e5))) return 'Demain'
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('fr-CA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
