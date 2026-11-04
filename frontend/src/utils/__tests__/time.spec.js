import { describe, it, expect } from 'vitest'
import { dayLabel, endOf, nextDayKey } from '../time'

describe('heure de fin (agenda)', () => {
  it('ajoute la durée et 15 min de bandes-annonces, arrondi aux 5 min suivantes', () => {
    // 19 h 10 à Québec (UTC-5) + 112 min + 15 min = 21 h 17 -> 21 h 20
    expect(endOf('2026-11-02T00:10:00.000Z', 112).toISOString()).toBe('2026-11-02T02:20:00.000Z')
    // heure déjà ronde : 19 h 00 + 105 + 15 = 21 h 00
    expect(endOf('2026-11-02T00:00:00.000Z', 105).toISOString()).toBe('2026-11-02T02:00:00.000Z')
  })

  it('renvoie null quand la durée est inconnue', () => {
    expect(endOf('2026-11-02T00:00:00.000Z', null)).toBeNull()
    expect(endOf('2026-11-02T00:00:00.000Z', 0)).toBeNull()
  })
})

describe('jour suivant', () => {
  it('passe au jour suivant par le calendrier, même la nuit du changement d’heure', () => {
    expect(nextDayKey('2026-11-01')).toBe('2026-11-02') // journée de 25 h à Québec
    expect(nextDayKey('2027-03-14')).toBe('2027-03-15') // journée de 23 h
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01')
    // 1er nov. 2026, 23 h 30 à Québec : + 24 h tomberait encore le 1er nov., mais « Demain » = 2 nov.
    expect(dayLabel('2026-11-02', new Date('2026-11-02T04:30:00Z'))).toBe('Demain')
  })
})
