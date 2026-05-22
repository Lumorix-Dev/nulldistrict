import Phaser from 'phaser';
import { TileWorld, type LayerIndex } from '../../systems/TileWorld';
import { getBlock, EMPTY_TILE } from '../../systems/BlockRegistry';
import { gameBus } from '../../EventBus';

// ─────────────────────── constants ───────────────────────────────────────────

const TILE_SIZE        = 32;
const WORLD_W          = 100;
const WORLD_H          = 100;
const CAM_SPEED        = 400;   // world-px / second
const MIN_ZOOM         = 0.4;
const MAX_ZOOM         = 2.5;
const ZOOM_STEP        = 0.1;
const MAX_HISTORY      = 50;
const VIEWPORT_BUFFER  = 2;     // extra tile rows/cols beyond viewport edge
const PALETTE_W        = 210;   // left HUD panel width – block placement region
const MINIMAP_SIZE     = 120;
const MINIMAP_MARGIN   = 10;

// ─────────────────────── types ───────────────────────────────────────────────

type ToolType = 'place' | 'erase' | 'fill' | 'eyedropper';

interface HistoryEntry {
  x:      number;
  y:      number;
  layer:  LayerIndex;
  before: string;
  after:  string;
}

// ─────────────────────── scene ───────────────────────────────────────────────

export class CreativeScene extends Phaser.Scene {

  // ── world ──────────────────────────────────────────────────────────────────
  public  world!:          TileWorld;
  private activeLayer:     LayerIndex = 1;
  private selectedBlockId  = 'grass';
  private currentTool:     ToolType   = 'place';

  // ── rendering pool ─────────────────────────────────────────────────────────
  // key = "${x},${y},${layer}"
  private tilePool       = new Map<string, Phaser.GameObjects.Rectangle>();
  private emissiveTweens = new Map<string, Phaser.Tweens.Tween>();
  private ghostTile!:     Phaser.GameObjects.Rectangle;

  // ── keyboard keys ─────────────────────────────────────────────────────────
  private kW!:     Phaser.Input.Keyboard.Key;
  private kA!:     Phaser.Input.Keyboard.Key;
  private kS!:     Phaser.Input.Keyboard.Key;
  private kD!:     Phaser.Input.Keyboard.Key;
  private kUp!:    Phaser.Input.Keyboard.Key;
  private kDown!:  Phaser.Input.Keyboard.Key;
  private kLeft!:  Phaser.Input.Keyboard.Key;
  private kRight!: Phaser.Input.Keyboard.Key;
  private kOne!:   Phaser.Input.Keyboard.Key;
  private kTwo!:   Phaser.Input.Keyboard.Key;
  private kThree!: Phaser.Input.Keyboard.Key;
  private kQ!:     Phaser.Input.Keyboard.Key;
  private kE!:     Phaser.Input.Keyboard.Key;
  private kR!:     Phaser.Input.Keyboard.Key;
  private kX!:     Phaser.Input.Keyboard.Key;
  private kZ!:     Phaser.Input.Keyboard.Key;
  private kY!:     Phaser.Input.Keyboard.Key;
  private kL!:     Phaser.Input.Keyboard.Key;
  private kCtrl!:  Phaser.Input.Keyboard.Key;
  private kShift!: Phaser.Input.Keyboard.Key;

  // ── middle-drag state ──────────────────────────────────────────────────────
  private isMiddleDragging = false;
  private midDragStartX    = 0;
  private midDragStartY    = 0;
  private midDragCamX      = 0;
  private midDragCamY      = 0;

  // ── pointer drag state ────────────────────────────────────────────────────
  private isLeftDown  = false;
  private isRightDown = false;

  // ── hovered tile ──────────────────────────────────────────────────────────
  private hoveredTileX = -1;
  private hoveredTileY = -1;

  // ── history ───────────────────────────────────────────────────────────────
  private currentBatch: HistoryEntry[]   = [];
  private undoStack:    HistoryEntry[][] = [];
  private redoStack:    HistoryEntry[][] = [];

  // ── view-dirty tracking ───────────────────────────────────────────────────
  private viewDirty = true;
  private lastCamX  = 0;
  private lastCamY  = 0;
  private lastZoom  = 1;

  // ── bus cleanup ───────────────────────────────────────────────────────────
  private busUnsubs: Array<() => void> = [];

