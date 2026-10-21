/// <reference path="../pb_data/types.d.ts" />

// Reminder notifications by e-mail and/or push (ntfy directly, other services
// via an Apprise server). Every user chooses in the settings (settings.notify):
//   hour       – when the notification is sent (server time zone TZ)
//   before     – days before the due date, e.g. [30, 7, 1, 0] (0 = on the day);
//                for mileage reminders the date is estimated from the km driven
//   frequency  – "new": only when a reminder reaches a new stage,
//                "daily" / "weekly" (Mondays): everything that is due
//   overdue    – repeat overdue reminders: "never", "3" (days) or "7" (days)
// The last notified stage is stored in the field "notified" (reminder, or car
// for the next MFK from the vehicle data), so a stage is sent only once.
// Loaded via require() from the hooks.

const KM_PER_DAY_DEFAULT = 15000 / 365; // when the km driven cannot be estimated
const BEFORE_OPTIONS = [30, 14, 7, 1, 0];

const TEXTS = {
  de: {
    subject: '{n} Erinnerung|{n} Erinnerungen', hello: 'Hallo {name}', intro: 'bei deinen Fahrzeugen steht Folgendes an:',
    overdue: 'Überfällig', overdueDays: 'seit {n} Tag|seit {n} Tagen', overdueKm: '{km} drüber', today: 'Heute fällig',
    inDays: 'in {n} Tag|in {n} Tagen', inKm: 'in {km}', approx: 'ca. {n} Tag|ca. {n} Tage', dueOn: 'fällig am {date}', dueAt: 'fällig bei {km}',
    open: 'In {app} öffnen', footer: 'Du erhältst diese Nachricht, weil die Erinnerungen in deinen Einstellungen eingeschaltet sind.',
    mfk: 'MFK / Inspektion', testSubject: 'Test', testBody: 'Die Erinnerungen funktionieren. Ab jetzt kommt um {hour}:00 Uhr eine Nachricht, sobald etwas ansteht.',
  },
  en: {
    subject: '{n} reminder|{n} reminders', hello: 'Hello {name}', intro: 'here is what is coming up for your vehicles:',
    overdue: 'Overdue', overdueDays: 'for {n} day|for {n} days', overdueKm: '{km} over', today: 'Due today',
    inDays: 'in {n} day|in {n} days', inKm: 'in {km}', approx: 'about {n} day|about {n} days', dueOn: 'due on {date}', dueAt: 'due at {km}',
    open: 'Open in {app}', footer: 'You receive this message because reminders are switched on in your settings.',
    mfk: 'Inspection', testSubject: 'Test', testBody: 'Reminders work. From now on you get a message at {hour}:00 as soon as something is due.',
  },
  es: {
    subject: '{n} recordatorio|{n} recordatorios', hello: 'Hola {name}', intro: 'esto es lo que toca en tus vehículos:',
    overdue: 'Vencido', overdueDays: 'hace {n} día|hace {n} días', overdueKm: '{km} de más', today: 'Vence hoy',
    inDays: 'en {n} día|en {n} días', inKm: 'en {km}', approx: 'unos {n} día|unos {n} días', dueOn: 'vence el {date}', dueAt: 'vence a los {km}',
    open: 'Abrir en {app}', footer: 'Recibes este mensaje porque los recordatorios están activados en tus ajustes.',
    mfk: 'ITV / inspección', testSubject: 'Prueba', testBody: 'Los recordatorios funcionan. A partir de ahora recibirás un mensaje a las {hour}:00 cuando haya algo pendiente.',
  },
  fr: {
    subject: '{n} rappel|{n} rappels', hello: 'Bonjour {name}', intro: 'voici ce qui arrive pour tes véhicules :',
    overdue: 'En retard', overdueDays: 'depuis {n} jour|depuis {n} jours', overdueKm: '{km} de trop', today: 'À faire aujourd’hui',
    inDays: 'dans {n} jour|dans {n} jours', inKm: 'dans {km}', approx: 'env. {n} jour|env. {n} jours', dueOn: 'échéance le {date}', dueAt: 'échéance à {km}',
    open: 'Ouvrir dans {app}', footer: 'Tu reçois ce message parce que les rappels sont activés dans tes paramètres.',
    mfk: 'Expertise / contrôle', testSubject: 'Test', testBody: 'Les rappels fonctionnent. Tu recevras désormais un message à {hour}:00 dès que quelque chose arrive à échéance.',
  },
};

