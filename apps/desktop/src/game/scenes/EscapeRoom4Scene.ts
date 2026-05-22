import Phaser from "phaser";
import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";
import { achievementSystem } from "../systems/AchievementSystem";

// The Clockwork: 4 switches must all be activated within a 12-second window.
// If the player fails, switches reset and the attempt counter increments.
// After all switches triggered simultaneously, the vault opens.
// Moving platforms assist reaching switches.

export class EscapeRoom4Scene extends PuzzleScene {
  private switchActivatedAt = new Map<string, number>();
  private readonly WINDOW_MS = 12000;
  private readonly SWITCH_COUNT = 4;
  private readonly SWITCH_IDS = ["switch-a", "switch-b", "switch-c", "switch-d"];
  private attempts = 0;
  private clockSolving = false;
  private attemptStart = 0;
  private countdownText!: Phaser.GameObjects.Text;
  private movingPlatforms: Array<{ rect: Phaser.GameObjects.Rectangle; body: Phaser.Physics.Arcade.StaticBody; dir: 1 | -1; min: number; max: number; axis: "x" | "y"; speed: number }> = [];

  public constructor() {
    super("EscapeRoom4Scene");
  }

  public override create(): void { super.create(); }

  protected hints: string[] = [
    "Step on the first switch to start the 12-second timer — plan your route before activating.",
    "Use the moving platforms to reach the higher switches quickly.",
    "All 4 switches must be hit within the same 12-second window. Study the layout first.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-4",
    title: "Level 4 — The Clockwork",
    width: 2880,
    height: 800,
    bgColor: 0x080509,
    accentColor: 0xf1c84b,
    spawnX: 100,
    spawnY: 700,
    nextScene: "EscapeRoom5Scene",
    checkpoints: [
      { id: "cp1", x: 760,  y: 525 },
      { id: "cp2", x: 1560, y: 475 },
      { id: "cp3", x: 2480, y: 465 },
    ],
    objectives: [
      { id: "reach-all-switches", description: "Find all 4 timing switches", completed: false },
      { id: "sync-switches", description: "Activate all within 12 seconds", completed: false },
      { id: "exit", description: "Reach the exit", completed: false }
    ],
    platforms: [
      { x: 0,    y: 736, width: 2880, height: 64 },
      // Left section
      { x: 120,  y: 620, width: 140, height: 18 },
      { x: 340,  y: 560, width: 120, height: 18 },
      { x: 560,  y: 620, width: 140, height: 18 },
      // Mid-left
      { x: 760,  y: 550, width: 160, height: 18 },
      { x: 1000, y: 490, width: 140, height: 18 },
      // Center platforms (wide for moving platform zones)
      { x: 1200, y: 560, width: 200, height: 18 },
      // Mid-right
      { x: 1560, y: 500, width: 160, height: 18 },
      { x: 1800, y: 560, width: 140, height: 18 },
      { x: 2040, y: 490, width: 140, height: 18 },
      // Right
      { x: 2240, y: 560, width: 180, height: 18 },
      { x: 2480, y: 490, width: 160, height: 18 },
      { x: 2680, y: 620, width: 180, height: 18 },
    ],
    entities: [
      // 4 switches in different areas
      {
        id: "switch-a",
        type: "pressure_switch",
        x: 360, y: 720,
        label: "SWITCH α",
        color: 0xf1c84b
      },
      {
        id: "switch-b",
        type: "pressure_switch",
        x: 1000, y: 720,
        label: "SWITCH β",
        color: 0xf1c84b
      },
      {
        id: "switch-c",
        type: "pressure_switch",
        x: 1800, y: 720,
        label: "SWITCH γ",
        color: 0xf1c84b
      },
      {
        id: "switch-d",
        type: "pressure_switch",
        x: 2480, y: 720,
        label: "SWITCH δ",
        color: 0xf1c84b
      },
      // Instruction sign
      {
        id: "sign-instruction",
        type: "text_sign",
        x: 100, y: 700,
        message: "The clockwork demands synchrony. Press all four switches within 12 seconds."
      },
      // Warning sign mid
      {
        id: "sign-mid",
        type: "text_sign",
        x: 1300, y: 540,
        message: "First switch starts the clock. 12 seconds remain."
      },
      // Vault door (opens when sync'd)
      {
        id: "sync-vault",
        type: "door",
        x: 2830, y: 680,
        width: 42, height: 120,
        label: "SYNC VAULT",
        locked: true
      },
      // Exit
      {
        id: "exit-portal",
        type: "portal",
        x: 2840, y: 700,
        label: "EXIT",
        targetScene: "EscapeRoom5Scene"
      },
      // Crystals as bonus collectibles
      {
        id: "crystal-clockwork",
        type: "crystal_shard",
        x: 760, y: 530,
        label: "Clockwork Gear"
      }
    ],
    clueTexts: [
      { x: 40, y: 708, text: "SYNC CHALLENGE: 12 second window", color: "#f1c84b" },
      { x: 2700, y: 706, text: "EXIT →", color: "#45f5c8" }
    ]
  };

