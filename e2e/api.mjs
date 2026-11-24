// Status codes of the guarded routes for the admin and the demo user, for e2e/compare.sh.
// Expects DEMO_DISABLED=password,backup,notify. Logins are rate-limited, hence the pauses.
const B = process.env.BASE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(identity, password) {
  await sleep(1600);
  const r = await fetch(`${B}/api/collections/users/auth-with-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity, password }) });
  return r.json();
}
const call = async (auth, method, path, body) => {
  const r = await fetch(B + path, { method, headers: { Authorization: auth.token, ...(body && { 'content-type': 'application/json' }) }, body: body && JSON.stringify(body) });
  return r.status;
};
const pw = (password) => ({ password, passwordConfirm: password });

const admin = await login(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
const demo = await login(process.env.DEMO_USERNAME, process.env.DEMO_PASSWORD);
const rows = [];

// Back up now, download, delete
const made = await fetch(`${B}/api/carmaint/backups`, { method: 'POST', headers: { Authorization: admin.token } });
const { name } = await made.json();
rows.push(['admin', 'backup now', made.status]);
rows.push(['admin', 'download', await call(admin, 'GET', `/api/carmaint/backups/${name}`)]);
rows.push(['admin', 'delete', await call(admin, 'DELETE', `/api/carmaint/backups/${name}`)]);

// A second user: the admin may set their password without knowing the old one
const anna = await fetch(`${B}/api/collections/users/records`, { method: 'POST', headers: { Authorization: admin.token, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'e2e-user', role: 'user', ...pw('e2e-user-1') }) }).then((r) => r.json());
rows.push(['admin', 'set password of user', await call(admin, 'PATCH', `/api/collections/users/records/${anna.id}`, pw('e2e-user-2'))]);
const user = await login('e2e-user', 'e2e-user-2');
rows.push(['user', 'password self, wrong old', await call(user, 'PATCH', `/api/collections/users/records/${user.record.id}`, { oldPassword: 'x', ...pw('e2e-user-3') })]);

for (const [who, a] of [['admin', admin], ['demo', demo]]) {
  rows.push([who, 'GET backups', await call(a, 'GET', '/api/carmaint/backups')]);
  rows.push([who, 'PUT schedule', await call(a, 'PUT', '/api/carmaint/backups/schedule', { mode: 'off' })]);
  rows.push([who, 'GET bad name', await call(a, 'GET', '/api/carmaint/backups/..%2Fx')]);
  rows.push([who, 'GET missing', await call(a, 'GET', '/api/carmaint/backups/nope.zip')]);
  rows.push([who, 'DELETE missing', await call(a, 'DELETE', '/api/carmaint/backups/nope.zip')]);
  rows.push([who, 'restore missing', await call(a, 'POST', '/api/carmaint/backups/nope.zip/restore')]);
  rows.push([who, 'notify test', await call(a, 'POST', '/api/carmaint/notify/test', { push: 'ntfy://127.0.0.1:1/x' })]);
  rows.push([who, 'notify run', await call(a, 'POST', '/api/carmaint/notify/run')]);
  rows.push([who, 'usage users', await call(a, 'GET', '/api/carmaint/usage/users')]);
  rows.push([who, 'rename self', await call(a, 'PATCH', `/api/collections/users/records/${a.record.id}`, { username: `${a.record.username}x` })]);
  rows.push([who, 'password self, wrong old', await call(a, 'PATCH', `/api/collections/users/records/${a.record.id}`, { oldPassword: 'x', ...pw('abcdefgh') })]);
}
for (const r of rows) console.log(r.join(' | '));
