/// <reference path="../pb_data/types.d.ts" />

// Documents of a car (registration, driving licence, insurance, warranty, …) as
// their own collection with an optional expiry date, instead of history entries
// of type "documents". Existing document entries are moved by the website.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // adjusted on startup (MAX_FILE_SIZE_MB)

migrate((app) => {
  const cars = app.findCollectionByNameOrId('cars');
  const reminders = app.findCollectionByNameOrId('reminders');
  const documents = new Collection({
    type: 'base',
    name: 'documents',
    listRule: 'car.owner = @request.auth.id',
    viewRule: 'car.owner = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.car.owner = @request.auth.id',
    updateRule: 'car.owner = @request.auth.id && (@request.body.car:isset = false || @request.body.car.owner = @request.auth.id)',
    deleteRule: 'car.owner = @request.auth.id',
    fields: [
      { type: 'relation', name: 'car', required: true, collectionId: cars.id, maxSelect: 1, cascadeDelete: true },
      { type: 'select', name: 'kind', required: true, maxSelect: 1, values: ['registration', 'license', 'insurance', 'warranty', 'other'] },
      { type: 'text', name: 'title', required: true, max: 200 },
      { type: 'text', name: 'validUntil', pattern: '^(\\d{4}-\\d{2}-\\d{2})?$' },
      {
        type: 'file',
        name: 'attachments',
        maxSelect: 99,
        maxSize: MAX_FILE_SIZE,
        mimeTypes: [...IMAGE_TYPES, 'application/pdf'],
        thumbs: ['128x128', '300x225'],
        protected: true,
      },
      // Original file names ({ storedName: "Police 2026.pdf" }), see entries
      { type: 'json', name: 'attachmentNames', maxSize: 20000 },
      // Reminder before the document expires (optional)
      { type: 'relation', name: 'reminder', collectionId: reminders.id, maxSelect: 1, cascadeDelete: false },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_documents_car ON documents (car)'],
  });
  app.save(documents);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('documents')); } catch {}
});
