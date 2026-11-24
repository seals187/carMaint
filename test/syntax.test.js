'use strict';

// Syntax of every script. `node --check a.js b.js` only checks a.js, hence one call per file.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const DIRS = ['pb_public', 'pb_hooks', 'pb_migrations', 'test', 'e2e'];

for (const dir of DIRS) {
  if (!fs.existsSync(path.join(ROOT, dir))) continue;
  for (const file of fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.m?js$/.test(f))) {
    test(`syntax: ${dir}/${file}`, () => {
      const run = spawnSync(process.execPath, ['--check', path.join(ROOT, dir, file)], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
    });
  }
}
