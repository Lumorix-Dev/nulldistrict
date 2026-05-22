import Phaser from "phaser";
import type { RoomDefinition } from "./PuzzleScene";
import { type EntityDef } from "../systems/EntitySystem";

const STORAGE_KEY = "voidcraft:custom-level-1";
const CELL = 32;

interface PlatformEntry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type PaletteEntityType =
  | "lever" | "door" | "key" | "pressure_plate"
  | "code_panel" | "chest" | "portal" | "text_sign" | "crystal_shard";

const ENTITY_PALETTE: { type: PaletteEntityType; color: number; label: string }[] = [
  { type: "lever",          color: 0xffdd00, label: "Lever" },
  { type: "door",           color: 0xcc2200, label: "Door" },
  { type: "key",            color: 0xffd700, label: "Key" },
  { type: "pressure_plate", color: 0x66ff66, label: "Pressure Plate" },
  { type: "code_panel",     color: 0x00c8ff, label: "Code Panel" },
  { type: "chest",          color: 0xa0682a, label: "Chest" },
  { type: "portal",         color: 0x9b00ff, label: "Portal" },
  { type: "text_sign",      color: 0x8b6914, label: "Text Sign" },
  { type: "crystal_shard",  color: 0x7df9ff, label: "Crystal Shard" },
];

const PANEL_W = 180;
const PROP_W = 220;
const TOOLBAR_H = 48;

type EditorMode = "select" | "place_entity" | "draw_platform" | "erase";

export class LevelEditorScene extends Phaser.Scene {
  // ── State ─────────────────────────────────────────────────────────────────
  private mode: EditorMode = "select";
  private selectedEntityType: PaletteEntityType = "lever";
  private entities: EntityDef[] = [];
  private platforms: PlatformEntry[] = [];
  private selectedEntityId: string | null = null;

  // ── Platform drawing ──────────────────────────────────────────────────────
  private drawStart: { x: number; y: number } | null = null;
  private drawPreview!: Phaser.GameObjects.Rectangle;

  // ── Rendering ─────────────────────────────────────────────────────────────
  private worldContainer!: Phaser.GameObjects.Container;
  private platformGfx!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Container;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private propPanel!: Phaser.GameObjects.Container;
  private entityListPanel!: Phaser.GameObjects.Container;
  private paletteButtons: Phaser.GameObjects.Container[] = [];
  private modeButtons: Record<EditorMode, Phaser.GameObjects.Container> = {} as never;
  private entitySprites = new Map<string, Phaser.GameObjects.Container>();

  // ── World config ──────────────────────────────────────────────────────────
  private levelTitle = "My Custom Level";
  private levelId = "custom-room-1";
  private readonly WORLD_W = 2560;
  private readonly WORLD_H = 768;
  private idCounter = 0;

  public constructor() { super("LevelEditorScene"); }

  // ──────────────────────────────────────────────────────────────────────────

  public create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.load_saved();

    // ── World container (scrollable) ──────────────────────────────────────────
    this.worldContainer = this.add.container(PANEL_W, TOOLBAR_H);
    this.gridGfx = this.add.graphics().setDepth(1);
    this.worldContainer.add(this.gridGfx);

    this.platformGfx = this.add.graphics().setDepth(2);
    this.worldContainer.add(this.platformGfx);

    this.entityLayer = this.add.container(0, 0).setDepth(5);
    this.worldContainer.add(this.entityLayer);

    this.drawPreview = this.add.rectangle(0, 0, CELL, CELL, 0x334155, 0.5)
      .setStrokeStyle(2, 0x9be7ff, 0.8).setDepth(10).setVisible(false);
    this.worldContainer.add(this.drawPreview);

    this.drawGrid();
    this.redrawPlatforms();
    this.rebuildEntitySprites();

