import Phaser from "phaser";
import { CAMPAIGN_ROOM_ORDER, SaveSystem } from "../systems/SaveSystem";

export class MainMenuScene extends Phaser.Scene {
  public constructor() {
    super("MainMenuScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const activeSlot = SaveSystem.getActiveSlot();
    const roomsCleared = activeSlot?.completedRooms.filter((roomId) => CAMPAIGN_ROOM_ORDER.includes(roomId as (typeof CAMPAIGN_ROOM_ORDER)[number])).length ?? 0;

    this.add.rectangle(cx, cy, w, h, 0x04070d);
    this.drawGrid(w, h);
    this.spawnDust(w, h);

    this.add.text(cx, 96, "NULL DISTRICT", {
      fontFamily: "monospace",
      fontSize: "42px",
      color: "#9be7ff"
    }).setOrigin(0.5);

    this.add.text(cx, 138, "Solo Escape Room Campaign", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#5a8a9a"
    }).setOrigin(0.5);

    this.add.text(
      cx,
      196,
      activeSlot
        ? `Active file: ${activeSlot.name}  |  ${roomsCleared}/${CAMPAIGN_ROOM_ORDER.length} main rooms cleared`
        : "No active file selected. Create a case file to begin the investigation.",
      {
        fontFamily: "monospace",
        fontSize: "11px",
        color: activeSlot ? "#45f5c8" : "#7a9aaa",
        align: "center"
      }
    ).setOrigin(0.5);

    const primaryLabel = activeSlot ? "Continue Active File" : "Begin Investigation";
    const primaryAction = () => {
      if (SaveSystem.getActiveSlot()) {
        this.scene.start("PuzzleSelectScene");
      } else {
        this.scene.start("SaveSelectScene");
      }
    };

    this.createButton(cx, cy - 40, primaryLabel, "#9be7ff", primaryAction);
    this.createButton(cx, cy + 18, "Case Files", "#45f5c8", () => this.scene.start("SaveSelectScene"));
    this.createButton(cx, cy + 76, "How To Play", "#ffe066", () => this.scene.start("TutorialScene"));
    this.createButton(cx, cy + 134, "Stats", "#ff7aa2", () => this.scene.start("StatsScene"));
    this.createButton(cx, cy + 192, "Achievements", "#c9a4ff", () => this.scene.start("AchievementGalleryScene"));
    this.createButton(cx, cy + 250, "Credits", "#7df9ff", () => this.scene.start("CreditsScene"));

    this.add.text(cx, h - 28, "ESC pause in rooms  |  F interact  |  Space jump", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#334155"
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 320, 42, 0x0d1a22, 0.92);
    bg.setStrokeStyle(1, parseInt(color.replace("#", "0x")), 0.75);
    const txt = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "15px",
      color
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      bg.setStrokeStyle(2, parseInt(color.replace("#", "0x")), 1);
      txt.setScale(1.04);
    });
    bg.on("pointerout", () => {
      bg.setStrokeStyle(1, parseInt(color.replace("#", "0x")), 0.75);
      txt.setScale(1);
    });
    bg.on("pointerdown", onClick);
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x173248, 0.18);
    for (let x = 0; x < w; x += 56) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 56) gfx.lineBetween(0, y, w, y);
  }

  private spawnDust(w: number, h: number) {
    const colors = [0x9be7ff, 0x45f5c8, 0xff7aa2];
    for (let i = 0; i < 18; i++) {
      const dot = this.add.rectangle(
        Math.random() * w,
        Math.random() * h,
        1 + Math.random() * 2,
        1 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)]!,
        0.28
      );

      this.tweens.add({
        targets: dot,
        y: dot.y - 70 - Math.random() * 80,
        alpha: 0,
        duration: 4000 + Math.random() * 2800,
        delay: Math.random() * 2400,
        repeat: -1,
        repeatDelay: Math.random() * 1800,
        onRepeat: () => {
          dot.x = Math.random() * w;
          dot.y = h + 12;
          dot.setAlpha(0.28);
        }
      });
    }
  }
}
