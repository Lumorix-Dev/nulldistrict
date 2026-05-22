import Phaser from "phaser";
import { blocksByCategory, ALL_CATEGORIES, getBlock, type BlockCategory } from "../systems/BlockRegistry";
import { TileWorld } from "../systems/TileWorld";
import { gameBus } from "../EventBus";
import type { LayerIndex } from "../systems/TileWorld";

const PALETTE_W = 200;
const MINIMAP_SIZE = 160;
const MINIMAP_MARGIN = 12;
const BLOCK_SIZE = 36;
const CATEGORY_H = 28;
const SEARCH_H = 24;
// Tab width adapts to the number of categories (imported ALL_CATEGORIES gives length at runtime)
const TAB_W = PALETTE_W / 8; // 8 categories: nature/stone/tech/liquid/deco/industrial/mystical/cyberpunk

type Tool = "place" | "erase" | "fill" | "eyedropper" | "select" | "entity";
const TOOLS: Tool[] = ["place", "erase", "fill", "eyedropper", "select", "entity"];
const TOOL_LABELS: Record<Tool, string> = { place: "PLC", erase: "ERA", fill: "FIL", eyedropper: "EYE", select: "SEL", entity: "ENT" };
const LAYER_LABELS = ["BG", "TR", "FG"];

export class CreativeHUDScene extends Phaser.Scene {
  // Palette state
  private activeCategory: BlockCategory = "nature";
  private selectedBlockId = "grass";
  private activeTool: Tool = "place";
  private activeLayer: LayerIndex = 1;

  // Palette UI rects
  private palettePanel!: Phaser.GameObjects.Rectangle;
  private categoryTabs: Phaser.GameObjects.Container[] = [];
  private blockItems: Phaser.GameObjects.Container[] = [];
  private toolButtons: Phaser.GameObjects.Container[] = [];
  private layerButtons: Phaser.GameObjects.Container[] = [];

  // Minimap
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private minimapRT!: Phaser.GameObjects.RenderTexture;
  private minimapOverlayGfx!: Phaser.GameObjects.Graphics;
  private minimapTitle!: Phaser.GameObjects.Text;
  private minimapCoords!: Phaser.GameObjects.Text;
  private minimapDirty = true;
  private minimapFrame = 0;

  // Info panel
  private infoText!: Phaser.GameObjects.Text;

  // Toasts
  private toasts: Phaser.GameObjects.Container[] = [];

  // Listeners
  private offs: Array<() => void> = [];

  private hoverX = 0;
  private hoverY = 0;

  // ── New studio-quality fields ─────────────────────────────────────────────
  private currentSlot = 1;
  private brushSizeLabel = "1×1";
  private selectionInfo = "";
  private hasClipboard = false;
  private showShortcuts = false;
  private searchQuery = "";
  private searchActive = false;
  private shortcutsPanel!: Phaser.GameObjects.Container;
  private searchInputText!: Phaser.GameObjects.Text;
  private slotDotsGroup: Array<{ dot: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];

  public constructor() {
    super("CreativeHUDScene");
  }

  public create() {
    this.buildPalette();
    this.buildMinimap();
    this.buildInfoPanel();
    this.buildSlotIndicator();
    this.buildShortcutsPanel();
    this.setupBusListeners();
    this.setupHUDKeys();
  }

  // ── Palette ───────────────────────────────────────────────────────────────

  private buildPalette() {
    const h = this.scale.height;

    // Background panel
    this.palettePanel = this.add.rectangle(PALETTE_W / 2, h / 2, PALETTE_W, h, 0x05070b, 0.93).setScrollFactor(0).setDepth(200);

    // Category tabs row
    this.buildCategoryTabs();
    this.buildSearchBox();
    this.buildBlockList();
    this.buildToolButtons();
    this.buildLayerButtons();
  }

