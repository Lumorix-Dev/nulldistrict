import json
import os
import subprocess
import sys

os.chdir('c:\\Users\\julia\\Documents\\Null Distrikt\\nulldistrict')

# Step 1: Update manifest
print('=== Step 1: Updating manifest.json ===')
manifest_file = os.path.join(os.getcwd(), 'launcher-release', 'lumorix-null-district.manifest.json')
with open(manifest_file, 'r', encoding='utf-8') as f:
    content = f.read()
    if content.startswith('\ufeff'):
        content = content[1:]
    m = json.loads(content)

m['version'] = '0.1.0-beta.8'
m['download']['url'] = 'https://github.com/Lumorix-Dev/nulldistrict/releases/download/v0.1.0-beta.8/lumorix-null-district-win64.zip'
m['changelog'] = [
    {
        'version': '0.1.0-beta.8',
        'date': '2026-05-22',
        'items': [
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
        'version': '0.1.0-beta.1',
        'date': '2026-05-19',
        'items': [
            'First launcher-ready beta package for the standalone Null District desktop client.',
            'Connects to the live Strato backend for accounts, characters, multiplayer, quests, inventory and shop catalog.',
            'Includes Signal Haven, District Entrance, Underground Sector A and PvP Breach Zone vertical-slice content.'
        ]
    }
]

with open(manifest_file, 'w', encoding='utf-8') as f:
    json.dump(m, f, indent=2)
print('✓ Manifest updated OK')

# Step 2: Verify manifest
print('\n=== Step 2: Verifying manifest ===')
with open(manifest_file, 'r', encoding='utf-8') as f:
    m2 = json.load(f)
print(f'version: {m2["version"]}')
print(f'changelog entries: {len(m2["changelog"])}')
print(f'first changelog: {m2["changelog"][0]["version"]}')

# Step 3: Stage and commit
print('\n=== Step 3: Staging and committing ===')
try:
    subprocess.run('git add -A', shell=True, check=True, cwd=os.getcwd())
    status = subprocess.run('git status --short', shell=True, capture_output=True, text=True, cwd=os.getcwd()).stdout
    print('Git status:')
    print(status if status.strip() else '(no changes)')
    
    if status.strip():
        subprocess.run('git commit -m "release: bump to v0.1.0-beta.8 - VoidCraft game update" -m "- Bump all package versions to 0.1.0-beta.8\\n- Update launcher manifest with VoidCraft changelog\\n- All VoidCraft game files committed\\n\\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"', shell=True, check=True, cwd=os.getcwd())
        print('✓ Commit succeeded')
    else:
        print('✓ Nothing to commit')
except Exception as e:
    print(f'Git command failed: {e}')

# Step 4: Push to GitHub
print('\n=== Step 4: Pushing to GitHub ===')
try:
    result = subprocess.run('git push origin main', shell=True, capture_output=True, text=True, cwd=os.getcwd())
    if result.returncode == 0:
        print('✓ Push succeeded')
        if result.stdout:
            print(result.stdout)
    else:
        print('Push output:', result.stderr or result.stdout)
except Exception as e:
    print(f'Push output: {e}')

# Step 5: Create git tag
print('\n=== Step 5: Creating git tag ===')
try:
    subprocess.run('git tag v0.1.0-beta.8', shell=True, check=True, cwd=os.getcwd())
    print('✓ Tag created')
    subprocess.run('git push origin v0.1.0-beta.8', shell=True, check=True, cwd=os.getcwd())
    print('✓ Tag pushed')
except subprocess.CalledProcessError as e:
    print(f'Tag creation/push output: {e}')

# Step 6: Create GitHub release
print('\n=== Step 6: Creating GitHub release ===')
try:
    subprocess.run('gh release create v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update" --notes "## VoidCraft - Complete Game Update\\n\\nA full creative sandbox + puzzle game is now built into Null District.\\n\\n### New Content\\n- Creative Mode with 37 block types, procedural worlds (5 themes), co-op sync\\n- 6 Escape Rooms (5 main + secret bonus \'THE NULL CORE\')\\n- 20 Achievements, leaderboard, stats, save slots\\n- In-game level editor, tutorial, credits scene\\n- Camera effects, full audio system, particle effects\\n\\nAccess VoidCraft from the main menu via the VoidCraft button." launcher-release/lumorix-null-district-win64.zip launcher-release/lumorix-null-district.manifest.json', shell=True, check=True, cwd=os.getcwd())
    print('✓ Release created')
except subprocess.CalledProcessError as e:
    print(f'Release creation output: {e}')
    print('Trying to edit existing release...')
    try:
        subprocess.run('gh release edit v0.1.0-beta.8 --title "Lumorix: Null District v0.1.0-beta.8 - VoidCraft Update"', shell=True, check=True, cwd=os.getcwd())
        print('✓ Release edited')
    except subprocess.CalledProcessError as e2:
        print(f'Edit output: {e2}')

# Final: Get release URL
print('\n=== Final: Getting release URL ===')
try:
    result = subprocess.run('gh release view v0.1.0-beta.8 --json url -q .url', shell=True, capture_output=True, text=True, cwd=os.getcwd())
    if result.returncode == 0:
        print(f'Release URL: {result.stdout.strip()}')
    else:
        print(f'Could not get release URL: {result.stderr}')
except Exception as e:
    print(f'Could not get release URL: {e}')
