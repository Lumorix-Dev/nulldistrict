import Phaser from "phaser";

function makeRect(scene: Phaser.Scene, key: string, width: number, height: number, color: number, stroke = 0x79f2ff) {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, width, height);
  graphics.lineStyle(2, stroke, 0.9);
  graphics.strokeRect(1, 1, width - 2, height - 2);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super("PreloadScene");
  }

  public create() {
    makeRect(this, "player", 28, 42, 0x101824, 0x83f7ff);
    makeRect(this, "remote-player", 28, 42, 0x1c1630, 0xd18cff);
    makeRect(this, "enemy-corrupted-scout", 34, 34, 0x331317, 0xff4d6d);
    makeRect(this, "enemy-signal-wraith", 36, 48, 0x271743, 0xb284ff);
    makeRect(this, "tile", 32, 32, 0x17202c, 0x334155);
    makeRect(this, "platform", 64, 24, 0x101620, 0x31445d);
    makeRect(this, "terminal", 36, 46, 0x071216, 0x45f5c8);
    makeRect(this, "relay", 44, 70, 0x16121d, 0xf1c84b);
    makeRect(this, "npc", 28, 44, 0x17293b, 0x9be7ff);
    makeRect(this, "pickup", 18, 18, 0x103f43, 0x6fffe9);
    makeRect(this, "door", 42, 72, 0x1b2030, 0xff5f7e);
    makeRect(this, "slash", 52, 28, 0x6fffe9, 0xffffff);
    makeRect(this, "projectile", 18, 8, 0x9be7ff, 0xffffff);
    makeRect(this, "enemy-projectile", 16, 8, 0xff5f7e, 0xffb0bf);
    this.scene.start("HubScene");
    this.scene.launch("UIScene");
    this.scene.launch("DialogueScene");
  }
}
