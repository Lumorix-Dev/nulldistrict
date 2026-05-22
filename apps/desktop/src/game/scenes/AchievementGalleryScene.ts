import Phaser from "phaser";
import { achievementSystem, type Achievement } from "../systems/AchievementSystem";
import { gameBus } from "../EventBus";

const COLS = 4;
const CARD_W = 200;
const CARD_H = 110;
const CARD_GAP = 14;
const GRID_TOP_OFFSET = 160;

export class AchievementGalleryScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private offAchievement!: () => void;

  public constructor() {
    super("AchievementGalleryScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, h / 2, w, h, 0x030610);
    this.drawGrid(w, h);
    this.spawnParticles(w, h);

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(cx, 60, w, 120, 0x050b14).setScrollFactor(0).setDepth(10);
    this.add.rectangle(cx, 120, w, 2, 0x1a3d55, 0.8).setScrollFactor(0).setDepth(10);

    this.add.text(cx, 28, "ACHIEVEMENTS", {
      fontFamily: "monospace", fontSize: "42px", color: "#9be7ff",
      stroke: "#001a28", strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

    const progress = achievementSystem.getProgress();
    this.drawProgressBar(cx, 82, 500, 18, progress.unlocked, progress.total);

    this.add.text(cx, 105, `${progress.unlocked} / ${progress.total} Unlocked`, {
      fontFamily: "monospace", fontSize: "12px", color: "#5a8a9a",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

    // ── Scrollable content ────────────────────────────────────────────────────
    this.contentContainer = this.add.container(0, GRID_TOP_OFFSET);
    this.buildGrid(w);

    // ── Back button ───────────────────────────────────────────────────────────
    const backBtn = this.add.text(20, 28, "← BACK", {
      fontFamily: "monospace", fontSize: "13px", color: "#5a8a9a",
      backgroundColor: "rgba(5,7,11,0.85)", padding: { x: 10, y: 5 },
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(12).setInteractive({ useHandCursor: true });
    backBtn.on("pointerover", () => backBtn.setColor("#9be7ff"));
    backBtn.on("pointerout", () => backBtn.setColor("#5a8a9a"));
    backBtn.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));

    // ── ESC to go back ────────────────────────────────────────────────────────
    this.input.keyboard!.on("keydown-ESC", () => this.scene.start("VoidCraftMenuScene"));

    // ── Mouse wheel scrolling ─────────────────────────────────────────────────
    this.input.on("wheel", (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
      this.scroll(dy * 0.8);
    });

    // ── Achievement popup listener ────────────────────────────────────────────
    this.offAchievement = gameBus.on("voidcraft:achievement", () => {
      // Rebuild grid in case a new achievement was just unlocked
      this.contentContainer.removeAll(true);
      this.buildGrid(w);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offAchievement());

    // ── Bottom gradient mask hint ─────────────────────────────────────────────
    this.add.rectangle(cx, h - 20, w, 40, 0x030610, 0.8).setScrollFactor(0).setDepth(10);
    this.add.text(cx, h - 20, "↑ SCROLL ↓", {
      fontFamily: "monospace", fontSize: "10px", color: "#1a3d55",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
  }

  private buildGrid(w: number) {
    const achievements = achievementSystem.getAll();
    const gridW = COLS * CARD_W + (COLS - 1) * CARD_GAP;
    const startX = (w - gridW) / 2 + CARD_W / 2;

    achievements.forEach((a, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + CARD_GAP);
      const y = row * (CARD_H + CARD_GAP);
      this.buildCard(x, y, a);
    });

    const rows = Math.ceil(achievements.length / COLS);
    const totalContentH = rows * (CARD_H + CARD_GAP) + 20;
    this.maxScrollY = Math.max(0, totalContentH - (this.scale.height - GRID_TOP_OFFSET - 40));
  }

  private buildCard(x: number, y: number, a: Achievement) {
    const isSecret = a.secret && !a.unlocked;
    const alpha = a.unlocked ? 1 : 0.4;

    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H,
      a.unlocked ? 0x0d1f30 : 0x080d14, a.unlocked ? 1 : 0.9
    ).setStrokeStyle(1,
      a.unlocked ? 0x9be7ff : 0x1a3d55,
      a.unlocked ? 0.7 : 0.25
    );

    const children: Phaser.GameObjects.GameObject[] = [bg];

    if (a.unlocked) {
      // Glow bar at top
      children.push(
        this.add.rectangle(0, -CARD_H / 2 + 2, CARD_W - 2, 3, 0x9be7ff, 0.5)
      );
    }

    // Icon
    const iconText = isSecret ? "?" : a.icon;
    children.push(
      this.add.text(-CARD_W / 2 + 18, -28, iconText, {
        fontSize: isSecret ? "22px" : "26px",
        color: a.unlocked ? "#ffffff" : "#334155",
        alpha,
      }).setOrigin(0, 0.5)
    );

    // Title
    const title = isSecret ? "???" : a.title;
    children.push(
      this.add.text(-CARD_W / 2 + 44, -28, title, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: a.unlocked ? "#9be7ff" : "#2a4050",
        wordWrap: { width: CARD_W - 52 },
      }).setOrigin(0, 0.5)
    );

    // Description
    const desc = isSecret ? "Secret achievement" : a.description;
    children.push(
      this.add.text(-CARD_W / 2 + 10, 2, desc, {
        fontFamily: "monospace",
        fontSize: "9px",
        color: a.unlocked ? "#c8e8f0" : "#1a3040",
        wordWrap: { width: CARD_W - 20 },
        lineSpacing: 2,
      }).setOrigin(0, 0)
    );

    // Unlock date
    if (a.unlocked && a.unlockedAt) {
      const date = new Date(a.unlockedAt).toLocaleDateString();
      children.push(
        this.add.text(CARD_W / 2 - 8, CARD_H / 2 - 10, `✓ ${date}`, {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#45f5c8",
        }).setOrigin(1, 1)
      );
    } else if (!a.unlocked) {
      children.push(
        this.add.text(CARD_W / 2 - 8, CARD_H / 2 - 10, "LOCKED", {
          fontFamily: "monospace",
          fontSize: "8px",
          color: "#1a3040",
        }).setOrigin(1, 1)
      );
    }

    const card = this.add.container(x, y, children);
    this.contentContainer.add(card);
  }

  private drawProgressBar(cx: number, y: number, bw: number, bh: number, unlocked: number, total: number) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(11);
    gfx.fillStyle(0x0a1525);
    gfx.fillRect(cx - bw / 2, y - bh / 2, bw, bh);
    gfx.lineStyle(1, 0x1a3d55, 0.8);
    gfx.strokeRect(cx - bw / 2, y - bh / 2, bw, bh);
    const frac = total > 0 ? unlocked / total : 0;
    if (frac > 0) {
      const fillW = (bw - 2) * frac;
      // Gradient-like fill
      gfx.fillStyle(0x1a5a8a);
      gfx.fillRect(cx - bw / 2 + 1, y - bh / 2 + 1, fillW, bh - 2);
      gfx.fillStyle(0x9be7ff, 0.4);
      gfx.fillRect(cx - bw / 2 + 1, y - bh / 2 + 1, fillW, Math.floor(bh / 2) - 1);
    }
  }

  private scroll(dy: number) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScrollY);
    this.contentContainer.y = GRID_TOP_OFFSET - this.scrollY;
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a3d55, 0.08);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x9be7ff, 0x45f5c8, 0xffe066, 0x9b00ff];
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const size = 1 + Math.random() * 2;
      const dot = this.add.rectangle(px, py, size, size, color, 0.4);
      this.tweens.add({
        targets: dot,
        y: py - 60 - Math.random() * 80,
        alpha: 0,
        duration: 4000 + Math.random() * 3000,
        delay: Math.random() * 3000,
        repeat: -1,
        repeatDelay: Math.random() * 2000,
        onRepeat: () => {
          dot.x = Math.random() * w;
          dot.y = h + 10;
          dot.setAlpha(0.4);
        },
      });
    }
  }
}
