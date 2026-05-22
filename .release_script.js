const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Change to repo directory
process.chdir('c:\\Users\\julia\\Documents\\Null Distrikt\\nulldistrict');

// Step 1: Update manifest
console.log('=== Step 1: Updating manifest.json ===');
const file = path.join(process.cwd(), 'launcher-release', 'lumorix-null-district.manifest.json');
let content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const m = JSON.parse(content);
m.version = '0.1.0-beta.8';
m.download.url = 'https://github.com/Lumorix-Dev/nulldistrict/releases/download/v0.1.0-beta.8/lumorix-null-district-win64.zip';
m.changelog = [
  {
    version: '0.1.0-beta.8',
    date: '2026-05-22',
    items: [
      'VoidCraft: Complete creative sandbox and puzzle game now built into Null District.',
      'Creative Mode: Place 37 block types across 3 layers, flood fill, undo/redo, brush sizes, copy/paste.',
      '6 Escape Rooms including secret bonus level THE NULL CORE (unlocked after all 5).',
      'Procedural world generation with 5 themes: cyberpunk-city, cave, void-space, neon-forest, ruins.',
      'Co-op multiplayer for 1-4 players with real-time tile sync and remote cursors.',
      'Achievement system with 20 achievements and persistent progress.',
      'In-game level editor: build and test custom escape rooms, export/import JSON.',
      'Camera effects: screen shake, zoom pulse, slow-motion, flash on all key interactions.',
      'Full Settings scene: audio sliders, display toggles, keybindings reference.',
      'Save system with 3 slots, leaderboard, stats screen, tutorial, and credits.'
    ]
  },
  {
    version: '0.1.0-beta.1',
    date: '2026-05-19',
    items: [
      'First launcher-ready beta package for the standalone Null District desktop client.',
      'Connects to the live Strato backend for accounts, characters, multiplayer, quests, inventory and shop catalog.',
      'Includes Signal Haven, District Entrance, Underground Sector A and PvP Breach Zone vertical-slice content.'
    ]
  }
];
fs.writeFileSync(file, JSON.stringify(m, null, 2));
console.log('✓ Manifest updated OK');

// Step 2: Verify manifest
console.log('\n=== Step 2: Verifying manifest ===');
const m2 = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('version:', m2.version);
console.log('changelog entries:', m2.changelog.length);
console.log('first changelog:', m2.changelog[0].version);

// Step 3: Stage and commit
console.log('\n=== Step 3: Staging and committing ===');
try {
  execSync('git add -A', { stdio: 'inherit' });
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log('Git status:');
  console.log(status);
  
  if (status.trim()) {
    execSync('git commit -m "release: bump to v0.1.0-beta.8 - VoidCraft game update" -m "- Bump all package versions to 0.1.0-beta.8\\n- Update launcher manifest with VoidCraft changelog\\n- All VoidCraft game files committed\\n\\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"', { stdio: 'inherit' });
    console.log('✓ Commit succeeded');
  } else {
    console.log('✓ Nothing to commit');
  }
} catch (e) {
  console.log('Git command failed:', e.message);
}

// Step 4: Push to GitHub
console.log('\n=== Step 4: Pushing to GitHub ===');
try {
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✓ Push succeeded');
} catch (e) {
  console.log('Push output:', e.message);
}

// Step 5: Create git tag
console.log('\n=== Step 5: Creating git tag ===');
try {
  execSync('git tag v0.1.0-beta.8', { stdio: 'inherit' });
  console.log('✓ Tag created');
  execSync('git push origin v0.1.0-beta.8', { stdio: 'inherit' });
  console.log('✓ Tag pushed');
} catch (e) {
  console.log('Tag creation/push output:', e.message);
}

// Step 6: Create GitHub release
console.log('\n=== Step 6: Creating GitHub release ===');
try {
  execSync('gh release create v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update" --notes "## VoidCraft - Complete Game Update\\n\\nA full creative sandbox + puzzle game is now built into Null District.\\n\\n### New Content\\n- Creative Mode with 37 block types, procedural worlds (5 themes), co-op sync\\n- 6 Escape Rooms (5 main + secret bonus \'THE NULL CORE\')\\n- 20 Achievements, leaderboard, stats, save slots\\n- In-game level editor, tutorial, credits scene\\n- Camera effects, full audio system, particle effects\\n\\nAccess VoidCraft from the main menu via the VoidCraft button." launcher-release/lumorix-null-district-win64.zip launcher-release/lumorix-null-district.manifest.json', { stdio: 'inherit' });
  console.log('✓ Release created');
} catch (e) {
  console.log('Release creation output:', e.message);
  console.log('Trying to edit existing release...');
  try {
    execSync('gh release edit v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update"', { stdio: 'inherit' });
    console.log('✓ Release edited');
  } catch (e2) {
    console.log('Edit output:', e2.message);
  }
}

// Final: Get release URL
console.log('\n=== Final: Getting release URL ===');
try {
  const url = execSync('gh release view v0.1.0-beta.8 --json url -q .url', { encoding: 'utf8' });
  console.log('Release URL:', url.trim());
} catch (e) {
  console.log('Could not get release URL:', e.message);
}
