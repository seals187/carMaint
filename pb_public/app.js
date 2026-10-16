'use strict';

const THEME_KEY = 'carmaint:theme';
const AUTH_KEY = 'carmaint:auth';
const CAR_PHOTO_MAX = 1600;               // px, longest side
const ATTACHMENT_MAX = 2000;              // receipts slightly larger so text stays readable
const UPLOAD_CHUNK = 24 * 1024 * 1024;    // stay below the server limit (32 MB) per request

const CURRENCIES = {
  EUR: { label: 'Euro',              locale: 'de-DE' },
  CHF: { label: 'Schweizer Franken', locale: 'de-CH' },
  USD: { label: 'US-Dollar',         locale: 'en-US' },
};

const INFO_MODES = { open: 'Offen', closed: 'Zugeklappt', remember: 'Merken' };
const DEFAULT_SETTINGS = { currency: 'EUR', infoBox: 'remember', infoCollapsed: false };

const TYPES = {
  service:    { label: 'Service',   color: 'blue' },
  repair:     { label: 'Reparatur', color: 'orange' },
  inspection: { label: 'TÜV / HU',  color: 'green' },
  tires:      { label: 'Reifen',    color: 'purple' },
  other:      { label: 'Sonstiges', color: 'gray' },
};

const ICONS = {
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  pin: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  contrast: '<circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 0 0 0-12v12z"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
};

const $ = (sel) => document.querySelector(sel);
const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => (v === '' || v == null ? null : Number(v));
const str = (v) => (v == null ? '' : String(v)).trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const isImageName = (name) => /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name);
// The server appends "_<10 chars>" to file names – strip it again for display.
const displayName = (name) => name.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, '$1');

let settings = { ...DEFAULT_SETTINGS };
let money = currencyFormat(settings.currency);

