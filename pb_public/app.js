'use strict';

// Texts come from i18n.js: t(key, params) and tn(key, count, params).

const THEME_KEY = 'carmaint:theme';
const AUTH_KEY = 'carmaint:auth';
const CAR_PHOTO_MAX = 1600;               // px, longest side
const ATTACHMENT_MAX = 2000;              // receipts slightly larger so text stays readable
const GITHUB_URL = 'https://github.com/seals187/carmaint';
const COPYRIGHT_SINCE = 2026;
const UPLOAD_CHUNK = 24 * 1024 * 1024;    // stay below the server limit (32 MB) per request

const CURRENCIES = {
  EUR: { locale: 'de-DE' },
  CHF: { locale: 'de-CH' },
  USD: { locale: 'en-US' },
};

const INFO_MODES = ['open', 'closed', 'remember'];
const DEFAULT_SETTINGS = { currency: 'EUR', infoBox: 'remember', infoCollapsed: false, dueBox: 'remember', dueCollapsed: false, language: 'de', templates: [] };

const TYPES = {
  service:    { color: 'blue' },
  repair:     { color: 'orange' },
  inspection: { color: 'green' },
  tires:      { color: 'purple' },
  fuel:       { color: 'yellow' },
  documents:  { color: 'teal' },
  other:      { color: 'gray' },
};
const typeLabel = (type) => t(`type.${TYPES[type] ? type : 'other'}`);
// Types of history entries (documents have their own section since 0.2)
const ENTRY_TYPES = Object.keys(TYPES).filter((type) => type !== 'documents');

// Templates in the entry dialog; km/months preset the reminder for the next time.
// Custom templates live in the user settings ({ title, type, km, months }).
const TEMPLATES = [
  { key: 'oil', type: 'service', km: 15000, months: 12 },
  { key: 'tires', type: 'tires', months: 6 },
  { key: 'inspection', type: 'inspection', months: 24 },
  { key: 'fuel', type: 'fuel' },
  { key: 'wipers', type: 'repair' },
];

// Reminder levels: overdue (red), soon (yellow), upcoming (still listed on the home page), later
const SOON_KM = 1000;
const SOON_DAYS = 7;
const UPCOMING_KM = 3000;
const UPCOMING_DAYS = 60;
const QUICK_KM_STEP = 100;
// Hues for cars without a photo (stable per car)
const CAR_HUES = [355, 212, 262, 172, 32, 330];

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
  idCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><path d="M16 10h2"/><path d="M16 14h2"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  minus: '<path d="M5 12h14"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  textSize: '<path d="M21 14h-5"/><path d="M16 16v-3.5a2.5 2.5 0 0 1 5 0V16"/><path d="M4.5 13h6"/><path d="m3 16 4.5-9 4.5 9"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  fuel: '<path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
};

const $ = (sel) => document.querySelector(sel);
const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => (v === '' || v == null ? null : Number(v));
const str = (v) => (v == null ? '' : String(v)).trim();
const isImageName = (name) => /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name);
// The server appends "_<10 chars>" to file names – strip it again for display.
const displayName = (name) => name.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, '$1');

// App icon (same as favicon.svg), shown left of the wordmark.
const LOGO_MARK = `<svg class="logo-mark" viewBox="0 0 512 512" aria-hidden="true">
  <rect width="512" height="512" rx="112" fill="#ff6b1a"/>
  <g fill="none" stroke-width="72" stroke-linecap="round">
    <path d="M418.3 218.5A168 168 0 0 1 388.4 365.4" stroke="#c24a0a"/>
    <path d="M123.6 365.4A168 168 0 1 1 418.3 218.5" stroke="#111214"/>
    <path d="M256 288L356 186" stroke="#fff" stroke-width="40"/>
    <circle cx="256" cy="288" r="30" stroke="#111214" stroke-width="36" fill="#ff6b1a"/>
  </g>
</svg>`;

// Logo: icon + "CarMaint" -> CAR (neutral) + MAINT (accent); other names split at the second capital letter.
function wordmark(name) {
  const [, a = name, b = ''] = /^carmaint$/i.test(name) ? [, name.slice(0, 3), name.slice(3)] : (name.match(/^(.[^A-Z\s]*)(.*)$/) ?? []);
  return `${LOGO_MARK}<span class="logo-a">${esc(a)}</span><span class="logo-b">${esc(b)}</span>`;
}

let settings = { ...DEFAULT_SETTINGS };
let money = currencyFormat(settings.currency);
let money0 = currencyFormat(settings.currency, 0); // whole amounts for tiles and the chart

function currencyFormat(code, digits) {
  const fraction = digits == null ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return new Intl.NumberFormat(CURRENCIES[code].locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', ...fraction });
}

function setCurrency(code) {
  money = currencyFormat(code);
  money0 = currencyFormat(code, 0);
}

const currencySymbol = () => money.formatToParts(0).find((p) => p.type === 'currency')?.value ?? settings.currency;
const defaultInfoCollapsed = () =>
  settings.infoBox === 'closed' || (settings.infoBox === 'remember' && settings.infoCollapsed);
const defaultDueCollapsed = () =>
  settings.dueBox === 'closed' || (settings.dueBox === 'remember' && settings.dueCollapsed);

// Dates and numbers follow the UI language; with CHF the Swiss variant (15'000, 21.10.2026).
const LOCALES = { de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' };
const SWISS_LOCALES = { de: 'de-CH', fr: 'fr-CH' };
const locale = () => (settings.currency === 'CHF' && SWISS_LOCALES[lang]) || LOCALES[lang] || 'de-DE';
const numberFormats = {};
const fmtNum = (v, digits) => (numberFormats[`${locale()}|${digits}`] ??= new Intl.NumberFormat(locale(),
  digits == null ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits })).format(v);
const km = (v) => (v ? `${fmtNum(v)} km` : '–');
const asDate = (iso) => new Date(`${iso}T00:00:00`);
const fmtDate = (iso) => (iso ? asDate(iso).toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '–');
const fmtDateNum = (iso) => asDate(iso).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDayMonth = (iso) => asDate(iso).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' });
const fmtMonthYear = (iso) => asDate(iso).toLocaleDateString(locale(), { month: 'short', year: 'numeric' });
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const daysUntil = (iso) => Math.round((asDate(iso) - asDate(today())) / 864e5);
const thisYear = () => today().slice(0, 4);

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "2026-01-31" + 1 month = "2026-02-28"
function addMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

// Fuel values are stored in German (existing data); only the display is translated.
const FUELS = { Benzin: 'fuel.petrol', Diesel: 'fuel.diesel', Hybrid: 'fuel.hybrid', 'Plug-in-Hybrid': 'fuel.plugin', Elektro: 'fuel.electric', 'Erdgas / LPG': 'fuel.gas' };
const fuelLabel = (value) => (FUELS[value] ? t(FUELS[value]) : value);
const mono = (v) => `<span class="mono">${esc(v)}</span>`;

// Vehicle data shown in the info box. `format` returns safe HTML for display.
const INFO_FIELDS = [
  { group: 'purchase', key: 'purchasePrice', unit: () => currencySymbol(), type: 'number', step: '0.01', format: (v) => money.format(v) },
  { group: 'purchase', key: 'purchaseDate', type: 'date', format: fmtDate },
  { group: 'registration', key: 'firstRegistration', type: 'date', format: fmtDate },
  { group: 'registration', key: 'stammnummer', placeholder: '123.456.789', format: mono },
  // pinned: stays visible even when the info box is collapsed
  { group: 'registration', key: 'vin', placeholder: 'WVWZZZ1KZAW000000', upper: true, pinned: true, format: mono },
  { group: 'registration', key: 'typeApproval', placeholder: '1VA123', upper: true, pinned: true },
  { group: 'technical', key: 'power', unit: () => 'kW', type: 'number', format: (v) => `${fmtNum(v)} kW · ${fmtNum(Math.round(v * 1.35962))} ${t('unit.hp')}` },
  { group: 'technical', key: 'displacement', unit: () => 'cm³', type: 'number', format: (v) => `${fmtNum(v)} cm³` },
  { group: 'technical', key: 'fuel', options: Object.keys(FUELS), format: (v) => esc(fuelLabel(v)) },
  { group: 'technical', key: 'color', placeholderKey: 'ph.color' },
  { group: 'inspection', key: 'lastInspection', type: 'date', format: fmtDate },
  { group: 'inspection', key: 'nextInspection', type: 'date', format: (v) => `${fmtDate(v)}${dueBadge(v)}` },
];
const fieldName = (f) => t(`info.${f.key}`);
const fieldLabel = (f) => (f.unit ? `${fieldName(f)} (${f.unit()})` : fieldName(f));

function dueBadge(iso) {
  const days = daysUntil(iso);
  if (days < 0) return `<span class="badge" data-color="red">${t('due.overdue')}</span>`;
  if (days === 0) return `<span class="badge" data-color="orange">${t('due.today')}</span>`;
  if (days <= 60) return `<span class="badge" data-color="orange">${tn('due.inDays', days)}</span>`;
  return '';
}

/* ---------- Server (PocketBase) ---------- */

class ApiError extends Error {
  constructor(status, data) {
    const [field, err] = Object.entries(data?.data ?? {})[0] ?? [];
    let message;
    if (status === 0) message = t('err.offline');
    else if (status === 429) message = t('err.tooMany');
    else if (field) {
      const label = hasTranslation(`field.${field}`) ? t(`field.${field}`) : field;
      const limits = { max: serverConfig.maxFileSizeMB, limit: serverConfig.storageLimitMB, types: typeList(serverConfig.fileTypes[field]) };
      const reason = hasTranslation(`code.${err.code}`) ? t(`code.${err.code}`, limits) : `– ${err.message}`;
      message = `${label} ${reason}`;
    } else message = data?.message || t('err.status', { status });
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
  if (!res.ok) throw new Error(t('err.fileNotFound', { status: res.status }));
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
      .catch((err) => console.warn('Image could not be loaded', err));
  }
}

const carFile = (car, name) => `cars/${car.id}/${name}`;
const entryFile = (entry, name) => `entries/${entry.id}/${name}`;
const attachmentLabel = (entry, name) => entry?.attachmentNames?.[name] || displayName(name);

const docFile = (doc, name) => `documents/${doc.id}/${name}`;

// Uploads attachments (of an entry or document) and remembers their original
// names (the server sanitizes file names).
async function uploadAttachments(entry, files, collection = 'entries') {
  const before = new Set(entry.attachments);
  const updated = await uploadFiles(collection, entry.id, 'attachments', files);
  const names = {};
  for (const name of updated.attachments) {
    if (entry.attachmentNames?.[name]) names[name] = entry.attachmentNames[name];
  }
  updated.attachments.filter((name) => !before.has(name)).forEach((name, i) => { names[name] = files[i]?.name ?? name; });
  return api('PATCH', rec(collection, entry.id), { attachmentNames: names });
}

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp', 'image/avif': '.avif', 'application/pdf': '.pdf' };
// "PDF, JPG" for a list of MIME types
const typeList = (types = []) => types.map((type) => MIME_EXT[type]?.slice(1).toUpperCase() ?? type).join(', ');
function withExt(name, type) {
  const ext = MIME_EXT[type];
  if (!ext) return name;
  const base = (name || 'file').replace(/\.[^.]+$/, '');
  return base + ext;
}

// Images are shrunk in their own format (JPG stays JPG, PNG stays PNG),
// but only if that makes the file smaller.
async function compressImage(file, maxSize) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, 0.82));
  return blob && blob.size < file.size ? blob : file;
}

// File types the server does not allow (ALLOWED_FILE_TYPES) are rejected, not converted.
function checkFileType(file, types) {
  if (!types.includes(file.type)) throw new Error(t('err.fileType', { name: file.name, types: typeList(types) }));
}

async function prepareFile(file, maxSize, types) {
  checkFileType(file, types);
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

let serverConfig = { appName: 'CarMaint', defaultCurrency: 'EUR', defaultLanguage: 'en', version: 'dev', maxFileSizeMB: 20, storageLimitMB: 0,
  fileTypes: { attachments: ['application/pdf', 'image/jpeg'], photos: ['image/jpeg'] } };
let db = { cars: [], entries: [], reminders: [], documents: [] };

async function loadData() {
  const [cars, entries, reminders, documents] = await Promise.all([
    listAll('cars', '&sort=created'), listAll('entries'), listAll('reminders'), listAll('documents', '&sort=created'),
  ]);
  db = { cars, entries, reminders, documents };
}

const carById = (id) => db.cars.find((c) => c.id === id);
const entryById = (id) => db.entries.find((e) => e.id === id);
const reminderById = (id) => db.reminders.find((r) => r.id === id);
const documentById = (id) => db.documents.find((d) => d.id === id);

// Shows a file of an entry or document: images in the viewer (together with the
// other images), PDFs in a new tab. Without a name: the first image or file.
async function viewFiles(record, pathOf, name = null) {
  const target = name ?? record?.attachments.find(isImageName) ?? record?.attachments[0];
  if (!target) return;
  if (isImageName(target)) {
    const images = record.attachments.filter(isImageName);
    openLightbox(images.map((n) => pathOf(record, n)), images.indexOf(target));
  } else {
    openFile(await fileObjectUrl(pathOf(record, target)), attachmentLabel(record, target));
  }
}
const sum = (list) => list.reduce((total, e) => total + (Number(e.cost) || 0), 0);
const entriesFor = (carId) => db.entries
  .filter((e) => e.car === carId)
  .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage || 0) - (a.mileage || 0));
