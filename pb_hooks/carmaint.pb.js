/// <reference path="../pb_data/types.d.ts" />

// On startup: apply settings from .env, create the first admin and optionally
// the PocketBase superuser.
//
// Runs in the OnServe hook because migrations (schema) are only applied after
// bootstrap. JSVM has no global onServe(), hence the binding here.
// Note: every handler runs in isolation – helper functions must be defined
// inside the handler or loaded via require().
onBootstrap((be) => {
  be.next();

  be.app.onServe().bindFunc((e) => {
    const cfg = require(`${__hooks}/config.js`);
    const log = e.app.logger();

    // Server settings
    const settings = e.app.settings();
    settings.meta.appName = cfg.appName;
    if (cfg.appUrl) settings.meta.appURL = cfg.appUrl;
    settings.rateLimits.enabled = true; // slows down password guessing, among other things
    settings.trustedProxy.headers = cfg.trustedProxyHeaders;
    // Mail delivery for e-mail reminders (SMTP_*, MAIL_FROM)
    if (cfg.mailEnabled) {
      settings.smtp.enabled = true;
      settings.smtp.host = cfg.smtp.host;
      settings.smtp.port = cfg.smtp.port;
      settings.smtp.username = cfg.smtp.username;
      settings.smtp.password = cfg.smtp.password;
      settings.smtp.tls = cfg.smtp.tls;
      settings.meta.senderAddress = cfg.mailFrom;
      settings.meta.senderName = cfg.mailFromName;
    }
    e.app.save(settings);

    // Upload rules for photos and receipts: max. size per file (MAX_FILE_SIZE_MB)
    // and allowed file types (ALLOWED_FILE_TYPES)
    const { FILE_FIELDS } = require(`${__hooks}/storage.js`);
    for (const [collection, fieldName] of Object.entries(FILE_FIELDS)) {
      try {
        const col = e.app.findCollectionByNameOrId(collection);
        const field = col.fields.getByName(fieldName);
        const maxSize = cfg.maxFileSizeMB * 1024 * 1024;
        const mimeTypes = cfg.fileTypes[fieldName];
        if (field.maxSize !== maxSize || Array.from(field.mimeTypes).join() !== mimeTypes.join()) {
          field.maxSize = maxSize;
          field.mimeTypes = mimeTypes;
          e.app.save(col);
        }
      } catch (err) {
        log.error('CarMaint: could not set the upload rules', 'collection', collection, 'error', String(err));
      }
    }

    // Users created from .env start with the server's default currency
    const createUser = (username, password, role) => {
      const user = new Record(e.app.findCollectionByNameOrId('users'));
      user.set('username', username);
      user.set('role', role);
      user.set('settings', { currency: cfg.defaultCurrency });
      user.setPassword(password);
      user.setVerified(true);
      e.app.save(user);
      log.info(`CarMaint: ${role === 'admin' ? 'admin' : 'demo'} user created`, 'username', username);
    };

    // First user = admin (only if no user exists yet)
    if (cfg.adminUsername && cfg.adminPassword) {
      try {
        if (e.app.countRecords('users') === 0) {
          createUser(cfg.adminUsername, cfg.adminPassword, 'admin');
        } else if (cfg.adminResetPassword) {
          const user = e.app.findFirstRecordByData('users', 'username', cfg.adminUsername);
          user.set('role', 'admin');
          user.setPassword(cfg.adminPassword);
          e.app.save(user);
          log.warn('CarMaint: admin password reset – set ADMIN_RESET_PASSWORD back to false!', 'username', cfg.adminUsername);
        }
      } catch (err) {
        log.error('CarMaint: could not create/update the admin user', 'error', String(err));
      }
    }

    // Demo user (optional) – created on startup if it does not exist yet
    if (cfg.demoUsername && cfg.demoPassword) {
      try {
        e.app.findFirstRecordByData('users', 'username', cfg.demoUsername);
      } catch {
        try {
          createUser(cfg.demoUsername, cfg.demoPassword, 'user');
        } catch (err) {
          log.error('CarMaint: could not create the demo user', 'error', String(err));
        }
      }
    }

    // PocketBase admin UI (/_/) – optional
    if (cfg.superuserEmail && cfg.superuserPassword) {
      try {
        let su;
        try {
          su = e.app.findAuthRecordByEmail('_superusers', cfg.superuserEmail);
        } catch {
          su = new Record(e.app.findCollectionByNameOrId('_superusers'));
          su.setEmail(cfg.superuserEmail);
        }
        su.setPassword(cfg.superuserPassword);
        e.app.save(su);
      } catch (err) {
        log.error('CarMaint: could not create the superuser', 'error', String(err));
      }
    }

    return e.next();
  });
});

// Website files: browsers must ask before reusing them (a cheap 304 thanks to
// Last-Modified), so after an update they never mix an old style.css with a new app.js.
routerUse((e) => {
  const path = e.request.url.path;
  if (!path.startsWith('/api/') && !path.startsWith('/_/')) e.response.header().set('Cache-Control', 'no-cache');
  return e.next();
});

