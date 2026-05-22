import Phaser from "phaser";

const PANEL_BG = 0x05070b;
const CYAN = 0x9be7ff;
const SUCCESS_COL = "#45f5c8";
const ERROR_COL = "#ff4444";
const WARNING_COL = "#f1c84b";
const INFO_COL = "#9be7ff";
const BODY_COL = "#c8e8f0";
const TITLE_COL = "#9be7ff";

const TOAST_COLORS: Record<string, string> = {
  info: INFO_COL,
  success: SUCCESS_COL,
  error: ERROR_COL,
  warning: WARNING_COL,
};

export class UISystem {
  private scene: Phaser.Scene;
  /** Active toast containers, bottom-most first */
  private toasts: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ── Button ────────────────────────────────────────────────────────────────

  createButton(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color: number;
    textColor: string;
    onClick: () => void;
    onHover?: () => void;
    fontSize?: number;
    icon?: string;
  }): Phaser.GameObjects.Container {
    const { x, y, width, height, label, color, textColor, onClick, onHover, fontSize = 16, icon } = config;
    const s = this.scene;

    const bg = s.add.rectangle(0, 0, width, height, color, 0.95).setStrokeStyle(2, CYAN, 0.6);

    const displayLabel = icon ? `${icon}  ${label}` : label;
    const txt = s.add.text(0, 0, displayLabel, {
      fontFamily: "monospace",
      fontSize: `${fontSize}px`,
      color: textColor,
    }).setOrigin(0.5);

    const container = s.add.container(x, y, [bg, txt])
      .setScrollFactor(0)
      .setDepth(1001);

    bg.setInteractive({ useHandCursor: true });

    bg.on("pointerover", () => {
      s.tweens.add({ targets: bg, scaleX: 1.02, scaleY: 1.02, duration: 80, ease: "Sine.easeOut" });
      bg.setStrokeStyle(2, CYAN, 1.0);
      txt.setScale(1.04);
      onHover?.();
    });
    bg.on("pointerout", () => {
      s.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 80 });
      bg.setStrokeStyle(2, CYAN, 0.6);
      txt.setScale(1);
    });
    bg.on("pointerdown", () => {
      s.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true });
      onClick();
    });

    return container;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  showModal(config: {
    title: string;
    message: string;
    buttons: Array<{ label: string; color: number; action: () => void }>;
    width?: number;
    height?: number;
  }): Phaser.GameObjects.Container {
    const s = this.scene;
    const w = config.width ?? 420;
    const h = config.height ?? 220 + config.buttons.length * 12;
    const cx = s.scale.width / 2;
    const cy = s.scale.height / 2;

    const blocker = s.add.rectangle(cx, cy, s.scale.width, s.scale.height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(1998).setInteractive();

    const bg = s.add.rectangle(0, 0, w, h, PANEL_BG, 0.97).setStrokeStyle(2, CYAN, 0.8);

    const titleTxt = s.add.text(0, -h / 2 + 28, config.title, {
      fontFamily: "monospace", fontSize: "20px", color: TITLE_COL,
    }).setOrigin(0.5);

    const msgTxt = s.add.text(0, -h / 2 + 72, config.message, {
      fontFamily: "monospace", fontSize: "13px", color: BODY_COL,
      wordWrap: { width: w - 48 }, align: "center",
    }).setOrigin(0.5, 0);

    const btnContainers: Phaser.GameObjects.Container[] = [];
    const btnY = h / 2 - 44;
    const totalW = config.buttons.length * 130 + (config.buttons.length - 1) * 12;
    config.buttons.forEach((btn, i) => {
      const bx = -totalW / 2 + i * 142 + 65;
      const bBg = s.add.rectangle(bx, btnY, 130, 36, btn.color, 0.9).setStrokeStyle(1, CYAN, 0.5);
      const bTxt = s.add.text(bx, btnY, btn.label, {
        fontFamily: "monospace", fontSize: "14px", color: TITLE_COL,
      }).setOrigin(0.5);
      bBg.setInteractive({ useHandCursor: true });
      bBg.on("pointerover", () => { bBg.setStrokeStyle(1, CYAN, 1); bTxt.setScale(1.05); });
      bBg.on("pointerout", () => { bBg.setStrokeStyle(1, CYAN, 0.5); bTxt.setScale(1); });
      bBg.on("pointerdown", () => {
        cont.destroy();
        blocker.destroy();
        btn.action();
      });
      btnContainers.push(s.add.container(0, 0, [bBg, bTxt]));
    });

    const cont = s.add.container(cx, cy, [bg, titleTxt, msgTxt, ...btnContainers.flatMap(c => c.list as Phaser.GameObjects.GameObject[])])
      .setScrollFactor(0).setDepth(1999).setAlpha(0);

    s.tweens.add({ targets: cont, alpha: 1, y: cy, duration: 200, ease: "Back.easeOut" });

    return cont;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  showToast(message: string, type: "info" | "success" | "error" | "warning"): void {
    const s = this.scene;
    const color = TOAST_COLORS[type] ?? INFO_COL;
    const borderColor = type === "success" ? 0x45f5c8
      : type === "error" ? 0xff4444
      : type === "warning" ? 0xf1c84b
      : 0x9be7ff;

    const w = Math.max(280, message.length * 7 + 48);
    const startY = s.scale.height + 28;
    const baseX = s.scale.width / 2;

    const bg = s.add.rectangle(0, 0, w, 38, PANEL_BG, 0.96).setStrokeStyle(1, borderColor, 0.85);
    const txt = s.add.text(0, 0, message, {
      fontFamily: "monospace", fontSize: "12px", color,
    }).setOrigin(0.5);

    const toast = s.add.container(baseX, startY, [bg, txt])
      .setScrollFactor(0).setDepth(1200);

    this.toasts.push(toast);
    this._repositionToasts();

    s.tweens.add({
      targets: toast,
      y: this._toastTargetY(this.toasts.length - 1),
      duration: 280,
      ease: "Back.easeOut",
    });

    s.time.delayedCall(3000, () => {
      s.tweens.add({
        targets: toast,
        alpha: 0,
        y: toast.y + 16,
        duration: 300,
        onComplete: () => {
          const idx = this.toasts.indexOf(toast);
          if (idx !== -1) this.toasts.splice(idx, 1);
          toast.destroy();
          this._repositionToasts();
        },
      });
    });
  }

  private _toastTargetY(index: number): number {
    return this.scene.scale.height - 32 - index * 48;
  }

  private _repositionToasts() {
    this.toasts.forEach((t, i) => {
      this.scene.tweens.add({ targets: t, y: this._toastTargetY(i), duration: 200, ease: "Sine.easeOut" });
    });
  }

  // ── Progress bar ──────────────────────────────────────────────────────────

  createProgressBar(
    x: number, y: number, width: number, height: number, color: number
  ): { container: Phaser.GameObjects.Container; setValue(v: number): void; setLabel(s: string): void } {
    const s = this.scene;
    const bg = s.add.rectangle(0, 0, width, height, PANEL_BG, 0.95).setStrokeStyle(1, CYAN, 0.6);
    const fill = s.add.rectangle(-width / 2, 0, 0, height - 4, color, 1).setOrigin(0, 0.5);
    const label = s.add.text(0, 0, "", {
      fontFamily: "monospace", fontSize: "10px", color: BODY_COL,
    }).setOrigin(0.5);

    const container = s.add.container(x, y, [bg, fill, label])
      .setScrollFactor(0).setDepth(1002);

    return {
      container,
      setValue(v: number) {
        const clamped = Phaser.Math.Clamp(v, 0, 1);
        s.tweens.add({ targets: fill, width: (width - 4) * clamped, duration: 150, ease: "Sine.easeOut" });
      },
      setLabel(text: string) { label.setText(text); },
    };
  }

  // ── Achievement ───────────────────────────────────────────────────────────

  showAchievement(name: string, description: string, _icon: string): void {
    const s = this.scene;
    const panelW = 300;
    const panelH = 72;
    const startX = s.scale.width + panelW;
    const targetX = s.scale.width - panelW / 2 - 16;
    const y = 60;

    const bg = s.add.rectangle(0, 0, panelW, panelH, PANEL_BG, 0.97).setStrokeStyle(2, 0xffd700, 0.9);
    const header = s.add.text(0, -panelH / 2 + 14, "🏆 ACHIEVEMENT UNLOCKED", {
      fontFamily: "monospace", fontSize: "9px", color: "#ffd700",
    }).setOrigin(0.5);
    const nameTxt = s.add.text(0, -4, name, {
      fontFamily: "monospace", fontSize: "14px", color: "#ffd700",
    }).setOrigin(0.5);
    const descTxt = s.add.text(0, 16, description, {
      fontFamily: "monospace", fontSize: "10px", color: BODY_COL,
    }).setOrigin(0.5);

    const panel = s.add.container(startX, y, [bg, header, nameTxt, descTxt])
      .setScrollFactor(0).setDepth(1300);

    s.tweens.add({ targets: panel, x: targetX, duration: 400, ease: "Back.easeOut" });
    s.time.delayedCall(4000, () => {
      s.tweens.add({
        targets: panel,
        x: startX,
        duration: 350,
        ease: "Back.easeIn",
        onComplete: () => panel.destroy(),
      });
    });
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────

  showConfirm(message: string, onYes: () => void, onNo?: () => void): void {
    this.showModal({
      title: "Confirm",
      message,
      buttons: [
        { label: "Yes", color: 0x1a3d1a, action: onYes },
        { label: "No", color: 0x3d1a1a, action: onNo ?? (() => { /* noop */ }) },
      ],
    });
  }

  // ── Fade transitions ──────────────────────────────────────────────────────

  fadeOut(duration: number, onComplete?: () => void): void {
    const s = this.scene;
    const overlay = s.add.rectangle(
      s.scale.width / 2, s.scale.height / 2,
      s.scale.width, s.scale.height,
      0x000000, 0
    ).setScrollFactor(0).setDepth(2000);

    s.tweens.add({
      targets: overlay,
      alpha: 1,
      duration,
      onComplete: () => {
        onComplete?.();
        // Keep the overlay up until fadeIn is called or scene changes
      },
    });
  }

  fadeIn(duration: number, onComplete?: () => void): void {
    const s = this.scene;
    const overlay = s.add.rectangle(
      s.scale.width / 2, s.scale.height / 2,
      s.scale.width, s.scale.height,
      0x000000, 1
    ).setScrollFactor(0).setDepth(2000);

    s.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      onComplete: () => {
        overlay.destroy();
        onComplete?.();
      },
    });
  }

  // ── Floating text ─────────────────────────────────────────────────────────

  spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const s = this.scene;
    const txt = s.add.text(x, y, text, {
      fontFamily: "monospace", fontSize: "16px", color,
    }).setOrigin(0.5).setDepth(1100);

    s.tweens.add({
      targets: txt,
      y: y - 48,
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => txt.destroy(),
    });
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  createTooltip(target: Phaser.GameObjects.GameObject, text: string): void {
    const s = this.scene;
    let tooltip: Phaser.GameObjects.Container | null = null;

    const go = target as Phaser.GameObjects.Rectangle;

    go.on("pointerover", (ptr: Phaser.Input.Pointer) => {
      const bg = s.add.rectangle(0, 0, text.length * 7 + 20, 26, PANEL_BG, 0.95)
        .setStrokeStyle(1, CYAN, 0.6);
      const txt = s.add.text(0, 0, text, {
        fontFamily: "monospace", fontSize: "11px", color: BODY_COL,
      }).setOrigin(0.5);
      tooltip = s.add.container(ptr.x + 12, ptr.y - 20, [bg, txt])
        .setScrollFactor(0).setDepth(2100);
    });

    go.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (tooltip) tooltip.setPosition(ptr.x + 12, ptr.y - 20);
    });

    go.on("pointerout", () => {
      tooltip?.destroy();
      tooltip = null;
    });
  }
}