  // ── multiplayer identity ──────────────────────────────────────────────────
  private readonly playerId = `player-${Math.random().toString(36).slice(2, 8)}`;

  // ─────────────────────────────────────────────────────────────────────────

  public constructor() {
    super('CreativeScene');
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  public create(): void {
    this.world = new TileWorld({ width: WORLD_W, height: WORLD_H, tileSize: TILE_SIZE });
    this.spawnInitialTerrain();
    this.setupCamera();
    this.setupKeys();
    this.setupMouseInput();
    this.setupGhost();
    this.setupBusListeners();
    this.viewDirty = true;
    this.scene.launch('CreativeHUDScene');
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  public override update(_time: number, delta: number): void {
    this.handleKeyActions();
    this.handleCameraMovement(delta);
    this.syncHoveredTileFromPointer();
    this.checkViewDirty();
  }

  // ── public API for HUD scene ──────────────────────────────────────────────

  public getHoveredTile(): Readonly<{ x: number; y: number }> {
    return { x: this.hoveredTileX, y: this.hoveredTileY };
  }

  public getCameraInfo(): Readonly<{ scrollX: number; scrollY: number; zoom: number; width: number; height: number }> {
    const c = this.cameras.main;
    return { scrollX: c.scrollX, scrollY: c.scrollY, zoom: c.zoom, width: c.width, height: c.height };
  }

  public jumpCameraTo(worldX: number, worldY: number): void {
    this.cameras.main.centerOn(worldX, worldY);
    this.viewDirty = true;
  }

  // ── initial terrain ───────────────────────────────────────────────────────

  private spawnInitialTerrain(): void {
    for (let x = 0; x < WORLD_W; x++) {
      this.world.set(x, 80, 1, 'grass');
      for (let y = 81; y < WORLD_H; y++) {
        this.world.set(x, y, 1, 'dirt');
      }
    }
  }

  // ── camera setup ─────────────────────────────────────────────────────────

  private setupCamera(): void {
    const pad     = 200;
    const worldPxW = WORLD_W * TILE_SIZE;
    const worldPxH = WORLD_H * TILE_SIZE;
    this.cameras.main.setBounds(-pad, -pad, worldPxW + pad * 2, worldPxH + pad * 2);
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(50 * TILE_SIZE, 50 * TILE_SIZE);
    this.lastCamX = this.cameras.main.scrollX;
    this.lastCamY = this.cameras.main.scrollY;
    this.lastZoom = this.cameras.main.zoom;
  }

  // ── keyboard setup ────────────────────────────────────────────────────────

  private setupKeys(): void {
    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.kW     = kb.addKey(KC.W);
    this.kA     = kb.addKey(KC.A);
    this.kS     = kb.addKey(KC.S);
    this.kD     = kb.addKey(KC.D);
    this.kUp    = kb.addKey(KC.UP);
    this.kDown  = kb.addKey(KC.DOWN);
    this.kLeft  = kb.addKey(KC.LEFT);
    this.kRight = kb.addKey(KC.RIGHT);
    this.kOne   = kb.addKey(KC.ONE);
    this.kTwo   = kb.addKey(KC.TWO);
    this.kThree = kb.addKey(KC.THREE);
    this.kQ     = kb.addKey(KC.Q);
    this.kE     = kb.addKey(KC.E);
    this.kR     = kb.addKey(KC.R);
    this.kX     = kb.addKey(KC.X);
    this.kZ     = kb.addKey(KC.Z);
    this.kY     = kb.addKey(KC.Y);
    this.kL     = kb.addKey(KC.L);
    this.kCtrl  = kb.addKey(KC.CTRL);
    this.kShift = kb.addKey(KC.SHIFT);
  }

  // ── one-shot key actions (polled each frame) ──────────────────────────────

  private handleKeyActions(): void {
    const JD   = Phaser.Input.Keyboard.JustDown;
    const ctrl = this.kCtrl.isDown;

    if (JD(this.kOne))           this.setActiveLayer(0);
    if (JD(this.kTwo))           this.setActiveLayer(1);
    if (JD(this.kThree))         this.setActiveLayer(2);

    if (JD(this.kQ))             this.setTool('place');
    if (JD(this.kE) && !ctrl)    this.setTool('fill');
    if (JD(this.kR))             this.setTool('eyedropper');
    if (JD(this.kX))             this.setTool('erase');

    if (ctrl && JD(this.kZ))     this.undo();
    if (ctrl && JD(this.kY))     this.redo();
    if (ctrl && JD(this.kS))     this.saveWorld();
    if (ctrl && JD(this.kL))     this.loadWorld();
  }

  // ── mouse input ───────────────────────────────────────────────────────────

  private setupMouseInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 1) {
        this.isMiddleDragging = true;
        this.midDragStartX    = ptr.x;
        this.midDragStartY    = ptr.y;
        this.midDragCamX      = this.cameras.main.scrollX;
        this.midDragCamY      = this.cameras.main.scrollY;
        return;
      }
      const [tx, ty] = this.screenToTile(ptr.x, ptr.y);
      if (ptr.button === 0) {
        this.isLeftDown   = true;
        this.currentBatch = [];
        if (!this.isOverHUD(ptr.x, ptr.y)) this.handlePrimaryAction(tx, ty);
      }
      if (ptr.button === 2) {
        this.isRightDown  = true;
        this.currentBatch = [];
        if (!this.isOverHUD(ptr.x, ptr.y)) this.eraseTile(tx, ty);
      }
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 1) { this.isMiddleDragging = false; return; }
      if (ptr.button === 0 && this.isLeftDown)  { this.isLeftDown  = false; this.pushBatchToHistory(); }
      if (ptr.button === 2 && this.isRightDown) { this.isRightDown = false; this.pushBatchToHistory(); }
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (ptr: Phaser.Input.Pointer) => {
      if (this.isMiddleDragging) {
        const zoom = this.cameras.main.zoom;
        this.cameras.main.scrollX = this.midDragCamX - (ptr.x - this.midDragStartX) / zoom;
        this.cameras.main.scrollY = this.midDragCamY - (ptr.y - this.midDragStartY) / zoom;
        this.viewDirty = true;
        return;
      }
      if (!this.isOverHUD(ptr.x, ptr.y)) {
        const [tx, ty] = this.screenToTile(ptr.x, ptr.y);
        if (this.isLeftDown)  this.handlePrimaryAction(tx, ty);
        if (this.isRightDown) this.eraseTile(tx, ty);
      }
    });

    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_ptr: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
        const cam  = this.cameras.main;
        const step = dz > 0 ? -ZOOM_STEP : ZOOM_STEP;
        cam.setZoom(Phaser.Math.Clamp(cam.zoom + step, MIN_ZOOM, MAX_ZOOM));
        this.viewDirty = true;
      },
    );
  }

  // ── ghost tile setup ──────────────────────────────────────────────────────

  private setupGhost(): void {
    this.ghostTile = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.45);
    this.ghostTile.setStrokeStyle(2, 0xffffff, 0.9);
    this.ghostTile.setDepth(100);
    this.ghostTile.setVisible(false);
  }

  // ── gameBus listeners ────────────────────────────────────────────────────

  private setupBusListeners(): void {
    this.busUnsubs.push(
      gameBus.on('voidcraft:select-block', ({ blockId }) => {
        this.selectedBlockId = blockId;
        this.updateGhost();
        gameBus.emit('voidcraft:selected-block-change', { blockId });
      }),
      gameBus.on('voidcraft:select-tool', ({ tool }) => {
        this.setTool(tool as ToolType);
      }),
      gameBus.on('voidcraft:select-layer', ({ layer }) => {
        this.setActiveLayer(layer);
      }),
      gameBus.on('voidcraft:tile-placed', ({ x, y, layer, tileId, playerId }) => {
        if (playerId === this.playerId) return;
        this.applyRemoteTile(x, y, layer, tileId);
      }),
      gameBus.on('voidcraft:minimap-click', ({ worldX, worldY }) => {
        this.jumpCameraTo(worldX, worldY);
      }),
    );
  }

  // ── tool execution ────────────────────────────────────────────────────────

  private handlePrimaryAction(tx: number, ty: number): void {
    switch (this.currentTool) {
      case 'place':      this.placeTile(tx, ty);   break;
      case 'erase':      this.eraseTile(tx, ty);   break;
      case 'fill':       this.bucketFill(tx, ty);  break;
      case 'eyedropper': this.eyedropper(tx, ty);  break;
    }
  }

  private placeTile(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
    const before = this.world.getTile(tx, ty, this.activeLayer);
    const after  = this.selectedBlockId;
    if (before === after) return;
    this.world.set(tx, ty, this.activeLayer, after);
    this.refreshTile(tx, ty, this.activeLayer);
    this.currentBatch.push({ x: tx, y: ty, layer: this.activeLayer, before, after });
    gameBus.emit('voidcraft:tile-placed', {
      x: tx, y: ty, layer: this.activeLayer, tileId: after, playerId: this.playerId,
    });
  }

  private eraseTile(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
    const before = this.world.getTile(tx, ty, this.activeLayer);
    if (before === EMPTY_TILE) return;
    this.world.set(tx, ty, this.activeLayer, EMPTY_TILE);
    this.refreshTile(tx, ty, this.activeLayer);
    this.currentBatch.push({ x: tx, y: ty, layer: this.activeLayer, before, after: EMPTY_TILE });
    gameBus.emit('voidcraft:tile-placed', {
      x: tx, y: ty, layer: this.activeLayer, tileId: EMPTY_TILE, playerId: this.playerId,
    });
  }

  /**
   * BFS flood-fill with per-cell history tracking.
   * Mirrors TileWorld's FLOOD_FILL_LIMIT of 5 000 cells.
   */
  private bucketFill(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
    const fillWith = this.selectedBlockId;
    const targetId = this.world.getTile(tx, ty, this.activeLayer);
    if (targetId === fillWith) return;

    const batch: HistoryEntry[] = [];
    const visited = new Set<number>();
    const queue: [number, number][] = [[tx, ty]];
    visited.add(ty * WORLD_W + tx);

    while (queue.length > 0 && batch.length < 5000) {
      const entry = queue.shift();
      if (!entry) break;
      const [cx, cy] = entry;
      this.world.set(cx, cy, this.activeLayer, fillWith);
      this.refreshTile(cx, cy, this.activeLayer);
      batch.push({ x: cx, y: cy, layer: this.activeLayer, before: targetId, after: fillWith });

      const nbrs: [number, number][] = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
      for (const [nx, ny] of nbrs) {
        if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) continue;
        const ni = ny * WORLD_W + nx;
        if (visited.has(ni)) continue;
        if (this.world.getTile(nx, ny, this.activeLayer) !== targetId) continue;
        visited.add(ni);
        queue.push([nx, ny]);
      }
    }

    if (batch.length === 0) return;
    this.undoStack.push(batch);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  private eyedropper(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return;
    const id = this.world.getTile(tx, ty, this.activeLayer);
    if (id !== EMPTY_TILE) {
      this.selectedBlockId = id;
      gameBus.emit('voidcraft:selected-block-change', { blockId: id });
      this.updateGhost();
    }
  }

  private applyRemoteTile(x: number, y: number, layer: LayerIndex, tileId: string): void {
    this.world.set(x, y, layer, tileId);
    this.refreshTile(x, y, layer);
    // Briefly tint the cell cyan so remote placements are visually distinct
    const rect = this.tilePool.get(`${x},${y},${layer}`);
    if (rect) {
      rect.setFillStyle(0x00ffff, 0.9);
      this.time.delayedCall(400, () => {
        const block = getBlock(tileId);
        if (block) rect.setFillStyle(block.color, 1);
        else rect.setVisible(false);
      });
    }
  }

  // ── history ───────────────────────────────────────────────────────────────

  private pushBatchToHistory(): void {
    if (this.currentBatch.length === 0) return;
    this.undoStack.push([...this.currentBatch]);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack    = [];
    this.currentBatch = [];
  }

  private undo(): void {
    const batch = this.undoStack.pop();
    if (!batch) return;
    for (const e of [...batch].reverse()) {
      this.world.set(e.x, e.y, e.layer, e.before);
      this.refreshTile(e.x, e.y, e.layer);
    }
    this.redoStack.push(batch);
  }

  private redo(): void {
    const batch = this.redoStack.pop();
    if (!batch) return;
    for (const e of batch) {
      this.world.set(e.x, e.y, e.layer, e.after);
      this.refreshTile(e.x, e.y, e.layer);
    }
    this.undoStack.push(batch);
  }

  // ── layer / tool setters ──────────────────────────────────────────────────

  private setActiveLayer(layer: LayerIndex): void {
    this.activeLayer = layer;
    gameBus.emit('voidcraft:layer-change', { layer });
  }

  private setTool(tool: ToolType): void {
    this.currentTool = tool;
    gameBus.emit('voidcraft:tool-change', { tool });
  }

  // ── save / load ───────────────────────────────────────────────────────────

  private saveWorld(): void {
    TileWorld.saveToStorage(this.world, 0);
    gameBus.emit('voidcraft:world-saved', { slot: 0 });
  }

  private loadWorld(): void {
    const loaded = TileWorld.loadFromStorage(0);
    if (!loaded) return;
    this.clearTilePool();
    this.world     = loaded;
    this.viewDirty = true;
    gameBus.emit('voidcraft:world-loaded', { slot: 0 });
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  private screenToTile(sx: number, sy: number): [number, number] {
    const cam = this.cameras.main;
    return [
      Math.floor((cam.scrollX + sx / cam.zoom) / TILE_SIZE),
      Math.floor((cam.scrollY + sy / cam.zoom) / TILE_SIZE),
    ];
  }

  private getViewportRange(): { x1: number; y1: number; x2: number; y2: number } {
    const cam = this.cameras.main;
    const buf = VIEWPORT_BUFFER;
    return {
      x1: Math.max(0,         Math.floor(cam.scrollX / TILE_SIZE) - buf),
      y1: Math.max(0,         Math.floor(cam.scrollY / TILE_SIZE) - buf),
      x2: Math.min(WORLD_W-1, Math.ceil((cam.scrollX + cam.width  / cam.zoom) / TILE_SIZE) + buf),
      y2: Math.min(WORLD_H-1, Math.ceil((cam.scrollY + cam.height / cam.zoom) / TILE_SIZE) + buf),
    };
  }

  private renderViewport(): void {
    const { x1, y1, x2, y2 } = this.getViewportRange();

    // Hide pool entries that drifted outside the new viewport
    for (const [key, rect] of this.tilePool) {
      const c1 = key.indexOf(',');
      const c2 = key.indexOf(',', c1 + 1);
      const tx = parseInt(key.slice(0, c1), 10);
      const ty = parseInt(key.slice(c1 + 1, c2), 10);
      const inView = tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2;
      if (rect.visible !== inView) rect.setVisible(inView);
    }

    // Create / reveal Rectangles for every non-empty tile in viewport
    for (let layer = 0; layer < 3; layer++) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const l   = layer as LayerIndex;
          const id  = this.world.getTile(x, y, l);
          const key = `${x},${y},${layer}`;
          if (id === EMPTY_TILE) {
            const r = this.tilePool.get(key);
            if (r?.visible) r.setVisible(false);
          } else {
            this.ensureTileRect(x, y, l, id);
          }
        }
      }
    }
  }

  private ensureTileRect(tx: number, ty: number, layer: LayerIndex, tileId: string): void {
    const key   = `${tx},${ty},${layer}`;
    const block = getBlock(tileId);
    if (!block) return;

    let rect = this.tilePool.get(key);
    if (!rect) {
      const wx = tx * TILE_SIZE + TILE_SIZE / 2;
      const wy = ty * TILE_SIZE + TILE_SIZE / 2;
      rect = this.add.rectangle(wx, wy, TILE_SIZE, TILE_SIZE, block.color);
      rect.setStrokeStyle(2, block.stroke);
      rect.setDepth(layer);
      this.tilePool.set(key, rect);
      if (block.emissive) this.startEmissiveTween(key, rect);
    }
    if (!rect.visible) rect.setVisible(true);
  }

  private startEmissiveTween(key: string, rect: Phaser.GameObjects.Rectangle): void {
    const prev = this.emissiveTweens.get(key);
    if (prev) prev.stop();
    const tween = this.tweens.add({
      targets:  rect,
      alpha:    { from: 0.65, to: 1.0 },
      duration: 900,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
    this.emissiveTweens.set(key, tween);
  }

  /** Destroy + recreate a tile's Rectangle after a world data change. */
  private refreshTile(tx: number, ty: number, layer: LayerIndex): void {
    const key  = `${tx},${ty},${layer}`;
    const rect = this.tilePool.get(key);
    if (rect) {
      const tween = this.emissiveTweens.get(key);
      if (tween) { tween.stop(); this.emissiveTweens.delete(key); }
      rect.destroy();
      this.tilePool.delete(key);
    }
    const id = this.world.getTile(tx, ty, layer);
    if (id !== EMPTY_TILE) this.ensureTileRect(tx, ty, layer, id);
  }

  private updateGhost(): void {
    const tx = this.hoveredTileX;
    const ty = this.hoveredTileY;
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) {
      this.ghostTile.setVisible(false);
      return;
    }
    if (this.currentTool === 'erase') {
      this.ghostTile.setFillStyle(0xff2020, 0.35);
      this.ghostTile.setStrokeStyle(2, 0xff4040, 0.9);
    } else if (this.currentTool === 'eyedropper') {
      this.ghostTile.setFillStyle(0x00ffff, 0.3);
      this.ghostTile.setStrokeStyle(2, 0x00ffff, 0.9);
    } else {
      const block = getBlock(this.selectedBlockId);
      if (block) {
        this.ghostTile.setFillStyle(block.color, 0.5);
        this.ghostTile.setStrokeStyle(2, block.stroke, 0.9);
      }
    }
    this.ghostTile.setPosition(
      tx * TILE_SIZE + TILE_SIZE / 2,
      ty * TILE_SIZE + TILE_SIZE / 2,
    );
    this.ghostTile.setVisible(true);
  }

  // ── update helpers ────────────────────────────────────────────────────────

  private handleCameraMovement(delta: number): void {
    const cam  = this.cameras.main;
    const ctrl = this.kCtrl.isDown;
    const spd  = CAM_SPEED / cam.zoom;
    const dt   = delta / 1000;
    let dx = 0, dy = 0;
    if (this.kA.isDown || this.kLeft.isDown)              dx -= spd * dt;
    if (this.kD.isDown || this.kRight.isDown)             dx += spd * dt;
    if (this.kW.isDown || this.kUp.isDown)                dy -= spd * dt;
    // Suppress S-down while Ctrl is held (Ctrl+S = save, not pan)
    if ((this.kS.isDown || this.kDown.isDown) && !ctrl)   dy += spd * dt;
    if (dx !== 0 || dy !== 0) {
      cam.scrollX += dx;
      cam.scrollY += dy;
      this.viewDirty = true;
    }
  }

  private syncHoveredTileFromPointer(): void {
    const ptr      = this.input.activePointer;
    const [tx, ty] = this.screenToTile(ptr.x, ptr.y);
    if (tx !== this.hoveredTileX || ty !== this.hoveredTileY) {
      this.hoveredTileX = tx;
      this.hoveredTileY = ty;
      this.updateGhost();
    }
  }

  private checkViewDirty(): void {
    const cam = this.cameras.main;
    if (
      this.viewDirty ||
      Math.abs(cam.scrollX - this.lastCamX) > 0.5 ||
      Math.abs(cam.scrollY - this.lastCamY) > 0.5 ||
      cam.zoom !== this.lastZoom
    ) {
      this.lastCamX  = cam.scrollX;
      this.lastCamY  = cam.scrollY;
      this.lastZoom  = cam.zoom;
      this.viewDirty = false;
      this.renderViewport();
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /** True when a screen point is inside a HUD panel (palette, minimap, info). */
  private isOverHUD(sx: number, sy: number): boolean {
    const W = this.scale.width;
    const H = this.scale.height;
    // Left palette panel
    if (sx < PALETTE_W) return true;
    // Top-right minimap
    if (sx > W - (MINIMAP_SIZE + MINIMAP_MARGIN * 2) && sy < MINIMAP_SIZE + MINIMAP_MARGIN * 2 + 40) return true;
    // Bottom-right info panel
    if (sx > W - 240 && sy > H - 120) return true;
    return false;
  }

  private clearTilePool(): void {
    for (const [, rect] of this.tilePool) rect.destroy();
    this.tilePool.clear();
    for (const [, tween] of this.emissiveTweens) tween.stop();
    this.emissiveTweens.clear();
  }

  // ── shutdown ──────────────────────────────────────────────────────────────

  private onShutdown(): void {
    for (const unsub of this.busUnsubs) unsub();
    this.busUnsubs = [];
    this.clearTilePool();
  }
}