const carName = (car) => `${car.make} ${car.model}`;
const carHue = (car) => CAR_HUES[[...car.id].reduce((h, c) => h + c.charCodeAt(0), 0) % CAR_HUES.length];

/* ---------- Statistics ---------- */

const costThisYear = (entries) => sum(entries.filter((e) => e.date.startsWith(thisYear())));

// Kilometres covered by the recorded entries (and the current mileage).
function kmRange(cars) {
  let driven = 0;
  for (const car of cars) {
    const values = entriesFor(car.id).map((e) => e.mileage).filter(Boolean);
    if (car.mileage) values.push(car.mileage);
    if (values.length > 1) driven += Math.max(...values) - Math.min(...values);
  }
  return driven;
}

// Running costs per km, without fuel; null until enough kilometres are known.
function costPerKm(cars) {
  const driven = kmRange(cars);
  if (driven < 100) return null;
  const ids = new Set(cars.map((c) => c.id));
  return sum(db.entries.filter((e) => ids.has(e.car) && e.type !== 'fuel')) / driven;
}

/* ---------- Reminders ---------- */

// The next vehicle inspection (MFK) from the vehicle data counts as a reminder too,
// unless the car already has its own inspection reminder.
function remindersFor(carId) {
  const car = carById(carId);
  const list = db.reminders.filter((r) => r.car === carId);
  const next = car.info?.nextInspection;
  if (next && !list.some((r) => r.type === 'inspection')) {
    list.push({ id: `mfk:${car.id}`, car: car.id, virtual: true, type: 'inspection', title: t('tpl.inspection'), dueDate: next, dueKm: 0, intervalKm: 0, intervalMonths: 0 });
  }
  return list.map(reminderState).sort((a, b) => b.progress - a.progress);
}

const allReminders = () => db.cars.flatMap((c) => remindersFor(c.id));
const findReminder = (id) => allReminders().find((s) => s.r.id === id);

function reminderState(r) {
  const car = carById(r.car);
  const kmLeft = r.dueKm ? r.dueKm - (car.mileage || 0) : null;
  const days = r.dueDate ? daysUntil(r.dueDate) : null;
  const within = (kmLimit, dayLimit) => (kmLeft !== null && kmLeft <= kmLimit) || (days !== null && days <= dayLimit);
  const level = (kmLeft !== null && kmLeft <= 0) || (days !== null && days < 0) ? 'overdue'
    : within(SOON_KM, SOON_DAYS) ? 'soon'
    : within(UPCOMING_KM, UPCOMING_DAYS) ? 'upcoming' : 'later';
  // Share of the interval that has passed (for the progress bar and the order)
  const kmPart = kmLeft === null ? 0 : 1 - kmLeft / (r.intervalKm || 10000);
  const dayPart = days === null ? 0 : 1 - days / ((r.intervalMonths || 12) * 30.44);
  const progress = Math.max(kmPart, dayPart);
  // Whichever comes first decides the label
  const byKm = kmLeft !== null && (days === null || kmPart >= dayPart);
  let label;
  if (level === 'overdue') {
    const kmOver = kmLeft !== null && kmLeft <= 0;
    if (days !== null && days < 0 && (!kmOver || !byKm)) label = tn('due.overdueDays', -days);
    else label = kmLeft === 0 ? t('due.today') : t('due.overdueKm', { km: km(-kmLeft) });
  } else if (byKm) {
    label = level === 'later' ? t('due.atKm', { km: km(r.dueKm) }) : t('due.inKm', { km: km(kmLeft) });
  } else if (days === 0) {
    label = t('due.today');
  } else {
    label = days <= UPCOMING_DAYS ? tn('due.inDays', days) : fmtMonthYear(r.dueDate);
  }
  return { r, car, kmLeft, days, level, label, byKm, progress: Math.min(1, Math.max(0, progress)) };
}

// "every 15'000 km", "yearly 30.10.", "due 09.10.2026"
function reminderSchedule(r) {
  if (r.intervalKm) return t('rem.everyKm', { km: km(r.intervalKm) });
  if (r.intervalMonths === 12 && r.dueDate) return t('rem.yearly', { date: fmtDayMonth(r.dueDate) });
  if (r.intervalMonths) return tn('rem.everyMonths', r.intervalMonths);
  if (r.dueDate) return t('rem.dueOn', { date: fmtDateNum(r.dueDate) });
  return r.dueKm ? t('rem.dueAt', { km: km(r.dueKm) }) : '';
}

const documentsFor = (carId) => db.documents.filter((d) => d.car === carId);
// The history shows maintenance only; documents have their own section.
const historyFor = (carId) => entriesFor(carId).filter((e) => e.type !== 'documents');

// Since 0.2 documents are their own records. Entries of the former type
// "documents" are moved once (files included); the entry is removed afterwards.
const DOC_KINDS = ['registration', 'license', 'insurance', 'warranty', 'other'];
const DOC_KIND_ICONS = { registration: 'idCard', license: 'idCard', insurance: 'shield', warranty: 'shield', other: 'file' };
const DOC_REMIND_DAYS = 30;

function guessDocKind(title) {
  if (/führer|licen[cs]e|conduire|conducir/i.test(title)) return 'license';
  if (/fahrzeugausweis|registration|circulation|circulación|permiso/i.test(title)) return 'registration';
  if (/versicherung|insurance|assurance|seguro/i.test(title)) return 'insurance';
  if (/garantie|warranty|garantía/i.test(title)) return 'warranty';
  return 'other';
}

async function moveLegacyDocuments() {
  for (const entry of db.entries.filter((e) => e.type === 'documents')) {
    let doc = null;
    try {
      doc = await api('POST', rec('documents'), { car: entry.car, kind: guessDocKind(entry.title), title: entry.title });
      const files = await Promise.all(entry.attachments.map(async (name) => ({
        blob: await fetchFile(entryFile(entry, name)), name: attachmentLabel(entry, name),
      })));
      if (files.length) doc = await uploadAttachments(doc, files, 'documents');
      await api('DELETE', rec('entries', entry.id));
      db.entries = db.entries.filter((e) => e.id !== entry.id);
      upsertLocal('documents', doc);
    } catch (err) {
      console.warn('Document entry could not be moved', err);
      if (doc) await api('DELETE', rec('documents', doc.id)).catch(() => {});
    }
  }
}

function upsertLocal(list, record) {
  const items = db[list];
  const i = items.findIndex((r) => r.id === record.id);
  if (i >= 0) items[i] = record;
  else items.push(record);
  return record;
}

/* ---------- Language ---------- */

// Before login: the language last used on this device, otherwise the first supported
// browser language, otherwise the server default (DEFAULT_LANGUAGE).
function initialLanguage() {
  let stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch {}
  if (LANGUAGES[stored]) return stored;
  const browser = (navigator.languages?.length ? navigator.languages : [navigator.language])
    .map((l) => l?.slice(0, 2).toLowerCase())
    .find((l) => LANGUAGES[l]);
  if (browser) return browser;
  return LANGUAGES[serverConfig.defaultLanguage] ? serverConfig.defaultLanguage : 'en';
}

function setLanguage(next) {
  if (!LANGUAGES[next]) return;
  lang = next;
  settings.language = next;
  try { localStorage.setItem(LANG_KEY, next); } catch {}
  translateStatic();
  const types = Object.keys(TYPES).map((key) => `<option value="${key}">${typeLabel(key)}</option>`).join('');
  $('#typePills').innerHTML = ENTRY_TYPES.map((key) => `
    <label><input type="radio" name="type" value="${key}"><span>${typeLabel(key)}</span></label>`).join('');
  $('#reminderType').innerHTML = types;
}

function applyUserSettings() {
  const s = { ...DEFAULT_SETTINGS, currency: serverConfig.defaultCurrency, language: lang, ...(me()?.settings ?? {}) };
  if (!CURRENCIES[s.currency]) s.currency = DEFAULT_SETTINGS.currency;
  if (!INFO_MODES.includes(s.infoBox)) s.infoBox = DEFAULT_SETTINGS.infoBox;
  if (!INFO_MODES.includes(s.dueBox)) s.dueBox = DEFAULT_SETTINGS.dueBox;
  if (!LANGUAGES[s.language]) s.language = lang;
  if (!Array.isArray(s.templates)) s.templates = [];
  settings = s;
  setCurrency(s.currency);
  setLanguage(s.language);
}

// Settings belong to the user account and apply on all devices.
async function saveSettings(next) {
  settings = { ...settings, ...next };
  setCurrency(settings.currency);
  try {
    const record = await api('PATCH', rec('users', me().id), { settings });
    setAuth({ ...auth, record });
  } catch (err) {
    console.error(err);
    toast(t('err.settings'));
  }
}

/* ---------- Authentication ---------- */

async function login(username, password) {
  try {
    const res = await api('POST', '/api/collections/users/auth-with-password', { identity: username, password });
    setAuth({ token: res.token, record: res.record });
  } catch (err) {
    if (err.status === 400) throw new Error(t('err.login'));
    throw err;
  }
}

async function enterApp() {
  document.body.classList.remove('logged-out');
  applyUserSettings();
  infoCollapsed = defaultInfoCollapsed();
  dueCollapsed = defaultDueCollapsed();
  currentCarId = null;
  await loadData();
  route();
  if (db.entries.some((e) => e.type === 'documents')) {
    await moveLegacyDocuments();
    route();
  }
}

function resetSession() {
  setAuth(null);
  db = { cars: [], entries: [], reminders: [], documents: [] };
  forgetFiles();
  fileTokenCache = { promise: null, at: 0 };
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
  renderLogin();
}

function logout() {
  resetSession();
  toast(t('toast.loggedOut'));
}

function sessionExpired() {
  resetSession();
  toast(t('toast.loginAgain'));
}

