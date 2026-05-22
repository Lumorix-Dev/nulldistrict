import Phaser from "phaser";

interface LevelInfo {
  key: string;
  number: number;
  title: string;
  subtitle: string;
  mechanics: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  accentColor: number;
  secret?: boolean;
}

const LEVELS: LevelInfo[] = [
  {
    key: "EscapeRoom1Scene",
    number: 1,
    title: "The Signal Lock",
    subtitle: "A locked district. Two keys. One way out.",
    mechanics: ["Key Collection", "Levers", "Locked Doors"],
    difficulty: 1,
    accentColor: 0x9be7ff
  },
  {
    key: "EscapeRoom2Scene",
    number: 2,
    title: "The Code Chamber",
    subtitle: "Digits are scattered. Plates must be pressed. The code awaits.",
    mechanics: ["Pressure Plates", "Code Panels", "Environment Clues"],
    difficulty: 2,
    accentColor: 0xd18cff
  },
  {
    key: "EscapeRoom3Scene",
    number: 3,
    title: "Mirror Maze",
    subtitle: "Three shards. One pattern. Blue, then red, then green.",
    mechanics: ["Crystal Shards", "Lever Patterns", "Mirror Gates"],
    difficulty: 3,
    accentColor: 0x7df9ff
  },
  {
    key: "EscapeRoom4Scene",
    number: 4,
    title: "The Clockwork",
    subtitle: "12 seconds. 4 switches. Moving platforms. Tick tock.",
    mechanics: ["Timed Challenges", "Moving Platforms", "Sync Mechanic"],
    difficulty: 4,
    accentColor: 0xf1c84b
  },
  {
    key: "EscapeRoom5Scene",
    number: 5,
    title: "The Void Core",
    subtitle: "Five rooms. Every skill tested. Escape the core.",
    mechanics: ["All Mechanics Combined", "5-Room Challenge"],
    difficulty: 5,
    accentColor: 0x9b00ff
  },
  {
    key: "EscapeRoom6Scene",
    number: 6,
    title: "THE NULL CORE",
    subtitle: "The signal was always leading here. Disrupt the core — before it disrupts you.",
    mechanics: ["Void Shards", "Lever Sequences", "Code Panels", "All Mechanics"],
    difficulty: 5,
    accentColor: 0xffd700,
    secret: true,
  }
];

