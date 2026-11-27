# Coding standards

Read when reviewing a change. Rules a script can check live in `test/` and run with `scripts/check.sh`
(syntax, UI texts in all languages, no external requests, record writes through the store); this file
holds the ones that need judgement.

## Domain rules live in `core.js`

Due dates, km per day, reminder levels, intervals, cost figures and settings defaults are computed in
`pb_public/core.js` and nowhere else. `app.js` and the hooks (`notify.js`, `config.js`) call it and
only format the result. A change that computes one of these again in a caller (a second km estimate,
a local copy of a constant, a cost sum in a view) is a finding, even when the numbers agree today:
the website and the reminder mails must show the same thing.

New domain rules go into `core.js` with a test in `test/core.test.js`. `core.js` stays pure: no DOM,
no texts, no PocketBase.

## User settings

A new key in `DEFAULT_SETTINGS` (`core.js`) is validated in `userSettings` and tested in `test/core.test.js`.
Whether a backup import restores it (`importBackup` in `app.js`) is a decision to make, not to forget: display
preferences such as currency or units are restored, per-device states are not.

## Reminder writes go through the lifecycle section

Every create or update of a reminder in `app.js` goes through the *Reminder lifecycle* section
(`remindAfterEntry`, `scheduleReminder`, `saveReminder`, `syncDocReminder`). A dialog or import that
writes a reminder directly bypasses the shared due-date rule.

## Server permissions go through `access.js`

Custom routes and user hooks ask `access.can` / `access.check` / `access.lockedFields`. A route that
compares `role` or the demo username itself is a finding. When PocketBase's own rules are bypassed
for admins (manage rule), check whether the hook has to enforce the rule itself, as for the old
password.

## User-visible changes

Every change a user notices has an entry in `CHANGELOG.md` under `[Unreleased]`.