function renderLogin() {
  document.body.classList.add('logged-out');
  $('#app').innerHTML = `
    <div class="login">
      <form class="card login-card" id="loginForm">
        <div>
          <h1 class="logo logo-lg">${wordmark(serverConfig.appName)}</h1>
          <p class="muted">${t('login.subtitle')}</p>
        </div>
        <label class="field">${t('login.username')}<input name="username" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
        <label class="field">${t('login.password')}<input name="password" type="password" required autocomplete="current-password"></label>
        <p class="form-error" hidden></p>
        <button class="btn primary block" type="submit">${t('login.submit')}</button>
        <div class="lang-switch">
          ${Object.keys(LANGUAGES).map((code) => `<button type="button" data-action="set-lang" data-lang="${code}" aria-pressed="${code === lang}" title="${LANGUAGES[code]}">${code.toUpperCase()}</button>`).join('')}
        </div>
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
let filter = { type: 'all' };
let infoCollapsed = false;
let dueCollapsed = false;
const openEntries = new Set(); // expanded rows in the history

function route() {
  if (!auth) return renderLogin();
  const [, view, id] = location.hash.split('/');
  const car = view === 'car' ? carById(id) : null;
  if (view === 'settings') {
    currentCarId = null;
    renderSettings();
  } else if (car) {
    if (car.id !== currentCarId) {
      filter = { type: 'all' };
      infoCollapsed = defaultInfoCollapsed();
    }
    currentCarId = car.id;
    renderCar(car);
  } else {
    currentCarId = null;
    renderHome();
  }
  renderDuePill();
  hydrate();
}

// Phones: number of due reminders next to the logo (instead of the search field)
function renderDuePill() {
  const pill = $('#duePill');
  const n = auth ? allReminders().filter((s) => s.level === 'overdue' || s.level === 'soon').length : 0;
  pill.hidden = !n;
  pill.textContent = tn('nav.due', n);
  $('#quickFab').hidden = !auth || !db.cars.length || !!location.hash.match(/^#\/settings/);
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
  const perKm = costPerKm(db.cars);
  const summary = [
    tn('count.cars', db.cars.length),
    t('home.yearSoFar', { year: thisYear(), amount: `<strong>${money.format(costThisYear(db.entries))}</strong>` }),
    perKm !== null && t('home.perKm', { amount: money.format(perKm) }),
  ].filter(Boolean).join(' · ');
  const due = allReminders().filter((s) => s.level !== 'later');
  $('#app').innerHTML = `
    <section class="hero">
      <div>
        <h1>${t('home.title')}</h1>
        ${db.cars.length ? `<p class="muted hero-sub">${summary}</p>` : ''}
      </div>
      ${db.cars.length ? addBtn(t('home.addCar')) : ''}
    </section>
    ${due.length ? `
      <section id="due"${dueCollapsed ? ' class="collapsed"' : ''}>
        <button class="section-head due-toggle" data-action="toggle-due" aria-expanded="${!dueCollapsed}" aria-controls="dueBoard">
          <h2>${t('home.due')}</h2><span class="count-pill">${due.length}</span>${icon('chevronDown')}
          <span class="due-summary">${DUE_COLUMNS.map(([level, key]) => [level, key, due.filter((s) => s.level === level).length])
            .filter(([, , n]) => n).map(([level, key, n]) => `<span><span class="dot" data-level="${level}"></span>${t(key)} ${n}</span>`).join('')}</span>
        </button>
        ${dueBoard(due)}
      </section>` : ''}
    ${db.cars.length
      ? `<div class="grid">${db.cars.map(carCard).join('')}
           <button class="add-card" data-action="add-car">${icon('plus')}<span>${t('home.addAnother')}</span></button>
         </div>`
      : emptyState('car', t('home.emptyTitle'), t('home.emptyText'), addBtn(t('home.addFirstCar')))}`;
}

// "Due soon" on the home page: one column per level; the same reminder on
// several cars is grouped (collapsible).
const DUE_COLUMNS = [['overdue', 'due.colOverdue'], ['soon', 'due.colSoon'], ['upcoming', 'due.colLater']];
const collapsedDue = new Set();
// Soonest first; mileage counts as ~50 km per day
const soonest = (s) => Math.min(s.days ?? Infinity, s.kmLeft === null ? Infinity : s.kmLeft / 50);
const bySoonest = (a, b) => soonest(a) - soonest(b);
// "Do., 22.10." -> "Do, 22.10."
const noWeekdayDot = (s) => s.replace(/^(\p{L}+)\./u, '$1');
const fmtDateDay = (iso) => noWeekdayDot(asDate(iso).toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));

function dueBoard(due) {
  return `<div class="due-board" id="dueBoard">${DUE_COLUMNS.map(([level, key]) => {
    const items = due.filter((s) => s.level === level).sort(bySoonest);
    if (!items.length) return '';
    const groups = new Map();
    for (const s of items) {
      const k = s.r.title.trim().toLowerCase();
      groups.set(k, [...(groups.get(k) ?? []), s]);
    }
    return `
      <section class="card due-col" data-level="${level}">
        <header><h3>${t(key)}</h3><span class="due-count">${items.length}</span></header>
        ${[...groups].map(([k, list]) => (list.length > 1 ? dueGroup(`${level}|${k}`, list) : dueRow(list[0]))).join('')}
      </section>`;
  }).join('')}</div>`;
}

// Date (or km) that decides, how far away it is, and the other limit if there is one
function dueWhen(s) {
  const { r, days, kmLeft } = s;
  // Overdue: whichever limit was actually passed
  const kmOver = kmLeft !== null && kmLeft <= 0;
  const byDate = s.level === 'overdue' ? days !== null && days < 0 && !(kmOver && s.byKm) : !!r.dueDate && !s.byKm;
  let rel;
  if (s.level === 'overdue') rel = byDate ? tn('due.since', -days) : t('due.overdueKm', { km: km(-kmLeft) });
  else if (byDate) rel = days === 0 ? t('due.today') : days === 1 ? t('due.tomorrow') : days <= UPCOMING_DAYS ? tn('due.inDays', days) : fmtMonthYear(r.dueDate);
  else rel = t('due.inKm', { km: km(kmLeft) });
  // Calendar leaf: month + day, or "km" + thousands for mileage reminders
  const date = byDate && asDate(r.dueDate);
  return {
    leafTop: date ? date.toLocaleDateString(locale(), { month: 'short' }).replace('.', '') : 'km',
    leafNum: date ? String(date.getDate()).padStart(2, '0') : `${fmtNum(Math.round(r.dueKm / 1000))}k`,
    full: byDate ? fmtDateDay(r.dueDate) : km(r.dueKm),
    short: byDate ? fmtDayMonth(r.dueDate) : km(r.dueKm),
    day: byDate ? noWeekdayDot(date.toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: '2-digit' })) : km(r.dueKm),
    rel,
    other: byDate ? (r.dueKm ? t('due.orAtKm', { km: km(r.dueKm) }) : '') : (r.dueDate ? t('due.orOn', { date: fmtDateNum(r.dueDate) }) : ''),
  };
}

// grouped: the title is shown by the group, the row names the car
function dueRow(s, grouped = false) {
  const id = esc(s.r.id);
  const when = dueWhen(s);
  const tip = [when.full, when.other].filter(Boolean).join(' · ');
  return `
    <div class="due-row">
      <span class="leaf" title="${esc(tip)}"><span>${esc(when.leafTop)}</span><strong>${esc(when.leafNum)}</strong></span>
      <button class="due-main" data-action="edit-reminder" data-id="${id}" title="${esc(tip)}">
        ${grouped
          ? `<span class="due-title">${esc(carName(s.car))}</span><span class="muted">${esc(when.rel)}</span>`
          : `<strong class="due-title">${esc(s.r.title)}</strong><span class="muted">${esc(carName(s.car))} · <span class="due-rel">${esc(when.rel)}</span></span>`}
      </button>
      <button class="check-btn" data-action="reminder-done" data-id="${id}" title="${t('rem.done')}" aria-label="${esc(`${t('rem.done')}: ${s.r.title} · ${carName(s.car)}`)}">${icon('check')}</button>
    </div>`;
}

function dueGroup(key, list) {
  const open = !collapsedDue.has(key);
  return `
    <div class="due-group">
      <button class="due-group-head" data-action="toggle-due-group" data-key="${esc(key)}" aria-expanded="${open}">
        <strong>${esc(list[0].r.title)}</strong><span class="muted small">${tn('count.cars', list.length)}${icon('chevronDown')}</span>
      </button>
      <div class="due-sub">${list.map((s) => dueRow(s, true)).join('')}</div>
    </div>`;
}

// Car card footer: timeline of the due reminders (or the next one) around today,
// with a legend below. The axis spans at least one week back and a month ahead.
const CARD_DUE_MAX = 4;
const TIMELINE_DAYS = [-7, 30];

function carTimeline(states) {
  const due = states.filter((s) => s.level !== 'later').sort(bySoonest);
  const list = (due.length ? due : states.slice(0, 1)).slice(0, CARD_DUE_MAX);
  const days = list.map(soonest);
  const lo = Math.min(TIMELINE_DAYS[0], ...days);
  const hi = Math.max(TIMELINE_DAYS[1], ...days);
  const pos = (d) => `${(4 + (d - lo) / (hi - lo) * 92).toFixed(1)}%`;
  const items = list.map((s) => ({ s, when: dueWhen(s) }));
  return `
    <div class="timeline-bar" aria-hidden="true">
      <span class="tl-today" style="left:${pos(0)}"></span>
      ${items.map(({ s, when }, i) => `<span class="dot" data-level="${s.level}" style="left:${pos(days[i])}" title="${esc(`${s.r.title} · ${when.short} · ${when.rel}`)}"></span>`).join('')}
    </div>
    <ul class="tl-legend">${items.map(({ s, when }) => `
      <li><span class="dot" data-level="${s.level}"></span>${esc(s.r.title)} <span class="muted">${esc(when.short)}</span></li>`).join('')}
    </ul>`;
}

// Cars without a photo get a colour gradient instead.
const carMedia = (car, thumb) => (car.photos[0]
  ? `<img data-file="${esc(carFile(car, car.photos[0]))}" data-thumb="${thumb}" alt="">`
  : `<span class="car-tint" style="--hue:${carHue(car)}"></span>`);

// The demo user (DEMO_USERNAME) can have single settings disabled (DEMO_DISABLED).
const isDemo = () => !!serverConfig.demo && me()?.username === serverConfig.demo.username;
const allowed = (option) => !isDemo() || !serverConfig.demo.disabled.includes(option);

function renderSettings() {
  const display = [
    allowed('language') && `
      <div class="setting">
        <div>
          <h3>${t('settings.language')}</h3>
          <p class="muted small">${t('settings.languageHint')}</p>
        </div>
        ${segmented('language', t('settings.language'), LANGUAGES)}
      </div>`,
    allowed('currency') && `
      <div class="setting">
        <div>
          <h3>${t('settings.currency')}</h3>
          <p class="muted small">${t('settings.currencyHint')}</p>
          <p class="muted small" id="currencyExample">${t('settings.example', { value: money.format(1234.5) })}</p>
        </div>
        ${segmented('currency', t('settings.currency'), Object.fromEntries(Object.keys(CURRENCIES).map((c) => [c, c])))}
      </div>`,
    allowed('infobox') && `
      <div class="setting">
        <div>
          <h3>${t('settings.infoBox')}</h3>
          <p class="muted small">${t('settings.infoBoxHint')}</p>
        </div>
        ${segmented('infoBox', t('settings.infoBox'), Object.fromEntries(INFO_MODES.map((m) => [m, t(`infoMode.${m}`)])))}
      </div>`,
    allowed('infobox') && `
      <div class="setting">
        <div>
          <h3>${t('home.due')}</h3>
          <p class="muted small">${t('settings.dueBoxHint')}</p>
        </div>
        ${segmented('dueBox', t('home.due'), Object.fromEntries(INFO_MODES.map((m) => [m, t(`infoMode.${m}`)])))}
      </div>`,
  ].filter(Boolean).join('');
  const backup = [
    allowed('export') && `<button class="btn ghost" data-action="export">${icon('download')}${t('btn.export')}</button>`,
    allowed('import') && `<label class="btn ghost">${icon('upload')}${t('btn.import')}<input type="file" accept="application/json,.json" data-import hidden></label>`,
  ].filter(Boolean).join('');

  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}${t('nav.back')}</a>
    <section class="hero"><h1>${t('settings.title')}</h1></section>

    ${display ? `
      <div class="section-head"><h2>${t('settings.display')}</h2></div>
      <div class="card settings">${display}</div>` : ''}

    <div class="section-head"><h2>${t('settings.data')}</h2></div>
    <div class="card settings">
      <div class="setting">
        <div class="grow">
          <h3>${t('settings.storage')}</h3>
          <p class="muted small" id="storageText">${t('settings.storageHint', { max: serverConfig.maxFileSizeMB, types: typeList(serverConfig.fileTypes.attachments) })}</p>
          ${serverConfig.storageLimitMB ? '<div class="meter" id="storageMeter" hidden><span></span></div>' : ''}
        </div>
      </div>
      ${backup ? `
        <div class="setting">
          <div>
            <h3>${t('settings.backup')}</h3>
            <p class="muted small">${t('settings.backupHint')}</p>
          </div>
          <div class="setting-actions">${backup}</div>
        </div>` : ''}
    </div>

    <div class="section-head"><h2>${t('settings.account')}</h2></div>
    <div class="card settings">
      <div class="setting">
        <div>
          <h3>${esc(me().username)}</h3>
          <p class="muted small">${isDemo() ? t('role.demo') : isAdmin() ? t('role.adminLong') : t('role.user')}</p>
        </div>
        <div class="setting-actions">
          ${allowed('password') ? `<button class="btn ghost" data-action="change-password" data-id="${esc(me().id)}">${icon('key')}${t('pw.change')}</button>` : ''}
          <button class="btn ghost" data-action="logout">${icon('logout')}${t('nav.logout')}</button>
        </div>
      </div>
    </div>

    ${isAdmin() ? `
      <div class="section-head">
        <h2>${t('settings.users')}</h2>
        <button class="btn ghost sm-btn" data-action="add-user">${icon('userPlus')}${t('btn.add')}</button>
      </div>
      <div class="card settings" id="usersCard"><p class="muted small center">${t('settings.loadingUsers')}</p></div>` : ''}
    ${settingsFooter()}`;

  renderStorage();
  if (isAdmin()) renderUsers();
}

// Static links only – nothing is fetched from GitHub.
function settingsFooter() {
  const { version } = serverConfig;
  const release = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version);
  const releaseUrl = release ? `${GITHUB_URL}/releases/tag/v${version}` : `${GITHUB_URL}/releases`;
  const ext = 'target="_blank" rel="noopener noreferrer"';
  // Year from the server clock (not the visitor's device): "2026" or "2026–2028"
  const year = Math.max(COPYRIGHT_SINCE, Number(serverConfig.year) || COPYRIGHT_SINCE);
  const years = year > COPYRIGHT_SINCE ? `${COPYRIGHT_SINCE}–${year}` : COPYRIGHT_SINCE;
  return `
    <footer class="app-footer">
      <a class="icon-btn" href="${GITHUB_URL}" ${ext} aria-label="GitHub" title="GitHub">${icon('github')}</a>
      <p class="muted small">
        ${esc(serverConfig.appName)} ·
        <a href="${esc(releaseUrl)}" ${ext} title="${t('footer.releaseNotes')}">${esc(release ? `v${version}` : version)}</a> ·
        <a href="${GITHUB_URL}/issues/new" ${ext}>${t('footer.reportBug')}</a>
      </p>
      <p class="muted small">
        © ${years} <a href="https://github.com/seals187" ${ext}>Julien Kühne</a> ·
        <a href="${GITHUB_URL}/blob/main/LICENSE" ${ext}>AGPL-3.0</a>
      </p>
    </footer>`;
}

const fmtMB = (bytes) => `${fmtNum(Math.round(bytes / 1024 / 1024 * 10) / 10)} ${t('unit.mb')}`;

const storageStatus = (used, limit) => (limit
  ? t('settings.storageUsedOf', { used: fmtMB(used), limit: fmtMB(limit) })
  : t('settings.storageUsed', { used: fmtMB(used) }));

async function renderStorage() {
  try {
    const { used, limit } = await api('GET', '/api/carmaint/usage');
    const text = $('#storageText');
    if (!text?.isConnected) return;
    text.textContent = `${storageStatus(used, limit)} · ${t('settings.storageHint', { max: serverConfig.maxFileSizeMB, types: typeList(serverConfig.fileTypes.attachments) })}`;
    const meter = $('#storageMeter');
    if (meter && limit) {
      const percent = Math.min(100, used / limit * 100);
      meter.hidden = false;
      meter.dataset.level = percent >= 90 ? 'high' : '';
      meter.firstElementChild.style.width = `${percent}%`;
    }
  } catch (err) {
    console.warn('Storage usage could not be loaded', err);
  }
}

