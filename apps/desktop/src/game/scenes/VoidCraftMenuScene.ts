import Phaser from "phaser";
import { TileWorld } from "../systems/TileWorld";
import { audioManager } from "../systems/AudioManager";
import { UISystem } from "../systems/UISystem";

interface SaveSlot {
  slot: number;
  meta: { name: string; width: number; height: number; tileSize: number; createdAt: number };
}

export class VoidCraftMenuScene extends Phaser.Scene {
  private slots: SaveSlot[] = [];
  private ui!: UISystem;

  public constructor() {
    super("VoidCraftMenuScene");
  }

  public create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const w = this.scale.width;
    const h = this.scale.height;

    this.ui = new UISystem(this);

    // Animated background
    this.add.rectangle(cx, cy, w, h, 0x030610);
    this.drawGridPattern(w, h);
    this.spawnParticles(w, h);

    // Title
    this.add.text(cx, cy - 220, "VOIDCRAFT", {
      fontFamily: "monospace", fontSize: "56px", color: "#9be7ff"
    }).setOrigin(0.5);
    this.add.text(cx, cy - 165, "Creative Sandbox + Escape Rooms", {
      fontFamily: "monospace", fontSize: "15px", color: "#5a8a9a"
    }).setOrigin(0.5);

    // Mode buttons via UISystem
    this.ui.createButton({
      x: cx, y: cy - 130,
      width: 380, height: 52,
      label: "Open World",
      icon: "🎨",
      color: 0x1a3d55,
      textColor: "#9be7ff",
      fontSize: 18,
      onClick: () => {
        this.scene.start("CreativeScene");
        this.scene.launch("CreativeHUDScene");
        this.scene.launch("CoopHUDScene");
      },
    });

    this.ui.createButton({
      x: cx, y: cy - 70,
      width: 380, height: 52,
      label: "New World",
      icon: "🌍",
      color: 0x1a2840,
      textColor: "#45f5c8",
      fontSize: 18,
      onClick: () => {
        this.scene.start("WorldGenScene");
      },
    });

    this.ui.createButton({
      x: cx, y: cy - 10,
      width: 380, height: 52,
      label: "Puzzle / Escape Rooms",
      icon: "🧩",
      color: 0x1a2d1a,
      textColor: "#45f5c8",
      fontSize: 18,
      onClick: () => {
        this.scene.start("PuzzleSelectScene");
      },
    });

    this.ui.createButton({
      x: cx, y: cy + 50,
      width: 380, height: 52,
      label: "Achievements",
      icon: "🏆",
      color: 0x2a1a00,
      textColor: "#ffe066",
      fontSize: 18,
      onClick: () => {
        this.scene.start("AchievementGalleryScene");
      },
    });

    this.ui.createButton({
      x: cx, y: cy + 110,
      width: 380, height: 52,
      label: "Level Editor",
      icon: "🔧",
      color: 0x1a0d2e,
      textColor: "#cc66ff",
      fontSize: 18,
      onClick: () => {
        this.scene.start("LevelEditorScene");
      },
    });

    // Stats button (small, below main buttons)
    this.createSmallButton(cx - 24, cy + 152, "📊 Stats", () => {
      this.scene.start("StatsScene");
    });

    // Tutorial / Leaderboard / Credits buttons
    const btnRowY = cy + 215;
    const btnSpacing = 130;
    this.createSmallButton(cx - btnSpacing - 30, btnRowY, "🎓 Tutorial", () => {
      this.scene.start("TutorialScene");
    });
    this.createSmallButton(cx - 40, btnRowY, "⏱️ Leaderboard", () => {
      this.scene.start("LeaderboardScene");
    });
    this.createSmallButton(cx + btnSpacing - 30, btnRowY, "🎬 Credits", () => {
      this.scene.start("CreditsScene");
    });
    this.createSmallButton(cx + 220, btnRowY, "⚙️ Settings", () => {
      this.scene.pause();
      this.scene.launch("SettingsScene", { returnTo: "VoidCraftMenuScene" });
    });

    // Co-op hint
    this.add.text(cx, cy + 168, "1-4 Players · Build Together · Solve Together", {
      fontFamily: "monospace", fontSize: "12px", color: "#334155"
    }).setOrigin(0.5);

    // Load world status
    this.slots = TileWorld.listStorageSlots();
    if (this.slots.length > 0) {
      const slot = this.slots[0]!;
      const date = new Date(slot.meta.createdAt).toLocaleDateString();
      this.add.text(cx, cy + 192, `Saved World: "${slot.meta.name}" (${date})`, {
        fontFamily: "monospace", fontSize: "11px", color: "#7aabb8"
      }).setOrigin(0.5);
    }

    // Back to game button (top left)
    this.createSmallButton(80, 30, "← Back to Null District", () => {
      this.scene.stop("VoidCraftMenuScene");
      this.scene.start("HubScene");
    });

    // Controls info
    this.add.text(cx, h - 30, "Creative: WASD=Pan  Scroll=Zoom  LClick=Place  RClick=Erase  Ctrl+S=Save  Ctrl+L=Load", {
      fontFamily: "monospace", fontSize: "9px", color: "#334155"
    }).setOrigin(0.5);

    // Version text
    this.add.text(cx, h - 14, "VoidCraft v1.0 · Null District", {
      fontFamily: "monospace", fontSize: "9px", color: "#1e3040"
    }).setOrigin(0.5);

    audioManager.startAmbientLoop("cyberpunk");
  }

  private drawGridPattern(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a3d55, 0.15);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private createSmallButton(x: number, y: number, label: string, onClick: () => void) {
    const txt = this.add.text(x, y, label, {
      fontFamily: "monospace", fontSize: "11px", color: "#5a8a9a",
      backgroundColor: "rgba(5,7,11,0.7)", padding: { x: 8, y: 4 }
    }).setOrigin(0, 0.5);
    txt.setInteractive({ useHandCursor: true });
    txt.on("pointerover", () => txt.setColor("#9be7ff"));
    txt.on("pointerout", () => txt.setColor("#5a8a9a"));
    txt.on("pointerdown", onClick);
    return txt;
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x9be7ff, 0x45f5c8, 0x9b00ff, 0xffe066];
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const size = 2 + Math.random() * 3;
      const rect = this.add.rectangle(x, y, size, size, color, 0.6);
      this.tweens.add({
        targets: rect,
        y: y - 80 - Math.random() * 120,
        alpha: 0,
        duration: 3000 + Math.random() * 4000,
        delay: Math.random() * 3000,
        repeat: -1,
        repeatDelay: Math.random() * 2000,
        onRepeat: () => {
          rect.x = Math.random() * w;
          rect.y = h + 20;
          rect.setAlpha(0.6);
        }
      });
    }
  }
}