function currencyFormat(code) {
  return new Intl.NumberFormat(CURRENCIES[code].locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' });
}

const currencySymbol = () => money.formatToParts(0).find((p) => p.type === 'currency')?.value ?? settings.currency;
const defaultInfoCollapsed = () =>
  settings.infoBox === 'closed' || (settings.infoBox === 'remember' && settings.infoCollapsed);

const number = new Intl.NumberFormat('de-DE');
const km = (v) => (v ? `${number.format(v)} km` : '–');
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–');
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Vehicle data shown in the info box. `format` returns safe HTML for display.
const INFO_FIELDS = [
  { group: 'Kauf', key: 'purchasePrice', label: () => `Kaufpreis (${currencySymbol()})`, display: 'Kaufpreis', type: 'number', step: '0.01', format: (v) => money.format(v) },
  { group: 'Kauf', key: 'purchaseDate', label: 'Kaufdatum', type: 'date', format: fmtDate },
  { group: 'Zulassung', key: 'firstRegistration', label: '1. Inverkehrsetzung', type: 'date', format: fmtDate },
  { group: 'Zulassung', key: 'stammnummer', label: 'Stammnummer', placeholder: '123.456.789', format: (v) => `<span class="mono">${esc(v)}</span>` },
  // pinned: stays visible even when the info box is collapsed
  { group: 'Zulassung', key: 'vin', label: 'Fahrgestellnummer', placeholder: 'WVWZZZ1KZAW000000', upper: true, pinned: true, format: (v) => `<span class="mono">${esc(v)}</span>` },
  { group: 'Zulassung', key: 'typeApproval', label: 'Typengenehmigung', placeholder: '1VA123', upper: true, pinned: true },
  { group: 'Technik', key: 'power', label: 'Leistung (kW)', display: 'Leistung', type: 'number', format: (v) => `${number.format(v)} kW · ${number.format(Math.round(v * 1.35962))} PS` },
  { group: 'Technik', key: 'displacement', label: 'Hubraum (cm³)', display: 'Hubraum', type: 'number', format: (v) => `${number.format(v)} cm³` },
  { group: 'Technik', key: 'fuel', label: 'Treibstoff', options: ['Benzin', 'Diesel', 'Hybrid', 'Plug-in-Hybrid', 'Elektro', 'Erdgas / LPG'] },
  { group: 'Technik', key: 'color', label: 'Farbe', placeholder: 'z. B. Schwarz metallic' },
  { group: 'Prüfung (MFK)', key: 'lastInspection', label: 'Letzte MFK', type: 'date', format: fmtDate },
  { group: 'Prüfung (MFK)', key: 'nextInspection', label: 'Nächste MFK', type: 'date', format: (v) => `${fmtDate(v)}${dueBadge(v)}` },
];

function dueBadge(iso) {
  const days = Math.round((new Date(`${iso}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 864e5);
  if (days < 0) return '<span class="badge" data-color="red">überfällig</span>';
  if (days === 0) return '<span class="badge" data-color="orange">heute</span>';
  if (days <= 60) return `<span class="badge" data-color="orange">in ${plural(days, 'Tag', 'Tagen')}</span>`;
  return '';
}

/* ---------- Server (PocketBase) ---------- */

const FIELD_LABELS = {
  username: 'Benutzername', password: 'Passwort', passwordConfirm: 'Passwort-Wiederholung', oldPassword: 'Aktuelles Passwort',
  make: 'Marke', model: 'Modell', title: 'Titel', date: 'Datum', photos: 'Foto', attachments: 'Anhang',
};
const ERROR_CODES = {
  validation_not_unique: 'ist bereits vergeben',
  validation_required: 'ist erforderlich',
  validation_invalid_old_password: 'ist falsch',
  validation_values_mismatch: 'stimmt nicht überein',
  validation_length_out_of_range: 'hat eine ungültige Länge',
  validation_min_text_constraint: 'ist zu kurz',
  validation_max_text_constraint: 'ist zu lang',
  validation_invalid_format: 'hat ein ungültiges Format',
  validation_file_size_limit: 'ist zu groß (max. 20 MB)',
  validation_invalid_mime_type: 'hat einen nicht erlaubten Dateityp',
};

class ApiError extends Error {
  constructor(status, data) {
    const [field, err] = Object.entries(data?.data ?? {})[0] ?? [];
    let message;
    if (status === 0) message = 'Server nicht erreichbar.';
    else if (status === 429) message = 'Zu viele Versuche – bitte kurz warten.';
    else if (field) message = `${FIELD_LABELS[field] ?? field} ${ERROR_CODES[err.code] ?? `– ${err.message}`}`;
    else message = data?.message || `Fehler ${status}`;
    super(message);
    this.status = status;
  }
}

let auth = loadAuth();
const me = () => auth?.record;
const isAdmin = () => me()?.role === 'admin';

function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

function setAuth(next) {
  auth = next;
  try {
    if (next) localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    else localStorage.removeItem(AUTH_KEY);
  } catch {}
}

async function api(method, path, body) {
  const headers = {};
  if (auth?.token) headers.Authorization = auth.token;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && auth?.token) sessionExpired();
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

const rec = (collection, id = '') => `/api/collections/${collection}/records${id ? `/${id}` : ''}`;

async function listAll(collection, query = '') {
  const items = [];
  for (let page = 1; ; page++) {
    const res = await api('GET', `${rec(collection)}?page=${page}&perPage=500${query}`);
    items.push(...res.items);
    if (page >= res.totalPages) return items;
  }
}

// Files are attached in batches so a single request never gets too large.
async function uploadFiles(collection, id, field, files) {
  let record = null;
  let batch = new FormData();
  let size = 0;
  let count = 0;
  const flush = async () => {
    if (!count) return;
    record = await api('PATCH', rec(collection, id), batch);
    batch = new FormData();
    size = 0;
    count = 0;
  };
  for (const f of files) {
    if (count && size + f.blob.size > UPLOAD_CHUNK) await flush();
    batch.append(`${field}+`, f.blob, f.name);
    size += f.blob.size;
    count++;
  }
  await flush();
  return record;
}

/* ---------- Protected files ---------- */

// Photos and receipts require a short-lived file token. Loaded images are
// cached as object URLs so they do not reload when the view re-renders.
let fileTokenCache = { promise: null, at: 0 };
const blobCache = new Map();

function fileToken() {
  if (!fileTokenCache.promise || Date.now() - fileTokenCache.at > 60_000) {
    const promise = api('POST', '/api/files/token').then((r) => r.token);
    fileTokenCache = { promise, at: Date.now() };
    promise.catch(() => { if (fileTokenCache.promise === promise) fileTokenCache = { promise: null, at: 0 }; });
  }
  return fileTokenCache.promise;
}

async function fileUrl(path, thumb = '') {
  const token = await fileToken();
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  return `/api/files/${safePath}?token=${encodeURIComponent(token)}${thumb ? `&thumb=${thumb}` : ''}`;
}

async function fetchFile(path, thumb = '') {
  const res = await fetch(await fileUrl(path, thumb));
  if (!res.ok) throw new Error(`Datei nicht gefunden (${res.status})`);
  return res.blob();
}

function fileObjectUrl(path, thumb = '') {
  const key = `${path}|${thumb}`;
  if (!blobCache.has(key)) {
    const promise = fetchFile(path, thumb).then((blob) => URL.createObjectURL(blob));
    promise.catch(() => blobCache.delete(key));
    blobCache.set(key, promise);
  }
  return blobCache.get(key);
}

function forgetFiles(prefix = '') {
  for (const [key, promise] of blobCache) {
    if (!key.startsWith(prefix)) continue;
    promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
    blobCache.delete(key);
  }
}

// Images are rendered as <img data-file="…" data-thumb="…"> and loaded here.
function hydrate() {
  for (const img of document.querySelectorAll('img[data-file]:not([data-loading])')) {
    img.dataset.loading = '1';
    fileObjectUrl(img.dataset.file, img.dataset.thumb)
      .then((url) => { img.src = url; })
      .catch((err) => console.warn('Bild konnte nicht geladen werden', err));
  }
}

const carFile = (car, name) => `cars/${car.id}/${name}`;
const entryFile = (entry, name) => `entries/${entry.id}/${name}`;
const attachmentLabel = (entry, name) => entry?.attachmentNames?.[name] || displayName(name);

// Uploads attachments and remembers their original names (the server sanitizes file names).
async function uploadAttachments(entry, files) {
  const before = new Set(entry.attachments);
  const updated = await uploadFiles('entries', entry.id, 'attachments', files);
  const names = {};
  for (const name of updated.attachments) {
    if (entry.attachmentNames?.[name]) names[name] = entry.attachmentNames[name];
  }
  updated.attachments.filter((name) => !before.has(name)).forEach((name, i) => { names[name] = files[i]?.name ?? name; });
  return api('PATCH', rec('entries', entry.id), { attachmentNames: names });
}

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp', 'image/avif': '.avif', 'application/pdf': '.pdf' };
function withExt(name, type) {
  const ext = MIME_EXT[type];
  if (!ext) return name;
  const base = (name || 'datei').replace(/\.[^.]+$/, '');
  return base + ext;
}

async function compressImage(file, maxSize) {
  if (!/^image\/(jpeg|png|webp|bmp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  return blob && blob.size < file.size ? blob : file;
}

async function prepareFile(file, maxSize) {
  const blob = file.type.startsWith('image/') ? await compressImage(file, maxSize) : file;
  return { blob, name: withExt(file.name, blob.type || file.type) };
}

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

function dataUrlToBlob(url) {
  const [head, b64] = url.split(',');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: head.match(/^data:([^;,]*)/)?.[1] ?? '' });
}

function openFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  if (!/\.pdf$/i.test(name)) a.download = name; // open PDFs in a new tab, download everything else
  a.click();
}

/* ---------- Data ---------- */

let serverConfig = { appName: 'CarMaint', defaultCurrency: 'EUR', version: 'dev' };
let db = { cars: [], entries: [] };

async function loadData() {
  const [cars, entries] = await Promise.all([listAll('cars', '&sort=created'), listAll('entries')]);
  db = { cars, entries };
}

const carById = (id) => db.cars.find((c) => c.id === id);
const entryById = (id) => db.entries.find((e) => e.id === id);
const sum = (list) => list.reduce((t, e) => t + (Number(e.cost) || 0), 0);
const entriesFor = (carId) => db.entries
  .filter((e) => e.car === carId)
  .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage || 0) - (a.mileage || 0));

function upsertLocal(list, record) {
  const items = db[list];
  const i = items.findIndex((r) => r.id === record.id);
  if (i >= 0) items[i] = record;
  else items.push(record);
  return record;
}

function applyUserSettings() {
  const s = { ...DEFAULT_SETTINGS, currency: serverConfig.defaultCurrency, ...(me()?.settings ?? {}) };
  if (!CURRENCIES[s.currency]) s.currency = DEFAULT_SETTINGS.currency;
  if (!INFO_MODES[s.infoBox]) s.infoBox = DEFAULT_SETTINGS.infoBox;
  settings = s;
  money = currencyFormat(s.currency);
}

// Settings belong to the user account and apply on all devices.
async function saveSettings(next) {
  settings = { ...settings, ...next };
  money = currencyFormat(settings.currency);
  try {
    const record = await api('PATCH', rec('users', me().id), { settings });
    setAuth({ ...auth, record });
  } catch (err) {
    console.error(err);
    toast('Einstellung konnte nicht gespeichert werden');
  }
}

/* ---------- Authentication ---------- */

async function login(username, password) {
  try {
    const res = await api('POST', '/api/collections/users/auth-with-password', { identity: username, password });
    setAuth({ token: res.token, record: res.record });
  } catch (err) {
    if (err.status === 400) throw new Error('Benutzername oder Passwort falsch.');
    throw err;
  }
}

async function enterApp() {
  document.body.classList.remove('logged-out');
  applyUserSettings();
  infoCollapsed = defaultInfoCollapsed();
  currentCarId = null;
  await loadData();
  route();
}

function resetSession() {
  setAuth(null);
  db = { cars: [], entries: [] };
  forgetFiles();
  fileTokenCache = { promise: null, at: 0 };
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
  renderLogin();
}

function logout() {
  resetSession();
  toast('Abgemeldet');
}

function sessionExpired() {
  resetSession();
  toast('Bitte erneut anmelden');
}

function renderLogin() {
  document.body.classList.add('logged-out');
  $('#app').innerHTML = `
    <div class="login">
      <form class="card login-card" id="loginForm">
        <div class="login-logo">${icon('car')}</div>
        <div>
          <h1>${esc(serverConfig.appName)}</h1>
          <p class="muted">Melde dich an, um deine Fahrzeuge zu sehen.</p>
        </div>
        <label class="field">Benutzername<input name="username" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
        <label class="field">Passwort<input name="password" type="password" required autocomplete="current-password"></label>
        <p class="form-error" hidden></p>
        <button class="btn primary block" type="submit">Anmelden</button>
      </form>
    </div>`;
  const form = $('#loginForm');
  form.elements.namedItem('username').focus();
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    withBusy(form, async () => {
      const f = Object.fromEntries(new FormData(form));
      await login(f.username.trim(), f.password);
      await enterApp();
    });
  });
}

/* ---------- Views ---------- */

let currentCarId = null;
let filter = { type: 'all', q: '' };
let infoCollapsed = false;

function route() {
  if (!auth) return renderLogin();
  const [, view, id] = location.hash.split('/');
  const car = view === 'car' ? carById(id) : null;
  if (view === 'settings') {
    currentCarId = null;
    renderSettings();
  } else if (car) {
    if (car.id !== currentCarId) {
      filter = { type: 'all', q: '' };
      infoCollapsed = defaultInfoCollapsed();
    }
    currentCarId = car.id;
    renderCar(car);
  } else {
    currentCarId = null;
    renderHome();
  }
  hydrate();
}

function emptyState(iconName, title, text, action = '') {
  return `
    <div class="card empty">
      <div class="avatar">${icon(iconName)}</div>
      <h3>${title}</h3>
      <p class="muted">${text}</p>
      ${action}
    </div>`;
}

function renderHome() {
  const addBtn = (label) => `<button class="btn primary" data-action="add-car">${icon('plus')}${label}</button>`;
  $('#app').innerHTML = `
    <section class="hero">
      <div>
        <h1>Meine Fahrzeuge</h1>
        <p class="muted">${plural(db.cars.length, 'Fahrzeug', 'Fahrzeuge')} · ${plural(db.entries.length, 'Eintrag', 'Einträge')} · ${money.format(sum(db.entries))} gesamt</p>
      </div>
      ${db.cars.length ? addBtn('Fahrzeug') : ''}
    </section>
    ${db.cars.length
      ? `<div class="grid">${db.cars.map(carCard).join('')}</div>`
      : emptyState('car', 'Noch keine Fahrzeuge', 'Füge dein erstes Auto hinzu – oder importiere ein Backup in den Einstellungen.', addBtn('Fahrzeug hinzufügen'))}`;
}

function renderSettings() {
  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}Alle Fahrzeuge</a>
    <section class="hero"><h1>Einstellungen</h1></section>

    <div class="section-head"><h2>Darstellung</h2></div>
    <div class="card settings">
      <div class="setting">
        <div>
          <h3>Währung</h3>
          <p class="muted small">Gilt für alle Kostenangaben. Bereits erfasste Beträge werden nicht umgerechnet.</p>
          <p class="muted small" id="currencyExample">Beispiel: ${money.format(1234.5)}</p>
        </div>
        ${segmented('currency', 'Währung', Object.fromEntries(Object.keys(CURRENCIES).map((c) => [c, c])))}
      </div>
      <div class="setting">
        <div>
          <h3>Fahrzeugdaten</h3>
          <p class="muted small">Ob die Infobox beim Öffnen eines Autos auf- oder zugeklappt ist. „Merken“ behält den zuletzt gewählten Zustand.<br>Fahrgestellnummer und Typengenehmigung sind immer sichtbar.</p>
        </div>
        ${segmented('infoBox', 'Fahrzeugdaten', INFO_MODES)}
      </div>
    </div>

    <div class="section-head"><h2>Daten</h2></div>
    <div class="card settings">
      <div class="setting">
        <div>
          <h3>Backup</h3>
          <p class="muted small">Alle Fahrzeuge, Einträge, Fotos und Belege in einer Datei. Beim Import werden deine aktuellen Fahrzeuge ersetzt.</p>
        </div>
        <div class="setting-actions">
          <button class="btn ghost" data-action="export">${icon('download')}Exportieren</button>
          <label class="btn ghost">${icon('upload')}Importieren<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
      </div>
    </div>

    <div class="section-head"><h2>Konto</h2></div>
    <div class="card settings">
      <div class="setting">
        <div>
          <h3>${esc(me().username)}</h3>
          <p class="muted small">${isAdmin() ? 'Administrator' : 'Benutzer'}</p>
        </div>
        <div class="setting-actions">
          <button class="btn ghost" data-action="change-password" data-id="${esc(me().id)}">${icon('key')}Passwort ändern</button>
          <button class="btn ghost" data-action="logout">${icon('logout')}Abmelden</button>
        </div>
      </div>
    </div>

    ${isAdmin() ? `
      <div class="section-head">
        <h2>Benutzer</h2>
        <button class="btn ghost sm-btn" data-action="add-user">${icon('userPlus')}Hinzufügen</button>
      </div>
      <div class="card settings" id="usersCard"><p class="muted small center">Lade Benutzer …</p></div>` : ''}
    <p class="muted small version">${esc(serverConfig.appName)} · Version ${esc(serverConfig.version)}</p>`;

  if (isAdmin()) renderUsers();
}

async function renderUsers() {
  const card = $('#usersCard');
  try {
    const users = await listAll('users', '&sort=username');
    if (!card.isConnected) return;
    card.innerHTML = users.map((u) => {
      const self = u.id === me().id;
      return `
        <div class="user-row">
          <div class="user-avatar">${esc(u.username.slice(0, 1).toUpperCase())}</div>
          <div class="grow">
            <strong>${esc(u.username)}</strong>${self ? ' <span class="muted small">(du)</span>' : ''}
            <p class="muted small">${u.role === 'admin' ? 'Administrator' : 'Benutzer'}</p>
          </div>
          ${self ? '' : `
            <button class="icon-btn sm" data-action="change-password" data-id="${esc(u.id)}" data-name="${esc(u.username)}" title="Passwort zurücksetzen" aria-label="Passwort von ${esc(u.username)} zurücksetzen">${icon('key')}</button>
            <button class="icon-btn sm danger" data-action="delete-user" data-id="${esc(u.id)}" data-name="${esc(u.username)}" title="Benutzer löschen" aria-label="${esc(u.username)} löschen">${icon('trash')}</button>`}
        </div>`;
    }).join('');
  } catch (err) {
    card.innerHTML = `<p class="muted small center">${esc(err.message)}</p>`;
  }
}

function segmented(name, ariaLabel, options) {
  return `
    <div class="segmented" role="radiogroup" aria-label="${ariaLabel}">
      ${Object.entries(options).map(([value, label]) => `
        <label>
          <input type="radio" name="${name}" value="${value}" ${settings[name] === value ? 'checked' : ''}>
          <span>${label}</span>
        </label>`).join('')}
    </div>`;
}

document.addEventListener('change', (ev) => {
  const { name, value } = ev.target;
  if (name === 'currency' && CURRENCIES[value]) {
    saveSettings({ currency: value });
    $('#currencyExample').textContent = `Beispiel: ${money.format(1234.5)}`;
    toast(`Währung: ${CURRENCIES[value].label}`);
  } else if (name === 'infoBox' && INFO_MODES[value]) {
    saveSettings({ infoBox: value });
    infoCollapsed = defaultInfoCollapsed();
    toast(`Fahrzeugdaten: ${INFO_MODES[value]}`);
  }
});

function carCard(car) {
  const entries = entriesFor(car.id);
  const last = entries[0];
  const cover = car.photos[0];
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  return `
    <article class="card car-card">
      <div class="car-media">${cover ? `<img data-file="${esc(carFile(car, cover))}" data-thumb="640x360" alt="">` : icon('car')}</div>
      <div class="car-card-body">
        <div class="car-card-title">
          <div>
            <h3><a class="card-link" href="#/car/${esc(car.id)}">${esc(car.make)} ${esc(car.model)}</a></h3>
            <p class="muted small">${sub || '&nbsp;'}</p>
          </div>
          <button class="icon-btn quick-add" data-action="add-entry" data-id="${esc(car.id)}" title="Eintrag hinzufügen" aria-label="Eintrag für ${esc(car.make)} ${esc(car.model)} hinzufügen">${icon('wrench')}</button>
        </div>
        <dl class="stats">
          <div><dt>Kilometer</dt><dd>${km(car.mileage)}</dd></div>
          <div><dt>Einträge</dt><dd>${entries.length}</dd></div>
          <div><dt>Kosten</dt><dd>${money.format(sum(entries))}</dd></div>
        </dl>
        <p class="card-foot muted">${last ? `Zuletzt: ${esc(last.title)} · <span class="nowrap">${fmtDate(last.date)}</span>` : 'Noch keine Einträge'}</p>
      </div>
    </article>`;
}

function renderCar(car) {
  const entries = entriesFor(car.id);
  const photos = car.photos;
  const year = String(new Date().getFullYear());
  const lastService = entries.find((e) => e.type === 'service');
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  const tile = (label, value) => `<div class="card tile"><span>${label}</span><strong>${value}</strong></div>`;
  const id = esc(car.id);

  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}Alle Fahrzeuge</a>
    <section class="hero">
      <div class="hero-title">
        <div class="avatar lg">${photos[0] ? `<img data-file="${esc(carFile(car, photos[0]))}" data-thumb="300x225" alt="">` : icon('car')}</div>
        <div>
          <h1>${esc(car.make)} ${esc(car.model)}</h1>
          ${sub ? `<p class="muted">${sub}</p>` : ''}
        </div>
      </div>
      <div class="hero-actions">
        <button class="icon-btn" data-action="edit-car" data-id="${id}" title="Fahrzeug bearbeiten" aria-label="Fahrzeug bearbeiten">${icon('pencil')}</button>
        <button class="icon-btn danger" data-action="delete-car" data-id="${id}" title="Fahrzeug löschen" aria-label="Fahrzeug löschen">${icon('trash')}</button>
        <button class="btn primary" data-action="add-entry" data-id="${id}">${icon('plus')}Eintrag</button>
      </div>
    </section>
    <div class="tiles">
      ${tile('Kilometerstand', km(car.mileage))}
      ${tile('Gesamtkosten', money.format(sum(entries)))}
      ${tile(`Kosten ${year}`, money.format(sum(entries.filter((e) => e.date.startsWith(year)))))}
      ${tile('Letzter Service', lastService ? fmtDate(lastService.date) : '–')}
    </div>

    <div class="car-overview">
      <section>
        <div class="section-head"><h2>Fotos</h2>${photos.length ? `<span class="muted small">${photos.length}</span>` : ''}</div>
        <div class="photo-grid">
          ${photos.map((name, i) => `
            <div class="thumb">
              <button class="thumb-img" data-action="view-photo" data-id="${id}" data-index="${i}" aria-label="Foto ${i + 1} ansehen"><img data-file="${esc(carFile(car, name))}" data-thumb="300x225" alt=""></button>
              ${i === 0 ? '<span class="cover-badge">Titelbild</span>' : ''}
              <div class="thumb-actions">
                ${i > 0 ? `<button class="icon-btn sm" data-action="cover-photo" data-id="${id}" data-photo="${esc(name)}" title="Als Titelbild" aria-label="Als Titelbild">${icon('star')}</button>` : ''}
                <button class="icon-btn sm" data-action="delete-photo" data-id="${id}" data-photo="${esc(name)}" title="Foto löschen" aria-label="Foto löschen">${icon('trash')}</button>
              </div>
            </div>`).join('')}
          <label class="thumb add">${icon('image')}<span>Fotos hinzufügen</span>
            <input type="file" multiple accept="image/*" data-upload="car-photos" data-id="${id}" hidden>
          </label>
        </div>
      </section>
      ${infoBox(car)}
    </div>

    <div class="section-head"><h2>Historie</h2>${entries.length ? `<span class="muted small">${entries.length}</span>` : ''}</div>
    ${entries.length ? `
      <div class="toolbar">
        <div class="chips">
          ${['all', ...Object.keys(TYPES)].map((t) => `
            <button class="chip" data-action="filter" data-type="${t}" aria-pressed="${filter.type === t}">${t === 'all' ? 'Alle' : TYPES[t].label}</button>`).join('')}
        </div>
        <label class="search">${icon('search')}<input type="search" id="search" placeholder="Suchen …" value="${esc(filter.q)}" aria-label="Einträge durchsuchen"></label>
      </div>` : ''}
    <div id="entries"></div>`;

  $('#search')?.addEventListener('input', (ev) => {
    filter.q = ev.target.value;
    renderEntries(car);
  });
  renderEntries(car);
}

function infoBox(car) {
  const info = car.info ?? {};
  const rows = INFO_FIELDS.filter((f) => info[f.key] != null && info[f.key] !== '');
  const hiddenCount = rows.filter((f) => !f.pinned).length;
  const collapsible = hiddenCount > 0;
  const collapsed = collapsible && infoCollapsed;
  const id = esc(car.id);
  return `
    <aside class="infobox-wrap${collapsed ? ' collapsed' : ''}" id="infobox">
      <div class="section-head">
        <h2>Fahrzeugdaten</h2>
        <div class="infobox-actions">
          ${rows.length ? `<button class="icon-btn sm" data-action="edit-info" data-id="${id}" title="Fahrzeugdaten bearbeiten" aria-label="Fahrzeugdaten bearbeiten">${icon('pencil')}</button>` : ''}
          ${collapsible ? `<button class="icon-btn sm info-toggle" data-action="toggle-info" aria-expanded="${!collapsed}" title="Auf-/Zuklappen" aria-label="Fahrzeugdaten auf- oder zuklappen">${icon('chevronDown')}</button>` : ''}
        </div>
      </div>
      <div class="card infobox">
      ${rows.length
        ? `<dl class="info-list">${rows.map((f) => `
            <div${f.pinned ? ' class="pinned"' : ''}><dt>${f.display ?? f.label}</dt><dd>${f.format ? f.format(info[f.key]) : esc(info[f.key])}</dd></div>`).join('')}
          </dl>
          ${collapsible ? `<button class="info-more" data-action="toggle-info">${plural(hiddenCount, 'weiteres Feld', 'weitere Felder')} anzeigen</button>` : ''}`
        : `<div class="infobox-empty">
             <p class="muted small">Kaufpreis, Stammnummer, nächste MFK und mehr an einem Ort.</p>
             <button class="btn ghost file-btn" data-action="edit-info" data-id="${id}">${icon('plus')}Daten erfassen</button>
           </div>`}
      </div>
    </aside>`;
}

function renderEntries(car) {
  const all = entriesFor(car.id);
  const q = filter.q.trim().toLowerCase();
  const list = all.filter((e) =>
    (filter.type === 'all' || e.type === filter.type) &&
    (!q || [e.title, e.notes, e.shop].join(' ').toLowerCase().includes(q)));

  let html;
  if (!all.length) {
    html = emptyState('wrench', 'Noch keine Einträge', 'Notiere deinen ersten Service oder eine Reparatur.',
      `<button class="btn primary" data-action="add-entry" data-id="${esc(car.id)}">${icon('plus')}Eintrag hinzufügen</button>`);
  } else if (!list.length) {
    html = '<p class="muted center">Keine passenden Einträge gefunden.</p>';
  } else {
    let lastYear = null;
    html = `<ul class="timeline">${list.map((e) => {
      const y = e.date.slice(0, 4);
      const header = y !== lastYear ? `<li class="year">${esc(y)}</li>` : '';
      lastYear = y;
      return header + entryItem(e);
    }).join('')}</ul>`;
  }
  $('#entries').innerHTML = html;
  hydrate();
}

function attachmentItem(entry, name) {
  const label = esc(attachmentLabel(entry, name));
  if (isImageName(name)) {
    return `<button class="att" data-action="view-attachment" data-id="${esc(entry.id)}" data-file="${esc(name)}" title="${label}" aria-label="${label} ansehen"><img data-file="${esc(entryFile(entry, name))}" data-thumb="128x128" alt=""></button>`;
  }
  return `<button class="att file" data-action="open-file" data-id="${esc(entry.id)}" data-file="${esc(name)}" title="${label}">${icon('file')}<span>${label}</span></button>`;
}

function entryItem(e) {
  const t = TYPES[e.type] ?? TYPES.other;
  const id = esc(e.id);
  return `
    <li class="entry" data-color="${t.color}">
      <div class="entry-dot"></div>
      <div class="card entry-body">
        <div class="entry-head">
          <span class="badge" data-color="${t.color}">${t.label}</span>
          <time datetime="${esc(e.date)}">${fmtDate(e.date)}</time>
          ${e.mileage ? `<span class="muted">${km(e.mileage)}</span>` : ''}
          <span class="entry-cost">${e.cost ? money.format(e.cost) : ''}</span>
        </div>
        <h4>${esc(e.title)}</h4>
        ${e.shop ? `<p class="muted small">${icon('pin')}${esc(e.shop)}</p>` : ''}
        ${e.notes ? `<p class="entry-notes">${esc(e.notes)}</p>` : ''}
        ${e.attachments.length ? `<div class="attachments">${e.attachments.map((name) => attachmentItem(e, name)).join('')}</div>` : ''}
        <div class="entry-actions">
          <button class="icon-btn sm" data-action="edit-entry" data-id="${id}" title="Bearbeiten" aria-label="Bearbeiten">${icon('pencil')}</button>
          <button class="icon-btn sm danger" data-action="delete-entry" data-id="${id}" title="Löschen" aria-label="Löschen">${icon('trash')}</button>
        </div>
      </div>
    </li>`;
}

/* ---------- Dialogs ---------- */

const carDialog = $('#carDialog');
const carForm = $('#carForm');
const entryDialog = $('#entryDialog');
const entryForm = $('#entryForm');
const infoDialog = $('#infoDialog');
const infoForm = $('#infoForm');
const userDialog = $('#userDialog');
const userForm = $('#userForm');
const passwordDialog = $('#passwordDialog');
const passwordForm = $('#passwordForm');
const lightbox = $('#lightbox');

$('#typeSelect').innerHTML = Object.entries(TYPES)
  .map(([key, t]) => `<option value="${key}">${t.label}</option>`).join('');

function showDialog(dialog) {
  dialog.querySelectorAll('.form-error').forEach((el) => { el.hidden = true; });
  dialog.showModal();
}

async function withBusy(form, fn) {
  const btn = form.querySelector('[type="submit"]');
  const errorEl = form.querySelector('.form-error');
  btn.disabled = true;
  if (errorEl) errorEl.hidden = true;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    const message = err.message || 'Speichern fehlgeschlagen.';
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      alert(message);
    }
  } finally {
    btn.disabled = false;
  }
}

function openCarDialog(car) {
  const f = carForm.elements;
  carForm.reset();
  f.namedItem('id').value = car?.id ?? '';
  for (const key of ['make', 'model', 'plate']) f.namedItem(key).value = car?.[key] ?? '';
  for (const key of ['year', 'mileage']) f.namedItem(key).value = car?.[key] || '';
  $('#carPhotosLabel').textContent = 'Fotos auswählen';
  $('#carDialogTitle').textContent = car ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug';
  showDialog(carDialog);
}

$('#carPhotos').addEventListener('change', (ev) => {
  const n = ev.target.files.length;
  $('#carPhotosLabel').textContent = n ? `${plural(n, 'Foto', 'Fotos')} ausgewählt` : 'Fotos auswählen';
});

carForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(carForm, async () => {
    const f = Object.fromEntries(new FormData(carForm));
    const photos = await Promise.all([...$('#carPhotos').files].map((file) => prepareFile(file, CAR_PHOTO_MAX)));
    const data = {
      make: f.make.trim(),
      model: f.model.trim(),
      year: num(f.year),
      plate: f.plate.trim().toUpperCase(),
      mileage: num(f.mileage),
    };
    let car = f.id
      ? await api('PATCH', rec('cars', f.id), data)
      : await api('POST', rec('cars'), { ...data, owner: me().id });
    if (photos.length) car = await uploadFiles('cars', car.id, 'photos', photos);
    upsertLocal('cars', car);
    carDialog.close();
    if (!f.id) location.hash = `#/car/${car.id}`;
    route();
    toast(f.id ? 'Fahrzeug aktualisiert' : 'Fahrzeug hinzugefügt');
  });
});

