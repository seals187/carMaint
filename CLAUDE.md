# CLAUDE.md

Guidance for AI assistants (and humans) working on this repository.

## Project

CarMaint is a lightweight, self-hosted maintenance log for vehicles: services, repairs, inspections,
costs, photos, receipts and vehicle data, with multi-user login. It ships as a single Docker image
(`ghcr.io/seals187/carmaint`) configured entirely via `.env`.

**Goals:** keep it as light as possible, modern design, compact docs. The primary user is in
Switzerland (CHF, MFK, Stammnummer, Typengenehmigung).

## Architecture

| Path | Purpose |
|---|---|
| `pb_public/` | Frontend: `index.html`, `style.css`, `i18n.js`, `app.js` – plain JS, **no framework, no build step, no external requests** |
| `pb_public/fonts/` | Anton font subset (A–Z, SIL OFL) for the text logo |
| `pb_migrations/` | PocketBase schema and API rules (JS migrations) |
| `pb_hooks/` | Server logic: `config.js` reads `.env`; `carmaint.pb.js` creates the admin, applies settings, serves `GET /api/carmaint/config`; `notify.js` sends the daily reminder mails (cron); `storage.js` storage usage |
| `Dockerfile` | Alpine + PocketBase (checksum-verified), non-root user, multi-arch |
| `.github/workflows/` | `docker.yml` (build/publish image), `release.yml` (GitHub release from CHANGELOG) |
| `dev.ps1` | Local run on Windows without Docker |

**Data model:** `users` (auth by `username`, `role` admin/user, `settings` JSON), `cars` (`owner`,
`photos` – first photo is the cover, `info` JSON), `entries` (`car`, `type`, `date` as `YYYY-MM-DD`,
`attachments`, `attachmentNames` JSON), `reminders` (`car`, `title`, `type`, `intervalKm`/`intervalMonths`,
`dueKm`/`dueDate`), `documents` (`car`, `kind`, `title`, `validUntil`, `attachments`, `attachmentNames`,
`reminder`). Access rules: every user only sees their own data; admins
manage users. Files are `protected` and fetched with a short-lived file token.

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

## Testing

No test suite in the repo. Before pushing changes, at least:

```bash
node --check pb_public/app.js pb_public/i18n.js pb_hooks/*.js   # e.g. via docker run node:22-alpine
docker build -t carmaint:test .
docker run --rm -p 8090:8090 -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=test1234 carmaint:test
```

Then check in a browser: login, add car with photo, add entry with PDF, vehicle data, all languages,
light/dark mode, mobile width. Validate workflows with `actionlint`.

## Releases

- [SemVer](https://semver.org/), still `0.x`. Record every user-visible change in `CHANGELOG.md` under
  `[Unreleased]` (Keep a Changelog format).
- Release: rename `[Unreleased]` to `[X.Y.Z] – YYYY-MM-DD`, add a new empty `[Unreleased]`, update the
  compare links, commit, then `git tag -a vX.Y.Z -m "CarMaint X.Y.Z" && git push origin vX.Y.Z`.
  The workflows publish the image (`X.Y.Z`, `X.Y`, `latest`) and the GitHub release.
- Pushes to `main` publish the `edge` image. Commit and push only when asked.
