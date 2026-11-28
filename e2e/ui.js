// Browser walk-through for e2e/compare.sh: seeds data, visits every view, opens dialogs, saves
// forms and prints what the page shows, plus page and console errors. Screenshots go to OUT/shots.
// Dates are relative to today, so compare two builds on the same day, not against old output.
const puppeteer = require('puppeteer');
const fs = require('fs');
const BASE = process.env.BASE;
const OUT = process.env.OUT ?? '/out';
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const errors = [];
const log = (...a) => console.log(...a);
// A one-page PDF for the attachment uploads
const pdf = '/tmp/sample.pdf';
const PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n');

async function api(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { ...(token && { Authorization: token }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const rec = (c, id = '') => `/api/collections/${c}/records${id ? `/${id}` : ''}`;

(async () => {
  fs.mkdirSync(`${OUT}/shots`, { recursive: true });
  fs.writeFileSync(pdf, PDF);
  const auth = await api('', 'POST', '/api/collections/users/auth-with-password', { identity: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  const T = auth.token;
  // Fresh data
  for (const c of (await api(T, 'GET', `${rec('cars')}?perPage=200`)).items) await api(T, 'DELETE', rec('cars', c.id));
  const car = await api(T, 'POST', rec('cars'), { owner: auth.record.id, make: 'Skoda', model: 'Octavia', mileage: 19000, plate: 'ZH 1', info: { nextInspection: iso(3), purchasePrice: 20000, purchaseDate: '2024-03-01' } });
  const car2 = await api(T, 'POST', rec('cars'), { owner: auth.record.id, make: 'Toyota', model: 'Yaris', mileage: 52000 });
  const year = iso(0).slice(0, 4);
  for (const [d, km, type, cost, c] of [[-400, 4000, 'service', 300, car], [-90, 10000, 'service', 250, car], [-60, 12000, 'fuel', 80, car], [-30, 15000, 'repair', 900, car], [-10, 18000, 'fuel', 70, car], [-20, 50000, 'tires', 600, car2], [-200, 45000, 'fuel', 60, car2]]) {
    await api(T, 'POST', rec('entries'), { car: c.id, type, date: iso(d), mileage: km, title: `${type} ${d}`, cost });
  }
  // Refuels with litres for the Yaris, every 3 weeks at about 6.5 l/100 km: one partial refuel, one forgotten
  // before #5 (implausible), the last without a mileage (no consumption)
  for (let i = 0; i < 8; i++) {
    const partial = i === 3;
    const litres = partial ? 20 : Math.round((44 + (i % 3) * 1.5) * 100) / 100;
    const mileage = i === 7 ? 0 : 45600 + i * 700 + (i >= 5 ? 700 : 0);
    await api(T, 'POST', rec('entries'), { car: car2.id, type: 'fuel', date: iso(-180 + i * 22), mileage, title: 'Refuel', cost: Math.round(litres * 185) / 100, litres, partial });
  }
  // An entry without a cost still counts for the km driven (cost analysis = car page, since 0.4.1)
  await api(T, 'POST', rec('entries'), { car: car.id, type: 'inspection', date: iso(-500), mileage: 3000, title: 'MFK free' });
  // Fixed costs (since 0.4): the yearly insurance, not marked as an outlier month
  await api(T, 'POST', rec('entries'), { car: car.id, type: 'fixed', date: iso(-45), title: 'Insurance', cost: 1100 })
    .catch((err) => log('fixed cost seed failed:', err.message.slice(0, 60)));
  await api(T, 'POST', rec('reminders'), { car: car.id, title: 'Oil', type: 'service', intervalKm: 15000, dueKm: 19500, dueDate: iso(200) });
  await api(T, 'POST', rec('reminders'), { car: car.id, title: 'Tyres', type: 'tires', intervalMonths: 6, dueDate: iso(-2) });
  await api(T, 'POST', rec('reminders'), { car: car2.id, title: 'Oil', type: 'service', intervalMonths: 12, dueDate: iso(9) });

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Cross-Origin-Opener-Policy')) errors.push(`console: ${m.text()}`); });
  page.on('dialog', (d) => { log('dialog:', d.message()); d.accept(); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate((a) => localStorage.setItem('carmaint:auth', JSON.stringify(a)), { token: T, record: auth.record });
  await page.reload({ waitUntil: 'networkidle0' });
  const shot = async (name) => { await new Promise((r) => setTimeout(r, 400)); await page.screenshot({ path: `${OUT}/shots/${name}.png`, fullPage: true }); };
  // Figures cut off with "…" (content wider than its box) – values must always show in full
  const FIGURES = '.tile strong, .stats dd, .phone-stats strong, .fuel-figures strong, .entry-cost, .entry-km, .hero';
  const clipped = () => page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((el) => el.offsetParent && el.scrollWidth > el.clientWidth + 1).map((el) => el.innerText.replace(/\s+/g, ' ').trim()), FIGURES);
  const go = async (hash, name) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await shot(name);
    const cut = await clipped();
    if (cut.length) log(`CLIPPED on ${name}:`, cut.join(' | '));
  };
  const text = (sel) => page.$eval(sel, (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => '(missing)');

  await go('#/', 'home');
  log('home due:', await text('#due'));
  log('home hero:', await text('.hero'));
  await go(`#/car/${car.id}`, 'car');
  log('car tiles:', await text('.tiles'));
  log('year labels:', await page.evaluate(() => [...document.querySelectorAll('#entries .year-sep')].map((y) => `${y.textContent} before ${y.nextElementSibling?.querySelector('time')?.textContent}`).join(', ') || 'none'));
  log('car reminders:', await text('.rem-panel'));
  await go(`#/costs/${car.id}`, 'costs-car');
  log('costs car tiles:', await text('.costs-tiles'));
  log('costs car mix:', await text('.costs-mix'));
  await page.evaluate(() => document.querySelector('[name="costMode"][value="total"]')?.click());
  await new Promise((r) => setTimeout(r, 300));
  log('costs car outliers:', await page.evaluate(() => [...document.querySelectorAll('.ccol.hi')].map((c) => c.getAttribute('aria-label')).join(' | ') || 'none'));
  await page.evaluate(() => document.querySelector('[name="costMode"][value="type"]')?.click());
  await go('#/costs', 'costs-all');
  log('costs all tiles:', await text('.costs-tiles'));
  await page.evaluate(() => { document.querySelector('[name="costYear"][value="all"]')?.click(); });
  await shot('costs-all-years');
  log('costs all-years tiles:', await text('.costs-tiles'));
  await go('#/settings/notify', 'settings-notify');
  await new Promise((r) => setTimeout(r, 800));
  log('notify preview:', await text('#notifyPreview'));
  await page.type('#notifyForm [name="pushUrl"]', 'ntfy://ntfy.sh/test');
  await page.click('#notifyForm [name="pushEnabled"]');
  await page.evaluate(() => document.querySelector('#notifyForm [name="before"][value="30"]').click());
  await new Promise((r) => setTimeout(r, 1500));
  log('notify preview on:', (await text('#notifyPreview')).replace(/^Next notification: \S+ \S+ /, ''));
  log('notify segments:', await page.evaluate(() => [...document.querySelectorAll('#notifyForm .segmented input:checked')].map((i) => `${i.name}=${i.value}`).join(' ')));
  await go('#/settings/display', 'settings-display');

  // Refuels: consumption, a run folded into one line, the refuel filter, the fuel section of the costs
  await go(`#/car/${car2.id}`, 'fuel-car');
  log('fuel tiles:', await text('.tiles'));
  log('fuel history:', await text('#entries'));
  await page.evaluate(() => document.querySelector('[data-action="toggle-fuel-group"]').click());
  await shot('fuel-group-open');
  log('fuel group open:', await page.evaluate(() => document.querySelectorAll('#entries .entry.in-group').length), 'rows |', await text('#entries .in-group .entry-fuel'));
  await page.evaluate(() => document.querySelector('[data-action="filter"][data-type="fuel"]').click());
  log('fuel filter rows:', await page.evaluate(() => document.querySelectorAll('#entries .entry').length));
  await page.evaluate(() => document.querySelector('[data-action="filter"][data-type="all"]').click());
  await go(`#/costs/${car2.id}`, 'fuel-costs');
  log('fuel card:', await text('.fuel-card'));
  // Settings: km/l and cost per km with fuel, then back to the defaults
  await go('#/settings/display', 'settings-display-fuel');
  await page.evaluate(() => document.querySelector('[name="consumption"][value="kml"]').click());
  await page.evaluate(() => document.querySelector('[name="perKm"][value="withFuel"]').click());
  await new Promise((r) => setTimeout(r, 800));
  await go(`#/car/${car2.id}`, 'fuel-car-kml');
  log('fuel tiles km/l, with fuel:', await text('.tiles'));
  await go('#/settings/display', 'settings-display-reset');
  await page.evaluate(() => document.querySelector('[name="consumption"][value="l100"]').click());
  await page.evaluate(() => document.querySelector('[name="perKm"][value="noFuel"]').click());
  await new Promise((r) => setTimeout(r, 800));
  // Entry dialog: choosing "Refuel" names the entry and shows litres and "full tank"
  await go(`#/car/${car2.id}`, 'fuel-dialog');
  await page.evaluate((id) => document.querySelector(`[data-action="add-entry"][data-id="${id}"]`).click(), car2.id);
  await page.evaluate(() => document.querySelector('#typePills [value="fuel"]').click());
  log('templates:', await text('#tplChips'));
  log('refuel dialog:', await page.evaluate(() => `title=${document.querySelector('#entryForm [name="title"]').value} fuelRow=${!document.querySelector('#fuelRow').hidden} full=${document.querySelector('#entryForm [name="full"]').checked}`));
  await page.evaluate(() => document.querySelector('#entryDialog [data-close]').click());

  // Dialogs: add reminder, complete a reminder (entry dialog), add document with reminder
  await go(`#/car/${car.id}`, 'car2');
  await page.evaluate((id) => document.querySelector(`[data-action="add-reminder"][data-id="${id}"]`).click(), car.id);
  await page.type('#reminderForm [name="title"]', 'Wipers');
  await page.type('#reminderForm [name="intervalMonths"]', '12');
  await page.click('#reminderForm [type="submit"]');
  await new Promise((r) => setTimeout(r, 800));
  log('after reminder add:', await text('.rem-panel'));

  await page.evaluate(() => document.querySelector('.rem-panel [data-action="reminder-done"]').click());
  await new Promise((r) => setTimeout(r, 300));
  log('entry dialog title:', await text('#entryDialogTitle'), '| remind due:', await text('#remindDue'));
  await page.click('#entryForm [type="submit"]:not(#saveNext)');
  await new Promise((r) => setTimeout(r, 1200));
  log('after done:', await text('.rem-panel'));

  await page.evaluate((id) => document.querySelector(`[data-action="add-document"][data-id="${id}"]`).click(), car.id);
  await page.$eval('#docForm [name="validUntil"]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, iso(20));
  await (await page.$('#docInput')).uploadFile(pdf);
  await page.click('#docForm [type="submit"]');
  await new Promise((r) => setTimeout(r, 2500));
  log('after doc:', await text('.rem-panel'), '| docs:', await text('.doc-list'));
  await shot('car-after');

  // Edit document: remove its file, then delete it (cascade reminder)
  await page.evaluate(() => document.querySelector('[data-action="edit-document"]').click());
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => document.querySelector('#docFiles [data-remove]')?.click());
  await page.click('#docForm [type="submit"]');
  await new Promise((r) => setTimeout(r, 1500));
  log('doc after file removed:', await text('.doc-list'));
  await page.evaluate(() => document.querySelector('[data-action="edit-document"]').click());
  await new Promise((r) => setTimeout(r, 300));
  await page.click('#docDelete');
  await new Promise((r) => setTimeout(r, 1500));
  log('after doc delete:', await text('.rem-panel'), '| docs:', await text('.doc-list'));

  // Complete the MFK from the vehicle data (moves 24 months forward)
  await page.evaluate((id) => document.querySelector(`[data-action="reminder-done"][data-id="mfk:${id}"]`).click(), car.id);
  await new Promise((r) => setTimeout(r, 300));
  log('mfk remind due:', await text('#remindDue'));
  await page.click('#entryForm [type="submit"]:not(#saveNext)');
  await new Promise((r) => setTimeout(r, 1500));
  log('after mfk done:', await text('.rem-panel'), '| info:', await text('#infobox'));

  // Entry with attachment, then delete
  await page.evaluate((id) => document.querySelector(`[data-action="add-entry"][data-id="${id}"]`).click(), car.id);
  await page.type('#entryForm [name="title"]', 'Brake pads');
  await page.type('#entryForm [name="cost"]', '400');
  await (await page.$('#attInput')).uploadFile(pdf);
  await page.click('#entryForm [type="submit"]:not(#saveNext)');
  await new Promise((r) => setTimeout(r, 2500));
  log('history:', (await text('#entries')).slice(0, 200));

  // Phone
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await go(`#/car/${car.id}`, 'phone-car');
  log('phone reminders:', await text('.rem-panel'));
  await go(`#/car/${car2.id}`, 'phone-fuel');
  log('phone fuel history:', await text('#entries'));
  await go('#/', 'phone-home');

  // Delete car (cascade)
  await page.setViewport({ width: 1280, height: 900 });
  await go(`#/car/${car2.id}`, 'car-del');
  await page.evaluate((id) => document.querySelector(`[data-action="delete-car"][data-id="${id}"]`).click(), car2.id);
  await new Promise((r) => setTimeout(r, 1500));
  log('after car delete home:', await text('#due'));

  // Photos: upload two, make the second the cover, delete one
  await go(`#/car/${car.id}`, 'car-photos');
  for (const color of ['#c33', '#33c']) {
    await page.evaluate(async (c) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 48;
      const g = canvas.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 64, 48);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], `photo${c.slice(1)}.jpg`, { type: 'image/jpeg' }));
      const input = document.querySelector('input[data-upload="car-photos"]');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, color);
    await new Promise((r) => setTimeout(r, 2000));
  }
  const photoCount = () => page.evaluate(() => document.querySelectorAll('.photo-grid .thumb:not(.add)').length);
  log('photos:', await photoCount());
  await page.evaluate(() => document.querySelector('[data-action="cover-photo"]').click());
  await new Promise((r) => setTimeout(r, 1000));
  log('cover is 2nd:', await page.evaluate(() => document.querySelector('.photo-grid .thumb [data-action="delete-photo"]').dataset.photo.startsWith('photo33c')));
  await page.evaluate(() => document.querySelector('[data-action="delete-photo"]').click());
  await new Promise((r) => setTimeout(r, 1000));
  log('photos after delete:', await photoCount());
  await shot('car-photos-after');

  // Import a backup (replaces all cars)
  await page.evaluate(() => importBackup({
    version: 2, cars: [{ id: 'x', make: 'Imp', model: 'Ort', mileage: 1000, photos: [] }],
    entries: [{ carId: 'x', type: 'service', date: '2026-01-01', title: 'Imp entry', cost: 10, mileage: 500 }],
    reminders: [{ carId: 'x', title: 'Imp rem', type: 'service', intervalMonths: 12, dueDate: '2026-12-01' }],
    documents: [{ carId: 'x', kind: 'insurance', title: 'Ins', validUntil: '2026-12-20', remind: true }],
  }));
  await new Promise((r) => setTimeout(r, 1500));
  await shot('after-import');
  log('after import home:', await text('#due'), '| cards:', await text('.grid'));

  await browser.close();
  log('ERRORS:', errors.length ? `\n${errors.join('\n')}` : 'none');
})().catch((e) => { console.error('FAILED', e); console.log('ERRORS so far:', errors); process.exit(1); });