// Attachments in the entry dialog: keep/remove existing ones, queue new ones.
let draft = { entry: null, keep: [], add: [] };

function renderDraft() {
  const item = (media, name, list, i) => `
    <div class="draft-item">${media}<span>${esc(name)}</span>
      <button type="button" class="icon-btn sm" data-remove="${list}" data-index="${i}" aria-label="${esc(name)} entfernen">${icon('x')}</button>
    </div>`;
  $('#attEditor').innerHTML = [
    ...draft.keep.map((name, i) => item(
      isImageName(name) ? `<img data-file="${esc(entryFile(draft.entry, name))}" data-thumb="128x128" alt="">` : icon('file'),
      attachmentLabel(draft.entry, name), 'keep', i)),
    ...draft.add.map((d, i) => item(d.url ? `<img src="${d.url}" alt="">` : icon('file'), d.file.name, 'add', i)),
  ].join('');
  hydrate();
}

function clearDraft() {
  draft.add.forEach((d) => d.url && URL.revokeObjectURL(d.url));
  draft = { entry: null, keep: [], add: [] };
}

function openEntryDialog(entry) {
  const car = carById(entry.car);
  const f = entryForm.elements;
  entryForm.reset();
  f.namedItem('id').value = entry.id ?? '';
  f.namedItem('car').value = car.id;
  f.namedItem('type').value = entry.type ?? 'service';
  f.namedItem('date').value = entry.date ?? today();
  f.namedItem('mileage').value = entry.mileage || car.mileage || '';
  f.namedItem('cost').value = entry.cost || '';
  for (const key of ['title', 'shop', 'notes']) f.namedItem(key).value = entry[key] ?? '';
  $('#currencySymbol').textContent = currencySymbol();
  clearDraft();
  draft.entry = entry.id ? entry : null;
  draft.keep = [...(entry.attachments ?? [])];
  renderDraft();
  $('#entryDialogTitle').textContent = entry.id ? 'Eintrag bearbeiten' : `Neuer Eintrag · ${car.make} ${car.model}`;
  showDialog(entryDialog);
}

