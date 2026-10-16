/// <reference path="../pb_data/types.d.ts" />

// Liest die Konfiguration aus Umgebungsvariablen (.env bzw. docker-compose env_file).
// Wird per require() aus den Hooks geladen, da jeder Hook-Handler isoliert läuft.

const env = (key, fallback = '') => {
  const value = ($os.getenv(key) || '').trim();
  return value === '' ? fallback : value;
};

const CURRENCIES = ['EUR', 'CHF', 'USD'];
const currency = env('DEFAULT_CURRENCY', 'EUR').toUpperCase();

module.exports = {
  appName: env('APP_NAME', 'CarMaint'),
  appUrl: env('APP_URL').replace(/\/+$/, ''),
  defaultCurrency: CURRENCIES.includes(currency) ? currency : 'EUR',

  adminUsername: env('ADMIN_USERNAME'),
  adminPassword: env('ADMIN_PASSWORD'),
  adminResetPassword: env('ADMIN_RESET_PASSWORD', 'false').toLowerCase() === 'true',

  superuserEmail: env('PB_SUPERUSER_EMAIL'),
  superuserPassword: env('PB_SUPERUSER_PASSWORD'),

  trustedProxyHeaders: env('TRUSTED_PROXY_HEADERS').split(',').map((h) => h.trim()).filter(Boolean),
};