// Public configuration for the website (no secrets!)
routerAdd('GET', '/api/carmaint/config', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  return e.json(200, {
    appName: cfg.appName,
    defaultCurrency: cfg.defaultCurrency,
    defaultLanguage: cfg.defaultLanguage,
    version: cfg.version,
    year: new Date().getFullYear(), // server clock, for the copyright line
    maxFileSizeMB: cfg.maxFileSizeMB,
    storageLimitMB: cfg.storageLimitMB,
    fileTypes: cfg.fileTypes,
    demo: cfg.demoUsername ? { username: cfg.demoUsername, disabled: cfg.demoDisabled } : null,
    notify: { mail: cfg.mailEnabled, apprise: !!cfg.appriseUrl, hour: cfg.notifyHour, timeZone: cfg.timeZone },
  });
});

// Reminder notifications (e-mail / push): checked every hour, each user at their own hour
cronAdd('carmaint-notify', '0 * * * *', () => {
  const cfg = require(`${__hooks}/config.js`);
  require(`${__hooks}/notify.js`).run($app, cfg);
});

// Test message to the given e-mail address and/or push URL of the signed-in user
routerAdd('POST', '/api/carmaint/notify/test', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  const notify = require(`${__hooks}/notify.js`);
  require(`${__hooks}/access.js`).check(cfg, e.auth, 'notify');
  const body = e.requestInfo().body;
  const email = cfg.mailEnabled && notify.isEmail(body.email) ? String(body.email).trim() : '';
  const push = String(body.push || '').trim();
  if (!email && !push) throw new BadRequestError('No valid e-mail address or push URL.');
  try {
    notify.test(e.app, cfg, e.auth, notify.settingsOf(e.auth), email, push);
  } catch (err) {
    e.app.logger().error('CarMaint: test notification failed', 'error', String(err));
    throw new BadRequestError(`Sending failed: ${String(err)}`);
  }
  return e.noContent(204);
}, $apis.requireAuth());

// Preview: when the next notification would be sent with these options, and what it contains
routerAdd('POST', '/api/carmaint/notify/preview', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  const notify = require(`${__hooks}/notify.js`);
  return e.json(200, notify.preview(e.app, cfg, e.auth, notify.settingsOf(e.auth), e.requestInfo().body));
}, $apis.requireAuth());

// Send the notifications now, regardless of hour and weekday (admins only) – for testing
routerAdd('POST', '/api/carmaint/notify/run', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  require(`${__hooks}/access.js`).check(cfg, e.auth, 'admin');
  return e.json(200, { sent: require(`${__hooks}/notify.js`).run(e.app, cfg, true) });
}, $apis.requireAuth());

// Automatic backups (pb_hooks/backup.js): the schedule is checked every minute
cronAdd('carmaint-backup', '* * * * *', () => {
  const backup = require(`${__hooks}/backup.js`);
  const now = Date.now();
  const last = $app.store().get('carmaintBackupCheck');
  $app.store().set('carmaintBackupCheck', now);
  if (!backup.dueBetween(backup.schedule($app), last, now)) return;
  try {
    backup.run($app);
  } catch (err) {
    $app.logger().error('CarMaint: automatic backup failed', 'error', String(err));
  }
});

// Backup routes: admins only, and not for the demo user when "backup" is disabled
// (access.js). Schedule and existing backups for the settings page:
routerAdd('GET', '/api/carmaint/backups', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  const backup = require(`${__hooks}/backup.js`);
  return e.json(200, { schedule: backup.schedule(e.app), intervals: backup.INTERVALS, keepMax: backup.KEEP_MAX, safetyPrefix: backup.SAFETY_PREFIX, backups: backup.list(e.app) });
}, $apis.requireAuth());

routerAdd('PUT', '/api/carmaint/backups/schedule', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  return e.json(200, require(`${__hooks}/backup.js`).saveSchedule(e.app, e.requestInfo().body));
}, $apis.requireAuth());

// Back up now
routerAdd('POST', '/api/carmaint/backups', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  const backup = require(`${__hooks}/backup.js`);
  try {
    return e.json(200, { name: backup.run(e.app) });
  } catch (err) {
    e.app.logger().error('CarMaint: backup failed', 'error', String(err));
    throw new BadRequestError(`Backup failed: ${String(err)}`);
  }
}, $apis.requireAuth());

// Restore: on success the server restarts and the connection simply drops
routerAdd('POST', '/api/carmaint/backups/{name}/restore', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  const backup = require(`${__hooks}/backup.js`);
  const name = backup.existing(e.app, e.request.pathValue('name'));
  try {
    e.app.logger().warn('CarMaint: restoring a backup', 'name', name, 'user', e.auth.getString('username'));
    backup.restore(e.app, name);
  } catch (err) {
    e.app.logger().error('CarMaint: restore failed', 'error', String(err));
    throw new BadRequestError(`Restore failed: ${String(err)}`);
  }
  return e.noContent(204);
}, $apis.requireAuth());

