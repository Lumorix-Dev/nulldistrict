import Phaser from "phaser";

interface TutorialCard {
  title: string;
  description: string;
  drawDemo?: (gfx: Phaser.GameObjects.Graphics, cx: number, cy: number) => void;
}

const CARDS: TutorialCard[] = [
  {
    title: "Welcome to VoidCraft!",
    description:
      "VoidCraft has two main modes:\n\n" +
      "🎨  Creative Mode — Build worlds tile by tile.\n" +
      "🧩  Escape Room Mode — Solve puzzle challenges\n    across 5 hand-crafted levels.\n\n" +
      "You can also team up with up to 4 players in Co-op!",
    drawDemo: (gfx, cx, cy) => {
      // Two panels side by side
      gfx.fillStyle(0x1a3d55, 0.7);
      gfx.fillRoundedRect(cx - 160, cy - 60, 130, 100, 6);
      gfx.lineStyle(2, 0x00c8ff, 0.9);
      gfx.strokeRoundedRect(cx - 160, cy - 60, 130, 100, 6);
      gfx.fillStyle(0x1a2d1a, 0.7);
      gfx.fillRoundedRect(cx + 30, cy - 60, 130, 100, 6);
      gfx.lineStyle(2, 0x00ff88, 0.9);
      gfx.strokeRoundedRect(cx + 30, cy - 60, 130, 100, 6);
      // Icons
      gfx.fillStyle(0x00c8ff, 1);
      gfx.fillRect(cx - 110, cy - 20, 28, 28);
      gfx.fillStyle(0x00ff88, 1);
      gfx.fillRect(cx + 80, cy - 20, 28, 28);
    },
  },
  {
    title: "Creative Mode: Build Worlds",
    description:
      "Navigate the canvas freely:\n\n" +
      "WASD or Arrow Keys — Pan the camera\n" +
      "Scroll Wheel         — Zoom in / out\n" +
      "Left Click           — Place the selected block\n" +
      "Right Click          — Erase a block\n\n" +
      "Build anything you imagine!",
    drawDemo: (gfx, cx, cy) => {
      // Grid of blocks
      const colors = [0x00c8ff, 0xff006e, 0x00ff88, 0x9b00ff, 0xffe066];
      let i = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          const bx = cx - 90 + col * 32;
          const by = cy - 50 + row * 32;
          if (Math.random() < 0.25) continue;
          gfx.fillStyle(colors[i++ % colors.length]!, 0.8);
          gfx.fillRect(bx, by, 28, 28);
          gfx.lineStyle(1, 0x0a0a1a, 0.6);
          gfx.strokeRect(bx, by, 28, 28);
        }
      }
      // Cursor arrow
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillTriangle(cx + 60, cy + 40, cx + 72, cy + 58, cx + 54, cy + 56);
    },
  },
  {
    title: "Block Palette",
    description:
      "The bottom bar is your block palette.\n\n" +
      "Scroll the palette bar   — Change selected block\n" +
      "Click a category tab     — Switch block groups\n" +
      "B key                    — Cycle brush size\n\n" +
      "Categories: Terrain · Tech · Nature · Decoration",
    drawDemo: (gfx, cx, cy) => {
      // Palette bar
      gfx.fillStyle(0x0d1b2e, 0.95);
      gfx.fillRoundedRect(cx - 150, cy + 20, 300, 52, 6);
      gfx.lineStyle(2, 0x00c8ff, 0.5);
      gfx.strokeRoundedRect(cx - 150, cy + 20, 300, 52, 6);
      const bColors = [0x334155, 0x00c8ff, 0x00ff88, 0x9b00ff, 0xff006e, 0xffe066, 0x334155];
      for (let i = 0; i < 7; i++) {
        const bx = cx - 138 + i * 42;
        gfx.fillStyle(bColors[i]!, i === 1 ? 1 : 0.4);
        gfx.fillRect(bx, cy + 30, 34, 34);
        if (i === 1) {
          gfx.lineStyle(2, 0xffffff, 1);
          gfx.strokeRect(bx - 1, cy + 29, 36, 36);
        }
      }
    },
  },
  {
    title: "Brush & Fill Tools",
    description:
      "Speed up your builds with powerful tools:\n\n" +
      "B           — Cycle brush size (1×1 → 3×3 → 5×5)\n" +
      "F           — Flood fill an area with current block\n" +
      "Ctrl + Z    — Undo last action\n" +
      "Ctrl + S    — Save your world\n" +
      "Ctrl + L    — Load a saved world",
    drawDemo: (gfx, cx, cy) => {
      // Show brush sizes
      const sizes = [16, 28, 44];
      const labels = ["1×1", "3×3", "5×5"];
      for (let i = 0; i < 3; i++) {
        const bx = cx - 80 + i * 68;
        const by = cy - 20;
        const sz = sizes[i]!;
        gfx.fillStyle(0x00c8ff, 0.2);
        gfx.fillRect(bx - sz / 2, by - sz / 2, sz, sz);
        gfx.lineStyle(2, 0x00c8ff, 0.8);
        gfx.strokeRect(bx - sz / 2, by - sz / 2, sz, sz);
        void labels[i];
      }
      // Flood fill arrow
      gfx.fillStyle(0x00ff88, 0.7);
      gfx.fillTriangle(cx - 10, cy + 50, cx + 10, cy + 50, cx, cy + 30);
      gfx.fillRect(cx - 4, cy + 50, 8, 16);
    },
  },
  {
    title: "Escape Room Mode",
    description:
      "Challenge yourself with 5 puzzle levels!\n\n" +
      "Each room has unique mechanics:\n" +
      "  • Find hidden keys\n" +
      "  • Flip levers to open gates\n" +
      "  • Crack 4-digit code panels\n" +
      "  • Navigate platforming challenges\n\n" +
      "Your best time is recorded on the Leaderboard.",
    drawDemo: (gfx, cx, cy) => {
      // Door
      gfx.fillStyle(0x1a2840, 0.9);
      gfx.fillRect(cx - 24, cy - 44, 48, 80);
      gfx.lineStyle(2, 0xff006e, 0.9);
      gfx.strokeRect(cx - 24, cy - 44, 48, 80);
      // Lock icon
      gfx.fillStyle(0xffe066, 1);
      gfx.fillCircle(cx, cy - 10, 8);
      gfx.fillRect(cx - 5, cy - 5, 10, 14);
      // Key
      gfx.fillStyle(0xffe066, 0.9);
      gfx.fillCircle(cx - 60, cy, 10);
      gfx.fillRect(cx - 60, cy, 30, 5);
      gfx.fillRect(cx - 42, cy + 5, 6, 8);
      gfx.fillRect(cx - 34, cy + 5, 6, 5);
    },
  },
  {
    title: "Interact with Objects",
    description:
      "Your character can interact with the environment.\n\n" +
      "Walk close to an object — prompt appears\n" +
      "F key                   — Interact / Pick up\n\n" +
      "Interactable objects:\n" +
      "  🔑  Keys & collectibles\n" +
      "  🔧  Levers & switches\n" +
      "  🚪  Doors (locked or unlocked)\n" +
      "  📋  Signs & code panels",
    drawDemo: (gfx, cx, cy) => {
      // Player character (simple pixel)
      gfx.fillStyle(0x9be7ff, 0.9);
      gfx.fillRect(cx - 12, cy - 38, 24, 32);
      gfx.fillStyle(0xffe066, 1);
      gfx.fillCircle(cx, cy - 46, 10);
      // Interact prompt
      gfx.fillStyle(0x0d1a22, 0.9);
      gfx.fillRoundedRect(cx - 44, cy - 70, 88, 22, 4);
      gfx.lineStyle(1, 0x9be7ff, 0.9);
      gfx.strokeRoundedRect(cx - 44, cy - 70, 88, 22, 4);
      // Key item
      gfx.fillStyle(0xffe066, 1);
      gfx.fillCircle(cx + 60, cy - 20, 10);
      gfx.fillRect(cx + 60, cy - 16, 22, 5);
      gfx.fillRect(cx + 74, cy - 11, 5, 7);
    },
  },
  {
    title: "Collect Keys & Codes",
    description:
      "Progression is built around collecting:\n\n" +
      "🔑  Keys — Carried in inventory, used to unlock doors\n" +
      "🔢  Code Panels — Enter a 4-digit code to open gates\n" +
      "💎  Crystal Shards — Bonus collectibles for achievements\n\n" +
      "Tip: Read the signs around the level — they\ncontain clues for codes!",
    drawDemo: (gfx, cx, cy) => {
      // Inventory box
      gfx.fillStyle(0x0d1b2e, 0.9);
      gfx.fillRoundedRect(cx - 100, cy - 50, 200, 80, 6);
      gfx.lineStyle(2, 0x00c8ff, 0.6);
      gfx.strokeRoundedRect(cx - 100, cy - 50, 200, 80, 6);
      // Item slots
      const iColors = [0xffe066, 0x00c8ff, 0x9b00ff, 0x334155];
      for (let i = 0; i < 4; i++) {
        const bx = cx - 74 + i * 48;
        gfx.fillStyle(iColors[i]!, i < 3 ? 0.8 : 0.2);
        gfx.fillRect(bx, cy - 28, 36, 36);
        gfx.lineStyle(1, 0x334155, 0.8);
        gfx.strokeRect(bx, cy - 28, 36, 36);
      }
      // Code panel
      gfx.fillStyle(0x1a0d2e, 0.9);
      gfx.fillRoundedRect(cx - 50, cy + 40, 100, 40, 4);
      gfx.lineStyle(2, 0x9b00ff, 0.9);
      gfx.strokeRoundedRect(cx - 50, cy + 40, 100, 40, 4);
    },
  },
  {
    title: "Co-op Mode",
    description:
      "Play with friends — up to 4 players!\n\n" +
      "Join a session    — Enter session code\n" +
      "Host a session    — Share your code\n\n" +
      "Co-op works in both Creative and Escape Room modes.\n" +
      "Build together, or race each other to solve puzzles!\n\n" +
      "Look for the Co-op HUD to see active players.",
    drawDemo: (gfx, cx, cy) => {
      // 4 player icons
      const pColors = [0x00c8ff, 0xff006e, 0x00ff88, 0xffe066];
      const positions = [
        { x: cx - 60, y: cy - 10 },
        { x: cx - 20, y: cy - 20 },
        { x: cx + 20, y: cy - 10 },
        { x: cx + 60, y: cy - 20 },
      ];
      for (let i = 0; i < 4; i++) {
        const p = positions[i]!;
        gfx.fillStyle(pColors[i]!, 0.9);
        gfx.fillRect(p.x - 10, p.y - 16, 20, 26);
        gfx.fillCircle(p.x, p.y - 24, 8);
      }
      // Connection lines
      gfx.lineStyle(1, 0x334155, 0.5);
      for (let i = 0; i < 3; i++) {
        const a = positions[i]!;
        const b = positions[i + 1]!;
        gfx.lineBetween(a.x, a.y, b.x, b.y);
      }
    },
  },
];

