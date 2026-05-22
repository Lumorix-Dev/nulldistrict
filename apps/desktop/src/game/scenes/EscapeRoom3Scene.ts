import Phaser from "phaser";
import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";
import { achievementSystem } from "../systems/AchievementSystem";

// Mirror Maze: 3 crystal shards must be collected from mirrored chamber sections.
// Each shard unlocks a mirror gate. Collecting all 3 opens the central vault.
// Pattern puzzle: 3 levers must be activated in the order Blue → Red → Green.
// Wrong order resets the levers. Then the crystal altar opens the exit.

export class EscapeRoom3Scene extends PuzzleScene {
  private leverOrder: string[] = [];
  private readonly CORRECT_ORDER = ["lever-blue", "lever-red", "lever-green"];
  private hadWrongLeverOrder = false;

  public constructor() {
    super("EscapeRoom3Scene");
  }

  public override create(): void { super.create(); }

  protected hints: string[] = [
    "Collect all three mirror shards to power the crystal altar.",
    "The lever order is shown by their colors: Blue → Red → Green.",
    "Wrong lever order resets progress — study the pattern sign before pulling.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-3",
    title: "Level 3 — Mirror Maze",
    width: 2560,
    height: 768,
    bgColor: 0x050a10,
    accentColor: 0x7df9ff,
    spawnX: 100,
    spawnY: 660,
    nextScene: "EscapeRoom4Scene",
    checkpoints: [
      { id: "cp1", x: 640,  y: 668 },
      { id: "cp2", x: 1340, y: 570 },
      { id: "cp3", x: 1920, y: 570 },
    ],
    objectives: [
      { id: "collect-shards", description: "Collect all 3 Mirror Shards", completed: false },
      { id: "solve-pattern", description: "Activate levers in correct order", completed: false },
      { id: "open-vault", description: "Open the Mirror Vault", completed: false },
      { id: "exit", description: "Escape the mirror maze", completed: false }
    ],
    platforms: [
      { x: 0,    y: 704, width: 2560, height: 64 },
      // Left chamber
      { x: 80,   y: 580, width: 140, height: 18 },
      { x: 300,  y: 520, width: 120, height: 18 },
      { x: 480,  y: 580, width: 140, height: 18 },
      // Walls creating maze effect
      { x: 640,  y: 600, width: 18,  height: 108 },
      // Mid-left area
      { x: 720,  y: 540, width: 160, height: 18 },
      { x: 960,  y: 480, width: 140, height: 18 },
      { x: 1160, y: 540, width: 120, height: 18 },
      { x: 1340, y: 600, width: 18,  height: 108 },
      // Center
      { x: 1400, y: 520, width: 200, height: 18 },
      { x: 1680, y: 460, width: 180, height: 18 },
      // Right chamber
      { x: 1920, y: 600, width: 18,  height: 108 },
      { x: 1980, y: 540, width: 140, height: 18 },
      { x: 2180, y: 480, width: 140, height: 18 },
      { x: 2380, y: 560, width: 140, height: 18 },
    ],
    entities: [
      // 3 Mirror Shards (in different sections)
      {
        id: "shard-a",
        type: "crystal_shard",
        x: 300, y: 500,
        label: "Mirror Shard",
        color: 0x7df9ff
      },
      {
        id: "shard-b",
        type: "crystal_shard",
        x: 960, y: 460,
        label: "Mirror Shard",
        color: 0x7df9ff
      },
      {
        id: "shard-c",
        type: "crystal_shard",
        x: 2180, y: 460,
        label: "Mirror Shard",
        color: 0x7df9ff
      },
      // 3 colored levers (pattern puzzle) - in center area
      {
        id: "lever-blue",
        type: "lever",
        x: 1400, y: 490,
        label: "◈ BLUE",
        color: 0x1a6ee8
      },
      {
        id: "lever-red",
        type: "lever",
        x: 1500, y: 490,
        label: "◈ RED",
        color: 0xff1a4b
      },
      {
        id: "lever-green",
        type: "lever",
        x: 1600, y: 490,
        label: "◈ GREEN",
        color: 0x3a7d2c
      },
      // Pattern hint sign
      {
        id: "sign-pattern",
        type: "text_sign",
        x: 1680, y: 420,
        message: "The mirrors remember light first, then blood, then growth. Blue → Red → Green"
      },
      // Crystal altar (vault door - requires shards)
      {
        id: "crystal-altar",
        type: "door",
        x: 1340, y: 600,
        width: 42, height: 108,
        label: "Mirror Vault",
        locked: true
      },
      // Secondary door (opens after pattern solved)
      {
        id: "pattern-gate",
        type: "door",
        x: 1920, y: 600,
        width: 42, height: 108,
        label: "Pattern Gate",
        locked: true
      },
      // Exit portal
      {
        id: "exit-portal",
        type: "portal",
        x: 2500, y: 660,
        label: "EXIT",
        targetScene: "EscapeRoom4Scene"
      },
      // Clue signs
      {
        id: "sign-shards",
        type: "text_sign",
        x: 80, y: 660,
        message: "The maze holds three mirror shards. Collect them all to power the altar."
      },
      {
        id: "sign-entrance",
        type: "text_sign",
        x: 480, y: 540,
        message: "Reflections split the path. Trust the light that leads backward."
      }
    ],
    clueTexts: [
      { x: 40, y: 672, text: "Collect Mirror Shards, then solve the lever pattern." },
      { x: 1380, y: 430, text: "PATTERN", color: "#7df9ff" },
      { x: 2420, y: 672, text: "EXIT →", color: "#45f5c8" }
    ]
  };