const fill = (text, params) => text.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ''));
const plural = (text, n) => text.split('|')[n === 1 ? 0 : 1] ?? text;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const parse = (raw) => { try { return JSON.parse(raw || '{}') || {}; } catch { return {}; } };
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');

// Dates in the server time zone (TZ) as day numbers
const pad = (n) => String(n).padStart(2, '0');
const localIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNumber = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
const isoOfDay = (n) => new Date(n * 864e5).toISOString().slice(0, 10);

// Notification options of a user with defaults; invalid values are replaced
function options(cfg, raw) {
  const n = raw && typeof raw === 'object' ? raw : {};
  const hour = Number.isInteger(n.hour) && n.hour >= 0 && n.hour <= 23 ? n.hour : cfg.notifyHour;
  const before = Array.isArray(n.before) ? n.before.filter((d) => BEFORE_OPTIONS.includes(d)) : [7, 1, 0];
  return {
    email: n.enabled && isEmail(n.email) ? String(n.email).trim() : '',
    push: n.push?.enabled && n.push.url ? String(n.push.url).trim() : '',
    hour,
    before: [...new Set(before)].sort((a, b) => a - b),
    frequency: ['new', 'daily', 'weekly'].includes(n.frequency) ? n.frequency : 'new',
    overdue: ['never', '3', '7'].includes(String(n.overdue)) ? String(n.overdue) : '7',
  };
}

