import Phaser from "phaser";
import { UISystem } from "../systems/UISystem";

const PANEL_BG = 0x05070b;
const CYAN = 0x9be7ff;
const CYAN_STR = "#9be7ff";
const BODY_STR = "#c8e8f0";
const DIM_STR = "#334155";

interface SliderConfig {
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  value: number;
  label: string;
  onChange: (v: number) => void;
}

export class PauseMenuScene extends Phaser.Scene {
  private ui!: UISystem;
  private settingsPanel!: Phaser.GameObjects.Container;
  private controlsPanel!: Phaser.GameObjects.Container;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("PauseMenuScene");
  }

  create() {
    this.ui = new UISystem(this);
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // ── Blurred overlay ──────────────────────────────────────────────────
    const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.72)
      .setScrollFactor(0).setDepth(1000);
    void overlay;

    // Subtle scanline effect
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(1001);
    gfx.lineStyle(1, 0x000000, 0.07);
    for (let y = 0; y < h; y += 4) gfx.lineBetween(0, y, w, y);

    // ── Central panel ────────────────────────────────────────────────────
    const panelW = 340;
    const panelH = 440;
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PANEL_BG, 0.98)
      .setStrokeStyle(2, CYAN, 0.75).setScrollFactor(0).setDepth(1002);
    void panel;

    // Corner brackets
    this._drawBrackets(cx, cy, panelW, panelH, 1003);

    // ── PAUSED title ─────────────────────────────────────────────────────
    this.add.text(cx, cy - panelH / 2 + 36, "PAUSED", {
      fontFamily: "monospace", fontSize: "28px", color: CYAN_STR,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);

    // Divider
    const divGfx = this.add.graphics().setScrollFactor(0).setDepth(1003);
    divGfx.lineStyle(1, CYAN, 0.3);
    divGfx.lineBetween(cx - 120, cy - panelH / 2 + 60, cx + 120, cy - panelH / 2 + 60);

    // ── Menu buttons ─────────────────────────────────────────────────────
    const btnDefs = [
      { label: "▶  Resume", color: 0x0d2b1e, action: () => this._resume() },
      { label: "⚙  Settings", color: 0x0d1a2b, action: () => this._toggleSettings() },
      { label: "⌨  Controls", color: 0x0d1a2b, action: () => this._toggleControls() },
      { label: "🏠  Main Menu", color: 0x1a1a0d, action: () => this._goMainMenu() },
      { label: "✕  Exit Room", color: 0x1a0d0d, action: () => this._quitToMainMenu() },
    ];

    const startY = cy - panelH / 2 + 96;
    btnDefs.forEach((def, i) => {
      this.ui.createButton({
        x: cx,
        y: startY + i * 58,
        width: 280,
        height: 44,
        label: def.label,
        color: def.color,
        textColor: CYAN_STR,
        fontSize: 15,
        onClick: def.action,
      }).setDepth(1004);
    });

    // ── Settings panel (hidden) ───────────────────────────────────────────
    this.settingsPanel = this._buildSettingsPanel(cx, cy, panelW);
    this.settingsPanel.setVisible(false).setDepth(1010);

    // ── Controls panel (hidden) ───────────────────────────────────────────
    this.controlsPanel = this._buildControlsPanel(cx, cy, panelW);
    this.controlsPanel.setVisible(false).setDepth(1010);

    // ── ESC to close ─────────────────────────────────────────────────────
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.settingsPanel.visible || this.controlsPanel.visible) {
        this.settingsPanel.setVisible(false);
        this.controlsPanel.setVisible(false);
      } else {
        this._resume();
      }
    });

    // Animate in
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 250 });
  }

  // ── Private builders ──────────────────────────────────────────────────────

  private _buildSettingsPanel(cx: number, cy: number, _panelW: number): Phaser.GameObjects.Container {
    const pw = 300;
    const ph = 300;
    const items: Phaser.GameObjects.GameObject[] = [];

    const bg = this.add.rectangle(0, 0, pw, ph, PANEL_BG, 0.99).setStrokeStyle(2, CYAN, 0.8);
    items.push(bg);

    const title = this.add.text(0, -ph / 2 + 22, "SETTINGS", {
      fontFamily: "monospace", fontSize: "16px", color: CYAN_STR,
    }).setOrigin(0.5);
    items.push(title);

    // Master volume slider
    const volSlider = this._makeSlider({
      x: 0, y: -ph / 2 + 72, width: 220, min: 0, max: 100, value: 80,
      label: "Master Volume",
      onChange: (v) => {
        this.registry.set("masterVolume", v);
        this.game.sound.volume = v / 100;
      },
    });
    items.push(...volSlider);

    // Toggles
    const toggleDefs: Array<{ label: string; registryKey: string; defaultOn: boolean; y: number }> = [
      { label: "Show Grid", registryKey: "showGrid", defaultOn: true, y: -ph / 2 + 140 },
      { label: "Show FPS", registryKey: "showFPS", defaultOn: false, y: -ph / 2 + 185 },
      { label: "Particle FX", registryKey: "particles", defaultOn: true, y: -ph / 2 + 230 },
    ];

    for (const td of toggleDefs) {
      const toggle = this._makeToggle(0, td.y, td.label, td.registryKey, td.defaultOn);
      items.push(...toggle);
    }

    const closeBtn = this.add.text(pw / 2 - 24, -ph / 2 + 16, "✕", {
      fontFamily: "monospace", fontSize: "16px", color: "#ff4444",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.settingsPanel.setVisible(false));
    items.push(closeBtn);

    return this.add.container(cx + 360, cy, items).setScrollFactor(0);
  }

  private _buildControlsPanel(cx: number, cy: number, _panelW: number): Phaser.GameObjects.Container {
    const pw = 300;
    const ph = 380;
    const items: Phaser.GameObjects.GameObject[] = [];

    const bg = this.add.rectangle(0, 0, pw, ph, PANEL_BG, 0.99).setStrokeStyle(2, CYAN, 0.8);
    items.push(bg);

    const title = this.add.text(0, -ph / 2 + 22, "CONTROLS", {
      fontFamily: "monospace", fontSize: "16px", color: CYAN_STR,
    }).setOrigin(0.5);
    items.push(title);

    const controls = [
      ["Movement", "WASD / Arrow Keys"],
      ["Jump", "Space / W"],
      ["Interact", "F"],
      ["Hint", "Mouse click on [?]"],
      ["Pause", "ESC"],
      ["Objective Panel", "Bottom left"],
      ["Inventory", "Bottom right"],
    ];

    controls.forEach(([action, key], i) => {
      if (!key) {
        // Section divider
        const div = this.add.text(0, -ph / 2 + 66 + i * 26, action ?? "", {
          fontFamily: "monospace", fontSize: "9px", color: DIM_STR,
        }).setOrigin(0.5);
        items.push(div);
        return;
      }
      const actionTxt = this.add.text(-pw / 2 + 20, -ph / 2 + 66 + i * 26, action ?? "", {
        fontFamily: "monospace", fontSize: "11px", color: BODY_STR,
      }).setOrigin(0, 0.5);
      const keyTxt = this.add.text(pw / 2 - 20, -ph / 2 + 66 + i * 26, key, {
        fontFamily: "monospace", fontSize: "11px", color: CYAN_STR,
      }).setOrigin(1, 0.5);
      items.push(actionTxt, keyTxt);
    });

    const closeBtn = this.add.text(pw / 2 - 24, -ph / 2 + 16, "✕", {
      fontFamily: "monospace", fontSize: "16px", color: "#ff4444",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.controlsPanel.setVisible(false));
    items.push(closeBtn);

    return this.add.container(cx + 360, cy, items).setScrollFactor(0);
  }

  private _makeSlider(cfg: SliderConfig): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    const { x, y, width, min, max, label, onChange } = cfg;
    let value = cfg.value;

    const lbl = this.add.text(x - width / 2, y - 14, `${label}: ${value}`, {
      fontFamily: "monospace", fontSize: "11px", color: BODY_STR,
    }).setOrigin(0, 0.5);
    items.push(lbl);

    const track = this.add.rectangle(x, y, width, 6, 0x1a2d3d, 1).setStrokeStyle(1, CYAN, 0.4);
    const fill = this.add.rectangle(x - width / 2, y, ((value - min) / (max - min)) * width, 6, CYAN, 0.9).setOrigin(0, 0.5);
    const thumb = this.add.rectangle(x - width / 2 + ((value - min) / (max - min)) * width, y, 10, 18, 0xffffff, 0.9)
      .setStrokeStyle(1, CYAN, 1);
    items.push(track, fill, thumb);

    track.setInteractive({ useHandCursor: true, draggable: false });
    track.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      const localX = ptr.x - (this.scale.width / 2 - this.scale.width / 2 + x + this.scale.width / 2 - width / 2);
      const ratio = Phaser.Math.Clamp((ptr.x - (this.scale.width / 2 + x - width / 2)) / width, 0, 1);
      void localX;
      value = Math.round(min + ratio * (max - min));
      fill.width = ratio * width;
      thumb.x = x - width / 2 + ratio * width;
      lbl.setText(`${label}: ${value}`);
      onChange(value);
    });

    return items;
  }

  private _makeToggle(
    x: number, y: number, label: string, registryKey: string, defaultOn: boolean
  ): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    let on = this.registry.get(registryKey) ?? defaultOn;

    const lbl = this.add.text(x - 90, y, label, {
      fontFamily: "monospace", fontSize: "12px", color: BODY_STR,
    }).setOrigin(0, 0.5);

    const box = this.add.rectangle(x + 70, y, 40, 20, on ? 0x0d2b1e : 0x1a0d0d, 0.9)
      .setStrokeStyle(1, CYAN, 0.6).setInteractive({ useHandCursor: true });
    const dot = this.add.rectangle(x + (on ? 82 : 58), y, 14, 14, CYAN, on ? 1 : 0.3);

    box.on("pointerdown", () => {
      on = !on;
      box.setFillStyle(on ? 0x0d2b1e : 0x1a0d0d, 0.9);
      this.tweens.add({ targets: dot, x: x + (on ? 82 : 58), duration: 120 });
      dot.setAlpha(on ? 1 : 0.3);
      this.registry.set(registryKey, on);
    });

    items.push(lbl, box, dot);
    return items;
  }

  private _drawBrackets(cx: number, cy: number, pw: number, ph: number, depth: number) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(depth);
    gfx.lineStyle(2, CYAN, 0.9);
    const bl = 20; // bracket arm length
    const l = cx - pw / 2; const r = cx + pw / 2;
    const t = cy - ph / 2; const b = cy + ph / 2;
    // TL
    gfx.lineBetween(l, t + bl, l, t); gfx.lineBetween(l, t, l + bl, t);
    // TR
    gfx.lineBetween(r - bl, t, r, t); gfx.lineBetween(r, t, r, t + bl);
    // BL
    gfx.lineBetween(l, b - bl, l, b); gfx.lineBetween(l, b, l + bl, b);
    // BR
    gfx.lineBetween(r - bl, b, r, b); gfx.lineBetween(r, b, r, b - bl);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private _resume() {
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 200,
      onComplete: () => this.scene.stop(),
    });
  }

  private _toggleSettings() {
    this.scene.pause();
    this.scene.launch("SettingsScene", { returnTo: "PauseMenuScene" });
  }

  private _toggleControls() {
    const show = !this.controlsPanel.visible;
    this.controlsPanel.setVisible(show);
    this.settingsPanel.setVisible(false);
    if (show) {
      this.tweens.add({
        targets: this.controlsPanel,
        x: this.scale.width / 2 + 200,
        duration: 300,
        ease: "Back.easeOut",
        from: this.scale.width / 2 + 500,
      });
    }
  }

  private _goMainMenu() {
    this.ui.showConfirm(
      "Return to Main Menu?\nUnsaved progress will be lost.",
      () => {
        this.scene.stop();
        this.scene.start("MainMenuScene");
      }
    );
  }

  private _quitToMainMenu() {
    this.scene.stop();
    this.scene.start("MainMenuScene");
  }
}
