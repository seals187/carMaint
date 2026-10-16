# CarMaint

A maintenance and repair log for your vehicles, with photos, receipts, vehicle data and login.

- **Frontend:** plain HTML/CSS/JS (`pb_public/`), no build step
- **Backend:** [PocketBase](https://pocketbase.io): SQLite database, authentication, file storage, admin UI
- **Deployment:** a single Docker container, configured via `.env`

## Installation

CarMaint runs as a single container. You only need two files – `docker-compose.yml` and `.env` –
the image itself is pulled ready-made from `ghcr.io/seals187/carmaint`.

The image is available for amd64 (PC, VPS, VM, LXC on Proxmox) as well as arm64 and armv7
(Raspberry Pi). Docker automatically pulls the matching variant.

### Before you start: private repository or package?

The commands below download files from GitHub and pull the image from ghcr.io **without logging in**.
That only works if both are public. If they are private:

- **Image (ghcr.io):** log in to the registry once. The password is a
  [personal access token (classic)](https://github.com/settings/tokens) with the `read:packages`
  scope – **not** your GitHub password.
  ```bash
  docker login ghcr.io -u seals187
  ```
  Without this login, `docker compose up` fails with `error from registry: unauthorized`.
- **Files (repository):** instead of downloading them, get `docker-compose.yml` and `.env.example`
  via `git clone https://github.com/seals187/carMaint.git` (asks for your GitHub login) or copy
  them from your local checkout.

To make the image public: GitHub → your profile → **Packages** → `carmaint` → **Package settings**
→ **Change visibility** → **Public**. The image contains only program code – no data and no
passwords (those live in `.env` and the Docker volume).

### Linux (Docker Engine)

Requirements: [Docker Engine](https://docs.docker.com/engine/install/) with the Compose plugin
(`docker compose version` must work). Works the same on a VPS, a Linux VM, an LXC container on
Proxmox (with nesting enabled) and a Raspberry Pi.

```bash
mkdir ~/carmaint && cd ~/carmaint
curl -fsSLO https://raw.githubusercontent.com/seals187/carMaint/main/docker-compose.yml
curl -fsSL  https://raw.githubusercontent.com/seals187/carMaint/main/.env.example -o .env
nano .env                 # adjust, at least ADMIN_PASSWORD!
docker compose up -d
```

Open `http://<server-ip>:8090` and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
If your user is not in the `docker` group, prefix the `docker` commands with `sudo`.

### Windows (Docker Desktop)

Requirements: [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)
with the WSL 2 backend. Start Docker Desktop and wait until it shows *Engine running*.

Run the following in **PowerShell**:

```powershell
mkdir C:\carmaint; cd C:\carmaint
Invoke-WebRequest https://raw.githubusercontent.com/seals187/carMaint/main/docker-compose.yml -OutFile docker-compose.yml
Invoke-WebRequest https://raw.githubusercontent.com/seals187/carMaint/main/.env.example -OutFile .env
notepad .env              # adjust, at least ADMIN_PASSWORD!
docker compose up -d
```

Open `http://localhost:8090` and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

> In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest` and does not understand
> options like `-fsSLO`. Use the commands above, or call the real curl explicitly as `curl.exe`.

The container also shows up in the Docker Desktop UI under **Containers**, where you can
start, stop and view its logs. The data is stored in the volume `carmaint_data` (**Volumes**).

### Useful commands (Linux and Windows)

Run them in the folder that contains `docker-compose.yml`:

| Command | Purpose |
|---|---|
| `docker compose ps` | Show status (should become `healthy`) |
| `docker compose logs -f` | Follow the logs (stop with Ctrl+C) |
| `docker compose up -d` | Apply changes to `.env` (recreates the container) |
| `docker compose restart` | Restart without applying `.env` changes |
| `docker compose down` | Stop and remove the container (data in the volume is kept) |
| `docker compose pull && docker compose up -d` | Update to a newer image |

### Troubleshooting

| Problem | Solution |
|---|---|
| `error from registry: unauthorized` / `denied` | The image is private – run `docker login ghcr.io` (see above) or make the package public |
| `404` when downloading the files | The repository is private – use `git clone` or copy the files |
| Login does not work after the first start | `ADMIN_PASSWORD` must be at least 8 characters; check `docker compose logs` |
| Port 8090 is already in use | Set another `PORT` in `.env`, e.g. `PORT=8091` |
| Forgot the admin password | Set `ADMIN_RESET_PASSWORD=true` and a new `ADMIN_PASSWORD`, run `docker compose up -d`, then set it back to `false` |

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
