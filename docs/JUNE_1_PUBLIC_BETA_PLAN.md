# June 1 Public Beta Plan

Target date: `2026-06-01`

The target is not "huge forever game". The realistic target is a public beta that can be promoted honestly:

`A dark online co-op mystery extraction RPG with two playable cases, account progression, multiplayer visibility, puzzles, inventory, cosmetic shop scaffold and Windows installer through GitHub Releases.`

## Current Public Pitch

Players enter Null District as Lumorix operators. Each run is a case. They recover evidence, solve corrupted systems, survive signal entities, extract proof to Signal Haven and unlock lore, profile progress and cosmetics.

## Must Be Solid Before June 1

- Account register/login works against the Strato backend.
- Windows installer downloads from GitHub Releases.
- Launcher catalog can install/start the game.
- Two cases are playable end to end.
- At least two players can join one instance and see each other.
- Case 002 co-op sync can be completed by two players.
- Shop is clearly cosmetics/supporter only.
- No real Stripe live charges until legal/support/refund text and webhook secrets are configured.
- No hardcoded secrets.
- Server status endpoint is public.

## Content Target

### Case 001: The First Signal

- Signal Haven
- District Entrance
- Underground Sector A
- First Relay puzzle
- Broken Terminal puzzle
- Evidence fragments
- Relay Core
- Extraction in Signal Haven

### Case 002: Mirror Archive

- Mirror Archive
- Blackout Theater
- Echo Residues
- Twin Sync co-op node puzzle
- Mirror Cipher puzzle
- Blackout Reel
- Mirror Case extraction

## Asset Work Needed First

1. Player base animations.
2. Signal Haven and District Entrance tiles/backgrounds.
3. First Relay and Broken Terminal sprites.
4. Mirror Archive tiles/backgrounds.
5. Sync nodes and Echo Residue pickups.
6. Blackout Theater tiles/backgrounds.
7. Wraith/Scout sprites.
8. Main menu key art.
9. Launcher capsule/banner/cover art.
10. Ambient loops and UI sounds.

Full asset list: `docs/ASSET_BRIEF.md`.

## Stripe / In-App Purchase Order

Do this only after the beta is stable:

1. Keep shop in test mode.
2. Add support/refund contact text.
3. Add age/parental purchase warning.
4. Configure `STRIPE_SECRET_KEY`.
5. Configure `STRIPE_WEBHOOK_SECRET`.
6. Enable webhook signature verification.
7. Test checkout in Stripe test mode.
8. Only then consider live products.

Allowed paid content:

- Founder cosmetics.
- Skins.
- Titles.
- Banners.
- Emotes.
- Pets.
- Premium currency for cosmetics only.

Not allowed:

- Stronger weapons.
- Stronger armor.
- Paid XP power.
- Paid quest skips that affect progression.

## Daily Build Checklist

Before a build:

```powershell
npm run typecheck
npm run lint
npm test
npm run build:server
npm run build:desktop
```

Before a public release:

```powershell
npm run release:beta
npm install --package-lock-only
npm run typecheck
npm run lint
npm test
git status --short
```

## Screenshot / Trailer Checklist

Capture:

- Login/register screen.
- Character select.
- Signal Haven with Case Board.
- District Entrance puzzle.
- Underground Sector A combat pressure.
- Mirror Archive with two players.
- Sync node solved notice.
- Mirror Cipher puzzle.
- Blackout Theater projector.
- Extraction reward overlay.
- Shop showing cosmetics-only policy.

## Risks

- A "massive" game by June 1 is not realistic without assets and playtesting.
- A strong public beta by June 1 is realistic if scope stays focused on cases, mystery, co-op and presentation.
- Real-money purchases should not go live until Stripe webhooks, support/refund flow and legal text are checked.
