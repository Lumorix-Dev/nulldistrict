import Phaser from 'phaser';
import { WorldGenSystem, type WorldTheme } from '../systems/WorldGenSystem';
import { TileWorld } from '../systems/TileWorld';

interface ThemeCardDef {
  theme: WorldTheme;
  label: string;
  emoji: string;
  primaryColor: number;
  accentColor: number;
  borderColor: number;
  description: string;
}

const THEME_DEFS: ThemeCardDef[] = [
  {
    theme: 'cyberpunk-city',
    label: 'Cyberpunk City',
    emoji: '🏙️',
    primaryColor: 0x071828,
    accentColor:  0x0d2d48,
    borderColor:  0x00c8ff,
    description:  'Steel towers\n& neon lights',
  },
  {
    theme: 'underground-cave',
    label: 'Underground Cave',
    emoji: '⛏️',
    primaryColor: 0x111118,
    accentColor:  0x1e1e2a,
    borderColor:  0x7a7a9a,
    description:  'Dark caverns\n& ore veins',
  },
  {
    theme: 'void-space',
    label: 'Void Space',
    emoji: '🌌',
    primaryColor: 0x08001a,
    accentColor:  0x12002e,
    borderColor:  0x9b00ff,
    description:  'Floating isles\nin the void',
  },
  {
    theme: 'neon-forest',
    label: 'Neon Forest',
    emoji: '🌿',
    primaryColor: 0x061206,
    accentColor:  0x0e2010,
    borderColor:  0x45f5c8,
    description:  'Ancient woods\n& glowing life',
  },
  {
    theme: 'ruins',
    label: 'Ruins',
    emoji: '🏚️',
    primaryColor: 0x140e06,
    accentColor:  0x221a0c,
    borderColor:  0xb87333,
    description:  'Crumbled cities\n& overgrowth',
  },
];

const SIZE_OPTIONS = [
  { key: 'small'  as const, label: 'Small\n60×60',     w: 60,  h: 60  },
  { key: 'medium' as const, label: 'Medium\n100×100',  w: 100, h: 100 },
  { key: 'large'  as const, label: 'Large\n150×150',   w: 150, h: 150 },
];

type SizeKey = 'small' | 'medium' | 'large';

export class WorldGenScene extends Phaser.Scene {
  private selectedTheme: WorldTheme = 'cyberpunk-city';
  private selectedSize: SizeKey = 'medium';
  private worldName = 'My World';
  private currentSeed = 0;

  private themeCards: Phaser.GameObjects.Container[] = [];
  private sizeButtons: Phaser.GameObjects.Container[] = [];
  private seedText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;

  private readonly CARD_W = 148;
  private readonly CARD_H = 192;

  constructor() {
    super('WorldGenScene');
  }

