import Phaser from "phaser";
import { achievementSystem } from "../systems/AchievementSystem";
import { ALL_ROOM_IDS, CAMPAIGN_ROOM_ORDER, ROOM_LABELS, SaveSystem } from "../systems/SaveSystem";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSeconds(sec?: number): string {
  if (sec === undefined) return "--:--";
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
    const global = SaveSystem.getGlobal();
    const slots = SaveSystem.getAllSlots();
    const unlocked = achievementSystem.getAll().filter((entry) => entry.unlocked).length;
    const completedRooms = new Set<string>();
    const completedFiles = slots.filter((slot) => slot?.campaignCompleted).length;

    for (const slot of slots) {
      slot?.completedRooms.forEach((roomId) => completedRooms.add(roomId));
    }

    this.add.rectangle(cx, h / 2, w, h, 0x080c14);
    this.drawGrid(w, h);

    this.add.text(cx, 42, "CAMPAIGN STATS", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#00c8ff"
    }).setOrigin(0.5);

    this.add.text(cx, 74, "Local solo progress across all case files", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a"
    }).setOrigin(0.5);

    const summaryRows: [string, string][] = [
      ["Total playtime", formatTime(global.totalPlaytime)],
      ["Case files completed", `${completedFiles}/3`],
      ["Rooms cleared", `${completedRooms.size}/${ALL_ROOM_IDS.length}`],
      ["Achievements", `${unlocked}/${achievementSystem.getAll().length}`]
    ];

    let y = 118;
    for (const [label, value] of summaryRows) {
      this.add.text(cx - 220, y, label, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#7a9aaa"
      });
      this.add.text(cx + 220, y, value, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#45f5c8"
      }).setOrigin(1, 0);
      y += 22;
    }

    y += 18;
    this.add.text(cx, y, "BEST TIMES", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ff7aa2"
    }).setOrigin(0.5);
    y += 24;

    for (const roomId of ALL_ROOM_IDS) {
      this.add.text(cx - 240, y, ROOM_LABELS[roomId] ?? roomId, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#7a9aaa"
      });
      this.add.text(cx + 240, y, formatSeconds(SaveSystem.getBestTimeForRoom(roomId)), {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#00c8ff"
      }).setOrigin(1, 0);
      y += 18;
    }

    y += 18;
    this.add.text(cx, y, "CASE FILES", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ff7aa2"
    }).setOrigin(0.5);
    y += 22;

    const cardW = Math.min(220, (w - 60) / 3);
    const gap = 14;
    const totalW = cardW * 3 + gap * 2;
    const startX = cx - totalW / 2;
    const activeSlot = SaveSystem.getActiveSlotNumber();

    for (let i = 0; i < 3; i++) {
      const slot = slots[i] ?? null;
      const cardCx = startX + i * (cardW + gap) + cardW / 2;
      const cardCy = y + 56;

      const bg = this.add.graphics();
      bg.fillStyle(0x0d1b2e, 0.95);
      bg.fillRoundedRect(cardCx - cardW / 2, cardCy - 48, cardW, 104, 8);
      bg.lineStyle(1, i + 1 === activeSlot ? 0x45f5c8 : 0x1a2840, 0.7);
      bg.strokeRoundedRect(cardCx - cardW / 2, cardCy - 48, cardW, 104, 8);

      this.add.text(cardCx, cardCy - 34, `FILE ${i + 1}${i + 1 === activeSlot ? "  ACTIVE" : ""}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: i + 1 === activeSlot ? "#45f5c8" : "#334155"
      }).setOrigin(0.5);

      if (!slot) {
        this.add.text(cardCx, cardCy, "Empty", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#334155"
        }).setOrigin(0.5);
        continue;
      }

      const mainRoomClears = slot.completedRooms.filter((roomId) => CAMPAIGN_ROOM_ORDER.includes(roomId as (typeof CAMPAIGN_ROOM_ORDER)[number])).length;
      this.add.text(cardCx, cardCy - 12, slot.name, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#00c8ff"
      }).setOrigin(0.5);
      this.add.text(cardCx, cardCy + 8, `Playtime  ${formatTime(slot.playtime)}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#7a9aaa"
      }).setOrigin(0.5);
      this.add.text(cardCx, cardCy + 28, `Main rooms  ${mainRoomClears}/${CAMPAIGN_ROOM_ORDER.length}`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#45f5c8"
      }).setOrigin(0.5);
    }

    const back = this.add.text(cx, h - 34, "BACK TO MENU", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    back.on("pointerover", () => back.setColor("#00c8ff"));
    back.on("pointerout", () => back.setColor("#5a8a9a"));
    back.on("pointerdown", () => this.scene.start("MainMenuScene"));
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("MainMenuScene"));
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x173248, 0.12);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }
}
