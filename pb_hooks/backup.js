/// <reference path="../pb_data/types.d.ts" />

// Automatic server backups (database and all files) in pb_data/backups. The schedule
// is set by admins in the settings and stored in pb_data/carmaint-backup.json, so it
// takes effect without a restart:
//   mode   – "off", "daily" (at "time", server time zone TZ) or "hours" (every "hours" hours)
//   keep   – number of backups to keep; older ones made by CarMaint are deleted
// Admins can restore a backup; it replaces the data of all users and restarts the server.
// Loaded via require() from the hooks.

const INTERVALS = [1, 2, 3, 4, 6, 8, 12]; // divide the day evenly
const KEEP_MAX = 30;
const DEFAULTS = { mode: 'off', time: '03:00', hours: 6, keep: 7 };
const OWN_NAME = /^carmaint_\d{8}_\d{6}\.zip$/;
// Made automatically before a restore; not counted in "keep", so a restore can be undone
const SAFETY_PREFIX = 'carmaint-before-restore_';
const SAFETY_KEEP = 3;

const pad = (n) => String(n).padStart(2, '0');
const file = (app) => `${app.dataDir()}/carmaint-backup.json`;
const stamp = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

// Admins only, and not for the demo user when disabled (DEMO_DISABLED)
function guard(cfg, user) {
  const demo = !!cfg.demoUsername && user.getString('username') === cfg.demoUsername;
  if (user.getString('role') !== 'admin' || (demo && cfg.demoDisabled.includes('backup'))) {
    throw new ForbiddenError('Not allowed.');
  }
}

// Schedule with defaults; invalid values are replaced
function clean(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const keep = Number(s.keep);
  return {
    mode: ['off', 'daily', 'hours'].includes(s.mode) ? s.mode : DEFAULTS.mode,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) ? s.time : DEFAULTS.time,
    hours: INTERVALS.includes(Number(s.hours)) ? Number(s.hours) : DEFAULTS.hours,
    keep: Number.isInteger(keep) && keep >= 1 && keep <= KEEP_MAX ? keep : DEFAULTS.keep,
  };
}

function schedule(app) {
  try {
    return clean(JSON.parse(toString($os.readFile(file(app)))));
  } catch {
    return clean(); // no schedule saved yet
  }
}

function saveSchedule(app, raw) {
  const s = clean(raw);
  $os.writeFile(file(app), JSON.stringify(s), 0o600);
  return s;
}

// now: date in the server time zone (TZ)
function isDue(s, now) {
  if (s.mode === 'daily') return `${pad(now.getHours())}:${pad(now.getMinutes())}` === s.time;
  if (s.mode === 'hours') return now.getMinutes() === 0 && now.getHours() % s.hours === 0;
  return false;
}

// Was a minute due since the last check? The cron ticks right at the minute boundary,
// so looking at the current minute alone could skip one or run it twice. last and now in ms.
function dueBetween(s, last, now) {
  const to = Math.floor(now / 60000);
  const from = last ? Math.max(Math.floor(last / 60000) + 1, to - 5) : to;
  for (let minute = from; minute <= to; minute += 1) {
    if (isDue(s, new Date(minute * 60000))) return true;
  }
  return false;
}

// Newest first, including backups made in the PocketBase admin UI
function list(app) {
  const fs = app.newBackupsFilesystem();
  try {
    return fs.list('').filter((o) => o.key.endsWith('.zip'))
      .map((o) => ({ name: o.key, size: o.size, modified: o.modTime.unix() }))
      .sort((a, b) => b.modified - a.modified);
  } finally {
    fs.close();
  }
}

function prune(app, keep) {
  const fs = app.newBackupsFilesystem();
  try {
    const own = fs.list('').map((o) => o.key).filter((key) => OWN_NAME.test(key)).sort().reverse();
    for (const key of own.slice(keep)) fs.delete(key);
  } finally {
    fs.close();
  }
}

function run(app) {
  const name = `carmaint_${stamp()}.zip`;
  app.createBackup(new Context(), name);
  prune(app, schedule(app).keep);
  return name;
}

function exists(app, name) {
  const fs = app.newBackupsFilesystem();
  try {
    return fs.exists(name);
  } finally {
    fs.close();
  }
}

function remove(app, name) {
  const fs = app.newBackupsFilesystem();
  try {
    fs.delete(name);
  } finally {
    fs.close();
  }
}

// Replaces all data with the backup. PocketBase restarts the server at the end, so
// this does not return on success and the client sees the connection drop. A failing
// safety backup stops everything before any data is touched.
function restore(app, name) {
  app.createBackup(new Context(), `${SAFETY_PREFIX}${stamp()}.zip`);
  const fs = app.newBackupsFilesystem();
  try {
    const safety = fs.list('').map((o) => o.key).filter((key) => key.startsWith(SAFETY_PREFIX) && key.endsWith('.zip')).sort().reverse();
    for (const key of safety.slice(SAFETY_KEEP)) {
      if (key !== name) fs.delete(key);
    }
  } finally {
    fs.close();
  }
  app.restoreBackup(new Context(), name);
}

// Sends a backup as a download
function serve(app, e, name) {
  const fs = app.newBackupsFilesystem();
  try {
    if (!fs.exists(name)) throw new NotFoundError();
    const reader = fs.getReader(name);
    try {
      e.response.header().set('Content-Disposition', `attachment; filename="${name}"`);
      e.stream(200, 'application/zip', reader);
    } finally {
      reader.close();
    }
  } finally {
    fs.close();
  }
}

module.exports = { INTERVALS, KEEP_MAX, SAFETY_PREFIX, guard, schedule, saveSchedule, dueBetween, list, run, exists, remove, restore, serve };
