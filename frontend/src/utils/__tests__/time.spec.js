import { describe, it, expect } from 'vitest'
import { dayLabel, endOf, endLabel, nextDayKey } from '../time'

describe('heure de fin', () => {
  it('ajoute la durée et 15 min de bandes-annonces, arrondi aux 5 min suivantes', () => {
    // 19 h 10 à Québec (UTC-5) + 112 min + 15 min = 21 h 17 -> 21 h 20
    const start = '2026-11-02T00:10:00.000Z'
    expect(endOf(start, 112).toISOString()).toBe('2026-11-02T02:20:00.000Z')
    expect(endLabel(start, 112)).toBe('fin vers 21 h 20')
  })

  it('garde une heure déjà ronde', () => {
    expect(endLabel('2026-11-02T00:00:00.000Z', 105)).toBe('fin vers 21 h 00')
  })

  it("n'affiche rien quand la durée est inconnue", () => {
    expect(endOf('2026-11-02T00:00:00.000Z', null)).toBeNull()
    expect(endLabel('2026-11-02T00:00:00.000Z', 0)).toBe('')
  })

  it('passe au jour suivant par le calendrier, même la nuit du changement d’heure', () => {
    expect(nextDayKey('2026-11-01')).toBe('2026-11-02') // journée de 25 h à Québec
    expect(nextDayKey('2027-03-14')).toBe('2027-03-15') // journée de 23 h
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01')
    // 1er nov. 2026, 23 h 30 à Québec : + 24 h tomberait encore le 2 nov. à 22 h 30, mais « Demain » = 2 nov.
    expect(dayLabel('2026-11-02', new Date('2026-11-02T04:30:00Z'))).toBe('Demain')
  })
})
