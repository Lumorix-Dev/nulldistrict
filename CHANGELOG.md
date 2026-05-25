# Changelog

## [Unreleased]

## v0.1.0-beta.9

- Rebuilt the desktop game flow around a solo escape-room campaign instead of the old online account shell.
- Added offline-first case files, active-slot tracking, room unlock progression, best times and persistent local campaign stats.
- Reworked the main menu, save select, campaign board, tutorial, achievements, credits, pause menu and settings copy to match the new solo identity.
- Wired puzzle completion directly into save progression so each cleared room advances the campaign and unlocks the secret sixth chamber.
- Updated launcher and release metadata to describe the new solo escape-room product correctly.

## v0.1.0-beta.6

- Added `Case 002: Mirror Archive` with new evidence, quests, extraction data and case-board support.
- Added playable `Mirror Archive` and `Blackout Theater` areas with transitions, pickups, terminals, enemies and puzzle hooks.
- Added server-authoritative co-op sync node mechanic for the Archive, including multiplayer reward updates and a solo beta reroute fallback.
- Generalized case extraction so future cases can use the same backend route instead of hardcoded Case 001 logic.
- Added project onboarding and June 1 public beta planning docs for contributors, uploads, releases and asset production.

## v0.1.0-beta.5

- Reworked the core direction into a co-op mystery extraction loop: recover evidence, solve route puzzles, bring proof back to Signal Haven and bank case rewards.
- Added `Case 001: The First Signal` data, extraction validation and server-side extraction rewards.
- Added a Case Board HUD with squad count, objective state and extract readiness.
- Moved the in-game shop behind Signal Haven context and reduced combat rewards so enemies act as hazards instead of the main progression path.
- Added a flagship asset brief for pixel art, UI, audio and trailer capture.

## v0.1.0-beta.4

- Shifted the beta direction toward mystery-first puzzle gameplay instead of fight-first progression.
- Added server-validated signal sequence puzzles for the First Relay and Broken Terminal.
- Added a puzzle overlay, puzzle rejection feedback, lore reward flow and puzzle-gated breach access.

## v0.1.0-beta.3

- Updated Socket.IO/WebSocket dependency lockfile after audit so the released Windows build and server install use the patched dependency set.

## v0.1.0-beta.2

- Added stronger beta gameplay loop: locked Sector A progression, enemy HP bars, enemy ranged pressure, usable med patches, combat notices, and clearer quest objective/reward feedback.
- Added more pickups and enemy spawns to make the first areas less empty.
- Hardened the shop backend for future Stripe Checkout sessions with user metadata, pending purchase records, webhook fulfillment, and purchase history.

## v0.1.0-beta.1

- Initial playable beta foundation for Lumorix: Null District.
- Standalone Tauri v2 desktop app with React menus and Phaser side-view gameplay.
- Node.js/TypeScript backend with REST auth, Socket.IO multiplayer rooms, Prisma schema, shop scaffold, and admin scaffold.
- GitHub Actions release workflow for Windows installer artifacts on `v*` tags.