  private shardsCollected = 0;
  private patternSolved = false;

  public override create() {
    super.create();
    // Add colored visual overlays for the 3 lever zones
    this.addLeverZoneVisuals();
  }

  private addLeverZoneVisuals() {
    // Blue zone glow
    this.add.rectangle(1400, 490, 80, 120, 0x1a6ee8, 0.08).setDepth(1);
    // Red zone glow
    this.add.rectangle(1500, 490, 80, 120, 0xff1a4b, 0.08).setDepth(1);
    // Green zone glow
    this.add.rectangle(1600, 490, 80, 120, 0x3a7d2c, 0.08).setDepth(1);
  }

  protected override tryInteract(time: number) {
    const entity = this.entities.getEntityAt(this.player.x, this.player.y, 80);
    if (entity?.def.type === "lever") {
      this.handlePatternLever(entity.def.id);
      return;
    }
    if (entity?.def.type === "crystal_shard" && !this.entities.isCollected(entity.def.id)) {
      super.tryInteract(time);
      this.shardsCollected++;
      this.notify(`Mirror Shard collected (${this.shardsCollected}/3)`);
      // Unlock altar when all shards collected
      if (this.shardsCollected >= 3) {
        this.engine.forceUnlock("crystal-altar");
        this.entities.unlock("crystal-altar");
        this.notify("The Crystal Altar glows — the vault opens!");
      }
      this.checkObjectives();
      return;
    }
    super.tryInteract(time);
  }

  private handlePatternLever(leverId: string) {
    if (this.patternSolved) {
      this.notify("Pattern already solved.");
      return;
    }

    this.leverOrder.push(leverId);
    this.notify(`Lever activated: ${leverId.replace("lever-", "").toUpperCase()} (${this.leverOrder.length}/3)`);

    // Check correctness at each step
    for (let i = 0; i < this.leverOrder.length; i++) {
      if (this.leverOrder[i] !== this.CORRECT_ORDER[i]) {
        // Wrong order - reset
        this.time.delayedCall(500, () => {
          this.hadWrongLeverOrder = true;
          this.leverOrder = [];
          this.notify("Wrong sequence! Levers reset.");
          // Visually deactivate all levers
          this.entities.activate("lever-blue");
          this.entities.activate("lever-red");
          this.entities.activate("lever-green");
        });
        return;
      }
    }

    // Activate the lever visually
    this.entities.activate(leverId);
    this.engine.activateSwitch(leverId);

    if (this.leverOrder.length === 3) {
      this.patternSolved = true;
      this.notify("Pattern solved! The gate opens!");
      achievementSystem.checkLeverOrder(!this.hadWrongLeverOrder);
      this.engine.forceUnlock("pattern-gate");
      this.entities.unlock("pattern-gate");
      this.engine.completeObjective("solve-pattern");
      this.checkObjectives();
    }
  }

  protected override checkObjectives() {
    if (this.shardsCollected >= 3) this.engine.completeObjective("collect-shards");
    if (this.patternSolved) this.engine.completeObjective("solve-pattern");
    if (!this.entities.isLocked("crystal-altar")) this.engine.completeObjective("open-vault");
    if (this.engine.allObjectivesComplete()) this.onPuzzleComplete();
  }

  protected override onDoorEntered(doorId: string) {
    if (doorId === "exit-portal") {
      this.engine.completeObjective("exit");
      this.checkObjectives();
    }
    super.onDoorEntered(doorId);
  }
}
