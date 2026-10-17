/// <reference path="../pb_data/types.d.ts" />

// New entry type "documents" (documents / vehicle registration) and a larger
// thumbnail size for attachments, used for the document previews.

migrate((app) => {
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.getByName('type').values = ['service', 'repair', 'inspection', 'tires', 'documents', 'other'];
  entries.fields.getByName('attachments').thumbs = ['128x128', '300x225'];
  app.save(entries);
}, (app) => {
  app.db().newQuery("UPDATE entries SET type = 'other' WHERE type = 'documents'").execute();
  const entries = app.findCollectionByNameOrId('entries');
  entries.fields.getByName('type').values = ['service', 'repair', 'inspection', 'tires', 'other'];
  entries.fields.getByName('attachments').thumbs = ['128x128'];
  app.save(entries);
});
