'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.ForbiddenError = class ForbiddenError extends Error {}; // provided by PocketBase
const access = require('../pb_hooks/access.js');

const user = (username, role = 'user') => ({ getString: (key) => ({ username, role })[key] });
const cfg = { demoUsername: 'demo', demoDisabled: ['backup', 'password'] };
const admin = user('admin', 'admin');
const demo = user('demo');
const demoAdmin = user('demo', 'admin');
const someone = user('anna');

test('admin and backup are for admins; backup not for a restricted demo admin', () => {
  assert.equal(access.can(cfg, admin, 'admin'), true);
  assert.equal(access.can(cfg, someone, 'admin'), false);
  assert.equal(access.can(cfg, admin, 'backup'), true);
  assert.equal(access.can(cfg, demoAdmin, 'backup'), false);
  assert.equal(access.can(cfg, demoAdmin, 'admin'), true);
  assert.equal(access.can(cfg, null, 'notify'), false);
});

test('demo restrictions only apply when disabled', () => {
  assert.equal(access.can(cfg, demo, 'notify'), true);
  assert.equal(access.can({ ...cfg, demoDisabled: ['notify'] }, demo, 'notify'), false);
  assert.equal(access.can({ ...cfg, demoUsername: '' }, demoAdmin, 'backup'), true);
});

test('check throws 403', () => {
  assert.throws(() => access.check(cfg, someone, 'backup'), ForbiddenError);
  assert.doesNotThrow(() => access.check(cfg, admin, 'backup'));
});

test('lockedFields: the demo keeps its name and, if disabled, its password', () => {
  assert.deepEqual(access.lockedFields(cfg, someone), []);
  assert.deepEqual(access.lockedFields(cfg, demo), ['username', 'password', 'oldPassword', 'passwordConfirm']);
  assert.deepEqual(access.lockedFields({ ...cfg, demoDisabled: [] }, demo), ['username']);
});
