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

/* ---------- Costs ---------- */

const e = (date, type, cost, mileage = 0, car = 'a') => ({ car, date, type, cost, mileage });
const cars = [{ id: 'a', mileage: 21000 }, { id: 'b', mileage: 0 }];
const entries = [
  e('2025-03-10', 'service', 300, 10000),
  e('2025-12-01', 'fuel', 100, 14000),
  e('2026-02-01', 'fuel', 100, 16000),
  e('2026-04-15', 'repair', 1000, 18000),
  e('2026-06-01', 'service', 200, 20000),
  e('2026-05-01', 'tires', 400, 0, 'b'),
];

test('runningCostPerKm: without fuel, over the km known incl. the current mileage', () => {
  // car a: 1500 without fuel over 21000 - 10000 km
  assert.equal(core.runningCostPerKm([cars[0]], entries), 1500 / 11000);
  assert.equal(core.runningCostPerKm([cars[1]], entries), null); // no km known
});

test('kmDriven: current mileage only when asked', () => {
  assert.equal(core.kmDriven([cars[0]], entries, true), 11000);
  assert.equal(core.kmDriven([cars[0]], entries, false), 10000);
});

test('yearFigures: running year compared with the same months of the year before', () => {
  const f = core.yearFigures({ entries: entries.filter((x) => x.car === 'a'), cars: [cars[0]], year: '2026', today: '2026-06-15' });
  assert.equal(f.current, true);
  assert.equal(f.months, 6);
  assert.equal(f.total, 1300);
  assert.equal(f.avg, 1300 / 6);
  assert.equal(f.prevSameTotal, 300); // only March 2025
  assert.equal(f.prevTypes.service, 300);
  assert.equal(f.projection, 1300 / 6 * 12);
  assert.equal(f.noFuel, 1200);
  assert.equal(f.driven, 21000 - 16000);
  assert.equal(f.perKm, 1300 / 5000);
  assert.equal(f.buckets[3].top, 'repair'); // April: 1000 >= 2 × avg, all repair
  assert.equal(f.buckets[5].future, false);
  assert.equal(f.buckets[6].future, true);
  assert.equal(f.buckets[2].prev, 300);
  assert.deepEqual(f.buckets[1].parts, [{ key: 'fuel', value: 100 }]);
});

test('yearFigures: parts by any key, e.g. by car', () => {
  const f = core.yearFigures({ entries, cars, year: '2026', today: '2026-12-31', keys: ['a', 'b'], keyOf: (x) => x.car });
  assert.equal(f.projection, null);
  assert.deepEqual(f.buckets[4].parts, [{ key: 'b', value: 400 }]);
});

test('allYearsFigures: full years, extrapolation and the running year', () => {
  const f = core.allYearsFigures({ entries, cars, today: '2026-06-15', purchaseDate: '2025-01-05' });
  assert.equal(f.first, '2025-01-05');
  assert.deepEqual(f.years, ['2025', '2026']);
  assert.deepEqual(f.full, ['2025']);
  assert.equal(f.perYear, 400);
  assert.equal(f.total, 2100);
  const running = f.buckets[1];
  assert.equal(running.running, true);
  assert.equal(running.estimateTop, 1700 / 6 * 12 - 1700);
  // Without a full year the average is extrapolated from the months since the start
  const g = core.allYearsFigures({ entries, cars, today: '2026-06-15' });
  assert.equal(g.first, '2025-03-10');
  assert.deepEqual(g.full, []);
  assert.equal(g.perYear, 2100 / 16 * 12);
  assert.equal(g.buckets[0].partialStart, true);
});
