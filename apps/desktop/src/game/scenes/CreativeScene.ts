import Phaser from "phaser";
import { TileWorld, type LayerIndex } from "../systems/TileWorld";
import { getBlock, EMPTY_TILE, type BlockDef } from "../systems/BlockRegistry";
import { gameBus } from "../EventBus";
import { audioManager } from "../systems/AudioManager";
import { ParticleSystem } from "../systems/ParticleSystem";
import { FPSCounter } from "../systems/FPSCounter";
import { UISystem } from "../systems/UISystem";
import { achievementSystem } from "../systems/AchievementSystem";
import { VoidCraftSync } from "../systems/VoidCraftSync";
import { RemoteCursors } from "../systems/RemoteCursors";
import { GAME_CONTEXT_KEY, type GameContext } from "../GameContext";

type Tool = "place" | "erase" | "fill" | "eyedropper" | "select" | "entity";

interface HistoryEntry {
  x: number;
  y: number;
  layer: LayerIndex;
  before: string;
  after: string;
}

export class CreativeScene extends Phaser.Scene {
  private world!: TileWorld;
  private tilePool = new Map<string, Phaser.GameObjects.Rectangle>();
  private emissiveTweens = new Map<string, Phaser.Tweens.Tween>();
  private particles!: ParticleSystem;
  private fps!: FPSCounter;
  private ui!: UISystem;

  private selectedBlockId = "grass";
  private activeLayer: LayerIndex = 1;
  private activeTool: Tool = "place";

  private ghostRect!: Phaser.GameObjects.Rectangle;
  private hoverTileX = -1;
  private hoverTileY = -1;

  private isPointerDown = false;
  private isRightDown = false;
  private currentBatch: HistoryEntry[] = [];
  private history: HistoryEntry[][] = [];
  private historyIndex = -1;
  private readonly MAX_HISTORY = 50;

  private camPanKeys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

  private offSelectBlock!: () => void;
  private offSelectTool!: () => void;
  private offSelectLayer!: () => void;
  private offMinimapClick!: () => void;
  private offRemoteTile!: () => void;
  private offRemoteTileSync!: () => void;

  // ── Co-op ──────────────────────────────────────────────────────────────────
  private sync?: VoidCraftSync;
  private remoteCursors?: RemoteCursors;

  private readonly TILE_SIZE = 32;
  private readonly UI_LEFT_WIDTH = 200;
  private readonly UI_RIGHT_WIDTH = 140;
  private readonly UI_BOTTOM_HEIGHT = 50;

  // ── New studio-quality fields ─────────────────────────────────────────────
  private brushSize: 1 | 3 | 5 | 7 = 1;
  private currentSlot = 1;
  private showGrid = true;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private selection: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private selectionStart: { x: number; y: number } | null = null;
  private clipboard: { tiles: Array<{ dx: number; dy: number; layer: LayerIndex; id: string }> } | null = null;
  private selectionGfx!: Phaser.GameObjects.Graphics;
  private entityMarkers = new Map<string, { x: number; y: number; type: string }>();
  private entityGfxMap = new Map<string, Phaser.GameObjects.Rectangle>();

  public constructor() {
    super("CreativeScene");
  }

