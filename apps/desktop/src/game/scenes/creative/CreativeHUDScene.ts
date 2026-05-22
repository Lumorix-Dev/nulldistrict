import Phaser from 'phaser';
import {
  blocksByCategory,
  ALL_CATEGORIES,
  getBlock,
  type BlockCategory,
  type BlockDef,
} from '../../systems/BlockRegistry';
import { gameBus } from '../../EventBus';
import type { CreativeScene } from './CreativeScene';

// ─────────────────────── layout constants ─────────────────────────────────────

const PANEL_W        = 200;        // palette panel width
const PANEL_BG       = 0x05070b;
const PANEL_ALPHA    = 0.92;
const TAB_H          = 34;
const BLOCK_H        = 42;         // height per block row in palette
const BLOCK_ICON_SZ  = 28;
const LAYER_BTN_H    = 36;
const TOOL_BTN_H     = 36;
const MINIMAP_SZ     = 120;        // minimap size in px
const MINIMAP_M      = 10;         // margin from canvas edge
const INFO_W         = 220;
const INFO_H         = 110;
const TOAST_MAX      = 4;
const TOAST_DURATION = 2800;       // ms a toast stays visible
const WORLD_W        = 100;
const WORLD_H        = 100;

// Colours
const C_ACTIVE_TAB  = 0x1a3a4a;
const C_TEXT_BRIGHT = '#9be7ff';
const C_TEXT_DIM    = '#4a6070';
const C_TEXT_WHITE  = '#e8f0f4';
const C_BORDER      = 0x9be7ff;
const C_SELECTION   = 0x9be7ff;
const C_TOOL_ACTIVE = 0x1a4f6a;
const C_LAYER_0     = 0x1a2e3a;
const C_LAYER_2     = 0x1a4a5a;

// ─────────────────────── toast record ─────────────────────────────────────────

interface Toast {
  bg:    Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  tween: Phaser.Tweens.Tween | null;
  timer: Phaser.Time.TimerEvent | null;
}

// ─────────────────────── scene ────────────────────────────────────────────────

export class CreativeHUDScene extends Phaser.Scene {

  // ── state mirrors ──────────────────────────────────────────────────────────
  private activeCat:       BlockCategory = 'nature';
  private selectedBlockId  = 'grass';
  private activeLayer:     0 | 1 | 2     = 1;
  private currentTool      = 'place';
  private playerCount      = 1;