async function renderUsers() {
  const card = $('#usersCard');
  try {
    // Storage per user is optional – the list still shows if it cannot be loaded.
    const [users, storage] = await Promise.all([
      listAll('users', '&sort=username'),
      api('GET', '/api/carmaint/usage/users').catch(() => null),
    ]);
    if (!card.isConnected) return;
    card.innerHTML = users.map((u) => {
      const self = u.id === me().id;
      const name = esc(u.username);
      const used = storage?.users[u.id];
      const full = storage?.limit && used >= storage.limit * 0.9;
      return `
        <div class="user-row">
          <div class="user-avatar">${esc(u.username.slice(0, 1).toUpperCase())}</div>
          <div class="grow">
            <strong>${name}</strong>${self ? ` <span class="muted small">${t('users.you')}</span>` : ''}
            <p class="muted small">${u.role === 'admin' ? t('role.adminLong') : t('role.user')}${used === undefined ? ''
              : ` · <span${full ? ' class="storage-full"' : ''}>${esc(storageStatus(used, storage.limit))}</span>`}</p>
          </div>
          ${self ? '' : `
            <button class="icon-btn sm" data-action="change-password" data-id="${esc(u.id)}" data-name="${name}" title="${t('users.resetPw')}" aria-label="${t('users.resetPwFor', { name })}">${icon('key')}</button>
            <button class="icon-btn sm danger" data-action="delete-user" data-id="${esc(u.id)}" data-name="${name}" title="${t('users.delete')}" aria-label="${t('users.deleteNamed', { name })}">${icon('trash')}</button>`}
        </div>`;
    }).join('');
  } catch (err) {
    card.innerHTML = `<p class="muted small center">${esc(err.message)}</p>`;
  }
}

function segmented(name, ariaLabel, options) {
  return `
    <div class="segmented" role="radiogroup" aria-label="${esc(ariaLabel)}">
      ${Object.entries(options).map(([value, label]) => `
        <label>
          <input type="radio" name="${name}" value="${value}" ${settings[name] === value ? 'checked' : ''}>
          <span>${esc(label)}</span>
        </label>`).join('')}
    </div>`;
}

document.addEventListener('change', (ev) => {
  const { name, value } = ev.target;
  if (name === 'currency' && CURRENCIES[value]) {
    saveSettings({ currency: value });
    $('#currencyExample').textContent = t('settings.example', { value: money.format(1234.5) });
    toast(t('toast.currency', { name: t(`currency.${value}`) }));
  } else if (name === 'infoBox' && INFO_MODES.includes(value)) {
    saveSettings({ infoBox: value });
    infoCollapsed = defaultInfoCollapsed();
    toast(t('toast.infoMode', { mode: t(`infoMode.${value}`) }));
  } else if (name === 'dueBox' && INFO_MODES.includes(value)) {
    saveSettings({ dueBox: value });
    dueCollapsed = defaultDueCollapsed();
    toast(t('toast.dueMode', { mode: t(`infoMode.${value}`) }));
  } else if (name === 'language' && LANGUAGES[value]) {
    setLanguage(value);
    saveSettings({ language: value });
    route();
    toast(t('toast.language'));
  }
});

// Make as before, model slightly lighter so the two are easy to tell apart.
const carTitle = (car) => `${esc(car.make)} <span class="car-model">${esc(car.model)}</span>`;

function carCard(car) {
  const entries = entriesFor(car.id);
  const last = entries[0];
  const states = remindersFor(car.id);
  const next = states[0];
  const perKm = costPerKm([car]);
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  const name = esc(carName(car));
  const foot = next
    ? carTimeline(states)
    : `<p class="muted">${last ? `${t('card.last', { title: esc(last.title) })} · <span class="nowrap">${fmtDate(last.date)}</span>` : t('card.noEntries')}</p>`;
  return `
    <article class="card car-card">
      <div class="car-media">${carMedia(car, '640x360')}</div>
      <div class="car-card-body">
        <div class="car-card-title">
          <div>
            <h3><a class="card-link" href="#/car/${esc(car.id)}">${carTitle(car)}</a></h3>
            <p class="muted small">${sub || '&nbsp;'}</p>
          </div>
          <div class="card-actions">
            <button class="icon-btn quick-add" data-action="show-docs" data-id="${esc(car.id)}" title="${t('docs.show')}" aria-label="${t('docs.showFor', { car: name })}">${icon('idCard')}</button>
            <button class="btn primary sm-btn" data-action="add-entry" data-id="${esc(car.id)}" aria-label="${t('card.addEntryFor', { car: name })}">${icon('plus')}<span>${t('btn.entry')}</span></button>
          </div>
        </div>
        <dl class="stats">
          <div><dt>${t('stats.km')}</dt><dd>${car.mileage ? fmtNum(car.mileage) : '–'}</dd></div>
          <div><dt>${thisYear()} · ${esc(currencySymbol())}</dt><dd>${fmtNum(Math.round(costThisYear(entries)))}</dd></div>
          <div><dt>${t('stats.perKm')}</dt><dd>${perKm === null ? '–' : fmtNum(perKm, 2)}</dd></div>
        </dl>
        <div class="card-foot">${foot}</div>
      </div>
    </article>`;
}

