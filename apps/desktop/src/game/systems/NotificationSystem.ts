import Phaser from "phaser";

export type NotifType = "info" | "success" | "warning" | "error" | "achievement";

interface Notification {
  message: string;
  type: NotifType;
  icon?: string;
  duration?: number;
}

export class NotificationSystem {
  private static queue: Notification[] = [];
  private static showing = false;
  private static activeObjs: Phaser.GameObjects.GameObject[] = [];

  static show(
    scene: Phaser.Scene,
    message: string,
    type: NotifType = "info",
    icon?: string,
    duration = 3000
  ): void {
    if (NotificationSystem.queue.length >= 3) return;
    NotificationSystem.queue.push({ message, type, icon, duration });
    if (!NotificationSystem.showing) {
      NotificationSystem.flush(scene);
    }
  }

  private static flush(scene: Phaser.Scene): void {
    const notif = NotificationSystem.queue.shift();
    if (!notif) {
      NotificationSystem.showing = false;
      return;
    }
    NotificationSystem.showing = true;

    const { width } = scene.scale;
    const colors: Record<NotifType, number> = {
      info: 0x00c8ff,
      success: 0x00ff88,
      warning: 0xffcc00,
      error: 0xff3344,
      achievement: 0xffd700,
    };
    const color = colors[notif.type];
    const x = width - 20;
    const y = 20;
    const w = 300;
    const h = 64;

    // Background panel — starts above screen (y - h), slides down
    const bg = scene.add
      .rectangle(x - w / 2, y - h, w, h, 0x0a0a1a, 0.95)
      .setStrokeStyle(2, color)
      .setScrollFactor(0)
      .setDepth(9000)
      .setOrigin(0.5, 0);

    // Icon + message text
    const prefix = notif.icon ? notif.icon + " " : "";
    const colorHex = "#" + color.toString(16).padStart(6, "0");
    const txt = scene.add
      .text(x - w + 14, y - h + 10, prefix + notif.message, {
        fontSize: "13px",
        fontFamily: "monospace",
        color: colorHex,
        wordWrap: { width: w - 30 },
        maxLines: 2,
      })
      .setScrollFactor(0)
      .setDepth(9001)
      .setOrigin(0, 0);

    NotificationSystem.activeObjs = [bg, txt];

    // Slide down into view
    scene.tweens.add({
      targets: [bg, txt],
      y: "+=" + (h + 10),
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        scene.time.delayedCall(notif.duration ?? 3000, () => {
          scene.tweens.add({
            targets: [bg, txt],
            alpha: 0,
            duration: 400,
            onComplete: () => {
              bg.destroy();
              txt.destroy();
              NotificationSystem.activeObjs = [];
              NotificationSystem.flush(scene);
            },
          });
        });
      },
    });
  }

  /** Clear all pending notifications and destroy active ones. */
  static clear(): void {
    NotificationSystem.queue = [];
    NotificationSystem.showing = false;
    for (const obj of NotificationSystem.activeObjs) {
      if (obj?.active) obj.destroy();
    }
    NotificationSystem.activeObjs = [];
  }
}
