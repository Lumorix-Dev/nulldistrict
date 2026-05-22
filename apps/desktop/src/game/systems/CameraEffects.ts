/**
 * CameraEffects — wraps Phaser's built-in camera effects with helper methods.
 * All methods are static and take the Phaser.Scene as first argument.
 */
export class CameraEffects {
  /** Short shake — good for impacts, block break */
  static shake(scene: Phaser.Scene, duration = 120, intensity = 0.008): void {
    scene.cameras.main.shake(duration, intensity);
  }

  /** Strong shake — door unlock, explosion */
  static heavyShake(scene: Phaser.Scene): void {
    scene.cameras.main.shake(300, 0.02);
  }

  /** Brief white flash — key pickup, item collect */
  static flash(scene: Phaser.Scene, color = 0xffffff, duration = 200): void {
    scene.cameras.main.flash(
      duration,
      (color >> 16) & 0xff,
      (color >> 8) & 0xff,
      color & 0xff,
      true
    );
  }

  /** Green flash — success */
  static successFlash(scene: Phaser.Scene): void {
    CameraEffects.flash(scene, 0x00ff88, 300);
  }

  /** Red flash — damage/death */
  static damageFlash(scene: Phaser.Scene): void {
    CameraEffects.flash(scene, 0xff0000, 250);
  }

  /** Zoom pulse — zoom in then back out */
  static zoomPulse(scene: Phaser.Scene, targetZoom = 1.15, duration = 600): void {
    scene.tweens.add({
      targets: scene.cameras.main,
      zoom: targetZoom,
      duration: duration / 2,
      ease: "Quad.easeOut",
      yoyo: true,
      onComplete: () => {
        scene.cameras.main.zoom = 1;
      },
    });
  }

  /** Slow-motion effect — time scale down then back up */
  static slowMo(scene: Phaser.Scene, scale = 0.3, duration = 1500): void {
    scene.time.timeScale = scale;
    scene.tweens.timeScale = scale;
    scene.physics.world.timeScale = 1 / scale; // physics runs faster to compensate visually
    scene.time.delayedCall(duration * scale, () => {
      scene.time.timeScale = 1;
      scene.tweens.timeScale = 1;
      scene.physics.world.timeScale = 1;
    });
  }

  /** Fade to black and back — for scene transitions */
  static fadeToBlack(
    scene: Phaser.Scene,
    duration = 500,
    callback?: () => void
  ): void {
    scene.cameras.main.fade(
      duration,
      0,
      0,
      0,
      false,
      (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1 && callback) callback();
      }
    );
  }

  /** Fade in from black */
  static fadeIn(scene: Phaser.Scene, duration = 500): void {
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
  }

  /** Dramatic room-complete sequence: zoom pulse + green flash + slow-mo */
  static roomComplete(scene: Phaser.Scene): void {
    CameraEffects.slowMo(scene, 0.25, 800);
    scene.time.delayedCall(200, () => {
      CameraEffects.successFlash(scene);
      CameraEffects.zoomPulse(scene, 1.2, 800);
    });
  }

  /** Death sequence: red flash + heavy shake */
  static death(scene: Phaser.Scene): void {
    CameraEffects.damageFlash(scene);
    CameraEffects.heavyShake(scene);
  }

  /** Key pickup: small shake + yellow flash */
  static keyPickup(scene: Phaser.Scene): void {
    CameraEffects.shake(scene, 80, 0.005);
    CameraEffects.flash(scene, 0xffd700, 150);
  }

  /** Door unlock: heavy shake + cyan flash */
  static doorUnlock(scene: Phaser.Scene): void {
    CameraEffects.heavyShake(scene);
    CameraEffects.flash(scene, 0x00c8ff, 300);
  }

  /** Code solved: zoom pulse + flash */
  static codeSolved(scene: Phaser.Scene): void {
    CameraEffects.flash(scene, 0x00ff88, 200);
    CameraEffects.zoomPulse(scene, 1.1, 500);
  }
}
