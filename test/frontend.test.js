'use strict';

// Rules from CLAUDE.md that can be checked in the source of pb_public/.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'pb_public');
const read = (file) => fs.readFileSync(path.join(PUBLIC, file), 'utf8');

test('no external requests: the only absolute URLs are links to the project', () => {
  // Links the user clicks are fine; anything the page loads must come from the same server.
  const LINKS = 'https://github.com/seals187';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const found = fs.readdirSync(PUBLIC).filter((f) => /\.(js|html|css)$/.test(f)).flatMap((file) =>
    [...read(file).matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => `${file}: ${m[0]}`));
  assert.deepEqual(found.filter((s) => !s.includes(`: ${LINKS}`) && !s.endsWith(SVG_NS)), []);
});

test('questions and errors use the styled ask() and tell(), not the browser alert(), confirm() or prompt()', () => {
  assert.doesNotMatch(read('app.js'), /\b(alert|confirm|prompt)\(/);
});

test('cars, entries, reminders and documents are written only through store.js', () => {
  const app = read('app.js');
  assert.deepEqual([...app.matchAll(/\brec\(\s*'(\w+)'/g)].map((m) => m[1]).filter((c) => c !== 'users'), []);
  assert.doesNotMatch(app, /collections\/(cars|entries|reminders|documents)\b/);
});