    // ── Camera ────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(
      PANEL_W, TOOLBAR_H,
      this.WORLD_W + PROP_W,
      this.WORLD_H + h - TOOLBAR_H
    );

    // ── Panels ────────────────────────────────────────────────────────────────
    this.buildToolbar(w, h);
    this.buildPalette(h);
    this.buildPropsPanel(w, h);
    this.buildEntityListPanel(w, h);
    this.buildBackground(w, h);

    // ── Input ─────────────────────────────────────────────────────────────────
    this.setupInput(w, h);

    // ── ESC → back ────────────────────────────────────────────────────────────
    this.input.keyboard!.on("keydown-ESC", () => this.scene.start("VoidCraftMenuScene"));
  }

  // ──────────────────────────────────────────────────────────────────────────

  private buildBackground(w: number, h: number) {
    const worldViewW = w - PANEL_W - PROP_W;
    const worldViewH = h - TOOLBAR_H;
    const cx = PANEL_W + worldViewW / 2;
    const cy = TOOLBAR_H + worldViewH / 2;
    this.add.rectangle(cx, cy, worldViewW, worldViewH, 0x040810)
      .setScrollFactor(0).setDepth(0);
    // Thin border lines
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(0);
    gfx.lineStyle(1, 0x1a3d55, 0.4);
    gfx.lineBetween(PANEL_W, TOOLBAR_H, PANEL_W, h);
    gfx.lineBetween(w - PROP_W, TOOLBAR_H, w - PROP_W, h);
    gfx.lineBetween(0, TOOLBAR_H, w, TOOLBAR_H);
  }

  private buildToolbar(w: number, _h: number) {
    const bg = this.add.rectangle(w / 2, TOOLBAR_H / 2, w, TOOLBAR_H, 0x05070b)
      .setScrollFactor(0).setDepth(20);
    bg.setStrokeStyle(1, 0x1a3d55, 0.5);

    this.add.text(PANEL_W + 10, TOOLBAR_H / 2, "✏️  VOIDCRAFT LEVEL EDITOR", {
      fontFamily: "monospace", fontSize: "14px", color: "#9be7ff",
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);

    // Mode buttons
    const modes: { mode: EditorMode; icon: string; tip: string }[] = [
      { mode: "select",         icon: "↖ SELECT", tip: "Select entities" },
      { mode: "place_entity",   icon: "📌 PLACE",  tip: "Place entity" },
      { mode: "draw_platform",  icon: "▬ PLATFORM",tip: "Draw platform" },
      { mode: "erase",          icon: "✕ ERASE",   tip: "Erase entity/platform" },
    ];
    const modeX = w / 2 - 260;

    modes.forEach((m, i) => {
      const x = modeX + i * 130;
      const btn = this.makeModeBtn(x, TOOLBAR_H / 2, m.mode, m.icon);
      this.modeButtons[m.mode] = btn;
    });

    // Title edit
    const titleTxt = this.add.text(w - PROP_W - 10, TOOLBAR_H / 2, `📝 "${this.levelTitle}"`, {
      fontFamily: "monospace", fontSize: "11px", color: "#ffe066",
      backgroundColor: "#100c00", padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    titleTxt.on("pointerover", () => titleTxt.setColor("#ffffff"));
    titleTxt.on("pointerout", () => titleTxt.setColor("#ffe066"));
    titleTxt.on("pointerdown", () => {
      const r = window.prompt("Level title:", this.levelTitle);
      if (r !== null && r.trim()) { this.levelTitle = r.trim().slice(0, 50); titleTxt.setText(`📝 "${this.levelTitle}"`); }
    });

    this.highlightModeBtn(this.mode);
  }

  private makeModeBtn(x: number, y: number, mode: EditorMode, label: string): Phaser.GameObjects.Container {
    const active = this.mode === mode;
    const bg = this.add.rectangle(0, 0, 120, 32,
      active ? 0x1a3d55 : 0x0a1020, active ? 1 : 0.9
    ).setStrokeStyle(1, active ? 0x9be7ff : 0x1a3d55, active ? 1 : 0.4);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "monospace", fontSize: "10px",
      color: active ? "#9be7ff" : "#3a6070",
    }).setOrigin(0.5);
    const c = this.add.container(x, y, [bg, txt]).setScrollFactor(0).setDepth(21);
    c.setInteractive(new Phaser.Geom.Rectangle(-60, -16, 120, 32), Phaser.Geom.Rectangle.Contains);
    c.on("pointerover", () => { bg.setFillStyle(0x1a3d55); txt.setColor("#9be7ff"); });
    c.on("pointerout", () => {
      if (this.mode !== mode) { bg.setFillStyle(0x0a1020); txt.setColor("#3a6070"); }
    });
    c.on("pointerdown", () => { this.setMode(mode); });
    return c;
  }

  private setMode(mode: EditorMode) {
    this.mode = mode;
    this.drawStart = null;
    this.drawPreview.setVisible(false);
    this.highlightModeBtn(mode);
  }

  private highlightModeBtn(active: EditorMode) {
    for (const [m, c] of Object.entries(this.modeButtons) as [EditorMode, Phaser.GameObjects.Container][]) {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      const txt = c.getAt(1) as Phaser.GameObjects.Text;
      if (m === active) {
        bg.setFillStyle(0x1a3d55);
        bg.setStrokeStyle(1, 0x9be7ff, 1);
        txt.setColor("#9be7ff");
      } else {
        bg.setFillStyle(0x0a1020);
        bg.setStrokeStyle(1, 0x1a3d55, 0.4);
        txt.setColor("#3a6070");
      }
    }
  }

  private buildPalette(h: number) {
    const panelH = h - TOOLBAR_H;
    const bg = this.add.rectangle(PANEL_W / 2, TOOLBAR_H + panelH / 2, PANEL_W, panelH, 0x05070b)
      .setScrollFactor(0).setDepth(20);
    bg.setStrokeStyle(1, 0x1a3d55, 0.5);

    this.add.text(PANEL_W / 2, TOOLBAR_H + 14, "ENTITIES", {
      fontFamily: "monospace", fontSize: "10px", color: "#3a6070",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);

    this.paletteButtons = ENTITY_PALETTE.map((entry, i) => {
      const y = TOOLBAR_H + 36 + i * 38;
      return this.makePaletteBtn(PANEL_W / 2, y, entry.type, entry.color, entry.label);
    });
  }

  private makePaletteBtn(x: number, y: number, type: PaletteEntityType, color: number, label: string): Phaser.GameObjects.Container {
    const active = this.selectedEntityType === type;
    const bg = this.add.rectangle(0, 0, PANEL_W - 20, 30,
      active ? 0x0d2030 : 0x080d14
    ).setStrokeStyle(1, active ? color : 0x1a3d55, active ? 0.9 : 0.3);
    const dot = this.add.rectangle(-70, 0, 12, 12, color, active ? 1 : 0.5);
    const txt = this.add.text(-56, 0, label, {
      fontFamily: "monospace", fontSize: "10px",
      color: active ? "#ffffff" : "#3a6070",
    }).setOrigin(0, 0.5);
    const c = this.add.container(x, y, [bg, dot, txt]).setScrollFactor(0).setDepth(21);
    c.setInteractive(new Phaser.Geom.Rectangle(-(PANEL_W - 20) / 2, -15, PANEL_W - 20, 30), Phaser.Geom.Rectangle.Contains);
    c.on("pointerover", () => { bg.setFillStyle(0x0d2030); txt.setColor("#9be7ff"); });
    c.on("pointerout", () => {
      if (this.selectedEntityType !== type) { bg.setFillStyle(0x080d14); txt.setColor("#3a6070"); }
    });
    c.on("pointerdown", () => {
      this.selectedEntityType = type;
      this.setMode("place_entity");
      this.rebuildPalette();
    });
    return c;
  }

  private rebuildPalette() {
    for (const btn of this.paletteButtons) btn.destroy();
    const h = this.scale.height;
    const panelH = h - TOOLBAR_H;
    // Re-add header
    this.paletteButtons = ENTITY_PALETTE.map((entry, i) => {
      const y = TOOLBAR_H + 36 + i * 38;
      return this.makePaletteBtn(PANEL_W / 2, y, entry.type, entry.color, entry.label);
    });
    void panelH;
  }

  private buildPropsPanel(w: number, h: number) {
    const panelH = h - TOOLBAR_H;
    const panelX = w - PROP_W / 2;
    const panelY = TOOLBAR_H + panelH / 2;
    const bg = this.add.rectangle(panelX, panelY, PROP_W, panelH, 0x05070b)
      .setScrollFactor(0).setDepth(20);
    bg.setStrokeStyle(1, 0x1a3d55, 0.5);
    this.propPanel = this.add.container(panelX, TOOLBAR_H).setScrollFactor(0).setDepth(21);
    this.renderPropsPanel(null);
  }

  private renderPropsPanel(id: string | null) {
    this.propPanel.removeAll(true);

    this.propPanel.add(this.add.text(0, 14, "PROPERTIES", {
      fontFamily: "monospace", fontSize: "10px", color: "#3a6070",
    }).setOrigin(0.5, 0));

    if (!id) {
      this.propPanel.add(this.add.text(0, 40, "No entity selected", {
        fontFamily: "monospace", fontSize: "10px", color: "#1a3040",
        align: "center", wordWrap: { width: PROP_W - 20 },
      }).setOrigin(0.5, 0));
      // Action buttons
      this.addToolButtons();
      return;
    }

    const ent = this.entities.find(e => e.id === id);
    if (!ent) { this.renderPropsPanel(null); return; }

    let rowY = 36;
    const addRow = (label: string, value: string, onEdit: (v: string) => void) => {
      this.propPanel.add(this.add.text(-PROP_W / 2 + 8, rowY, label, {
        fontFamily: "monospace", fontSize: "9px", color: "#3a6070",
      }).setOrigin(0, 0));
      rowY += 14;
      const valTxt = this.add.text(-PROP_W / 2 + 8, rowY, value || "(empty)", {
        fontFamily: "monospace", fontSize: "10px",
        color: value ? "#9be7ff" : "#1a3040",
        backgroundColor: "#080d14", padding: { x: 6, y: 3 },
        wordWrap: { width: PROP_W - 24 },
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      valTxt.on("pointerover", () => valTxt.setColor("#ffffff"));
      valTxt.on("pointerout", () => valTxt.setColor(value ? "#9be7ff" : "#1a3040"));
      valTxt.on("pointerdown", () => {
        const r = window.prompt(`Edit ${label}:`, value);
        if (r !== null) { onEdit(r); this.renderPropsPanel(id); }
      });
      this.propPanel.add(valTxt);
      rowY += 28;
    };

    addRow("id", ent.id, v => { ent.id = v || ent.id; this.selectedEntityId = ent.id; this.rebuildEntitySprites(); });
    addRow("label", ent.label ?? "", v => { ent.label = v; });
    addRow("linkedTo", (ent.linkedTo ?? []).join(", "), v => { ent.linkedTo = v.split(",").map(s => s.trim()).filter(Boolean); });
    if (ent.type === "code_panel") {
      addRow("code", ent.code ?? "", v => { ent.code = v; });
    }
    if (ent.type === "portal") {
      addRow("targetScene", ent.targetScene ?? "", v => { ent.targetScene = v; });
    }
    if (ent.type === "door") {
      addRow("requiredKey", ent.requiredKey ?? "", v => { ent.requiredKey = v || undefined; });
    }
    if (ent.type === "text_sign") {
      addRow("message", ent.message ?? "", v => { ent.message = v; });
    }
    addRow("x (tile)", String(Math.round(ent.x / CELL)), v => { ent.x = (parseInt(v) || 0) * CELL; this.rebuildEntitySprites(); });
    addRow("y (tile)", String(Math.round(ent.y / CELL)), v => { ent.y = (parseInt(v) || 0) * CELL; this.rebuildEntitySprites(); });

    // Delete button
    rowY += 6;
    const del = this.add.text(0, rowY, "🗑 DELETE", {
      fontFamily: "monospace", fontSize: "11px", color: "#ff4444",
      backgroundColor: "#1a0808", padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    del.on("pointerover", () => del.setColor("#ff8888"));
    del.on("pointerout", () => del.setColor("#ff4444"));
    del.on("pointerdown", () => {
      this.entities = this.entities.filter(e => e.id !== id);
      this.selectedEntityId = null;
      this.rebuildEntitySprites();
      this.renderPropsPanel(null);
      this.rebuildEntityList();
    });
    this.propPanel.add(del);

    this.addToolButtons(rowY + 50);
  }

  private addToolButtons(startY = 80) {
    let y = startY;

    const makeBtn = (label: string, color: string, bgColor: number, onClick: () => void) => {
      const btn = this.add.text(0, y, label, {
        fontFamily: "monospace", fontSize: "11px", color,
        backgroundColor: bgColor ? `#${bgColor.toString(16).padStart(6, "0")}` : "#0a1020",
        padding: { x: 8, y: 5 },
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      btn.on("pointerover", () => btn.setColor("#ffffff"));
      btn.on("pointerout", () => btn.setColor(color));
      btn.on("pointerdown", () => onClick());
      this.propPanel.add(btn);
      y += 36;
    };

    y = this.scale.height - TOOLBAR_H - 200;
    makeBtn("💾 SAVE", "#45f5c8", 0x061812, () => this.saveToStorage());
    makeBtn("📤 EXPORT JSON", "#9be7ff", 0x0a1520, () => this.exportJSON());
    makeBtn("📥 IMPORT JSON", "#ffe066", 0x141000, () => this.importJSON());
    makeBtn("▶ TEST PLAY", "#cc66ff", 0x110820, () => this.testPlay());
  }

  private buildEntityListPanel(_w: number, h: number) {
    const listH = 120;
    const listY = h - listH / 2;
    const listW = this.scale.width - PANEL_W - PROP_W;
    const listX = PANEL_W + listW / 2;
    const bg = this.add.rectangle(listX, listY, listW, listH, 0x040810)
      .setScrollFactor(0).setDepth(20);
    bg.setStrokeStyle(1, 0x1a3d55, 0.5);
    this.entityListPanel = this.add.container(PANEL_W + 10, h - listH + 4).setScrollFactor(0).setDepth(21);
    this.rebuildEntityList();
  }

  private rebuildEntityList() {
    this.entityListPanel.removeAll(true);

    this.entityListPanel.add(this.add.text(0, 0, "ENTITIES", {
      fontFamily: "monospace", fontSize: "9px", color: "#3a6070",
    }).setOrigin(0, 0));

    const allItems = [...this.platforms.map(p => ({ kind: "platform" as const, label: `⬛ Platform (${p.width}×${p.height})`, id: p.id })),
      ...this.entities.map(e => {
        const pal = ENTITY_PALETTE.find(p => p.type === (e.type as PaletteEntityType));
        return { kind: "entity" as const, label: `[${e.type}] ${e.id}`, id: e.id, color: pal?.color ?? 0x9be7ff };
      })];

    allItems.slice(0, 20).forEach((item, i) => {
      const col = Math.floor(i / 4);
      const row = i % 4;
      const x = col * 200;
      const y = 16 + row * 22;
      const color = item.kind === "entity" ? `#${((item as { color: number }).color ?? 0x9be7ff).toString(16).padStart(6, "0")}` : "#5a7080";
      const txt = this.add.text(x, y, item.label, {
        fontFamily: "monospace", fontSize: "9px", color,
        backgroundColor: this.selectedEntityId === item.id ? "#0d2030" : undefined,
        padding: this.selectedEntityId === item.id ? { x: 3, y: 2 } : undefined,
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      txt.on("pointerover", () => txt.setColor("#ffffff"));
      txt.on("pointerout", () => txt.setColor(color));
      txt.on("pointerdown", () => {
        if (item.kind === "entity") {
          this.selectedEntityId = item.id;
          this.renderPropsPanel(item.id);
          this.rebuildEntityList();
        }
      });
      this.entityListPanel.add(txt);
    });

    if (allItems.length > 20) {
      this.entityListPanel.add(this.add.text(0, 100, `...and ${allItems.length - 20} more`, {
        fontFamily: "monospace", fontSize: "9px", color: "#334155",
      }).setOrigin(0, 0));
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Grid & World drawing

  private drawGrid() {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(0.5, 0x1a3d55, 0.2);
    for (let x = 0; x <= this.WORLD_W; x += CELL) this.gridGfx.lineBetween(x, 0, x, this.WORLD_H);
    for (let y = 0; y <= this.WORLD_H; y += CELL) this.gridGfx.lineBetween(0, y, this.WORLD_W, y);
    // World border
    this.gridGfx.lineStyle(2, 0x9be7ff, 0.25);
    this.gridGfx.strokeRect(0, 0, this.WORLD_W, this.WORLD_H);
    // Floor line
    this.gridGfx.lineStyle(2, 0x45f5c8, 0.4);
    this.gridGfx.lineBetween(0, this.WORLD_H - 64, this.WORLD_W, this.WORLD_H - 64);
  }

  private redrawPlatforms() {
    this.platformGfx.clear();
    for (const p of this.platforms) {
      this.platformGfx.fillStyle(0x141b26);
      this.platformGfx.fillRect(p.x, p.y, p.width, p.height);
      this.platformGfx.lineStyle(2, 0x31445d, 0.9);
      this.platformGfx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  private rebuildEntitySprites() {
    this.entityLayer.removeAll(true);
    this.entitySprites.clear();
    for (const e of this.entities) {
      const pal = ENTITY_PALETTE.find(p => p.type === (e.type as PaletteEntityType));
      const color = pal?.color ?? 0x9be7ff;
      const isSelected = e.id === this.selectedEntityId;
      const dot = this.add.rectangle(0, 0, 24, 24, color, isSelected ? 1 : 0.7)
        .setStrokeStyle(isSelected ? 2 : 1, 0xffffff, isSelected ? 1 : 0.4);
      const lbl = this.add.text(0, 16, e.id, {
        fontFamily: "monospace", fontSize: "7px",
        color: isSelected ? "#ffffff" : `#${color.toString(16).padStart(6, "0")}`,
        backgroundColor: "#050810", padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 0);
      const c = this.add.container(e.x, e.y, [dot, lbl]);
      c.setInteractive(new Phaser.Geom.Rectangle(-12, -12, 24, 24), Phaser.Geom.Rectangle.Contains);
      c.on("pointerdown", (_ptr: Phaser.Input.Pointer, _lx: number, _ly: number, evt: Phaser.Types.Input.EventData) => {
        evt.stopPropagation();
        if (this.mode === "erase") {
          this.entities = this.entities.filter(en => en.id !== e.id);
          if (this.selectedEntityId === e.id) this.selectedEntityId = null;
          this.rebuildEntitySprites();
          this.renderPropsPanel(this.selectedEntityId);
          this.rebuildEntityList();
          return;
        }
        this.selectedEntityId = e.id;
        this.rebuildEntitySprites();
        this.renderPropsPanel(e.id);
        this.rebuildEntityList();
      });
      this.entityLayer.add(c);
      this.entitySprites.set(e.id, c);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Input

  private setupInput(_w: number, _h: number) {
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (this.isInPanel(ptr)) return;
      const wx = ptr.worldX - PANEL_W;
      const wy = ptr.worldY - TOOLBAR_H;

      if (this.mode === "place_entity") {
        this.placeEntity(wx, wy);
      } else if (this.mode === "draw_platform") {
        this.drawStart = { x: Math.floor(wx / CELL) * CELL, y: Math.floor(wy / CELL) * CELL };
        this.drawPreview.setPosition(this.drawStart.x, this.drawStart.y).setSize(CELL, CELL).setVisible(true);
      } else if (this.mode === "select") {
        this.selectedEntityId = null;
        this.renderPropsPanel(null);
        this.rebuildEntitySprites();
        this.rebuildEntityList();
      }
    });

    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (this.mode !== "draw_platform" || !this.drawStart) return;
      const wx = ptr.worldX - PANEL_W;
      const wy = ptr.worldY - TOOLBAR_H;
      const tx = Math.floor(wx / CELL) * CELL;
      const ty = Math.floor(wy / CELL) * CELL;
      const x = Math.min(this.drawStart.x, tx);
      const y = Math.min(this.drawStart.y, ty);
      const pw = Math.max(CELL, Math.abs(tx - this.drawStart.x) + CELL);
      const ph = Math.max(CELL, Math.abs(ty - this.drawStart.y) + CELL);
      this.drawPreview.setPosition(x + pw / 2, y + ph / 2).setSize(pw, ph).setVisible(true);
    });

    this.input.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      if (this.mode !== "draw_platform" || !this.drawStart) return;
      const wx = ptr.worldX - PANEL_W;
      const wy = ptr.worldY - TOOLBAR_H;
      const tx = Math.floor(wx / CELL) * CELL;
      const ty = Math.floor(wy / CELL) * CELL;
      const x = Math.min(this.drawStart.x, tx);
      const y = Math.min(this.drawStart.y, ty);
      const pw = Math.max(CELL, Math.abs(tx - this.drawStart.x) + CELL);
      const ph = Math.max(CELL, Math.abs(ty - this.drawStart.y) + CELL);
      this.platforms.push({ id: `plat-${++this.idCounter}`, x, y, width: pw, height: ph });
      this.drawStart = null;
      this.drawPreview.setVisible(false);
      this.redrawPlatforms();
      this.rebuildEntityList();
    });

    // Middle mouse / WASD pan
    this.input.on("wheel", (_ptr: Phaser.Input.Pointer, _gos: unknown, dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX + dx * 0.5, 0, this.WORLD_W);
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.5, 0, this.WORLD_H);
    });

    // Arrow key / WASD pan
    const kb = this.input.keyboard!;
    const pan = { up: kb.addKey("W"), down: kb.addKey("S"), left: kb.addKey("A"), right: kb.addKey("D") };
    this.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => {
      const speed = 400 * delta / 1000;
      const cam = this.cameras.main;
      if (pan.left.isDown) cam.scrollX -= speed;
      if (pan.right.isDown) cam.scrollX += speed;
      if (pan.up.isDown) cam.scrollY -= speed;
      if (pan.down.isDown) cam.scrollY += speed;
    });

    // Delete key
    kb.on("keydown-DELETE", () => {
      if (!this.selectedEntityId) return;
      this.entities = this.entities.filter(e => e.id !== this.selectedEntityId);
      this.selectedEntityId = null;
      this.rebuildEntitySprites();
      this.renderPropsPanel(null);
      this.rebuildEntityList();
    });
  }

  private isInPanel(ptr: Phaser.Input.Pointer): boolean {
    return ptr.x < PANEL_W || ptr.x > this.scale.width - PROP_W || ptr.y < TOOLBAR_H || ptr.y > this.scale.height - 120;
  }

  private placeEntity(wx: number, wy: number) {
    const snap = CELL;
    const x = Math.round(wx / snap) * snap;
    const y = Math.round(wy / snap) * snap;
    const id = `${this.selectedEntityType}-${++this.idCounter}`;
    const pal = ENTITY_PALETTE.find(p => p.type === this.selectedEntityType)!;
    this.entities.push({
      id,
      type: this.selectedEntityType,
      x, y,
      label: pal.label,
      color: pal.color,
    } as EntityDef);
    this.rebuildEntitySprites();
    this.rebuildEntityList();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Export / Import / Save

  private buildDefinition(): RoomDefinition {
    return {
      id: this.levelId,
      title: this.levelTitle,
      width: this.WORLD_W,
      height: this.WORLD_H,
      bgColor: 0x050a10,
      accentColor: 0x9be7ff,
      spawnX: 100,
      spawnY: this.WORLD_H - 100,
      objectives: [{ id: "exit", description: "Find the exit", completed: false }],
      platforms: this.platforms.map(p => ({ x: p.x, y: p.y, width: p.width, height: p.height })),
      entities: this.entities,
    };
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buildDefinition()));
      this.flashNotice("Saved ✓");
    } catch {
      this.flashNotice("Save failed!");
    }
  }

  private exportJSON() {
    const json = JSON.stringify(this.buildDefinition(), null, 2);
    window.prompt("Copy the JSON below:", json);
  }

  private importJSON() {
    const raw = window.prompt("Paste level JSON:");
    if (!raw) return;
    try {
      const def = JSON.parse(raw) as RoomDefinition;
      this.levelTitle = def.title ?? this.levelTitle;
      this.levelId = def.id ?? this.levelId;
      this.platforms = (def.platforms ?? []).map((p, i) => ({ id: `plat-${i}`, ...p }));
      this.entities = def.entities ?? [];
      this.idCounter = Math.max(this.platforms.length, this.entities.length) + 1;
      this.redrawPlatforms();
      this.rebuildEntitySprites();
      this.rebuildEntityList();
      this.renderPropsPanel(null);
      this.flashNotice("Imported ✓");
    } catch {
      this.flashNotice("Invalid JSON!");
    }
  }

  private testPlay() {
    this.saveToStorage();
    this.scene.start("CustomLevelScene", { definition: this.buildDefinition() });
  }

  private load_saved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const def = JSON.parse(raw) as RoomDefinition;
      this.levelTitle = def.title ?? this.levelTitle;
      this.levelId = def.id ?? this.levelId;
      this.platforms = (def.platforms ?? []).map((p, i) => ({ id: `plat-${i}`, ...p }));
      this.entities = def.entities ?? [];
      this.idCounter = Math.max(this.platforms.length, this.entities.length) + 1;
    } catch { /* corrupt data */ }
  }

  private flashNotice(msg: string) {
    const txt = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, msg, {
      fontFamily: "monospace", fontSize: "20px", color: "#45f5c8",
      backgroundColor: "#030610", padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 30, duration: 1200, ease: "Power2", onComplete: () => txt.destroy() });
  }
}
