// Remplit les séances depuis Google (via SerpApi) : une recherche par cinéma.
// Usage : npm run sync-showtimes   (besoin de MONGODB_URI, TMDB_API_KEY, SERPAPI_API_KEY)
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Movie = require('./models/Movie');
const Cinema = require('./models/Cinema');
const Showtime = require('./models/Showtime');
const { getMovieById, searchMovieId } = require('./services/tmdb');

const TZ = 'America/Toronto'; // heure de Québec
// shortcut: une seule ville pour toutes les recherches ; à dériver de cinema.city si on ajoute une autre ville
const LOCATION = 'Quebec City,Quebec,Canada';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Date du jour à Québec, { y, m (0-11), d }
const todayInTz = (now = new Date()) => {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now).split('-').map(Number);
  return { y, m: m - 1, d };
};

// Instant UTC correspondant à une heure murale de Québec (gère l'heure d'été)
const zonedToUtc = (y, m, d, h, min) => {
  const guess = Date.UTC(y, m, d, h, min);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (asLocal - guess));
};

// "Today" / "Tomorrow" / date "Nov 8" -> { y, m, d } ; null si illisible
const parseDay = (dayObj, now = new Date()) => {
  const t = todayInTz(now);
  const label = `${dayObj.date ?? ''} ${dayObj.day ?? ''}`.toLowerCase();
  const md = label.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2})/);
  if (md && MONTHS.includes(md[1])) {
    const m = MONTHS.indexOf(md[1]);
    const y = m < t.m - 6 ? t.y + 1 : t.y; // "Jan 2" vu en décembre = l'an prochain
    return { y, m, d: Number(md[2]) };
  }
  const offset = label.includes('today') ? 0 : label.includes('tomorrow') ? 1 : null;
  if (offset === null) return null;
  const dt = new Date(Date.UTC(t.y, t.m, t.d + offset));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
};

// "3:15pm" / "15:15" -> { h, min } ; null si illisible
const parseTime = (s) => {
  const r = s.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*([ap])?\.?m?\.?$/);
  if (!r) return null;
  let h = Number(r[1]);
  if (r[3] === 'p' && h < 12) h += 12;
  if (r[3] === 'a' && h === 12) h = 0;
  return { h, min: Number(r[2]) };
};

// Type de salle Google -> format enregistré ; le premier qui correspond l'emporte
// shortcut: un type combiné (ex. "UltraAVX 3D") ne garde que le premier format reconnu
const FORMATS = [
  ['IMAX', /imax/i],
  ['ScreenX', /screen\s*x/i],
  ['DBOX', /d-?\s*box/i],
  ['UltraAVX', /ultra\s*avx/i],
  ['3D', /3d/i],
];
const toFormat = (type = '') => FORMATS.find(([, re]) => re.test(type))?.[0] ?? 'Standard';

// showtimes SerpApi (requête "cinéma") -> [{ title, datetime, format }], sans doublons (Google en renvoie parfois)
const flatten = (showtimes, now = new Date()) => {
  const seen = new Set();
  return showtimes.flatMap((day) => {
    const date = parseDay(day, now);
    if (!date) return [];
    return (day.movies ?? []).flatMap((movie) =>
      (movie.showing ?? []).flatMap((showing) =>
        (showing.time ?? []).map(parseTime).filter(Boolean).map(({ h, min }) => ({
          title: movie.name,
          datetime: zonedToUtc(date.y, date.m, date.d, h, min),
          format: toFormat(showing.type),
        })),
      ),
    );
  }).filter((r) => {
    const key = `${r.title}|${r.datetime.getTime()}|${r.format}`;
    return !seen.has(key) && seen.add(key);
  });
};

// Retrouve le film en base par son tmdbId, ou le crée depuis TMDB
const findOrCreateMovie = async (title, cache) => {
  if (cache.has(title)) return cache.get(title);
  const tmdbId = await searchMovieId(title);
  let movie = null;
  if (tmdbId) {
    movie = (await Movie.findOne({ tmdbId })) ?? (await Movie.create({ tmdbId, ...(await getMovieById(tmdbId)) }));
  }
  cache.set(title, movie);
  return movie;
};

const fetchShowtimes = async (cinema) => {
  const { data } = await axios.get('https://serpapi.com/search', {
    params: {
      engine: 'google',
      q: `${cinema.name} ${cinema.city}`,
      location: LOCATION,
      hl: 'en', // format documenté ("Today", "3:15pm") ; les titres sont retrouvés via TMDB
      gl: 'ca',
      api_key: process.env.SERPAPI_API_KEY,
    },
    timeout: 60000,
  });
  return data.showtimes ?? [];
};

const sync = async () => {
  for (const name of ['MONGODB_URI', 'TMDB_API_KEY', 'SERPAPI_API_KEY']) {
    if (!process.env[name]) throw new Error(`Variable manquante : ${name}`);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // Séances dont le film n'existe plus (anciens seeds)
  const movieIds = await Movie.distinct('_id');
  const orphans = await Showtime.deleteMany({ movie: { $nin: movieIds } });
  console.log(`${orphans.deletedCount} séance(s) orpheline(s) supprimée(s)`);

  const cache = new Map();
  const startOfToday = (({ y, m, d }) => zonedToUtc(y, m, d, 0, 0))(todayInTz());

  for (const cinema of await Cinema.find()) {
    const rows = flatten(await fetchShowtimes(cinema));
    if (!rows.length) {
      console.log(`${cinema.name} : aucune séance trouvée sur Google, séances existantes conservées`);
      continue;
    }
    const docs = [];
    for (const row of rows) {
      const movie = await findOrCreateMovie(row.title, cache);
      if (movie) docs.push({ movie: movie._id, cinema: cinema._id, datetime: row.datetime, format: row.format });
      else console.log(`  film introuvable sur TMDB : ${row.title}`);
    }
    // Remplace les séances à venir de ce cinéma ; l'historique est gardé
    await Showtime.deleteMany({ cinema: cinema._id, datetime: { $gte: startOfToday } });
    await Showtime.insertMany(docs);
    console.log(`${cinema.name} : ${docs.length} séance(s)`);
  }
};

if (require.main === module) {
  sync()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error('Erreur sync :', err.message);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = { parseDay, parseTime, zonedToUtc, flatten, toFormat };
