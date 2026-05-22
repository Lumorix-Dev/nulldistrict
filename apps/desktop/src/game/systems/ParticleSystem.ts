import Phaser from 'phaser';

/**
 * Centralised particle effects for VoidCraft.
 * Uses the Phaser 3.60+ ParticleEmitter API (scene.add.particles).
 * Particle textures are generated procedurally on first use.
 */
export class ParticleSystem {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTextures();
  }

  // ── Texture bootstrap ──────────────────────────────────────────────────────

  private ensureTextures(): void {
    if (!this.scene.textures.exists('particle-square')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('particle-square', 4, 4);
      g.destroy();
    }
    if (!this.scene.textures.exists('particle-circle')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('particle-circle', 6, 6);
      g.destroy();
    }
  }

  // ── One-shot helpers ───────────────────────────────────────────────────────

  private burst(
    x: number,
    y: number,
    texture: string,
    count: number,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    ttl: number,
  ): void {
    const emitter = this.scene.add.particles(x, y, texture, { ...config, quantity: count });
    emitter.setDepth(50);
    emitter.explode(count);
    this.scene.time.delayedCall(ttl, () => emitter.destroy());
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Debris flying outward when a block is broken. */
  spawnBlockBreak(worldX: number, worldY: number, color: number): void {
    const count = Phaser.Math.Between(8, 12);
    this.burst(worldX, worldY, 'particle-square', count, {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      gravityY: 250,
      tint: color,
    }, 900);
  }

  /** Gold sparkles floating upward when a key / crystal is collected. */
  spawnKeyPickup(worldX: number, worldY: number): void {
    const count = Phaser.Math.Between(6, 8);
    this.burst(worldX, worldY, 'particle-circle', count, {
      speed: { min: 30, max: 90 },
      angle: { min: 240, max: 300 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      gravityY: -60,
      tint: 0xffe066,
    }, 1100);
  }

  /** Cyan-green radial burst when a door is unlocked. */
  spawnDoorUnlock(worldX: number, worldY: number): void {
    this.burst(worldX, worldY, 'particle-square', 12, {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      gravityY: 100,
      tint: 0x45f5c8,
    }, 1000);
  }

  /**
   * Continuous purple shimmer around a portal.
   * Caller is responsible for calling `.destroy()` on the returned emitter.
   */
  spawnPortalShimmer(worldX: number, worldY: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(worldX, worldY, 'particle-circle', {
      speed: { min: 10, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: { min: 600, max: 900 },
      frequency: 80,
      tint: [0x9b59ff, 0xd070ff, 0x7040cc],
      gravityY: -20,
    });
    emitter.setDepth(50);
    return emitter;
  }

  /** Colourful celebration fan on puzzle completion. */
  spawnPuzzleComplete(worldX: number, worldY: number): void {
    const colors = [0x45f5c8, 0xffe066, 0xff5f7e, 0x9be7ff, 0xb284ff, 0xffffff];
    this.burst(worldX, worldY, 'particle-circle', 36, {
      speed: { min: 100, max: 350 },
      angle: { min: 210, max: 330 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      gravityY: 200,
      tint: colors,
    }, 1500);
  }

  /** Tiny dust puff on each footstep. */
  spawnFootstep(worldX: number, worldY: number): void {
    const count = Phaser.Math.Between(2, 3);
    this.burst(worldX, worldY, 'particle-square', count, {
      speed: { min: 15, max: 40 },
      angle: { min: 170, max: 190 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 220,
      gravityY: 60,
      tint: [0x7a6a5a, 0x9a8a7a],
    }, 400);
  }

  /** Horizontal dust spray when the player lands. `intensity` 0–1 scales amount/speed. */
  spawnLandDust(worldX: number, worldY: number, intensity: number): void {
    const t = Phaser.Math.Clamp(intensity, 0, 1);
    const count = Math.round(Phaser.Math.Linear(3, 12, t));
    const topSpeed = Phaser.Math.Linear(30, 120, t);
    this.burst(worldX, worldY, 'particle-square', count, {
      speed: { min: topSpeed * 0.4, max: topSpeed },
      angle: { min: 155, max: 205 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.85, end: 0 },
      lifespan: 300,
      gravityY: 80,
      tint: [0x9a8070, 0xb0a090],
    }, 700);
  }

  /**
   * Persistent subtle glow particles orbiting a crystal.
   * Caller is responsible for calling `.destroy()` on the returned emitter.
   */
  spawnCrystalGlow(worldX: number, worldY: number, color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(worldX, worldY, 'particle-circle', {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 800, max: 1200 },
      frequency: 150,
      tint: color,
      gravityY: -10,
    });
    emitter.setDepth(50);
    return emitter;
  }
}
