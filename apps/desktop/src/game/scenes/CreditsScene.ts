import Phaser from "phaser";

const CREDITS_LINES = [
  { text: "VOIDCRAFT", size: "48px", color: "#00c8ff", spacing: 24 },
  { text: "A Solo Studio Production", size: "16px", color: "#5a8a9a", spacing: 48 },
  { text: "── Game Design & Programming ──", size: "13px", color: "#ff006e", spacing: 12 },
  { text: "You", size: "22px", color: "#00ff88", spacing: 48 },
  { text: "── Engine & Frameworks ──", size: "13px", color: "#ff006e", spacing: 12 },
  { text: "Engine: Phaser 3", size: "14px", color: "#9be7ff", spacing: 8 },
  { text: "Framework: React + Tauri", size: "14px", color: "#9be7ff", spacing: 8 },
  { text: "Audio: Web Audio API", size: "14px", color: "#9be7ff", spacing: 8 },
  { text: "Built with: TypeScript + Vite", size: "14px", color: "#9be7ff", spacing: 48 },
  { text: "── Special Thanks ──", size: "13px", color: "#ff006e", spacing: 12 },
  { text: "The Null District Community", size: "16px", color: "#7aabb8", spacing: 48 },
  { text: "── By the Numbers ──", size: "13px", color: "#ff006e", spacing: 12 },
  { text: "Achievements: 20", size: "14px", color: "#ffe066", spacing: 8 },
  { text: "Escape Rooms: 5", size: "14px", color: "#ffe066", spacing: 8 },
  { text: "Block Types: 37", size: "14px", color: "#ffe066", spacing: 8 },
  { text: "Procedural Themes: 5", size: "14px", color: "#ffe066", spacing: 60 },
  { text: "THANKS FOR PLAYING!", size: "36px", color: "#00c8ff", spacing: 32 },
  { text: "⬡  VoidCraft  ⬡", size: "20px", color: "#ff006e", spacing: 80 },
  { text: "Null District  ·  VoidCraft v1.0", size: "12px", color: "#334155", spacing: 0 },
];

export class CreditsScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private stars: Array<{ obj: Phaser.GameObjects.Rectangle; phase: number; speed: number }> = [];
  private scrollSpeed = 30;
  private totalHeight = 0;
  private done = false;

  public constructor() {
    super("CreditsScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Background
    this.add.rectangle(cx, h / 2, w, h, 0x0a0a1a);

    // Twinkling stars
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() < 0.15 ? 2 : 1;
      const obj = this.add.rectangle(x, y, size, size, 0x9be7ff, Math.random() * 0.5 + 0.1).setDepth(1);
      this.stars.push({ obj, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5 });
    }

    // Fade gradient overlays (top and bottom vignette)
    const topFade = this.add.rectangle(cx, 0, w, 80, 0x0a0a1a).setOrigin(0.5, 0).setDepth(5);
    const botFade = this.add.rectangle(cx, h, w, 80, 0x0a0a1a).setOrigin(0.5, 1).setDepth(5);
    void topFade; void botFade;

    // Build scroll container
    this.scrollContainer = this.add.container(cx, h + 20).setDepth(3);
    let currentY = 0;

    for (const line of CREDITS_LINES) {
      const txt = this.add.text(0, currentY, line.text, {
        fontFamily: "monospace",
        fontSize: line.size,
        color: line.color,
        align: "center",
        stroke: line.size === "48px" || line.size === "36px" ? "#00c8ff" : undefined,
        strokeThickness: line.size === "48px" ? 4 : line.size === "36px" ? 2 : 0,
      }).setOrigin(0.5, 0);

      this.scrollContainer.add(txt);
      const lineH = parseInt(line.size, 10) + 4;
      currentY += lineH + line.spacing;
    }

    this.totalHeight = currentY;

    // ESC to skip
    this.input.keyboard!.once("keydown-ESC", () => this.exitScene());

    // Click to skip
    this.input.once("pointerdown", () => this.exitScene());

    // Skip hint
    this.add.text(w - 16, h - 16, "ESC / click to skip", {
      fontFamily: "monospace", fontSize: "11px", color: "#334155",
    }).setOrigin(1, 1).setDepth(10);
  }

  public override update(time: number, delta: number) {
    if (this.done) return;

    const dt = delta / 1000;

    // Scroll upward
    this.scrollContainer.y -= this.scrollSpeed * dt;

    // Check if scroll is complete
    if (this.scrollContainer.y < -this.totalHeight) {
      this.exitScene();
      return;
    }

    // Twinkle stars with sine wave
    const t = time / 1000;
    for (const star of this.stars) {
      const alpha = 0.1 + 0.4 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
      star.obj.setAlpha(alpha);
    }
  }

  private exitScene() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(600, 10, 10, 26, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.scene.start("VoidCraftMenuScene");
      }
    });
  }
}
