import Phaser from "phaser";

export class MainMenuScene extends Phaser.Scene {
  public constructor() {
    super("MainMenuScene");
  }

  public create() {
    this.add.text(40, 40, "Lumorix: Null District", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#9be7ff"
    });
  }
}
