'use strict';

// UI texts (CLAUDE.md): every key in all languages, every used key defined, no dead keys.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUBLIC = path.join(__dirname, '..', 'pb_public');
const read = (file) => fs.readFileSync(path.join(PUBLIC, file), 'utf8');

// i18n.js is browser-only: run it in a sandbox with core.js as the CarMaint global
const sandbox = { CarMaint: require('../pb_public/core.js') };
vm.runInNewContext(`${read('i18n.js')}\nthis.I18N = I18N;`, sandbox);
const I18N = sandbox.I18N;

const keys = new Set(Object.values(I18N).flatMap(Object.keys));
// Code that uses keys: the app, the markup, and the helpers after the table in i18n.js
const code = [read('app.js'), read('index.html'), read('i18n.js').split('\nlet lang')[1]].join('\n');

test('every language has every key', () => {
  for (const [lang, table] of Object.entries(I18N)) {
    assert.deepEqual([...keys].filter((key) => !(key in table)), [], `missing in ${lang}`);
  }
});

test('every key used by t(), tn() or data-i18n* is defined', () => {
  const used = [
    ...[...code.matchAll(/\btn?\(\s*'([^'$]+)'/g)].map((m) => m[1]),
    ...[...code.matchAll(/data-i18n[a-z-]*="([^"$]+)"/g)].map((m) => m[1]),
  ];
  assert.deepEqual([...new Set(used)].filter((key) => !keys.has(key)), []);
});

test('every key is used somewhere', () => {
  // Keys built at runtime, e.g. t(`type.${entry.type}`), count as used by their prefix
  const prefixes = [...code.matchAll(/[`'"]([a-zA-Z][\w-]*\.(?:[\w-]+\.)*)(?:\$\{|['"]\s*\+)/g)].map((m) => m[1]);
  const quoted = new Set([...code.matchAll(/['"`]([a-zA-Z][\w-]*\.[\w.-]+)['"`]/g)].map((m) => m[1]));
  const unused = [...keys].filter((key) => !quoted.has(key) && !prefixes.some((p) => key.startsWith(p)));
  assert.deepEqual(unused, []);
});
