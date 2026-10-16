# CarMaint

A maintenance and repair log for your vehicles, with photos, receipts, vehicle data and login.

- **Frontend:** plain HTML/CSS/JS (`pb_public/`), no build step
- **Backend:** [PocketBase](https://pocketbase.io): SQLite database, authentication, file storage, admin UI
- **Deployment:** a single Docker container, configured via `.env`

## Quick start with Docker

The server only needs two files. The image is pulled ready-made from ghcr.io:

```bash
mkdir carmaint && cd carmaint
curl -fsSLO https://raw.githubusercontent.com/seals187/carMaint/main/docker-compose.yml
curl -fsSL  https://raw.githubusercontent.com/seals187/carMaint/main/.env.example -o .env
nano .env                 # adjust, at least ADMIN_PASSWORD!
docker compose up -d
```

Then open `http://<server>:8090` and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

The image is available for amd64 (VPS, VM, LXC on Proxmox) as well as arm64 and armv7 (Raspberry Pi).
Docker automatically pulls the matching variant.

> If the package on ghcr.io is private, log in on the server first:
> `docker login ghcr.io -u seals187` (password = a token with the `read:packages` scope).

## Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `CARMAINT_VERSION` | Image version: `latest`, a fixed one like `0.1.0`, or `edge` | `latest` |
| `APP_NAME` | Name shown in the browser tab and on the login page | `CarMaint` |
| `APP_URL` | Public URL of the website | – |
| `PORT` | Port on the host | `8090` |
| `TZ` | Time zone | – |
| `DEFAULT_CURRENCY` | Initial currency for new users: `EUR`, `CHF`, `USD` | `EUR` |
| `ADMIN_USERNAME` | First user (admin), only created if no user exists yet | – |
| `ADMIN_PASSWORD` | That user's password (min. 8 characters) | – |
| `ADMIN_RESET_PASSWORD` | `true` = reset the admin password to `ADMIN_PASSWORD` on next start | `false` |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | Access to the PocketBase admin UI at `/_/` (optional) | – |
| `PB_ENCRYPTION_KEY` | 32 characters, encrypts the server settings (optional, never change it once set!) | – |
| `TRUSTED_PROXY_HEADERS` | Behind a reverse proxy, e.g. `X-Forwarded-For` | – |

Apply changes to `.env` with `docker compose up -d`.

## Users & permissions

- The first user from `.env` is an **admin**.
- Admins can create accounts, reset passwords and delete users under **Settings → Users**.
- Every user sees **only their own vehicles**. Photos and receipts are only accessible with a valid login.
- There is no public sign-up. Login attempts are rate-limited to protect against password guessing.

## Data & backup

All data lives in the Docker volume `carmaint_data` (database + files).

- **In the app:** Settings → Backup → *Export* creates a JSON file with all vehicles,
  entries, photos and receipts of the signed-in user. *Import* replaces that user's vehicles.
- **Whole server:** PocketBase admin UI (`/_/`) → Settings → Backups, or back up the volume:
  ```bash
  docker run --rm -v carmaint_data:/data -v "$PWD":/backup alpine tar czf /backup/carmaint-data.tgz -C /data .
  ```

### Migrating data from the old browser-only version

The previous version (data stored only in the browser) exists only locally in the `legacy/` folder (not in the repository).

1. Open `legacy/index.html` **in the same browser and from the same address as before**
   (e.g. in WebStorm: right-click → *Open in Browser*).
2. Click **Export backup** in the top right.
3. Sign in to the new version → Settings → Backup → **Import**.

## Local development (Windows, without Docker)

```powershell
copy .env.example .env
powershell -ExecutionPolicy Bypass -File .\dev.ps1
```

Downloads PocketBase into `bin\` on first start and runs on `http://localhost:8090`.
Changes in `pb_public/` show up after reloading the browser.

## Reverse proxy / HTTPS

For access from the internet, put a reverse proxy with HTTPS in front
(Caddy, Traefik, nginx, Nginx Proxy Manager) and set `TRUSTED_PROXY_HEADERS=X-Forwarded-For`.
Caddy example:

```
carmaint.example.ch {
    reverse_proxy localhost:8090
}
```

## Updating

```bash
docker compose pull && docker compose up -d
```

Database changes (`pb_migrations/`) are applied automatically on startup.
Make a backup before larger updates. For controlled updates, pin a version in `.env`
(`CARMAINT_VERSION=0.1.0`) and raise it deliberately.

## Versions & releases

Versioning follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.
As long as the version starts with `0.`, CarMaint is in initial development.

| Image tag | Content |
|---|---|
| `latest` | latest release |
| `0.1.0`, `0.1` | a specific release, or the latest patch of it |
| `edge` | current state of `main` (development) |
| `sha-abc1234` | a specific commit |

GitHub Actions builds the `edge` image on every push to `main` (`docker.yml`). Every version tag
produces a release image **and** a GitHub release whose notes are taken from `CHANGELOG.md`
(`release.yml`). **To publish a new version:**

1. In `CHANGELOG.md`, rename `[Unreleased]` to the new version (e.g. `## [0.2.0] – 2026-11-01`),
   add a fresh empty `[Unreleased]` section above it and commit
2. Tag and push:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

Rule of thumb: new feature → `0.2.0`, bug fix only → `0.1.1`. A tag such as `v0.2.0-beta.1` is
published as a pre-release.
Progress is shown on GitHub under **Actions**, the images under **Packages**, the releases under **Releases**.

To create or update the release for an existing tag: **Actions → Release → Run workflow** and enter the tag.

The PocketBase version is set in the `Dockerfile` (`PB_VERSION`) and in `dev.ps1`.

### Building the image locally

```bash
docker build --build-arg VERSION=dev -t ghcr.io/seals187/carmaint:dev .
```

## Project structure

```
pb_public/       Website (index.html, style.css, app.js)
pb_migrations/   Database schema and access rules
pb_hooks/        Server logic: reads .env, creates the admin, /api/carmaint/config
Dockerfile       Image (Alpine + PocketBase, runs as a non-root user)
.github/         GitHub Actions: build the image and publish it to ghcr.io
CHANGELOG.md     Changes per version
```