  public create() {
    // Load a pre-generated world if launched from WorldGenScene, otherwise create a fresh one
    const startData   = this.scene.settings.data as { loadSlot?: number } | undefined;
    const loadedWorld = startData?.loadSlot !== undefined
      ? TileWorld.loadFromStorage(startData.loadSlot)
      : null;
    this.world = loadedWorld ?? new TileWorld({ width: 100, height: 100, tileSize: this.TILE_SIZE, name: "My World" });

    // If we loaded a generated world (launched from WorldGenScene), award achievement
    if (loadedWorld && startData?.loadSlot !== undefined) {
      achievementSystem.checkWorldGenerated();
    }

    this.particles = new ParticleSystem(this);
    this.fps = new FPSCounter(this);
    this.ui = new UISystem(this);

    const offAchievement = gameBus.on("voidcraft:achievement", (data) => {
      this.ui.showAchievement(data.title, data.description, data.icon);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => offAchievement());

    // Only seed starter terrain for fresh (non-generated) worlds
    if (!loadedWorld) {
      this.world.fill(0, 80, 99, 80, 1, "grass");
      this.world.fill(0, 81, 99, 99, 1, "dirt");
    }

    // Physics world bounds
    const worldPx = this.world.width * this.TILE_SIZE;
    const worldPy = this.world.height * this.TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldPx, worldPy);
    this.cameras.main.setBounds(-200, -200, worldPx + 400, worldPy + 400);
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(50 * this.TILE_SIZE - 400, 50 * this.TILE_SIZE - 300);

    // Ghost tile
    this.ghostRect = this.add.rectangle(0, 0, this.TILE_SIZE, this.TILE_SIZE, 0xffffff, 0.3).setDepth(100).setVisible(false);
    // Grid and selection overlays
    this.gridGfx = this.add.graphics().setDepth(50);
    this.selectionGfx = this.add.graphics().setDepth(102);

    this.setupKeys();
    this.setupMouse();
    this.setupBusListeners();
    this.renderFullWorld();

    // Co-op sync — wire up if a game context is available
    const ctx = this.game.registry.get(GAME_CONTEXT_KEY) as GameContext | undefined;
    if (ctx) {
      this.sync = new VoidCraftSync(ctx);
      this.sync.attachToCreative();
    }
    this.remoteCursors = new RemoteCursors(this);

    gameBus.emit("voidcraft:selected-block-change", { blockId: this.selectedBlockId });
    gameBus.emit("voidcraft:layer-change", { layer: this.activeLayer });
    gameBus.emit("voidcraft:tool-change", { tool: this.activeTool });
  }

