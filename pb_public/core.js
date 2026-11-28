'use strict';

// Domain rules without DOM, texts or PocketBase: loaded by the website
// (<script>, global CarMaint) and by the server hooks (require()).
// Tests: test/*.test.js (node --test).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CarMaint = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  /* ---------- Dates (ISO "YYYY-MM-DD") ---------- */

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const isIsoDate = (v) => typeof v === 'string' && ISO_DATE.test(v);
  const dayNumber = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
  const isoOfDay = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);
  const addDays = (iso, days) => isoOfDay(dayNumber(iso) + days);

  // "2026-01-31" + 1 month = "2026-02-28"
  function addMonths(iso, months) {
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, last));
    return target.toISOString().slice(0, 10);
  }

  /* ---------- Settings ---------- */

  const LANGUAGES = { de: 'Deutsch', en: 'English', es: 'Español', fr: 'Français' };
  // Currencies with the locale of their number format
  const CURRENCIES = { EUR: { locale: 'de-DE' }, CHF: { locale: 'de-CH' }, USD: { locale: 'en-US' } };
  // Vehicle data box and "due soon": always open, always closed or as last left
  const BOX_MODES = ['open', 'closed', 'remember'];
  // Fuel consumption shown as litres per 100 km or km per litre (litres and km are stored)
  const CONSUMPTION_UNITS = ['l100', 'kml'];
  // Cost per km on the overview and the car page: without fuel (running costs) or with it
  const PER_KM_MODES = ['noFuel', 'withFuel'];
  const DEFAULT_SETTINGS = { currency: 'EUR', consumption: 'l100', perKm: 'noFuel', infoBox: 'remember', infoCollapsed: false, dueBox: 'remember', dueCollapsed: false, language: 'de', templates: [] };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');

  // Settings of a user (users.settings) with defaults; invalid values are replaced.
  // defaults: the currency and language to use when none (or an unknown one) is stored.
  function userSettings(raw, { currency = DEFAULT_SETTINGS.currency, language = DEFAULT_SETTINGS.language } = {}) {
    const s = { ...DEFAULT_SETTINGS, currency, language, ...(raw && typeof raw === 'object' ? raw : {}) };
    if (!CURRENCIES[s.currency]) s.currency = CURRENCIES[currency] ? currency : DEFAULT_SETTINGS.currency;
    if (!BOX_MODES.includes(s.infoBox)) s.infoBox = DEFAULT_SETTINGS.infoBox;
    if (!BOX_MODES.includes(s.dueBox)) s.dueBox = DEFAULT_SETTINGS.dueBox;
    if (!CONSUMPTION_UNITS.includes(s.consumption)) s.consumption = DEFAULT_SETTINGS.consumption;
    if (!PER_KM_MODES.includes(s.perKm)) s.perKm = DEFAULT_SETTINGS.perKm;
    if (!LANGUAGES[s.language]) s.language = LANGUAGES[language] ? language : 'en';
    if (!Array.isArray(s.templates)) s.templates = [];
    return s;
  }

  // Reminder notifications (settings.notify), sent by pb_hooks/notify.js:
  //   before    – days before the due date (0 = on the day)
  //   frequency – only new stages, daily or weekly (Mondays)
  //   overdue   – repeat overdue reminders never or every 3 / 7 days
  const NOTIFY_BEFORE = [30, 14, 7, 1, 0];
  const NOTIFY_FREQUENCIES = ['new', 'daily', 'weekly'];
  const NOTIFY_REPEATS = ['never', '3', '7'];

  // Notification options with defaults; invalid values are replaced
  function notifyOptions(raw, defaultHour = 7) {
    const n = raw && typeof raw === 'object' ? raw : {};
    const before = Array.isArray(n.before) ? n.before.filter((d) => NOTIFY_BEFORE.includes(d)) : [7, 1, 0];
    const push = n.push && typeof n.push === 'object' ? n.push : {};
    return {
      enabled: !!n.enabled,
      email: String(n.email ?? '').trim(),
      hour: Number.isInteger(n.hour) && n.hour >= 0 && n.hour <= 23 ? n.hour : defaultHour,
      before: [...new Set(before)].sort((a, b) => a - b), // ascending: the first match is the closest stage
      frequency: NOTIFY_FREQUENCIES.includes(n.frequency) ? n.frequency : 'new',
      overdue: NOTIFY_REPEATS.includes(String(n.overdue)) ? String(n.overdue) : '7',
      push: { enabled: !!push.enabled, url: String(push.url ?? '').trim() },
    };
  }

  /* ---------- Reminder status ---------- */

  // Levels: overdue (red), soon (yellow), upcoming (still listed on the home page), later
  const SOON_KM = 1000;
  const SOON_DAYS = 7;
  const UPCOMING_KM = 3000;
  const UPCOMING_DAYS = 60;
  // Used when the km driven per day cannot be measured yet
  const KM_PER_DAY_DEFAULT = 15000 / 365;

  // km per day of a car, measured from its oldest entry with a mileage
  // (first: { date, mileage } or null); needs at least 30 days and some km.
  function kmPerDay(first, mileage, today) {
    if (first && first.mileage > 0 && isIsoDate(first.date)) {
      const days = daysBetween(first.date, today);
      const km = (mileage || 0) - first.mileage;
      if (days >= 30 && km > 0) return km / days;
    }
    return KM_PER_DAY_DEFAULT;
  }

  // The next vehicle inspection (MFK) from the vehicle data counts as a reminder,
  // unless the car already has its own inspection reminder. The caller adds id and title.
  function inspectionReminder(info, reminders) {
    const next = info && info.nextInspection;
    if (!isIsoDate(next) || reminders.some((r) => r.type === 'inspection')) return null;
    return { virtual: true, type: 'inspection', dueDate: next, dueKm: 0, intervalKm: 0, intervalMonths: 0 };
  }

  // Interval for the next time after completing a reminder; the MFK from the
  // vehicle data has none stored and repeats every 24 months by default.
  const MFK_INTERVAL_MONTHS = 24;
  const intervalOf = (r) => ({ km: r.intervalKm || 0, months: r.intervalMonths || (r.virtual ? MFK_INTERVAL_MONTHS : 0) });

  // Reminder fields for an interval ({ km, months }) counted from a day and mileage
  const dueFrom = ({ km = 0, months = 0 } = {}, { date, mileage = 0 }) => ({
    intervalKm: km || 0,
    intervalMonths: months || 0,
    dueKm: km ? (mileage || 0) + km : 0,
    dueDate: months && isIsoDate(date) ? addMonths(date, months) : '',
  });

  // Documents remind this many days before they expire
  const DOC_REMIND_DAYS = 30;
  const docReminderDate = (validUntil) => addDays(validUntil, -DOC_REMIND_DAYS);

  // Where a reminder stands on a day. r: { dueKm, dueDate, intervalKm, intervalMonths };
  // ctx: { mileage, today, kmPerDay }.
  //   kmLeft / days  – distance to each limit (null if the limit is not set)
  //   estDays        – kmLeft converted to days with the car's km per day
  //   soonest        – days until the first limit is reached (for sorting and stages)
  //   byKm           – the mileage limit is reached first (otherwise the date)
  //   level          – overdue, soon, upcoming or later
  //   progress       – share of the interval that has passed (0–1)
  function reminderStatus(r, { mileage = 0, today, kmPerDay: rate = KM_PER_DAY_DEFAULT }) {
    const kmLeft = r.dueKm ? r.dueKm - (mileage || 0) : null;
    const days = isIsoDate(r.dueDate) ? daysBetween(today, r.dueDate) : null;
    const estDays = kmLeft === null ? null : Math.round(kmLeft / rate);
    const soonest = Math.min(days ?? Infinity, estDays ?? Infinity);
    const overdue = (kmLeft !== null && kmLeft <= 0) || (days !== null && days < 0);
    const within = (kmLimit, dayLimit) => (kmLeft !== null && kmLeft <= kmLimit) || (days !== null && days <= dayLimit);
    const level = overdue ? 'overdue'
      : within(SOON_KM, SOON_DAYS) ? 'soon'
      : within(UPCOMING_KM, UPCOMING_DAYS) ? 'upcoming' : 'later';
    // Overdue: the limit that was passed (the earlier one if both were)
    const kmOver = kmLeft !== null && kmLeft <= 0;
    const byKm = overdue
      ? kmOver && (days === null || days >= 0 || estDays < days)
      : kmLeft !== null && (days === null || estDays < days);
    const kmPart = kmLeft === null ? 0 : 1 - kmLeft / (r.intervalKm || 10000);
    const dayPart = days === null ? 0 : 1 - days / ((r.intervalMonths || 12) * 30.44);
    const progress = Math.min(1, Math.max(0, kmPart, dayPart));
    return { kmLeft, days, estDays, soonest, overdue, level, byKm, progress };
  }

  // Column on the home page: overdue, this week (until Sunday), next week, later
  function weekColumn(status, today) {
    if (status.overdue) return 'overdue';
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const toSunday = (7 - weekday) % 7;
    return status.soonest <= toSunday ? 'soon' : status.soonest <= toSunday + 7 ? 'next' : 'upcoming';
  }

  /* ---------- Cost figures ---------- */

  // Entries: { car, type, date, mileage, cost }; cars: { id, mileage, info }.
  // Stack order of the charts (neighbouring colours stay apart for colour-blind readers)
  const COST_TYPES = ['fuel', 'service', 'inspection', 'tires', 'fixed', 'repair', 'other'];
  // Fixed costs (insurance, road tax, vignette) are paid once a year: a month full of them is expected
  const EXPECTED_PEAKS = ['fixed'];
  const MIN_KM_PER_KM = 100; // cost per km only once this many km are known
  const costType = (e) => (COST_TYPES.includes(e.type) ? e.type : 'other');
  const sumCosts = (list) => list.reduce((total, e) => total + (Number(e.cost) || 0), 0);
  const costsByType = (list) => Object.fromEntries(COST_TYPES.map((type) => [type, sumCosts(list.filter((e) => costType(e) === type))]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const monthTotals = (list, year) => Array.from({ length: 12 }, (_, i) => sumCosts(list.filter((e) => e.date.startsWith(`${year}-${pad2(i + 1)}`))));

  // Kilometres covered per car from the mileages of the entries; withCurrent: the car's
  // current mileage counts as the latest value (not for past years)
  function kmDriven(cars, entries, withCurrent = true) {
    let driven = 0;
    for (const car of cars) {
      const values = entries.filter((e) => e.car === car.id).map((e) => e.mileage).filter(Boolean);
      if (withCurrent && car.mileage) values.push(car.mileage);
      if (values.length > 1) driven += Math.max(...values) - Math.min(...values);
    }
    return driven;
  }
  const perKm = (total, driven) => (driven >= MIN_KM_PER_KM ? total / driven : null);

  // Costs per km for the overview and the car page, without fuel unless withFuel;
  // null until enough km are known
  function runningCostPerKm(cars, entries, withFuel = false) {
    const ids = new Set(cars.map((c) => c.id));
    const own = entries.filter((e) => ids.has(e.car));
    return perKm(sumCosts(withFuel ? own : own.filter((e) => e.type !== 'fuel')), kmDriven(cars, own));
  }

  // Parts of a bar: keys in their order, keyOf(entry) -> key (default: the cost type)
  const partsOf = (list, keys, keyOf) => keys
    .map((key) => ({ key, value: sumCosts(list.filter((e) => keyOf(e) === key)) }))
    .filter((p) => p.value);

  // One year (costed entries of the cars). Compared with the same months of the year before
  // while the year is running. Buckets: one per month with parts, the previous year's
  // value (prev), future (not reached yet) and top (key of a part that makes the month
  // an outlier: at least twice the average and 60 % of the month; never EXPECTED_PEAKS).
  // kmEntries: the entries whose mileages give the km driven – all of the cars', also those
  // without a cost, so the figures match the car page (default: entries).
  function yearFigures({ entries, cars, year, today, keys = COST_TYPES, keyOf = costType, kmEntries = entries }) {
    const current = year === today.slice(0, 4);
    const months = current ? Number(today.slice(5, 7)) : 12;
    const period = entries.filter((e) => e.date.startsWith(year));
    const prevYear = String(Number(year) - 1);
    const prevAll = entries.filter((e) => e.date.startsWith(prevYear));
    const prevSame = prevAll.filter((e) => e.date <= `${prevYear}-${pad2(months)}-31`);
    const total = sumCosts(period);
    const types = costsByType(period);
    const avg = total / months;
    const driven = kmDriven(cars, kmEntries.filter((e) => e.date.startsWith(year)), current);
    const prevMonths = monthTotals(prevAll, prevYear);
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const list = period.filter((e) => e.date.startsWith(`${year}-${pad2(i + 1)}`));
      const parts = partsOf(list, keys, keyOf);
      const b = { month: i + 1, total: sumCosts(list), parts, future: i + 1 > months };
      if (prevAll.length) b.prev = prevMonths[i];
      const top = parts.reduce((a, p) => (p.value > (a ? a.value : 0) ? p : a), null);
      if (top && !EXPECTED_PEAKS.includes(top.key) && b.total >= 2 * avg && top.value / b.total >= 0.6) b.top = top.key;
      return b;
    });
    return {
      year, current, months, total, types, avg, driven, perKm: perKm(total, driven),
      prevYear, hasPrev: prevAll.length > 0, prevSameTotal: sumCosts(prevSame),
      // Types of the year before: the same months while the year is running, else the whole year
      prevTypes: costsByType(current ? prevSame : prevAll),
      projection: current && months < 12 ? avg * 12 : null,
      noFuel: total - types.fuel,
      fuelPerKm: perKm(types.fuel, driven),
      buckets,
    };
  }

  // All years since the first entry or the purchase: totals, average per full year
  // (extrapolated without one), and one bucket per year (at most twelve). The running
  // year gets an estimate for its remaining months (estimateTop).
  // kmEntries as in yearFigures.
  function allYearsFigures({ entries, cars, today, purchaseDate = '', keys = COST_TYPES, keyOf = costType, kmEntries = entries }) {
    const now = today.slice(0, 4);
    const months = Number(today.slice(5, 7));
    const total = sumCosts(entries);
    const types = costsByType(entries);
    const first = [purchaseDate, entries.map((e) => e.date).sort()[0]].filter(Boolean).sort()[0] || today;
    const firstYear = first.slice(0, 4);
    const firstMonth = Number(first.slice(5, 7));
    const years = Array.from({ length: Number(now) - Number(firstYear) + 1 }, (_, i) => String(Number(firstYear) + i)).slice(-12);
    // Full years: not the current one, and the first only if it started in January
    const full = years.filter((y) => y < now && (y > firstYear || firstMonth === 1));
    const perYear = full.length ? sumCosts(entries.filter((e) => full.includes(e.date.slice(0, 4)))) / full.length
      : total / Math.max(1, (Number(now) - Number(firstYear)) * 12 + months - firstMonth + 1) * 12;
    const driven = kmDriven(cars, kmEntries, true);
    const price = cars.reduce((n, c) => n + (Number(c.info && c.info.purchasePrice) || 0), 0);
    const buckets = years.map((y) => {
      const list = entries.filter((e) => e.date.startsWith(y));
      const b = { year: y, total: sumCosts(list), parts: partsOf(list, keys, keyOf), partialStart: y === firstYear && firstMonth > 1 };
      if (y === now && months < 12) {
        b.running = true;
        b.estimateTop = b.total / months * 12 - b.total;
      }
      return b;
    });
    return { first, firstYear, firstMonth, months, years, full, perYear, total, types, driven, perKm: perKm(total, driven), fuelPerKm: perKm(types.fuel, driven), price, noFuel: total - types.fuel, buckets };
  }

  /* ---------- Fuel consumption ---------- */

  // Intervals outside this range (l/100 km) are typing errors or a forgotten refuel
  const PLAUSIBLE_L100 = [3, 25];
  // ... and so are intervals far from the car's own median (a forgotten refuel halves the
  // value), once there are enough intervals to have one
  const PLAUSIBLE_MEDIAN = [0.65, 1.6];
  const MEDIAN_MIN = 3;
  const CONSUMPTION_MONTHS = 12; // average on the car page

  const litresOf = (e) => Number(e.litres) || 0;
  const isFullTank = (e) => !e.partial;

  // Intervals between full tanks of one car's refuels ({ id, type, date, mileage, litres,
  // partial }), ordered by mileage. An interval runs from one full tank to the next and
  // counts the litres of every refuel after the first, partial ones included.
  //   { fromId, id, date, km, litres, l100, plausible } – id/date: the closing full tank
  // Refuels without a mileage are left out. An interval with a refuel without litres
  // in it is not measurable and skipped; one whose dates run backwards or whose value
  // is outside PLAUSIBLE_L100 or PLAUSIBLE_MEDIAN is kept but not plausible (not
  // counted in averages).
  function consumptionIntervals(entries) {
    const refuels = entries
      .filter((e) => e.type === 'fuel' && e.mileage > 0)
      .sort((a, b) => a.mileage - b.mileage || a.date.localeCompare(b.date));
    const intervals = [];
    let start = null;
    let litres = 0;
    let measurable = true;
    let backwards = false;
    for (const e of refuels) {
      if (start) {
        litres += litresOf(e);
        if (!litresOf(e)) measurable = false;
        if (e.date < start.date) backwards = true;
      }
      if (!isFullTank(e)) continue;
      if (start && measurable && e.mileage > start.mileage) {
        const km = e.mileage - start.mileage;
        const l100 = litres / km * 100;
        const plausible = !backwards && l100 >= PLAUSIBLE_L100[0] && l100 <= PLAUSIBLE_L100[1];
        intervals.push({ fromId: start.id, id: e.id, date: e.date, km, litres, l100, plausible });
      }
      start = e;
      litres = 0;
      measurable = true;
      backwards = false;
    }
    const values = intervals.filter((i) => i.plausible).map((i) => i.l100).sort((a, b) => a - b);
    if (values.length >= MEDIAN_MIN) {
      const mid = values.length >> 1;
      const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      for (const i of intervals) {
        if (i.l100 < median * PLAUSIBLE_MEDIAN[0] || i.l100 > median * PLAUSIBLE_MEDIAN[1]) i.plausible = false;
      }
    }
    return intervals;
  }

  // Average l/100 km of the plausible intervals (weighted by km) that end on or after
  // `since` (ISO date, '' = all); null without any.
  function averageConsumption(intervals, since = '') {
    const used = intervals.filter((i) => i.plausible && i.date >= since);
    const km = used.reduce((n, i) => n + i.km, 0);
    return km ? used.reduce((n, i) => n + i.litres, 0) / km * 100 : null;
  }

  // l/100 km in a unit ('l100' or 'kml')
  const consumptionIn = (l100, unit) => (unit === 'kml' ? 100 / l100 : l100);

  // Price per litre of a refuel; null without litres or cost
  const pricePerLitre = (e) => (litresOf(e) && Number(e.cost) ? Number(e.cost) / litresOf(e) : null);

  return {
    CONSUMPTION_UNITS, PLAUSIBLE_L100, CONSUMPTION_MONTHS, consumptionIntervals, averageConsumption, consumptionIn, pricePerLitre,
    isIsoDate, dayNumber, isoOfDay, daysBetween, addDays, addMonths,
    SOON_KM, SOON_DAYS, UPCOMING_KM, UPCOMING_DAYS, KM_PER_DAY_DEFAULT,
    kmPerDay, inspectionReminder, reminderStatus, weekColumn, MFK_INTERVAL_MONTHS, intervalOf, dueFrom, DOC_REMIND_DAYS, docReminderDate,
    LANGUAGES, CURRENCIES, BOX_MODES, PER_KM_MODES, DEFAULT_SETTINGS, isEmail, userSettings, NOTIFY_BEFORE, NOTIFY_FREQUENCIES, NOTIFY_REPEATS, notifyOptions,
    COST_TYPES, costType, sumCosts, costsByType, monthTotals, kmDriven, runningCostPerKm, yearFigures, allYearsFigures,
  };
});
