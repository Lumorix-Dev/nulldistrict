import Phaser from "phaser";
import { SaveSystem, type SaveSlot } from "../systems/SaveSystem";

export interface SaveSelectInitData {
  /** The scene to launch after a slot is chosen (receives { slot: number }) */
  targetScene: string;
  /** Optional HUD scene to launch alongside targetScene */
  hudScene?: string;
  /** Title override, e.g. "START CREATIVE MODE" */
  subtitle?: string;
}

const ROOM_COUNT = 5;

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export class SaveSelectScene extends Phaser.Scene {
  private initData!: SaveSelectInitData;

  public constructor() {
    super("SaveSelectScene");
  }

  public init(data: SaveSelectInitData) {
    this.initData = data;
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, w, h, 0x0a0a1a).setScrollFactor(0);
    this.drawGrid(w, h);
    this.spawnParticles(w, h);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, cy - 200, "SELECT SAVE SLOT", {
      fontFamily: "monospace", fontSize: "28px", color: "#00c8ff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    if (this.initData?.subtitle) {
      this.add.text(cx, cy - 166, this.initData.subtitle, {
        fontFamily: "monospace", fontSize: "13px", color: "#334155"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    }

    // Divider
    const divGfx = this.add.graphics().setScrollFactor(0).setDepth(10);
    divGfx.lineStyle(1, 0x00c8ff, 0.2);
    divGfx.lineBetween(cx - 300, cy - 150, cx + 300, cy - 150);

    // ── Slot cards ────────────────────────────────────────────────────────────
    const slots = SaveSystem.getAllSlots();
    const cardW = Math.min(240, (w - 80) / 3);
    const cardH = 200;
    const cardGap = 16;
    const totalW = cardW * 3 + cardGap * 2;
    const startX = cx - totalW / 2;

    for (let i = 0; i < 3; i++) {
      const slot = slots[i] ?? null;
      const cardCX = startX + i * (cardW + cardGap) + cardW / 2;
      const cardCY = cy - 20;

      this.buildCard(cardCX, cardCY, cardW, cardH, i + 1, slot);
    }

    // ── Back button ───────────────────────────────────────────────────────────
    this.createSmallButton(cx - 200, h - 40, "← Back", () => {
      this.scene.start("VoidCraftMenuScene");
    });

    // ── ESC ───────────────────────────────────────────────────────────────────
    if (this.input.keyboard) {
      this.input.keyboard.once("keydown-ESC", () => {
        this.scene.start("VoidCraftMenuScene");
      });
    }
  }

  private buildCard(
    cx: number, cy: number,
    cardW: number, cardH: number,
    slotNum: number,
    slot: SaveSlot | null
  ) {
    const left = cx - cardW / 2;
    const top = cy - cardH / 2;

    // Card background
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(9);
    gfx.fillStyle(0x0d1b2e, 0.95);
    gfx.fillRoundedRect(left, top, cardW, cardH, 8);
    gfx.lineStyle(1, slot ? 0x00c8ff : 0x1a2840, 0.6);
    gfx.strokeRoundedRect(left, top, cardW, cardH, 8);

    // Slot number
    this.add.text(cx, top + 14, `SLOT ${slotNum}`, {
      fontFamily: "monospace", fontSize: "10px", color: "#334155"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    if (slot) {
      // Name
      this.add.text(cx, top + 34, slot.name, {
        fontFamily: "monospace", fontSize: "14px", color: "#00c8ff"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      // Play time
      this.add.text(cx, top + 56, `⏱ ${formatTime(slot.playtime)}`, {
        fontFamily: "monospace", fontSize: "11px", color: "#7a9aaa"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      // Progress badge
      const rooms = slot.completedRooms.length;
      const badgeColor = rooms >= ROOM_COUNT ? "#00ff88" : "#ff006e";
      this.add.text(cx, top + 76, `🔓 ${rooms} / ${ROOM_COUNT} rooms`, {
        fontFamily: "monospace", fontSize: "11px", color: badgeColor
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      // Theme
      if (slot.worldTheme) {
        this.add.text(cx, top + 94, `🌍 ${slot.worldTheme}`, {
          fontFamily: "monospace", fontSize: "10px", color: "#334155"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
      }

      // CONTINUE button
      this.createCardButton(cx, top + 134, cardW - 32, 28, "CONTINUE", "#00ff88", 0x0d2e1a, () => {
        this.selectSlot(slotNum);
      });

      // DELETE button
      this.createCardButton(cx, top + 170, cardW - 32, 24, "DELETE", "#ff006e", 0x2e0d0d, () => {
        this.confirmDelete(slotNum);
      });
    } else {
      // Empty slot
      this.add.text(cx, top + 60, "Empty Slot", {
        fontFamily: "monospace", fontSize: "14px", color: "#334155"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      this.add.text(cx, top + 82, "No save data", {
        fontFamily: "monospace", fontSize: "10px", color: "#1a2840"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      // NEW GAME button
      this.createCardButton(cx, top + 152, cardW - 32, 30, "NEW GAME", "#00c8ff", 0x0d1e2e, () => {
        this.promptNewGame(slotNum);
      });
    }
  }

  private createCardButton(
    cx: number, cy: number,
    btnW: number, btnH: number,
    label: string,
    textColor: string,
    bgColor: number,
    onClick: () => void
  ) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(10);
    gfx.fillStyle(bgColor, 1);
    gfx.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 4);

    const btn = this.add.text(cx, cy, label, {
      fontFamily: "monospace", fontSize: "11px", color: textColor
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => { btn.setAlpha(0.75); });
    btn.on("pointerout", () => { btn.setAlpha(1); });
    btn.on("pointerdown", onClick);
  }

  private selectSlot(slotNum: number) {
    const target = this.initData?.targetScene ?? "CreativeScene";
    const hud = this.initData?.hudScene;
    this.scene.start(target, { slot: slotNum });
    if (hud) this.scene.launch(hud, { slot: slotNum });
  }

  private promptNewGame(slotNum: number) {
    // Use a simple name based on slot number and timestamp
    const name = `Save ${slotNum} — ${new Date().toLocaleDateString()}`;
    SaveSystem.createSlot(slotNum, name);
    this.selectSlot(slotNum);
  }

  private confirmDelete(slotNum: number) {
    // Show inline confirmation overlay
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(50).setInteractive();

    const box = this.add.graphics().setScrollFactor(0).setDepth(51);
    box.fillStyle(0x0d1b2e, 1);
    box.fillRoundedRect(cx - 180, cy - 70, 360, 140, 8);
    box.lineStyle(1, 0xff006e, 0.8);
    box.strokeRoundedRect(cx - 180, cy - 70, 360, 140, 8);

    const msg = this.add.text(cx, cy - 30, `Delete Slot ${slotNum}?\nThis cannot be undone.`, {
      fontFamily: "monospace", fontSize: "14px", color: "#ff006e", align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

    const confirmBtn = this.add.text(cx - 60, cy + 30, "DELETE", {
      fontFamily: "monospace", fontSize: "13px", color: "#ff006e",
      backgroundColor: "rgba(46,13,13,0.9)", padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52)
      .setInteractive({ useHandCursor: true });

    const cancelBtn = this.add.text(cx + 60, cy + 30, "CANCEL", {
      fontFamily: "monospace", fontSize: "13px", color: "#00c8ff",
      backgroundColor: "rgba(13,30,46,0.9)", padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(52)
      .setInteractive({ useHandCursor: true });

    const cleanup = () => {
      overlay.destroy(); box.destroy(); msg.destroy();
      confirmBtn.destroy(); cancelBtn.destroy();
    };

    confirmBtn.on("pointerdown", () => {
      cleanup();
      SaveSystem.deleteSlot(slotNum);
      this.scene.restart();
    });

    cancelBtn.on("pointerdown", cleanup);
  }

  private createSmallButton(x: number, y: number, label: string, onClick: () => void) {
    const btn = this.add.text(x, y, label, {
      fontFamily: "monospace", fontSize: "12px", color: "#5a8a9a",
      backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#00c8ff"));
    btn.on("pointerout", () => btn.setColor("#5a8a9a"));
    btn.on("pointerdown", onClick);
    return btn;
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(1);
    gfx.lineStyle(1, 0x00c8ff, 0.05);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x00c8ff, 0xff006e, 0x00ff88];
    for (let i = 0; i < 14; i++) {
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
