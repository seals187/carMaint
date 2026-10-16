'use strict';

const STORAGE_KEY = 'carmaint:v1';
const THEME_KEY = 'carmaint:theme';
const SETTINGS_KEY = 'carmaint:settings';

const CURRENCIES = {
  EUR: { label: 'Euro',              locale: 'de-DE' },
  CHF: { label: 'Schweizer Franken', locale: 'de-CH' },
  USD: { label: 'US-Dollar',         locale: 'en-US' },
};

const INFO_MODES = { open: 'Offen', closed: 'Zugeklappt', remember: 'Merken' };
const DEFAULT_SETTINGS = { currency: 'EUR', infoBox: 'remember', infoCollapsed: false };
const CAR_PHOTO_MAX = 1600;   // px, längste Seite
const ATTACHMENT_MAX = 2000;  // Belege etwas größer, damit Text lesbar bleibt

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
};

const $ = (sel) => document.querySelector(sel);
const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => (v === '' || v == null ? null : Number(v));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const isImage = (f) => (f.type || '').startsWith('image/');

let settings = loadSettings();
let money = currencyFormat(settings.currency);

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (data && typeof data === 'object') {
      const s = { ...DEFAULT_SETTINGS, ...data };
      if (!CURRENCIES[s.currency]) s.currency = DEFAULT_SETTINGS.currency;
      if (!INFO_MODES[s.infoBox]) s.infoBox = DEFAULT_SETTINGS.infoBox;
      return s;
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

const defaultInfoCollapsed = () =>
  settings.infoBox === 'closed' || (settings.infoBox === 'remember' && settings.infoCollapsed);

function saveSettings(next) {
  settings = { ...settings, ...next };
  money = currencyFormat(settings.currency);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function currencyFormat(code) {
  return new Intl.NumberFormat(CURRENCIES[code].locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' });
}

const currencySymbol = () => money.formatToParts(0).find((p) => p.type === 'currency')?.value ?? settings.currency;

const number = new Intl.NumberFormat('de-DE');
const km = (v) => (v ? `${number.format(v)} km` : '–');
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–');
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Fahrzeugdaten der Infobox. `format` liefert sicheres HTML für die Anzeige.
const INFO_FIELDS = [
  { group: 'Kauf', key: 'purchasePrice', label: () => `Kaufpreis (${currencySymbol()})`, display: 'Kaufpreis', type: 'number', step: '0.01', format: (v) => money.format(v) },
  { group: 'Kauf', key: 'purchaseDate', label: 'Kaufdatum', type: 'date', format: fmtDate },
  { group: 'Zulassung', key: 'firstRegistration', label: '1. Inverkehrsetzung', type: 'date', format: fmtDate },
  { group: 'Zulassung', key: 'stammnummer', label: 'Stammnummer', placeholder: '123.456.789', format: (v) => `<span class="mono">${esc(v)}</span>` },
  // pinned: bleibt auch bei zugeklappter Infobox sichtbar
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

/* ---------- Daten ---------- */

let db = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.cars) && Array.isArray(data.entries)) return data;
  } catch {}
  return { cars: [], entries: [] };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

const carById = (id) => db.cars.find((c) => c.id === id);
const entryById = (id) => db.entries.find((e) => e.id === id);
const sum = (list) => list.reduce((t, e) => t + (Number(e.cost) || 0), 0);
const entriesFor = (carId) => db.entries
  .filter((e) => e.carId === carId)
  .sort((a, b) => b.date.localeCompare(a.date) || (b.mileage || 0) - (a.mileage || 0));

/* ---------- Dateien (IndexedDB) ---------- */

// Bilder und Belege sind zu groß für localStorage und liegen deshalb in IndexedDB.
const fileStore = (() => {
  let opening;
  const open = () => opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('carmaint', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const run = async (mode, fn) => {
    const idb = await open();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('files', mode);
      const req = fn(tx.objectStore('files'));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    get: (id) => run('readonly', (s) => s.get(id)),
    all: () => run('readonly', (s) => s.getAll()),
    put: (rec) => run('readwrite', (s) => s.put(rec)),
    putMany: (recs) => run('readwrite', (s) => { recs.forEach((r) => s.put(r)); }),
    del: (ids) => run('readwrite', (s) => { ids.forEach((id) => s.delete(id)); }),
    clear: () => run('readwrite', (s) => s.clear()),
  };
})();

const urlCache = new Map();

async function fileUrl(id) {
  if (!urlCache.has(id)) {
    const rec = await fileStore.get(id);
    if (!rec) return null;
    urlCache.set(id, URL.createObjectURL(rec.blob));
  }
  return urlCache.get(id);
}

function forgetFiles(ids) {
  if (!ids.length) return Promise.resolve();
  for (const id of ids) {
    if (urlCache.has(id)) URL.revokeObjectURL(urlCache.get(id));
    urlCache.delete(id);
  }
  return fileStore.del(ids);
}

// Bilder werden als <img data-file="…"> gerendert und hier nachgeladen.
function hydrate() {
  return Promise.all([...document.querySelectorAll('img[data-file]:not([src])')].map(async (img) => {
    const url = await fileUrl(img.dataset.file);
    if (url) img.src = url;
  }));
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

async function storeFile(file, maxSize) {
  const blob = isImage(file) ? await compressImage(file, maxSize) : file;
  const meta = { id: uid(), name: file.name, type: blob.type || file.type };
  await fileStore.put({ ...meta, blob });
  navigator.storage?.persist?.();
  return meta;
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
  if (!/\.pdf$/i.test(name)) a.download = name; // PDFs im neuen Tab öffnen, alles andere herunterladen
  a.click();
}

/* ---------- Ansichten ---------- */

let currentCarId = null;
let filter = { type: 'all', q: '' };
let infoCollapsed = defaultInfoCollapsed();

function route() {
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
      : emptyState('car', 'Noch keine Fahrzeuge', 'Füge dein erstes Auto hinzu, um Services und Reparaturen zu notieren.', addBtn('Fahrzeug hinzufügen'))}`;
}

function renderSettings() {
  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}Alle Fahrzeuge</a>
    <section class="hero"><h1>Einstellungen</h1></section>
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
    </div>`;
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
  const cover = car.photos?.[0];
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  return `
    <article class="card car-card">
      <div class="car-media">${cover ? `<img data-file="${esc(cover)}" alt="">` : icon('car')}</div>
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
  const photos = car.photos ?? [];
  const year = String(new Date().getFullYear());
  const lastService = entries.find((e) => e.type === 'service');
  const sub = [car.year, car.plate].filter(Boolean).map(esc).join(' · ');
  const tile = (label, value) => `<div class="card tile"><span>${label}</span><strong>${value}</strong></div>`;
  const id = esc(car.id);

  $('#app').innerHTML = `
    <a href="#/" class="back">${icon('back')}Alle Fahrzeuge</a>
    <section class="hero">
      <div class="hero-title">
        <div class="avatar lg">${photos[0] ? `<img data-file="${esc(photos[0])}" alt="">` : icon('car')}</div>
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
      ${photos.map((pid, i) => `
        <div class="thumb">
          <button class="thumb-img" data-action="view-photo" data-id="${id}" data-index="${i}" aria-label="Foto ${i + 1} ansehen"><img data-file="${esc(pid)}" alt=""></button>
          ${i === 0 ? '<span class="cover-badge">Titelbild</span>' : ''}
          <div class="thumb-actions">
            ${i > 0 ? `<button class="icon-btn sm" data-action="cover-photo" data-id="${id}" data-photo="${esc(pid)}" title="Als Titelbild" aria-label="Als Titelbild">${icon('star')}</button>` : ''}
            <button class="icon-btn sm" data-action="delete-photo" data-id="${id}" data-photo="${esc(pid)}" title="Foto löschen" aria-label="Foto löschen">${icon('trash')}</button>
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

function attachmentItem(a, entryId) {
  if (isImage(a)) {
    return `<button class="att" data-action="view-attachment" data-id="${esc(entryId)}" data-file="${esc(a.id)}" title="${esc(a.name)}" aria-label="${esc(a.name)} ansehen"><img data-file="${esc(a.id)}" alt=""></button>`;
  }
  return `<button class="att file" data-action="open-file" data-file="${esc(a.id)}" data-name="${esc(a.name)}" title="${esc(a.name)}">${icon('file')}<span>${esc(a.name)}</span></button>`;
}

function entryItem(e) {
  const t = TYPES[e.type] ?? TYPES.other;
  const id = esc(e.id);
  const atts = e.attachments ?? [];
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
        ${atts.length ? `<div class="attachments">${atts.map((a) => attachmentItem(a, e.id)).join('')}</div>` : ''}
        <div class="entry-actions">
          <button class="icon-btn sm" data-action="edit-entry" data-id="${id}" title="Bearbeiten" aria-label="Bearbeiten">${icon('pencil')}</button>
          <button class="icon-btn sm danger" data-action="delete-entry" data-id="${id}" title="Löschen" aria-label="Löschen">${icon('trash')}</button>
        </div>
      </div>
    </li>`;
}

/* ---------- Dialoge ---------- */

const carDialog = $('#carDialog');
const carForm = $('#carForm');
const entryDialog = $('#entryDialog');
const entryForm = $('#entryForm');
const lightbox = $('#lightbox');
const infoDialog = $('#infoDialog');
const infoForm = $('#infoForm');

$('#typeSelect').innerHTML = Object.entries(TYPES)
  .map(([key, t]) => `<option value="${key}">${t.label}</option>`).join('');

async function withBusy(form, fn) {
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    alert('Speichern fehlgeschlagen. Ist der Speicher des Browsers voll?');
  } finally {
    btn.disabled = false;
  }
}

function openCarDialog(car) {
  const f = carForm.elements;
  carForm.reset();
  f.namedItem('id').value = car?.id ?? '';
  for (const key of ['make', 'model', 'year', 'plate', 'mileage']) f.namedItem(key).value = car?.[key] ?? '';
  $('#carPhotosLabel').textContent = 'Fotos auswählen';
  $('#carDialogTitle').textContent = car ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug';
  carDialog.showModal();
}

$('#carPhotos').addEventListener('change', (ev) => {
  const n = ev.target.files.length;
  $('#carPhotosLabel').textContent = n ? `${plural(n, 'Foto', 'Fotos')} ausgewählt` : 'Fotos auswählen';
});

carForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withBusy(carForm, async () => {
    const f = Object.fromEntries(new FormData(carForm));
    const added = await Promise.all([...$('#carPhotos').files].map((file) => storeFile(file, CAR_PHOTO_MAX)));
    const data = {
      make: f.make.trim(),
      model: f.model.trim(),
      year: num(f.year),
      plate: f.plate.trim().toUpperCase(),
      mileage: num(f.mileage),
    };
    let car = carById(f.id);
    if (car) {
      Object.assign(car, data);
    } else {
      car = { id: uid(), ...data };
      db.cars.push(car);
    }
    car.photos = [...(car.photos ?? []), ...added.map((a) => a.id)];
    save();
    carDialog.close();
    if (!f.id) location.hash = `#/car/${car.id}`;
    route();
    toast(f.id ? 'Fahrzeug aktualisiert' : 'Fahrzeug hinzugefügt');
  });
});

// Anhänge im Eintrags-Dialog: vorhandene behalten/entfernen, neue vormerken.
let draft = { keep: [], add: [] };

function renderDraft() {
  const item = (media, name, list, i) => `
    <div class="draft-item">${media}<span>${esc(name)}</span>
      <button type="button" class="icon-btn sm" data-remove="${list}" data-index="${i}" aria-label="${esc(name)} entfernen">${icon('x')}</button>
    </div>`;
  $('#attEditor').innerHTML = [
    ...draft.keep.map((a, i) => item(isImage(a) ? `<img data-file="${esc(a.id)}" alt="">` : icon('file'), a.name, 'keep', i)),
    ...draft.add.map((d, i) => item(d.url ? `<img src="${d.url}" alt="">` : icon('file'), d.file.name, 'add', i)),
  ].join('');
  hydrate();
}

function clearDraft() {
  draft.add.forEach((d) => d.url && URL.revokeObjectURL(d.url));
  draft = { keep: [], add: [] };
}

function openEntryDialog(entry) {
  const car = carById(entry.carId);
  const f = entryForm.elements;
  entryForm.reset();
  f.namedItem('id').value = entry.id ?? '';
  f.namedItem('carId').value = car.id;
  f.namedItem('type').value = entry.type ?? 'service';
  f.namedItem('date').value = entry.date ?? today();
  f.namedItem('mileage').value = entry.mileage ?? car.mileage ?? '';
  for (const key of ['title', 'cost', 'shop', 'notes']) f.namedItem(key).value = entry[key] ?? '';
  $('#currencySymbol').textContent = currencySymbol();
  clearDraft();
  draft.keep = [...(entry.attachments ?? [])];
  renderDraft();
  $('#entryDialogTitle').textContent = entry.id ? 'Eintrag bearbeiten' : `Neuer Eintrag · ${car.make} ${car.model}`;
  entryDialog.showModal();
}

$('#attInput').addEventListener('change', (ev) => {
  for (const file of ev.target.files) draft.add.push({ file, url: isImage(file) ? URL.createObjectURL(file) : null });
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
    const added = await Promise.all(draft.add.map((d) => storeFile(d.file, ATTACHMENT_MAX)));
    const removed = (existing?.attachments ?? []).filter((a) => !draft.keep.includes(a)).map((a) => a.id);
    const data = {
      carId: f.carId,
      type: f.type,
      date: f.date,
      mileage: num(f.mileage),
      title: f.title.trim(),
      cost: num(f.cost),
      shop: f.shop.trim(),
      notes: f.notes.trim(),
      attachments: [...draft.keep, ...added],
    };
    if (existing) Object.assign(existing, data);
    else db.entries.push({ id: uid(), ...data });

    const car = carById(f.carId);
    if (data.mileage && data.mileage > (car.mileage || 0)) car.mileage = data.mileage;

    save();
    await forgetFiles(removed);
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
  infoDialog.showModal();
}

infoForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = new FormData(infoForm);
  const car = carById(form.get('carId'));
  const info = {};
  for (const f of INFO_FIELDS) {
    const raw = String(form.get(f.key) ?? '').trim();
    if (raw) info[f.key] = f.type === 'number' ? Number(raw) : f.upper ? raw.toUpperCase() : raw;
  }
  car.info = info;
  save();
  infoDialog.close();
  route();
  toast('Fahrzeugdaten gespeichert');
});

