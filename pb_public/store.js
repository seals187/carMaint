'use strict';

// Record store: the user's cars, entries, reminders and documents, kept in memory
// and in sync with PocketBase. Every write goes through save/remove/upload, so the
// local copy, dependent records and cached files stay consistent.
// Global CarMaintStore in the browser; require() in tests (test/store.test.js).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CarMaintStore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const LISTS = { cars: '&sort=created', entries: '', reminders: '', documents: '&sort=created' };
  const UPLOAD_CHUNK = 24 * 1024 * 1024; // stay below the server limit (32 MB) per request

  const path = (list, id = '') => `/api/collections/${list}/records${id ? `/${id}` : ''}`;

  // request(method, path, body) -> parsed JSON (throws on errors), e.g. the app's api().
  // forget(list, id, name): files of a record (or one file with name) changed on the server.
  function createStore({ request, forget = () => {}, chunk = UPLOAD_CHUNK }) {
    const db = Object.fromEntries(Object.keys(LISTS).map((list) => [list, []]));

    async function listAll(list, query = '') {
      const items = [];
      for (let page = 1; ; page++) {
        const res = await request('GET', `${path(list)}?page=${page}&perPage=500${query}`);
        items.push(...res.items);
        if (page >= res.totalPages) return items;
      }
    }

    async function load() {
      const lists = Object.keys(LISTS);
      const loaded = await Promise.all(lists.map((list) => listAll(list, LISTS[list])));
      lists.forEach((list, i) => { db[list] = loaded[i]; });
    }

    function reset() {
      for (const list of Object.keys(LISTS)) db[list] = [];
    }

    const byId = (list, id) => db[list].find((r) => r.id === id);

    function keep(list, record) {
      const i = db[list].findIndex((r) => r.id === record.id);
      if (i >= 0) db[list][i] = record;
      else db[list].push(record);
      return record;
    }

    function drop(list, gone) {
      for (const r of db[list].filter(gone)) forget(list, r.id);
      db[list] = db[list].filter((r) => !gone(r));
    }

    // Creates (without id) or updates a record. Files removed with "<field>-": [names]
    // leave the file cache.
    async function save(list, data, id = '') {
      const record = await request(id ? 'PATCH' : 'POST', path(list, id), data);
      for (const [key, names] of Object.entries(data)) {
        if (key.endsWith('-') && Array.isArray(names)) names.forEach((name) => forget(list, record.id, name));
      }
      return keep(list, record);
    }

    // Deletes a record with what depends on it: a car with its entries, reminders and
    // documents (the server cascades), a document with its reminder.
    async function remove(list, id) {
      const doc = list === 'documents' && byId(list, id);
      if (doc && doc.reminder) {
        await request('DELETE', path('reminders', doc.reminder)).catch(() => {});
        drop('reminders', (r) => r.id === doc.reminder);
      }
      await request('DELETE', path(list, id));
      drop(list, (r) => r.id === id);
      if (list === 'cars') for (const dep of ['entries', 'reminders', 'documents']) drop(dep, (r) => r.car === id);
    }

    // Attaches files ({ blob, name }) in batches, so a single request never gets too large.
    async function upload(list, id, field, files) {
      let record = byId(list, id) ?? null;
      let batch = new FormData();
      let size = 0;
      let count = 0;
      const flush = async () => {
        if (!count) return;
        record = await request('PATCH', path(list, id), batch);
        batch = new FormData();
        size = 0;
        count = 0;
      };
      for (const f of files) {
        if (count && size + f.blob.size > chunk) await flush();
        batch.append(`${field}+`, f.blob, f.name);
        size += f.blob.size;
        count++;
      }
      await flush();
      return record ? keep(list, record) : record;
    }

    return { db, listAll, load, reset, byId, save, remove, upload };
  }

  return { createStore };
});
