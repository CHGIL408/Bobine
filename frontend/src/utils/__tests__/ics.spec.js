import { describe, it, expect } from 'vitest'
import { showtimeIcs, icsHref } from '../ics'

const cinema = { name: 'Cinéma Cineplex Odeon Ste-Foy', address: '1200 Autoroute Duplessis', city: 'Québec' }
const showtime = { _id: 's1', cinema, datetime: '2026-11-01T21:30:00.000Z', format: 'IMAX' }

describe('showtimeIcs', () => {
  it('crée un événement avec début, fin selon la durée du film et lieu', () => {
    const ics = showtimeIcs({
      showtime,
      movie: { title: 'Resident Evil', duration: 95 },
      now: new Date('2026-11-01T12:00:00Z'),
    })
    const lines = ics.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines.at(-1)).toBe('END:VCALENDAR')
    expect(lines).toContain('UID:s1@bobine')
    expect(lines).toContain('DTSTAMP:20261101T120000Z')
    expect(lines).toContain('DTSTART:20261101T213000Z')
    expect(lines).toContain('DTEND:20261101T230500Z')
    expect(lines).toContain('SUMMARY:Resident Evil (IMAX)')
    expect(lines).toContain('LOCATION:Cinéma Cineplex Odeon Ste-Foy\\, 1200 Autoroute Duplessis\\, Québec')
  })

  it('échappe les caractères spéciaux et prend 2 h si la durée est inconnue', () => {
    const ics = showtimeIcs({
      showtime: { ...showtime, format: 'Standard' },
      movie: { title: 'Dune; Partie 2, la suite\\fin' },
    })
    expect(ics).toContain('SUMMARY:Dune\\; Partie 2\\, la suite\\\\fin\r\n')
    expect(ics).toContain('DTEND:20261101T233000Z')
  })

  it('produit un lien téléchargeable', () => {
    expect(icsHref('A B')).toBe('data:text/calendar;charset=utf-8,A%20B')
  })
})
