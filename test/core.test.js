'use strict';

// Run: node --test   (e.g. docker run --rm -v "$PWD":/app -w /app node:22-alpine node --test)
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../pb_public/core.js');

const TODAY = '2026-11-24'; // a Tuesday

test('dates: addMonths keeps the day or uses the last day of the month', () => {
  assert.equal(core.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(core.addMonths('2026-11-24', 24), '2028-11-24');
  assert.equal(core.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(core.daysBetween('2026-11-24', '2026-12-01'), 7);
});

test('kmPerDay: measured from the oldest entry, default without enough data', () => {
  assert.equal(core.kmPerDay({ date: '2026-08-26', mileage: 10000 }, 19000, TODAY), 100); // 90 days, 9000 km
  assert.equal(core.kmPerDay({ date: '2026-11-10', mileage: 10000 }, 11000, TODAY), core.KM_PER_DAY_DEFAULT); // < 30 days
  assert.equal(core.kmPerDay(null, 50000, TODAY), core.KM_PER_DAY_DEFAULT);
});

test('inspectionReminder: only without an own inspection reminder', () => {
  assert.equal(core.inspectionReminder({}, []), null);
  assert.equal(core.inspectionReminder({ nextInspection: '2027-01-01' }, [{ type: 'inspection' }]), null);
  assert.deepEqual(core.inspectionReminder({ nextInspection: '2027-01-01' }, [{ type: 'service' }]),
    { virtual: true, type: 'inspection', dueDate: '2027-01-01', dueKm: 0, intervalKm: 0, intervalMonths: 0 });
});

const status = (r, ctx = {}) => core.reminderStatus(r, { mileage: 50000, today: TODAY, kmPerDay: 50, ...ctx });

test('reminderStatus: the limit reached first decides', () => {
  // 1000 km at 50 km/day = 20 days, date in 100 days
  const s = status({ dueKm: 51000, dueDate: core.addDays(TODAY, 100) });
  assert.equal(s.kmLeft, 1000);
  assert.equal(s.estDays, 20);
  assert.equal(s.soonest, 20);
  assert.equal(s.byKm, true);
  assert.equal(s.level, 'soon');
  // The same reminder for a car that drives little: the date comes first
  assert.equal(status({ dueKm: 51000, dueDate: core.addDays(TODAY, 100) }, { kmPerDay: 5 }).byKm, false);
});

test('reminderStatus: levels', () => {
  assert.equal(status({ dueDate: core.addDays(TODAY, -1) }).level, 'overdue');
  assert.equal(status({ dueKm: 50000 }).level, 'overdue');
  assert.equal(status({ dueDate: core.addDays(TODAY, 7) }).level, 'soon');
  assert.equal(status({ dueDate: core.addDays(TODAY, 60) }).level, 'upcoming');
  assert.equal(status({ dueKm: 52500 }).level, 'upcoming');
  assert.equal(status({ dueDate: core.addDays(TODAY, 61) }).level, 'later');
});

test('reminderStatus: overdue names the limit that was passed', () => {
  assert.equal(status({ dueKm: 49000, dueDate: core.addDays(TODAY, 30) }).byKm, true);
  assert.equal(status({ dueKm: 52000, dueDate: core.addDays(TODAY, -3) }).byKm, false);
  // Both passed: 1000 km over = 20 days ago, date 3 days ago -> km
  assert.equal(status({ dueKm: 49000, dueDate: core.addDays(TODAY, -3) }).byKm, true);
});

test('reminderStatus: progress of the interval', () => {
  assert.equal(status({ dueKm: 55000, intervalKm: 10000 }).progress, 0.5);
  assert.equal(status({ dueKm: 40000, intervalKm: 10000 }).progress, 1);
});

test('weekColumn: this week until Sunday, then next week', () => {
  const col = (days) => core.weekColumn(status({ dueDate: core.addDays(TODAY, days) }), TODAY);
  assert.equal(col(-1), 'overdue');
  assert.equal(col(5), 'soon'); // Sunday
  assert.equal(col(6), 'next');
  assert.equal(col(12), 'next');
  assert.equal(col(13), 'upcoming');
});
