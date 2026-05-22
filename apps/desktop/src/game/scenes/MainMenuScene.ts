import Phaser from "phaser";

export class MainMenuScene extends Phaser.Scene {
  public constructor() {
    super("MainMenuScene");
  }

  public create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 160, "Lumorix: Null District", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#9be7ff"
    }).setOrigin(0.5);

    this.add.text(cx, cy - 120, "v0.1-beta", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#334155"
    }).setOrigin(0.5);

    // Enter game button
    this.createButton(cx, cy - 50, "Enter District", "#9be7ff", () => {
      this.scene.start("HubScene");
    });

    // VoidCraft entry
    this.createButton(cx, cy + 20, "⬡  VoidCraft", "#45f5c8", () => {
      this.scene.start("VoidCraftMenuScene");
    });

    this.add.text(cx, cy + 80, "Creative Sandbox + Escape Rooms", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#334155"
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 260, 42, 0x0d1a22, 0.9);
    bg.setStrokeStyle(1, parseInt(color.replace("#", "0x")), 0.7);
    const txt = this.add.text(x, y, label, {
      fontFamily: "monospace", fontSize: "16px", color
    }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => { bg.setStrokeStyle(2, parseInt(color.replace("#", "0x")), 1); txt.setScale(1.05); });
    bg.on("pointerout", () => { bg.setStrokeStyle(1, parseInt(color.replace("#", "0x")), 0.7); txt.setScale(1); });
    bg.on("pointerdown", onClick);
  }
}
