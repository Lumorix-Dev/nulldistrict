import Phaser from "phaser";
import { UISystem } from "../systems/UISystem";
import { audioManager } from "../systems/AudioManager";
import { SaveSystem } from "../systems/SaveSystem";
import { gameBus } from "../EventBus";

const BG_COL = 0x05070b;
const CYAN = 0x00c8ff;
const CYAN_STR = "#00c8ff";
const BODY_STR = "#c8e8f0";
const LABEL_STR = "#7aabb8";
const GREEN = 0x00ff88;
const GREY = 0x555566;

export class SettingsScene extends Phaser.Scene {
  private ui!: UISystem;
  private returnTo = "MainMenuScene";

  constructor() {
    super("SettingsScene");
  }

  init(data: { returnTo?: string }) {
    this.returnTo = data?.returnTo ?? "MainMenuScene";
  }

  create() {
    this.ui = new UISystem(this);
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, h / 2, w, h, BG_COL, 0.97).setScrollFactor(0).setDepth(2000);

    // Subtle grid
    const grid = this.add.graphics().setScrollFactor(0).setDepth(2001);
    grid.lineStyle(1, 0x0d1a2b, 0.8);
    for (let x = 0; x < w; x += 32) grid.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 32) grid.lineBetween(0, y, w, y);

    // Scanlines
    const scan = this.add.graphics().setScrollFactor(0).setDepth(2002);
    scan.lineStyle(1, 0x000000, 0.05);
    for (let y = 0; y < h; y += 3) scan.lineBetween(0, y, w, y);

    // ── Title ───────────────────────────────────────────────────────────────
    const titleY = 48;
    this.add.text(cx, titleY, "SETTINGS", {
      fontFamily: "monospace", fontSize: "32px", color: CYAN_STR,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2003);

    // Divider
    const divGfx = this.add.graphics().setScrollFactor(0).setDepth(2003);
    divGfx.lineStyle(1, CYAN, 0.4);
    divGfx.lineBetween(cx - 300, titleY + 26, cx + 300, titleY + 26);

    // ── Layout constants ─────────────────────────────────────────────────────
    const colY = titleY + 56;
    const leftColX = cx - 300;  // label start for left column
    const sliderCX = cx - 100;  // slider track center for left column
    const rightColX = cx + 20;  // right column start
    const TRACK_W = 160;
    const PANEL_W = 280;

    let leftY = colY;
    let rightY = colY;

    // ── AUDIO section ───────────────────────────────────────────────────────
    leftY = this._sectionHeader("AUDIO", leftColX, leftY, 2003);

    leftY = this._makeSlider({
      label: "Music Volume",
      labelX: leftColX, trackCX: sliderCX, y: leftY,
      trackW: TRACK_W, min: 0, max: 100,
      value: Math.round(audioManager.musicVolume * 100),
      onChange: (v) => audioManager.setMusicVolume(v / 100),
    });

    leftY = this._makeSlider({
      label: "SFX Volume",
      labelX: leftColX, trackCX: sliderCX, y: leftY,
      trackW: TRACK_W, min: 0, max: 100,
      value: Math.round(audioManager.sfxVolume * 100),
      onChange: (v) => audioManager.setSfxVolume(v / 100),
    });

    leftY = this._makeSlider({
      label: "Master Volume",
      labelX: leftColX, trackCX: sliderCX, y: leftY,
      trackW: TRACK_W, min: 0, max: 100,
      value: Math.round(audioManager.masterVolume * 100),
      onChange: (v) => audioManager.setVolume(v / 100),
    });

    leftY = this._makeToggle({
      label: "Mute All",
      labelX: leftColX, valueX: sliderCX + TRACK_W / 2, y: leftY,
      initial: !audioManager.enabled,
      onChange: (v) => audioManager.setMuted(v),
    });

    // ── DISPLAY section ─────────────────────────────────────────────────────
    leftY += 12;
    leftY = this._sectionHeader("DISPLAY", leftColX, leftY, 2003);

    const globalSave = SaveSystem.getGlobal();
    const settings = globalSave.settings;

    leftY = this._makeToggle({
      label: "Show FPS",
      labelX: leftColX, valueX: sliderCX + TRACK_W / 2, y: leftY,
      initial: settings.showFPS,
      onChange: (v) => {
        SaveSystem.updateSetting("showFPS", v);
        gameBus.emit("voidcraft:fps-toggle", { enabled: v });
      },
    });

    leftY = this._makeToggle({
      label: "Pixel Art Mode",
      labelX: leftColX, valueX: sliderCX + TRACK_W / 2, y: leftY,
      initial: settings.pixelArt,
      onChange: (v) => {
        SaveSystem.updateSetting("pixelArt", v);
      },
    });

    leftY = this._makeToggle({
      label: "Particles",
      labelX: leftColX, valueX: sliderCX + TRACK_W / 2, y: leftY,
      initial: settings.particlesEnabled,
      onChange: (v) => {
        SaveSystem.updateSetting("particlesEnabled", v);
      },
    });

    // ── CONTROLS (read-only) ─────────────────────────────────────────────────
    rightY = this._sectionHeader("CONTROLS", rightColX, rightY, 2003);

    const keybindings: [string, string][] = [
      ["WASD / Arrows", "Move"],
      ["Space", "Jump"],
      ["F", "Interact"],
      ["Mouse", "Use UI buttons"],
      ["Hint Button", "Request hint"],
      ["ESC", "Pause menu"],
      ["Objective Panel", "Bottom left"],
    ];

    const KBY_STEP = 20;
    const panelHeight = keybindings.length * KBY_STEP + 28;
    const panelCX = rightColX + PANEL_W / 2;
    const panelCY = rightY + panelHeight / 2 + 4;
    this.add.rectangle(panelCX, panelCY, PANEL_W, panelHeight, 0x0a0e18, 0.9)
      .setStrokeStyle(1, CYAN, 0.25).setScrollFactor(0).setDepth(2003);

    keybindings.forEach(([key, action], i) => {
      const rowY = rightY + 12 + i * KBY_STEP;
      this.add.text(rightColX + 8, rowY, key, {
        fontFamily: "monospace", fontSize: "10px", color: CYAN_STR,
      }).setScrollFactor(0).setDepth(2004);
      this.add.text(rightColX + PANEL_W - 8, rowY, action, {
        fontFamily: "monospace", fontSize: "10px", color: BODY_STR,
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(2004);
    });

    rightY += panelHeight + 16;

    // ── DANGER ZONE ─────────────────────────────────────────────────────────
    rightY = this._sectionHeader("DANGER ZONE", rightColX, rightY, 2003, "#ff4444");

    this.ui.createButton({
      x: panelCX, y: rightY + 10,
      width: PANEL_W, height: 36,
      label: "🗑  Reset Campaign Data",
      color: 0x2b0d0d,
      textColor: "#ff6666",
      fontSize: 13,
      onClick: () => {
        this.ui.showConfirm(
          "Delete all local campaign save data? This cannot be undone.",
          () => {
            const keys = Object.keys(localStorage).filter(k => k.startsWith("voidcraft"));
            keys.forEach(k => localStorage.removeItem(k));
            this.ui.showToast("Save data cleared.", "warning");
          }
        );
      },
    }).setScrollFactor(0).setDepth(2004);

    rightY += 56;

    // ── BACK button ──────────────────────────────────────────────────────────
    const maxBottom = Math.max(leftY, rightY);
    const backY = Math.min(maxBottom + 30, h - 50);

    this.ui.createButton({
      x: cx, y: backY,
      width: 200, height: 44,
      label: "◀  Back",
      color: 0x0d1a2b,
      textColor: CYAN_STR,
      fontSize: 16,
      onClick: () => this._goBack(),
    }).setScrollFactor(0).setDepth(2004);

    // ── ESC key ──────────────────────────────────────────────────────────────
    this.input.keyboard!.on("keydown-ESC", () => this._goBack());

    // Animate in
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 220 });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private _sectionHeader(label: string, x: number, y: number, depth: number, color = CYAN_STR): number {
    this.add.text(x, y, label, {
      fontFamily: "monospace", fontSize: "11px", color,
    }).setScrollFactor(0).setDepth(depth);
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(depth);
    gfx.lineStyle(1, CYAN, 0.2);
    gfx.lineBetween(x, y + 16, x + 280, y + 16);
    return y + 26;
  }

  private _makeSlider(config: {
    label: string;
    labelX: number;
    trackCX: number;
    y: number;
    trackW: number;
    min: number;
    max: number;
    value: number;
    onChange: (v: number) => void;
  }): number {
    const { label, labelX, trackCX, y, trackW, min, max, value, onChange } = config;
    const rowH = 36;
    const trackY = y + rowH / 2;
    const trackH = 4;
    const handleR = 7;

    this.add.text(labelX, trackY, label, {
      fontFamily: "monospace", fontSize: "11px", color: LABEL_STR,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);

    this.add.rectangle(trackCX, trackY, trackW, trackH, 0x1a2a3a, 1)
      .setScrollFactor(0).setDepth(2003);

    const frac = (value - min) / (max - min);
    const fill = this.add.rectangle(
      trackCX - trackW / 2 + (trackW * frac) / 2,
      trackY, trackW * frac, trackH, CYAN, 1
    ).setScrollFactor(0).setDepth(2003).setOrigin(0.5);

    const handle = this.add.arc(
      trackCX - trackW / 2 + trackW * frac,
      trackY, handleR, 0, 360, false, CYAN, 1
    ).setScrollFactor(0).setDepth(2004);

    const valueText = this.add.text(
      trackCX + trackW / 2 + 10, trackY,
      String(Math.round(value)), {
        fontFamily: "monospace", fontSize: "10px", color: BODY_STR,
      }
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);

    const hitZone = this.add.zone(trackCX, trackY, trackW + 20, 28)
      .setScrollFactor(0).setDepth(2005)
      .setInteractive({ draggable: false });

    const applyPointer = (ptr: Phaser.Input.Pointer) => {
      const relX = Phaser.Math.Clamp(ptr.x - (trackCX - trackW / 2), 0, trackW);
      const newFrac = relX / trackW;
      const newValue = min + Math.round(newFrac * (max - min));
      const f = (newValue - min) / (max - min);
      fill.setPosition(trackCX - trackW / 2 + (trackW * f) / 2, trackY);
      fill.width = trackW * f;
      handle.setPosition(trackCX - trackW / 2 + trackW * f, trackY);
      valueText.setText(String(newValue));
      onChange(newValue);
    };

    hitZone.on("pointerdown", applyPointer);
    hitZone.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) applyPointer(ptr);
    });

    return y + rowH;
  }

  private _makeToggle(config: {
    label: string;
    labelX: number;
    valueX: number;
    y: number;
    initial: boolean;
    onChange: (v: boolean) => void;
  }): number {
    const { label, labelX, valueX, y, initial, onChange } = config;
    const rowH = 34;
    const midY = y + rowH / 2;
    const trackW = 36;
    const trackH = 16;

    this.add.text(labelX, midY, label, {
      fontFamily: "monospace", fontSize: "11px", color: LABEL_STR,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2003);

    const track = this.add.rectangle(valueX, midY, trackW, trackH, initial ? GREEN : GREY, 1)
      .setScrollFactor(0).setDepth(2003).setStrokeStyle(1, 0x223344, 0.8);

    const dot = this.add.rectangle(
      valueX + (initial ? trackW / 2 - 8 : -(trackW / 2 - 8)),
      midY, 12, 12, 0xffffff, 1
    ).setScrollFactor(0).setDepth(2004);

    let current = initial;

    const zone = this.add.zone(valueX, midY, trackW + 12, trackH + 12)
      .setScrollFactor(0).setDepth(2005).setInteractive();

    zone.on("pointerdown", () => {
      current = !current;
      track.setFillStyle(current ? GREEN : GREY);
      this.tweens.add({
        targets: dot,
        x: valueX + (current ? trackW / 2 - 8 : -(trackW / 2 - 8)),
        duration: 120,
        ease: "Sine.easeInOut",
      });
      onChange(current);
    });

    zone.on("pointerover", () => track.setAlpha(0.8));
    zone.on("pointerout", () => track.setAlpha(1));

    return y + rowH;
  }

  private _goBack() {
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.scene.stop();
        try {
          this.scene.resume(this.returnTo);
        } catch {
          // returnTo scene may have been stopped — ignore
        }
      },
    });
  }
}