for (const dialog of [carDialog, entryDialog, infoDialog, lightbox]) {
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog || ev.target.closest('[data-close]')) dialog.close();
  });
}

/* ---------- Bildbetrachter ---------- */

const lb = { ids: [], index: 0 };

function openLightbox(ids, index) {
  if (!ids.length) return;
  lb.ids = ids;
  lb.index = Math.max(0, index);
  showLightboxImage();
  lightbox.showModal();
}

async function showLightboxImage() {
  lightbox.classList.toggle('single', lb.ids.length < 2);
  $('#lbCaption').textContent = lb.ids.length > 1 ? `${lb.index + 1} / ${lb.ids.length}` : '';
  $('#lbImg').src = (await fileUrl(lb.ids[lb.index])) ?? '';
}

function stepLightbox(delta) {
  lb.index = (lb.index + delta + lb.ids.length) % lb.ids.length;
  showLightboxImage();
}

lightbox.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-lb]');
  if (btn) stepLightbox(Number(btn.dataset.lb));
});

document.addEventListener('keydown', (ev) => {
  if (!lightbox.open || lb.ids.length < 2) return;
  if (ev.key === 'ArrowLeft') stepLightbox(-1);
  if (ev.key === 'ArrowRight') stepLightbox(1);
});

/* ---------- Aktionen ---------- */

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'add-car':
      openCarDialog();
      break;
    case 'edit-car':
      openCarDialog(carById(id));
      break;
    case 'delete-car': {
      const car = carById(id);
      const entries = db.entries.filter((e) => e.carId === id);
      if (!confirm(`${car.make} ${car.model} und ${plural(entries.length, 'Eintrag', 'Einträge')} wirklich löschen?`)) return;
      const fileIds = [...(car.photos ?? []), ...entries.flatMap((e) => (e.attachments ?? []).map((a) => a.id))];
      db.cars = db.cars.filter((c) => c.id !== id);
      db.entries = db.entries.filter((e) => e.carId !== id);
      save();
      forgetFiles(fileIds);
      location.hash = '#/';
      route();
      toast('Fahrzeug gelöscht');
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
    case 'view-photo':
      openLightbox(carById(id).photos, Number(el.dataset.index));
      break;
    case 'cover-photo': {
      const car = carById(id);
      car.photos = [el.dataset.photo, ...car.photos.filter((p) => p !== el.dataset.photo)];
      save();
      route();
      toast('Titelbild geändert');
      break;
    }
    case 'delete-photo': {
      if (!confirm('Dieses Foto löschen?')) return;
      const car = carById(id);
      car.photos = car.photos.filter((p) => p !== el.dataset.photo);
      save();
      await forgetFiles([el.dataset.photo]);
      route();
      toast('Foto gelöscht');
      break;
    }
    case 'add-entry':
      openEntryDialog({ carId: id });
      break;
    case 'edit-entry':
      openEntryDialog(entryById(id));
      break;
    case 'delete-entry': {
      const entry = entryById(id);
      if (!confirm(`„${entry.title}“ wirklich löschen?`)) return;
      db.entries = db.entries.filter((e) => e.id !== id);
      save();
      forgetFiles((entry.attachments ?? []).map((a) => a.id));
      route();
      toast('Eintrag gelöscht');
      break;
    }
    case 'view-attachment': {
      const images = (entryById(id).attachments ?? []).filter(isImage).map((a) => a.id);
      openLightbox(images, images.indexOf(el.dataset.file));
      break;
    }
    case 'open-file': {
      const url = await fileUrl(el.dataset.file);
      if (url) openFile(url, el.dataset.name);
      else alert('Datei nicht gefunden.');
      break;
    }
    case 'filter':
      filter.type = el.dataset.type;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === el));
      renderEntries(carById(currentCarId));
      break;
  }
});

