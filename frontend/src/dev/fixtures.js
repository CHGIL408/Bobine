// Outil de développement seulement : données extrêmes pour tester l'affichage (?data=worst|empty|one|huge).
// Chargé uniquement en mode dev (voir services/api.js) ; jamais inclus dans le build de production.

const CINEMAS = [
  { _id: 'c1', name: 'Cinéma Cineplex Odeon Beauport', address: '825 Rue Clemenceau', city: 'Québec', website: 'https://www.cineplex.com/' },
  // nom le plus long des vrais cinémas
  { _id: 'c2', name: 'Cinéma Cineplex IMAX aux Galeries de la Capitale', address: '5401 Boul. des Galeries', city: 'Québec', website: 'https://www.cineplex.com/' },
  // un cinéma indépendant qu'on pourrait ajouter : pas de préfixe « Cinéma Cineplex » à raccourcir
  { _id: 'c3', name: 'Cinéma Le Clap Sainte-Foy (salles Lebourgneuf et Place Sainte-Foy)', address: '2360 Chemin Sainte-Foy', city: 'Québec', website: null },
]

const MOVIES = [
  // titre très long, vrai cas de projection événement
  { _id: 'm1', title: "Stray Kids World Tour 'dominATE' : Live au cinéma — édition spéciale avec contenu inédit", duration: 155, poster: null, genre: ['Musique'], rating: 0 },
  // film de plus de 4 h : la fin passe minuit
  { _id: 'm2', title: 'Hamlet (version intégrale de Kenneth Branagh)', duration: 242, poster: 'https://image.tmdb.org/t/p/w500/inexistant-404.jpg', genre: ['Drame'], rating: 7.8 },
  // un seul caractère
  { _id: 'm3', title: 'M', duration: 117, poster: 'https://image.tmdb.org/t/p/w500/x6IcV3s0yuqXyeRqHUz0gShrqCR.jpg', genre: ['Thriller'], rating: 8.1 },
  // titre non traduit, sans espaces
  { _id: 'm4', title: '神探之痕迹', duration: 0, poster: null, genre: ['Crime'], rating: 6.2 },
  // durée inconnue
  { _id: 'm5', title: 'Avant-première surprise', duration: null, poster: null, genre: [], rating: null },
  { _id: 'm6', title: 'Wicker', duration: 105, poster: 'https://image.tmdb.org/t/p/w500/x6IcV3s0yuqXyeRqHUz0gShrqCR.jpg', genre: ['Romance'], rating: 7.6 },
]

const FORMATS = ['Standard', 'IMAX', '3D', 'UltraAVX', 'ScreenX', 'DBOX', 'VF', 'VOST']

// Minuit ce soir, heure de Québec (approximation suffisante pour un outil de dev)
const quebecMidnight = (now) => {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }))
  const offset = now.getTime() - local.getTime()
  local.setHours(24, 0, 0, 0)
  return new Date(local.getTime() + offset)
}

const showtime = (id, movie, cinema, date, format = 'Standard') => ({
  _id: id,
  movie,
  cinema,
  datetime: date.toISOString(),
  format,
})

const worstShowtimes = (now) => {
  const min = (m) => new Date(now.getTime() + m * 60e3)
  const midnight = quebecMidnight(now)
  const beforeMidnight = (m) => new Date(midnight.getTime() - m * 60e3)
  return [
    showtime('w1', 'm2', 'c3', min(-14), 'VOST'), // commencée il y a 14 min, titre long, cinéma au nom long
    showtime('w2', 'm1', 'c2', min(-14), 'IMAX'), // même minute, autre cinéma
    showtime('w3', 'm3', 'c1', min(5), 'DBOX'),
    showtime('w4', 'm3', 'c1', min(5), 'DBOX'), // doublon exact (Google le renvoie parfois)
    showtime('w5', 'm4', 'c2', min(35), 'ScreenX'),
    showtime('w6', 'm5', 'c3', min(65), 'UltraAVX'),
    showtime('w7', 'm6', 'c1', min(66), '3D'),
    showtime('w8', 'm1', 'c3', min(67), 'VF'),
    showtime('w9', 'gone', 'c1', min(70)), // film supprimé de la base
    showtime('w10', 'm2', 'c2', beforeMidnight(1), 'IMAX'), // 23 h 59 : fin vers 4 h du matin
    showtime('w11', 'm6', 'c1', midnight), // minuit pile : c'est demain
    showtime('w12', 'm6', 'c2', new Date(midnight.getTime() + 13 * 3600e3)),
  ]
}

const hugeShowtimes = (now) => {
  const list = []
  for (let i = 0; i < 300; i++) {
    const m = MOVIES[i % MOVIES.length]
    list.push(showtime(`h${i}`, m._id, CINEMAS[i % 3]._id, new Date(now.getTime() + (i % 150) * 2 * 60e3), FORMATS[i % 8]))
  }
  return list.sort((a, b) => a.datetime.localeCompare(b.datetime))
}

// kind : worst | empty | one | huge ; what : movies | cinemas | showtimes | movie | movieShowtimes | comingSoon
export const fixture = (kind, what, id) => {
  const now = new Date()
  const showtimes =
    kind === 'empty' ? [] : kind === 'one' ? worstShowtimes(now).slice(2, 3) : kind === 'huge' ? hugeShowtimes(now) : worstShowtimes(now)
  const populate = (s) => ({
    ...s,
    movie: MOVIES.find((m) => m._id === s.movie) ?? s.movie,
    cinema: CINEMAS.find((c) => c._id === s.cinema),
  })
  switch (what) {
    case 'movies':
      return kind === 'empty' ? [] : kind === 'one' ? MOVIES.slice(2, 3) : MOVIES
    case 'cinemas':
      return kind === 'one' ? CINEMAS.slice(0, 1) : CINEMAS
    case 'showtimes':
      return showtimes
    case 'movie':
      return MOVIES.find((m) => m._id === id) ?? MOVIES[1]
    case 'movieShowtimes':
      // tous les formats et un cinéma très chargé pour la fiche film
      return kind === 'empty'
        ? []
        : [...showtimes, ...hugeShowtimes(now).slice(0, 40)].filter((s) => s.movie === (id ?? 'm2')).map(populate)
    case 'comingSoon':
      return []
    default:
      return []
  }
}
