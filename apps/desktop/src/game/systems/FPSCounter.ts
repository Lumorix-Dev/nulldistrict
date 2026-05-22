import Phaser from "phaser";

export class FPSCounter {
  private text: Phaser.GameObjects.Text;
  private frameCount = 0;

  constructor(scene: Phaser.Scene, x?: number, y?: number) {
    this.text = scene.add.text(x ?? scene.scale.width - 4, y ?? 4, "FPS: --", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#334155",
    }).setScrollFactor(0).setDepth(9999).setOrigin(1, 0);
  }

  update(scene: Phaser.Scene) {
    this.frameCount++;
    if (this.frameCount % 10 === 0) {
      this.text.setText(`FPS: ${Math.round(scene.game.loop.actualFps)}`);
    }
  }

  setVisible(v: boolean) {
    this.text.setVisible(v);
  }
}
