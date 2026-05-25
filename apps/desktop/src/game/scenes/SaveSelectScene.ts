import Phaser from "phaser";
import { CAMPAIGN_ROOM_ORDER, SaveSystem, type SaveSlot } from "../systems/SaveSystem";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export class SaveSelectScene extends Phaser.Scene {
  public constructor() {
    super("SaveSelectScene");
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;
    const slots = SaveSystem.getAllSlots();
    const activeSlot = SaveSystem.getActiveSlotNumber();

    this.add.rectangle(cx, cy, w, h, 0x080c14);
    this.drawGrid(w, h);

    this.add.text(cx, 64, "CASE FILES", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#00c8ff"
    }).setOrigin(0.5);

    this.add.text(cx, 98, "Choose a save slot for the solo investigation campaign.", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a"
    }).setOrigin(0.5);

    const cardW = Math.min(260, (w - 90) / 3);
    const cardH = 230;
    const gap = 18;
    const totalW = cardW * 3 + gap * 2;
    const startX = cx - totalW / 2;

    for (let i = 0; i < 3; i++) {
      const slotNumber = i + 1;
      const slot = slots[i] ?? null;
      this.buildCard(
        startX + i * (cardW + gap) + cardW / 2,
        cy + 16,
        cardW,
        cardH,
        slotNumber,
        slot,
        slotNumber === activeSlot
      );
    }

    this.createBackButton(cx, h - 34);
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("MainMenuScene"));
  }

  private buildCard(
    cx: number,
    cy: number,
    width: number,
    height: number,
    slotNumber: number,
    slot: SaveSlot | null,
    isActive: boolean
  ) {
    const left = cx - width / 2;
    const top = cy - height / 2;
    const primaryClears = slot?.completedRooms.filter((roomId) => CAMPAIGN_ROOM_ORDER.includes(roomId as (typeof CAMPAIGN_ROOM_ORDER)[number])).length ?? 0;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1b2e, 0.96);
    bg.fillRoundedRect(left, top, width, height, 8);
    bg.lineStyle(1, isActive ? 0x45f5c8 : slot ? 0x00c8ff : 0x1a2840, 0.7);
    bg.strokeRoundedRect(left, top, width, height, 8);

    this.add.text(cx, top + 18, `FILE ${slotNumber}`, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#334155"
    }).setOrigin(0.5);

    if (isActive) {
      this.add.text(cx, top + 36, "ACTIVE", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#45f5c8"
      }).setOrigin(0.5);
    }

    if (!slot) {
      this.add.text(cx, cy - 34, "Empty File", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#7a9aaa"
      }).setOrigin(0.5);

      this.add.text(cx, cy - 4, "No progress recorded yet.", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#334155"
      }).setOrigin(0.5);

      this.createCardButton(cx, top + height - 42, width - 30, 32, "NEW FILE", "#00c8ff", () => {
        SaveSystem.createSlot(slotNumber, `Case File ${slotNumber}`);
        this.scene.start("PuzzleSelectScene");
      });
      return;
    }

    this.add.text(cx, top + 62, slot.name, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#00c8ff"
    }).setOrigin(0.5);

    this.add.text(cx, top + 88, `Playtime  ${formatTime(slot.playtime)}`, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#7a9aaa"
    }).setOrigin(0.5);

    this.add.text(cx, top + 112, `Main rooms  ${primaryClears}/${CAMPAIGN_ROOM_ORDER.length}`, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#45f5c8"
    }).setOrigin(0.5);

    this.add.text(cx, top + 136, slot.campaignCompleted ? "Secret room unlocked" : "Secret room locked", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: slot.campaignCompleted ? "#ffe066" : "#334155"
    }).setOrigin(0.5);

    this.add.text(cx, top + 164, `Rooms cleared: ${slot.completedRooms.length}`, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#7a9aaa"
    }).setOrigin(0.5);

    this.createCardButton(cx, top + height - 74, width - 30, 30, "OPEN FILE", "#45f5c8", () => {
      SaveSystem.setActiveSlot(slotNumber);
      this.scene.start("PuzzleSelectScene");
    });

    this.createCardButton(cx, top + height - 38, width - 30, 24, "DELETE", "#ff7aa2", () => {
      SaveSystem.deleteSlot(slotNumber);
      this.scene.restart();
    });
  }

  private createCardButton(cx: number, cy: number, width: number, height: number, label: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(cx, cy, width, height, 0x0b1522, 0.98);
    bg.setStrokeStyle(1, parseInt(color.replace("#", "0x")), 0.75);
    const txt = this.add.text(cx, cy, label, {
      fontFamily: "monospace",
      fontSize: "11px",
      color
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => txt.setAlpha(0.8));
    bg.on("pointerout", () => txt.setAlpha(1));
    bg.on("pointerdown", onClick);
  }

  private createBackButton(x: number, y: number) {
    const btn = this.add.text(x, y, "BACK TO MENU", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#00c8ff"));
    btn.on("pointerout", () => btn.setColor("#5a8a9a"));
    btn.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x173248, 0.12);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }
}
