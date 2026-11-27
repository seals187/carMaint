# CLAUDE.md

Guidance for AI assistants (and humans) working on this repository.

## Project

CarMaint is a lightweight, self-hosted maintenance log for vehicles: services, repairs, inspections,
costs, photos, receipts and vehicle data, with multi-user login. It ships as a single Docker image
(`ghcr.io/seals187/carmaint`) configured entirely via `.env`. The public demo has no seed data in the repo;
its data is entered by hand.

**Goals:** keep it as light as possible, modern design, compact docs. The primary user is in
Switzerland (CHF, MFK, Stammnummer, Typengenehmigung).

## Architecture

| Path | Purpose |
|---|---|
| `pb_public/` | Frontend: `index.html`, `style.css`, `i18n.js`, `app.js` – plain JS, **no framework, no build step, no external requests** |
| `pb_public/core.js` | Pure domain rules (no DOM, no texts, no PocketBase), shared: global `CarMaint` in the browser, `require(\`${__hooks}/../pb_public/core.js\`)` in hooks |
| `pb_public/store.js` | Record store (global `CarMaintStore`): the only way to write cars, entries, reminders, documents – `store.save/remove/upload` keep `db`, dependent records and the file cache in sync |
| `test/` | `node --test` checks: syntax, pure modules, UI texts, frontend rules. Node runs every `.js` under `test/`, so no helpers or non-test scripts there |
| `e2e/` | Before/after browser and API comparison of two builds (`e2e/compare.sh`); `e2e/serve.sh` runs the working tree |
| `CODING_STANDARDS.md` | Review rules that need judgement |
| `pb_public/fonts/` | Anton font subset (A–Z, SIL OFL) for the text logo |
| `pb_migrations/` | PocketBase schema and API rules (JS migrations) |
| `pb_hooks/` | Server logic: `config.js` reads `.env`; `carmaint.pb.js` creates the admin, applies settings, serves `GET /api/carmaint/config`; `notify.js` sends the daily reminder mails (cron); `storage.js` storage usage; `previews.js` renders PDF previews with poppler; `backup.js` automatic server backups (schedule in `pb_data/carmaint-backup.json`, set by admins in the UI, not in `.env`); `access.js` who may do what (admin, backup, notify, demo restrictions) |
| `Dockerfile` | Alpine + PocketBase (checksum-verified), non-root user, multi-arch |
| `.github/workflows/` | `docker.yml` (build/publish image), `release.yml` (GitHub release from CHANGELOG) |
| `dev.ps1` | Local run on Windows without Docker |

**Data model:** collections and fields in `pb_migrations/`, domain terms in `GLOSSARY.md`. What the schema does
not say: the first car photo is the cover; `previews` and `fileInfo` are made by the server; a refuel without
`litres` counts for costs only. Every user only sees their own data; admins manage users. Files are
`protected` and fetched with a short-lived file token.

## Conventions

- **Language:** code, comments, log messages, docs and commit messages in **English**.
  The UI is available in German, English, Spanish and French.
- **UI texts:** never hard-code strings in `app.js`/`index.html`. Add the key to **all** languages
  (`de`, `en`, `es`, `fr`) in `pb_public/i18n.js` and use `t()` / `tn()` (plural `"one|many"`) or `data-i18n*` attributes.
- **Stored values stay language-neutral** (entry types, settings keys; fuel values are stored in
  German for backwards compatibility and translated on display).
- **New server settings** become `.env` variables: read them in `pb_hooks/config.js`, document them in
  `.env.example` (and in the README table only if important).
- **Schema changes:** add a new migration file in `pb_migrations/` – never edit a released migration.
- Keep the README compact; no personal data, local paths or secrets anywhere in the repo.
- Match the existing style: small helpers, template literals, `esc()` for every user value in HTML.

## PocketBase gotchas (v0.40)

- Migrations run **after** `onBootstrap`; logic that needs the schema runs in
  `be.app.onServe().bindFunc(...)` (there is no global `onServe` in JSVM).
- Each hook handler runs **isolated** – no access to top-level functions; use `require()`.
- Auth is rate-limited (≈2 requests / 3 s) – keep that in mind when testing logins.
- The server sanitizes file names (umlauts, spaces) – original names live in `attachmentNames`.
- Number fields return `0` and text fields `""` when empty.
- Users matching a collection's **manage rule** (admins on `users`) skip PocketBase's own checks such
  as `oldPassword`; hooks enforce those themselves.

## Testing

- `scripts/check.sh` – all `node --test` checks (local Node 22+ or Docker); CI runs them before every build.
- `e2e/compare.sh [BASE_REF] [NEW_REF]` – for changes to behaviour or refactors: builds `main` and the
  working tree, walks the UI and the guarded API routes in both and diffs the output. Every difference
  must be intended.
- `e2e/serve.sh [NAME] [PORT]` – the working tree with fresh data (admin / test1234) for a look or an ad-hoc
  browser script. New features get steps in `e2e/ui.js`, so `compare.sh` covers them from then on.
- By hand in a browser (`e2e/serve.sh cm-dev 8090`): all languages, light/dark mode, mobile width – the e2e run
  covers English, light, desktop and phone, and reports figures cut off with "…" (`CLIPPED`).
- Workflows: `actionlint`.

## Releases

- [SemVer](https://semver.org/), still `0.x`. Record every user-visible change in `CHANGELOG.md` under
  `[Unreleased]` (Keep a Changelog format).
- Release: rename `[Unreleased]` to `[X.Y.Z] – YYYY-MM-DD`, add a new empty `[Unreleased]`, update the
  compare links, commit, then `git tag -a vX.Y.Z -m "CarMaint X.Y.Z" && git push origin vX.Y.Z`.
  The workflows publish the image (`X.Y.Z`, `X.Y`, `latest`) and the GitHub release; `scripts/release-status.sh vX.Y.Z`
  waits for them and checks the result.
- Pushes to `main` publish the `edge` image. Commit and push only when asked.
