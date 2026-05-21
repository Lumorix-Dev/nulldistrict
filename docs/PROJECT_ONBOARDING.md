# Project Onboarding

This file is for new contributors who need to understand where things live and how Lumorix: Null District ships.

## What This Project Is

`Lumorix: Null District` is a standalone PC game. It is not the Lumorix Launcher. The Launcher later downloads and starts this game from GitHub Releases.

The current game loop is:

1. Player logs in.
2. Player creates a character.
3. Player enters Signal Haven.
4. Player explores instanced side-view areas.
5. Player solves case objectives, recovers evidence and extracts the case in Signal Haven.
6. Backend validates account, quests, inventory, shop and multiplayer state.

## Folder Map

- `apps/desktop`: Tauri desktop app, React UI, Phaser game scenes.
- `apps/server`: Node/Express/Socket.IO backend, Prisma database access.
- `apps/admin`: simple admin scaffold.
- `packages/shared`: shared TypeScript types, constants and validation schemas.
- `packages/game-data`: editable game content: maps, quests, cases, items, cosmetics, shop data.
- `assets`: source asset drop zone for pixel art, UI, audio and video.
- `docs`: setup, release, deployment, design and production docs.
- `.github/workflows`: GitHub Actions for Windows builds and server checks.

## Main Runtime Files

- React game shell: `apps/desktop/src/game/GameView.tsx`
- Phaser scene registration: `apps/desktop/src/game/createGame.ts`
- Shared side-view gameplay scene: `apps/desktop/src/game/scenes/BaseSideViewScene.ts`
- Realtime client: `apps/desktop/src/game/network/realtime.ts`
- REST API client: `apps/desktop/src/api/client.ts`
- Socket.IO server: `apps/server/src/realtime/socketServer.ts`
- Server world authority: `apps/server/src/realtime/worldState.ts`
- Run extraction route: `apps/server/src/routes/runs.ts`
- Database schema: `apps/server/prisma/schema.prisma`
- Seed data loader: `apps/server/prisma/seed.ts`

## Adding A New Case

Add content in this order:

1. Add new quest IDs in `packages/shared/src/constants.ts`.
2. Add quest definitions in `packages/game-data/src/quests.ts`.
3. Add item definitions in `packages/game-data/src/items.ts`.
4. Add case definition in `packages/game-data/src/cases.ts`.
5. Add map/area entries or interactables in `packages/game-data/src/maps.ts`.
6. Add puzzle definitions in `packages/game-data/src/puzzles.ts`.
7. If the area is new, add a Phaser scene in `apps/desktop/src/game/scenes/` and register it in `apps/desktop/src/game/createGame.ts`.
8. If the mechanic needs server authority, add it to `apps/server/src/realtime/worldState.ts` or a REST route.
9. Run `npm run typecheck`, `npm run lint`, `npm test`.

## Asset Upload Rules

Put raw work in `assets` first. Keep names stable and lowercase.

- Player sprites: `assets/sprites/characters/`
- Enemy sprites: `assets/sprites/enemies/`
- Objects/interactables: `assets/sprites/objects/`
- Tilesets: `assets/sprites/tilesets/`
- UI icons and frames: `assets/ui/icons/`, `assets/ui/frames/`
- Launcher assets: `assets/ui/launcher/`
- Audio: `assets/audio/`
- Trailer footage/reference: `assets/video/`

Recommended naming:

- `signal-runner_idle_strip.png`
- `signal-runner_run_strip.png`
- `mirror-archive_tileset.png`
- `archive-sync-node_armed.png`
- `blackout-theater_ambient_loop.wav`

After assets are ready, wire them in `apps/desktop/src/game/scenes/PreloadScene.ts` and replace placeholder texture keys gradually.

## Local Development

From repo root:

```powershell
npm ci
npm run build:shared
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Desktop app URL during dev: `http://127.0.0.1:1420`

Local backend: `http://localhost:4000`

## Strato Server Deployment

Current server target:

- IP: `217.160.79.250`
- App path: `/var/www/nulldistrict`
- Process manager: `pm2`
- Public API: `http://217.160.79.250/api/status`

Deploy process:

1. Upload latest repo archive to `/var/www/nulldistrict`.
2. Keep `.env` on server; never commit secrets.
3. Run `npm ci`.
4. Run `npm run build:shared`.
5. Run `npm run db:generate`.
6. Run `npm run db:seed`.
7. Run `npm run build:server`.
8. Restart `pm2 restart nulldistrict-server`.
9. Verify `curl http://localhost:4000/api/status`.

Full details live in `docs/DEPLOYMENT_STRATO.md`.

## GitHub Release Flow

The goal is simple: push a version tag, get a Windows installer in GitHub Releases.

Normal flow:

```powershell
npm run release:beta
npm install --package-lock-only
npm run typecheck
npm run lint
npm test
git add .
git commit -m "release: prepare null district beta X"
git tag v0.1.0-beta.X
git push origin main
git push origin v0.1.0-beta.X
```

GitHub Actions creates the release and uploads:

- Windows setup exe
- portable zip
- launcher manifest JSON

Full details live in `docs/RELEASES_GITHUB.md`.

## Launcher Integration

Launcher repo:

- `C:\Users\julia\Documents\launcher`

After a game release:

1. Download the new `lumorix-null-district.manifest.json` from the GitHub Release.
2. Place it in the launcher at:
   - `distribution/manifests/games/lumorix-null-district.json`
   - `src-tauri/manifests/lumorix-null-district.json`
3. Update `distribution/manifests/catalog.json` to point to the new raw manifest URL.
4. Run launcher validation and typecheck.
5. Commit and push launcher.

## Production Rule

Gameplay rewards, purchases, inventory, quest completion and premium currency must be server-authoritative. The client can predict movement and UI, but the backend decides progression.