  public override create() {
    super.create();
    this.createMovingPlatforms();
    this.createCountdown();
  }

  private createCountdown() {
    this.countdownText = this.add.text(this.scale.width / 2, 60, "", {
      fontFamily: "monospace", fontSize: "32px", color: "#f1c84b"
    }).setScrollFactor(0).setDepth(150).setOrigin(0.5).setVisible(false);
  }

  private createMovingPlatforms() {
    const configs = [
      { x: 440, y: 590, w: 120, h: 18, axis: "x" as const, min: 340, max: 560, speed: 80 },
      { x: 880, y: 520, w: 120, h: 18, axis: "x" as const, min: 780, max: 1000, speed: 100 },
      { x: 1400, y: 520, w: 120, h: 18, axis: "y" as const, min: 490, max: 580, speed: 60 },
      { x: 2160, y: 520, w: 120, h: 18, axis: "x" as const, min: 2060, max: 2280, speed: 90 },
    ];

    for (const cfg of configs) {
      const rect = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0x1a2e42);
      rect.setStrokeStyle(2, 0xf1c84b, 0.8);
      rect.setDepth(5);
      this.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      this.physics.add.collider(this.player, rect);
      this.movingPlatforms.push({ rect, body, dir: 1, min: cfg.min, max: cfg.max, axis: cfg.axis, speed: cfg.speed });
    }
  }

  public override update(time: number, delta: number) {
    super.update(time, delta);
    this.updateMovingPlatforms(delta);
    this.updateCountdown(time);
  }

  private updateMovingPlatforms(delta: number) {
    for (const mp of this.movingPlatforms) {
      const dt = delta / 1000;
      if (mp.axis === "x") {
        mp.rect.x += mp.dir * mp.speed * dt;
        if (mp.rect.x >= mp.max) { mp.rect.x = mp.max; mp.dir = -1; }
        if (mp.rect.x <= mp.min) { mp.rect.x = mp.min; mp.dir = 1; }
      } else {
        mp.rect.y += mp.dir * mp.speed * dt;
        if (mp.rect.y >= mp.max) { mp.rect.y = mp.max; mp.dir = -1; }
        if (mp.rect.y <= mp.min) { mp.rect.y = mp.min; mp.dir = 1; }
      }
      mp.body.reset(mp.rect.x, mp.rect.y);
    }
  }

  private updateCountdown(time: number) {
    if (!this.clockSolving) return;
    const elapsed = time - this.attemptStart;
    const remaining = Math.max(0, (this.WINDOW_MS - elapsed) / 1000);
    this.countdownText.setText(`⏱ ${remaining.toFixed(1)}s`);

    if (remaining <= 0 && !this.checkSync(time)) {
      this.resetSwitches();
    }
  }

  protected override onEntityActivated(id: string, time: number) {
    if (!this.SWITCH_IDS.includes(id)) {
      super.onEntityActivated(id, time);
      return;
    }

    if (!this.clockSolving) {
      this.clockSolving = true;
      this.attemptStart = time;
      this.attempts++;
      this.countdownText.setVisible(true);
      this.notify(`Clock started! ${this.WINDOW_MS / 1000}s to hit all switches. (Attempt ${this.attempts})`);
    }

    this.switchActivatedAt.set(id, time);
    this.notify(`Switch ${id.replace("switch-", "").toUpperCase()} activated!`);

    this.engine.completeObjective("reach-all-switches");
    this.checkSync(time);
  }

  private checkSync(time: number): boolean {
    if (this.switchActivatedAt.size < this.SWITCH_COUNT) return false;

    const times = [...this.switchActivatedAt.values()];
    const min = Math.min(...times);
    const max = Math.max(...times);

    if (max - min <= this.WINDOW_MS) {
      this.onSyncSuccess();
      return true;
    }
    return false;
  }

  private onSyncSuccess() {
    this.clockSolving = false;
    this.countdownText.setVisible(false);
    this.notify("SYNCHRONIZED! Vault opening!");
    achievementSystem.checkClockworkFirstTry(this.attempts === 1);
    this.engine.forceUnlock("sync-vault");
    this.entities.unlock("sync-vault");
    this.engine.completeObjective("sync-switches");

    // Victory flash
    this.cameras.main.flash(600, 241, 200, 75);
    this.checkObjectives();
  }

  private resetSwitches() {
    this.clockSolving = false;
    this.switchActivatedAt.clear();
    this.countdownText.setVisible(false);
    this.notify(`Time's up! Switches reset. (Attempt ${this.attempts})`);

    // Re-activate switches visually (deactivate all)
    for (const id of this.SWITCH_IDS) {
      if (this.engine.isSwitchActive(id)) {
        this.entities.activate(id); // toggle off
      }
    }
  }

  protected override checkObjectives() {
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