routerAdd('DELETE', '/api/carmaint/backups/{name}', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  const backup = require(`${__hooks}/backup.js`);
  backup.remove(e.app, backup.existing(e.app, e.request.pathValue('name')));
  return e.noContent(204);
}, $apis.requireAuth());

routerAdd('GET', '/api/carmaint/backups/{name}', (e) => {
  require(`${__hooks}/access.js`).check(require(`${__hooks}/config.js`), e.auth, 'backup');
  const backup = require(`${__hooks}/backup.js`);
  backup.serve(e.app, e, backup.existing(e.app, e.request.pathValue('name')));
}, $apis.requireAuth());

// Demo user: block disabled settings on the server, not only in the UI (access.js).
onRecordUpdateRequest((e) => {
  const cfg = require(`${__hooks}/config.js`);
  if (e.auth && e.auth.id === e.record.id) {
    const body = e.requestInfo().body;
    const locked = require(`${__hooks}/access.js`).lockedFields(cfg, e.auth);
    if (locked.some((key) => body[key] !== undefined)) {
      throw new ForbiddenError('Not allowed for the demo user.');
    }
    // PocketBase skips the old-password check for users matching the manage rule
    // (admins), so check it here for everyone changing their own password.
    if (body.password !== undefined) {
      const stored = e.app.findRecordById('users', e.record.id);
      if (!body.oldPassword || !stored.validatePassword(String(body.oldPassword))) {
        throw new BadRequestError('Failed to update record.', {
          oldPassword: new ValidationError('validation_invalid_old_password', 'Missing or invalid old password.'),
        });
      }
    }
  }
  return e.next();
}, 'users');

// Storage limit per user (USER_STORAGE_LIMIT_MB): checked whenever photos, documents or
// receipts are uploaded, including backup imports.
const checkStorageLimit = (e) => {
  const cfg = require(`${__hooks}/config.js`);
  if (cfg.storageLimitMB > 0 && e.auth) {
    const { FILE_FIELDS, usage } = require(`${__hooks}/storage.js`);
    const field = FILE_FIELDS[e.collection.name];
    const incoming = e.record.getUnsavedFiles(field).reduce((sum, file) => sum + file.size, 0);
    if (incoming > 0 && usage(e.app, e.auth.id) + incoming > cfg.storageLimitMB * 1024 * 1024) {
      throw new BadRequestError('Storage limit reached.', {
        [field]: new ValidationError('storage_limit', 'Storage limit reached.'),
      });
    }
  }
  return e.next();
};
onRecordCreateRequest(checkStorageLimit, 'cars', 'entries', 'documents');
onRecordUpdateRequest(checkStorageLimit, 'cars', 'entries', 'documents');

// PDF previews and file sizes of receipts and documents (pb_hooks/previews.js): updated
// right after every save, using a fresh copy of the record.
const syncPreviews = (e) => {
  e.next();
  try {
    const record = e.app.findRecordById(e.record.collection().name, e.record.id);
    require(`${__hooks}/previews.js`).sync(e.app, record);
  } catch (err) {
    e.app.logger().error('CarMaint: PDF previews could not be updated', 'record', e.record.id, 'error', String(err));
  }
};
onRecordAfterCreateSuccess(syncPreviews, 'entries', 'documents');
onRecordAfterUpdateSuccess(syncPreviews, 'entries', 'documents');

// Previews and file info are written by the server only.
const lockPreviews = (e) => {
  const body = e.requestInfo().body;
  if (Object.keys(body).some((key) => key.startsWith('previews') || key === 'fileInfo')) {
    throw new ForbiddenError('Previews are created by the server.');
  }
  return e.next();
};
onRecordCreateRequest(lockPreviews, 'entries', 'documents');
onRecordUpdateRequest(lockPreviews, 'entries', 'documents');

// Catches up on missing previews (existing PDFs after an update)
cronAdd('carmaint-previews', '*/10 * * * *', () => {
  require(`${__hooks}/previews.js`).backfill($app);
});

// Storage used by the signed-in user (settings page)
routerAdd('GET', '/api/carmaint/usage', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  const { usage } = require(`${__hooks}/storage.js`);
  return e.json(200, { used: usage(e.app, e.auth.id), limit: cfg.storageLimitMB * 1024 * 1024 });
}, $apis.requireAuth());

// Storage used by every user (admins only, user list in the settings).
// Only totals are returned, no information about the files themselves.
routerAdd('GET', '/api/carmaint/usage/users', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  require(`${__hooks}/access.js`).check(cfg, e.auth, 'admin');
  const { usage } = require(`${__hooks}/storage.js`);
  const users = {};
  for (const user of e.app.findAllRecords('users')) users[user.id] = usage(e.app, user.id);
  return e.json(200, { users, limit: cfg.storageLimitMB * 1024 * 1024 });
}, $apis.requireAuth());
