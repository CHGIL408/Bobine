const test = require('node:test');
const assert = require('node:assert');
const Cinema = require('./Cinema');

const cinema = (website) => new Cinema({ name: 'Odeon', address: '1 rue', city: 'Québec', website });

test('website accepte http(s) et refuse javascript:', () => {
  assert.strictEqual(cinema('https://www.cineplex.com/fr').validateSync(), undefined);
  assert.strictEqual(cinema('HTTP://exemple.ca').validateSync(), undefined);
  assert.strictEqual(cinema(undefined).validateSync(), undefined);
  assert.ok(cinema('javascript:alert(1)').validateSync().errors.website);
  assert.ok(cinema(' https://x.ca').validateSync().errors.website);
});
