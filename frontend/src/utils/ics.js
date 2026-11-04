// Fichier calendrier (.ics, RFC 5545) pour une séance : Google Agenda, Outlook, Calendrier iPhone.
import { endOf } from './time'

// 2026-11-01T21:30:00.000Z -> 20261101T213000Z
const toIcsDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Les antislashs, points-virgules, virgules et retours à la ligne doivent être échappés
const escape = (text = '') =>
  String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

export const showtimeIcs = ({ showtime, movie, now = new Date() }) => {
  const start = new Date(showtime.datetime)
  // durée connue : même fin que « fin vers » sur le site (film + bandes-annonces, arrondi aux 5 min) ;
  // durée inconnue : le site n'affiche pas de fin, l'agenda réserve 2 h pour avoir un événement utilisable
  const end = endOf(showtime.datetime, movie.duration) ?? new Date(start.getTime() + 120 * 60e3)
  const { cinema } = showtime
  const format = showtime.format && showtime.format !== 'Standard' ? ` (${showtime.format})` : ''
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bobine//Seances//FR',
    'BEGIN:VEVENT',
    `UID:${showtime._id}@bobine`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escape(`${movie.title}${format}`)}`,
    `LOCATION:${escape(`${cinema.name}, ${cinema.address}, ${cinema.city}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export const icsHref = (ics) => `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
