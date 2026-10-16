/// <reference path="../pb_data/types.d.ts" />

// Grundschema von CarMaint: Benutzer (Login per Benutzername), Fahrzeuge, Einträge.
// Jeder Benutzer sieht nur seine eigenen Fahrzeuge und deren Einträge.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

migrate((app) => {
  // ---------- users ----------
  const users = app.findCollectionByNameOrId('users');

  users.fields.add(new TextField({
    name: 'username',
    required: true,
    min: 3,
    max: 32,
    pattern: '^[A-Za-z0-9._-]+$',
    presentable: true,
  }));
  users.fields.add(new SelectField({ name: 'role', required: true, maxSelect: 1, values: ['admin', 'user'] }));
  users.fields.add(new JSONField({ name: 'settings', maxSize: 10000 }));
  users.fields.getByName('email').required = false;
  users.addIndex('idx_users_username', true, 'username', '');

  users.passwordAuth.identityFields = ['username'];
  users.authAlert.enabled = false; // kein Mailversand konfiguriert

  // Eigenes Konto sehen/bearbeiten (ohne Rolle zu ändern); Admins verwalten alle Benutzer.
  users.listRule = 'id = @request.auth.id || @request.auth.role = "admin"';
  users.viewRule = 'id = @request.auth.id || @request.auth.role = "admin"';
  users.createRule = '@request.auth.role = "admin"';
  users.updateRule = '(id = @request.auth.id && @request.body.role:isset = false) || @request.auth.role = "admin"';
  users.deleteRule = '@request.auth.role = "admin" && id != @request.auth.id';
  users.manageRule = '@request.auth.role = "admin"';
  app.save(users);

  // ---------- cars ----------
  const cars = new Collection({
    type: 'base',
    name: 'cars',
    listRule: 'owner = @request.auth.id',
    viewRule: 'owner = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
    updateRule: 'owner = @request.auth.id && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)',
    deleteRule: 'owner = @request.auth.id',
    fields: [
      { type: 'relation', name: 'owner', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      { type: 'text', name: 'make', required: true, max: 100 },
      { type: 'text', name: 'model', required: true, max: 100 },
      { type: 'number', name: 'year', onlyInt: true },
      { type: 'text', name: 'plate', max: 30 },
      { type: 'number', name: 'mileage', onlyInt: true, min: 0 },
      { type: 'json', name: 'info', maxSize: 20000 },
      {
        type: 'file',
        name: 'photos',
        maxSelect: 99,
        maxSize: MAX_FILE_SIZE,
        mimeTypes: IMAGE_TYPES,
        thumbs: ['640x360', '300x225'],
        protected: true,
      },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_cars_owner ON cars (owner)'],
  });
  app.save(cars);

  // ---------- entries ----------
  const entries = new Collection({
    type: 'base',
    name: 'entries',
    listRule: 'car.owner = @request.auth.id',
    viewRule: 'car.owner = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.car.owner = @request.auth.id',
    updateRule: 'car.owner = @request.auth.id && (@request.body.car:isset = false || @request.body.car.owner = @request.auth.id)',
    deleteRule: 'car.owner = @request.auth.id',
    fields: [
      { type: 'relation', name: 'car', required: true, collectionId: cars.id, maxSelect: 1, cascadeDelete: true },
      { type: 'select', name: 'type', required: true, maxSelect: 1, values: ['service', 'repair', 'inspection', 'tires', 'other'] },
      { type: 'text', name: 'date', required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      { type: 'number', name: 'mileage', onlyInt: true, min: 0 },
      { type: 'text', name: 'title', required: true, max: 200 },
      { type: 'number', name: 'cost', min: 0 },
      { type: 'text', name: 'shop', max: 200 },
      { type: 'text', name: 'notes', max: 5000 },
      {
        type: 'file',
        name: 'attachments',
        maxSelect: 99,
        maxSize: MAX_FILE_SIZE,
        mimeTypes: [...IMAGE_TYPES, 'application/pdf'],
        thumbs: ['128x128'],
        protected: true,
      },
      // Originalnamen der Anhänge ({ gespeicherterName: "Rechnung März.pdf" }),
      // da der Server Dateinamen bereinigt (Umlaute, Leerzeichen).
      { type: 'json', name: 'attachmentNames', maxSize: 20000 },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_entries_car ON entries (car)'],
  });
  app.save(entries);
}, (app) => {
  for (const name of ['entries', 'cars']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch {}
  }
  const users = app.findCollectionByNameOrId('users');
  for (const name of ['username', 'role', 'settings']) users.fields.removeByName(name);
  users.removeIndex('idx_users_username');
  users.passwordAuth.identityFields = ['email'];
  app.save(users);
});