// Car page: sidebar (photo, actions, vehicle data, photos, documents) and the
// main column (key figures, reminders by due date, history).
function renderCar(car) {
  const entries = entriesFor(car.id);
  const history = historyFor(car.id);
  const photos = car.photos;
  const docs = documentsFor(car.id);
  const id = esc(car.id);
  const perKm = costPerKm([car]);
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  const tile = (label, value, extra = '') =>
    `<div class="card tile"><div><span>${label}</span><strong>${value}</strong></div>${extra}</div>`;

  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}${t('nav.back')}</a>
    <div class="car-layout">
      <aside class="card car-side">
        <div class="car-side-media">${photos[0]
          ? `<button class="thumb-img" data-action="view-photo" data-id="${id}" data-index="0" aria-label="${t('photos.view', { n: 1 })}"><img data-file="${esc(carFile(car, photos[0]))}" data-thumb="640x360" alt=""></button>`
          : carMedia(car)}</div>
        <div class="car-side-body">
          <div>
            <h1>${carTitle(car)}</h1>
            ${sub ? `<p class="muted">${sub}</p>` : ''}
          </div>
          <div class="car-side-actions">
            <button class="btn primary" data-action="add-entry" data-id="${id}">${icon('plus')}${t('btn.entry')}</button>
            <button class="icon-btn outlined" data-action="edit-car" data-id="${id}" title="${t('car.edit')}" aria-label="${t('car.edit')}">${icon('pencil')}</button>
            <div class="menu-wrap">
              <button class="icon-btn outlined" data-action="toggle-menu" aria-haspopup="true" aria-expanded="false" title="${t('car.more')}" aria-label="${t('car.more')}">${icon('more')}</button>
              <div class="menu" hidden>
                <button data-action="edit-info" data-id="${id}">${icon('idCard')}${t('info.edit')}</button>
                <button data-action="add-reminder" data-id="${id}">${icon('plus')}${t('rem.add')}</button>
                <button class="danger" data-action="delete-car" data-id="${id}">${icon('trash')}${t('car.delete')}</button>
              </div>
            </div>
          </div>
          ${infoBox(car)}
          <section class="side-section">
            <h3 class="side-head">${t('photos.title')}${photos.length ? ` · ${photos.length}` : ''}</h3>
            <div class="photo-grid">
              ${photos.map((name, i) => `
                <div class="thumb">
                  <button class="thumb-img" data-action="view-photo" data-id="${id}" data-index="${i}" aria-label="${t('photos.view', { n: i + 1 })}"><img data-file="${esc(carFile(car, name))}" data-thumb="300x225" alt=""></button>
                  <div class="thumb-actions">
                    ${i > 0 ? `<button class="icon-btn sm" data-action="cover-photo" data-id="${id}" data-photo="${esc(name)}" title="${t('photos.makeCover')}" aria-label="${t('photos.makeCover')}">${icon('star')}</button>` : ''}
                    <button class="icon-btn sm" data-action="delete-photo" data-id="${id}" data-photo="${esc(name)}" title="${t('photos.delete')}" aria-label="${t('photos.delete')}">${icon('trash')}</button>
                  </div>
                </div>`).join('')}
              <label class="thumb add" title="${t('photos.add')}">${icon('plus')}<span class="sr-only">${t('photos.add')}</span>
                <input type="file" multiple accept="${serverConfig.fileTypes.photos.join(',')}" data-upload="car-photos" data-id="${id}" hidden>
              </label>
            </div>
          </section>
          <section class="side-section">
            <h3 class="side-head">${t('docs.title')}${docs.length ? ` · ${docs.length}` : ''}
              <button class="link-btn accent push-right" data-action="add-document" data-id="${id}">${icon('plus')}${t('docs.addShort')}</button>
            </h3>
            ${docList(car)}
          </section>
          ${history.length ? `<button class="link-btn" data-action="print-history" data-id="${id}">${icon('printer')}${t('btn.pdf')}</button>` : ''}
        </div>
      </aside>

      <div class="car-main">
        <div class="tiles">
          ${tile(t('stats.km'), car.mileage ? fmtNum(car.mileage) : '–')}
          ${tile(t('tile.costYear', { year: thisYear() }), money0.format(costThisYear(entries)), costSpark(entries))}
          ${tile(t('stats.perKm'), perKm === null ? '–' : fmtNum(perKm, 2))}
        </div>

        <div class="section-head">
          <h2>${t('rem.title')}</h2>
          <button class="link-btn push-right" data-action="add-reminder" data-id="${id}">${icon('plus')}${t('rem.add')}</button>
        </div>
        ${reminderPanel(car)}

        <div class="section-head history-head"><h2>${t('history.title')}</h2></div>
        ${history.length ? `<div class="filters" role="group" aria-label="${t('filter.aria')}">${filterOptions(history).map(([value, label, n]) => `
          <button class="tchip${n ? '' : ' none'}" data-action="filter" data-type="${value}" aria-pressed="${filter.type === value}">
            ${value === 'all' ? '' : `<span class="dot" data-color="${TYPES[value].color}"></span>`}${esc(label)}<span class="tchip-n">${n}</span>
          </button>`).join('')}</div>` : ''}
        <div id="entries"></div>
      </div>
    </div>`;

  renderEntries(car);
}

// History filter: all and every entry type, with counts
function filterOptions(entries) {
  if (filter.type !== 'all' && !ENTRY_TYPES.includes(filter.type)) filter.type = 'all';
  return [
    ['all', t('filter.all'), entries.length],
    ...ENTRY_TYPES.map((type) => [type, typeLabel(type), entries.filter((e) => e.type === type).length]),
  ];
}

// Mini bar chart of this year's costs per month (in the cost tile)
function costSpark(entries) {
  const year = thisYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    return { key, total: sum(entries.filter((e) => e.date.startsWith(key))) };
  });
  const max = Math.max(...months.map((m) => m.total));
  if (!max) return '';
  const label = (m) => `${asDate(`${m.key}-01`).toLocaleDateString(locale(), { month: 'long' })}: ${money.format(m.total)}`;
  return `
    <div class="spark" role="img" aria-label="${esc(months.filter((m) => m.total).map(label).join(', '))}">
      ${months.map((m) => `<span class="${m.total === max ? 'peak' : ''}" title="${esc(label(m))}" style="height:${m.total ? Math.max(10, m.total / max * 100) : 0}%"></span>`).join('')}
    </div>`;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Interval only ("every 15'000 km", "yearly") – the due date is shown by the group
function reminderInterval(r) {
  if (r.intervalKm) return t('rem.everyKm', { km: km(r.intervalKm) });
  if (r.intervalMonths === 12) return t('rem.yearlyPlain');
  return r.intervalMonths ? tn('rem.everyMonths', r.intervalMonths) : '';
}

// All reminders of the car, grouped by due date (or mileage); several due on
// the same day can be logged as done together.
function reminderPanel(car) {
  const states = remindersFor(car.id).sort(bySoonest);
  if (!states.length) return `<div class="card rem-panel"><p class="muted small rem-empty">${t('rem.empty')}</p></div>`;
  const groups = new Map();
  for (const s of states) {
    const when = dueWhen(s);
    if (!groups.has(when.full)) groups.set(when.full, { when, list: [] });
    groups.get(when.full).list.push(s);
  }
  return `<div class="card rem-panel">${[...groups.values()].map(({ when, list }) => `
    <div class="rem-group" data-level="${list[0].level}">
      <span class="leaf"><span>${esc(when.leafTop)}</span><strong>${esc(when.leafNum)}</strong></span>
      <div class="rem-body">
        <div class="rem-head">
          <strong class="rem-when">${esc(list[0].level === 'later' ? when.full : `${capitalize(when.rel)} · ${when.day}`)}</strong>
          ${list.length > 1 ? `<button class="btn ghost sm-btn" data-action="reminders-done" data-ids="${esc(list.map((s) => s.r.id).join(','))}">${list.length === 2 ? t('rem.bothDone') : t('rem.allDone')}</button>` : ''}
        </div>
        ${list.map((s) => `
          <div class="rem-item">
            <button class="rem-name" data-action="edit-reminder" data-id="${esc(s.r.id)}">${esc(s.r.title)}${reminderInterval(s.r) ? ` <span class="muted">· ${esc(reminderInterval(s.r))}</span>` : ''}</button>
            <button class="check-btn" data-action="reminder-done" data-id="${esc(s.r.id)}" title="${t('rem.done')}" aria-label="${esc(`${t('rem.done')}: ${s.r.title}`)}">${icon('check')}</button>
          </div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}

// Documents of a car: preview (first image, otherwise an icon), name and validity.
function docList(car) {
  const docs = documentsFor(car.id);
  if (!docs.length) return `<p class="muted small">${t('docs.emptyText')}</p>`;
  return `<ul class="doc-list">${docs.map((doc) => {
    const image = doc.attachments.find(isImageName);
    const files = doc.attachments.length;
    return `
      <li>
        <button class="doc-thumb" data-action="view-document" data-id="${esc(doc.id)}" ${files ? '' : 'disabled'} aria-label="${esc(t('att.view', { name: doc.title }))}">
          ${image ? `<img data-file="${esc(docFile(doc, image))}" data-thumb="300x225" alt="">` : icon(DOC_KIND_ICONS[doc.kind] ?? 'file')}
        </button>
        <button class="doc-name" data-action="edit-document" data-id="${esc(doc.id)}">
          <span>${esc(doc.title)}</span>${docValidity(doc)}
        </button>
      </li>`;
  }).join('')}</ul>`;
}

// "valid until 03.2031", "expires 31.12.2026" (within 60 days) or "expired 01.01.2026"
function docValidity(doc) {
  if (!doc.validUntil) return '';
  const days = daysUntil(doc.validUntil);
  if (days < 0) return `<small class="bad">${esc(t('doc.expired', { date: fmtDateNum(doc.validUntil) }))}</small>`;
  if (days <= UPCOMING_DAYS) return `<small class="warn">${esc(t('doc.expires', { date: fmtDateNum(doc.validUntil) }))}</small>`;
  const monthYear = asDate(doc.validUntil).toLocaleDateString(locale(), { month: '2-digit', year: 'numeric' });
  return `<small class="muted">${esc(t('doc.validUntilShort', { date: monthYear }))}</small>`;
}

function infoBox(car) {
  const info = car.info ?? {};
  const rows = INFO_FIELDS.filter((f) => info[f.key] != null && info[f.key] !== '');
  const hiddenCount = rows.filter((f) => !f.pinned).length;
  const collapsible = hiddenCount > 0;
  const collapsed = collapsible && infoCollapsed;
  const id = esc(car.id);
  return `
    <section class="side-section infobox-wrap${collapsed ? ' collapsed' : ''}" id="infobox">
      <div class="side-head">
        ${t('info.title')}
        <div class="infobox-actions">
          ${rows.length ? `<button class="icon-btn sm" data-action="edit-info" data-id="${id}" title="${t('info.edit')}" aria-label="${t('info.edit')}">${icon('pencil')}</button>` : ''}
          ${collapsible ? `<button class="icon-btn sm info-toggle" data-action="toggle-info" aria-expanded="${!collapsed}" title="${t('info.toggle')}" aria-label="${t('info.toggleAria')}">${icon('chevronDown')}</button>` : ''}
        </div>
      </div>
      <div class="infobox">
      ${rows.length
        ? `<dl class="info-list">${rows.map((f) => `
            <div${f.pinned ? ' class="pinned"' : ''}><dt>${fieldName(f)}</dt><dd>${f.format ? f.format(info[f.key]) : esc(info[f.key])}</dd></div>`).join('')}
          </dl>
          ${collapsible ? `<button class="info-more" data-action="toggle-info">${tn('info.more', hiddenCount)}</button>` : ''}`
        : `<div class="infobox-empty">
             <p class="muted small">${t('info.emptyText')}</p>
             <button class="btn ghost file-btn" data-action="edit-info" data-id="${id}">${icon('plus')}${t('info.add')}</button>
           </div>`}
      </div>
    </section>`;
}

function renderEntries(car) {
  const all = historyFor(car.id);
  const list = all.filter((e) => filter.type === 'all' || e.type === filter.type);

  let html;
  if (!all.length) {
    html = emptyState('wrench', t('entries.emptyTitle'), t('entries.emptyText'),
      `<button class="btn primary" data-action="add-entry" data-id="${esc(car.id)}">${icon('plus')}${t('entries.add')}</button>`);
  } else if (!list.length) {
    html = `<p class="muted center">${t('entries.noMatch')}</p>`;
  } else {
    html = `<ul class="history">${list.map(entryItem).join('')}</ul>`;
  }
  $('#entries').innerHTML = html;
  hydrate();
}

// Receipt as a chip: "PDF Rechnung_Garage_Meier.pdf"
function fileChip(entry, name) {
  const label = attachmentLabel(entry, name);
  const ext = (label.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'file').toUpperCase().replace('JPEG', 'JPG');
  return `<button class="file-chip" data-action="view-file" data-id="${esc(entry.id)}" data-file="${esc(name)}" title="${esc(label)}">
    <span class="file-ext" data-ext="${esc(ext)}">${esc(ext)}</span><span class="file-name">${esc(label)}</span></button>`;
}

// Compact row with the receipts; a click shows the notes and the actions.
function entryItem(e) {
  const color = (TYPES[e.type] ?? TYPES.other).color;
  const id = esc(e.id);
  const open = openEntries.has(e.id);
  const files = e.attachments.length;
  const meta = [typeLabel(e.type), e.shop].filter(Boolean).map(esc).join(' · ');
  // Dates of the current year without the year
  const date = e.date.startsWith(thisYear()) ? fmtDayMonth(e.date) : fmtDateNum(e.date);
  return `
    <li class="entry${open ? ' open' : ''}" id="entry-${id}" data-color="${color}">
      <button class="entry-line" data-action="toggle-entry" data-id="${id}" aria-expanded="${open}">
        <time datetime="${esc(e.date)}">${date}</time>
        <span class="entry-main"><strong>${esc(e.title)}</strong><span class="muted">${meta}${files ? ` · <span class="nowrap">${icon('paperclip')} ${files}</span>` : ''}</span></span>
        <span class="entry-km muted">${e.mileage ? km(e.mileage) : ''}</span>
        <span class="entry-cost">${e.cost ? money.format(e.cost) : ''}</span>
      </button>
      ${files ? `<div class="file-chips">${e.attachments.map((name) => fileChip(e, name)).join('')}</div>` : ''}
      ${open ? `
        <div class="entry-detail">
          ${e.notes ? `<p class="entry-notes">${esc(e.notes)}</p>` : ''}
          <div class="entry-actions">
            <button class="btn ghost sm-btn" data-action="edit-entry" data-id="${id}">${icon('pencil')}${t('btn.edit')}</button>
            <button class="icon-btn sm danger" data-action="delete-entry" data-id="${id}" title="${t('btn.delete')}" aria-label="${t('btn.delete')}">${icon('trash')}</button>
          </div>
        </div>` : ''}
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
const docsDialog = $('#docsDialog');
const passwordForm = $('#passwordForm');
const reminderDialog = $('#reminderDialog');
const reminderForm = $('#reminderForm');
const docDialog = $('#docDialog');
const docForm = $('#docForm');
const quickDialog = $('#quickDialog');
const quickForm = $('#quickForm');
const lightbox = $('#lightbox');

function showDialog(dialog) {
  dialog.querySelectorAll('.form-error').forEach((el) => { el.hidden = true; });
  dialog.showModal();
}

async function withBusy(form, fn) {
  const buttons = form.querySelectorAll('[type="submit"]');
  const errorEl = form.querySelector('.form-error');
  buttons.forEach((b) => { b.disabled = true; });
  if (errorEl) errorEl.hidden = true;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    const message = err.message || t('err.save');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      alert(message);
    }
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

function openCarDialog(car) {
  const f = carForm.elements;
  carForm.reset();
  f.namedItem('id').value = car?.id ?? '';
  for (const key of ['make', 'model', 'plate']) f.namedItem(key).value = car?.[key] ?? '';
  for (const key of ['year', 'mileage']) f.namedItem(key).value = car?.[key] || '';
  $('#carPhotosLabel').textContent = t('car.choosePhotos');
  $('#carDialogTitle').textContent = car ? t('car.edit') : t('car.new');
  showDialog(carDialog);
}

$('#carPhotos').addEventListener('change', (ev) => {
  const n = ev.target.files.length;
  $('#carPhotosLabel').textContent = n ? tn('car.photosSelected', n) : t('car.choosePhotos');
});

carForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(carForm, async () => {
    const f = Object.fromEntries(new FormData(carForm));
    const photos = await Promise.all([...$('#carPhotos').files].map((file) => prepareFile(file, CAR_PHOTO_MAX, serverConfig.fileTypes.photos)));
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
    toast(f.id ? t('toast.carUpdated') : t('toast.carAdded'));
  });
});

// Attachments in the entry dialog: keep/remove existing ones, queue new ones.
let draft = { entry: null, keep: [], add: [] };

// Also used for the files of a document (d = docDraft).
function renderDraft(d = draft, el = $('#attEditor'), pathOf = entryFile) {
  const item = (media, name, list, i) => `
    <div class="draft-item">${media}<span>${esc(name)}</span>
      <button type="button" class="icon-btn sm" data-remove="${list}" data-index="${i}" aria-label="${t('att.remove', { name: esc(name) })}">${icon('x')}</button>
    </div>`;
  el.innerHTML = [
    ...d.keep.map((name, i) => item(
      isImageName(name) ? `<img data-file="${esc(pathOf(d.entry, name))}" data-thumb="128x128" alt="">` : icon('file'),
      attachmentLabel(d.entry, name), 'keep', i)),
    ...d.add.map((a, i) => item(a.url ? `<img src="${a.url}" alt="">` : icon('file'), a.file.name, 'add', i)),
  ].join('');
  hydrate();
}

// Queues files of an allowed type for uploading.
function queueFiles(d, files) {
  for (const file of files) {
    try {
      checkFileType(file, serverConfig.fileTypes.attachments);
    } catch (err) {
      toast(err.message);
      continue;
    }
    d.add.push({ file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null });
  }
}

function clearDraft() {
  draft.add.forEach((d) => d.url && URL.revokeObjectURL(d.url));
  draft = { entry: null, keep: [], add: [], reminder: null };
}

// reminder: the reminder state this entry completes ("Done" on a due card)
function openEntryDialog(entry, reminder = null) {
  const car = carById(entry.car);
  const f = entryForm.elements;
  const isNew = !entry.id;
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
  draft.entry = isNew ? null : entry;
  draft.keep = [...(entry.attachments ?? [])];
  draft.reminder = reminder;
  renderDraft();
  // Templates and the reminder for the next time only when adding an entry.
  // Several completed reminders each keep their own interval (no reminder box).
  const several = Array.isArray(reminder);
  $('#tplField').hidden = !isNew;
  $('#remindBox').hidden = !isNew || several;
  $('#saveNext').hidden = !isNew || !!reminder;
  renderTemplates();
  const r = several ? null : reminder?.r;
  setRemind(r ? { km: r.intervalKm, months: r.intervalMonths || (r.virtual ? 24 : 0) } : null);
  $('#recentShops').innerHTML = recentShops();
  $('#entryDialogTitle').innerHTML = isNew ? t('entry.new', { car: `<span class="dim">${esc(carName(car))}</span>` }) : esc(t('entry.edit'));
  updateEntryHints();
  showDialog(entryDialog);
}

// next: { km, months } or null (unchecked)
function setRemind(next) {
  const f = entryForm.elements;
  f.namedItem('remind').checked = !!(next?.km || next?.months);
  f.namedItem('remindKm').value = next?.km || '';
  f.namedItem('remindMonths').value = next?.months || '';
  updateEntryHints();
}

function renderTemplates(active = '') {
  const chip = (key, label) => `<button type="button" class="chip" data-tpl="${key}" aria-pressed="${key === active}">${esc(label)}</button>`;
  $('#tplChips').innerHTML = [
    ...TEMPLATES.map((tpl) => chip(tpl.key, t(`tpl.${tpl.key}`))),
    ...settings.templates.map((tpl, i) => `
      <span class="tpl-own">${chip(`own:${i}`, tpl.title)}<button type="button" class="tpl-x" data-tpl-remove="${i}" aria-label="${esc(t('tpl.remove', { title: tpl.title }))}">${icon('x')}</button></span>`),
    `<button type="button" class="chip add" data-tpl-add>${icon('plus')}${t('tpl.custom')}</button>`,
  ].join('');
}

function templateOf(key) {
  if (key.startsWith('own:')) return settings.templates[Number(key.slice(4))];
  const tpl = TEMPLATES.find((x) => x.key === key);
  return tpl && { ...tpl, title: t(`tpl.${tpl.key}`) };
}

$('#tplChips').addEventListener('click', (ev) => {
  const f = entryForm.elements;
  const use = ev.target.closest('[data-tpl]');
  const remove = ev.target.closest('[data-tpl-remove]');
  if (use) {
    const tpl = templateOf(use.dataset.tpl);
    if (!tpl) return;
    f.namedItem('type').value = tpl.type;
    f.namedItem('title').value = tpl.title;
    setRemind(tpl.type === 'fuel' ? null : { km: tpl.km, months: tpl.months });
    renderTemplates(use.dataset.tpl);
  } else if (remove) {
    const [removed] = settings.templates.splice(Number(remove.dataset.tplRemove), 1);
    saveSettings({ templates: settings.templates });
    renderTemplates();
    toast(t('tpl.removed', { title: removed.title }));
  } else if (ev.target.closest('[data-tpl-add]')) {
    // Saves the current title, type and reminder interval as an own template
    const title = f.namedItem('title').value.trim();
    if (!title) {
      f.namedItem('title').focus();
      toast(t('tpl.needTitle'));
      return;
    }
    const remind = f.namedItem('remind').checked;
    const tpl = { title, type: f.namedItem('type').value, km: remind ? num(f.namedItem('remindKm').value) || 0 : 0, months: remind ? num(f.namedItem('remindMonths').value) || 0 : 0 };
    saveSettings({ templates: [...settings.templates.filter((x) => x.title !== title), tpl] });
    renderTemplates(`own:${settings.templates.length - 1}`);
    toast(t('tpl.saved', { title }));
  }
});

// Workshops used most recently, as one-click suggestions
function recentShops() {
  const shops = [...new Set([...db.entries].sort((a, b) => b.date.localeCompare(a.date)).map((e) => e.shop.trim()).filter(Boolean))].slice(0, 3);
  return shops.length ? `${t('hint.recentShops')} ${shops.map((s) => `<button type="button" class="link" data-shop="${esc(s)}">${esc(s)}</button>`).join(' · ')}` : '';
}

$('#recentShops').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-shop]');
  if (btn) entryForm.elements.namedItem('shop').value = btn.dataset.shop;
});

// Hints below the fields: last mileage, last cost, when the next reminder would be due
function updateEntryHints() {
  const f = entryForm.elements;
  const car = carById(f.namedItem('car').value);
  if (!car) return;
  const others = entriesFor(car.id).filter((e) => e.id !== f.namedItem('id').value);
  const mileage = Number(f.namedItem('mileage').value) || 0;
  const lastKm = others.find((e) => e.mileage);
  $('#mileageHint').innerHTML = lastKm
    ? `${esc(t('hint.lastKm', { km: km(lastKm.mileage), date: fmtDayMonth(lastKm.date) }))}${mileage > lastKm.mileage ? ` · <span class="good">+${esc(km(mileage - lastKm.mileage))}</span>` : ''}`
    : '';
  const title = f.namedItem('title').value.trim().toLowerCase();
  const lastCost = (title && others.find((e) => e.cost && e.title.toLowerCase().includes(title)))
    || others.find((e) => e.cost && e.type === f.namedItem('type').value);
  $('#costHint').textContent = lastCost ? t('hint.lastCost', { amount: money.format(lastCost.cost) }) : '';

  const on = f.namedItem('remind').checked;
  const kmNext = num(f.namedItem('remindKm').value);
  const months = num(f.namedItem('remindMonths').value);
  const date = f.namedItem('date').value;
  const due = [
    kmNext && km((mileage || car.mileage || 0) + kmNext),
    months && date && fmtMonthYear(addMonths(date, months)),
  ].filter(Boolean);
  $('#remindBox').classList.toggle('off', !on);
  $('#remindDue').innerHTML = on && due.length ? `→ ${t('remind.due')} ${due.map((d) => `<strong>${esc(d)}</strong>`).join(' / ')}` : '';
}

entryForm.addEventListener('input', (ev) => {
  // Typing an interval switches the reminder on
  if (['remindKm', 'remindMonths'].includes(ev.target.name) && ev.target.value) entryForm.elements.namedItem('remind').checked = true;
  if (ev.target.name === 'title') renderTemplates();
  updateEntryHints();
});
entryForm.addEventListener('change', updateEntryHints);

$('#todayBtn').addEventListener('click', () => {
  entryForm.elements.namedItem('date').value = today();
  updateEntryHints();
});

function addDraftFiles(files) {
  queueFiles(draft, files);
  renderDraft();
}

$('#attInput').addEventListener('change', (ev) => {
  addDraftFiles(ev.target.files);
  ev.target.value = '';
});

// Drag & drop and pasting (Ctrl+V) files into the entry dialog
const dropzone = $('#dropzone');
dropzone.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  dropzone.classList.add('over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
dropzone.addEventListener('drop', (ev) => {
  ev.preventDefault();
  dropzone.classList.remove('over');
  addDraftFiles(ev.dataTransfer.files);
});
entryDialog.addEventListener('paste', (ev) => {
  const files = [...(ev.clipboardData?.files ?? [])];
  if (!files.length) return;
  ev.preventDefault();
  addDraftFiles(files);
});

$('#attEditor').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-remove]');
  if (!btn) return;
  const [removed] = draft[btn.dataset.remove].splice(Number(btn.dataset.index), 1);
  if (removed?.url) URL.revokeObjectURL(removed.url);
  renderDraft();
});

entryDialog.addEventListener('close', clearDraft);

async function bumpMileage(car, mileage) {
  if (mileage && mileage > (car.mileage || 0)) {
    upsertLocal('cars', await api('PATCH', rec('cars', car.id), { mileage }));
  }
}

// After saving: create/update the reminder for the next time, or remove a
// completed one. The MFK from the vehicle data is moved forward in the vehicle data.
async function scheduleReminder(car, entry, next, completed) {
  const r = completed?.r;
  if (r?.virtual) {
    const info = { ...car.info, lastInspection: entry.date };
    if (next?.months) info.nextInspection = addMonths(entry.date, next.months);
    else delete info.nextInspection;
    upsertLocal('cars', await api('PATCH', rec('cars', car.id), { info }));
    return;
  }
  if (!next?.km && !next?.months) {
    if (r) {
      await api('DELETE', rec('reminders', r.id));
      db.reminders = db.reminders.filter((x) => x.id !== r.id);
    }
    return;
  }
  const same = (x) => x.car === car.id && x.title.trim().toLowerCase() === entry.title.trim().toLowerCase();
  const target = r ?? db.reminders.find(same);
  // A completed reminder keeps its name ("Oil change", not "Oil change incl. filter")
  const data = {
    title: r?.title ?? entry.title,
    type: r?.type ?? entry.type,
    intervalKm: next.km || 0,
    intervalMonths: next.months || 0,
    dueKm: next.km ? (entry.mileage || car.mileage || 0) + next.km : 0,
    dueDate: next.months ? addMonths(entry.date, next.months) : '',
  };
  upsertLocal('reminders', target
    ? await api('PATCH', rec('reminders', target.id), data)
    : await api('POST', rec('reminders'), { ...data, car: car.id }));
}

// "Save & add another": keep car, date, mileage and workshop, clear the rest.
function resetForNext() {
  const f = entryForm.elements;
  for (const key of ['title', 'cost', 'notes']) f.namedItem(key).value = '';
  clearDraft();
  renderDraft();
  renderTemplates();
  setRemind(null);
  f.namedItem('title').focus();
}

entryForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const another = ev.submitter?.id === 'saveNext';
  withBusy(entryForm, async () => {
    const f = Object.fromEntries(new FormData(entryForm));
    const existing = entryById(f.id);
    const files = await Promise.all(draft.add.map((d) => prepareFile(d.file, ATTACHMENT_MAX, serverConfig.fileTypes.attachments)));
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

    await bumpMileage(carById(f.car), data.mileage);
    if (Array.isArray(draft.reminder)) {
      for (const s of draft.reminder) {
        const next = { km: s.r.intervalKm, months: s.r.intervalMonths || (s.r.virtual ? 24 : 0) };
        await scheduleReminder(carById(f.car), entry, next, s);
      }
    } else if (!existing) {
      const next = f.remind ? { km: num(f.remindKm), months: num(f.remindMonths) } : null;
      await scheduleReminder(carById(f.car), entry, next, draft.reminder);
    }

    if (another) resetForNext();
    else entryDialog.close();
    route();
    toast(existing ? t('toast.entryUpdated') : t('toast.entrySaved'));
  });
});

function infoInput(f, value) {
  const placeholder = f.placeholderKey ? t(f.placeholderKey) : (f.placeholder ?? '');
  const control = f.options
    ? `<select name="${f.key}"><option value="">–</option>${f.options.map((o) => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(fuelLabel(o))}</option>`).join('')}</select>`
    : `<input name="${f.key}" type="${f.type ?? 'text'}" value="${esc(value ?? '')}"${f.type === 'number' ? ' min="0"' : ''}${f.step ? ` step="${f.step}"` : ''} placeholder="${esc(placeholder)}">`;
  return `<label class="field">${esc(fieldLabel(f))}${control}</label>`;
}

function openInfoDialog(car) {
  const info = car.info ?? {};
  const groups = [...new Set(INFO_FIELDS.map((f) => f.group))];
  $('#infoFields').innerHTML = groups.map((g) => `
    <div class="form-group">
      <h3>${t(`info.group.${g}`)}</h3>
      <div class="row">${INFO_FIELDS.filter((f) => f.group === g).map((f) => infoInput(f, info[f.key])).join('')}</div>
    </div>`).join('');
  infoForm.elements.namedItem('carId').value = car.id;
  $('#infoDialogTitle').textContent = t('info.dialogTitle', { car: `${car.make} ${car.model}` });
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
    toast(t('toast.infoSaved'));
  });
});

