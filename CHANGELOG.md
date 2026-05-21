# Changelog

## v0.1.0-beta.2

- Added stronger beta gameplay loop: locked Sector A progression, enemy HP bars, enemy ranged pressure, usable med patches, combat notices, and clearer quest objective/reward feedback.
- Added more pickups and enemy spawns to make the first areas less empty.
- Hardened the shop backend for future Stripe Checkout sessions with user metadata, pending purchase records, webhook fulfillment, and purchase history.

## v0.1.0-beta.1

- Initial playable beta foundation for Lumorix: Null District.
- Standalone Tauri v2 desktop app with React menus and Phaser side-view gameplay.
- Node.js/TypeScript backend with REST auth, Socket.IO multiplayer rooms, Prisma schema, shop scaffold, and admin scaffold.
- GitHub Actions release workflow for Windows installer artifacts on `v*` tags.
