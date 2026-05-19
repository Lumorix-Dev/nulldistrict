# Lumorix: Null District

Dark 2D side-view online mystery RPG beta for PC. This repository is the standalone game app, not the Lumorix Launcher.

## What Is Built

- `apps/desktop`: Tauri v2 + React + TypeScript + Vite + Phaser game client.
- `apps/server`: Node.js + TypeScript + Express + Socket.IO backend.
- `apps/admin`: API-first admin panel scaffold.
- `packages/shared`: shared types, schemas, constants and Socket.IO event contracts.
- `packages/game-data`: editable quests, items, cosmetics, shop products, skills and maps.
- `assets`: replacement-ready pixel-art asset folders.

## Local Requirements

- Node.js 20.11+.
- Rust stable with Tauri desktop prerequisites.
- Docker for local PostgreSQL, or a Strato/PostgreSQL `DATABASE_URL`.
- npm 10+.

## Install

```bash
cd nulldistrict
npm install
cp .env.example .env
```

## Database

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
```

Default local database URL:

```bash
postgresql://nulldistrict:nulldistrict@localhost:5432/nulldistrict?schema=public
```

## Run Locally

```bash
npm run dev
```

Default URLs:

- Desktop web dev surface: `http://127.0.0.1:1420`
- Backend API: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`
- Server status: `http://localhost:4000/api/status`

To run the native Tauri window:

```bash
npm run dev -w @nulldistrict/server
npm run tauri -w @nulldistrict/desktop -- dev
```

## Build

```bash
npm run build:shared
npm run build:server
npm run build:desktop
```

Windows desktop bundle:

```bash
npm run build:shared
npm run build:server
npm run build:tauri -w @nulldistrict/desktop
```

## GitHub Release

```bash
npm run release:beta
git add .
git commit -m "Release v0.1.0-beta.2"
git tag v0.1.0-beta.2
git push origin main --tags
```

The release workflow builds Windows installer artifacts and uploads them to the GitHub Release.

First-time GitHub setup helper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/github-release-now.ps1
```

Use `-Visibility public` only if the source code may be public and testers should download releases without a GitHub login.

## Environment Variables

See `.env.example` for:

- `DATABASE_URL`
- `JWT_SECRET`
- `SERVER_PORT`
- `CLIENT_ORIGIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SHOP_ENABLED`
- `PREMIUM_PURCHASES_ENABLED`
- `TAURI_UPDATE_PUBLIC_KEY`
- `GITHUB_REPO`
- `RELEASE_CHANNEL`

## Known Limitations

- Movement is client-predicted; important rewards and purchases are server-side.
- Stripe is scaffolded and disabled unless secrets are configured.
- Party matching is a scaffold; rooms already support 4-8 player instances.
- Placeholder pixel textures are generated at runtime until final art lands.
- Tauri update signing needs real keys before public production releases.

## Asset Placement

- Characters: `assets/sprites/characters`
- Enemies: `assets/sprites/enemies`
- Tilesets: `assets/tilesets`
- Backgrounds: `assets/backgrounds`
- UI icons: `assets/ui/icons`
- Cosmetics: `assets/sprites/cosmetics`
- Pets: `assets/pets`
- Particles: `assets/ui/particles`
- Audio: `assets/audio`
