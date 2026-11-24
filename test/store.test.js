'use strict';

// The store against an in-memory PocketBase (same request interface as the app's api()).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../pb_public/store.js');

function fakeServer(seed = {}) {
  const data = { cars: [], entries: [], reminders: [], documents: [], ...seed };
  const calls = [];
  let next = 1;
  async function request(method, path, body) {
    calls.push(`${method} ${path.replace(/\?.*/, '')}`);
    const [, list, id] = path.match(/^\/api\/collections\/(\w+)\/records(?:\/(\w+))?/);
    const items = data[list];
    if (method === 'GET') return { items: items.map((r) => ({ ...r })), totalPages: 1 };
    if (method === 'DELETE') {
      if (!items.some((r) => r.id === id)) throw Object.assign(new Error('not found'), { status: 404 });
      data[list] = items.filter((r) => r.id !== id);
      if (list === 'cars') for (const dep of ['entries', 'reminders', 'documents']) data[dep] = data[dep].filter((r) => r.car !== id);
      return null;
    }
    const record = id ? items.find((r) => r.id === id) : { id: `r${next++}`, attachments: [], photos: [] };
    if (!id) items.push(record);
    if (body instanceof FormData) {
      for (const [key, file] of body.entries()) record[key.slice(0, -1)].push(file.name);
    } else {
      for (const [key, value] of Object.entries(body)) {
        if (key.endsWith('-')) record[key.slice(0, -1)] = record[key.slice(0, -1)].filter((n) => !value.includes(n));
        else record[key] = value;
      }
    }
    return { ...record };
  }
  return { data, calls, request };
}

const setup = async (seed) => {
  const server = fakeServer(seed);
  const forgotten = [];
  const store = createStore({ request: server.request, forget: (...a) => forgotten.push(a.join('/')), chunk: 10 });
  await store.load();
  return { server, store, forgotten };
};

test('save creates and updates, keeping the local copy', async () => {
  const { store } = await setup();
  const car = await store.save('cars', { make: 'Skoda' });
  assert.equal(store.db.cars.length, 1);
  await store.save('cars', { mileage: 5 }, car.id);
  assert.equal(store.byId('cars', car.id).mileage, 5);
  assert.equal(store.db.cars.length, 1);
});

test('removing files with "<field>-" forgets them in the file cache', async () => {
  const { store, forgotten } = await setup({ entries: [{ id: 'e1', car: 'c1', attachments: ['a.pdf', 'b.pdf'] }] });
  await store.save('entries', { 'attachments-': ['a.pdf'] }, 'e1');
  assert.deepEqual(store.byId('entries', 'e1').attachments, ['b.pdf']);
  assert.deepEqual(forgotten, ['entries/e1/a.pdf']);
});

test('removing a car drops its entries, reminders and documents with their files', async () => {
  const { store, forgotten } = await setup({
    cars: [{ id: 'c1' }, { id: 'c2' }],
    entries: [{ id: 'e1', car: 'c1' }, { id: 'e2', car: 'c2' }],
    reminders: [{ id: 'r1', car: 'c1' }],
    documents: [{ id: 'd1', car: 'c1' }],
  });
  await store.remove('cars', 'c1');
  assert.deepEqual(store.db.cars.map((c) => c.id), ['c2']);
  assert.deepEqual(store.db.entries.map((e) => e.id), ['e2']);
  assert.equal(store.db.reminders.length, 0);
  assert.equal(store.db.documents.length, 0);
  assert.deepEqual(forgotten.sort(), ['cars/c1', 'documents/d1', 'entries/e1', 'reminders/r1']);
});

test('removing a document removes its reminder too', async () => {
  const { store, server } = await setup({
    documents: [{ id: 'd1', car: 'c1', reminder: 'r1' }],
    reminders: [{ id: 'r1', car: 'c1' }, { id: 'r2', car: 'c1' }],
  });
  await store.remove('documents', 'd1');
  assert.deepEqual(store.db.reminders.map((r) => r.id), ['r2']);
  assert.deepEqual(server.data.reminders.map((r) => r.id), ['r2']);
});

test('upload sends files in batches below the chunk size', async () => {
  const { store, server } = await setup({ cars: [{ id: 'c1', photos: [] }] });
  const file = (name, size) => ({ name, blob: new Blob(['x'.repeat(size)]) });
  const car = await store.upload('cars', 'c1', 'photos', [file('a', 6), file('b', 6), file('c', 2)]);
  assert.deepEqual(car.photos, ['a', 'b', 'c']);
  assert.equal(server.calls.filter((c) => c.startsWith('PATCH')).length, 2); // a | b+c
  assert.deepEqual(store.byId('cars', 'c1').photos, ['a', 'b', 'c']);
});
