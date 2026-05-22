import Phaser from "phaser";
import { achievementSystem } from "../systems/AchievementSystem";
import { SaveSystem } from "../systems/SaveSystem";

const ROOM_IDS = [
  "escape-room-1",
  "escape-room-2",
  "escape-room-3",
  "escape-room-4",
  "escape-room-5",
];

const ROOM_LABELS: Record<string, string> = {
  "escape-room-1": "Lv.1 The Awakening",
  "escape-room-2": "Lv.2 The Circuit",
  "escape-room-3": "Lv.3 The Labyrinth",
  "escape-room-4": "Lv.4 The Clockwork",
  "escape-room-5": "Lv.5 The Void Core",
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export class StatsScene extends Phaser.Scene {
  public constructor() {
    super("StatsScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, h / 2, w, h, 0x0a0a1a).setScrollFactor(0);
    this.drawGrid(w, h);
    this.spawnParticles(w, h);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, 36, "📊 STATS & PROFILE", {
      fontFamily: "monospace", fontSize: "30px", color: "#00c8ff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.add.text(cx, 68, "VoidCraft · All-time statistics", {
      fontFamily: "monospace", fontSize: "13px", color: "#334155"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    // Divider
    const divGfx = this.add.graphics().setScrollFactor(0).setDepth(10);
    divGfx.lineStyle(1, 0x00c8ff, 0.25);
    divGfx.lineBetween(cx - 280, 84, cx + 280, 84);

    // ── Global stats ──────────────────────────────────────────────────────────
    const global = SaveSystem.getGlobal();
    const slots = SaveSystem.getAllSlots();

    const totalRoomsCompleted = new Set<string>();
    let totalBlocks = 0;
    for (const slot of slots) {
      if (!slot) continue;
      slot.completedRooms.forEach(r => totalRoomsCompleted.add(r));
      totalBlocks += slot.blockCount;
    }

    const achievements = achievementSystem.getAll();
    const unlocked = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;

    const statsRows: [string, string][] = [
      ["⏱  Total Play Time", formatTime(global.totalPlaytime)],
      ["🧱  Total Blocks Placed", String(totalBlocks)],
      ["🔓  Rooms Completed", `${totalRoomsCompleted.size} / ${ROOM_IDS.length}`],
      ["🏆  Achievements", `${unlocked} / ${total}`],
    ];

    let sy = 110;
    for (const [label, value] of statsRows) {
      this.add.text(cx - 200, sy, label, {
        fontFamily: "monospace", fontSize: "14px", color: "#7a9aaa"
      }).setScrollFactor(0).setDepth(10);
      this.add.text(cx + 200, sy, value, {
        fontFamily: "monospace", fontSize: "14px", color: "#00ff88"
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);
      sy += 22;
    }

    // ── Best Times ────────────────────────────────────────────────────────────
    sy += 14;
    this.add.text(cx, sy, "BEST TIMES", {
      fontFamily: "monospace", fontSize: "14px", color: "#ff006e"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    sy += 20;

    for (const roomId of ROOM_IDS) {
      // Find best time across all slots
      let best: number | undefined;
      for (const slot of slots) {
        if (!slot) continue;
        const t = slot.highScores[roomId];
        if (t !== undefined && (best === undefined || t < best)) best = t;
      }

      const label = ROOM_LABELS[roomId] ?? roomId;
      const valueStr = best !== undefined ? formatSeconds(best) : "—";
      const valueColor = best !== undefined ? "#00c8ff" : "#334155";

      this.add.text(cx - 200, sy, label, {
        fontFamily: "monospace", fontSize: "12px", color: "#5a8a9a"
      }).setScrollFactor(0).setDepth(10);
      this.add.text(cx + 200, sy, valueStr, {
        fontFamily: "monospace", fontSize: "12px", color: valueColor
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);
      sy += 18;
    }

    // ── Save Slot Cards ───────────────────────────────────────────────────────
    sy += 18;
    this.add.text(cx, sy, "SAVE SLOTS", {
      fontFamily: "monospace", fontSize: "14px", color: "#ff006e"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    sy += 18;

    const cardW = Math.min(220, (w - 60) / 3);
    const cardH = 90;
    const cardGap = 12;
    const totalCardsW = cardW * 3 + cardGap * 2;
    const cardStartX = cx - totalCardsW / 2;

    for (let i = 0; i < 3; i++) {
      const slot = slots[i] ?? null;
      const cx2 = cardStartX + i * (cardW + cardGap) + cardW / 2;
      const cy2 = sy + cardH / 2;

      // Card bg
      const gfx = this.add.graphics().setScrollFactor(0).setDepth(9);
      const borderColor = slot ? 0x00c8ff : 0x1a2840;
      gfx.fillStyle(0x0d1b2e, 0.9);
      gfx.fillRoundedRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH, 6);
      gfx.lineStyle(1, borderColor, 0.6);
      gfx.strokeRoundedRect(cx2 - cardW / 2, cy2 - cardH / 2, cardW, cardH, 6);

      const slotLabel = `SLOT ${i + 1}`;
      this.add.text(cx2, cy2 - 30, slotLabel, {
        fontFamily: "monospace", fontSize: "10px", color: "#334155"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      if (slot) {
        this.add.text(cx2, cy2 - 14, slot.name, {
          fontFamily: "monospace", fontSize: "12px", color: "#00c8ff"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        this.add.text(cx2, cy2 + 4, `⏱ ${formatTime(slot.playtime)}`, {
          fontFamily: "monospace", fontSize: "10px", color: "#7a9aaa"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        const rooms = slot.completedRooms.length;
        this.add.text(cx2, cy2 + 20, `🔓 ${rooms} / ${ROOM_IDS.length} rooms`, {
          fontFamily: "monospace", fontSize: "10px", color: "#00ff88"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        if (slot.worldTheme) {
          this.add.text(cx2, cy2 + 36, `🌍 ${slot.worldTheme}`, {
            fontFamily: "monospace", fontSize: "9px", color: "#334155"
          }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
        }
      } else {
        this.add.text(cx2, cy2, "Empty Slot", {
          fontFamily: "monospace", fontSize: "12px", color: "#334155"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
      }
    }

    sy += cardH + 24;

    // ── Back button ───────────────────────────────────────────────────────────
    this.createBackButton(cx, h - 36);

    // ── ESC to go back ────────────────────────────────────────────────────────
    if (this.input.keyboard) {
      this.input.keyboard.once("keydown-ESC", () => {
        this.scene.start("VoidCraftMenuScene");
      });
    }
  }

  private createBackButton(x: number, y: number) {
    const btn = this.add.text(x, y, "← Back", {
      fontFamily: "monospace", fontSize: "13px", color: "#5a8a9a",
      backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#00c8ff"));
    btn.on("pointerout", () => btn.setColor("#5a8a9a"));
    btn.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(1);
    gfx.lineStyle(1, 0x00c8ff, 0.05);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x00c8ff, 0xff006e, 0x00ff88];
    for (let i = 0; i < 16; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const size = 1 + Math.random() * 2;
      const rect = this.add.rectangle(px, py, size, size, color, 0.4)
        .setScrollFactor(0).setDepth(2);
      this.tweens.add({
        targets: rect,
        y: py - 60 - Math.random() * 80,
        alpha: 0,
        duration: 3500 + Math.random() * 3500,
        delay: Math.random() * 2500,
        repeat: -1,
        repeatDelay: Math.random() * 1500,
        onRepeat: () => {
          rect.x = Math.random() * w;
          rect.y = h + 10;
          rect.setAlpha(0.4);
        }
      });
    }
  }
}