/* ---------- Reminders dialog ---------- */

function openReminderDialog(carId, r = null) {
  const car = carById(carId);
  const f = reminderForm.elements;
  reminderForm.reset();
  f.namedItem('id').value = r?.id ?? '';
  f.namedItem('car').value = car.id;
  f.namedItem('title').value = r?.title ?? '';
  f.namedItem('type').value = r?.type ?? 'service';
  for (const key of ['intervalKm', 'intervalMonths', 'dueKm']) f.namedItem(key).value = r?.[key] || '';
  f.namedItem('dueDate').value = r?.dueDate ?? '';
  $('#reminderDialogTitle').innerHTML = r ? esc(t('rem.edit')) : t('rem.new', { car: `<span class="dim">${esc(carName(car))}</span>` });
  $('#reminderDelete').hidden = !r;
  $('#reminderDone').hidden = !r;
  showDialog(reminderDialog);
}

reminderForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(reminderForm, async () => {
    const f = Object.fromEntries(new FormData(reminderForm));
    const car = carById(f.car);
    const intervalKm = num(f.intervalKm) || 0;
    const intervalMonths = num(f.intervalMonths) || 0;
    // Empty due values are calculated from the interval and today's state
    const data = {
      title: f.title.trim(),
      type: f.type,
      intervalKm,
      intervalMonths,
      dueKm: num(f.dueKm) || (intervalKm ? (car.mileage || 0) + intervalKm : 0),
      dueDate: f.dueDate || (intervalMonths ? addMonths(today(), intervalMonths) : ''),
    };
    if (!data.dueKm && !data.dueDate) throw new Error(t('rem.needDue'));
    upsertLocal('reminders', f.id
      ? await api('PATCH', rec('reminders', f.id), data)
      : await api('POST', rec('reminders'), { ...data, car: car.id }));
    reminderDialog.close();
    route();
    toast(t('toast.reminderSaved'));
  });
});

$('#reminderDelete').addEventListener('click', () => {
  const r = reminderById(reminderForm.elements.namedItem('id').value);
  if (!r || !confirm(t('confirm.deleteReminder', { title: r.title }))) return;
  runAction(async () => {
    await api('DELETE', rec('reminders', r.id));
    db.reminders = db.reminders.filter((x) => x.id !== r.id);
    reminderDialog.close();
    route();
    toast(t('toast.reminderDeleted'));
  });
});

$('#reminderDone').addEventListener('click', () => {
  const state = findReminder(reminderForm.elements.namedItem('id').value);
  reminderDialog.close();
  if (state) completeReminder(state);
});

function completeReminder(state) {
  // Renewing a document = entering its new expiry date
  const doc = db.documents.find((d) => d.reminder === state.r.id);
  if (doc) openDocDialog(doc.car, doc);
  else openEntryDialog({ car: state.car.id, type: state.r.type, title: state.r.title }, state);
}

/* ---------- Documents dialog ---------- */

let docDraft = { entry: null, keep: [], add: [] };
const docLabel = (kind) => t(`doc.kind.${kind}`);

function openDocDialog(carId, doc = null) {
  const f = docForm.elements;
  docForm.reset();
  docDraft.add.forEach((a) => a.url && URL.revokeObjectURL(a.url));
  docDraft = { entry: doc, keep: [...(doc?.attachments ?? [])], add: [] };
  f.namedItem('id').value = doc?.id ?? '';
  f.namedItem('car').value = carId;
  $('#docKinds').innerHTML = DOC_KINDS.map((kind) => `
    <label><input type="radio" name="kind" value="${kind}"><span>${docLabel(kind)}</span></label>`).join('');
  f.namedItem('kind').value = doc?.kind ?? 'registration';
  f.namedItem('title').value = doc?.title ?? docLabel(f.namedItem('kind').value);
  f.namedItem('validUntil').value = doc?.validUntil ?? '';
  f.namedItem('remind').checked = doc ? !!doc.reminder : true;
  $('#docDialogTitle').textContent = doc ? t('doc.edit') : t('docs.add');
  $('#docDelete').hidden = !doc;
  renderDraft(docDraft, $('#docFiles'), docFile);
  updateDocRemind();
  showDialog(docDialog);
}

