/// <reference path="../pb_data/types.d.ts" />

// New entry type "fuel" and a "reminders" collection: recurring maintenance
// that is due at a mileage and/or a date (e.g. oil change every 15'000 km / 12 months).

const TYPES = ['service', 'repair', 'inspection', 'tires', 'fuel', 'documents', 'other'];

migrate((app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.getByName('type').values = TYPES;
  app.save(entries);

  const cars = app.findCollectionByNameOrId('cars');
  const reminders = new Collection({
    type: 'base',
    name: 'reminders',
    listRule: 'car.owner = @request.auth.id',
    viewRule: 'car.owner = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.car.owner = @request.auth.id',
    updateRule: 'car.owner = @request.auth.id && (@request.body.car:isset = false || @request.body.car.owner = @request.auth.id)',
    deleteRule: 'car.owner = @request.auth.id',
    fields: [
      { type: 'relation', name: 'car', required: true, collectionId: cars.id, maxSelect: 1, cascadeDelete: true },
      { type: 'text', name: 'title', required: true, max: 200 },
      { type: 'select', name: 'type', required: true, maxSelect: 1, values: TYPES },
      { type: 'number', name: 'intervalKm', onlyInt: true, min: 0 },
      { type: 'number', name: 'intervalMonths', onlyInt: true, min: 0 },
      { type: 'number', name: 'dueKm', onlyInt: true, min: 0 },
      { type: 'text', name: 'dueDate', pattern: '^(\\d{4}-\\d{2}-\\d{2})?$' },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_reminders_car ON reminders (car)'],
  });
  app.save(reminders);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('reminders')); } catch {}
  app.db().newQuery("UPDATE entries SET type = 'other' WHERE type = 'fuel'").execute();
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.getByName('type').values = TYPES.filter((type) => type !== 'fuel');
  app.save(entries);
});