export class TutorialScene extends Phaser.Scene {
  private currentCard = 0;
  private cardContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;

  public constructor() {
    super("TutorialScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Background
    this.add.rectangle(cx, cy, w, h, 0x0a0a1a);
    this.drawGrid(w, h);
    this.spawnStars(w, h);

    // Skip button (top right)
    const skipBtn = this.add.text(w - 16, 16, "Skip ✕", {
      fontFamily: "monospace", fontSize: "12px", color: "#5a8a9a",
      backgroundColor: "rgba(10,10,26,0.8)", padding: { x: 10, y: 5 },
    }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });
    skipBtn.on("pointerover", () => skipBtn.setColor("#ff006e"));
    skipBtn.on("pointerout", () => skipBtn.setColor("#5a8a9a"));
    skipBtn.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));

    // Progress dots
    for (let i = 0; i < CARDS.length; i++) {
      const dot = this.add.circle(cx + (i - CARDS.length / 2 + 0.5) * 20, h - 28, 5, 0x334155)
        .setDepth(20);
      this.dots.push(dot);
    }

    // Nav hints
    this.add.text(cx, h - 12, "← Back  |  Space / → Next", {
      fontFamily: "monospace", fontSize: "10px", color: "#334155",
    }).setOrigin(0.5).setDepth(20);

    // Build card container (off-screen to the right initially)
    this.cardContainer = this.add.container(w + cx, cy);
    this.buildCard(this.currentCard);
    this.slideIn();

    // Keyboard
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
  }

  public override update() {
    if (Phaser.Input.Keyboard.JustDown(this.keySpace) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
        Phaser.Input.Keyboard.JustDown(this.keyRight)) {
      this.advance();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyLeft)) {
      this.goBack();
    }
  }

  private advance() {
    if (this.currentCard < CARDS.length - 1) {
      this.slideOut("left", () => {
        this.currentCard++;
        this.buildCard(this.currentCard);
        this.slideIn();
      });
    } else {
      this.showCompletion();
    }
  }

  private goBack() {
    if (this.currentCard > 0) {
      this.slideOut("right", () => {
        this.currentCard--;
        this.buildCard(this.currentCard);
        this.slideInFrom("right");
      });
    }
  }

  private buildCard(index: number) {
    this.cardContainer.removeAll(true);

    const w = this.scale.width;
    const h = this.scale.height;
    const cardW = Math.min(680, w - 80);
    const cardH = Math.min(440, h - 120);

    // Card background
    const gfxBg = this.make.graphics({ x: 0, y: 0, add: false });
    gfxBg.fillStyle(0x0d1b2e, 0.97);
    gfxBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    gfxBg.lineStyle(2, 0x00c8ff, 0.5);
    gfxBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    this.cardContainer.add(gfxBg);

    // Accent top border
    const accentGfx = this.make.graphics({ x: 0, y: 0, add: false });
    accentGfx.lineStyle(3, 0x00c8ff, 0.9);
    accentGfx.lineBetween(-cardW / 2 + 12, -cardH / 2 + 2, cardW / 2 - 12, -cardH / 2 + 2);
    this.cardContainer.add(accentGfx);

    // Card number indicator
    const numText = this.add.text(-cardW / 2 + 16, -cardH / 2 + 14, `${index + 1} / ${CARDS.length}`, {
      fontFamily: "monospace", fontSize: "11px", color: "#00c8ff",
    });
    this.cardContainer.add(numText);

    const card = CARDS[index]!;

    // Title
    const title = this.add.text(0, -cardH / 2 + 52, card.title, {
      fontFamily: "monospace", fontSize: "22px", color: "#00c8ff",
      align: "center",
    }).setOrigin(0.5, 0.5);
    this.cardContainer.add(title);

    // Divider
    const divGfx = this.make.graphics({ x: 0, y: 0, add: false });
    divGfx.lineStyle(1, 0x00c8ff, 0.3);
    divGfx.lineBetween(-cardW / 2 + 40, -cardH / 2 + 78, cardW / 2 - 40, -cardH / 2 + 78);
    this.cardContainer.add(divGfx);

    // Demo graphic area (if present)
    const demoY = -cardH / 2 + 160;
    if (card.drawDemo) {
      const demoGfx = this.make.graphics({ x: 0, y: 0, add: false });
      card.drawDemo(demoGfx, 0, demoY);
      this.cardContainer.add(demoGfx);
    }

    // Description text
    const descY = card.drawDemo ? cardH / 2 - 130 : 0;
    const desc = this.add.text(0, descY, card.description, {
      fontFamily: "monospace", fontSize: "13px", color: "#7aabb8",
      align: "left",
      lineSpacing: 4,
      wordWrap: { width: cardW - 80 },
    }).setOrigin(0.5, 0.5);
    this.cardContainer.add(desc);

    // Next button
    const isLast = index === CARDS.length - 1;
    const nextLabel = isLast ? "Finish! →" : "Next →";
    const nextBtn = this.add.text(cardW / 2 - 16, cardH / 2 - 16, nextLabel, {
      fontFamily: "monospace", fontSize: "13px", color: "#00ff88",
      backgroundColor: "rgba(0,20,10,0.8)", padding: { x: 12, y: 6 },
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    nextBtn.on("pointerover", () => nextBtn.setColor("#ffffff"));
    nextBtn.on("pointerout", () => nextBtn.setColor("#00ff88"));
    nextBtn.on("pointerdown", () => this.advance());
    this.cardContainer.add(nextBtn);

    if (index > 0) {
      const backBtn = this.add.text(-cardW / 2 + 16, cardH / 2 - 16, "← Back", {
        fontFamily: "monospace", fontSize: "13px", color: "#5a8a9a",
        backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 12, y: 6 },
      }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
      backBtn.on("pointerover", () => backBtn.setColor("#00c8ff"));
      backBtn.on("pointerout", () => backBtn.setColor("#5a8a9a"));
      backBtn.on("pointerdown", () => this.goBack());
      this.cardContainer.add(backBtn);
    }

    // Update dots
    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i]!;
      dot.setFillStyle(i === index ? 0x00c8ff : 0x334155);
      dot.setRadius(i === index ? 7 : 5);
    }
  }

  private slideIn() {
    const w = this.scale.width;
    this.cardContainer.x = w + w / 2;
    this.cardContainer.y = this.scale.height / 2;
    this.tweens.add({
      targets: this.cardContainer,
      x: w / 2,
      duration: 380,
      ease: "Back.easeOut",
    });
  }

  private slideInFrom(_dir: "right") {
    this.cardContainer.x = -this.scale.width / 2;
    this.cardContainer.y = this.scale.height / 2;
    this.tweens.add({
      targets: this.cardContainer,
      x: this.scale.width / 2,
      duration: 380,
      ease: "Back.easeOut",
    });
  }

  private slideOut(dir: "left" | "right", onComplete: () => void) {
    const w = this.scale.width;
    const targetX = dir === "left" ? -w / 2 : w + w / 2;
    this.tweens.add({
      targets: this.cardContainer,
      x: targetX,
      duration: 280,
      ease: "Back.easeIn",
      onComplete,
    });
  }

  private showCompletion() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    this.tweens.add({
      targets: this.cardContainer,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.cardContainer.destroy();

        // "You're ready!" screen
        const title = this.add.text(cx, cy - 100, "You're Ready! 🚀", {
          fontFamily: "monospace", fontSize: "36px", color: "#00c8ff",
        }).setOrigin(0.5).setAlpha(0);

        const sub = this.add.text(cx, cy - 50, "You now know the basics of VoidCraft.\nGo build something amazing!", {
          fontFamily: "monospace", fontSize: "15px", color: "#7aabb8",
          align: "center", lineSpacing: 6,
        }).setOrigin(0.5).setAlpha(0);

        const startBtn = this.add.text(cx, cy + 40, "▶  Start Playing", {
          fontFamily: "monospace", fontSize: "18px", color: "#00ff88",
          backgroundColor: "rgba(0,20,10,0.9)", padding: { x: 24, y: 12 },
        }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
        startBtn.on("pointerover", () => startBtn.setColor("#ffffff"));
        startBtn.on("pointerout", () => startBtn.setColor("#00ff88"));
        startBtn.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));

        this.tweens.add({ targets: [title, sub, startBtn], alpha: 1, duration: 600, ease: "Sine.easeIn" });
        this.tweens.add({
          targets: title,
          y: cy - 106,
          duration: 1800,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
        });
      },
    });
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x00c8ff, 0.04);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private spawnStars(w: number, h: number) {
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() < 0.2 ? 2 : 1;
      const dot = this.add.rectangle(x, y, size, size, 0x00c8ff, Math.random() * 0.4 + 0.1);
      const delay = Math.random() * 3000;
      const dur = 1500 + Math.random() * 2000;
      this.tweens.add({
        targets: dot,
        alpha: { from: dot.alpha, to: dot.alpha * 0.1 },
        duration: dur,
        delay,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }
}
