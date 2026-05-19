import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2];
if (!["patch", "minor", "beta"].includes(mode)) {
  console.error("Usage: node scripts/bump-version.mjs <patch|minor|beta>");
  process.exit(1);
}

const root = process.cwd();
const files = [
  "package.json",
  "apps/desktop/package.json",
  "apps/server/package.json",
  "packages/shared/package.json",
  "packages/game-data/package.json"
];

const rootPkgPath = path.join(root, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const current = rootPkg.version;

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/);
  if (!match) throw new Error(`Unsupported semver format: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    beta: match[4] ? Number(match[4]) : undefined
  };
}

function nextVersion(version, bump) {
  const parsed = parseVersion(version);
  if (bump === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (bump === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  const beta = parsed.beta === undefined ? 1 : parsed.beta + 1;
  return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.${beta}`;
}

const next = nextVersion(current, mode);

for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.version = next;
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

const tauriConfig = path.join(root, "apps/desktop/src-tauri/tauri.conf.json");
if (fs.existsSync(tauriConfig)) {
  const config = JSON.parse(fs.readFileSync(tauriConfig, "utf8"));
  config.version = next;
  fs.writeFileSync(tauriConfig, `${JSON.stringify(config, null, 2)}\n`);
}

const cargoToml = path.join(root, "apps/desktop/src-tauri/Cargo.toml");
if (fs.existsSync(cargoToml)) {
  const contents = fs.readFileSync(cargoToml, "utf8").replace(
    /^version = ".*"$/m,
    `version = "${next}"`
  );
  fs.writeFileSync(cargoToml, contents);
}

console.log(`Bumped Lumorix: Null District to ${next}`);
