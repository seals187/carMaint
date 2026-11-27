/// <reference path="../pb_data/types.d.ts" />

// New type "fixed" for entries and reminders: costs of owning a car that do not depend on
// driving or repairs (insurance, road tax, motorway vignette).

migrate((app) => {
  for (const name of ['entries', 'reminders']) {
    const collection = app.findCollectionByNameOrId(name);
    const field = collection.fields.getByName('type');
    if (!field.values.includes('fixed')) field.values = [...field.values.filter((v) => v !== 'other'), 'fixed', 'other'];
    app.save(collection);
  }
}, (app) => {
  for (const name of ['entries', 'reminders']) {
    app.db().newQuery(`UPDATE ${name} SET type = 'other' WHERE type = 'fixed'`).execute();
    const collection = app.findCollectionByNameOrId(name);
    const field = collection.fields.getByName('type');
    field.values = field.values.filter((v) => v !== 'fixed');
    app.save(collection);
  }
});
