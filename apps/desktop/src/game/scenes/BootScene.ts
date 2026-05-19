import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("BootScene");
  }

  public create() {
    this.scene.start("PreloadScene");
  }
}
