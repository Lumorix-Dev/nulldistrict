import Phaser from "phaser";

interface TransitionData {
  fromScene: string;
  toScene: string;
  time: number;
}

/** Plays a short 1.5-second animated transition between EscapeRoom levels. */
export class LevelTransitionScene extends Phaser.Scene {
  public constructor() {
    super("LevelTransitionScene");
  }

  public create(data: TransitionData) {
    const { fromScene, toScene, time } = data ?? { fromScene: "", toScene: "PuzzleSelectScene", time: 0 };
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Extract level numbers from scene keys (e.g. EscapeRoom3Scene → 3)
    const fromMatch = /EscapeRoom(\d)Scene/.exec(fromScene);
    const toMatch = /EscapeRoom(\d)Scene/.exec(toScene);
    const fromLevel = fromMatch ? parseInt(fromMatch[1]!) : 0;
    const toLevel = toMatch ? parseInt(toMatch[1]!) : 0;

    // Black background
    this.add.rectangle(cx, cy, w, h, 0x000000).setDepth(0);

    // Animated scan lines drifting downward
    const scanLines: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 14; i++) {
      const line = this.add.rectangle(cx, -30 + i * (h / 10), w, 2, 0x00e5ff, 0.15).setDepth(1);
      scanLines.push(line);
    }
    this.tweens.add({
      targets: scanLines,
      y: `+=${h + 60}`,
      duration: 1400,
      ease: "Linear",
      repeat: -1,
    });

    // "LEVEL N COMPLETE" block
    if (fromLevel > 0) {
      const completeTxt = this.add.text(cx, cy - 72, `LEVEL ${fromLevel} COMPLETE`, {
        fontFamily: "monospace", fontSize: "36px", color: "#45f5c8",
        stroke: "#000000", strokeThickness: 4,
      }).setOrigin(0.5).setDepth(10).setAlpha(0);

      const timeTxt = this.add.text(cx, cy - 24, `Time: ${time.toFixed(1)}s`, {
        fontFamily: "monospace", fontSize: "18px", color: "#9be7ff",
      }).setOrigin(0.5).setDepth(10).setAlpha(0);

      this.tweens.add({ targets: [completeTxt, timeTxt], alpha: 1, duration: 320, ease: "Sine.easeOut" });
    }

    // "ENTERING LEVEL N+1" text — appears after 750 ms
    if (toLevel > 0) {
      const enterTxt = this.add.text(cx, cy + 44, `ENTERING LEVEL ${toLevel}`, {
        fontFamily: "monospace", fontSize: "24px", color: "#ffe066",
      }).setOrigin(0.5).setDepth(10).setAlpha(0);

      this.time.delayedCall(750, () => {
        this.tweens.add({ targets: enterTxt, alpha: 1, duration: 300, ease: "Sine.easeOut" });
      });
    }

    // Transition to next scene after 1.5 s
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0, (_: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) this.scene.start(toScene);
      });
    });
  }
}