  create() {
    this.currentSeed = Math.floor(Math.random() * 999999);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const w  = this.scale.width;
    const h  = this.scale.height;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, w, h, 0x030610);
    this.drawBackground(w, h, cx, cy);
    this.spawnParticles(w, h);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, 44, 'NEW WORLD', {
      fontFamily: 'monospace',
      fontSize:   '46px',
      color:      '#9be7ff',
      stroke:     '#001a28',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 90, 'Configure your procedural world', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#3a6070',
    }).setOrigin(0.5);

    // ── Section: theme cards ──────────────────────────────────────────────────
    this.add.text(cx, cy - 125, 'W O R L D   T H E M E', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#3a6070',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.buildThemeCards(cx, cy - 20);

    // ── Section: world size ───────────────────────────────────────────────────
    this.add.text(cx, cy + 118, 'W O R L D   S I Z E', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#3a6070',
    }).setOrigin(0.5);

    this.buildSizeButtons(cx, cy + 145);

    // ── Section: seed ─────────────────────────────────────────────────────────
    this.add.text(cx, cy + 185, 'S E E D', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#3a6070',
    }).setOrigin(0.5);

    this.buildSeedRow(cx, cy + 210);

    // ── Section: name ─────────────────────────────────────────────────────────
    this.add.text(cx, cy + 250, 'W O R L D   N A M E', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#3a6070',
    }).setOrigin(0.5);

    this.buildNameRow(cx, cy + 275);

    // ── Action buttons ────────────────────────────────────────────────────────
    this.buildGenerateButton(cx - 80, cy + 320);
    this.buildRandomButton(cx + 130, cy + 320);

    // ── Back ──────────────────────────────────────────────────────────────────
    this.buildBackButton();
  }

  // ── Background helpers ─────────────────────────────────────────────────────

  private drawBackground(w: number, h: number, cx: number, cy: number) {
    const gfx = this.add.graphics();

    // Subtle grid
    gfx.lineStyle(1, 0x1a3d55, 0.07);
    for (let x = 0; x < w; x += 44) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 44) gfx.lineBetween(0, y, w, y);

    // Panel border accent
    const pw = 840;
    const ph = 580;
    gfx.lineStyle(1, 0x9be7ff, 0.1);
    gfx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);

    // Corner marks
    gfx.lineStyle(1, 0x9be7ff, 0.25);
    const cs = 18;
    [[cx - pw / 2, cy - ph / 2], [cx + pw / 2, cy - ph / 2],
     [cx - pw / 2, cy + ph / 2], [cx + pw / 2, cy + ph / 2]].forEach(([ax, ay]) => {
      const sx = ax! < cx ? 1 : -1;
      const sy = ay! < cy ? 1 : -1;
      gfx.lineBetween(ax!, ay!, ax! + sx * cs, ay!);
      gfx.lineBetween(ax!, ay!, ax!, ay! + sy * cs);
    });
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x9be7ff, 0x45f5c8, 0x9b00ff, 0x00c8ff];
    for (let i = 0; i < 20; i++) {
      const x     = Math.random() * w;
      const y     = Math.random() * h;
      const size  = 1 + Math.random() * 2;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const dot   = this.add.rectangle(x, y, size, size, color, 0.5);
      this.tweens.add({
        targets:     dot,
        y:           y - 60 - Math.random() * 80,
        alpha:       0,
        duration:    3500 + Math.random() * 3500,
        delay:       Math.random() * 3000,
        repeat:      -1,
        repeatDelay: Math.random() * 2000,
        onRepeat:    () => {
          dot.x = Math.random() * w;
          dot.y = h + 10;
          dot.alpha = 0.5;
        },
      });
    }
  }

  // ── Theme cards ────────────────────────────────────────────────────────────

  private buildThemeCards(cx: number, cy: number) {
    const totalW = THEME_DEFS.length * this.CARD_W + (THEME_DEFS.length - 1) * 10;
    const startX = cx - totalW / 2 + this.CARD_W / 2;

    this.themeCards = THEME_DEFS.map((def, i) => {
      const x = startX + i * (this.CARD_W + 10);
      return this.makeThemeCard(x, cy, def);
    });
  }

  private makeThemeCard(x: number, y: number, def: ThemeCardDef): Phaser.GameObjects.Container {
    const selected = def.theme === this.selectedTheme;
    const cw = this.CARD_W;
    const ch = this.CARD_H;

    const c = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, cw, ch, def.primaryColor)
      .setStrokeStyle(selected ? 2 : 1, selected ? def.borderColor : 0x1a3040, selected ? 1 : 0.4);

    const fill = this.add.rectangle(0, 0, cw - 2, ch - 2, def.accentColor, 0.7);

    // Accent bar at top
    const bar = this.add.rectangle(0, -ch / 2 + 2, cw - 2, 3, def.borderColor, selected ? 1 : 0.2);

    const emoji = this.add.text(0, -52, def.emoji, { fontSize: '30px' }).setOrigin(0.5);

    const label = this.add.text(0, -14, def.label, {
      fontFamily: 'monospace',
      fontSize:   '11px',
      color:      selected ? '#ffffff' : '#607a8a',
      align:      'center',
      wordWrap:   { width: cw - 16 },
    }).setOrigin(0.5);

    const hexStr = '#' + def.borderColor.toString(16).padStart(6, '0');
    const desc = this.add.text(0, 20, def.description, {
      fontFamily: 'monospace',
      fontSize:   '9px',
      color:      selected ? hexStr : '#2a4050',
      align:      'center',
      wordWrap:   { width: cw - 16 },
    }).setOrigin(0.5);

    // Bottom selection glow bar
    const glow = this.add.rectangle(0, ch / 2 - 4, cw - 4, 5, def.borderColor, selected ? 0.9 : 0)
      .setName('glow');

    c.add([bg, fill, bar, emoji, label, desc, glow]);

    // Interaction via input zone (containers can't be directly interactive without a hit area)
    c.setInteractive(new Phaser.Geom.Rectangle(-cw / 2, -ch / 2, cw, ch), Phaser.Geom.Rectangle.Contains);

    c.on('pointerover', () => {
      if (def.theme !== this.selectedTheme) {
        this.tweens.add({ targets: c, y: c.y - 5, duration: 120, ease: 'Power2' });
        bg.setStrokeStyle(1, def.borderColor, 0.55);
      }
    });
    c.on('pointerout', () => {
      if (def.theme !== this.selectedTheme) {
        this.tweens.add({ targets: c, y: c.y + 5, duration: 120, ease: 'Power2' });
        bg.setStrokeStyle(1, 0x1a3040, 0.4);
      }
    });
    c.on('pointerdown', () => this.selectTheme(def.theme));

    // Entry animation for selected card
    if (selected) {
      this.tweens.add({ targets: glow, scaleX: { from: 0, to: 1 }, duration: 320, ease: 'Back.Out' });
    }

    return c;
  }

  private selectTheme(theme: WorldTheme) {
    if (theme === this.selectedTheme) return;
    this.selectedTheme = theme;

    const totalW = THEME_DEFS.length * this.CARD_W + (THEME_DEFS.length - 1) * 10;
    const cx     = this.scale.width / 2;
    const cy     = this.scale.height / 2 - 20;
    const startX = cx - totalW / 2 + this.CARD_W / 2;

    const oldCards = this.themeCards.splice(0);
    this.themeCards = THEME_DEFS.map((def, i) => {
      const x    = startX + i * (this.CARD_W + 10);
      const card = this.makeThemeCard(x, cy, def);
      return card;
    });
    oldCards.forEach(c => c.destroy());
  }

  // ── Size buttons ───────────────────────────────────────────────────────────

  private buildSizeButtons(cx: number, y: number) {
    this.sizeButtons = SIZE_OPTIONS.map((opt, i) => {
      const x = cx - 90 + i * 90;
      return this.makeSizeButton(x, y, opt.key, opt.label);
    });
  }

  private makeSizeButton(x: number, y: number, key: SizeKey, label: string): Phaser.GameObjects.Container {
    const selected = key === this.selectedSize;
    const c   = this.add.container(x, y);
    const bg  = this.add.rectangle(0, 0, 82, 44, selected ? 0x0e2c44 : 0x080e18)
      .setStrokeStyle(1, selected ? 0x9be7ff : 0x1a3040, selected ? 0.9 : 0.4);
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize:   '9px',
      color:      selected ? '#9be7ff' : '#3a5060',
      align:      'center',
    }).setOrigin(0.5);

    c.add([bg, txt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-41, -22, 82, 44), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { if (key !== this.selectedSize) bg.setFillStyle(0x0d2030); });
    c.on('pointerout',  () => { if (key !== this.selectedSize) bg.setFillStyle(0x080e18); });
    c.on('pointerdown', () => this.selectSize(key));
    return c;
  }

  private selectSize(key: SizeKey) {
    if (key === this.selectedSize) return;
    this.selectedSize = key;
    const cx = this.scale.width / 2;
    const y  = this.scale.height / 2 + 145;
    const old = this.sizeButtons.splice(0);
    this.sizeButtons = SIZE_OPTIONS.map((opt, i) =>
      this.makeSizeButton(cx - 90 + i * 90, y, opt.key, opt.label)
    );
    old.forEach(b => b.destroy());
  }

  // ── Seed row ───────────────────────────────────────────────────────────────

  private buildSeedRow(cx: number, y: number) {
    this.seedText = this.add.text(cx - 10, y, `${this.currentSeed}`, {
      fontFamily:      'monospace',
      fontSize:        '13px',
      color:           '#9be7ff',
      backgroundColor: '#050c14',
      padding:         { x: 12, y: 5 },
    }).setOrigin(0.5);

    const btn = this.add.text(cx + 130, y, '🎲 RANDOMIZE', {
      fontFamily:      'monospace',
      fontSize:        '11px',
      color:           '#45f5c8',
      backgroundColor: '#061812',
      padding:         { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#9be7ff'));
    btn.on('pointerout',  () => btn.setColor('#45f5c8'));
    btn.on('pointerdown', () => {
      this.currentSeed = Math.floor(Math.random() * 999999);
      this.seedText.setText(`${this.currentSeed}`);
    });
  }

  // ── Name row ───────────────────────────────────────────────────────────────

  private buildNameRow(cx: number, y: number) {
    this.nameText = this.add.text(cx - 10, y, this.worldName, {
      fontFamily:      'monospace',
      fontSize:        '13px',
      color:           '#ffe066',
      backgroundColor: '#141000',
      padding:         { x: 12, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.nameText.on('pointerover', () => this.nameText.setColor('#ffffff'));
    this.nameText.on('pointerout',  () => this.nameText.setColor('#ffe066'));
    this.nameText.on('pointerdown', () => {
      const result = window.prompt('Enter a name for your world:', this.worldName);
      if (result !== null && result.trim().length > 0) {
        this.worldName = result.trim().slice(0, 40);
        this.nameText.setText(this.worldName);
      }
    });

    this.add.text(cx + 130, y, '✏️ click to edit', {
      fontFamily: 'monospace',
      fontSize:   '9px',
      color:      '#2a4050',
    }).setOrigin(0, 0.5);
  }

  // ── Action buttons ─────────────────────────────────────────────────────────

  private buildGenerateButton(cx: number, y: number) {
    const c  = this.add.container(cx, y);
    const bg = this.add.rectangle(0, 0, 290, 52, 0x0d2840)
      .setStrokeStyle(2, 0x9be7ff, 0.9);
    const txt = this.add.text(0, 0, '⚙️  GENERATE WORLD', {
      fontFamily: 'monospace',
      fontSize:   '16px',
      color:      '#9be7ff',
    }).setOrigin(0.5);

    c.add([bg, txt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-145, -26, 290, 52), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { bg.setFillStyle(0x163d60); txt.setColor('#ffffff'); });
    c.on('pointerout',  () => { bg.setFillStyle(0x0d2840); txt.setColor('#9be7ff'); });
    c.on('pointerdown', () => this.generateWorld());
  }

  private buildRandomButton(cx: number, y: number) {
    const c  = this.add.container(cx, y);
    const bg = this.add.rectangle(0, 0, 120, 52, 0x110820)
      .setStrokeStyle(2, 0x9b00ff, 0.8);
    const txt = this.add.text(0, 0, '🎲 RANDOM', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#cc66ff',
    }).setOrigin(0.5);

    c.add([bg, txt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-60, -26, 120, 52), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { bg.setFillStyle(0x1c1035); txt.setColor('#ffffff'); });
    c.on('pointerout',  () => { bg.setFillStyle(0x110820); txt.setColor('#cc66ff'); });
    c.on('pointerdown', () => {
      const themes: WorldTheme[] = ['cyberpunk-city', 'underground-cave', 'void-space', 'neon-forest', 'ruins'];
      this.selectedTheme = themes[Math.floor(Math.random() * themes.length)]!;
      this.currentSeed   = Math.floor(Math.random() * 999999);
      this.seedText.setText(`${this.currentSeed}`);
      this.generateWorld();
    });
  }

  private buildBackButton() {
    const btn = this.add.text(20, 24, '← BACK', {
      fontFamily:      'monospace',
      fontSize:        '11px',
      color:           '#3a6070',
      backgroundColor: 'rgba(3,6,16,0.85)',
      padding:         { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#9be7ff'));
    btn.on('pointerout',  () => btn.setColor('#3a6070'));
    btn.on('pointerdown', () => this.scene.start('VoidCraftMenuScene'));
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  private generateWorld() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Generating overlay
    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.8)
      .setDepth(200);
    const spinner = this.add.text(cx, cy - 20, '⚙️', { fontSize: '32px' })
      .setOrigin(0.5).setDepth(201);
    const label = this.add.text(cx, cy + 24, 'GENERATING...', {
      fontFamily: 'monospace',
      fontSize:   '20px',
      color:      '#9be7ff',
    }).setOrigin(0.5).setDepth(201);

    this.tweens.add({ targets: spinner, angle: 360, duration: 900, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: label, alpha: { from: 0.4, to: 1 }, yoyo: true, repeat: -1, duration: 500 });

    // Defer one frame so overlay renders before the synchronous generation work
    this.time.delayedCall(60, () => {
      const sizeOpt  = SIZE_OPTIONS.find(s => s.key === this.selectedSize)!;
      const gen      = new WorldGenSystem(this.currentSeed);
      const world    = gen.generate({
        theme:    this.selectedTheme,
        width:    sizeOpt.w,
        height:   sizeOpt.h,
        tileSize: 32,
        name:     this.worldName,
        seed:     this.currentSeed,
      });

      TileWorld.saveToStorage(world, 1);

      overlay.destroy();
      spinner.destroy();
      label.destroy();

      this.scene.start('CreativeScene', { loadSlot: 1 });
      this.scene.launch('CreativeHUDScene');
    });
  }
}
