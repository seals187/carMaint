# CarMaint

Wartungs- und Reparaturheft für deine Fahrzeuge – mit Fotos, Belegen, Fahrzeugdaten und Login.

- **Frontend:** reines HTML/CSS/JS (`pb_public/`), kein Build-Schritt
- **Backend:** [PocketBase](https://pocketbase.io) – SQLite-Datenbank, Login, Datei-Speicher, Admin-Oberfläche
- **Betrieb:** ein Docker-Container, Konfiguration über `.env`

## Schnellstart mit Docker

Auf dem Server werden nur zwei Dateien gebraucht – das Image kommt fertig von ghcr.io:

```bash
mkdir carmaint && cd carmaint
curl -fsSLO https://raw.githubusercontent.com/seals187/carMaint/main/docker-compose.yml
curl -fsSL  https://raw.githubusercontent.com/seals187/carMaint/main/.env.example -o .env
nano .env                 # anpassen, mindestens ADMIN_PASSWORD!
docker compose up -d
```

Danach erreichbar unter `http://<server>:8090` – Anmeldung mit `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Das Image gibt es für amd64 (VPS, VM, LXC auf Proxmox) sowie arm64 und armv7 (Raspberry Pi) –
Docker holt automatisch die passende Variante.

> Ist das Paket auf ghcr.io privat, vorher auf dem Server anmelden:
> `docker login ghcr.io -u seals187` (Passwort = Token mit Recht `read:packages`).

## Konfiguration (`.env`)

| Variable | Bedeutung | Standard |
|---|---|---|
| `CARMAINT_VERSION` | Image-Version: `latest`, fest z. B. `0.1.0`, oder `edge` | `latest` |
| `APP_NAME` | Name im Browser-Tab und auf der Login-Seite | `CarMaint` |
| `APP_URL` | Öffentliche Adresse der Website | – |
| `PORT` | Port auf dem Host | `8090` |
| `TZ` | Zeitzone | – |
| `DEFAULT_CURRENCY` | Startwährung neuer Benutzer: `EUR`, `CHF`, `USD` | `EUR` |
| `ADMIN_USERNAME` | Erster Benutzer (Admin) – nur angelegt, wenn noch keiner existiert | – |
| `ADMIN_PASSWORD` | Dessen Passwort (min. 8 Zeichen) | – |
| `ADMIN_RESET_PASSWORD` | `true` = Admin-Passwort beim nächsten Start auf `ADMIN_PASSWORD` setzen | `false` |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | Zugang zur PocketBase-Oberfläche unter `/_/` (optional) | – |
| `PB_ENCRYPTION_KEY` | 32 Zeichen, verschlüsselt Server-Einstellungen (optional, nicht mehr ändern!) | – |
| `TRUSTED_PROXY_HEADERS` | Hinter Reverse Proxy, z. B. `X-Forwarded-For` | – |

Änderungen an der `.env` werden mit `docker compose up -d` übernommen.

## Benutzer & Rechte

- Der erste Benutzer aus der `.env` ist **Admin**.
- Admins legen unter **Einstellungen → Benutzer** weitere Konten an, setzen Passwörter zurück und löschen Benutzer.
- Jeder Benutzer sieht **nur seine eigenen Fahrzeuge**. Fotos und Belege sind nur mit gültiger Anmeldung abrufbar.
- Es gibt keine offene Registrierung. Anmeldeversuche werden gebremst (Schutz gegen Passwort-Raten).

## Daten & Backup

Alle Daten liegen im Docker-Volume `carmaint_data` (Datenbank + Dateien).

- **In der App:** Einstellungen → Backup → *Exportieren* erzeugt eine JSON-Datei mit allen Fahrzeugen,
  Einträgen, Fotos und Belegen des angemeldeten Benutzers. *Importieren* ersetzt dessen Fahrzeuge.
- **Ganzer Server:** PocketBase-Oberfläche (`/_/`) → Settings → Backups, oder das Volume sichern:
  ```bash
  docker run --rm -v carmaint_data:/data -v "$PWD":/backup alpine tar czf /backup/carmaint-data.tgz -C /data .
  ```

### Daten aus der alten Browser-Version übernehmen

Die frühere Version (Daten nur im Browser) liegt nur lokal im Ordner `legacy/` (nicht im Repository).

1. `legacy/index.html` **im selben Browser und über dieselbe Adresse wie bisher** öffnen
   (z. B. in WebStorm: Rechtsklick → *Open in Browser*).
2. Oben rechts **Backup exportieren**.
3. In der neuen Version anmelden → Einstellungen → Backup → **Importieren**.

## Lokal entwickeln (Windows, ohne Docker)

```powershell
copy .env.example .env
powershell -ExecutionPolicy Bypass -File .\dev.ps1
```

Lädt PocketBase beim ersten Start nach `bin\` und startet auf `http://localhost:8090`.
Änderungen in `pb_public/` sind nach einem Neuladen im Browser sichtbar.

## Reverse Proxy / HTTPS

Für den Zugriff aus dem Internet einen Reverse Proxy mit HTTPS davorschalten
(Caddy, Traefik, nginx, Nginx Proxy Manager) und `TRUSTED_PROXY_HEADERS=X-Forwarded-For` setzen.
Beispiel Caddy:

```
carmaint.example.ch {
    reverse_proxy localhost:8090
}
```

## Update

```bash
docker compose pull && docker compose up -d
```

Datenbank-Änderungen (`pb_migrations/`) werden beim Start automatisch eingespielt.
Vor größeren Updates ein Backup machen. Für kontrollierte Updates in der `.env` eine feste
Version setzen (`CARMAINT_VERSION=0.1.0`) und bewusst erhöhen.

## Versionen & Releases

Versionierung nach [Semantic Versioning](https://semver.org/lang/de/): `MAJOR.MINOR.PATCH`.
Solange die Version mit `0.` beginnt, ist CarMaint in der Anfangsentwicklung.

| Image-Tag | Inhalt |
|---|---|
| `latest` | neuestes Release |
| `0.1.0`, `0.1` | bestimmtes Release bzw. neuester Patch davon |
| `edge` | aktueller Stand von `main` (Entwicklung) |
| `sha-abc1234` | ein bestimmter Commit |

GitHub Actions (`.github/workflows/docker.yml`) baut bei jedem Push auf `main` das `edge`-Image
und bei jedem Versions-Tag ein Release. **Neue Version veröffentlichen:**

1. Änderungen in `CHANGELOG.md` unter einer neuen Version eintragen
2. Taggen und hochladen:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

Faustregel: neue Funktion → `0.2.0`, nur Fehlerbehebung → `0.1.1`.
Den Fortschritt siehst du auf GitHub unter **Actions**, die Images unter **Packages**.

Die PocketBase-Version steht im `Dockerfile` (`PB_VERSION`) und in `dev.ps1`.

### Image lokal bauen

```bash
docker build --build-arg VERSION=dev -t ghcr.io/seals187/carmaint:dev .
```

## Projektstruktur

```
pb_public/       Website (index.html, style.css, app.js)
pb_migrations/   Datenbank-Schema und Zugriffsregeln
pb_hooks/        Server-Logik: .env lesen, Admin anlegen, /api/carmaint/config
Dockerfile       Image (Alpine + PocketBase, läuft als Nicht-Root-Benutzer)
.github/         GitHub Actions: Image bauen und auf ghcr.io veröffentlichen
CHANGELOG.md     Änderungen pro Version
```