$('#attInput').addEventListener('change', (ev) => {
  for (const file of ev.target.files) draft.add.push({ file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null });
  ev.target.value = '';
  renderDraft();
});

$('#attEditor').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-remove]');
  if (!btn) return;
  const [removed] = draft[btn.dataset.remove].splice(Number(btn.dataset.index), 1);
  if (removed?.url) URL.revokeObjectURL(removed.url);
  renderDraft();
});

entryDialog.addEventListener('close', clearDraft);

entryForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(entryForm, async () => {
    const f = Object.fromEntries(new FormData(entryForm));
    const existing = entryById(f.id);
    const files = await Promise.all(draft.add.map((d) => prepareFile(d.file, ATTACHMENT_MAX)));
    const removed = (existing?.attachments ?? []).filter((name) => !draft.keep.includes(name));
    const data = {
      type: f.type,
      date: f.date,
      mileage: num(f.mileage),
      title: f.title.trim(),
      cost: num(f.cost),
      shop: f.shop.trim(),
      notes: f.notes.trim(),
    };
    if (removed.length) {
      data['attachments-'] = removed;
      data.attachmentNames = Object.fromEntries(Object.entries(existing.attachmentNames ?? {}).filter(([name]) => !removed.includes(name)));
    }

    let entry = existing
      ? await api('PATCH', rec('entries', existing.id), data)
      : await api('POST', rec('entries'), { ...data, car: f.car });
    if (files.length) entry = await uploadAttachments(entry, files);
    upsertLocal('entries', entry);
    removed.forEach((name) => forgetFiles(entryFile(entry, name)));

    const car = carById(f.car);
    if (data.mileage && data.mileage > (car.mileage || 0)) {
      upsertLocal('cars', await api('PATCH', rec('cars', car.id), { mileage: data.mileage }));
    }

    entryDialog.close();
    route();
    toast(existing ? 'Eintrag aktualisiert' : 'Eintrag gespeichert');
  });
});

