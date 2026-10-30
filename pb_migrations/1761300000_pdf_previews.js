/// <reference path="../pb_data/types.d.ts" />

// PDF previews: the first pages of PDF receipts and documents rendered as JPG
// (pb_hooks/previews.js), plus the size and page count of every attachment
// ({ storedName: { size, pages, previews: [...] } }).

migrate((app) => {
  for (const name of ['entries', 'documents']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new FileField({
      name: 'previews',
      maxSelect: 999,
      maxSize: 10 * 1024 * 1024,
      mimeTypes: ['image/jpeg'],
      thumbs: ['120x160t', '300x225t'],
      protected: true,
    }));
    collection.fields.add(new JSONField({ name: 'fileInfo', maxSize: 200000 }));
    app.save(collection);
  }
}, (app) => {
  for (const name of ['entries', 'documents']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.removeByName('previews');
    collection.fields.removeByName('fileInfo');
    app.save(collection);
  }
});
