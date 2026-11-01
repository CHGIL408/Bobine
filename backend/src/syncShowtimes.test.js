const test = require('node:test');
const assert = require('node:assert');
const { parseDay, parseTime, zonedToUtc, flatten, toFormat } = require('./syncShowtimes');

// 1er novembre 2026, 11:00 à Montréal (16:00 UTC ; l'heure d'été finit ce jour-là à 2 h)
const NOW = new Date('2026-11-01T16:00:00Z');

test('parseTime lit les heures Google', () => {
  assert.deepStrictEqual(parseTime('3:15pm'), { h: 15, min: 15 });
  assert.deepStrictEqual(parseTime('12:05am'), { h: 0, min: 5 });
  assert.deepStrictEqual(parseTime('12:30pm'), { h: 12, min: 30 });
  assert.deepStrictEqual(parseTime('21:40'), { h: 21, min: 40 });
  assert.strictEqual(parseTime('soon'), null);
});

test('parseDay lit Today, Tomorrow et les dates', () => {
  assert.deepStrictEqual(parseDay({ day: 'Today' }, NOW), { y: 2026, m: 10, d: 1 });
  assert.deepStrictEqual(parseDay({ day: 'Tomorrow' }, NOW), { y: 2026, m: 10, d: 2 });
  assert.deepStrictEqual(parseDay({ day: 'Sat', date: 'Nov 8' }, NOW), { y: 2026, m: 10, d: 8 });
  assert.deepStrictEqual(parseDay({ date: 'Jan 3' }, new Date('2026-12-30T16:00:00Z')), { y: 2027, m: 0, d: 3 });
  assert.strictEqual(parseDay({ day: 'Mon' }, NOW), null);
});

test("zonedToUtc gère l'heure d'été et d'hiver de Montréal", () => {
  assert.strictEqual(zonedToUtc(2026, 6, 1, 19, 0).toISOString(), '2026-07-01T23:00:00.000Z'); // UTC-4
  assert.strictEqual(zonedToUtc(2026, 11, 1, 19, 0).toISOString(), '2026-12-02T00:00:00.000Z'); // UTC-5
});

test('flatten transforme la réponse SerpApi en séances', () => {
  const showtimes = [
    {
      day: 'Today',
      movies: [
        {
          name: 'Eternals',
          showing: [
            { time: ['3:15pm', '6:45pm'], type: 'Standard' },
            { time: ['7:00pm'], type: 'IMAX' },
          ],
        },
      ],
    },
    { day: 'Mon', movies: [{ name: 'Ignoré', showing: [{ time: ['1:00pm'] }] }] },
  ];
  const rows = flatten(showtimes, NOW);
  assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows[0], {
    title: 'Eternals',
    datetime: new Date('2026-11-01T20:15:00.000Z'), // 15:15 heure normale (UTC-5)
    format: 'Standard',
  });
  assert.strictEqual(rows[2].format, 'IMAX');
  assert.strictEqual(toFormat('Dolby Cinema'), 'Standard');
});
