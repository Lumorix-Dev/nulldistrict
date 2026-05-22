import Phaser from "phaser";

interface ScoreEntry {
  name: string;
  time: number;
  date: number;
}

const ROOM_IDS = [
  "escape-room-1",
  "escape-room-2",
  "escape-room-3",
  "escape-room-4",
  "escape-room-5",
];

const ROOM_LABELS: Record<string, string> = {
  "escape-room-1": "Level 1 — The Signal Lock",
  "escape-room-2": "Level 2 — The Circuit",
  "escape-room-3": "Level 3 — The Labyrinth",
  "escape-room-4": "Level 4 — The Clockwork",
  "escape-room-5": "Level 5 — The Void Core",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export class LeaderboardScene extends Phaser.Scene {
  private activeTab = 0;
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private contentContainer!: Phaser.GameObjects.Container;

  public constructor() {
    super("LeaderboardScene");
  }

  // ── Static API ──────────────────────────────────────────────────────────

  static recordScore(roomId: string, name: string, timeSeconds: number): void {
    const key = `voidcraft:scores:${roomId}`;
    const scores: ScoreEntry[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    scores.push({ name, time: timeSeconds, date: Date.now() });
    scores.sort((a, b) => a.time - b.time);
    localStorage.setItem(key, JSON.stringify(scores.slice(0, 10)));
  }

  private static loadScores(roomId: string): ScoreEntry[] {
    const key = `voidcraft:scores:${roomId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed: ScoreEntry[] = JSON.parse(raw);
      return parsed.sort((a, b) => a.time - b.time);
    } catch {
      return [];
    }
  }

  // ── Scene lifecycle ─────────────────────────────────────────────────────

  public init(data: { activeTab?: number }) {
    this.activeTab = data?.activeTab ?? 0;
  }

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Background
    this.add.rectangle(cx, h / 2, w, h, 0x0a0a1a);
    this.drawGrid(w, h);
    this.spawnParticles(w, h);

    // Title
    this.add.text(cx, 36, "⏱️ LEADERBOARD", {
      fontFamily: "monospace", fontSize: "30px", color: "#00c8ff",
    }).setOrigin(0.5).setDepth(10);

    this.add.text(cx, 68, "Best escape times by level", {
      fontFamily: "monospace", fontSize: "13px", color: "#334155",
    }).setOrigin(0.5).setDepth(10);

    // Divider
    const divGfx = this.add.graphics().setDepth(10);
    divGfx.lineStyle(1, 0x00c8ff, 0.25);
    divGfx.lineBetween(cx - 300, 84, cx + 300, 84);

    // Tab bar
    this.buildTabs(cx, w);

    // Content area
    this.contentContainer = this.add.container(0, 0).setDepth(10);
    this.renderTab(this.activeTab);

    // Back button
    this.createBackButton(cx, h - 36);

    // ESC
    this.input.keyboard!.once("keydown-ESC", () => {
      this.scene.start("VoidCraftMenuScene");
    });
  }

  private buildTabs(cx: number, w: number) {
    const tabW = Math.min(120, (w - 80) / ROOM_IDS.length);
    const totalW = tabW * ROOM_IDS.length + 8 * (ROOM_IDS.length - 1);
    const startX = cx - totalW / 2;

    for (let i = 0; i < ROOM_IDS.length; i++) {
      const tx = startX + i * (tabW + 8) + tabW / 2;
      const ty = 106;
      const isActive = i === this.activeTab;

      const gfx = this.add.graphics().setDepth(10);
      const bg = isActive ? 0x0d2b3e : 0x0d1b2e;
      const border = isActive ? 0x00c8ff : 0x334155;
      gfx.fillStyle(bg, 0.95);
      gfx.fillRoundedRect(tx - tabW / 2, ty - 12, tabW, 24, 4);
      gfx.lineStyle(1, border, 0.8);
      gfx.strokeRoundedRect(tx - tabW / 2, ty - 12, tabW, 24, 4);

      const txt = this.add.text(tx, ty, `Lv.${i + 1}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: isActive ? "#00c8ff" : "#5a8a9a",
      }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

      const tabIndex = i;
      txt.on("pointerdown", () => {
        this.scene.restart({ activeTab: tabIndex });
      });
      txt.on("pointerover", () => { if (tabIndex !== this.activeTab) txt.setColor("#9be7ff"); });
      txt.on("pointerout", () => { if (tabIndex !== this.activeTab) txt.setColor("#5a8a9a"); });

      this.tabTexts.push(txt);
    }
  }

  private renderTab(tabIndex: number) {
    this.contentContainer.removeAll(true);

    const cx = this.scale.width / 2;
    const roomId = ROOM_IDS[tabIndex]!;
    const label = ROOM_LABELS[roomId] ?? roomId;
    const scores = LeaderboardScene.loadScores(roomId);

    // Room title
    const headerTxt = this.add.text(cx, 142, label, {
      fontFamily: "monospace", fontSize: "16px", color: "#ff006e",
    }).setOrigin(0.5).setDepth(11);
    this.contentContainer.add(headerTxt);

    if (scores.length === 0) {
      const emptyTxt = this.add.text(cx, 220, "No times recorded yet", {
        fontFamily: "monospace", fontSize: "14px", color: "#334155",
      }).setOrigin(0.5).setDepth(11);
      this.contentContainer.add(emptyTxt);
      return;
    }

    // Column headers
    const colY = 168;
    const rankX = cx - 220;
    const nameX = cx - 120;
    const timeX = cx + 100;
    const dateX = cx + 200;

    const addHeader = (x: number, t: string) => {
      const h = this.add.text(x, colY, t, {
        fontFamily: "monospace", fontSize: "11px", color: "#334155",
      }).setOrigin(0, 0).setDepth(11);
      this.contentContainer.add(h);
    };
    addHeader(rankX, "#");
    addHeader(nameX, "PLAYER");
    addHeader(timeX - 30, "TIME");
    addHeader(dateX - 30, "DATE");

    // Divider
    const divGfx = this.add.graphics().setDepth(11);
    divGfx.lineStyle(1, 0x334155, 0.4);
    divGfx.lineBetween(cx - 240, colY + 16, cx + 240, colY + 16);
    this.contentContainer.add(divGfx);

    // Rows (top 5)
    const top5 = scores.slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
      const entry = top5[i]!;
      const rowY = colY + 26 + i * 32;
      const isFirst = i === 0;

      // Row highlight
      if (isFirst) {
        const rowBg = this.add.rectangle(cx, rowY + 10, 480, 28, 0x0d2b1e, 0.7)
          .setDepth(10);
        this.contentContainer.add(rowBg);
      }

      const rankColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#5a8a9a";
      const rankLabel = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

      const addCell = (x: number, text: string, color: string) => {
        const t = this.add.text(x, rowY, text, {
          fontFamily: "monospace", fontSize: "13px", color,
        }).setOrigin(0, 0).setDepth(11);
        this.contentContainer.add(t);
      };

      addCell(rankX, rankLabel, rankColor);
      addCell(nameX, entry.name.substring(0, 12), isFirst ? "#00ff88" : "#9be7ff");
      addCell(timeX - 30, formatTime(entry.time), isFirst ? "#ffd700" : "#00c8ff");
      addCell(dateX - 30, new Date(entry.date).toLocaleDateString(), "#334155");
    }
  }

  private createBackButton(x: number, y: number) {
    const btn = this.add.text(x, y, "← Back", {
      fontFamily: "monospace", fontSize: "13px", color: "#5a8a9a",
      backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#00c8ff"));
    btn.on("pointerout", () => btn.setColor("#5a8a9a"));
    btn.on("pointerdown", () => this.scene.start("VoidCraftMenuScene"));
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics().setDepth(1);
    gfx.lineStyle(1, 0x00c8ff, 0.04);
    for (let x = 0; x < w; x += 48) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 48) gfx.lineBetween(0, y, w, y);
  }

  private spawnParticles(w: number, h: number) {
    const colors = [0x00c8ff, 0xff006e, 0x00ff88];
    for (let i = 0; i < 16; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const rect = this.add.rectangle(px, py, 1 + Math.random() * 2, 1 + Math.random() * 2, color, 0.3).setDepth(2);
      this.tweens.add({
        targets: rect,
        y: py - 60 - Math.random() * 80,
        alpha: 0,
        duration: 3500 + Math.random() * 3500,
        delay: Math.random() * 2500,
        repeat: -1,
        repeatDelay: Math.random() * 1500,
        onRepeat: () => { rect.x = Math.random() * w; rect.y = h + 10; rect.setAlpha(0.3); }
      });
    }
  }
}