function infoInput(f, value) {
  const label = typeof f.label === 'function' ? f.label() : f.label;
  const control = f.options
    ? `<select name="${f.key}"><option value="">–</option>${f.options.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
    : `<input name="${f.key}" type="${f.type ?? 'text'}" value="${esc(value ?? '')}"${f.type === 'number' ? ' min="0"' : ''}${f.step ? ` step="${f.step}"` : ''} placeholder="${esc(f.placeholder ?? '')}">`;
  return `<label class="field">${label}${control}</label>`;
}

function openInfoDialog(car) {
  const info = car.info ?? {};
  const groups = [...new Set(INFO_FIELDS.map((f) => f.group))];
  $('#infoFields').innerHTML = groups.map((g) => `
    <div class="form-group">
      <h3>${g}</h3>
      <div class="row">${INFO_FIELDS.filter((f) => f.group === g).map((f) => infoInput(f, info[f.key])).join('')}</div>
    </div>`).join('');
  infoForm.elements.namedItem('carId').value = car.id;
  $('#infoDialogTitle').textContent = `Fahrzeugdaten · ${car.make} ${car.model}`;
  showDialog(infoDialog);
}

infoForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(infoForm, async () => {
    const form = new FormData(infoForm);
    const info = {};
    for (const f of INFO_FIELDS) {
      const raw = String(form.get(f.key) ?? '').trim();
      if (raw) info[f.key] = f.type === 'number' ? Number(raw) : f.upper ? raw.toUpperCase() : raw;
    }
    upsertLocal('cars', await api('PATCH', rec('cars', form.get('carId')), { info }));
    infoDialog.close();
    route();
    toast('Fahrzeugdaten gespeichert');
  });
});

function openPasswordDialog(userId, username) {
  const self = userId === me().id;
  passwordForm.reset();
  passwordForm.elements.namedItem('userId').value = userId;
  $('#oldPasswordField').hidden = !self;
  passwordForm.elements.namedItem('oldPassword').required = self;
  $('#passwordDialogTitle').textContent = self ? 'Passwort ändern' : `Passwort für ${username} setzen`;
  showDialog(passwordDialog);
}

passwordForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(passwordForm, async () => {
    const f = Object.fromEntries(new FormData(passwordForm));
    if (f.password !== f.passwordConfirm) throw new Error('Die neuen Passwörter stimmen nicht überein.');
    const self = f.userId === me().id;
    const body = { password: f.password, passwordConfirm: f.passwordConfirm };
    if (self) body.oldPassword = f.oldPassword;
    await api('PATCH', rec('users', f.userId), body);
    if (self) {
      // Changing the password invalidates old sessions – sign in again right away.
      const username = me().username;
      setAuth({ ...auth, token: '' });
      await login(username, f.password);
    }
    passwordDialog.close();
    toast('Passwort geändert');
  });
});

userForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(userForm, async () => {
    const f = Object.fromEntries(new FormData(userForm));
    await api('POST', rec('users'), {
      username: f.username.trim(),
      password: f.password,
      passwordConfirm: f.password,
      role: f.role,
      settings: { currency: serverConfig.defaultCurrency },
    });
    userDialog.close();
    renderUsers();
    toast(`Benutzer ${f.username.trim()} angelegt`);
  });
});

for (const dialog of [carDialog, entryDialog, infoDialog, userDialog, passwordDialog, lightbox]) {
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog || ev.target.closest('[data-close]')) dialog.close();
  });
}

/* ---------- Image viewer ---------- */

const lb = { files: [], index: 0 };

function openLightbox(files, index) {
  if (!files.length) return;
  lb.files = files;
  lb.index = Math.max(0, index);
  $('#lbImg').removeAttribute('src');
  showLightboxImage();
  lightbox.showModal();
}

async function showLightboxImage() {
  const index = lb.index;
  lightbox.classList.toggle('single', lb.files.length < 2);
  $('#lbCaption').textContent = lb.files.length > 1 ? `${index + 1} / ${lb.files.length}` : '';
  try {
    const url = await fileObjectUrl(lb.files[index]);
    if (lb.index === index) $('#lbImg').src = url;
  } catch (err) {
    console.warn(err);
  }
}

function stepLightbox(delta) {
  lb.index = (lb.index + delta + lb.files.length) % lb.files.length;
  showLightboxImage();
}

lightbox.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-lb]');
  if (btn) stepLightbox(Number(btn.dataset.lb));
});

document.addEventListener('keydown', (ev) => {
  if (!lightbox.open || lb.files.length < 2) return;
  if (ev.key === 'ArrowLeft') stepLightbox(-1);
  if (ev.key === 'ArrowRight') stepLightbox(1);
});

/* ---------- Actions ---------- */

async function runAction(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Aktion fehlgeschlagen.');
  }
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'logout':
      logout();
      break;
    case 'add-car':
      openCarDialog();
      break;
    case 'edit-car':
      openCarDialog(carById(id));
      break;
    case 'delete-car': {
      const car = carById(id);
      const count = entriesFor(id).length;
      if (!confirm(`${car.make} ${car.model} und ${plural(count, 'Eintrag', 'Einträge')} wirklich löschen?`)) return;
      runAction(async () => {
        await api('DELETE', rec('cars', id));
        db.cars = db.cars.filter((c) => c.id !== id);
        db.entries = db.entries.filter((e) => e.car !== id);
        forgetFiles(`cars/${id}/`);
        location.hash = '#/';
        route();
        toast('Fahrzeug gelöscht');
      });
      break;
    }
    case 'edit-info':
      openInfoDialog(carById(id));
      break;
    case 'toggle-info': {
      infoCollapsed = !infoCollapsed;
      if (settings.infoBox === 'remember') saveSettings({ infoCollapsed });
      const box = $('#infobox');
      box.classList.toggle('collapsed', infoCollapsed);
      box.querySelector('.info-toggle').setAttribute('aria-expanded', !infoCollapsed);
      break;
    }
    case 'view-photo': {
      const car = carById(id);
      openLightbox(car.photos.map((name) => carFile(car, name)), Number(el.dataset.index));
      break;
    }
    case 'cover-photo':
      runAction(async () => {
        const car = carById(id);
        const photos = [el.dataset.photo, ...car.photos.filter((p) => p !== el.dataset.photo)];
        upsertLocal('cars', await api('PATCH', rec('cars', id), { photos }));
        route();
        toast('Titelbild geändert');
      });
      break;
    case 'delete-photo':
      if (!confirm('Dieses Foto löschen?')) return;
      runAction(async () => {
        upsertLocal('cars', await api('PATCH', rec('cars', id), { 'photos-': [el.dataset.photo] }));
        forgetFiles(`cars/${id}/${el.dataset.photo}|`);
        route();
        toast('Foto gelöscht');
      });
      break;
    case 'add-entry':
      openEntryDialog({ car: id });
      break;
    case 'edit-entry':
      openEntryDialog(entryById(id));
      break;
    case 'delete-entry': {
      const entry = entryById(id);
      if (!confirm(`„${entry.title}“ wirklich löschen?`)) return;
      runAction(async () => {
        await api('DELETE', rec('entries', id));
        db.entries = db.entries.filter((e) => e.id !== id);
        forgetFiles(`entries/${id}/`);
        route();
        toast('Eintrag gelöscht');
      });
      break;
    }
    case 'view-attachment': {
      const entry = entryById(id);
      const images = entry.attachments.filter(isImageName);
      openLightbox(images.map((name) => entryFile(entry, name)), images.indexOf(el.dataset.file));
      break;
    }
    case 'open-file':
      runAction(async () => {
        const entry = entryById(id);
        const name = el.dataset.file;
        openFile(await fileObjectUrl(entryFile(entry, name)), attachmentLabel(entry, name));
      });
      break;
    case 'filter':
      filter.type = el.dataset.type;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === el));
      renderEntries(carById(currentCarId));
      break;
    case 'export':
      runAction(exportBackup);
      break;
    case 'change-password':
      openPasswordDialog(id, el.dataset.name);
      break;
    case 'add-user':
      userForm.reset();
      showDialog(userDialog);
      break;
    case 'delete-user':
      if (!confirm(`Benutzer „${el.dataset.name}“ und alle seine Fahrzeuge wirklich löschen?`)) return;
      runAction(async () => {
        await api('DELETE', rec('users', id));
        renderUsers();
        toast(`Benutzer ${el.dataset.name} gelöscht`);
      });
      break;
  }
});

document.addEventListener('change', async (ev) => {
  const input = ev.target.closest('input[data-upload="car-photos"]');
  if (!input?.files.length) return;
  const files = [...input.files];
  toast(`${plural(files.length, 'Foto wird', 'Fotos werden')} hochgeladen …`, 0);
  await runAction(async () => {
    const prepared = await Promise.all(files.map((file) => prepareFile(file, CAR_PHOTO_MAX)));
    upsertLocal('cars', await uploadFiles('cars', input.dataset.id, 'photos', prepared));
    route();
    toast(`${plural(files.length, 'Foto', 'Fotos')} hinzugefügt`);
  });
});

/* ---------- Backup ---------- */

// Format (version 2) is compatible with backups from the former browser-only version.
async function exportBackup() {
  const total = db.cars.reduce((n, c) => n + c.photos.length, 0) + db.entries.reduce((n, e) => n + e.attachments.length, 0);
  let done = 0;
  const files = [];
  const addFile = async (path, name) => {
    toast(`Backup wird erstellt … ${++done}/${total}`, 0);
    const blob = await fetchFile(path);
    files.push({ id: path, name, type: blob.type, data: await blobToDataUrl(blob) });
    return { id: path, name, type: blob.type };
  };

  const cars = [];
  for (const c of db.cars) {
    const photos = [];
    for (const name of c.photos) photos.push((await addFile(carFile(c, name), displayName(name))).id);
    cars.push({ id: c.id, make: c.make, model: c.model, year: c.year || null, plate: c.plate, mileage: c.mileage || null, info: c.info ?? {}, photos });
  }
  const entries = [];
  for (const e of db.entries) {
    const attachments = [];
    for (const name of e.attachments) attachments.push(await addFile(entryFile(e, name), attachmentLabel(e, name)));
    entries.push({
      id: e.id, carId: e.car, type: e.type, date: e.date, mileage: e.mileage || null, title: e.title,
      cost: e.cost || null, shop: e.shop, notes: e.notes, attachments,
    });
  }

  const backup = { version: 2, app: 'carmaint', exported: new Date().toISOString(), settings, cars, entries, files };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carmaint-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup exportiert');
}

async function importBackup(data) {
  if (!Array.isArray(data?.cars) || !Array.isArray(data?.entries)) throw new Error('Ungültige Backup-Datei.');
  const files = new Map((Array.isArray(data.files) ? data.files : []).map((f) => [f.id, f]));
  const fileOf = (id, fallbackName) => {
    const f = files.get(id);
    if (!f?.data) return null;
    const blob = dataUrlToBlob(f.data);
    return { blob, name: withExt(f.name || fallbackName || 'datei', blob.type) };
  };

  const oldCars = db.cars.map((c) => c.id);
  const created = [];
  const carIds = new Map();
  const total = data.cars.length + data.entries.length;
  let done = 0;
  const progress = () => toast(`Import läuft … ${++done}/${total}`, 0);

  try {
    for (const c of data.cars) {
      progress();
      let car = await api('POST', rec('cars'), {
        owner: me().id,
        make: str(c.make) || '?',
        model: str(c.model) || '?',
        year: num(c.year),
        plate: str(c.plate),
        mileage: num(c.mileage),
        info: c.info && typeof c.info === 'object' ? c.info : {},
      });
      created.push(car.id);
      const photos = (Array.isArray(c.photos) ? c.photos : []).map((id) => fileOf(id, 'foto')).filter(Boolean);
      if (photos.length) car = await uploadFiles('cars', car.id, 'photos', photos);
      carIds.set(c.id, car.id);
    }
    for (const e of data.entries) {
      progress();
      const car = carIds.get(e.carId);
      if (!car) continue;
      const entry = await api('POST', rec('entries'), {
        car,
        type: TYPES[e.type] ? e.type : 'other',
        date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : today(),
        mileage: num(e.mileage),
        title: str(e.title) || 'Eintrag',
        cost: num(e.cost),
        shop: str(e.shop),
        notes: str(e.notes),
      });
      const atts = (Array.isArray(e.attachments) ? e.attachments : []).map((a) => fileOf(a.id, a.name)).filter(Boolean);
      if (atts.length) await uploadAttachments(entry, atts);
    }
  } catch (err) {
    // Remove partially imported data; the existing data stays untouched.
    for (const id of created) await api('DELETE', rec('cars', id)).catch(() => {});
    throw new Error(`Import abgebrochen: ${err.message}`);
  }

  // Only remove the previous vehicles after a successful import.
  for (const id of oldCars) await api('DELETE', rec('cars', id)).catch(() => {});
  if (CURRENCIES[data.settings?.currency]) await saveSettings({ currency: data.settings.currency });
  forgetFiles();
  await loadData();
  location.hash = '#/';
  route();
  toast(`${plural(data.cars.length, 'Fahrzeug', 'Fahrzeuge')} importiert`);
}

document.addEventListener('change', async (ev) => {
  const input = ev.target.closest('input[data-import]');
  if (!input?.files.length) return;
  const file = input.files[0];
  input.value = '';
  await runAction(async () => {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('Ungültige Backup-Datei.');
    }
    const count = Array.isArray(data?.cars) ? data.cars.length : 0;
    if (!confirm(`Backup mit ${plural(count, 'Fahrzeug', 'Fahrzeugen')} importieren?\nDeine aktuellen Fahrzeuge werden dabei ersetzt.`)) return;
    await importBackup(data);
  });
});

/* ---------- Theme & Toast ---------- */

$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = current === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch {}
});

// duration 0 = stays visible until the next message
function toast(msg, duration = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  if (duration) toast.timer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ---------- Start ---------- */

async function start() {
  document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
  window.addEventListener('hashchange', route);

  try {
    serverConfig = { ...serverConfig, ...(await api('GET', '/api/carmaint/config')) };
  } catch {}
  document.title = serverConfig.appName;
  $('#appName').textContent = serverConfig.appName;

  if (auth?.token) {
    try {
      const res = await api('POST', '/api/collections/users/auth-refresh');
      setAuth({ token: res.token, record: res.record });
    } catch (err) {
      if (err.status !== 0) setAuth(null);
    }
  }

  if (!auth) return renderLogin();
  try {
    await enterApp();
  } catch (err) {
    console.error(err);
    $('#app').innerHTML = emptyState('car', 'Keine Verbindung', esc(err.message),
      '<button class="btn primary" onclick="location.reload()">Erneut versuchen</button>');
  }
}

start();
