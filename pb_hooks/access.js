/// <reference path="../pb_data/types.d.ts" />

// Who may do what on the server. Record access itself is in the API rules of the
// migrations; this covers the custom routes and the demo user (DEMO_USERNAME), who can
// have single features disabled (DEMO_DISABLED).
// Loaded via require() from the hooks.
//
// Actions:
//   admin    – admins only
//   backup   – admins, unless "backup" is disabled for the demo user
//   notify   – everyone, unless "notify" is disabled for the demo user
//   password – everyone, unless "password" is disabled for the demo user

const ADMIN_ONLY = ['admin', 'backup'];
const DEMO_OPTION = { backup: 'backup', notify: 'notify', password: 'password' };

const isDemo = (cfg, user) => !!cfg.demoUsername && !!user && user.getString('username') === cfg.demoUsername;

function can(cfg, user, action) {
  if (!user) return false;
  if (ADMIN_ONLY.includes(action) && user.getString('role') !== 'admin') return false;
  const option = DEMO_OPTION[action];
  return !(option && isDemo(cfg, user) && cfg.demoDisabled.includes(option));
}

// Throws 403 unless the user may do the action
function check(cfg, user, action) {
  if (!can(cfg, user, action)) throw new ForbiddenError('Not allowed.');
}

// Fields a user may not change on their own account: the demo user keeps its name
// (renaming would lift the restrictions) and, if disabled, its password.
function lockedFields(cfg, user) {
  if (!isDemo(cfg, user)) return [];
  return ['username', ...(can(cfg, user, 'password') ? [] : ['password', 'oldPassword', 'passwordConfirm'])];
}

module.exports = { isDemo, can, check, lockedFields };
