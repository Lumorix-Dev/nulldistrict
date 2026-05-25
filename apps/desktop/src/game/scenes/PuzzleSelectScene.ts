import Phaser from "phaser";
import { BONUS_ROOM_ID, CAMPAIGN_ROOM_ORDER, ROOM_LABELS, SaveSystem, type SaveSlot } from "../systems/SaveSystem";

interface LevelInfo {
  key: string;
  roomId: string;
  number: number;
  title: string;
  subtitle: string;
  mechanics: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  accentColor: number;
  secret?: boolean;
}

const LEVELS: LevelInfo[] = [
  {
    key: "EscapeRoom1Scene",
    roomId: "escape-room-1",
    number: 1,
    title: "The Signal Lock",
    subtitle: "Two keys, one lever, one locked route.",
    mechanics: ["Keys", "Levers", "Doors"],
    difficulty: 1,
    accentColor: 0x9be7ff
  },
  {
    key: "EscapeRoom2Scene",
    roomId: "escape-room-2",
    number: 2,
    title: "The Code Chamber",
    subtitle: "Read the room. Gather the digits. Enter the sequence.",
    mechanics: ["Pressure Plates", "Code Panels", "Clues"],
    difficulty: 2,
    accentColor: 0xd18cff
  },
  {
    key: "EscapeRoom3Scene",
    roomId: "escape-room-3",
    number: 3,
    title: "Mirror Maze",
    subtitle: "Collect shards and solve the reflected pattern.",
    mechanics: ["Shards", "Pattern Levers", "Route Reading"],
    difficulty: 3,
    accentColor: 0x7df9ff
  },
  {
    key: "EscapeRoom4Scene",
    roomId: "escape-room-4",
    number: 4,
    title: "The Clockwork",
    subtitle: "A time window turns movement into the puzzle.",
    mechanics: ["Timed Switches", "Moving Platforms", "Routing"],
    difficulty: 4,
    accentColor: 0xf1c84b
  },
  {
    key: "EscapeRoom5Scene",
    roomId: "escape-room-5",
    number: 5,
    title: "The Void Core",
    subtitle: "A full multi-stage final room testing every skill.",
    mechanics: ["All Core Mechanics", "Sequence Logic", "Final Gate"],
    difficulty: 5,
    accentColor: 0x9b00ff
  },
  {
    key: "EscapeRoom6Scene",
    roomId: BONUS_ROOM_ID,
    number: 6,
    title: "The Null Core",
    subtitle: "A secret bonus chamber unlocked after the full campaign.",
    mechanics: ["Bonus Shards", "Null Code", "Final Lever Chain"],
    difficulty: 5,
    accentColor: 0xffd700,
    secret: true
  }
];

