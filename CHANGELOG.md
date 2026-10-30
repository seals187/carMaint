# Changelog

All notable changes to CarMaint. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
As long as the version starts with `0.`, CarMaint is in initial development.

## [Unreleased]

## [0.2.9] – 2026-10-30

### Added
- Phones: a back button next to "+ Entry" in the bottom bar of the car page.
- Search: entries show the icon of their type.

### Changed
- Phones: mileage, costs and cost per km sit below the car name, one per line, instead of in their own box.
- Phones: history entries show only a paperclip that opens the attachment; the file cards appear when the entry is
  expanded.
- Phones: the buttons on the car cards sit at the bottom right of the photo; the "+ Vehicle" button on the overview is
  no taller than the heading.
- Car page: no arrow in the cost tile any more; it still opens the cost page. On phones the cost row is tinted.

### Fixed
- Phones: the car name wraps instead of being cut off next to the medium-sized photo.

## [0.2.8] – 2026-10-30

### Added
- Phones: the car photo on the car page can be resized with + and − (small, medium, full width; remembered per
  user).
- Car page: neutral icons next to the headings "Reminders" and "History".
- Entry types have their own neutral icons in the entry dialog, the history filters and the history entries.

### Changed
- Cost page: the "below each other" layout uses the sizes and spacing of the compact layout, so nothing jumps when
  switching.

### Removed
- Phones: the "x due" badge in the top bar.

## [0.2.7] – 2026-10-30

### Added
- Vehicle data: tyre pressure front/rear, engine oil (type, capacity) and battery (type, capacity, cold cranking
  current).
- Car page: reminders can also be folded on larger screens (remembered per user, separately from phones).

### Fixed
- Overview: reminders are sorted by calendar week – "This week" ends on Sunday, a new column "Next week" covers
  Monday to Sunday, everything after that is under "Later". Mileage reminders are estimated at 50 km per day.
- Overview: the due time looks the same in every reminder row, including grouped ones, and always has its own
  line in the columns; car names in grouped rows use the same colour as in the other rows.
- Overview: car cards show reminder dates with the year (DD.MM.YY).
- Car page: reminders always show the time left and the full date with the year (DD.MM.YYYY), also for dates
  far ahead.

## [0.2.6] – 2026-10-30

### Changed
- Phones: reminders on the car page can be folded (remembered per user); the tiles for vehicle data, photos and
  documents are now a single compact row; slightly larger car photo.

## [0.2.5] – 2026-10-30

### Changed
- Phones: the overview shows the vehicles as compact cards in two columns.
- Phones: new car page – own top bar, small photo next to the name, key figures in one row, tiles that open
  vehicle data, photos and documents, compact reminders and history, and the main actions fixed at the bottom.

## [0.2.4] – 2026-10-30

### Fixed
- Costs: the “Where does the money go?” bar was hidden by ad blockers such as uBlock Origin (they hide elements named like social “share” bars)
- Overview: long car names no longer push the stats and reminders of a card down (one line with “…”, full name as tooltip); long reminder titles keep their date visible

## [0.2.3] – 2026-10-30

### Fixed
- After an update, browsers could keep an old style.css together with the new app.js (e.g. the cost shares bar was missing); the website files are now always revalidated
- Cost tiles: the amounts are on one line even when a tile has no second line (e.g. no previous year or no mileage)

## [0.2.2] – 2026-10-30

### Added
- PDF previews: the server renders the first 5 pages of PDF receipts and documents (poppler in the Docker image), so a click on a receipt shows them in the viewer in every browser, phones included. Existing PDFs get their previews within a few minutes after the update
- Cost analysis per car or for all vehicles (click “Costs 20xx” on the car page, the yearly costs on a car card or the total on the overview): totals compared with the same period of the previous year, average per month, cost per km, projection for the year; “Where does the money go?” bar; bars per month by type or as total with the previous year behind, the average and an estimate for the rest of the year; table per type with a link to the filtered history. All years: running costs since purchase, average per full year, total including the purchase price, bars per year. All vehicles: costs per vehicle and bars by vehicle. Compact layout with the table next to the chart (fits on one screen); a switch shows everything below each other instead
- New viewer for photos, images and PDFs: page counter, zoom (buttons or +/−/0), download, arrow keys to switch between the files of an entry; PDFs with more than 5 pages link to the original

### Changed
- Documents without a photo show the first page of their PDF as preview
- History: dates always with the year (19.10.2026)
- Docker image: about 40 MB larger because of poppler and the Liberation fonts

## [0.2.1] – 2026-10-21

### Added
- Reminder notifications by e-mail (needs `SMTP_HOST` and `MAIL_FROM`) and push to the phone (ntfy directly, Telegram, Pushover … via an Apprise server, `APPRISE_URL`). Every user chooses under Settings › Notifications: time, days before (30, 14, 7, 1, on the day – estimated for mileage reminders), frequency (only when new, daily, weekly) and how often overdue items are repeated; with a preview of the next mail and a test button. `NOTIFY_HOUR` sets the default time; `DEMO_DISABLED=notify` hides it for the demo user
- Settings with a side menu (display, notifications, data & backup, account, administration)
- Vehicle data: tyre sizes (summer and winter tyres)
- Car cards show the last entry (“Last: Service · date”) below the reminder timeline again
- Vehicle data: choose per car which 2–4 fields are shown (default: VIN and type approval); with an own choice only these are shown, the rest via “show more fields”

