'use strict';

// Run: scripts/check.sh
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
  assert.equal(core.runningCostPerKm([cars[0]], entries, true), 1700 / 11000);
  assert.equal(core.userSettings({}).perKm, 'noFuel');
  assert.equal(core.userSettings({ perKm: 'withFuel' }).perKm, 'withFuel');
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

/* ---------- Reminder schedule ---------- */

test('intervalOf: the MFK repeats every 24 months', () => {
  assert.deepEqual(core.intervalOf({ intervalKm: 15000, intervalMonths: 12 }), { km: 15000, months: 12 });
  assert.deepEqual(core.intervalOf({ virtual: true, intervalMonths: 0 }), { km: 0, months: 24 });
});

test('dueFrom: next due values from an interval', () => {
  assert.deepEqual(core.dueFrom({ km: 15000, months: 12 }, { date: '2026-01-31', mileage: 20000 }),
    { intervalKm: 15000, intervalMonths: 12, dueKm: 35000, dueDate: '2027-01-31' });
  assert.deepEqual(core.dueFrom({ months: 1 }, { date: '2026-01-31', mileage: 0 }),
    { intervalKm: 0, intervalMonths: 1, dueKm: 0, dueDate: '2026-02-28' });
  assert.deepEqual(core.dueFrom(undefined, { date: '2026-01-31' }), { intervalKm: 0, intervalMonths: 0, dueKm: 0, dueDate: '' });
});

test('docReminderDate: 30 days before expiry', () => {
  assert.equal(core.docReminderDate('2026-12-31'), '2026-12-01');
});

/* ---------- Settings ---------- */

test('userSettings: defaults and invalid values', () => {
  const s = core.userSettings({ currency: 'GBP', infoBox: 'x', language: 'it', templates: 'no' }, { currency: 'CHF', language: 'fr' });
  assert.equal(s.currency, 'CHF');
  assert.equal(s.infoBox, 'remember');
  assert.equal(s.language, 'fr');
  assert.deepEqual(s.templates, []);
  assert.equal(core.userSettings(null).currency, 'EUR');
  assert.equal(core.userSettings({ language: 'es' }, { language: 'en' }).language, 'es');
  assert.equal(core.userSettings({}, { language: 'xx' }).language, 'en');
});

test('notifyOptions: defaults, allowed values, stages in ascending order', () => {
  assert.deepEqual(core.notifyOptions(undefined, 6), {
    enabled: false, email: '', hour: 6, before: [0, 1, 7], frequency: 'new', overdue: '7', push: { enabled: false, url: '' },
  });
  const n = core.notifyOptions({ enabled: true, email: ' a@b.ch ', hour: 25, before: [30, 5, 1, 1], frequency: 'hourly', overdue: 3, push: { enabled: true, url: ' ntfy://x/y ' } }, 7);
  assert.equal(n.email, 'a@b.ch');
  assert.equal(n.hour, 7);
  assert.deepEqual(n.before, [1, 30]);
  assert.equal(n.frequency, 'new');
  assert.equal(n.overdue, '3');
  assert.deepEqual(n.push, { enabled: true, url: 'ntfy://x/y' });
  assert.equal(core.isEmail('a@b.ch'), true);
  assert.equal(core.isEmail('a@b'), false);
});

const refuel = (id, date, mileage, litres, partial = false) => ({ id, type: 'fuel', date, mileage, litres, partial, cost: litres * 2 });

test('consumptionIntervals: from full tank to full tank, partial refuels count', () => {
  const list = core.consumptionIntervals([
    refuel('a', '2026-01-01', 10000, 40),
    refuel('b', '2026-01-10', 10300, 10, true),
    refuel('c', '2026-01-20', 10800, 30),
    { id: 'x', type: 'service', date: '2026-01-15', mileage: 10500 },
  ]);
  assert.equal(list.length, 1);
  assert.deepEqual({ ...list[0], l100: Math.round(list[0].l100 * 10) / 10 },
    { fromId: 'a', id: 'c', date: '2026-01-20', km: 800, litres: 40, l100: 5, plausible: true });
});

test('consumptionIntervals: missing litres, missing mileage, outliers and backwards dates', () => {
  // Refuel without litres in between: not measurable; without mileage: left out
  assert.equal(core.consumptionIntervals([refuel('a', '2026-01-01', 10000, 40), refuel('b', '2026-01-10', 10500, 0), refuel('c', '2026-01-20', 11000, 30)]).length, 1);
  assert.equal(core.consumptionIntervals([refuel('a', '2026-01-01', 10000, 40), refuel('b', '2026-01-10', 0, 30)]).length, 0);
  // Forgotten refuel: 1500 km on 40 l = 2.7 l/100 km
  assert.equal(core.consumptionIntervals([refuel('a', '2026-01-01', 10000, 40), refuel('b', '2026-02-01', 11500, 40)])[0].plausible, false);
  // Forgotten refuel of a frugal car: 3.3 l/100 km is in range, but half of its median
  const steady = [0, 1, 2, 3].map((i) => refuel(`s${i}`, `2026-0${i + 1}-01`, 10000 + i * 600, 39));
  const forgot = core.consumptionIntervals([...steady, refuel('f', '2026-06-01', 13000, 40)]);
  assert.deepEqual(forgot.map((i) => i.plausible), [true, true, true, false]);
  // Typo in the mileage: the later refuel sorts before the earlier one
  assert.equal(core.consumptionIntervals([refuel('a', '2026-02-01', 10000, 40), refuel('b', '2026-01-01', 10600, 40)])[0].plausible, false);
});

