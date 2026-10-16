/// <reference path="../pb_data/types.d.ts" />

// Beim Start: Einstellungen aus der .env übernehmen, ersten Admin und optional
// den PocketBase-Superuser anlegen.
//
// Läuft im OnServe-Hook, weil die Migrationen (Schema) erst nach dem Bootstrap
// angewendet werden. JSVM kennt kein globales onServe(), daher die Bindung hier.
// Hinweis: Jeder Handler läuft isoliert – Hilfsfunktionen müssen innerhalb
// stehen oder per require() geladen werden.
onBootstrap((be) => {
  be.next();

  be.app.onServe().bindFunc((e) => {
    const cfg = require(`${__hooks}/config.js`);
    const log = e.app.logger();

    // Server-Einstellungen
    const settings = e.app.settings();
    settings.meta.appName = cfg.appName;
    if (cfg.appUrl) settings.meta.appURL = cfg.appUrl;
    settings.rateLimits.enabled = true; // bremst u. a. Passwort-Rateversuche
    settings.trustedProxy.headers = cfg.trustedProxyHeaders;
    e.app.save(settings);

    // Erster Benutzer = Admin (nur wenn noch niemand existiert)
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
          log.info('CarMaint: Admin-Benutzer angelegt', 'username', cfg.adminUsername);
        } else if (cfg.adminResetPassword) {
          const user = e.app.findFirstRecordByData('users', 'username', cfg.adminUsername);
          user.set('role', 'admin');
          user.setPassword(cfg.adminPassword);
          e.app.save(user);
          log.warn('CarMaint: Admin-Passwort zurückgesetzt – ADMIN_RESET_PASSWORD wieder auf false stellen!', 'username', cfg.adminUsername);
        }
      } catch (err) {
        log.error('CarMaint: Admin-Benutzer konnte nicht angelegt/aktualisiert werden', 'error', String(err));
      }
    }

    // PocketBase-Verwaltung (/_/) – optional
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
        log.error('CarMaint: Superuser konnte nicht angelegt werden', 'error', String(err));
      }
    }

    return e.next();
  });
});

// Öffentliche Konfiguration für die Website (keine Geheimnisse!)
routerAdd('GET', '/api/carmaint/config', (e) => {
  const cfg = require(`${__hooks}/config.js`);
  return e.json(200, { appName: cfg.appName, defaultCurrency: cfg.defaultCurrency });
});
