/// <reference path="../pb_data/types.d.ts" />

// Storage used by a user: the original photos and receipts of all their cars
// and entries (thumbnails are not counted). Loaded via require() from the hooks.

const FILE_FIELDS = { cars: 'photos', entries: 'attachments' };

function usage(app, userId) {
  const fs = app.newFilesystem();
  let total = 0;
  try {
    const add = (record, field) => {
      for (const name of record.getStringSlice(field)) {
        try {
          total += fs.attributes(`${record.baseFilesPath()}/${name}`).size;
        } catch {} // missing file – nothing to count
      }
    };
    for (const car of app.findRecordsByFilter('cars', 'owner = {:user}', '', 0, 0, { user: userId })) {
      add(car, FILE_FIELDS.cars);
    }
    for (const entry of app.findRecordsByFilter('entries', 'car.owner = {:user}', '', 0, 0, { user: userId })) {
      add(entry, FILE_FIELDS.entries);
    }
  } finally {
    fs.close();
  }
  return total;
}

module.exports = { FILE_FIELDS, usage };
