# Changelog

All notable changes to CarMaint. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
As long as the version starts with `0.`, CarMaint is in initial development.

## [Unreleased]

### Added
- Discord community link and badges in the README

### Changed
- New favicon based on the dark app icon (speedometer), plus an icon for the iOS home screen

## [0.1.3] – 2026-10-17

### Added
- `DEMO_PASSWORD` in `.env`: the demo user is created automatically on startup if it does not exist yet

## [0.1.2] – 2026-10-17

### Added
- App screenshots in the README
- Link to the live demo in the README
- Demo user: `DEMO_USERNAME` and `DEMO_DISABLED` in `.env` hide settings such as “Change password” for that account (also enforced on the server)

## [0.1.1] – 2026-10-17

### Added
- GitHub releases are created automatically for every version tag, with notes from this changelog
- Banner image in the README
- English user interface: switch the language under Settings or on the login page; `DEFAULT_LANGUAGE` sets the default

### Changed
- Docker base image updated to Alpine 3.24
- New text logo in the app (CAR + MAINT, colours from the banner, Anton font bundled locally)
- GitHub Actions updated to Node.js 24 versions; Dependabot keeps actions and the base image up to date
- README, changelog, configuration template and code comments translated to English
- README shortened: compact installation for Linux (Docker Engine) and Windows (Docker Desktop)

## [0.1.0] – 2026-10-16

### Added
- Vehicles with photos (cover photo, image viewer) and vehicle data (purchase, registration, technical, inspection)
- Entries for service, repair, inspection, tires and other, with receipts (images, PDF)
- Filter, search, cost overview, currency EUR/CHF/USD
- Login with username and password, user management for admins
- Backup export and import (including data from the former browser-only version)
- PocketBase backend, Docker image on ghcr.io, configuration via `.env`

[Unreleased]: https://github.com/seals187/carMaint/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/seals187/carMaint/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/seals187/carMaint/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/seals187/carMaint/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/seals187/carMaint/releases/tag/v0.1.0