document.addEventListener('change', async (ev) => {
  const input = ev.target.closest('input[data-upload="car-photos"]');
  if (!input?.files.length) return;
  const car = carById(input.dataset.id);
  const files = [...input.files];
  toast(`${plural(files.length, 'Foto wird', 'Fotos werden')} gespeichert …`);
  try {
    const added = await Promise.all(files.map((file) => storeFile(file, CAR_PHOTO_MAX)));
    car.photos = [...(car.photos ?? []), ...added.map((a) => a.id)];
    save();
    route();
    toast(`${plural(added.length, 'Foto', 'Fotos')} hinzugefügt`);
  } catch (err) {
    console.error(err);
    alert('Foto konnte nicht gespeichert werden.');
  }
});

/* ---------- Backup ---------- */

$('#exportBtn').addEventListener('click', async () => {
  toast('Backup wird erstellt …');
  const files = await Promise.all((await fileStore.all()).map(async ({ id, name, type, blob }) =>
    ({ id, name, type, data: await blobToDataUrl(blob) })));
  const backup = { version: 2, settings, cars: db.cars, entries: db.entries, files };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carmaint-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup exportiert');
});

$('#importInput').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.cars) || !Array.isArray(data.entries)) throw new Error('invalid');
    if (!confirm(`Backup mit ${plural(data.cars.length, 'Fahrzeug', 'Fahrzeugen')} importieren? Die aktuellen Daten werden ersetzt.`)) return;
    const records = (data.files ?? []).map((f) => ({ id: f.id, name: f.name, type: f.type, blob: dataUrlToBlob(f.data) }));
    await fileStore.clear();
    await fileStore.putMany(records);
    urlCache.forEach((url) => URL.revokeObjectURL(url));
    urlCache.clear();
    db = { cars: data.cars, entries: data.entries };
    save();
    if (CURRENCIES[data.settings?.currency]) saveSettings({ currency: data.settings.currency });
    location.hash = '#/';
    route();
    toast('Backup importiert');
  } catch (err) {
    console.error(err);
    alert('Ungültige Backup-Datei.');
  } finally {
    ev.target.value = '';
  }
});

/* ---------- Theme & Toast ---------- */

$('#themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = current === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch {}
});

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Start ---------- */

document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
window.addEventListener('hashchange', route);
route();