  private setupKeys() {
    const kb = this.input.keyboard!;
    this.camPanKeys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // Tool hotkeys
    kb.on("keydown-Q", () => this.setTool("place"));
    kb.on("keydown-R", () => this.setTool("eyedropper"));
    kb.on("keydown-X", () => this.setTool("erase"));

    // Layer hotkeys (bare 1/2/3 → layer; Ctrl+1/2/3 → save to slot)
    kb.on("keydown-ONE",   (ev: KeyboardEvent) => { if (ev.ctrlKey) { this.currentSlot = 1; this.saveWorld(); } else this.setLayer(0); });
    kb.on("keydown-TWO",   (ev: KeyboardEvent) => { if (ev.ctrlKey) { this.currentSlot = 2; this.saveWorld(); } else this.setLayer(1); });
    kb.on("keydown-THREE", (ev: KeyboardEvent) => { if (ev.ctrlKey) { this.currentSlot = 3; this.saveWorld(); } else this.setLayer(2); });

    // Save/Load
    kb.on("keydown-S", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.saveWorld(); });
    kb.on("keydown-L", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.loadWorld(); });

    // E key - fill only when not ctrl
    kb.on("keydown-E", (ev: KeyboardEvent) => { if (!ev.ctrlKey) this.setTool("fill"); });

    // Undo / Redo
    kb.on("keydown-Z", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.undo(); });
    kb.on("keydown-Y", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.redo(); });

    // Brush size: [ decreases, ] increases
    kb.on("keydown-OPEN_BRACKET",   () => this.changeBrushSize(-1));
    kb.on("keydown-CLOSED_BRACKET", () => this.changeBrushSize(1));

    // Select tool (V) and paste (Ctrl+V)
    kb.on("keydown-V", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.pasteClipboard(); else this.setTool("select"); });

    // Entity placement tool
    kb.on("keydown-T", () => this.setTool("entity"));

    // Copy selection / delete selection content
    kb.on("keydown-C", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.copySelection(); });
    kb.on("keydown-DELETE", () => { if (this.selection) this.clearSelectionContent(); });

    // Grid toggle
    kb.on("keydown-G", () => {
      this.showGrid = !this.showGrid;
      if (!this.showGrid) this.gridGfx.clear();
    });

    // HOME key → reset camera to world centre
    kb.on("keydown-HOME", () => {
      const w = this.world.width * this.TILE_SIZE;
      const h = this.world.height * this.TILE_SIZE;
      this.cameras.main.setScroll(w / 2 - this.scale.width / 2, h / 2 - this.scale.height / 2);
    });

    // Ctrl+N → rename world
    kb.on("keydown-N", (ev: KeyboardEvent) => { if (ev.ctrlKey) this.editWorldName(); });
  }

  private setupMouse() {
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      const wx = ptr.worldX;
      const wy = ptr.worldY;
      const tx = Math.floor(wx / this.TILE_SIZE);
      const ty = Math.floor(wy / this.TILE_SIZE);
      this.hoverTileX = tx;
      this.hoverTileY = ty;

      if (this.isPointerInUI(ptr)) {
        this.ghostRect.setVisible(false);
        return;
      }

      this.updateGhost(tx, ty);

      if (this.isPointerDown) {
        if (this.activeTool === "select" && this.selectionStart) {
          this.selection = {
            x1: Math.min(this.selectionStart.x, tx),
            y1: Math.min(this.selectionStart.y, ty),
            x2: Math.max(this.selectionStart.x, tx),
            y2: Math.max(this.selectionStart.y, ty),
          };
          gameBus.emit("voidcraft:selection-change", {
            active: true,
            width: this.selection.x2 - this.selection.x1 + 1,
            height: this.selection.y2 - this.selection.y1 + 1,
          });
        } else if (this.activeTool === "place") {
          this.applyBrush(tx, ty, false);
        } else if (this.activeTool === "erase") {
          this.applyBrush(tx, ty, true);
        }
        // fill, eyedropper, entity: no drag-paint action
      }
      if (this.isRightDown) this.applyBrush(tx, ty, true);

      // Middle-mouse drag pan
      if (ptr.buttons === 4) {
        const dx = ptr.prevPosition.x - ptr.x;
        const dy = ptr.prevPosition.y - ptr.y;
        this.cameras.main.scrollX += dx / this.cameras.main.zoom;
        this.cameras.main.scrollY += dy / this.cameras.main.zoom;
      }
    });

    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (this.isPointerInUI(ptr)) return;
      if (ptr.leftButtonDown()) {
        this.isPointerDown = true;
        this.currentBatch = [];
        const tx = Math.floor(ptr.worldX / this.TILE_SIZE);
        const ty = Math.floor(ptr.worldY / this.TILE_SIZE);

        if (this.activeTool === "fill") {
          this.doFill(tx, ty);
        } else if (this.activeTool === "eyedropper") {
          const tid = this.world.getTile(tx, ty, this.activeLayer);
          if (tid) {
            this.selectedBlockId = tid;
            this.setTool("place");
            gameBus.emit("voidcraft:selected-block-change", { blockId: tid });
          }
        } else if (this.activeTool === "place") {
          this.applyBrush(tx, ty, false);
        } else if (this.activeTool === "erase") {
          this.applyBrush(tx, ty, true);
        } else if (this.activeTool === "select") {
          this.selectionStart = { x: tx, y: ty };
          this.selection = { x1: tx, y1: ty, x2: tx, y2: ty };
          gameBus.emit("voidcraft:selection-change", { active: true, width: 1, height: 1 });
        } else if (this.activeTool === "entity") {
          this.placeEntityAt(tx, ty);
        }
      }
      if (ptr.rightButtonDown()) {
        this.isRightDown = true;
        this.currentBatch = [];
        const tx = Math.floor(ptr.worldX / this.TILE_SIZE);
        const ty = Math.floor(ptr.worldY / this.TILE_SIZE);
        this.applyBrush(tx, ty, true);
      }
    });

    this.input.on("pointerup", () => {
      if (this.isPointerDown || this.isRightDown) {
        if (this.currentBatch.length > 0) {
          this.pushHistory(this.currentBatch);
          this.currentBatch = [];
        }
      }
      this.isPointerDown = false;
      this.isRightDown = false;
    });

    this.input.on("wheel", (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001 * cam.zoom, 0.4, 2.5);
      cam.setZoom(newZoom);
    });
  }

  private setupBusListeners() {
    this.offSelectBlock = gameBus.on("voidcraft:select-block", ({ blockId }) => {
      this.selectedBlockId = blockId;
      if (this.activeTool === "erase") this.setTool("place");
    });
    this.offSelectTool = gameBus.on("voidcraft:select-tool", ({ tool }) => {
      this.setTool(tool as Tool);
    });
    this.offSelectLayer = gameBus.on("voidcraft:select-layer", ({ layer }) => {
      this.setLayer(layer);
    });
    this.offMinimapClick = gameBus.on("voidcraft:minimap-click", ({ worldX, worldY }) => {
      this.cameras.main.setScroll(worldX - 400, worldY - 300);
    });
    this.offRemoteTile = gameBus.on("voidcraft:tile-placed", ({ x, y, layer, tileId, playerId }) => {
      if (playerId === "local") return;
      this.world.set(x, y, layer as LayerIndex, tileId);
      this.refreshTile(x, y);
      // Briefly tint remote tile
      const key = `${x},${y},${layer}`;
      const rect = this.tilePool.get(key);
      if (rect) {
        rect.setFillStyle(0x45f5c8, 0.8);
        this.time.delayedCall(400, () => {
          const blk = getBlock(tileId);
          if (blk) rect.setFillStyle(blk.color, 1);
          else rect.setVisible(false);
        });
      }
    });

    // Tiles relayed by VoidCraftSync from the socket
    this.offRemoteTileSync = gameBus.on("voidcraft:remote-tile", ({ x, y, layer, tileId }) => {
      this.world.set(x, y, layer as LayerIndex, tileId);
      this.refreshTile(x, y);
      const key = `${x},${y},${layer}`;
      const rect = this.tilePool.get(key);
      if (rect) {
        rect.setFillStyle(0x45f5c8, 0.8);
        this.time.delayedCall(400, () => {
          const blk = getBlock(tileId);
          if (blk) rect.setFillStyle(blk.color, 1);
          else rect.setVisible(false);
        });
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offSelectBlock();
      this.offSelectTool();
      this.offSelectLayer();
      this.offMinimapClick();
      this.offRemoteTile();
      this.offRemoteTileSync();
      this.sync?.destroy();
      this.remoteCursors?.destroy();
    });
  }

  public override update(_time: number, _delta: number) {
    const cam = this.cameras.main;
    const speed = 400 / cam.zoom;
    const dt = this.game.loop.delta / 1000;

    if (this.camPanKeys.left.isDown) cam.scrollX -= speed * dt;
    if (this.camPanKeys.right.isDown) cam.scrollX += speed * dt;
    if (this.camPanKeys.up.isDown) cam.scrollY -= speed * dt;
    if (this.camPanKeys.down.isDown) cam.scrollY += speed * dt;

    this.updateViewportVisibility();
    if (this.showGrid) this.drawGrid();
    this.drawSelection();
    this.fps.update(this);
    this.remoteCursors?.update();
    this.sync?.sendCursor(this.input.activePointer.worldX, this.input.activePointer.worldY);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private renderFullWorld() {
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        this.refreshTile(x, y);
      }
    }
  }

  private refreshTile(tx: number, ty: number) {
    const cell = this.world.get(tx, ty);
    const layers: [string, LayerIndex][] = [
      [cell.bg, 0],
      [cell.terrain, 1],
      [cell.fg, 2]
    ];
    for (const [tileId, layer] of layers) {
      const key = `${tx},${ty},${layer}`;
      const px = tx * this.TILE_SIZE + this.TILE_SIZE / 2;
      const py = ty * this.TILE_SIZE + this.TILE_SIZE / 2;

      if (!tileId) {
        const existing = this.tilePool.get(key);
        if (existing) {
          existing.setVisible(false);
          const tw = this.emissiveTweens.get(key);
          if (tw) { tw.stop(); this.emissiveTweens.delete(key); }
        }
        continue;
      }

      const blk = getBlock(tileId);
      if (!blk) continue;

      let rect = this.tilePool.get(key);
      if (!rect) {
        rect = this.add.rectangle(px, py, this.TILE_SIZE - 1, this.TILE_SIZE - 1, blk.color);
        rect.setStrokeStyle(1, blk.stroke, 0.6);
        rect.setDepth(layer * 10 + 1);
        this.tilePool.set(key, rect);
      } else {
        rect.setPosition(px, py);
        rect.setFillStyle(blk.color, 1);
        rect.setStrokeStyle(1, blk.stroke, 0.6);
        rect.setVisible(true);
      }

      // Emissive pulse
      if (blk.emissive && !this.emissiveTweens.has(key)) {
        const tween = this.tweens.add({
          targets: rect,
          alpha: { from: 0.65, to: 1.0 },
          duration: 900 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        this.emissiveTweens.set(key, tween);
      } else if (!blk.emissive) {
        const tw = this.emissiveTweens.get(key);
        if (tw) { tw.stop(); this.emissiveTweens.delete(key); rect.setAlpha(1); }
      }
    }
  }

  private updateViewportVisibility() {
    const cam = this.cameras.main;
    const left = Math.max(0, Math.floor((cam.scrollX - 2 * this.TILE_SIZE) / this.TILE_SIZE));
    const right = Math.min(this.world.width - 1, Math.ceil((cam.scrollX + cam.width / cam.zoom + 2 * this.TILE_SIZE) / this.TILE_SIZE));
    const top = Math.max(0, Math.floor((cam.scrollY - 2 * this.TILE_SIZE) / this.TILE_SIZE));
    const bottom = Math.min(this.world.height - 1, Math.ceil((cam.scrollY + cam.height / cam.zoom + 2 * this.TILE_SIZE) / this.TILE_SIZE));

    for (const [key, rect] of this.tilePool) {
      const parts = key.split(",");
      const tx = parseInt(parts[0]!);
      const ty = parseInt(parts[1]!);
      const inView = tx >= left && tx <= right && ty >= top && ty <= bottom;
      if (rect.visible !== inView) rect.setVisible(inView);
    }
  }

  private updateGhost(tx: number, ty: number) {
    const px = tx * this.TILE_SIZE + this.TILE_SIZE / 2;
    const py = ty * this.TILE_SIZE + this.TILE_SIZE / 2;
    // Brush-size ghost for place/erase; single-tile for everything else
    const useBrush = this.activeTool === "place" || this.activeTool === "erase";
    const brushPx = useBrush ? this.brushSize * this.TILE_SIZE : this.TILE_SIZE;
    this.ghostRect.setPosition(px, py);
    this.ghostRect.setSize(brushPx - 1, brushPx - 1);
    this.ghostRect.setVisible(true);

    if (this.activeTool === "place") {
      const blk = getBlock(this.selectedBlockId);
      this.ghostRect.setFillStyle(blk ? blk.color : 0xffffff, 0.45);
      this.ghostRect.setStrokeStyle(2, 0xffffff, 0.9);
    } else if (this.activeTool === "erase") {
      this.ghostRect.setFillStyle(0xff0000, 0.3);
      this.ghostRect.setStrokeStyle(2, 0xff5555, 0.9);
    } else if (this.activeTool === "fill") {
      const blk = getBlock(this.selectedBlockId);
      this.ghostRect.setFillStyle(blk ? blk.color : 0xffffff, 0.35);
      this.ghostRect.setStrokeStyle(2, 0xffff00, 0.9);
    } else if (this.activeTool === "eyedropper") {
      this.ghostRect.setFillStyle(0xffffff, 0.1);
      this.ghostRect.setStrokeStyle(2, 0x00ff88, 0.9);
    } else if (this.activeTool === "select") {
      this.ghostRect.setFillStyle(0xffffff, 0.05);
      this.ghostRect.setStrokeStyle(2, 0xffff00, 0.9);
    } else if (this.activeTool === "entity") {
      this.ghostRect.setFillStyle(0xff8800, 0.3);
      this.ghostRect.setStrokeStyle(2, 0xffcc00, 0.9);
    }
  }

  // ── Tile Editing ──────────────────────────────────────────────────────────

  private paintAt(tx: number, ty: number, newBatch: boolean) {
    if (tx < 0 || ty < 0 || tx >= this.world.width || ty >= this.world.height) return;
    const before = this.world.getTile(tx, ty, this.activeLayer);
    if (before === this.selectedBlockId) return;
    if (newBatch && this.currentBatch.length === 0) {
      // start fresh
    }
    this.world.set(tx, ty, this.activeLayer, this.selectedBlockId);
    this.currentBatch.push({ x: tx, y: ty, layer: this.activeLayer, before, after: this.selectedBlockId });
    this.refreshTile(tx, ty);
    this.particles.spawnBlockBreak(
      tx * this.TILE_SIZE + this.TILE_SIZE / 2,
      ty * this.TILE_SIZE + this.TILE_SIZE / 2,
      0x334155,
    );
    audioManager.playBlockPlace(this.selectedBlockId);
    const blkDef = getBlock(this.selectedBlockId);
    achievementSystem.checkBlockPlaced(blkDef?.category ?? this.selectedBlockId);
    gameBus.emit("voidcraft:tile-placed", { x: tx, y: ty, layer: this.activeLayer, tileId: this.selectedBlockId, playerId: "local" });
  }

  private eraseAt(tx: number, ty: number, newBatch: boolean) {
    if (tx < 0 || ty < 0 || tx >= this.world.width || ty >= this.world.height) return;
    const before = this.world.getTile(tx, ty, this.activeLayer);
    if (before === EMPTY_TILE) return;
    if (newBatch && this.currentBatch.length === 0) {
      // start fresh
    }
    this.world.set(tx, ty, this.activeLayer, EMPTY_TILE);
    this.currentBatch.push({ x: tx, y: ty, layer: this.activeLayer, before, after: EMPTY_TILE });
    this.refreshTile(tx, ty);
    this.particles.spawnBlockBreak(
      tx * this.TILE_SIZE + this.TILE_SIZE / 2,
      ty * this.TILE_SIZE + this.TILE_SIZE / 2,
      getBlock(before)?.color ?? 0x334155,
    );
    audioManager.playBlockBreak(before);
    gameBus.emit("voidcraft:tile-placed", { x: tx, y: ty, layer: this.activeLayer, tileId: EMPTY_TILE, playerId: "local" });
  }

  private doFill(tx: number, ty: number) {
    const target = this.world.getTile(tx, ty, this.activeLayer);
    if (target === this.selectedBlockId) return;
    const before = new Map<string, string>();
    // Snapshot before
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        before.set(`${x},${y}`, this.world.getTile(x, y, this.activeLayer));
      }
    }
    this.world.floodFill(tx, ty, this.activeLayer, this.selectedBlockId);
    // Find changed cells
    const batch: HistoryEntry[] = [];
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const after = this.world.getTile(x, y, this.activeLayer);
        const bef = before.get(`${x},${y}`) ?? EMPTY_TILE;
        if (after !== bef) {
          batch.push({ x, y, layer: this.activeLayer, before: bef, after });
          this.refreshTile(x, y);
        }
      }
    }
    if (batch.length > 0) {
      this.pushHistory(batch);
      achievementSystem.checkFloodFill();
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  private pushHistory(batch: HistoryEntry[]) {
    // Trim redo branch
    if (this.historyIndex < this.history.length - 1) {
      this.history.splice(this.historyIndex + 1);
    }
    this.history.push(batch);
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  private undo() {
    if (this.historyIndex < 0) return;
    const batch = this.history[this.historyIndex]!;
    for (const entry of batch) {
      this.world.set(entry.x, entry.y, entry.layer, entry.before);
      this.refreshTile(entry.x, entry.y);
    }
    this.historyIndex--;
    audioManager.playNotification();
    achievementSystem.checkUndoUsed();
  }

  private redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const batch = this.history[this.historyIndex]!;
    for (const entry of batch) {
      this.world.set(entry.x, entry.y, entry.layer, entry.after);
      this.refreshTile(entry.x, entry.y);
    }
    audioManager.playNotification();
    achievementSystem.resetConsecutiveUndos();
  }

  // ── World Persistence ─────────────────────────────────────────────────────

  private saveWorld() {
    TileWorld.saveToStorage(this.world, this.currentSlot);
    audioManager.playCodeAccepted();
    achievementSystem.checkWorldSaved();
    gameBus.emit("voidcraft:world-saved", { slot: this.currentSlot });
  }

  private loadWorld() {
    const loaded = TileWorld.loadFromStorage(this.currentSlot);
    if (!loaded) return;
    this.world = loaded;
    this.history = [];
    this.historyIndex = -1;
    this.currentBatch = [];
    // Destroy existing pool
    for (const rect of this.tilePool.values()) rect.destroy();
    this.tilePool.clear();
    for (const tw of this.emissiveTweens.values()) tw.stop();
    this.emissiveTweens.clear();
    this.renderFullWorld();
    audioManager.playNotification();
    gameBus.emit("voidcraft:world-loaded", { slot: this.currentSlot });
  }

  // ── State helpers ─────────────────────────────────────────────────────────

  private setTool(tool: Tool) {
    this.activeTool = tool;
    gameBus.emit("voidcraft:tool-change", { tool });
  }

  private setLayer(layer: LayerIndex) {
    this.activeLayer = layer;
    gameBus.emit("voidcraft:layer-change", { layer });
  }

  private isPointerInUI(ptr: Phaser.Input.Pointer): boolean {
    return ptr.x < this.UI_LEFT_WIDTH || ptr.x > this.scale.width - this.UI_RIGHT_WIDTH || ptr.y > this.scale.height - this.UI_BOTTOM_HEIGHT;
  }

  public getWorld(): TileWorld {
    return this.world;
  }

  public getSelectedBlockId(): string { return this.selectedBlockId; }
  public getActiveLayer(): LayerIndex { return this.activeLayer; }
  public getActiveTool(): Tool { return this.activeTool; }
  public getHoverTile(): { x: number; y: number } { return { x: this.hoverTileX, y: this.hoverTileY }; }

  // ── Brush ─────────────────────────────────────────────────────────────────

  private changeBrushSize(delta: number) {
    const sizes: Array<1 | 3 | 5 | 7> = [1, 3, 5, 7];
    const idx = sizes.indexOf(this.brushSize);
    const newIdx = Phaser.Math.Clamp(idx + delta, 0, sizes.length - 1);
    this.brushSize = sizes[newIdx]!;
    gameBus.emit("voidcraft:brush-change", { size: this.brushSize });
  }

  /** Paint or erase a brushSize×brushSize area centred on (tx, ty). */
  private applyBrush(tx: number, ty: number, erase: boolean) {
    const half = Math.floor(this.brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (erase) this.eraseAt(tx + dx, ty + dy, false);
        else this.paintAt(tx + dx, ty + dy, false);
      }
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  private drawGrid() {
    this.gridGfx.clear();
    const cam = this.cameras.main;
    const left = Math.floor(cam.scrollX / this.TILE_SIZE) * this.TILE_SIZE;
    const top = Math.floor(cam.scrollY / this.TILE_SIZE) * this.TILE_SIZE;
    const right = cam.scrollX + cam.width / cam.zoom + this.TILE_SIZE;
    const bottom = cam.scrollY + cam.height / cam.zoom + this.TILE_SIZE;
    this.gridGfx.lineStyle(0.5, 0x334155, 0.35);
    for (let x = left; x <= right; x += this.TILE_SIZE) {
      this.gridGfx.lineBetween(x, top, x, bottom);
    }
    for (let y = top; y <= bottom; y += this.TILE_SIZE) {
      this.gridGfx.lineBetween(left, y, right, y);
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  private drawSelection() {
    this.selectionGfx.clear();
    if (!this.selection) return;
    const { x1, y1, x2, y2 } = this.selection;
    const px1 = x1 * this.TILE_SIZE;
    const py1 = y1 * this.TILE_SIZE;
    const pw = (x2 - x1 + 1) * this.TILE_SIZE;
    const ph = (y2 - y1 + 1) * this.TILE_SIZE;
    this.selectionGfx.lineStyle(1.5, 0xffffff, 0.9);
    this.selectionGfx.strokeRect(px1, py1, pw, ph);
    this.selectionGfx.fillStyle(0xffffff, 0.06);
    this.selectionGfx.fillRect(px1, py1, pw, ph);
  }

  private copySelection() {
    if (!this.selection) return;
    const { x1, y1, x2, y2 } = this.selection;
    const tiles: Array<{ dx: number; dy: number; layer: LayerIndex; id: string }> = [];
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        for (const layer of [0, 1, 2] as LayerIndex[]) {
          const id = this.world.getTile(tx, ty, layer);
          if (id) tiles.push({ dx: tx - x1, dy: ty - y1, layer, id });
        }
      }
    }
    this.clipboard = { tiles };
    gameBus.emit("voidcraft:clipboard-change", { hasContent: tiles.length > 0 });
  }

  private pasteClipboard() {
    if (!this.clipboard) return;
    const batch: HistoryEntry[] = [];
    for (const { dx, dy, layer, id } of this.clipboard.tiles) {
      const tx = this.hoverTileX + dx;
      const ty = this.hoverTileY + dy;
      if (tx < 0 || ty < 0 || tx >= this.world.width || ty >= this.world.height) continue;
      const before = this.world.getTile(tx, ty, layer);
      this.world.set(tx, ty, layer, id);
      batch.push({ x: tx, y: ty, layer, before, after: id });
      this.refreshTile(tx, ty);
    }
    if (batch.length > 0) this.pushHistory(batch);
  }

  private clearSelectionContent() {
    if (!this.selection) return;
    const { x1, y1, x2, y2 } = this.selection;
    const batch: HistoryEntry[] = [];
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        for (const layer of [0, 1, 2] as LayerIndex[]) {
          const before = this.world.getTile(tx, ty, layer);
          if (before) {
            this.world.set(tx, ty, layer, EMPTY_TILE);
            batch.push({ x: tx, y: ty, layer, before, after: EMPTY_TILE });
            this.refreshTile(tx, ty);
          }
        }
      }
    }
    if (batch.length > 0) this.pushHistory(batch);
    this.selection = null;
    this.selectionGfx.clear();
    gameBus.emit("voidcraft:selection-change", { active: false });
  }

  // ── Entity Placement ──────────────────────────────────────────────────────

  private placeEntityAt(tx: number, ty: number) {
    const key = `${tx},${ty}`;
    if (this.entityMarkers.has(key)) {
      // Toggle off: remove existing marker
      this.entityMarkers.delete(key);
      const gfx = this.entityGfxMap.get(key);
      if (gfx) { gfx.destroy(); this.entityGfxMap.delete(key); }
      return;
    }
    this.entityMarkers.set(key, { x: tx, y: ty, type: "spawn" });
    const px = tx * this.TILE_SIZE + this.TILE_SIZE / 2;
    const py = ty * this.TILE_SIZE + this.TILE_SIZE / 2;
    const rect = this.add.rectangle(px, py, this.TILE_SIZE - 4, this.TILE_SIZE - 4, 0xff8800, 0.7)
      .setStrokeStyle(2, 0xffcc00, 1).setDepth(150);
    this.add.text(px, py, "E", { fontFamily: "monospace", fontSize: "12px", color: "#ffffff" })
      .setOrigin(0.5).setDepth(151);
    this.entityGfxMap.set(key, rect);
  }

  // ── World Name ────────────────────────────────────────────────────────────

  private editWorldName() {
    // Temporarily disable Phaser keyboard so the prompt can receive input
    this.input.keyboard!.enabled = false;
    const name = window.prompt("World name:", this.world.meta.name);
    this.input.keyboard!.enabled = true;
    if (name !== null && name.trim()) {
      this.world.meta.name = name.trim();
      this.ui.showToast(`World: "${this.world.meta.name}"`, "info");
    }
  }
}
