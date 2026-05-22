import Phaser from 'phaser';
import { gameBus } from '../EventBus';

interface CursorSprite {
  tri: Phaser.GameObjects.Triangle;
  nameText: Phaser.GameObjects.Text;
  lastSeen: number;
}

/** Renders colored arrow cursors for remote players in CreativeScene. */
export class RemoteCursors {
  private readonly scene: Phaser.Scene;
  private cursors = new Map<string, CursorSprite>();
  private readonly offCursor: () => void;
  private readonly offJoin: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.offCursor = gameBus.on('voidcraft:remote-cursor', (data) => {
      this.updateCursor(data.playerId, data.worldX, data.worldY, data.color);
    });

    this.offJoin = gameBus.on('voidcraft:player-joined', (data) => {
      this.showJoinNotification(data.playerName, data.color);
    });
  }

  /** Call each frame from the scene's update() to cull stale cursors. */
  update(): void {
    const now = Date.now();
    for (const [id, cursor] of this.cursors) {
      if (now - cursor.lastSeen > 5000) {
        cursor.tri.destroy();
        cursor.nameText.destroy();
        this.cursors.delete(id);
      }
    }
  }

  destroy(): void {
    this.offCursor();
    this.offJoin();
    for (const cursor of this.cursors.values()) {
      cursor.tri.destroy();
      cursor.nameText.destroy();
    }
    this.cursors.clear();
  }

  private updateCursor(playerId: string, x: number, y: number, color: number): void {
    let cursor = this.cursors.get(playerId);

    if (!cursor) {
      // Small arrow triangle pointing top-left + player name label
      const tri = this.scene.add
        .triangle(x, y, 0, 0, 14, 6, 7, 18, color, 1)
        .setDepth(999)
        .setStrokeStyle(1, 0x000000, 0.5);

      const hex = '#' + color.toString(16).padStart(6, '0');
      const nameText = this.scene.add
        .text(x + 16, y, `P${this.cursors.size + 2}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: hex,
        })
        .setDepth(999);

      cursor = { tri, nameText, lastSeen: Date.now() };
      this.cursors.set(playerId, cursor);
    }

    cursor.tri.setPosition(x, y);
    cursor.nameText.setPosition(x + 16, y);
    cursor.lastSeen = Date.now();
  }

  private showJoinNotification(name: string, color: number): void {
    const cam = this.scene.cameras.main;
    const hex = '#' + color.toString(16).padStart(6, '0');

    const t = this.scene.add
      .text(
        cam.scrollX + this.scene.scale.width / 2,
        cam.scrollY + 80,
        `${name} joined!`,
        { fontFamily: 'monospace', fontSize: '14px', color: hex },
      )
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: t,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.scene.time.delayedCall(2000, () => {
          this.scene.tweens.add({
            targets: t,
            alpha: 0,
            duration: 400,
            onComplete: () => t.destroy(),
          });
        });
      },
    });
  }
}