// "Remind 30 days before expiry · 01.12.2026" – only with an expiry date
function updateDocRemind() {
  const until = docForm.elements.namedItem('validUntil').value;
  $('#docRemindBox').hidden = !until;
  if (until) $('#docRemindText').innerHTML = t('doc.remind', { days: `<strong>${esc(tn('doc.days', DOC_REMIND_DAYS))}</strong>`, date: esc(fmtDateNum(addDays(until, -DOC_REMIND_DAYS))) });
}

// The name follows the kind until it is changed by hand.
docForm.addEventListener('change', (ev) => {
  if (ev.target.name === 'kind') {
    const title = docForm.elements.namedItem('title');
    if (!title.value.trim() || DOC_KINDS.some((k) => docLabel(k) === title.value)) title.value = docLabel(ev.target.value);
  }
  updateDocRemind();
});
docForm.addEventListener('input', updateDocRemind);

$('#docInput').addEventListener('change', (ev) => {
  queueFiles(docDraft, ev.target.files);
  ev.target.value = '';
  renderDraft(docDraft, $('#docFiles'), docFile);
});

$('#docFiles').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-remove]');
  if (!btn) return;
  const [removed] = docDraft[btn.dataset.remove].splice(Number(btn.dataset.index), 1);
  if (removed?.url) URL.revokeObjectURL(removed.url);
  renderDraft(docDraft, $('#docFiles'), docFile);
});

const docDrop = $('#docDrop');
docDrop.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  docDrop.classList.add('over');
});
docDrop.addEventListener('dragleave', () => docDrop.classList.remove('over'));
docDrop.addEventListener('drop', (ev) => {
  ev.preventDefault();
  docDrop.classList.remove('over');
  queueFiles(docDraft, ev.dataTransfer.files);
  renderDraft(docDraft, $('#docFiles'), docFile);
});
docDialog.addEventListener('paste', (ev) => {
  const files = [...(ev.clipboardData?.files ?? [])];
  if (!files.length) return;
  ev.preventDefault();
  queueFiles(docDraft, files);
  renderDraft(docDraft, $('#docFiles'), docFile);
});

// Creates, moves or removes the reminder before the document expires.
async function syncDocReminder(doc, remind) {
  const current = doc.reminder && reminderById(doc.reminder);
  if (remind && doc.validUntil) {
    const data = { title: t('doc.reminderTitle', { title: doc.title }), type: 'documents', intervalKm: 0, intervalMonths: 0, dueKm: 0, dueDate: addDays(doc.validUntil, -DOC_REMIND_DAYS) };
    const r = current
      ? await api('PATCH', rec('reminders', current.id), data)
      : await api('POST', rec('reminders'), { ...data, car: doc.car });
    upsertLocal('reminders', r);
    return r.id === doc.reminder ? doc : api('PATCH', rec('documents', doc.id), { reminder: r.id });
  }
  if (current) {
    await api('DELETE', rec('reminders', current.id));
    db.reminders = db.reminders.filter((r) => r.id !== current.id);
  }
  return doc.reminder ? api('PATCH', rec('documents', doc.id), { reminder: '' }) : doc;
}

docForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(docForm, async () => {
    const f = Object.fromEntries(new FormData(docForm));
    const existing = documentById(f.id);
    const files = await Promise.all(docDraft.add.map((a) => prepareFile(a.file, ATTACHMENT_MAX, serverConfig.fileTypes.attachments)));
    const removed = (existing?.attachments ?? []).filter((name) => !docDraft.keep.includes(name));
    const data = { kind: f.kind, title: f.title.trim(), validUntil: f.validUntil };
    if (removed.length) {
      data['attachments-'] = removed;
      data.attachmentNames = Object.fromEntries(Object.entries(existing.attachmentNames ?? {}).filter(([name]) => !removed.includes(name)));
    }
    let doc = existing
      ? await api('PATCH', rec('documents', existing.id), data)
      : await api('POST', rec('documents'), { ...data, car: f.car });
    if (files.length) doc = await uploadAttachments(doc, files, 'documents');
    doc = await syncDocReminder(doc, !!f.remind);
    upsertLocal('documents', doc);
    removed.forEach((name) => forgetFiles(docFile(doc, name)));
    docDialog.close();
    route();
    toast(existing ? t('toast.docUpdated') : t('toast.docSaved'));
  });
});

$('#docDelete').addEventListener('click', () => {
  const doc = documentById(docForm.elements.namedItem('id').value);
  if (!doc || !confirm(t('confirm.deleteDoc', { title: doc.title }))) return;
  runAction(async () => {
    if (doc.reminder) {
      await api('DELETE', rec('reminders', doc.reminder)).catch(() => {});
      db.reminders = db.reminders.filter((r) => r.id !== doc.reminder);
    }
    await api('DELETE', rec('documents', doc.id));
    db.documents = db.documents.filter((d) => d.id !== doc.id);
    forgetFiles(`documents/${doc.id}/`);
    docDialog.close();
    route();
    toast(t('toast.docDeleted'));
  });
});

/* ---------- Quick entry (phones) ---------- */

let quickPhoto = null;

function openQuickDialog(carId) {
  const selected = carById(carId) ?? carById(currentCarId) ?? db.cars[0];
  if (!selected) return;
  quickForm.reset();
  $('#quickCars').innerHTML = db.cars.length > 1
    ? db.cars.map((c) => `
      <label><input type="radio" name="car" value="${esc(c.id)}" ${c === selected ? 'checked' : ''}><span>${esc(c.model || c.make)}</span></label>`).join('')
    : `<input type="hidden" name="car" value="${esc(selected.id)}">`;
  quickForm.elements.namedItem('type').value = 'service';
  quickForm.elements.namedItem('mileage').value = selected.mileage || '';
  $('#quickCurrency').textContent = currencySymbol();
  setQuickPhoto(null);
  showDialog(quickDialog);
}

function setQuickPhoto(file) {
  quickPhoto = file;
  $('#quickPhotoTile').classList.toggle('done', !!file);
  $('#quickPhotoLabel').textContent = file ? t('quick.receiptAdded') : t('quick.receipt');
}

quickForm.addEventListener('change', (ev) => {
  if (ev.target.name === 'car') quickForm.elements.namedItem('mileage').value = carById(ev.target.value)?.mileage || '';
  if (ev.target.id === 'quickPhoto' && ev.target.files[0]) {
    try {
      checkFileType(ev.target.files[0], serverConfig.fileTypes.attachments);
      setQuickPhoto(ev.target.files[0]);
    } catch (err) {
      toast(err.message);
    }
    ev.target.value = '';
  }
});

quickForm.addEventListener('click', (ev) => {
  const step = ev.target.closest('[data-step]');
  if (!step) return;
  const input = quickForm.elements.namedItem('mileage');
  input.value = Math.max(0, (Number(input.value) || 0) + Number(step.dataset.step) * QUICK_KM_STEP);
});

quickForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(quickForm, async () => {
    const f = Object.fromEntries(new FormData(quickForm));
    const car = carById(f.car);
    let entry = await api('POST', rec('entries'), {
      car: car.id,
      type: f.type,
      date: today(),
      mileage: num(f.mileage),
      title: f.type === 'fuel' ? t('tpl.fuel') : typeLabel(f.type),
      cost: num(f.cost),
    });
    if (quickPhoto) entry = await uploadAttachments(entry, [await prepareFile(quickPhoto, ATTACHMENT_MAX, serverConfig.fileTypes.attachments)]);
    upsertLocal('entries', entry);
    await bumpMileage(car, entry.mileage);
    quickDialog.close();
    route();
    toast(t('toast.entrySaved'));
  });
});

/* ---------- Search ---------- */

const searchInput = $('#globalQ');
const searchResults = $('#searchResults');

function renderSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    searchResults.hidden = true;
    return;
  }
  const matches = (fields) => fields.join(' ').toLowerCase().includes(q);
  const cars = db.cars.filter((c) => matches([c.make, c.model, c.plate, c.info?.vin])).map((c) => `
    <a class="sr-item" href="#/car/${esc(c.id)}"><strong>${carTitle(c)}</strong><span class="muted small">${[c.year, c.plate].filter(Boolean).map(esc).join(' · ')}</span></a>`);
  const entries = db.entries.filter((e) => matches([e.title, e.shop, e.notes]))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((e) => `
    <a class="sr-item" href="#/car/${esc(e.car)}" data-entry="${esc(e.id)}"><strong>${esc(e.title)}</strong>
      <span class="muted small">${[carName(carById(e.car)), fmtDateNum(e.date), e.cost && money.format(e.cost)].filter(Boolean).map(esc).join(' · ')}</span></a>`);
  searchResults.innerHTML = [...cars, ...entries].join('') || `<p class="muted small sr-empty">${t('search.noResults')}</p>`;
  searchResults.hidden = false;
}

function closeSearch() {
  searchInput.value = '';
  searchResults.hidden = true;
  searchInput.blur();
  document.body.classList.remove('search-open');
}

searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('focus', renderSearch);
searchInput.addEventListener('blur', () => { searchResults.hidden = true; });
searchResults.addEventListener('pointerdown', (ev) => ev.preventDefault()); // keep the focus while clicking a hit
searchInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') closeSearch();
  if (ev.key === 'Enter') searchResults.querySelector('.sr-item')?.click();
});

// A hit opens the car and expands the entry.
searchResults.addEventListener('click', (ev) => {
  const item = ev.target.closest('.sr-item');
  if (!item) return;
  ev.preventDefault();
  const entryId = item.dataset.entry;
  if (entryId) {
    openEntries.add(entryId);
    filter.type = 'all';
  }
  closeSearch();
  history.pushState(null, '', item.getAttribute('href'));
  route();
  if (entryId) $(`#entry-${CSS.escape(entryId)}`)?.scrollIntoView({ block: 'center' });
});

document.addEventListener('keydown', (ev) => {
  const typing = ev.target.closest?.('input, textarea, select, [contenteditable]');
  if (ev.key === '/' && auth && !typing && !document.querySelector('dialog[open]')) {
    ev.preventDefault();
    document.body.classList.add('search-open');
    searchInput.focus();
  }
});

/* ---------- Service history (print / PDF) ---------- */

// Prints a clean history; the browser's "Save as PDF" turns it into a PDF.
function printHistory(car) {
  const entries = historyFor(car.id);
  const info = car.info ?? {};
  const facts = [
    [t('car.year'), car.year], [t('car.plate'), car.plate], [t('info.vin'), info.vin],
    [t('info.stammnummer'), info.stammnummer], [t('tile.mileage'), car.mileage && km(car.mileage)],
  ].filter(([, value]) => value);
  $('#printArea')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="printArea">
      <header>
        <h1>${esc(carName(car))}</h1>
        <p>${t('print.title')} · ${esc(t('print.date', { date: fmtDateNum(today()) }))}</p>
      </header>
      <dl>${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <table>
        <thead><tr><th>${t('entry.date')}</th><th>${t('entry.title')}</th><th>${t('entry.type')}</th><th>${t('entry.shop')}</th><th class="num">${t('entry.mileage')}</th><th class="num">${t('entry.cost')}</th></tr></thead>
        <tbody>${entries.map((e) => `
          <tr><td>${fmtDateNum(e.date)}</td><td>${esc(e.title)}${e.notes ? `<small>${esc(e.notes)}</small>` : ''}</td><td>${typeLabel(e.type)}</td>
            <td>${esc(e.shop)}</td><td class="num">${e.mileage ? km(e.mileage) : ''}</td><td class="num">${e.cost ? money.format(e.cost) : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="5">${t('print.total')}</td><td class="num">${money.format(sum(entries))}</td></tr></tfoot>
      </table>
      <footer>${esc(serverConfig.appName)}</footer>
    </div>`);
  document.title = `${serverConfig.appName} – ${carName(car)}`; // suggested PDF file name
  window.print();
}

window.addEventListener('afterprint', () => {
  $('#printArea')?.remove();
  document.title = serverConfig.appName;
});

function openPasswordDialog(userId, username) {
  const self = userId === me().id;
  passwordForm.reset();
  passwordForm.elements.namedItem('userId').value = userId;
  $('#oldPasswordField').hidden = !self;
  passwordForm.elements.namedItem('oldPassword').required = self;
  $('#passwordDialogTitle').textContent = self ? t('pw.change') : t('pw.setFor', { name: username });
  showDialog(passwordDialog);
}

passwordForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(passwordForm, async () => {
    const f = Object.fromEntries(new FormData(passwordForm));
    if (f.password !== f.passwordConfirm) throw new Error(t('err.pwMismatch'));
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
    toast(t('toast.pwChanged'));
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
    toast(t('toast.userCreated', { name: f.username.trim() }));
  });
});

