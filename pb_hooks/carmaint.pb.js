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
    e.app.save(settings);

    // First user = admin (only if no user exists yet)
    if (cfg.adminUsername && cfg.adminPassword) {
      try {
        if (e.app.countRecords('users') === 0) {
          const user = new Record(e.app.findCollectionByNameOrId('users'));
          user.set('username', cfg.adminUsername);
          user.set('role', 'admin');
          user.set('settings', { currency: cfg.defaultCurrency });
          user.setPassword(cfg.adminPassword);
          user.setVerified(true);
          e.app.save(user);
          log.info('CarMaint: admin user created', 'username', cfg.adminUsername);
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
          const user = new Record(e.app.findCollectionByNameOrId('users'));
          user.set('username', cfg.demoUsername);
          user.set('role', 'user');
          user.set('settings', { currency: cfg.defaultCurrency });
          user.setPassword(cfg.demoPassword);
          user.setVerified(true);
          e.app.save(user);
          log.info('CarMaint: demo user created', 'username', cfg.demoUsername);
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

// Public configuration for the website (no secrets!)
routerAdd('GET', '/api/carmaint/config', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  return e.json(200, {
    appName: cfg.appName,
    defaultCurrency: cfg.defaultCurrency,
    defaultLanguage: cfg.defaultLanguage,
    version: cfg.version,
    demo: cfg.demoUsername ? { username: cfg.demoUsername, disabled: cfg.demoDisabled } : null,
  });
});

// Demo user: block disabled settings on the server, not only in the UI.
// The username is locked too, otherwise renaming would lift the restrictions.
onRecordUpdateRequest((e) => {
  const cfg = require(`${__hooks}/config.js`);
  const auth = e.auth;
  if (cfg.demoUsername && auth && auth.id === e.record.id && auth.getString('username') === cfg.demoUsername) {
    const body = e.requestInfo().body;
    const blocked = ['username', ...(cfg.demoDisabled.includes('password') ? ['password', 'oldPassword', 'passwordConfirm'] : [])];
    if (blocked.some((key) => body[key] !== undefined)) {
      throw new ForbiddenError('Not allowed for the demo user.');
    }
  }
  return e.next();
}, 'users');