function formatSeconds(seconds?: number): string {
  if (seconds === undefined) return "No clear time";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export class PuzzleSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private activeSlot!: SaveSlot;

  public constructor() {
    super("PuzzleSelectScene");
  }

  public create() {
    const slot = SaveSystem.getActiveSlot();
    if (!slot) {
      this.scene.start("SaveSelectScene");
      return;
    }

    this.activeSlot = slot;
    SaveSystem.setCurrentScene(this.scene.key);

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    this.add.rectangle(cx, h / 2, w, h, 0x04060b);
    this.drawGrid(w, h);

    this.add.text(cx, 42, "CAMPAIGN BOARD", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#9be7ff"
    }).setOrigin(0.5);

    this.add.text(cx, 74, `${slot.name}  |  ${slot.completedRooms.length} rooms cleared`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#45f5c8"
    }).setOrigin(0.5);

    const previewBg = this.add.rectangle(w - 180, h / 2 + 10, 300, h - 150, 0x081019, 0.96)
      .setStrokeStyle(1, 0x334155, 0.9);
    void previewBg;

    const previewTitle = this.add.text(w - 180, 156, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#9be7ff",
      align: "center",
      wordWrap: { width: 240 }
    }).setOrigin(0.5);

    const previewBody = this.add.text(w - 180, 238, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#7a9aaa",
      align: "center",
      lineSpacing: 6,
      wordWrap: { width: 240 }
    }).setOrigin(0.5, 0);

    const previewMeta = this.add.text(w - 180, h - 180, "", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#ffe066",
      align: "center",
      lineSpacing: 5
    }).setOrigin(0.5);

    const startX = 90;
    const cardW = Math.min(560, w - 470);
    const cardH = 82;

    LEVELS.forEach((level, index) => {
      const y = 150 + index * 92;
      const card = this.buildCard(startX + cardW / 2, y, cardW, cardH, level, () => {
        if (this.isLocked(level)) return;
        this.selectedIndex = index;
        this.refreshSelection();
        preview(level);
      });
      this.cards.push(card);
    });

    const preview = (level: LevelInfo) => {
      const bestTime = slot.highScores[level.roomId];
      const clearState = slot.completedRooms.includes(level.roomId) ? "Cleared" : this.isLocked(level) ? "Locked" : "Ready";
      previewTitle.setText(level.secret ? `SECRET ROOM\n${level.title}` : `ROOM ${level.number}\n${level.title}`);
      previewBody.setText([
        level.subtitle,
        "",
        `Mechanics: ${level.mechanics.join("  |  ")}`
      ].join("\n"));
      previewMeta.setText([
        `${"★".repeat(level.difficulty)}${"☆".repeat(5 - level.difficulty)}`,
        clearState,
        `Best: ${formatSeconds(bestTime)}`
      ].join("\n"));
    };

    this.refreshSelection();
    preview(LEVELS[0]!);

    this.input.keyboard?.on("keydown-UP", () => this.moveSelection(-1, preview));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveSelection(1, preview));
    this.input.keyboard?.on("keydown-ENTER", () => {
      const level = LEVELS[this.selectedIndex];
      if (level && !this.isLocked(level)) this.scene.start(level.key);
    });
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("MainMenuScene"));

    const back = this.add.text(50, h - 28, "BACK", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#5a8a9a",
      backgroundColor: "rgba(5,7,11,0.8)",
      padding: { x: 8, y: 4 }
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on("pointerover", () => back.setColor("#9be7ff"));
    back.on("pointerout", () => back.setColor("#5a8a9a"));
    back.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }

  private buildCard(x: number, y: number, width: number, height: number, level: LevelInfo, onHover: () => void) {
    const bg = this.add.rectangle(x, y, width, height, 0x0a1016, 0.95);
    const locked = this.isLocked(level);
    bg.setStrokeStyle(1, locked ? 0x334155 : level.accentColor, locked ? 0.45 : 0.7);

    const left = x - width / 2;
    const accentHex = `#${level.accentColor.toString(16).padStart(6, "0")}`;

    this.add.rectangle(left + 4, y, 8, height - 8, locked ? 0x334155 : level.accentColor, 0.9);
    this.add.text(left + 22, y - 2, String(level.number), {
      fontFamily: "monospace",
      fontSize: "28px",
      color: locked ? "#334155" : accentHex
    }).setOrigin(0.5);

    this.add.text(left + 50, y - 18, level.title, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: locked ? "#5a6472" : "#d8eef5"
    });

    this.add.text(left + 50, y + 2, locked ? this.lockedText(level) : level.subtitle, {
      fontFamily: "monospace",
      fontSize: "10px",
      color: locked ? "#334155" : "#7a9aaa",
      wordWrap: { width: width - 220 }
    });

    const bestTime = this.activeSlot.highScores[level.roomId];
    const rightText = locked
      ? "LOCKED"
      : this.activeSlot.completedRooms.includes(level.roomId)
        ? `CLEAR\n${formatSeconds(bestTime)}`
        : "PLAY";

    this.add.text(x + width / 2 - 56, y, rightText, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: locked ? "#334155" : this.activeSlot.completedRooms.includes(level.roomId) ? "#45f5c8" : "#ffe066",
      align: "center"
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: !locked });
    bg.on("pointerover", onHover);
    bg.on("pointerdown", () => {
      if (!locked) this.scene.start(level.key);
    });

    return bg;
  }

  private refreshSelection() {
    LEVELS.forEach((level, index) => {
      const card = this.cards[index];
      if (!card) return;
      const locked = this.isLocked(level);
      if (index === this.selectedIndex && !locked) {
        card.setStrokeStyle(2, level.accentColor, 1);
      } else {
        card.setStrokeStyle(1, locked ? 0x334155 : level.accentColor, locked ? 0.45 : 0.7);
      }
    });
  }

  private moveSelection(direction: -1 | 1, onSelect: (level: LevelInfo) => void) {
    const total = LEVELS.length;
    let next = this.selectedIndex;
    for (let i = 0; i < total; i++) {
      next = (next + direction + total) % total;
      const candidate = LEVELS[next];
      if (candidate && !this.isLocked(candidate)) {
        this.selectedIndex = next;
        this.refreshSelection();
        onSelect(candidate);
        return;
      }
    }
  }

  private isLocked(level: LevelInfo) {
    return !SaveSystem.isRoomUnlocked(level.roomId, this.activeSlot);
  }

  private lockedText(level: LevelInfo) {
    if (level.roomId === BONUS_ROOM_ID) {
      return "Clear all five main rooms to unlock the bonus chamber.";
    }

    const roomIndex = CAMPAIGN_ROOM_ORDER.indexOf(level.roomId as (typeof CAMPAIGN_ROOM_ORDER)[number]);
    const previousRoomId = roomIndex > 0 ? CAMPAIGN_ROOM_ORDER[roomIndex - 1] : undefined;
    const previous = previousRoomId ? ROOM_LABELS[previousRoomId] : "";
    return previous ? `Locked until ${previous} is cleared.` : "Locked.";
  }

  private drawGrid(w: number, h: number) {
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x173248, 0.12);
    for (let x = 0; x < w; x += 60) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 60) gfx.lineBetween(0, y, w, y);
  }
}