test('averageConsumption: weighted by km, only plausible intervals since a day', () => {
  const list = [
    { date: '2025-06-01', km: 1000, litres: 50, plausible: true },
    { date: '2026-06-01', km: 500, litres: 40, plausible: true },
    { date: '2026-07-01', km: 500, litres: 20, plausible: true },
    { date: '2026-08-01', km: 2000, litres: 20, plausible: false },
  ];
  assert.equal(core.averageConsumption(list, '2026-01-01'), 6);
  assert.equal(Math.round(core.averageConsumption(list) * 100) / 100, 5.5);
  assert.equal(core.averageConsumption([], ''), null);
  assert.equal(core.consumptionIn(5, 'kml'), 20);
  assert.equal(core.consumptionIn(5, 'l100'), 5);
});

test('pricePerLitre and the consumption setting', () => {
  assert.equal(core.pricePerLitre({ cost: 90, litres: 45 }), 2);
  assert.equal(core.pricePerLitre({ cost: 90, litres: 0 }), null);
  assert.equal(core.userSettings({ consumption: 'mpg' }).consumption, 'l100');
  assert.equal(core.userSettings({ consumption: 'kml' }).consumption, 'kml');
});

test('yearFigures: a month of fixed costs is no outlier, but counts like any cost', () => {
  const list = [e('2026-01-10', 'fixed', 1200, 0), e('2026-03-01', 'service', 100, 0), e('2026-05-01', 'repair', 1000, 0)];
  const f = core.yearFigures({ entries: list, cars: [cars[0]], year: '2026', today: '2026-06-15' });
  assert.equal(f.types.fixed, 1200);
  assert.equal(f.noFuel, 2300);
  assert.equal(f.buckets[0].top, undefined); // January: all insurance, expected
  assert.equal(f.buckets[4].top, 'repair');
  assert.equal(core.costType({ type: 'fixed' }), 'fixed');
});

test('cost figures: km come from every entry with a mileage, costs only from those with an amount', () => {
  const costed = [e('2026-02-01', 'service', 500, 10000)];
  const all = [...costed, e('2026-05-01', 'inspection', 0, 12000)];
  const car = [{ id: 'a', mileage: 0 }];
  // Without the free MFK only one mileage is known: no km driven
  assert.equal(core.yearFigures({ entries: costed, cars: car, year: '2026', today: '2026-06-15' }).driven, 0);
  assert.equal(core.yearFigures({ entries: costed, kmEntries: all, cars: car, year: '2026', today: '2026-06-15' }).perKm, 500 / 2000);
  assert.equal(core.allYearsFigures({ entries: costed, kmEntries: all, cars: car, today: '2026-06-15' }).perKm,
    core.runningCostPerKm(car, all, true)); // "All" matches the car page
});

test('tireDistances: each set sums its stints since it was new; the mounted one runs to the current mileage', () => {
  const swap = (id, date, mileage, tireSet, newTires = false) => ({ id, type: 'tires', date, mileage, tireSet, newTires });
  const entries = [
    swap('s1', '2024-04-06', 25400, 'summer'),
    swap('w1', '2024-10-19', 32000, 'winter'),
    swap('s2', '2025-04-12', 38600, 'summer'),
    swap('w2', '2025-10-25', 45200, 'winter', true), // new winter tyres: the old ones' 6600 km drop out
    swap('s3', '2026-04-04', 51800, 'summer'),
    swap('w3', '2026-10-17', 58400, 'winter'),
    { id: 'p', type: 'tires', date: '2026-11-01', mileage: 59000, tireSet: '' }, // puncture: no swap
  ];
  const d = core.tireDistances(entries, 60000);
  assert.equal(d.mounted, 'winter');
  assert.deepEqual(d.sets.summer, { km: 6600 + 6600 + 6600, gaps: false, used: true });
  assert.deepEqual(d.sets.winter, { km: 6600 + 1600, gaps: false, used: true });
  assert.deepEqual(d.removed.get('w3'), { set: 'summer', km: 6600 });
  assert.deepEqual(d.removed.get('s2'), { set: 'winter', km: 6600 });
  assert.equal(d.removed.has('s1'), false);
  assert.equal(d.removed.has('p'), false);
});

test('tireDistances: a stint without a mileage is not counted and flagged', () => {
  const d = core.tireDistances([
    { id: 'a', type: 'tires', date: '2025-04-01', mileage: 10000, tireSet: 'summer' },
    { id: 'b', type: 'tires', date: '2025-10-01', mileage: 0, tireSet: 'winter' },
    { id: 'c', type: 'tires', date: '2026-04-01', mileage: 20000, tireSet: 'summer' },
  ], 21000);
  assert.deepEqual(d.sets.summer, { km: 1000, gaps: true, used: true });
  assert.deepEqual(d.sets.winter, { km: 0, gaps: true, used: true });
  assert.deepEqual(d.removed.get('b'), { set: 'summer', km: null });
  assert.deepEqual(core.tireDistances([], 5000), { mounted: null, sets: { summer: { km: 0, gaps: false, used: false }, winter: { km: 0, gaps: false, used: false } }, removed: new Map() });
});