  private buildSearchBox() {
    const searchY = CATEGORY_H + 4;
    const bg = this.add.rectangle(PALETTE_W / 2, searchY + SEARCH_H / 2, PALETTE_W - 8, SEARCH_H, 0x0d1a22, 0.95)
      .setScrollFactor(0).setDepth(201).setStrokeStyle(1, 0x334155, 0.9);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => {
      this.searchActive = true;
      bg.setStrokeStyle(1, 0x9be7ff, 0.9);
    });

    this.searchInputText = this.add.text(8, searchY + SEARCH_H / 2, "🔍 search...", {
      fontFamily: "monospace", fontSize: "9px", color: "#5a8a9a",
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

    // Deactivate search when clicking outside the palette
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (ptr.x > PALETTE_W && this.searchActive) {
        this.searchActive = false;
        bg.setStrokeStyle(1, 0x334155, 0.9);
        this.updateSearchDisplay();
      }
    });
  }

  private updateSearchDisplay() {
    if (!this.searchInputText) return;
    if (this.searchQuery) {
      this.searchInputText.setText(`🔍 ${this.searchQuery}█`);
      this.searchInputText.setColor("#c8e8f0");
    } else {
      this.searchInputText.setText("🔍 search...");
      this.searchInputText.setColor("#5a8a9a");
    }
  }

  private buildCategoryTabs() {
    this.categoryTabs.forEach(c => c.destroy());
    this.categoryTabs = [];

    ALL_CATEGORIES.forEach((cat, i) => {
      const tx = i * TAB_W + TAB_W / 2;
      const ty = CATEGORY_H / 2;
      const bg = this.add.rectangle(0, 0, TAB_W - 2, CATEGORY_H - 2, cat === this.activeCategory ? 0x1a3d55 : 0x0d1a22, 0.95);
      bg.setStrokeStyle(1, cat === this.activeCategory ? 0x9be7ff : 0x334155, 0.9);
      const label = this.add.text(0, 0, cat.slice(0, 3).toUpperCase(), {
        fontFamily: "monospace", fontSize: "9px",
        color: cat === this.activeCategory ? "#9be7ff" : "#5a8a9a"
      }).setOrigin(0.5);
      const cont = this.add.container(tx, ty, [bg, label]).setScrollFactor(0).setDepth(201);
      cont.setInteractive(new Phaser.Geom.Rectangle(-TAB_W / 2, -CATEGORY_H / 2, TAB_W, CATEGORY_H), Phaser.Geom.Rectangle.Contains);
      cont.on("pointerdown", () => {
        this.activeCategory = cat;
        this.buildCategoryTabs();
        this.buildBlockList();
      });
      this.categoryTabs.push(cont);
    });
  }

  private buildBlockList() {
    this.blockItems.forEach(c => c.destroy());
    this.blockItems = [];

    const allBlocks = blocksByCategory.get(this.activeCategory) ?? [];
    const blocks = this.searchQuery
      ? allBlocks.filter(b =>
          b.label.toLowerCase().includes(this.searchQuery) ||
          b.id.toLowerCase().includes(this.searchQuery)
        )
      : allBlocks;

    const startY = CATEGORY_H + SEARCH_H + 12; // below tabs + search box
    const cols = Math.floor(PALETTE_W / BLOCK_SIZE);

    blocks.forEach((blk, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = col * BLOCK_SIZE + BLOCK_SIZE / 2 + 4;
      const by = startY + row * (BLOCK_SIZE + 4) + BLOCK_SIZE / 2;

      const selected = blk.id === this.selectedBlockId;
      const bg = this.add.rectangle(0, 0, BLOCK_SIZE - 2, BLOCK_SIZE - 2, blk.color, 1);
      bg.setStrokeStyle(selected ? 2 : 1, selected ? 0x9be7ff : blk.stroke, selected ? 1 : 0.7);
      const label = this.add.text(0, BLOCK_SIZE / 2 - 6, blk.label.slice(0, 6), {
        fontFamily: "monospace", fontSize: "7px", color: "#c8e8f0"
      }).setOrigin(0.5, 0);

      const cont = this.add.container(bx, by, [bg, label]).setScrollFactor(0).setDepth(201);
      cont.setInteractive(new Phaser.Geom.Rectangle(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE), Phaser.Geom.Rectangle.Contains);
      cont.on("pointerdown", () => {
        this.selectedBlockId = blk.id;
        gameBus.emit("voidcraft:select-block", { blockId: blk.id });
        this.buildBlockList();
      });
      this.blockItems.push(cont);
    });
  }

  private buildToolButtons() {
    this.toolButtons.forEach(c => c.destroy());
    this.toolButtons = [];
    const bottomY = this.scale.height - 70;
    // 6 tools × 32px = 192px fits in 200px palette
    TOOLS.forEach((tool, i) => {
      const tx = i * 32 + 17;
      const active = tool === this.activeTool;
      const bg = this.add.rectangle(0, 0, 28, 22, active ? 0x1a3d55 : 0x0d1a22, 0.95);
      bg.setStrokeStyle(1, active ? 0x9be7ff : 0x334155, 0.9);
      const label = this.add.text(0, 0, TOOL_LABELS[tool], {
        fontFamily: "monospace", fontSize: "8px",
        color: active ? "#9be7ff" : "#5a8a9a"
      }).setOrigin(0.5);

      const cont = this.add.container(tx, bottomY, [bg, label]).setScrollFactor(0).setDepth(201);
      cont.setInteractive(new Phaser.Geom.Rectangle(-14, -11, 28, 22), Phaser.Geom.Rectangle.Contains);
      cont.on("pointerdown", () => {
        gameBus.emit("voidcraft:select-tool", { tool });
      });
      this.toolButtons.push(cont);
    });
  }

  private buildLayerButtons() {
    this.layerButtons.forEach(c => c.destroy());
    this.layerButtons = [];
    const bottomY = this.scale.height - 38;

    ([0, 1, 2] as LayerIndex[]).forEach((layer) => {
      const tx = layer * 66 + 34;
      const active = layer === this.activeLayer;
      const bg = this.add.rectangle(0, 0, 60, 24, active ? 0x1a3d55 : 0x0d1a22, 0.95);
      bg.setStrokeStyle(1, active ? 0x45f5c8 : 0x334155, 0.9);
      const label = this.add.text(0, 0, LAYER_LABELS[layer]!, {
        fontFamily: "monospace", fontSize: "11px",
        color: active ? "#45f5c8" : "#5a8a9a"
      }).setOrigin(0.5);

      const cont = this.add.container(tx, bottomY, [bg, label]).setScrollFactor(0).setDepth(201);
      cont.setInteractive(new Phaser.Geom.Rectangle(-30, -12, 60, 24), Phaser.Geom.Rectangle.Contains);
      cont.on("pointerdown", () => {
        gameBus.emit("voidcraft:select-layer", { layer });
      });
      this.layerButtons.push(cont);
    });
  }

  // ── Minimap ───────────────────────────────────────────────────────────────

  private buildMinimap() {
    const mx = this.scale.width - MINIMAP_MARGIN - MINIMAP_SIZE;
    const my = MINIMAP_MARGIN;
    const cx = mx + MINIMAP_SIZE / 2;
    const cy = my + MINIMAP_SIZE / 2;

    // Background with cyan border
    this.minimapBg = this.add.rectangle(cx, cy, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4, 0x0a0a1a, 0.85)
      .setScrollFactor(0).setDepth(200).setStrokeStyle(1, 0x00c8ff, 0.9);

    // "MAP" title above
    this.minimapTitle = this.add.text(cx, my - 4, "MAP", {
      fontFamily: "monospace", fontSize: "9px", color: "#00c8ff",
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(201);

    // RenderTexture for the tile layer — only redrawn when dirty
    this.minimapRT = this.add.renderTexture(mx, my, MINIMAP_SIZE, MINIMAP_SIZE)
      .setScrollFactor(0).setDepth(201);

    // Overlay graphics for viewport rect and player dot — refreshed every 5 frames
    this.minimapOverlayGfx = this.add.graphics().setScrollFactor(0).setDepth(202);

    // Coordinate display below minimap
    this.minimapCoords = this.add.text(cx, my + MINIMAP_SIZE + 6, "X: 0  Y: 0", {
      fontFamily: "monospace", fontSize: "8px", color: "#7aabb8",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    // Click zone to teleport camera
    const hitZone = this.add.zone(cx, cy, MINIMAP_SIZE, MINIMAP_SIZE).setScrollFactor(0).setDepth(203);
    hitZone.setInteractive();
    hitZone.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      const relX = (ptr.x - mx) / MINIMAP_SIZE;
      const relY = (ptr.y - my) / MINIMAP_SIZE;
      gameBus.emit("voidcraft:minimap-click", { worldX: relX * 100 * 32, worldY: relY * 100 * 32 });
    });
  }

  private updateMinimap() {
    const creativeScene = this.scene.get("CreativeScene") as {
      getWorld?: () => TileWorld;
      getHoverTile?: () => { x: number; y: number };
    } | null;

    // ── Tile layer (only when dirty) ────────────────────────────────────────
    if (this.minimapDirty) {
      const world = creativeScene?.getWorld?.();
      if (world) {
        // Build tile image in a temporary off-screen graphics object
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const scaleX = MINIMAP_SIZE / world.width;
        const scaleY = MINIMAP_SIZE / world.height;

        for (let ty = 0; ty < world.height; ty++) {
          for (let tx = 0; tx < world.width; tx++) {
            const cell = world.get(tx, ty);
            const tid = cell.fg || cell.terrain || cell.bg;
            if (!tid) continue;
            const blk = getBlock(tid);
            if (!blk) continue;
            const px = Math.floor(tx * scaleX);
            const py = Math.floor(ty * scaleY);
            const pw = Math.max(1, Math.ceil(scaleX));
            const ph = Math.max(1, Math.ceil(scaleY));
            g.fillStyle(blk.color, 1);
            g.fillRect(px, py, pw, ph);
          }
        }

        this.minimapRT.clear();
        this.minimapRT.draw(g, 0, 0);
        g.destroy();
      }
      this.minimapDirty = false;
    }

    // ── Overlay: viewport rect + player dot ────────────────────────────────
    const mx = this.scale.width - MINIMAP_MARGIN - MINIMAP_SIZE;
    const my = MINIMAP_MARGIN;

    this.minimapOverlayGfx.clear();

    const cam = this.scene.get("CreativeScene")?.cameras?.main;
    if (cam) {
      const scaleW = MINIMAP_SIZE / (100 * 32);
      const vx = mx + cam.scrollX * scaleW;
      const vy = my + cam.scrollY * scaleW;
      const vw = (cam.width / cam.zoom) * scaleW;
      const vh = (cam.height / cam.zoom) * scaleW;

      // Viewport rectangle
      this.minimapOverlayGfx.lineStyle(1, 0x00c8ff, 0.7);
      this.minimapOverlayGfx.strokeRect(vx, vy, vw, vh);

      // Player dot — camera center (what user is looking at in creative mode)
      const playerMX = mx + (cam.scrollX + cam.width / (2 * cam.zoom)) * scaleW;
      const playerMY = my + (cam.scrollY + cam.height / (2 * cam.zoom)) * scaleW;
      this.minimapOverlayGfx.fillStyle(0xffffff, 1);
      this.minimapOverlayGfx.fillRect(playerMX - 1, playerMY - 1, 3, 3);
    }

    // ── Coordinate display ─────────────────────────────────────────────────
    const hover = creativeScene?.getHoverTile?.();
    if (hover) {
      this.minimapCoords.setText(`X: ${hover.x}  Y: ${hover.y}`);
    }
  }

  // ── Info Panel ────────────────────────────────────────────────────────────

  private buildInfoPanel() {
    const bx = this.scale.width - 10;
    const by = this.scale.height - 10;
    // Taller panel: 160px to accommodate 8+ info lines
    this.add.rectangle(bx - 65, by - 80, 130, 160, 0x05070b, 0.88)
      .setScrollFactor(0).setDepth(200).setStrokeStyle(1, 0x334155, 0.9).setOrigin(0.5);
    this.infoText = this.add.text(bx - 125, by - 158, "", {
      fontFamily: "monospace", fontSize: "9px", color: "#7aabb8",
      lineSpacing: 4,
    }).setScrollFactor(0).setDepth(201);
  }

  // ── Toasts ────────────────────────────────────────────────────────────────

  private showToast(message: string, color = "#45f5c8") {
    const cx = this.scale.width / 2;
    const startY = 60;

    const bg = this.add.rectangle(0, 0, 200, 32, 0x05070b, 0.92).setStrokeStyle(1, 0x9be7ff, 0.9);
    const txt = this.add.text(0, 0, message, {
      fontFamily: "monospace", fontSize: "12px", color
    }).setOrigin(0.5);
    const cont = this.add.container(cx, startY - 40, [bg, txt]).setScrollFactor(0).setDepth(300).setAlpha(0);
    this.toasts.push(cont);

    this.tweens.add({
      targets: cont,
      y: startY,
      alpha: 1,
      duration: 250,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(1800, () => {
          this.tweens.add({
            targets: cont,
            y: startY - 30,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              cont.destroy();
              this.toasts = this.toasts.filter(t => t !== cont);
            }
          });
        });
      }
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  public override update() {
    this.minimapFrame++;
    if (this.minimapFrame % 5 === 0) {
      this.updateMinimap();
    }

    const creativeScene = this.scene.get("CreativeScene") as { getHoverTile?: () => { x: number; y: number }; getActiveTool?: () => string; getActiveLayer?: () => number; getSelectedBlockId?: () => string } | null;
    if (creativeScene) {
      const hover = creativeScene.getHoverTile?.();
      const tool = creativeScene.getActiveTool?.() ?? "";
      const layer = creativeScene.getActiveLayer?.() ?? 1;
      const blkId = creativeScene.getSelectedBlockId?.() ?? "";
      const blk = getBlock(blkId);
      this.hoverX = hover?.x ?? 0;
      this.hoverY = hover?.y ?? 0;
      const layerNames = ["BG", "TR", "FG"];
      const lines: string[] = [
        `Tile: ${this.hoverX},${this.hoverY}`,
        `Layer: ${layerNames[layer] ?? "TR"}`,
        `Tool: ${tool.toUpperCase().slice(0, 6)}`,
        `Block: ${blk?.label?.slice(0, 8) ?? blkId}`,
        `Brush: ${this.brushSizeLabel}`,
        `Slot: ${this.currentSlot}`,
      ];
      if (this.selectionInfo) lines.push(this.selectionInfo);
      if (this.hasClipboard) lines.push("📋 Copied");
      this.infoText.setText(lines.join("\n"));
    }
  }

  // ── Bus Listeners ─────────────────────────────────────────────────────────

  private setupBusListeners() {
    this.offs.push(gameBus.on("voidcraft:selected-block-change", ({ blockId }) => {
      this.selectedBlockId = blockId;
      const blk = getBlock(blockId);
      if (blk && blk.category !== this.activeCategory) {
        this.activeCategory = blk.category;
        this.buildCategoryTabs();
      }
      this.buildBlockList();
    }));

    this.offs.push(gameBus.on("voidcraft:tool-change", ({ tool }) => {
      this.activeTool = tool as Tool;
      this.buildToolButtons();
    }));

    this.offs.push(gameBus.on("voidcraft:layer-change", ({ layer }) => {
      this.activeLayer = layer;
      this.buildLayerButtons();
    }));

    this.offs.push(gameBus.on("voidcraft:world-saved", ({ slot }) => {
      this.currentSlot = slot;
      this.updateSlotDots();
      this.showToast(`✓ Saved to Slot ${slot}!`, "#45f5c8");
    }));

    this.offs.push(gameBus.on("voidcraft:world-loaded", ({ slot }) => {
      this.currentSlot = slot;
      this.minimapDirty = true;
      this.updateSlotDots();
      this.showToast(`✓ Loaded Slot ${slot}!`, "#ffe066");
    }));

    this.offs.push(gameBus.on("voidcraft:tile-placed", () => {
      this.minimapDirty = true;
    }));

    this.offs.push(gameBus.on("voidcraft:brush-change", ({ size }) => {
      this.brushSizeLabel = `${size}×${size}`;
      this.tweens.add({ targets: this.infoText, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: "Sine.easeOut" });
    }));

    this.offs.push(gameBus.on("voidcraft:selection-change", ({ active, width, height }) => {
      this.selectionInfo = active ? `SEL: ${width ?? 0}×${height ?? 0}` : "";
    }));

    this.offs.push(gameBus.on("voidcraft:clipboard-change", ({ hasContent }) => {
      this.hasClipboard = hasContent;
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offs.forEach(off => off());
    });
  }

  // ── Slot Indicator ────────────────────────────────────────────────────────

  private buildSlotIndicator() {
    for (const { dot, label } of this.slotDotsGroup) { dot.destroy(); label.destroy(); }
    this.slotDotsGroup = [];

    const dotY = this.scale.height - 12;
    this.add.text(6, dotY, "SLT:", { fontFamily: "monospace", fontSize: "8px", color: "#5a8a9a" })
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);

    for (let i = 1; i <= 3; i++) {
      const active = i === this.currentSlot;
      const dot = this.add.rectangle(36 + (i - 1) * 20, dotY, 14, 14,
        active ? 0x45f5c8 : 0x1a3d55, active ? 1 : 0.5)
        .setStrokeStyle(1, active ? 0x9be7ff : 0x334155, 0.9)
        .setScrollFactor(0).setDepth(201);
      const label = this.add.text(36 + (i - 1) * 20, dotY, `${i}`, {
        fontFamily: "monospace", fontSize: "8px", color: active ? "#ffffff" : "#5a8a9a",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
      this.slotDotsGroup.push({ dot, label });
    }
  }

  private updateSlotDots() {
    this.buildSlotIndicator();
  }

  // ── Shortcuts Panel ───────────────────────────────────────────────────────

  private buildShortcutsPanel() {
    const cx = this.scale.width / 2 + 100;
    const by = this.scale.height - 8;
    const panelW = 420;
    const panelH = 22;
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x05070b, 0.92)
      .setStrokeStyle(1, 0x334155, 0.7);
    const txt = this.add.text(0, 0,
      "LMB:Place  RMB:Erase  E:Fill  R:Pick  V:Select  T:Entity  Z:Undo  G:Grid  [:Brush-  ]:Brush+  H:Help",
      { fontFamily: "monospace", fontSize: "7px", color: "#5a8a9a" }
    ).setOrigin(0.5);
    this.shortcutsPanel = this.add.container(cx, by - panelH / 2, [bg, txt])
      .setScrollFactor(0).setDepth(205).setVisible(false);
  }

  // ── HUD Keyboard Setup ────────────────────────────────────────────────────

  private setupHUDKeys() {
    this.input.keyboard!.on("keydown-H", () => {
      if (this.searchActive) return;
      this.showShortcuts = !this.showShortcuts;
      this.shortcutsPanel.setVisible(this.showShortcuts);
    });

    // Capture all keydown events when search is active
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (!this.searchActive) return;
      event.stopImmediatePropagation();

      if (event.key === "Escape") {
        this.searchQuery = "";
        this.searchActive = false;
        this.updateSearchDisplay();
        this.buildBlockList();
        return;
      }
      if (event.key === "Backspace") {
        this.searchQuery = this.searchQuery.slice(0, -1);
      } else if (event.key.length === 1) {
        this.searchQuery += event.key.toLowerCase();
      }
      this.updateSearchDisplay();
      this.buildBlockList();
    });
  }
}
