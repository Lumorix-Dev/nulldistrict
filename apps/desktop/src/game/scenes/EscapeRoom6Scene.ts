import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";
import { CameraEffects } from "../systems/CameraEffects";

// THE NULL CORE — Secret bonus room unlocked after completing all 5 rooms.
// Mechanics: Collect 3 Void Shards → Solve Null Resonator (code: 0000) →
//            Activate 4 levers in sequence D→C→B→A → Pull the Null Core Disruptor.

export class EscapeRoom6Scene extends PuzzleScene {
  private readonly LEVER_ORDER = ["lever-d", "lever-c", "lever-b", "lever-a"];
  private leverSequence: string[] = [];
  private leverSolved = false;
  private shardsCollected = 0;

  private mpData: Array<{
    rect: Phaser.GameObjects.Rectangle;
    minX: number;
    maxX: number;
    speed: number;
    dir: number;
  }> = [];

  public constructor() {
    super("EscapeRoom6Scene");
  }

  protected hints: string[] = [
    "Collect the 3 Void Shards scattered through the room first.",
    "The code on the resonator is related to NULL — think binary. The signs say 0000.",
    "Levers must go: D first, then C, then B, then A. Check the sign near lever B.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-6",
    title: "SECRET — THE NULL CORE",
    width: 2560,
    height: 768,
    bgColor: 0x000000,
    accentColor: 0x00c8ff,
    spawnX: 50,
    spawnY: 700,
    nextScene: "VoidCraftMenuScene",
    checkpoints: [
      { id: "cp1", x: 500,  y: 700 },
      { id: "cp2", x: 1300, y: 700 },
      { id: "cp3", x: 2000, y: 700 },
    ],
    objectives: [
      { id: "collect-shards",  description: "Collect all 3 Void Shards",                        completed: false },
      { id: "solve-null",      description: "Solve the Null Resonator (code: 0000)",              completed: false },
      { id: "lever-sequence",  description: "Activate levers in order: D → C → B → A",           completed: false },
      { id: "final-escape",    description: "Throw the Null Core Disruptor and escape!",          completed: false },
    ],
    platforms: [
      // Floor
      { x: 0,    y: 736, width: 2560, height: 32 },
      // Ascending path
      { x: 100,  y: 600, width: 200,  height: 20 },
      { x: 400,  y: 500, width: 180,  height: 20 },
      { x: 700,  y: 420, width: 200,  height: 20 },
      { x: 950,  y: 340, width: 160,  height: 20 },
      { x: 1200, y: 280, width: 200,  height: 20 },
      // Descending path
      { x: 1500, y: 340, width: 160,  height: 20 },
      { x: 1750, y: 420, width: 180,  height: 20 },
      { x: 1980, y: 500, width: 200,  height: 20 },
      { x: 2200, y: 400, width: 180,  height: 20 },
      // Final area
      { x: 2350, y: 320, width: 150,  height: 20 },
    ],
    entities: [
      // ── Phase 1: Void Shards ────────────────────────────────────────────
      {
        id: "shard-a",
        type: "crystal_shard",
        x: 150, y: 570,
        label: "Void Shard A",
        color: 0x00c8ff,
      },
      {
        id: "shard-b",
        type: "crystal_shard",
        x: 720, y: 390,
        label: "Void Shard B",
        color: 0x00c8ff,
      },
      {
        id: "shard-c",
        type: "crystal_shard",
        x: 1220, y: 250,
        label: "Void Shard C",
        color: 0x00c8ff,
      },

      // ── Phase 2: Null Resonator (code panel) ───────────────────────────
      {
        id: "null-panel",
        type: "code_panel",
        x: 1510, y: 310,
        label: "Null Resonator",
        code: "0000",
      },

      // ── Phase 3: Lever sequence (D→C→B→A) ─────────────────────────────
      {
        id: "lever-d",
        type: "lever",
        x: 300,  y: 570,
        label: "Lever D",
        color: 0x00c8ff,
      },
      {
        id: "lever-c",
        type: "lever",
        x: 600,  y: 490,
        label: "Lever C",
        color: 0x00c8ff,
      },
      {
        id: "lever-b",
        type: "lever",
        x: 1760, y: 390,
        label: "Lever B",
        color: 0x00c8ff,
      },
      {
        id: "lever-a",
        type: "lever",
        x: 2000, y: 470,
        label: "Lever A",
        color: 0x00c8ff,
      },

      // ── Text signs (lore + clues) ───────────────────────────────────────
      {
        id: "sign-1",
        type: "text_sign",
        x: 80,   y: 610,
        label: "SIGNAL: NULL DETECTED",
        message: "SIGNAL: NULL DETECTED — The Void Shards carry the resonance signature. Collect all three.",
      },
      {
        id: "sign-2",
        type: "text_sign",
        x: 450,  y: 510,
        label: "RESONANCE FREQUENCY",
        message: "RESONANCE FREQUENCY: 0000 — Enter this on the Null Resonator after collecting all Shards.",
      },
      {
        id: "sign-3",
        type: "text_sign",
        x: 1850, y: 400,
        label: "LEVER ORDER",
        message: "LEVER ORDER: D → C → B → A — Reverse alphabetical disrupts the null pattern.",
      },
      {
        id: "sign-4",
        type: "text_sign",
        x: 2250, y: 360,
        label: "THE VOID AWAITS",
        message: "THE VOID AWAITS... You have reached the core. Throw the Null Core Disruptor and leave.",
      },

      // ── Phase 4: Master lever + final door ─────────────────────────────
      {
        id: "void-lever-master",
        type: "lever",
        x: 2210, y: 370,
        label: "Null Core Disruptor",
        linkedTo: ["final-void-door"],
        color: 0xffd700,
      },
      {
        id: "final-void-door",
        type: "door",
        x: 2400, y: 288,
        label: "Void Gate",
        locked: true,
      },
    ],
    clueTexts: [
      { x: 40,   y: 700, text: "PHASE 1: Shards",  color: "#00c8ff" },
      { x: 900,  y: 700, text: "PHASE 2: Code",    color: "#00c8ff" },
      { x: 1700, y: 700, text: "PHASE 3: Levers",  color: "#00c8ff" },
      { x: 2170, y: 700, text: "PHASE 4: Core",    color: "#00c8ff" },
      { x: 2390, y: 700, text: "EXIT →",           color: "#45f5c8" },
    ],
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────

  public override create(): void {
    super.create();
    this.createMovingPlatforms();
    this.addVoidParticles();
    CameraEffects.fadeIn(this, 800);
  }

  public override update(time: number, delta: number): void {
    super.update(time, delta);
    const dt = delta / 1000;
    for (const mp of this.mpData) {
      mp.rect.x += mp.speed * mp.dir * dt;
      if (mp.rect.x >= mp.maxX) { mp.rect.x = mp.maxX; mp.dir = -1; }
      if (mp.rect.x <= mp.minX) { mp.rect.x = mp.minX; mp.dir = 1; }
      (mp.rect.body as Phaser.Physics.Arcade.StaticBody).reset(mp.rect.x, mp.rect.y);
    }
  }

  // ── Moving platforms ─────────────────────────────────────────────────────

  private createMovingPlatforms(): void {
    const configs = [
      { x: 975,  y: 410, w: 160, h: 16, min: 875,  max: 1075, speed: 60 },
      { x: 1525, y: 330, w: 140, h: 16, min: 1425, max: 1625, speed: 80 },
    ];
    for (const cfg of configs) {
      const rect = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0x0a1a28);
      rect.setStrokeStyle(2, 0x00c8ff, 0.9).setDepth(10);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect as any);
      this.mpData.push({
        rect,
        minX: cfg.min + cfg.w / 2,
        maxX: cfg.max + cfg.w / 2,
        speed: cfg.speed,
        dir: 1,
      });
    }
  }

  // ── Void particles ───────────────────────────────────────────────────────

  private addVoidParticles(): void {
    const def = this.definition;
    for (let i = 0; i < 28; i++) {
      const x = Phaser.Math.Between(0, def.width);
      const y = Phaser.Math.Between(60, def.height - 60);
      const dot = this.add.rectangle(x, y, 2, 2, 0x00c8ff).setDepth(3).setAlpha(0.1);
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.05, to: 0.55 },
        y: { from: y, to: y - Phaser.Math.Between(15, 50) },
        duration: 1600 + Math.random() * 2400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 3000,
      });
    }
  }

  // ── Entity activation ────────────────────────────────────────────────────

  protected override onEntityActivated(id: string, time: number): void {
    if (this.LEVER_ORDER.includes(id)) {
      this.handleLeverSequence(id);
      return;
    }
    super.onEntityActivated(id, time);
  }

  // ── Interaction ──────────────────────────────────────────────────────────

  protected override tryInteract(time: number): void {
    const entity = this.entities.getEntityAt(this.player.x, this.player.y, 80);

    // Void Shard collection — track count
    if (entity?.def.id.startsWith("shard-") && !this.entities.isCollected(entity.def.id)) {
      super.tryInteract(time);
      this.shardsCollected++;
      this.notify(`Void Shard ${this.shardsCollected}/3 collected!`);
      if (this.shardsCollected >= 3) {
        this.engine.completeObjective("collect-shards");
        this.notify("All Void Shards collected — approach the Null Resonator!");
      }
      this.checkObjectives();
      return;
    }

    // Null Resonator — requires all shards first
    if (entity?.def.id === "null-panel") {
      if (this.shardsCollected < 3) {
        this.notify("Collect all 3 Void Shards before accessing the Null Resonator!");
        return;
      }
    }

    // Sequence levers — route through handler
    if (this.LEVER_ORDER.includes(entity?.def.id ?? "")) {
      this.handleLeverSequence(entity!.def.id);
      return;
    }

    // Master lever — requires lever sequence solved first
    if (entity?.def.id === "void-lever-master" && !this.leverSolved) {
      this.notify("Complete the lever sequence D→C→B→A first!");
      return;
    }

    super.tryInteract(time);
  }

  // ── Lever sequence logic ─────────────────────────────────────────────────

  private handleLeverSequence(id: string): void {
    if (this.leverSolved) {
      this.notify("Lever sequence already solved.");
      return;
    }

    this.leverSequence.push(id);
    const idx = this.leverSequence.length - 1;

    if (this.leverSequence[idx] !== this.LEVER_ORDER[idx]) {
      this.leverSequence = [];
      CameraEffects.shake(this, 200, 0.01);
      this.notify("Wrong sequence — reset! Order is D → C → B → A");
      return;
    }

    this.entities.activate(id);
    this.engine.activateSwitch(id);
    this.notify(`Lever ${id.replace("lever-", "").toUpperCase()} activated (${this.leverSequence.length}/4)`);

    if (this.leverSequence.length === 4) {
      this.leverSolved = true;
      this.engine.completeObjective("lever-sequence");
      this.notify("Lever sequence complete! Null Core Disruptor is now accessible!");
      CameraEffects.successFlash(this);
      this.checkObjectives();
    }
  }

  // ── Objectives ───────────────────────────────────────────────────────────

  protected override checkObjectives(): void {
    if (this.shardsCollected >= 3)            this.engine.completeObjective("collect-shards");
    if (this.engine.isPanelSolved("null-panel")) this.engine.completeObjective("solve-null");
    if (this.leverSolved)                     this.engine.completeObjective("lever-sequence");
    if (!this.entities.isLocked("final-void-door")) this.engine.completeObjective("final-escape");

    if (this.engine.allObjectivesComplete()) this.onPuzzleComplete();
  }

  // ── Completion ───────────────────────────────────────────────────────────

  protected override onPuzzleComplete(): void {
    super.onPuzzleComplete();
    // Extra cyan void burst for the secret final room
    this.time.delayedCall(500, () => {
      this.cameras.main.flash(1500, 0, 200, 255);
    });
  }
}
