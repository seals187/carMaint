/// <reference path="../pb_data/types.d.ts" />

// Tyre swaps: which tyre set a tyres entry mounted (empty for other tyre work such as a
// puncture) and whether the tyres were new (the set's tyre distance starts again at zero).

migrate((app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.add(new SelectField({ name: 'tireSet', values: ['summer', 'winter'], maxSelect: 1 }));
  entries.fields.add(new BoolField({ name: 'newTires' }));
  app.save(entries);
}, (app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.removeByName('tireSet');
  entries.fields.removeByName('newTires');
  app.save(entries);
});
