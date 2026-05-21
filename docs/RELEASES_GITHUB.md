# GitHub Releases

Lumorix: Null District owns its own app version and GitHub Releases flow. The Lumorix Launcher can later read the release manifest and launch the installed executable.

## Version

Current target: `v<package.json version>`.

Version lives in:

- Root `package.json`.
- `apps/desktop/package.json`.
- `apps/server/package.json`.
- `packages/shared/package.json`.
- `packages/game-data/package.json`.
- `apps/desktop/src-tauri/tauri.conf.json`.
- `apps/desktop/src-tauri/Cargo.toml`.

Use scripts:

```bash
npm run version:patch
npm run version:minor
npm run release:beta
```

## Tag Release

```bash
git status
git add .
git commit -m "Release v0.1.0-beta.X"
git tag v0.1.0-beta.X
git push origin main --tags
```

Tags matching `v*` run `.github/workflows/release.yml`.

## One-Command GitHub Setup

On Windows, after GitHub CLI login works:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/github-release-now.ps1
```

Default behavior:

- Creates a private GitHub repo named `nulldistrict` if no `origin` exists.
- Pushes `main`.
- Uses the current package version tag (for example `v0.1.0-beta.7`) unless `-Tag` is provided.
- Triggers the release workflow.

If you want anyone without GitHub login to download the EXE from GitHub Releases, the repository must be public:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/github-release-now.ps1 -Visibility public
```

Private is safer for source code. Public is easier for external testers.

The release workflow injects:

```env
VITE_SERVER_URL=http://217.160.79.250
```

That means GitHub-built Windows installers connect to the current Strato beta backend by default. Replace this with the future HTTPS domain later, for example `https://api.lumorix.de`.

The same release workflow also uploads Lumorix Launcher assets:

- `lumorix-null-district-win64.zip`
- `lumorix-null-district.manifest.json`
- `lumorix-null-district-win64.sha256.txt`

The Launcher installs the ZIP package, verifies its SHA-256 hash, then launches `lumorix-null-district.exe` from the selected Lumorix library folder.

## What The Workflow Does

- Installs dependencies.
- Generates Prisma client.
- Builds shared packages.
- Builds server.
- Runs tests.
- Builds Tauri Windows x64 bundles.
- Creates or updates the GitHub Release.
- Uploads installer artifacts.

Windows artifacts appear on the GitHub Release attached to the tag. NSIS setup executables are used for beta releases because MSI does not accept prerelease identifiers like `0.1.0-beta.1`.

For testers, the simplest path is:

1. Open the repository on GitHub.
2. Click **Releases**.
3. Open the newest `v...` release.
4. Download `Lumorix Null District_..._x64-setup.exe`.
5. Install and start the game.

## Updater Preparation

Tauri updater config is present with:

- `bundle.createUpdaterArtifacts=false` for unsigned local beta builds.
- `plugins.updater.pubkey` placeholder.
- GitHub latest JSON endpoint placeholder.

Before public auto-updates:

1. Generate Tauri signing keys.
2. Store private key/password in GitHub Actions secrets.
3. Replace `TAURI_UPDATE_PUBLIC_KEY_PLACEHOLDER`.
4. Set `bundle.createUpdaterArtifacts=true`.
5. Keep `latest.json` attached to GitHub Releases or serve compatible metadata from an update server.

## Manual Release If Automation Fails

On a Windows machine:

```bash
npm ci
npm run db:generate
npm run build:shared
npm run build:server
npm run build:tauri -w @nulldistrict/desktop
```

Upload files from `apps/desktop/src-tauri/target/release/bundle` to a GitHub Release manually.

## Lumorix Launcher Compatibility

Use `docs/lumorix-launcher-manifest.example.json` as the launcher integration contract. The launcher should read:

- Game id.
- Version.
- Release channel.
- Installer artifact pattern.
- Executable path.
- GitHub update URL.

The launcher should install and launch this standalone executable rather than embedding or rebuilding the game.
