#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const tag = `v${version}`;
const manifestPath = path.join(root, "launcher-release", "lumorix-null-district.manifest.json");
const downloadUrl = `https://github.com/Lumorix-Dev/nulldistrict/releases/download/${tag}/lumorix-null-district-win64.zip`;
const releaseDate = new Date().toISOString().slice(0, 10);

const releaseNotes = `## Solo Escape Room Campaign Update

Null District is now packaged and released as an offline-first solo escape-room campaign.

### Included in ${tag}
- Direct offline desktop flow without login or account gating
- Case files, room unlock progression and persistent local best times
- Six handcrafted puzzle rooms, including the hidden sixth chamber
- Reworked campaign board, tutorial, achievements, credits, pause menu and settings
- Launcher manifest and release metadata aligned with the new solo product direction`;

console.log("=== STEP 1: Update manifest.json ===");
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
  manifest.version = version;
  manifest.releaseDate = releaseDate;
  manifest.description = "A dark 2D side-view solo escape-room campaign beta set inside the sealed Null District, featuring six handcrafted puzzle rooms, local case-file progression and atmospheric platforming.";
  manifest.categories = ["Puzzle", "Mystery", "Adventure", "Singleplayer"];
  manifest.tags = [
    { id: "mystery", weight: 3 },
    { id: "escape_room", weight: 3 },
    { id: "puzzle", weight: 3 },
    { id: "pixel_art", weight: 2 },
    { id: "singleplayer", weight: 2 },
    { id: "dark_sci_fi", weight: 2 }
  ];
  manifest.download.url = downloadUrl;
  manifest.changelog = [
    {
      version,
      date: releaseDate,
      items: [
        "Rebuilt the desktop game as an offline-first solo escape-room campaign.",
        "Added case files, campaign room unlocks, local best times and persistent progression.",
        "Updated menus, tutorial, credits, achievements and settings for the new solo investigation loop."
      ]
    },
    ...(manifest.changelog ?? [])
  ].filter((entry, index, array) => array.findIndex((candidate) => candidate.version === entry.version) === index);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("Manifest updated OK\n");
} catch (error) {
  console.error("Step 1 failed:", error.message);
  process.exit(1);
}

console.log("=== STEP 2: Stage and commit ===");
try {
  execSync("git add -A", { stdio: "inherit" });
  const status = execSync("git status --short", { encoding: "utf8" });
  console.log(status || "No pending changes");

  if (status.trim()) {
    execSync(`git commit -m "release: bump to ${tag}"`, { stdio: "inherit" });
    console.log("Commit created\n");
  }
} catch (error) {
  console.error("Step 2 failed:", error.message);
  process.exit(1);
}

console.log("=== STEP 3: Push main ===");
try {
  execSync("git push origin main", { stdio: "inherit" });
  console.log("Push completed\n");
} catch (error) {
  console.error("Step 3 failed:", error.message);
  process.exit(1);
}

console.log("=== STEP 4: Tag and push ===");
try {
  try {
    execSync(`git tag ${tag}`, { stdio: "inherit" });
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
  }
  execSync(`git push origin ${tag}`, { stdio: "inherit" });
  console.log("Tag pushed\n");
} catch (error) {
  console.error("Step 4 failed:", error.message);
  process.exit(1);
}

console.log("=== STEP 5: Create or update GitHub release ===");
try {
  try {
    execSync(
      `gh release create ${tag} --title "Lumorix: Null District ${tag} - Solo Escape Room Campaign" --notes "${releaseNotes.replace(/"/g, '\\"')}" launcher-release/lumorix-null-district-win64.zip launcher-release/lumorix-null-district.manifest.json launcher-release/lumorix-null-district-win64.sha256.txt`,
      { stdio: "inherit" }
    );
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
    execSync(
      `gh release edit ${tag} --title "Lumorix: Null District ${tag} - Solo Escape Room Campaign" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
      { stdio: "inherit" }
    );
  }
  console.log("Release updated\n");
} catch (error) {
  console.error("Step 5 failed:", error.message);
  process.exit(1);
}