### Changed
- Phones: smaller car photo on the car page
- Opening another page starts at the top instead of keeping the scroll position

## [0.2.0] – 2026-10-21

### Added
- Reminders: recurring maintenance due at a mileage and/or a date (e.g. oil change every 15'000 km or 12 months). Set them when adding an entry (“Remind me next time”) or on the car page; the next MFK from the vehicle data counts as a reminder too
- Overview: “Due soon” board with the columns overdue, this week and later; calendar leaf per reminder, check button to log it as done, the same reminder on several cars grouped. Car cards show a timeline of their due reminders around today (with legend), plus costs this year and cost per km
- Car page: sidebar with photo, actions, vehicle data, photos and documents; key figures (mileage, costs this year with a mini chart per month, cost per km excluding fuel); reminders grouped by due date, several due on the same day can be logged as done together
- Service history as PDF (print view of the car's history)
- Entry dialog: templates (oil change, tyre change, MFK, fuel, wiper blades and own templates), last mileage and cost as hints, recently used workshops, “Save & add another”, drag & drop or paste (Ctrl+V) of receipts
- New entry type “Fuel”
- Search across all vehicles and entries in the header (shortcut `/`)
- Phones: quick entry sheet (fuel / service / receipt photo, mileage stepper) and the number of due items in the header
- Backups include reminders and documents
- Documents per vehicle (registration, driving licence, insurance, warranty, other) with photo or PDF and an optional expiry date, optionally with a reminder 30 days before it expires. Existing entries of type “Documents / registration” are moved there automatically
- Receipts of an entry are shown as file chips (PDF, JPG) in the history
- Display size in the header (80–140 %), remembered per device
- “Due soon” on the home page can be collapsed (summary per column); Settings › Display: open, collapsed or remember the last state

### Changed
- New design: darker palette, smaller car cards (up to four per row), compact history rows (click to expand), filter chips per type with counts; the history no longer contains documents
- With CHF, numbers and dates use the Swiss format (15'000, 21.10.2026)

## [0.1.7] – 2026-10-18

### Added
- Footer on the settings page: version with a link to its release notes, links to GitHub and to report a bug, copyright and license
- French user interface (Français): switch the language under Settings or on the login page
- New entry type “Documents / registration” (Dokumente / Ausweis), also available as a filter in the history; its photos and PDFs are shown as thumbnails on the car page (below the vehicle data) and via a new button on each car card
- `MAX_FILE_SIZE_MB` in `.env`: max. size per uploaded photo or receipt (default 20 MB)
- `USER_STORAGE_LIMIT_MB` in `.env`: max. storage per user for photos and receipts; the settings show the storage used (admins see it for every user in the user list)
- `ALLOWED_FILE_TYPES` in `.env`: allowed upload types `pdf`, `jpg`, `png` (default `pdf,jpg`); other file types are rejected
- CarMaint is now licensed under the AGPL-3.0 (license in the README and in the Docker image metadata)
- New releases are announced automatically on the Discord server

### Changed
- The app icon is shown left of the CarMaint logo (header and login page)
- The car model is shown slightly lighter than the make (car cards and car page)
- Settings: selectors and buttons are always right-aligned next to their description; on phones the buttons use the full width
- The UI starts in the browser language (German, English, Spanish or French); `DEFAULT_LANGUAGE` is now only used for other browser languages and defaults to `en`
- Images keep their format when shrunk before uploading (PNG stays PNG instead of being converted to JPG)

## [0.1.6] – 2026-10-17

### Added
- Spanish user interface: switch the language under Settings or on the login page; `DEFAULT_LANGUAGE=es` sets it as default

### Changed
- On phones, the selectors in the settings (language, currency, vehicle data) use the full width

## [0.1.5] – 2026-10-17

### Changed
- Favicon is easier to see in browser tabs: orange background with a dark speedometer; the same icon is used for the iOS home screen and as `favicon.ico`

## [0.1.4] – 2026-10-17

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

[Unreleased]: https://github.com/seals187/carMaint/compare/v0.2.9...HEAD
[0.2.9]: https://github.com/seals187/carMaint/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/seals187/carMaint/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/seals187/carMaint/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/seals187/carMaint/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/seals187/carMaint/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/seals187/carMaint/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/seals187/carMaint/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/seals187/carMaint/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/seals187/carMaint/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/seals187/carMaint/compare/v0.1.7...v0.2.0
[0.1.7]: https://github.com/seals187/carMaint/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/seals187/carMaint/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/seals187/carMaint/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/seals187/carMaint/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/seals187/carMaint/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/seals187/carMaint/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/seals187/carMaint/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/seals187/carMaint/releases/tag/v0.1.0
