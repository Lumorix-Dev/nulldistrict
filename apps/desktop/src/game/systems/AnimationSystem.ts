import Phaser from 'phaser';

const FRAME_W = 28;
const FRAME_H = 42;
const FRAME_COUNT = 14;

/**
 * Generates a procedural 'player-sheet' canvas texture (14 frames × 28×42 px)
 * and registers all player animations. Safe to call multiple times (idempotent).
 */
export function setupAnimations(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-sheet')) return;

  const ct = scene.textures.createCanvas(
    'player-sheet',
    FRAME_W * FRAME_COUNT,
    FRAME_H,
  ) as Phaser.Textures.CanvasTexture;

  const ctx = ct.getContext();
  for (let i = 0; i < FRAME_COUNT; i++) drawFrame(ctx, i);
  ct.refresh();

  // Register named integer frames so Phaser animations can reference them
  for (let i = 0; i < FRAME_COUNT; i++) {
    ct.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  }

  if (!scene.anims.exists('player-walk')) {
    scene.anims.create({
      key: 'player-walk',
      frames: makeFrames(0, 7),
      frameRate: 12,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('player-idle')) {
    scene.anims.create({
      key: 'player-idle',
      frames: makeFrames(8, 11),
      frameRate: 4,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('player-jump')) {
    scene.anims.create({
      key: 'player-jump',
      frames: [{ key: 'player-sheet', frame: 12 }],
      frameRate: 1,
    });
  }
  if (!scene.anims.exists('player-fall')) {
    scene.anims.create({
      key: 'player-fall',
      frames: [{ key: 'player-sheet', frame: 13 }],
      frameRate: 1,
    });
  }
}

// ── Frame array helpers ──────────────────────────────────────────────────────

function makeFrames(start: number, end: number): Phaser.Types.Animations.AnimationFrame[] {
  const out: Phaser.Types.Animations.AnimationFrame[] = [];
  for (let i = start; i <= end; i++) out.push({ key: 'player-sheet', frame: i });
  return out;
}

// ── Frame drawing ────────────────────────────────────────────────────────────

/** Walk: [leftLegY, rightLegY] offsets per frame */
const WALK_OFFSETS: [number, number][] = [
  [4, -4], [2, -2], [0, 0], [-2, 2],
  [-4, 4], [-2, 2], [0, 0], [2, -2],
];

/** Idle: body height per frame (subtle breathing) */
const IDLE_BODY_H = [28, 29, 29, 28] as const;

function drawFrame(ctx: CanvasRenderingContext2D, i: number): void {
  const ox = i * FRAME_W;
  ctx.clearRect(ox, 0, FRAME_W, FRAME_H);

  if (i <= 7) {
    const [lY, rY] = WALK_OFFSETS[i]!;
    drawCharacter(ctx, ox, { legLeftY: lY, legRightY: rY });
  } else if (i <= 11) {
    drawCharacter(ctx, ox, { bodyH: IDLE_BODY_H[i - 8]! });
  } else if (i === 12) {
    drawCharacter(ctx, ox, { bodyH: 24, armsUp: true });
  } else {
    drawCharacter(ctx, ox, { bodyH: 32, armsDown: true });
  }
}

interface CharOpts {
  legLeftY?: number;
  legRightY?: number;
  bodyH?: number;
  armsUp?: boolean;
  armsDown?: boolean;
}

function drawCharacter(ctx: CanvasRenderingContext2D, ox: number, opts: CharOpts = {}): void {
  const { legLeftY = 0, legRightY = 0, bodyH = 28, armsUp = false, armsDown = false } = opts;

  // Torso
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(ox + 5, 14, 18, bodyH);

  // Head
  ctx.fillStyle = '#2a3a4a';
  ctx.fillRect(ox + 6, 2, 16, 14);

  // Eyes (cyberpunk cyan)
  ctx.fillStyle = '#9be7ff';
  ctx.fillRect(ox + 8, 7, 3, 3);
  ctx.fillRect(ox + 16, 7, 3, 3);

  // Legs
  ctx.fillStyle = '#0f1e2e';
  ctx.fillRect(ox + 5,  32 + legLeftY,  6, 10);
  ctx.fillRect(ox + 17, 32 + legRightY, 6, 10);

  // Arms (only for jump/fall poses)
  if (armsUp) {
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(ox + 1, 10, 4, 10);
    ctx.fillRect(ox + 23, 10, 4, 10);
  } else if (armsDown) {
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(ox + 1, 24, 4, 10);
    ctx.fillRect(ox + 23, 24, 4, 10);
  }
}
