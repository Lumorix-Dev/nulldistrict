import { TileWorld } from './TileWorld';

export type WorldTheme = 'cyberpunk-city' | 'underground-cave' | 'void-space' | 'neon-forest' | 'ruins';

export interface WorldGenOptions {
  width?: number;    // tiles (default 100)
  height?: number;   // tiles (default 100)
  tileSize?: number; // px (default 32)
  theme: WorldTheme;
  seed?: number;     // for deterministic generation
  name?: string;
}

export class WorldGenSystem {
  private seed: number;
  /** Fixed snapshot of the seed used by the noise hash (unaffected by rng() calls). */
  private noiseSeed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 999999);
    this.noiseSeed = this.seed;
  }

  generate(options: WorldGenOptions): TileWorld {
    if (options.seed !== undefined) {
      this.seed = options.seed;
      this.noiseSeed = options.seed;
    }

    const width    = options.width    ?? 100;
    const height   = options.height   ?? 100;
    const tileSize = options.tileSize ?? 32;
    const name     = options.name     ?? 'Generated World';

    const world = new TileWorld({ width, height, tileSize, name });

    switch (options.theme) {
      case 'cyberpunk-city':   this.generateCyberpunkCity(world);   break;
      case 'underground-cave': this.generateUndergroundCave(world); break;
      case 'void-space':       this.generateVoidSpace(world);       break;
      case 'neon-forest':      this.generateNeonForest(world);      break;
      case 'ruins':            this.generateRuins(world);           break;
    }

    return world;
  }

  // ── Pseudo-random (LCG) ────────────────────────────────────────────────────

  /** Advance LCG and return a value in [0, 1). */
  private rng(): number {
    // Knuth's multiplicative LCG, 32-bit unsigned
    this.seed = ((this.seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    return this.seed / 0x100000000;
  }

  private rngRange(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  private rngBool(probability: number): boolean {
    return this.rng() < probability;
  }

  // ── Value noise (no LCG state consumed) ───────────────────────────────────

  /**
   * Deterministic value noise for position (x, y).
   * Uses a sin/cos hash seeded by the initial noiseSeed.
   * Returns a value roughly in [0, 1].
   */
  private noise(x: number, y: number, scale: number): number {
    const nx = x * scale * 2.3 + this.noiseSeed * 0.00013;
    const ny = y * scale * 1.7 + this.noiseSeed * 0.00017;
    const v = Math.sin(nx) * Math.cos(ny)
            + Math.sin(nx * 1.3 + ny * 0.7) * 0.5;
    return Math.max(0, Math.min(1, (v + 1.5) / 3.0));
  }

  // ── Theme generators ───────────────────────────────────────────────────────

  private generateCyberpunkCity(world: TileWorld): void {
    const W = world.width;
    const H = world.height;

    // BG layer: sparse circuit blocks for ambience
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.rngBool(0.04)) {
          world.set(x, y, 0, 'circuit');
        }
      }
    }

    // Solid ground: rows 85-99
    world.fill(0, 85, W - 1, H - 1, 1, 'steel-plate');

    // Neon accent strip at row 84
    for (let x = 0; x < W; x += 4) {
      world.set(x, 84, 1, 'neon-sign');
    }

    // Buildings
    const wallMats = ['steel', 'steel-plate', 'hologram', 'cobblestone', 'basalt'];
    let bx = 0;
    while (bx < W) {
      // Road gap: 3 tiles
      bx += 3;
      if (bx >= W) break;

      const bWidth  = this.rngRange(5, 12);
      const bHeight = this.rngRange(15, 30);
      const bTop    = 85 - bHeight;
      const bRight  = Math.min(bx + bWidth - 1, W - 1);
      const mat     = wallMats[Math.floor(this.rng() * wallMats.length)]!;

      // Fill solid building body
      world.fill(bx, Math.max(0, bTop), bRight, 84, 1, mat);

      // Windows: hologram on interior floors, 1-in-4 chance
      for (let wy = Math.max(0, bTop + 1); wy <= 83; wy++) {
        for (let wx = bx + 1; wx < bRight; wx++) {
          if (this.rngBool(0.25)) {
            world.set(wx, wy, 1, 'hologram');
          }
        }
      }

      // Roof row: copper or reactor
      if (bTop >= 0) {
        const roofBlock = this.rngBool(0.5) ? 'copper' : 'reactor';
        for (let rx = bx; rx <= bRight; rx++) {
          world.set(rx, bTop, 1, roofBlock);
        }
      }

      bx += bWidth + this.rngRange(0, 3);
    }

    // Floating platforms: 3-5
    const numPlatforms = this.rngRange(3, 5);
    for (let i = 0; i < numPlatforms; i++) {
      const pW = this.rngRange(4, 8);
      const pX = this.rngRange(0, Math.max(0, W - pW));
      const pY = this.rngRange(40, 75);
      for (let px = pX; px < pX + pW && px < W; px++) {
        world.set(px, pY, 1, 'steel-plate');
      }
    }

    // FG decorations at street level
    for (let x = 0; x < W; x++) {
      if (this.rngBool(0.07)) {
        world.set(x, 84, 2, this.rngBool(0.5) ? 'neon-sign' : 'hologram');
      }
    }
  }

  private generateUndergroundCave(world: TileWorld): void {
    const W = world.width;
    const H = world.height;

    // Cave ceiling: rows 0-10
    world.fill(0, 0, W - 1, 10, 1, 'stone');
    // Solid base: rows 90-99
    world.fill(0, 90, W - 1, H - 1, 1, 'stone');

    // Main cave body via noise
    for (let y = 11; y < 90; y++) {
      for (let x = 0; x < W; x++) {
        if (this.noise(x, y, 0.1) > 0.55) {
          world.set(x, y, 1, 'stone');
        }
      }
    }

    // Ore veins: crystal
    for (let y = 11; y < 90; y++) {
      for (let x = 0; x < W; x++) {
        if (world.getTile(x, y, 1) === 'stone' && this.noise(x * 3, y * 3, 0.2) > 0.8) {
          world.set(x, y, 1, 'crystal');
        }
      }
    }

    // Rare void-crystal nodes
    for (let y = 11; y < 90; y++) {
      for (let x = 0; x < W; x++) {
        if (world.getTile(x, y, 1) === 'stone' && this.noise(x * 5, y * 5, 0.3) > 0.9) {
          world.set(x, y, 1, 'void-crystal');
        }
      }
    }

    // Underground pools: water in flat cave-floor spots
    for (let x = 0; x < W; x++) {
      for (let y = 50; y < 90; y++) {
        if (world.getTile(x, y, 1) !== '' && world.getTile(x, y - 1, 1) === '') {
          if (this.noise(x * 2, y, 0.15) > 0.76) {
            world.set(x, y, 1, 'water');
          }
          break;
        }
      }
    }

    // Mushrooms on cave floors (FG)
    for (let y = 12; y < 90; y++) {
      for (let x = 0; x < W; x++) {
        if (world.getTile(x, y, 1) !== '' && world.getTile(x, y - 1, 1) === '' && this.rngBool(0.07)) {
          world.set(x, y - 1, 2, 'mushroom');
        }
      }
    }

    // Stalactites hanging from ceiling
    for (let x = 0; x < W; x++) {
      const stalLen = this.rngRange(1, 5);
      for (let y = 11; y < 11 + stalLen && y < 90; y++) {
        if (world.getTile(x, y, 1) === '') {
          world.set(x, y, 1, 'stone');
        }
      }
    }
  }

  private generateVoidSpace(world: TileWorld): void {
    const W = world.width;
    const H = world.height;

    // Background: sparse ether nebula
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.rngBool(0.05)) {
          world.set(x, y, 0, 'ether');
        }
      }
    }

    // Asteroid chunks: 20-40
    const numAsteroids = this.rngRange(20, 40);
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];

    for (let attempt = 0; attempt < numAsteroids * 3; attempt++) {
      if (placed.length >= numAsteroids) break;

      const aW = this.rngRange(5, 20);
      const aH = this.rngRange(3, 8);
      const aX = this.rngRange(0, Math.max(0, W - aW));
      const aY = this.rngRange(5, Math.max(5, H - aH - 5));

      // Minimum spacing check
      let overlaps = false;
      for (const p of placed) {
        if (Math.abs(p.x - aX) < p.w + aW + 4 && Math.abs(p.y - aY) < p.h + aH + 4) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      placed.push({ x: aX, y: aY, w: aW, h: aH });

      const rockBlocks = ['obsidian', 'void-crystal', 'ether'] as const;
      for (let ay = aY; ay < aY + aH; ay++) {
        for (let ax = aX; ax < aX + aW; ax++) {
          const isEdge = ax === aX || ax === aX + aW - 1 || ay === aY || ay === aY + aH - 1;
          if (isEdge && this.noise(ax, ay, 0.5) < 0.45) continue;
          world.set(ax, ay, 1, rockBlocks[Math.floor(this.rng() * 3)]!);
        }
      }
    }

    // Scattered lone void-crystals
    for (let i = 0; i < 60; i++) {
      const vx = this.rngRange(0, W - 1);
      const vy = this.rngRange(0, H - 1);
      if (world.getTile(vx, vy, 1) === '') {
        world.set(vx, vy, 1, 'void-crystal');
      }
    }
  }

  private generateNeonForest(world: TileWorld): void {
    const W = world.width;
    const H = world.height;
    const BASE_GROUND = 79;

    // Compute per-column ground height via noise undulation (±5 rows)
    const groundY: number[] = new Array<number>(W);
    for (let x = 0; x < W; x++) {
      const offset = Math.round((this.noise(x, 0, 0.08) - 0.5) * 10);
      groundY[x] = Math.min(H - 10, Math.max(BASE_GROUND - 5, BASE_GROUND + offset));
    }

    // Fill ground columns
    for (let x = 0; x < W; x++) {
      const gY = groundY[x]!;
      world.set(x, gY, 1, 'grass');
      for (let y = gY + 1; y < H; y++) {
        world.set(x, y, 1, 'dirt');
      }
    }

    // Trees
    let tx = this.rngRange(2, 5);
    while (tx < W - 5) {
      const gY = groundY[tx] ?? BASE_GROUND;
      const trunkH  = this.rngRange(4, 8);
      const trunkTop = gY - trunkH;

      // Trunk on terrain layer
      for (let ty = trunkTop; ty < gY; ty++) {
        world.set(tx, ty, 1, 'ancient-wood');
      }

      // Leaf crown on FG layer
      const leafR     = this.rngRange(2, 4);
      const leafBlock = this.rngBool(0.5) ? 'leaves' : 'moss';
      for (let ly = trunkTop - leafR; ly <= trunkTop + Math.floor(leafR / 2); ly++) {
        for (let lx = tx - leafR; lx <= tx + leafR; lx++) {
          if (lx < 0 || lx >= W || ly < 0) continue;
          const dist = Math.sqrt((lx - tx) ** 2 + (ly - trunkTop) ** 2);
          if (dist <= leafR + 0.5 && this.rngBool(0.82)) {
            world.set(lx, ly, 2, leafBlock);
          }
        }
      }

      // Occasional glowing mushroom on tree side
      if (this.rngBool(0.4)) {
        const sideX = tx + (this.rngBool(0.5) ? -1 : 1);
        const musY  = trunkTop + this.rngRange(1, Math.max(1, trunkH - 1));
        if (sideX >= 0 && sideX < W) {
          world.set(sideX, musY, 2, 'mushroom');
        }
      }

      tx += this.rngRange(4, 7);
    }

    // Undergrowth on surface (FG)
    for (let x = 0; x < W; x++) {
      const gY = groundY[x]!;
      if (this.rngBool(0.14)) {
        world.set(x, gY - 1, 2, this.rngBool(0.55) ? 'moss' : 'mushroom');
      }
    }

    // Water streams: 2-tile wide, repeat every 20-35 tiles
    let sx = this.rngRange(8, 18);
    while (sx < W - 3) {
      const gY = groundY[sx] ?? BASE_GROUND;
      world.set(sx,     gY, 1, 'water');
      if (sx + 1 < W) world.set(sx + 1, gY, 1, 'water');
      sx += this.rngRange(20, 35);
    }

    // Rare floating bioluminescent mushrooms
    for (let i = 0; i < 8; i++) {
      const mx = this.rngRange(0, W - 1);
      const my = this.rngRange(20, 60);
      world.set(mx, my, 2, 'mushroom');
    }
  }

  private generateRuins(world: TileWorld): void {
    const W = world.width;
    const H = world.height;
    const GROUND = 80;

    // Ground
    world.fill(0, GROUND, W - 1, H - 1, 1, 'dirt');
    world.fill(0, GROUND - 1, W - 1, GROUND - 1, 1, 'grass');

    const ruinMats = ['cobblestone', 'basalt', 'stone', 'ancient-wood'] as const;

    // Ruined buildings
    let bx = 0;
    while (bx < W) {
      bx += this.rngRange(3, 6); // gap / road
      if (bx >= W) break;

      const bWidth  = this.rngRange(6, 14);
      const bHeight = this.rngRange(10, 25);
      const bTop    = GROUND - bHeight;
      const bRight  = Math.min(bx + bWidth - 1, W - 1);
      const mat     = ruinMats[Math.floor(this.rng() * ruinMats.length)]!;

      // Left and right walls only (ruins are hollow)
      for (let by = Math.max(0, bTop + 1); by < GROUND - 1; by++) {
        if (!this.rngBool(0.12)) world.set(bx,     by, 1, mat);
        if (!this.rngBool(0.12)) world.set(bRight, by, 1, mat);
      }

      // Crumbled top: add top blocks only where noise is high enough
      for (let cx = bx; cx <= bRight; cx++) {
        if (this.noise(cx, bTop, 0.3) > 0.42) {
          if (bTop >= 0) world.set(cx, bTop, 1, mat);
        }
      }

      // Moss on lower building sections (FG)
      for (let my = GROUND - 5; my < GROUND - 1; my++) {
        for (let mx = bx; mx <= bRight; mx++) {
          if (world.getTile(mx, my, 1) !== '' && this.rngBool(0.35)) {
            world.set(mx, my, 2, 'moss');
          }
        }
      }

      bx += bWidth;
    }

    // Scattered rubble on ground
    for (let x = 0; x < W; x++) {
      if (this.rngBool(0.11)) {
        world.set(x, GROUND - 1, 1, ruinMats[Math.floor(this.rng() * ruinMats.length)]!);
      }
      if (this.rngBool(0.09)) {
        world.set(x, GROUND - 1, 2, 'moss');
      }
    }

    // Ruined arches: 2-3
    const numArches = this.rngRange(2, 3);
    for (let i = 0; i < numArches; i++) {
      const archX    = this.rngRange(5, Math.max(5, W - 12));
      const archSpan = this.rngRange(4, 7);
      const archH    = this.rngRange(4, 6);
      const archMat  = ruinMats[Math.floor(this.rng() * ruinMats.length)]!;

      // Left pillar
      for (let ay = GROUND - archH; ay < GROUND; ay++) {
        world.set(archX, ay, 1, archMat);
      }
      // Right pillar
      for (let ay = GROUND - archH; ay < GROUND; ay++) {
        world.set(archX + archSpan, ay, 1, archMat);
      }
      // Top lintel
      for (let ax = archX; ax <= archX + archSpan; ax++) {
        if (GROUND - archH >= 0) {
          world.set(ax, GROUND - archH, 1, archMat);
        }
      }
    }
  }
}
