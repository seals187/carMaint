# Changelog

All notable changes to CarMaint. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
As long as the version starts with `0.`, CarMaint is in initial development.

## [Unreleased]

### Added
- GitHub releases are created automatically for every version tag, with notes from this changelog
- Banner image in the README

### Changed
- Docker base image updated to Alpine 3.24
- GitHub Actions updated to Node.js 24 versions; Dependabot keeps actions and the base image up to date
- README, changelog, configuration template and code comments translated to English
- README: separate installation guides for Linux (Docker Engine) and Windows (Docker Desktop), troubleshooting

## [0.1.0] – 2026-10-16

### Added
- Vehicles with photos (cover photo, image viewer) and vehicle data (purchase, registration, technical, inspection)
- Entries for service, repair, inspection, tires and other, with receipts (images, PDF)
- Filter, search, cost overview, currency EUR/CHF/USD
- Login with username and password, user management for admins
- Backup export and import (including data from the former browser-only version)
- PocketBase backend, Docker image on ghcr.io, configuration via `.env`

[Unreleased]: https://github.com/seals187/carMaint/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/seals187/carMaint/releases/tag/v0.1.0
