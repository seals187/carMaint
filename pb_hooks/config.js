/// <reference path="../pb_data/types.d.ts" />

// Reads the configuration from environment variables (.env or docker-compose env_file).
// Loaded via require() from the hooks, since every hook handler runs in isolation.

const env = (key, fallback = '') => {
  const value = ($os.getenv(key) || '').trim();
  return value === '' ? fallback : value;
};

const CURRENCIES = ['EUR', 'CHF', 'USD'];
const currency = env('DEFAULT_CURRENCY', 'EUR').toUpperCase();
const LANGUAGES = ['de', 'en', 'es', 'fr'];
const language = env('DEFAULT_LANGUAGE', 'en').toLowerCase();
const int = (key, fallback) => {
  const n = parseInt(env(key, String(fallback)), 10);
  return Number.isFinite(n) ? n : fallback;
};
// File types that can be allowed for uploads (ALLOWED_FILE_TYPES)
const FILE_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const fileTypes = [...new Set(env('ALLOWED_FILE_TYPES', 'pdf,jpg').toLowerCase().split(',')
  .map((ext) => FILE_TYPES[ext.trim().replace(/^\./, '')]).filter(Boolean))];
const allowedFileTypes = fileTypes.length ? fileTypes : [FILE_TYPES.pdf, FILE_TYPES.jpg];
const imageTypes = allowedFileTypes.filter((type) => type.startsWith('image/'));

// Settings that can be disabled for the demo user
const DEMO_OPTIONS = ['language', 'currency', 'infobox', 'export', 'import', 'password', 'notify'];

// E-mail reminders: only active when an SMTP server and a sender are set
const smtpHost = env('SMTP_HOST');
const mailFrom = env('MAIL_FROM');

module.exports = {
  appName: env('APP_NAME', 'CarMaint'),
  version: env('APP_VERSION', 'dev'), // set in the Docker image
  appUrl: env('APP_URL').replace(/\/+$/, ''),
  defaultCurrency: CURRENCIES.includes(currency) ? currency : 'EUR',
  defaultLanguage: LANGUAGES.includes(language) ? language : 'en',

  // Uploads: max. size per file (1–30 MB, requests are limited to 32 MB) and
  // storage per user for photos and receipts (0 = unlimited)
  maxFileSizeMB: Math.min(30, Math.max(1, int('MAX_FILE_SIZE_MB', 20))),
  storageLimitMB: Math.max(0, int('USER_STORAGE_LIMIT_MB', 0)),
  // MIME types for receipts; car photos only take the image types (JPG if none is allowed)
  fileTypes: {
    attachments: allowedFileTypes,
    photos: imageTypes.length ? imageTypes : [FILE_TYPES.jpg],
  },

  adminUsername: env('ADMIN_USERNAME'),
  adminPassword: env('ADMIN_PASSWORD'),
  adminResetPassword: env('ADMIN_RESET_PASSWORD', 'false').toLowerCase() === 'true',

  superuserEmail: env('PB_SUPERUSER_EMAIL'),
  superuserPassword: env('PB_SUPERUSER_PASSWORD'),

  smtp: {
    host: smtpHost,
    port: int('SMTP_PORT', 587),
    username: env('SMTP_USERNAME'),
    password: env('SMTP_PASSWORD'),
    // true = implicit TLS (usually port 465); with false, STARTTLS is used when offered (587)
    tls: env('SMTP_TLS', 'false').toLowerCase() === 'true',
  },
  mailFrom,
  mailFromName: env('MAIL_FROM_NAME', env('APP_NAME', 'CarMaint')),
  mailEnabled: !!(smtpHost && mailFrom),
  // Default hour of the reminder notification (server time zone TZ); every user can change it
  notifyHour: Math.min(23, Math.max(0, int('NOTIFY_HOUR', 7))),
  timeZone: env('TZ', 'UTC'),
  // Optional Apprise API server (e.g. http://apprise:8000) for push services
  // such as Telegram or Pushover; ntfy works without it
  appriseUrl: env('APPRISE_URL').replace(/\/+$/, ''),

  trustedProxyHeaders: env('TRUSTED_PROXY_HEADERS').split(',').map((h) => h.trim()).filter(Boolean),

  demoUsername: env('DEMO_USERNAME'),
  demoPassword: env('DEMO_PASSWORD'),
  demoDisabled: env('DEMO_DISABLED', 'password').toLowerCase().split(',').map((o) => o.trim()).filter((o) => DEMO_OPTIONS.includes(o)),
};