  // ── palette objects ────────────────────────────────────────────────────────
  private panelBg!:        Phaser.GameObjects.Rectangle;
  private catTabBgs:       Phaser.GameObjects.Rectangle[] = [];
  private catTabLabels:    Phaser.GameObjects.Text[]      = [];
  private blockRows:       Array<{
    bg:    Phaser.GameObjects.Rectangle;
    icon:  Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  }> = [];
  private layerBtns:       Array<{ bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private toolBtns:        Array<{ bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private paletteHeaderLbl!: Phaser.GameObjects.Text;
  private layerHeaderLbl!:   Phaser.GameObjects.Text;
  private toolHeaderLbl!:    Phaser.GameObjects.Text;

  // ── minimap ────────────────────────────────────────────────────────────────
  private minimapBg!:  Phaser.GameObjects.Rectangle;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapDirty  = true;
  private minimapFrames = 0;

  // ── world info ─────────────────────────────────────────────────────────────
  private infoBg!:  Phaser.GameObjects.Rectangle;
  private infoGfx!: Phaser.GameObjects.Text;

  // ── toasts ─────────────────────────────────────────────────────────────────
  private toasts: Toast[] = [];

  // ── bus cleanup ────────────────────────────────────────────────────────────
  private busUnsubs: Array<() => void> = [];

  // ── minimap block-color cache ──────────────────────────────────────────────
  private readonly blockColorCache = new Map<string, number>();

  // ───────────────────────────────────────────────────────────────────────────

  public constructor() {
    super('CreativeHUDScene');
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  public create(): void {
    this.buildPalettePanel();
    this.buildMinimap();
    this.buildInfoPanel();
    this.setupBusListeners();
    // Sync initial state to game scene
    gameBus.emit('voidcraft:selected-block-change', { blockId: this.selectedBlockId });
    gameBus.emit('voidcraft:layer-change',   { layer: this.activeLayer });
    gameBus.emit('voidcraft:tool-change',    { tool: this.currentTool });
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  public override update(): void {
    this.repositionDynamic();
    this.minimapFrames++;
    if (this.minimapDirty || this.minimapFrames % 30 === 0) {
      this.drawMinimap();
      this.minimapDirty = false;
    }
    this.updateInfoText();
  }

  // ── palette panel ──────────────────────────────────────────────────────────

  private buildPalettePanel(): void {
    const H = this.scale.height;

    this.panelBg = this.add.rectangle(0, 0, PANEL_W, H, PANEL_BG, PANEL_ALPHA)
      .setOrigin(0, 0).setDepth(200).setScrollFactor(0);

    this.paletteHeaderLbl = this.add.text(PANEL_W / 2, 8, 'PALETTE', {
      fontFamily: 'monospace', fontSize: '10px', color: C_TEXT_DIM,
    }).setOrigin(0.5, 0).setDepth(201).setScrollFactor(0);

    // Category tabs — one letter per tab
    const tabW = PANEL_W / ALL_CATEGORIES.length;
    for (let i = 0; i < ALL_CATEGORIES.length; i++) {
      const cat  = ALL_CATEGORIES[i]!;
      const tabX = i * tabW;
      const tabY = 24;

      const bg = this.add.rectangle(tabX, tabY, tabW, TAB_H, C_LAYER_0, 1)
        .setOrigin(0, 0).setDepth(201).setScrollFactor(0);

      const lbl = this.add.text(tabX + tabW / 2, tabY + TAB_H / 2,
        cat.charAt(0).toUpperCase(), {
          fontFamily: 'monospace', fontSize: '10px',
          color: cat === this.activeCat ? C_TEXT_BRIGHT : C_TEXT_DIM,
        }).setOrigin(0.5, 0.5).setDepth(202).setScrollFactor(0);

      bg.setInteractive();
      const capturedCat: BlockCategory = cat;
      bg.on('pointerdown', () => this.selectCategory(capturedCat));
      bg.on('pointerover', () => { if (capturedCat !== this.activeCat) bg.setFillStyle(0x1a2a3a); });
      bg.on('pointerout',  () => this.refreshTabVisuals());

      this.catTabBgs.push(bg);
      this.catTabLabels.push(lbl);
    }

    this.buildBlockList();
    this.buildLayerButtons();
    this.buildToolButtons();
    this.refreshTabVisuals();
  }

  private selectCategory(cat: BlockCategory): void {
    this.activeCat = cat;
    this.refreshTabVisuals();
    this.buildBlockList();
  }

  private refreshTabVisuals(): void {
    for (let i = 0; i < ALL_CATEGORIES.length; i++) {
      const cat = ALL_CATEGORIES[i];
      const bg  = this.catTabBgs[i];
      const lbl = this.catTabLabels[i];
      if (!cat || !bg || !lbl) continue;
      const active = cat === this.activeCat;
      bg.setFillStyle(active ? C_ACTIVE_TAB : C_LAYER_0, 1);
      lbl.setColor(active ? C_TEXT_BRIGHT : C_TEXT_DIM);
    }
  }

  /** Destroy existing block rows and rebuild for the current category. */
  private buildBlockList(): void {
    for (const row of this.blockRows) {
      row.bg.destroy();
      row.icon.destroy();
      row.label.destroy();
    }
    this.blockRows = [];

    const blocks = blocksByCategory.get(this.activeCat) ?? [];
    const listY  = 24 + TAB_H + 6;

    for (let i = 0; i < blocks.length; i++) {
      const block      = blocks[i]!;
      const rowY       = listY + i * BLOCK_H;
      const isSelected = block.id === this.selectedBlockId;

      const bg = this.add.rectangle(0, rowY, PANEL_W, BLOCK_H,
        isSelected ? 0x1a3550 : 0x08101a, 1)
        .setOrigin(0, 0).setDepth(201).setScrollFactor(0);
      if (isSelected) bg.setStrokeStyle(1, C_SELECTION, 1);

      const icon = this.add.rectangle(
        8 + BLOCK_ICON_SZ / 2,
        rowY + BLOCK_H / 2,
        BLOCK_ICON_SZ, BLOCK_ICON_SZ,
        block.color, 1,
      ).setDepth(202).setScrollFactor(0);
      icon.setStrokeStyle(1, block.stroke);

      const lbl = this.add.text(
        8 + BLOCK_ICON_SZ + 8,
        rowY + BLOCK_H / 2,
        block.label,
        { fontFamily: 'monospace', fontSize: '11px', color: isSelected ? C_TEXT_BRIGHT : C_TEXT_WHITE },
      ).setOrigin(0, 0.5).setDepth(202).setScrollFactor(0);

      bg.setInteractive();
      const capturedBlock: BlockDef = block;
      bg.on('pointerdown', () => this.emitSelectBlock(capturedBlock.id));
      bg.on('pointerover', () => { if (capturedBlock.id !== this.selectedBlockId) bg.setFillStyle(0x102030); });
      bg.on('pointerout',  () => { if (capturedBlock.id !== this.selectedBlockId) bg.setFillStyle(0x08101a); });

      this.blockRows.push({ bg, icon, label: lbl });
    }
  }

  private emitSelectBlock(id: string): void {
    this.selectedBlockId = id;
    gameBus.emit('voidcraft:select-block', { blockId: id });
    this.buildBlockList();
  }

  // ── layer buttons ──────────────────────────────────────────────────────────

  private buildLayerButtons(): void {
    const labels: string[]   = ['BG', 'TR', 'FG'];
    const layers: (0|1|2)[]  = [0, 1, 2];
    const H                  = this.scale.height;
    const btmReserve         = LAYER_BTN_H + TOOL_BTN_H + 30;
    const startY             = H - btmReserve;
    const btnW               = Math.floor(PANEL_W / 3);

    this.layerHeaderLbl = this.add.text(PANEL_W / 2, startY - 14, 'LAYER', {
      fontFamily: 'monospace', fontSize: '10px', color: C_TEXT_DIM,
    }).setOrigin(0.5, 0).setDepth(201).setScrollFactor(0);

    for (let i = 0; i < 3; i++) {
      const layer = layers[i]!;
      const x     = i * btnW;
      const bg    = this.add.rectangle(x, startY, btnW, LAYER_BTN_H,
        layer === this.activeLayer ? C_LAYER_2 : C_LAYER_0, 1)
        .setOrigin(0, 0).setDepth(201).setScrollFactor(0);
      const lbl   = this.add.text(x + btnW / 2, startY + LAYER_BTN_H / 2, labels[i]!, {
        fontFamily: 'monospace', fontSize: '11px',
        color: layer === this.activeLayer ? C_TEXT_BRIGHT : C_TEXT_DIM,
      }).setOrigin(0.5, 0.5).setDepth(202).setScrollFactor(0);

      bg.setInteractive();
      const capturedLayer: 0|1|2 = layer;
      bg.on('pointerdown', () => gameBus.emit('voidcraft:select-layer', { layer: capturedLayer }));

      this.layerBtns.push({ bg, label: lbl });
    }
  }

  private refreshLayerButtons(): void {
    const layers: (0|1|2)[] = [0, 1, 2];
    for (let i = 0; i < this.layerBtns.length; i++) {
      const btn = this.layerBtns[i];
      if (!btn) continue;
      const active = layers[i] === this.activeLayer;
      btn.bg.setFillStyle(active ? C_LAYER_2 : C_LAYER_0);
      btn.label.setColor(active ? C_TEXT_BRIGHT : C_TEXT_DIM);
    }
  }

  // ── tool buttons ───────────────────────────────────────────────────────────

  private buildToolButtons(): void {
    const toolIds:    string[] = ['place', 'erase', 'fill', 'eyedropper'];
    const toolLabels: string[] = ['Plc', 'Era', 'Fil', 'Eye'];
    const H                    = this.scale.height;
    const startY               = H - TOOL_BTN_H - 6;
    const btnW                 = Math.floor(PANEL_W / 4);

    this.toolHeaderLbl = this.add.text(PANEL_W / 2, startY - 14, 'TOOL', {
      fontFamily: 'monospace', fontSize: '10px', color: C_TEXT_DIM,
    }).setOrigin(0.5, 0).setDepth(201).setScrollFactor(0);

    for (let i = 0; i < 4; i++) {
      const tool = toolIds[i]!;
      const x    = i * btnW;
      const bg   = this.add.rectangle(x, startY, btnW, TOOL_BTN_H,
        tool === this.currentTool ? C_TOOL_ACTIVE : C_LAYER_0, 1)
        .setOrigin(0, 0).setDepth(201).setScrollFactor(0);
      const lbl  = this.add.text(x + btnW / 2, startY + TOOL_BTN_H / 2, toolLabels[i]!, {
        fontFamily: 'monospace', fontSize: '10px',
        color: tool === this.currentTool ? C_TEXT_BRIGHT : C_TEXT_DIM,
      }).setOrigin(0.5, 0.5).setDepth(202).setScrollFactor(0);

      bg.setInteractive();
      const capturedTool = tool;
      bg.on('pointerdown', () => gameBus.emit('voidcraft:select-tool', { tool: capturedTool }));

      this.toolBtns.push({ bg, label: lbl });
    }
  }

  private refreshToolButtons(): void {
    const toolIds: string[] = ['place', 'erase', 'fill', 'eyedropper'];
    for (let i = 0; i < this.toolBtns.length; i++) {
      const btn = this.toolBtns[i];
      if (!btn) continue;
      const active = toolIds[i] === this.currentTool;
      btn.bg.setFillStyle(active ? C_TOOL_ACTIVE : C_LAYER_0);
      btn.label.setColor(active ? C_TEXT_BRIGHT : C_TEXT_DIM);
    }
  }

  // ── dynamic repositioning on window resize ─────────────────────────────────

  /**
   * Called every frame to reflow elements that pin to canvas edges so the HUD
   * adapts to window resizes without a full rebuild.
   */
  private repositionDynamic(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Palette panel height
    this.panelBg.setSize(PANEL_W, H);

    // Layer / tool buttons: pin to bottom of panel
    const btmReserve  = LAYER_BTN_H + TOOL_BTN_H + 30;
    const layerStartY = H - btmReserve;
    const toolStartY  = H - TOOL_BTN_H - 6;
    const btnW3       = Math.floor(PANEL_W / 3);
    const btnW4       = Math.floor(PANEL_W / 4);

    this.layerHeaderLbl.setPosition(PANEL_W / 2, layerStartY - 14);
    for (let i = 0; i < this.layerBtns.length; i++) {
      const btn = this.layerBtns[i];
      if (!btn) continue;
      btn.bg.setPosition(i * btnW3, layerStartY)
             .setSize(btnW3, LAYER_BTN_H);
      btn.label.setPosition(i * btnW3 + btnW3 / 2, layerStartY + LAYER_BTN_H / 2);
    }

    this.toolHeaderLbl.setPosition(PANEL_W / 2, toolStartY - 14);
    for (let i = 0; i < this.toolBtns.length; i++) {
      const btn = this.toolBtns[i];
      if (!btn) continue;
      btn.bg.setPosition(i * btnW4, toolStartY)
             .setSize(btnW4, TOOL_BTN_H);
      btn.label.setPosition(i * btnW4 + btnW4 / 2, toolStartY + TOOL_BTN_H / 2);
    }

    // Minimap: top-right
    const mmX = W - MINIMAP_SZ - MINIMAP_M;
    const mmY = MINIMAP_M;
    this.minimapBg.setPosition(mmX - 2, mmY - 2);
    this.minimapGfx.setPosition(mmX, mmY);

    // Info panel: bottom-right
    const infoX = W - INFO_W - MINIMAP_M;
    const infoY = H - INFO_H - MINIMAP_M;
    this.infoBg.setPosition(infoX, infoY);
    this.infoGfx.setPosition(infoX + 8, infoY + 8);
  }

  // ── minimap ────────────────────────────────────────────────────────────────

  private buildMinimap(): void {
    const W   = this.scale.width;
    const mmX = W - MINIMAP_SZ - MINIMAP_M;
    const mmY = MINIMAP_M;

    this.minimapBg = this.add.rectangle(
      mmX - 2, mmY - 2,
      MINIMAP_SZ + 4, MINIMAP_SZ + 4,
      0x000000, 0.85,
    ).setOrigin(0, 0).setDepth(200).setScrollFactor(0);
    this.minimapBg.setStrokeStyle(1, C_BORDER, 0.5);

    this.minimapGfx = this.add.graphics()
      .setDepth(201).setScrollFactor(0);

    // Click on minimap → tell CreativeScene to jump its camera
    this.minimapBg.setInteractive();
    this.minimapBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const relX = ptr.x - (this.minimapBg.x + 2);
      const relY = ptr.y - (this.minimapBg.y + 2);
      const tileScale = WORLD_W / MINIMAP_SZ;
      gameBus.emit('voidcraft:minimap-click', {
        worldX: relX * tileScale * 32,
        worldY: relY * tileScale * 32,
      });
    });
  }

  private drawMinimap(): void {
    const gfx = this.minimapGfx;
    gfx.clear();

    const cs    = this.scene.get('CreativeScene') as CreativeScene;
    const world = cs.world;
    if (!world) return;

    const scale = MINIMAP_SZ / WORLD_W; // ~1.2 px per tile for a 100-wide world
    const sz    = Math.max(1, Math.ceil(scale));

    // Draw all layers bottom→top so foreground paints over background
    for (let layer = 0; layer < 3; layer++) {
      for (let ty = 0; ty < WORLD_H; ty++) {
        for (let tx = 0; tx < WORLD_W; tx++) {
          const id = world.getTile(tx, ty, layer as 0|1|2);
          if (id === '') continue;
          gfx.fillStyle(this.blockColor(id), 1);
          gfx.fillRect(Math.floor(tx * scale), Math.floor(ty * scale), sz, sz);
        }
      }
    }

    // Camera viewport rect overlay
    const cam = cs.getCameraInfo();
    const vx  = Math.floor((cam.scrollX / 32) * scale);
    const vy  = Math.floor((cam.scrollY / 32) * scale);
    const vw  = Math.ceil((cam.width  / cam.zoom / 32) * scale);
    const vh  = Math.ceil((cam.height / cam.zoom / 32) * scale);
    gfx.lineStyle(1, 0xffffff, 0.75);
    gfx.strokeRect(vx, vy, vw, vh);
  }

  /** Cache block colors to avoid repeated map lookups in the minimap hot loop. */
  private blockColor(id: string): number {
    let c = this.blockColorCache.get(id);
    if (c !== undefined) return c;
    const block = getBlock(id);
    c = block?.color ?? 0x444444;
    this.blockColorCache.set(id, c);
    return c;
  }

  // ── info panel ─────────────────────────────────────────────────────────────

  private buildInfoPanel(): void {
    const W     = this.scale.width;
    const H     = this.scale.height;
    const infoX = W - INFO_W - MINIMAP_M;
    const infoY = H - INFO_H - MINIMAP_M;

    this.infoBg = this.add.rectangle(infoX, infoY, INFO_W, INFO_H, PANEL_BG, PANEL_ALPHA)
      .setOrigin(0, 0).setDepth(200).setScrollFactor(0);
    this.infoBg.setStrokeStyle(1, C_BORDER, 0.3);

    this.infoGfx = this.add.text(infoX + 8, infoY + 8, '', {
      fontFamily: 'monospace', fontSize: '11px', color: C_TEXT_WHITE, lineSpacing: 4,
    }).setDepth(201).setScrollFactor(0);
  }

  private updateInfoText(): void {
    const cs          = this.scene.get('CreativeScene') as CreativeScene;
    const hovered     = cs.getHoveredTile();
    const layerNames  = ['BG', 'TR', 'FG'];
    this.infoGfx.setText([
      `Tile  X:${hovered.x}  Y:${hovered.y}`,
      `Layer ${layerNames[this.activeLayer] ?? '?'}   Tool: ${this.currentTool}`,
      `Block ${this.selectedBlockId}`,
      `Players: ${this.playerCount}`,
    ]);
  }

  // ── toast notifications ────────────────────────────────────────────────────

  private showToast(message: string, color = '#78ffd6'): void {
    if (this.toasts.length >= TOAST_MAX) {
      const oldest = this.toasts.shift();
      if (oldest) this.destroyToast(oldest);
    }

    const W      = this.scale.width;
    const toastW = 220;
    const toastH = 32;
    const idx    = this.toasts.length;
    const x      = W / 2 - toastW / 2;
    const y      = 14 + idx * (toastH + 6);

    const bg = this.add.rectangle(x, y, toastW, toastH, 0x0a1a10, 0.92)
      .setOrigin(0, 0).setDepth(300).setScrollFactor(0);
    bg.setStrokeStyle(1, 0x78ffd6, 0.7);
    bg.setAlpha(0);

    const lbl = this.add.text(x + toastW / 2, y + toastH / 2, message, {
      fontFamily: 'monospace', fontSize: '12px', color,
    }).setOrigin(0.5, 0.5).setDepth(301).setScrollFactor(0);
    lbl.setAlpha(0);

    const tween = this.tweens.add({
      targets: [bg, lbl], alpha: { from: 0, to: 1 },
      duration: 200, ease: 'Quad.easeOut',
    });

    const toast: Toast = { bg, label: lbl, tween, timer: null };
    toast.timer = this.time.delayedCall(TOAST_DURATION, () => this.fadeOutToast(toast));
    this.toasts.push(toast);
  }

  private fadeOutToast(toast: Toast): void {
    if (toast.tween) toast.tween.stop();
    toast.tween = this.tweens.add({
      targets: [toast.bg, toast.label],
      alpha: 0, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroyToast(toast);
        this.toasts = this.toasts.filter(t => t !== toast);
        this.repositionToasts();
      },
    });
  }

  private destroyToast(toast: Toast): void {
    if (toast.tween) toast.tween.stop();
    if (toast.timer) toast.timer.destroy();
    toast.bg.destroy();
    toast.label.destroy();
  }

  private repositionToasts(): void {
    const W      = this.scale.width;
    const toastW = 220;
    const toastH = 32;
    for (let i = 0; i < this.toasts.length; i++) {
      const t = this.toasts[i];
      if (!t) continue;
      const tx = W / 2 - toastW / 2;
      const ty = 14 + i * (toastH + 6);
      this.tweens.add({
        targets: [t.bg, t.label],
        x: tx, y: ty,
        duration: 150, ease: 'Quad.easeOut',
      });
    }
  }

  // ── gameBus listeners ──────────────────────────────────────────────────────

  private setupBusListeners(): void {
    this.busUnsubs.push(
      gameBus.on('voidcraft:selected-block-change', ({ blockId }) => {
        this.selectedBlockId = blockId;
        // Switch tab to the category that contains this block
        for (const [cat, blocks] of blocksByCategory) {
          if (blocks.some(b => b.id === blockId)) {
            if (cat !== this.activeCat) {
              this.activeCat = cat;
              this.refreshTabVisuals();
            }
            break;
          }
        }
        this.buildBlockList();
      }),
      gameBus.on('voidcraft:layer-change', ({ layer }) => {
        this.activeLayer = layer;
        this.refreshLayerButtons();
      }),
      gameBus.on('voidcraft:tool-change', ({ tool }) => {
        this.currentTool = tool;
        this.refreshToolButtons();
      }),
      gameBus.on('voidcraft:world-saved', () => {
        this.showToast('✓ Saved!', '#78ffd6');
        this.minimapDirty = true;
      }),
      gameBus.on('voidcraft:world-loaded', () => {
        this.showToast('✓ Loaded!', '#ffe066');
        this.minimapDirty = true;
      }),
      gameBus.on('voidcraft:tile-placed', () => {
        this.minimapDirty = true;
      }),
    );
  }

  // ── shutdown ───────────────────────────────────────────────────────────────

  private onShutdown(): void {
    for (const unsub of this.busUnsubs) unsub();
    this.busUnsubs = [];
    for (const t of this.toasts) this.destroyToast(t);
    this.toasts = [];
  }
}