function format(lang, currency) {
  const sep = currency === 'CHF' && (lang === 'de' || lang === 'fr') ? '’' : { de: '.', en: ',', es: '.', fr: ' ' }[lang];
  const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return {
    km: (n) => `${num(n)} km`,
    date: (iso) => (lang === 'de' ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`),
  };
}

// km per day of a car from its oldest entry with a mileage
function kmPerDay(app, car, today) {
  const first = app.findRecordsByFilter('entries', 'car = {:car} && mileage > 0', 'date', 1, 0, { car: car.id })[0];
  if (first) {
    const days = today - dayNumber(first.getString('date'));
    const km = car.getInt('mileage') - first.getInt('mileage');
    if (days >= 30 && km > 0) return km / days;
  }
  return KM_PER_DAY_DEFAULT;
}

// Reminders of a user with their stage on the given day. With frequency "new"
// only those that reached a stage that was not notified yet.
function dueItems(app, user, opts, lang, today) {
  const items = [];
  for (const car of app.findRecordsByFilter('cars', 'owner = {:user}', 'created', 0, 0, { user: user.id })) {
    const mileage = car.getInt('mileage');
    const info = parse(car.getString('info'));
    const list = app.findRecordsByFilter('reminders', 'car = {:car}', '', 0, 0, { car: car.id }).map((r) => ({
      record: r, title: r.getString('title'), type: r.getString('type'), dueKm: r.getInt('dueKm'), dueDate: r.getString('dueDate'),
    }));
    if (info.nextInspection && !list.some((r) => r.type === 'inspection')) {
      list.push({ record: car, title: TEXTS[lang].mfk, type: 'inspection', dueKm: 0, dueDate: info.nextInspection });
    }
    let rate = null;
    for (const r of list) {
      const kmLeft = r.dueKm ? r.dueKm - mileage : null;
      const days = /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) ? dayNumber(r.dueDate) - today : null;
      if (kmLeft !== null && rate === null) rate = kmPerDay(app, car, today);
      const estDays = kmLeft !== null ? Math.round(kmLeft / rate) : null;
      let stage = '';
      if ((kmLeft !== null && kmLeft <= 0) || (days !== null && days < 0)) {
        stage = opts.overdue === 'never' ? 'overdue' : `overdue-${Math.floor(today / Number(opts.overdue))}`;
      } else {
        const d = Math.min(days ?? Infinity, estDays ?? Infinity);
        const step = opts.before.find((b) => d <= b);
        if (step !== undefined) stage = `before-${step}`;
      }
      if (!stage) continue;
      const key = `${stage}|${r.dueDate}|${r.dueKm}`;
      if (opts.frequency === 'new' && r.record.getString('notified') === key) continue;
      items.push({ ...r, car, kmLeft, days, estDays, stage, key });
    }
  }
  const rank = (i) => (i.stage.startsWith('overdue') ? 0 : 1);
  const soon = (i) => Math.min(i.days ?? Infinity, i.estDays ?? Infinity);
  return items.sort((a, b) => rank(a) - rank(b) || soon(a) - soon(b));
}

function itemLabel(i, T, f) {
  if (i.stage.startsWith('overdue')) {
    const since = i.days !== null && i.days < 0 ? fill(plural(T.overdueDays, -i.days), { n: -i.days }) : fill(T.overdueKm, { km: f.km(-i.kmLeft) });
    return { text: `${T.overdue} · ${since}`, color: '#dc2626' };
  }
  const byDate = i.days !== null && (i.estDays === null || i.days <= i.estDays);
  if ((byDate ? i.days : i.estDays) <= 0) return { text: T.today, color: '#b45309' };
  const text = byDate
    ? fill(plural(T.inDays, i.days), { n: i.days })
    : `${fill(T.inKm, { km: f.km(i.kmLeft) })} (${fill(plural(T.approx, i.estDays), { n: i.estDays })})`;
  return { text, color: '#b45309' };
}

const carName = (car) => `${car.getString('make')} ${car.getString('model')}`;

// Simple, inline-styled HTML (mail clients ignore stylesheets)
function layout(cfg, body) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f6fa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3e6ee;border-radius:14px;padding:24px">
<div style="font-weight:800;font-size:20px;letter-spacing:.02em;margin-bottom:16px">${esc(cfg.appName)}</div>${body}</div></body></html>`;
}

function message(cfg, user, settings, items) {
  const lang = TEXTS[settings.language] ? settings.language : 'en';
  const T = TEXTS[lang];
  const f = format(lang, settings.currency);
  const due = (i) => [i.dueDate && fill(T.dueOn, { date: f.date(i.dueDate) }), i.dueKm && fill(T.dueAt, { km: f.km(i.dueKm) })].filter(Boolean).join(' · ');
  const link = (car) => (cfg.appUrl ? `${cfg.appUrl}/#/car/${car.id}` : '');
  const hello = fill(T.hello, { name: user.getString('username') });

  const rows = items.map((i) => {
    const l = itemLabel(i, T, f);
    const href = link(i.car);
    const title = href ? `<a href="${esc(href)}" style="color:#0f172a;text-decoration:none">${esc(i.title)}</a>` : esc(i.title);
    return `<tr><td style="padding:10px 0;border-top:1px solid #e3e6ee">
      <div style="font-size:13px;font-weight:700;color:${l.color}">${esc(l.text)}</div>
      <div style="font-size:15px;font-weight:600">${title}</div>
      <div style="font-size:13px;color:#64748b">${esc([carName(i.car), due(i)].filter(Boolean).join(' · '))}</div></td></tr>`;
  }).join('');
  const html = layout(cfg, `
    <p style="margin:0 0 12px">${esc(hello)},<br>${esc(T.intro)}</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    ${cfg.appUrl ? `<p style="margin:18px 0 0"><a href="${esc(cfg.appUrl)}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#6d5ce7;color:#fff;text-decoration:none;font-weight:600">${esc(fill(T.open, { app: cfg.appName }))}</a></p>` : ''}
    <p style="margin:18px 0 0;font-size:12px;color:#64748b">${esc(T.footer)}</p>`);
  const lines = items.map((i) => `${itemLabel(i, T, f).text}: ${i.title} (${carName(i.car)})`);
  return {
    subject: `${cfg.appName}: ${fill(plural(T.subject, items.length), { n: items.length })}`,
    html,
    text: [`${hello},`, T.intro, '', ...lines.map((l) => `- ${l}`), '', cfg.appUrl, '', T.footer].join('\n'),
    push: lines.join('\n'),
  };
}

function sendMail(app, cfg, to, subject, html, text) {
  app.newMailClient().send(new MailerMessage({
    from: { address: cfg.mailFrom, name: cfg.mailFromName },
    to: [{ address: to }],
    subject,
    html,
    text,
  }));
}

// ntfy (ntfy://host/topic, ntfys://… or http(s)://host/topic) directly,
// every other service URL (tgram://, pover://, …) via the Apprise server.
function sendPush(cfg, url, title, body) {
  const ntfy = url.match(/^(ntfys?|https?):\/\/([^/\s]+)\/([\w-]+)\/?$/i);
  let req;
  if (ntfy) {
    const proto = ntfy[1].toLowerCase() === 'http' ? 'http' : 'https';
    req = { url: `${proto}://${ntfy[2]}`, body: { topic: ntfy[3], title, message: body } };
  } else if (cfg.appriseUrl) {
    req = { url: `${cfg.appriseUrl}/notify/`, body: { urls: url, title, body } };
  } else {
    throw new Error('Push service not supported – use ntfy or set APPRISE_URL.');
  }
  const res = $http.send({ url: req.url, method: 'POST', body: JSON.stringify(req.body), headers: { 'content-type': 'application/json' }, timeout: 20 });
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Push failed (HTTP ${res.statusCode})`);
}

const demoBlocked = (cfg, user) => !!cfg.demoUsername && user.getString('username') === cfg.demoUsername && cfg.demoDisabled.includes('notify');

// Hourly run: notifies every user whose hour it is. Returns the number of users notified.
// force = ignore hour and weekday (admin test).
function run(app, cfg, force = false) {
  const log = app.logger();
  const now = new Date();
  const today = dayNumber(localIso(now));
  let sent = 0;
  for (const user of app.findAllRecords('users')) {
    const settings = parse(user.getString('settings'));
    const opts = options(cfg, settings.notify);
    const email = cfg.mailEnabled ? opts.email : '';
    if ((!email && !opts.push) || demoBlocked(cfg, user)) continue;
    if (!force && (now.getHours() !== opts.hour || (opts.frequency === 'weekly' && now.getDay() !== 1))) continue;
    try {
      const lang = TEXTS[settings.language] ? settings.language : 'en';
      const items = dueItems(app, user, opts, lang, today);
      if (!items.length) continue;
      const msg = message(cfg, user, settings, items);
      if (email) sendMail(app, cfg, email, msg.subject, msg.html, msg.text);
      if (opts.push) sendPush(cfg, opts.push, msg.subject, msg.push);
      for (const i of items) {
        i.record.set('notified', i.key);
        app.save(i.record);
      }
      sent++;
    } catch (err) {
      log.error('CarMaint: reminder notification failed', 'user', user.getString('username'), 'error', String(err));
    }
  }
  if (sent) log.info('CarMaint: reminder notifications sent', 'users', sent);
  return sent;
}

// When the next notification will be sent with the given options, and what it contains
function preview(app, cfg, user, settings, rawOptions) {
  const opts = options(cfg, { ...rawOptions, enabled: true, email: 'x@x.x' });
  const now = new Date();
  let day = dayNumber(localIso(now));
  if (now.getHours() >= opts.hour) day++;
  if (opts.frequency === 'weekly') while (new Date(day * 864e5).getUTCDay() !== 1) day++;
  const lang = TEXTS[settings.language] ? settings.language : 'en';
  const T = TEXTS[lang];
  const f = format(lang, settings.currency);
  const items = dueItems(app, user, opts, lang, day).map((i) => ({ title: i.title, car: carName(i.car), label: itemLabel(i, T, f).text }));
  return { date: isoOfDay(day), hour: opts.hour, items };
}

function test(app, cfg, user, settings, email, push) {
  const lang = TEXTS[settings.language] ? settings.language : 'en';
  const T = TEXTS[lang];
  const hour = String(options(cfg, settings.notify).hour).padStart(2, '0');
  const body = fill(T.testBody, { hour });
  const subject = `${cfg.appName}: ${T.testSubject}`;
  if (email) {
    const hello = fill(T.hello, { name: user.getString('username') });
    sendMail(app, cfg, email, subject, layout(cfg, `<p style="margin:0 0 12px">${esc(hello)},</p><p style="margin:0">${esc(body)}</p>`), `${hello},\n\n${body}`);
  }
  if (push) sendPush(cfg, push, subject, body);
}

const settingsOf = (user) => parse(user.getString('settings'));

module.exports = { run, preview, test, isEmail, demoBlocked, settingsOf };
