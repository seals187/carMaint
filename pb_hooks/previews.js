/// <reference path="../pb_data/types.d.ts" />

// Previews of PDF receipts and documents: the first pages are rendered as JPG with
// poppler (pdfinfo/pdftoppm, part of the Docker image), so every browser shows them
// like photos. "fileInfo" keeps the size of every attachment and, for PDFs, the page
// count and the preview files: { "invoice_x7k2.pdf": { size, pages, previews: [...] } }.
// Without poppler (e.g. dev.ps1 on Windows) only the sizes are stored.
// Loaded via require() from the hooks.

const COLLECTIONS = ['entries', 'documents'];
const MAX_PAGES = 5;
const PAGE_SIZE = 1600; // px on the longer side – sharp enough to zoom in
const MAX_READ = 64 * 1024 * 1024;

const isPdf = (name) => /\.pdf$/i.test(name);
const parse = (raw) => { try { return JSON.parse(raw || '{}') || {}; } catch { return {}; } };

// Runs a poppler command; on Linux with a time limit against broken files.
function run(...args) {
  const cmd = $os.getenv('OS') === 'Windows_NT' ? $os.cmd(...args) : $os.cmd('timeout', '60', ...args);
  return toString(cmd.output());
}

// Lazily checks once whether poppler is installed.
function popplerCheck() {
  let available = null;
  return () => {
    if (available === null) {
      try {
        $os.cmd('pdfinfo', '-v').combinedOutput();
        available = true;
      } catch (err) {
        available = !/not found/i.test(String(err)); // "-v" may exit with an error code
      }
    }
    return available;
  };
}

// What has to be done for a record: drop the info of removed files, add new files.
function plan(record, poppler) {
  const names = record.getStringSlice('attachments');
  const info = parse(record.getString('fileInfo'));
  const keep = {};
  const drop = [];
  for (const [name, value] of Object.entries(info)) {
    if (names.includes(name)) keep[name] = value;
    else drop.push(...(value?.previews ?? []));
  }
  const todo = names.filter((name) => !keep[name] || (isPdf(name) && keep[name].pages === undefined && poppler()));
  return { info, keep, drop, todo };
}

// Renders the first pages of a PDF into dir; returns the page count and the JPG paths.
function render(src, dir) {
  const pages = parseInt(run('pdfinfo', src).match(/^Pages:\s+(\d+)/m)?.[1], 10) || 0;
  if (!pages) return { pages: 0, files: [] };
  run('pdftoppm', '-jpeg', '-jpegopt', 'quality=80', '-scale-to', String(PAGE_SIZE),
    '-f', '1', '-l', String(MAX_PAGES), src, `${dir}/page`);
  const page = (name) => parseInt(name.match(/-(\d+)\.jpg$/)?.[1], 10);
  const files = $os.readDir(dir).map((entry) => entry.name())
    .filter((name) => page(name) > 0)
    .sort((a, b) => page(a) - page(b))
    .map((name) => `${dir}/${name}`);
  return { pages, files };
}

// Brings fileInfo and the previews of a record up to date. Saves the record only
// if something changed, so the save does not trigger itself again.
function sync(app, record, poppler = popplerCheck()) {
  const { info, keep, drop, todo } = plan(record, poppler);
  const add = [];
  const fs = app.newFilesystem();
  const tmp = `${$os.tempDir()}/carmaint-${$security.randomString(12)}`;
  let tmpUsed = false;
  try {
    todo.forEach((name, i) => {
      const key = `${record.baseFilesPath()}/${name}`;
      let size;
      try {
        size = fs.attributes(key).size;
      } catch {
        return; // missing file – nothing to describe
      }
      keep[name] = { size };
      if (!isPdf(name) || !poppler()) return;
      try {
        const dir = `${tmp}/${i}`;
        $os.mkdirAll(dir, 0o700);
        tmpUsed = true;
        const src = `${dir}/file.pdf`;
        const reader = fs.getReader(key);
        try {
          $os.writeFile(src, toBytes(reader, MAX_READ), 0o600);
        } finally {
          reader.close();
        }
        const { pages, files } = render(src, dir);
        const previews = files.map((path) => $filesystem.fileFromPath(path));
        add.push(...previews);
        keep[name] = { size, pages, previews: previews.map((file) => file.name) };
      } catch (err) {
        // Broken or encrypted PDF: remember it, so it is not tried again
        app.logger().warn('CarMaint: PDF preview failed', 'record', record.id, 'file', name, 'error', String(err));
        keep[name] = { size, pages: 0, previews: [] };
      }
    });
    if (!add.length && !drop.length && JSON.stringify(keep) === JSON.stringify(info)) return false;
    record.set('fileInfo', keep);
    if (drop.length) record.set('previews-', drop);
    if (add.length) record.set('previews+', add);
    app.save(record);
    return true;
  } finally {
    fs.close();
    if (tmpUsed) $os.removeAll(tmp);
  }
}

// Catches up on records without previews (existing files, poppler installed later).
// Limited per run so a large library is processed over several runs.
function backfill(app, limit = 25) {
  const poppler = popplerCheck();
  let done = 0;
  for (const collection of COLLECTIONS) {
    for (const record of app.findRecordsByFilter(collection, 'attachments:length > 0', '', 0, 0)) {
      if (done >= limit) return done;
      const { drop, todo } = plan(record, poppler);
      if (!drop.length && !todo.length) continue;
      try {
        if (sync(app, record, poppler)) done++;
      } catch (err) {
        app.logger().error('CarMaint: PDF previews could not be updated', 'record', record.id, 'error', String(err));
      }
    }
  }
  return done;
}

module.exports = { COLLECTIONS, sync, backfill };
