const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const requireApiKey = require('./requireApiKey');

let server;
let base;

test.before(async () => {
  const app = express();
  app.use('/api', requireApiKey);
  app.all('/api/thing', (req, res) => res.json({ ok: true }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}/api/thing`;
});

test.after(() => server.close());

test.beforeEach(() => { process.env.ADMIN_API_KEY = 'secret-de-test'; });

test('les lectures restent publiques', async () => {
  assert.strictEqual((await fetch(base)).status, 200);
});

test('une écriture sans clé est refusée (401)', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.strictEqual((await fetch(base, { method })).status, 401, method);
  }
});

test('une écriture avec une mauvaise clé est refusée (401)', async () => {
  const res = await fetch(base, { method: 'DELETE', headers: { 'x-api-key': 'secret-de-tes' } });
  assert.strictEqual(res.status, 401);
});

test('une écriture avec la bonne clé passe', async () => {
  const res = await fetch(base, { method: 'POST', headers: { 'x-api-key': 'secret-de-test' } });
  assert.strictEqual(res.status, 200);
});

test('sans ADMIN_API_KEY configurée, les écritures sont refusées (503)', async () => {
  delete process.env.ADMIN_API_KEY;
  const res = await fetch(base, { method: 'POST', headers: { 'x-api-key': '' } });
  assert.strictEqual(res.status, 503);
});
