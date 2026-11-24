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

  return {
    isIsoDate, dayNumber, isoOfDay, daysBetween, addDays, addMonths,
    SOON_KM, SOON_DAYS, UPCOMING_KM, UPCOMING_DAYS, KM_PER_DAY_DEFAULT,
    kmPerDay, inspectionReminder, reminderStatus, weekColumn,
  };
});
