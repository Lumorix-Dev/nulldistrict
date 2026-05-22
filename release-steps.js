#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== STEP 1: Update manifest.json ===');
try {
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
  console.log('✓ Manifest updated OK\n');
} catch (e) {
  console.error('✗ Step 1 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 2: Verify manifest ===');
try {
  const m = JSON.parse(fs.readFileSync('launcher-release/lumorix-null-district.manifest.json', 'utf8'));
  console.log('version:', m.version);
  console.log('changelog entries:', m.changelog.length);
  console.log('first changelog:', m.changelog[0].version);
  console.log('✓ Verification OK\n');
} catch (e) {
  console.error('✗ Step 2 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 3: Stage and commit ===');
try {
  execSync('git add -A', { stdio: 'inherit' });
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log('Git status:');
  console.log(status);
  
  if (status.trim()) {
    execSync('git commit -m "release: bump to v0.1.0-beta.8 - VoidCraft game update" -m "- Bump all package versions to 0.1.0-beta.8\n- Update launcher manifest with VoidCraft changelog\n- All VoidCraft game files committed\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"', { stdio: 'inherit' });
    console.log('✓ Commit created\n');
  } else {
    console.log('✓ No changes to commit\n');
  }
} catch (e) {
  console.error('✗ Step 3 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 4: Push to GitHub ===');
try {
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✓ Push completed\n');
} catch (e) {
  console.error('✗ Step 4 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 5: Create git tag ===');
try {
  try {
    execSync('git tag v0.1.0-beta.8', { stdio: 'inherit' });
    console.log('✓ Tag created');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('✓ Tag already exists, skipping');
    } else {
      throw e;
    }
  }
  execSync('git push origin v0.1.0-beta.8', { stdio: 'inherit' });
  console.log('✓ Tag pushed\n');
} catch (e) {
  console.error('✗ Step 5 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 6: Create GitHub release ===');
try {
  const releaseNotes = `## VoidCraft - Complete Game Update

A full creative sandbox + puzzle game is now built into Null District.

### New Content
- Creative Mode with 37 block types, procedural worlds (5 themes), co-op sync
- 6 Escape Rooms (5 main + secret bonus 'THE NULL CORE')
- 20 Achievements, leaderboard, stats, save slots
- In-game level editor, tutorial, credits scene
- Camera effects, full audio system, particle effects

Access VoidCraft from the main menu via the VoidCraft button.`;
  
  try {
    execSync(`gh release create v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update" --notes "${releaseNotes.replace(/"/g, '\\"')}" launcher-release/lumorix-null-district-win64.zip launcher-release/lumorix-null-district.manifest.json`, { stdio: 'inherit' });
    console.log('✓ Release created\n');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('✓ Release already exists, updating...');
      execSync('gh release edit v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update"', { stdio: 'inherit' });
      console.log('✓ Release updated\n');
    } else {
      throw e;
    }
  }
} catch (e) {
  console.error('✗ Step 6 failed:', e.message);
  process.exit(1);
}

console.log('=== STEP 7: Get release URL ===');
try {
  const url = execSync('gh release view v0.1.0-beta.8 --json url -q .url', { encoding: 'utf8' });
  console.log('Release URL:', url.trim());
  console.log('✓ Release URL retrieved\n');
} catch (e) {
  console.error('✗ Step 7 failed:', e.message);
  process.exit(1);
}

console.log('=== ALL STEPS COMPLETED ===');
