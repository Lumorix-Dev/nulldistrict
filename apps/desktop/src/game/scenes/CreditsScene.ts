import Phaser from "phaser";

const CREDITS_LINES = [
  { text: "NULL DISTRICT", size: "46px", color: "#00c8ff", spacing: 24 },
  { text: "Solo Escape Room Campaign", size: "16px", color: "#5a8a9a", spacing: 44 },
  { text: "DESIGN, CODE, DIRECTION", size: "13px", color: "#ff7aa2", spacing: 10 },
  { text: "You", size: "24px", color: "#45f5c8", spacing: 40 },
  { text: "STACK", size: "13px", color: "#ff7aa2", spacing: 10 },
  { text: "Phaser 3  ·  React  ·  Tauri", size: "14px", color: "#9be7ff", spacing: 8 },
  { text: "TypeScript  ·  Vite", size: "14px", color: "#9be7ff", spacing: 40 },
  { text: "CAMPAIGN CONTENT", size: "13px", color: "#ff7aa2", spacing: 10 },
  { text: "5 Main Rooms", size: "14px", color: "#ffe066", spacing: 8 },
  { text: "1 Secret Bonus Room", size: "14px", color: "#ffe066", spacing: 8 },
  { text: "Persistent Case Files and Local Records", size: "14px", color: "#ffe066", spacing: 48 },
  { text: "THANKS FOR PLAYING", size: "34px", color: "#00c8ff", spacing: 24 },
  { text: "The district remembers.", size: "16px", color: "#7a9aaa", spacing: 0 }
];

export class CreditsScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private stars: Array<{ obj: Phaser.GameObjects.Rectangle; phase: number; speed: number }> = [];
  private done = false;
  private totalHeight = 0;

  public constructor() {
    super("CreditsScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    this.add.rectangle(cx, h / 2, w, h, 0x070b12);

    for (let i = 0; i < 70; i++) {
      const star = this.add.rectangle(
        Math.random() * w,
        Math.random() * h,
        Math.random() < 0.15 ? 2 : 1,
        Math.random() < 0.15 ? 2 : 1,
        0x9be7ff,
        Math.random() * 0.45 + 0.08
      );
      this.stars.push({ obj: star, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.3 });
    }

    this.scrollContainer = this.add.container(cx, h + 30);
    let currentY = 0;

    for (const line of CREDITS_LINES) {
      const text = this.add.text(0, currentY, line.text, {
        fontFamily: "monospace",
        fontSize: line.size,
        color: line.color,
        align: "center"
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(text);
      currentY += parseInt(line.size, 10) + line.spacing;
    }

    this.totalHeight = currentY;
    this.input.keyboard?.once("keydown-ESC", () => this.exitScene());
    this.input.once("pointerdown", () => this.exitScene());

    this.add.text(w - 18, h - 18, "ESC or click to skip", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#334155"
    }).setOrigin(1, 1);
  }

  public override update(time: number, delta: number) {
    if (this.done) return;

    this.scrollContainer.y -= (delta / 1000) * 34;
    if (this.scrollContainer.y < -this.totalHeight) {
      this.exitScene();
      return;
    }

    const t = time / 1000;
    for (const star of this.stars) {
      star.obj.setAlpha(0.12 + 0.4 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase)));
    }
  }

  private exitScene() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(500, 7, 11, 18, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) this.scene.start("MainMenuScene");
    });
  }
}
