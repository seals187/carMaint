/// <reference path="../pb_data/types.d.ts" />

// E-mail reminders: remembers which stage was mailed last ("soon", "today",
// "overdue-<week>", together with the due date/km), so every stage is sent only once.
// Reminders store it themselves, cars for the next MFK from the vehicle data.

migrate((app) => {
  for (const name of ['reminders', 'cars']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new TextField({ name: 'notified', max: 100 }));
    app.save(collection);
  }
}, (app) => {
  for (const name of ['reminders', 'cars']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.removeByName('notified');
    app.save(collection);
  }
});
