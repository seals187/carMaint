/// <reference path="../pb_data/types.d.ts" />

// Refuels: litres and whether the tank was only partly filled (fuel consumption runs
// from one full tank to the next). Empty values mean "no litres" and "full tank",
// so existing refuels keep counting for costs only.

migrate((app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.add(new NumberField({ name: 'litres', min: 0 }));
  entries.fields.add(new BoolField({ name: 'partial' }));
  app.save(entries);
}, (app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.removeByName('litres');
  entries.fields.removeByName('partial');
  app.save(entries);
});