export class PuzzleSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cardBgs: Phaser.GameObjects.Rectangle[] = [];

  public constructor() {
    super("PuzzleSelectScene");
  }

  public create() {
    const cx = this.scale.width / 2;
    const h = this.scale.height;
    const w = this.scale.width;

    // Background
    this.add.rectangle(cx, h / 2, w, h, 0x040509);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a2030, 0.4);
    for (let x = 0; x < w; x += 60) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 60) gfx.lineBetween(0, y, w, y);

    // Title
    this.add.text(cx, 40, "SELECT LEVEL", {
      fontFamily: "monospace", fontSize: "32px", color: "#9be7ff"
    }).setOrigin(0.5);
    this.add.text(cx, 76, "Escape Room Challenges", {
      fontFamily: "monospace", fontSize: "13px", color: "#5a8a9a"
    }).setOrigin(0.5);

    // Preview panel (right side, fixed)
    const pvX = w - 160;
    const pvBg = this.add.rectangle(pvX, h / 2 + 20, 280, h - 160, 0x08090f, 0.9)
      .setStrokeStyle(1, 0x334155, 0.8).setDepth(10);
    const pvTitle = this.add.text(pvX, h / 2 - 120, "", {
      fontFamily: "monospace", fontSize: "13px", color: "#9be7ff", align: "center", wordWrap: { width: 240 }
    }).setOrigin(0.5).setDepth(11);
    const pvMechanics = this.add.text(pvX, h / 2 - 50, "", {
      fontFamily: "monospace", fontSize: "10px", color: "#d18cff", wordWrap: { width: 240 }, lineSpacing: 4
    }).setOrigin(0.5).setDepth(11);
    const pvBest = this.add.text(pvX, h / 2 + 60, "", {
      fontFamily: "monospace", fontSize: "10px", color: "#ffe066"
    }).setOrigin(0.5).setDepth(11);
    const pvStars = this.add.text(pvX, h / 2 + 85, "", {
      fontFamily: "monospace", fontSize: "14px", color: "#ffe066"
    }).setOrigin(0.5).setDepth(11);

    const showPreview = (level: LevelInfo) => {
      pvTitle.setText(
        level.secret
          ? `⭐ SECRET\nLevel ${level.number}: ${level.title}`
          : `Level ${level.number}\n${level.title}`
      );
      pvMechanics.setText(level.mechanics.join("\n"));
      const stored = localStorage.getItem(`voidcraft:best-escape-room-${level.number}`);
      pvBest.setText(stored ? `Best: ${parseFloat(stored).toFixed(1)}s` : "Not yet cleared");
      pvStars.setText("★".repeat(level.difficulty) + "☆".repeat(5 - level.difficulty));
    };
    const hidePreview = () => {
      pvTitle.setText(""); pvMechanics.setText(""); pvBest.setText(""); pvStars.setText("");
    };

    // Level cards
    const cardW = Math.min(580, w - 360);
    const startY = 130;
    const cardH = 80;
    const gap = 12;

    this.cardBgs = [];
    LEVELS.forEach((level, i) => {
      const y = startY + i * (cardH + gap) + cardH / 2;
      const bg = this.createLevelCard(
        cx - 140, y, cardW, cardH, level,
        () => { this.selectedIndex = i; this.highlightSelected(); showPreview(level); },
        () => hidePreview()
      );
      this.cardBgs.push(bg);
    });

    // Keyboard navigation
    const kb = this.input.keyboard!;
    kb.on("keydown-UP", () => {
      this.selectedIndex = (this.selectedIndex - 1 + LEVELS.length) % LEVELS.length;
      this.highlightSelected();
      showPreview(LEVELS[this.selectedIndex]!);
    });
    kb.on("keydown-DOWN", () => {
      this.selectedIndex = (this.selectedIndex + 1) % LEVELS.length;
      this.highlightSelected();
      showPreview(LEVELS[this.selectedIndex]!);
    });
    kb.on("keydown-ENTER", () => {
      const level = LEVELS[this.selectedIndex];
      if (level) this.scene.start(level.key);
    });

    // Back button
    const backTxt = this.add.text(50, h - 28, "← Back to Menu", {
      fontFamily: "monospace", fontSize: "12px", color: "#5a8a9a",
      backgroundColor: "rgba(5,7,11,0.8)", padding: { x: 8, y: 4 }
    }).setOrigin(0, 0.5);
    backTxt.setInteractive({ useHandCursor: true });
    backTxt.on("pointerover", () => backTxt.setColor("#9be7ff"));
    backTxt.on("pointerout", () => backTxt.setColor("#5a8a9a"));
    backTxt.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));

    // Nav hint
    this.add.text(cx - 140, h - 28, "↑↓ navigate  •  ENTER to play", {
      fontFamily: "monospace", fontSize: "10px", color: "#334155"
    }).setOrigin(0.5);

    // Initial highlight
    this.highlightSelected();
    showPreview(LEVELS[0]!);
  }

  private highlightSelected() {
    LEVELS.forEach((level, i) => {
      const bg = this.cardBgs[i];
      if (!bg) return;
      if (i === this.selectedIndex) {
        bg.setStrokeStyle(2, level.accentColor, 1.0);
        bg.setFillStyle(0x0c1218, 1);
      } else {
        bg.setStrokeStyle(1, level.accentColor, 0.35);
        bg.setFillStyle(0x08090f, 0.95);
      }
    });
  }

  private createLevelCard(
    cx: number, cy: number, cardW: number, cardH: number, level: LevelInfo,
    onHoverIn: () => void, onHoverOut: () => void
  ): Phaser.GameObjects.Rectangle {
    const accent = level.accentColor;
    const accentHex = `#${accent.toString(16).padStart(6, "0")}`;
    const storageKey = `voidcraft:best-escape-room-${level.number}`;
    const isCleared = localStorage.getItem(storageKey) !== null;
    const isLocked = level.number > 1 && localStorage.getItem(`voidcraft:best-escape-room-${level.number - 1}`) === null;

    // Card background
    const bg = this.add.rectangle(cx, cy, cardW, cardH, 0x08090f, 0.95);
    bg.setStrokeStyle(1, isLocked ? 0x334155 : accent, 0.35);

    if (isLocked) {
      // Greyed-out locked state
      this.add.rectangle(cx - cardW / 2 + 4, cy, 6, cardH - 4, 0x334155, 0.5);
      this.add.text(cx - cardW / 2 + 22, cy, `${level.number}`, {
        fontFamily: "monospace", fontSize: "28px", color: "#334155"
      }).setOrigin(0.5);
      this.add.text(cx - cardW / 2 + 60, cy - 8, level.title, {
        fontFamily: "monospace", fontSize: "16px", color: "#334155"
      });
      this.add.text(
        cx - cardW / 2 + 60, cy + 12,
        level.secret ? "🔒 Complete all 5 rooms to unlock" : "🔒 Complete previous level to unlock",
        { fontFamily: "monospace", fontSize: "9px", color: "#334155" }
      );
      bg.setInteractive({ useHandCursor: false });
      return bg;
    }

    // Left accent bar
    this.add.rectangle(cx - cardW / 2 + 4, cy, 6, cardH - 4, accent, 0.8);

    // Level number
    this.add.text(cx - cardW / 2 + 22, cy, `${level.number}`, {
      fontFamily: "monospace", fontSize: "28px", color: accentHex
    }).setOrigin(0.5);

    // Title
    this.add.text(cx - cardW / 2 + 60, cy - 22, level.title, {
      fontFamily: "monospace", fontSize: "16px", color: "#d8eef5"
    });

    // Subtitle
    this.add.text(cx - cardW / 2 + 60, cy - 3, level.subtitle, {
      fontFamily: "monospace", fontSize: "10px", color: "#5a8a9a",
      wordWrap: { width: cardW - 240 }
    });

    // Mechanics tags
    const tagStartX = cx - cardW / 2 + 60;
    level.mechanics.slice(0, 2).forEach((mech, mi) => {
      this.add.text(tagStartX + mi * 130, cy + 22, mech, {
        fontFamily: "monospace", fontSize: "9px", color: accentHex,
        backgroundColor: `rgba(${(accent >> 16) & 0xff},${(accent >> 8) & 0xff},${accent & 0xff},0.12)`,
        padding: { x: 4, y: 2 }
      });
    });

    // Difficulty stars
    const starX = cx + cardW / 2 - 90;
    const stars = "★".repeat(level.difficulty) + "☆".repeat(5 - level.difficulty);
    this.add.text(starX, cy - 14, stars, {
      fontFamily: "monospace", fontSize: "12px", color: "#ffe066"
    }).setOrigin(0.5);

    // Completion badge
    if (isCleared) {
      const bestTime = parseFloat(localStorage.getItem(storageKey)!).toFixed(1);
      this.add.text(starX, cy + 6, `✓ ${bestTime}s`, {
        fontFamily: "monospace", fontSize: "10px", color: "#45f5c8"
      }).setOrigin(0.5);
    }

    // Secret room badge + gold border
    if (level.secret) {
      bg.setStrokeStyle(2, 0xffd700, 0.7);
      this.add.text(starX, cy + 22, "⭐ SECRET", {
        fontFamily: "monospace", fontSize: "10px", color: "#ffd700",
        backgroundColor: "rgba(80,60,0,0.7)",
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
    }

    // Play button
    const playBg = this.add.rectangle(cx + cardW / 2 - 36, cy, 56, 36, 0x1a3d22, 0.95);
    playBg.setStrokeStyle(1, 0x45f5c8, 0.7);
    const playTxt = this.add.text(cx + cardW / 2 - 36, cy, "PLAY", {
      fontFamily: "monospace", fontSize: "13px", color: "#45f5c8"
    }).setOrigin(0.5);

    // Border glow tween (idle)
    const glowTween = this.tweens.add({
      targets: bg,
      alpha: { from: 0.92, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      paused: true,
    });

    // Hover effects
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      glowTween.play();
      bg.setStrokeStyle(2, accent, 1.0);
      playBg.setFillStyle(0x1a5c2a, 0.95);
      playTxt.setScale(1.05);
      onHoverIn();
    });
    bg.on("pointerout", () => {
      glowTween.pause();
      bg.setStrokeStyle(1, accent, 0.35);
      playBg.setFillStyle(0x1a3d22, 0.95);
      playTxt.setScale(1);
      onHoverOut();
    });
    bg.on("pointerdown", () => {
      this.scene.start(level.key);
    });

    return bg;
  }
}