for (const dialog of [carDialog, entryDialog, infoDialog, userDialog, passwordDialog, docsDialog, reminderDialog, docDialog, quickDialog, lightbox]) {
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
    alert(err.message || t('err.action'));
  }
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'set-lang':
      setLanguage(el.dataset.lang);
      route();
      break;
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
      const entries = tn('count.entries', entriesFor(id).length);
      if (!confirm(t('confirm.deleteCar', { car: `${car.make} ${car.model}`, entries }))) return;
      runAction(async () => {
        await api('DELETE', rec('cars', id));
        db.cars = db.cars.filter((c) => c.id !== id);
        db.entries = db.entries.filter((e) => e.car !== id);
        db.reminders = db.reminders.filter((r) => r.car !== id);
        db.documents = db.documents.filter((d) => d.car !== id);
        forgetFiles(`cars/${id}/`);
        location.hash = '#/';
        route();
        toast(t('toast.carDeleted'));
      });
      break;
    }
    case 'edit-info':
      openInfoDialog(carById(id));
      break;
    case 'toggle-due': {
      dueCollapsed = !dueCollapsed;
      if (settings.dueBox === 'remember') saveSettings({ dueCollapsed });
      $('#due').classList.toggle('collapsed', dueCollapsed);
      el.setAttribute('aria-expanded', !dueCollapsed);
      break;
    }
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
        toast(t('toast.coverChanged'));
      });
      break;
    case 'delete-photo':
      if (!confirm(t('confirm.deletePhoto'))) return;
      runAction(async () => {
        upsertLocal('cars', await api('PATCH', rec('cars', id), { 'photos-': [el.dataset.photo] }));
        forgetFiles(`cars/${id}/${el.dataset.photo}|`);
        route();
        toast(t('toast.photoDeleted'));
      });
      break;
    case 'add-entry':
      openEntryDialog({ car: id });
      break;
    case 'show-docs': {
      const car = carById(id);
      $('#docsDialogTitle').textContent = `${t('docs.title')} · ${carName(car)}`;
      $('#docsContent').innerHTML = `${docList(car)}
        <button class="link-btn accent" data-action="add-document" data-id="${esc(car.id)}">${icon('plus')}${t('docs.addShort')}</button>`;
      showDialog(docsDialog);
      hydrate();
      break;
    }
    case 'add-document':
      if (docsDialog.open) docsDialog.close();
      openDocDialog(id);
      break;
    case 'edit-document': {
      const doc = documentById(id);
      if (docsDialog.open) docsDialog.close();
      if (doc) openDocDialog(doc.car, doc);
      break;
    }
    case 'view-document':
      runAction(() => viewFiles(documentById(id), docFile));
      break;
    case 'view-file':
      // A file chip of an entry: images in the viewer, PDFs in a new tab
      runAction(() => viewFiles(entryById(id), entryFile, el.dataset.file));
      break;
    case 'edit-entry':
      openEntryDialog(entryById(id));
      break;
    case 'delete-entry': {
      const entry = entryById(id);
      if (!confirm(t('confirm.deleteEntry', { title: entry.title }))) return;
      runAction(async () => {
        await api('DELETE', rec('entries', id));
        db.entries = db.entries.filter((e) => e.id !== id);
        forgetFiles(`entries/${id}/`);
        route();
        toast(t('toast.entryDeleted'));
      });
      break;
    }
    case 'filter':
      filter.type = el.dataset.type;
      document.querySelectorAll('.tchip').forEach((c) => c.setAttribute('aria-pressed', c === el));
      renderEntries(carById(currentCarId));
      break;
    case 'toggle-entry':
      if (openEntries.has(id)) openEntries.delete(id);
      else openEntries.add(id);
      renderEntries(carById(currentCarId));
      $(`#entry-${CSS.escape(id)} .entry-line`)?.focus();
      break;
    case 'toggle-due-group': {
      const key = el.dataset.key;
      if (collapsedDue.has(key)) collapsedDue.delete(key);
      else collapsedDue.add(key);
      el.setAttribute('aria-expanded', !collapsedDue.has(key));
      break;
    }
    case 'toggle-menu': {
      const menu = el.nextElementSibling;
      menu.hidden = !menu.hidden;
      el.setAttribute('aria-expanded', !menu.hidden);
      break;
    }
    case 'reminders-done': {
      const states = el.dataset.ids.split(',').map(findReminder).filter(Boolean);
      if (states.length) {
        openEntryDialog({ car: states[0].car.id, type: states[0].r.type, title: states.map((s) => s.r.title).join(' + ') }, states);
      }
      break;
    }
    case 'add-reminder':
      openReminderDialog(id);
      break;
    case 'edit-reminder': {
      const state = findReminder(id);
      if (!state) return;
      // The MFK date comes from the vehicle data
      if (state.r.virtual) openInfoDialog(state.car);
      else openReminderDialog(state.car.id, state.r);
      break;
    }
    case 'reminder-done': {
      const state = findReminder(id);
      if (state) completeReminder(state);
      break;
    }
    case 'print-history':
      printHistory(carById(id));
      break;
    case 'quick-add':
      openQuickDialog(currentCarId);
      break;
    case 'search-toggle':
      document.body.classList.toggle('search-open');
      if (document.body.classList.contains('search-open')) searchInput.focus();
      break;
    case 'go-due':
      if (location.hash && location.hash !== '#/') history.pushState(null, '', '#/');
      route();
      $('#due')?.scrollIntoView({ behavior: 'smooth' });
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
      if (!confirm(t('confirm.deleteUser', { name: el.dataset.name }))) return;
      runAction(async () => {
        await api('DELETE', rec('users', id));
        renderUsers();
        toast(t('toast.userDeleted', { name: el.dataset.name }));
      });
      break;
  }
});

// Open menus ("…") close on any click outside their button.
document.addEventListener('click', (ev) => {
  const toggle = ev.target.closest('[data-action="toggle-menu"]');
  for (const menu of document.querySelectorAll('.menu:not([hidden])')) {
    if (toggle && menu === toggle.nextElementSibling) continue;
    menu.hidden = true;
    menu.previousElementSibling.setAttribute('aria-expanded', false);
  }
});

document.addEventListener('change', async (ev) => {
  const input = ev.target.closest('input[data-upload="car-photos"]');
  if (!input?.files.length) return;
  const files = [...input.files];
  await runAction(async () => {
    files.forEach((file) => checkFileType(file, serverConfig.fileTypes.photos));
    toast(tn('toast.photosUploading', files.length), 0);
    const prepared = await Promise.all(files.map((file) => prepareFile(file, CAR_PHOTO_MAX, serverConfig.fileTypes.photos)));
    upsertLocal('cars', await uploadFiles('cars', input.dataset.id, 'photos', prepared));
    route();
    toast(tn('toast.photosAdded', files.length));
  });
});

/* ---------- Backup ---------- */

// Format (version 2) is compatible with backups from the former browser-only version.
async function exportBackup() {
  const total = db.cars.reduce((n, c) => n + c.photos.length, 0)
    + [...db.entries, ...db.documents].reduce((n, e) => n + e.attachments.length, 0);
  let done = 0;
  const files = [];
  const addFile = async (path, name) => {
    toast(t('toast.exporting', { done: ++done, total }), 0);
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

  const documents = [];
  for (const d of db.documents) {
    const attachments = [];
    for (const name of d.attachments) attachments.push(await addFile(docFile(d, name), attachmentLabel(d, name)));
    documents.push({ carId: d.car, kind: d.kind, title: d.title, validUntil: d.validUntil, remind: !!d.reminder, attachments });
  }

  // Reminders of documents are created again from "remind" on import.
  const reminders = db.reminders.filter((r) => !db.documents.some((d) => d.reminder === r.id)).map((r) => ({
    carId: r.car, title: r.title, type: r.type, intervalKm: r.intervalKm || null, intervalMonths: r.intervalMonths || null,
    dueKm: r.dueKm || null, dueDate: r.dueDate,
  }));

  const backup = { version: 2, app: 'carmaint', exported: new Date().toISOString(), settings, cars, entries, reminders, documents, files };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carmaint-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('toast.exported'));
}

async function importBackup(data) {
  if (!Array.isArray(data?.cars) || !Array.isArray(data?.entries)) throw new Error(t('err.invalidBackup'));
  const files = new Map((Array.isArray(data.files) ? data.files : []).map((f) => [f.id, f]));
  // Files of a type this server does not allow (ALLOWED_FILE_TYPES) are skipped.
  const fileOf = async (id, fallbackName, types) => {
    const f = files.get(id);
    if (!f?.data) return null;
    const blob = dataUrlToBlob(f.data);
    if (!types.includes(blob.type)) return null;
    return { blob, name: withExt(f.name || fallbackName || 'file', blob.type) };
  };
  const filesOf = async (list, toFile) => (await Promise.all((Array.isArray(list) ? list : []).map(toFile))).filter(Boolean);

  const oldCars = db.cars.map((c) => c.id);
  const created = [];
  const carIds = new Map();
  const total = data.cars.length + data.entries.length;
  let done = 0;
  const progress = () => toast(t('toast.importing', { done: ++done, total }), 0);

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
      const photos = await filesOf(c.photos, (id) => fileOf(id, 'photo', serverConfig.fileTypes.photos));
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
        title: str(e.title) || t('import.entryFallback'),
        cost: num(e.cost),
        shop: str(e.shop),
        notes: str(e.notes),
      });
      const atts = await filesOf(e.attachments, (a) => fileOf(a?.id, a?.name, serverConfig.fileTypes.attachments));
      if (atts.length) await uploadAttachments(entry, atts);
    }
    // Reminders exist since 0.2 – older backups have none.
    for (const r of Array.isArray(data.reminders) ? data.reminders : []) {
      const car = carIds.get(r.carId);
      if (!car) continue;
      await api('POST', rec('reminders'), {
        car,
        title: str(r.title) || t('import.entryFallback'),
        type: TYPES[r.type] ? r.type : 'other',
        intervalKm: num(r.intervalKm),
        intervalMonths: num(r.intervalMonths),
        dueKm: num(r.dueKm),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) ? r.dueDate : '',
      });
    }
    // Documents exist since 0.2 (before, they were entries of type "documents").
    for (const d of Array.isArray(data.documents) ? data.documents : []) {
      const car = carIds.get(d.carId);
      if (!car) continue;
      let doc = await api('POST', rec('documents'), {
        car,
        kind: DOC_KINDS.includes(d.kind) ? d.kind : 'other',
        title: str(d.title) || t('docs.title'),
        validUntil: /^\d{4}-\d{2}-\d{2}$/.test(d.validUntil) ? d.validUntil : '',
      });
      const atts = await filesOf(d.attachments, (a) => fileOf(a?.id, a?.name, serverConfig.fileTypes.attachments));
      if (atts.length) doc = await uploadAttachments(doc, atts, 'documents');
      await syncDocReminder(doc, !!d.remind);
    }
  } catch (err) {
    // Remove partially imported data; the existing data stays untouched.
    for (const id of created) await api('DELETE', rec('cars', id)).catch(() => {});
    throw new Error(t('err.importAborted', { message: err.message }));
  }

  // Only remove the previous vehicles after a successful import.
  for (const id of oldCars) await api('DELETE', rec('cars', id)).catch(() => {});
  if (CURRENCIES[data.settings?.currency]) await saveSettings({ currency: data.settings.currency });
  forgetFiles();
  await loadData();
  await moveLegacyDocuments(); // backups from before 0.2
  location.hash = '#/';
  route();
  toast(tn('toast.imported', data.cars.length));
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
      throw new Error(t('err.invalidBackup'));
    }
    const count = Array.isArray(data?.cars) ? data.cars.length : 0;
    if (!confirm(t('confirm.import', { cars: tn('count.carsWith', count) }))) return;
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

// Display size: scales the whole page; stored per device (screens differ).
const ZOOM_KEY = 'carmaint:zoom';
const ZOOM_STEPS = [80, 90, 100, 110, 125, 140];
let zoom = 100;
try { zoom = ZOOM_STEPS.includes(Number(localStorage.getItem(ZOOM_KEY))) ? Number(localStorage.getItem(ZOOM_KEY)) : 100; } catch {}

function setZoom(next) {
  zoom = next;
  document.documentElement.style.zoom = zoom === 100 ? '' : zoom / 100;
  $('#zoomValue').textContent = `${zoom} %`;
  $('#zoomMenu [data-zoom="-1"]').disabled = zoom === ZOOM_STEPS[0];
  $('#zoomMenu [data-zoom="1"]').disabled = zoom === ZOOM_STEPS.at(-1);
  try { localStorage.setItem(ZOOM_KEY, zoom); } catch {}
}

function toggleZoomMenu(open) {
  $('#zoomMenu').hidden = !open;
  $('#zoomBtn').setAttribute('aria-expanded', open);
}

$('#zoomBtn').addEventListener('click', () => toggleZoomMenu($('#zoomMenu').hidden));
$('#zoomMenu').addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-zoom]');
  if (!btn) return;
  const step = Number(btn.dataset.zoom);
  const i = ZOOM_STEPS.indexOf(zoom);
  setZoom(step ? ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + step))] : 100);
});
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.zoom-wrap')) toggleZoomMenu(false);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !$('#zoomMenu').hidden) toggleZoomMenu(false);
});
setZoom(zoom);

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
  setLanguage(initialLanguage());
  // File pickers only offer the allowed types (ALLOWED_FILE_TYPES)
  $('#attInput').accept = serverConfig.fileTypes.attachments.join(',');
  $('#docInput').accept = serverConfig.fileTypes.attachments.join(',');
  $('#quickPhoto').accept = serverConfig.fileTypes.attachments.filter((type) => type.startsWith('image/')).join(',') || 'image/jpeg';
  $('#carPhotos').accept = serverConfig.fileTypes.photos.join(',');
  document.title = serverConfig.appName;
  $('#appName').innerHTML = wordmark(serverConfig.appName);
  $('#appName').setAttribute('aria-label', serverConfig.appName);

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
    $('#app').innerHTML = emptyState('car', t('err.noConnection'), esc(err.message),
      `<button class="btn primary" onclick="location.reload()">${t('btn.retry')}</button>`);
  }
}

start();
