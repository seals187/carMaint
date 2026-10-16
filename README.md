# CarMaint

Wartungs- und Reparaturheft für deine Fahrzeuge – mit Fotos, Belegen, Fahrzeugdaten und Login.

- **Frontend:** reines HTML/CSS/JS (`pb_public/`), kein Build-Schritt
- **Backend:** [PocketBase](https://pocketbase.io) – SQLite-Datenbank, Login, Datei-Speicher, Admin-Oberfläche
- **Betrieb:** ein Docker-Container, Konfiguration über `.env`

## Schnellstart mit Docker

```bash
cp .env.example .env      # anpassen, mindestens ADMIN_PASSWORD!
docker compose up -d --build
```

Danach erreichbar unter `http://<server>:8090` – Anmeldung mit `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Läuft auf VPS, Linux-VM, LXC (Proxmox, mit Docker) und Raspberry Pi (64 Bit und 32 Bit) –
das Image wählt die passende PocketBase-Version automatisch.

## Konfiguration (`.env`)

| Variable | Bedeutung | Standard |
|---|---|---|
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

Die frühere Version (Daten nur im Browser) liegt in `legacy/`.

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
git pull                      # bzw. neue Dateien kopieren
docker compose up -d --build
```

Datenbank-Änderungen (`pb_migrations/`) werden beim Start automatisch eingespielt.
Die PocketBase-Version steht im `Dockerfile` (`PB_VERSION`) und in `dev.ps1`.

## Projektstruktur

```
pb_public/       Website (index.html, style.css, app.js)
pb_migrations/   Datenbank-Schema und Zugriffsregeln
pb_hooks/        Server-Logik: .env lesen, Admin anlegen, /api/carmaint/config
Dockerfile       Image (Alpine + PocketBase, läuft als Nicht-Root-Benutzer)
legacy/          Alte Browser-Version – nur noch zum Exportieren der Daten
```
