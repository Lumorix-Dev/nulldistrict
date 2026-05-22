import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";

export class EscapeRoom1Scene extends PuzzleScene {
  public constructor() {
    super("EscapeRoom1Scene");
  }

  public override create(): void {
    super.create();
    this.addTutorialBadge();
    this.addBlinkingArrow();
  }

  /** "Tutorial" badge pinned to top-right of screen */
  private addTutorialBadge() {
    const x = this.scale.width - 16;
    const y = 16;
    const bg = this.add.rectangle(x - 44, y + 10, 90, 22, 0x1a0d2e, 0.9)
      .setStrokeStyle(1, 0x9b00ff, 0.9)
      .setScrollFactor(0)
      .setDepth(200);
    const txt = this.add.text(x, y + 4, "🎓 Tutorial", {
      fontFamily: "monospace", fontSize: "11px", color: "#cc66ff",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(201);
    void bg; void txt;
  }

  /**
   * Yellow blinking arrow pointing at the first key (relay-key at 480, 365).
   * Blinks for 10 seconds or until the player first interacts with anything.
   */
  private addBlinkingArrow() {
    const targetX = 480;
    const targetY = 365;
    const arrowY = targetY - 48;

    const gfx = this.add.graphics().setDepth(50);

    const drawArrow = () => {
      gfx.clear();
      // Downward-pointing triangle
      gfx.fillStyle(0xffe066, 1);
      gfx.fillTriangle(
        targetX, arrowY + 24,
        targetX - 12, arrowY,
        targetX + 12, arrowY
      );
      // Shaft
      gfx.fillRect(targetX - 4, arrowY - 14, 8, 16);
    };
    drawArrow();

    const blinkTween = this.tweens.add({
      targets: gfx,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Remove after 10 seconds
    this.time.delayedCall(10000, () => {
      blinkTween.stop();
      gfx.destroy();
    });

    // Remove on first F-key interaction
    const cleanup = () => {
      blinkTween.stop();
      if (gfx.active) gfx.destroy();
    };
    this.input.keyboard!.once("keydown-F", cleanup);
  }

  protected hints: string[] = [
    "Look around the room carefully — both keys are hidden on platforms throughout the level.",
    "Both keys are needed to power the junction lever. Check all platforms, high and low.",
    "The lever is at the right end of the level. Activate it once both keys are collected.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-1",
    title: "Level 1 — The Signal Lock",
    width: 1920,
    height: 640,
    bgColor: 0x05070b,
    accentColor: 0x9be7ff,
    spawnX: 80,
    spawnY: 520,
    nextScene: "EscapeRoom2Scene",
    checkpoints: [
      { id: "cp1", x: 480,  y: 545 },
      { id: "cp2", x: 1100, y: 420 },
      { id: "cp3", x: 1540, y: 440 },
    ],
    objectives: [
      { id: "get-key-a", description: "Find the Relay Key", completed: false },
      { id: "get-key-b", description: "Find the Bypass Key", completed: false },
      { id: "activate-lever", description: "Activate the junction lever", completed: false },
      { id: "open-exit", description: "Open the exit door", completed: false }
    ],
    platforms: [
      // Ground
      { x: 0,    y: 576, width: 1920, height: 64 },
      // Platforms
      { x: 200,  y: 460, width: 160,  height: 18 },
      { x: 480,  y: 400, width: 140,  height: 18 },
      { x: 700,  y: 460, width: 120,  height: 18 },
      { x: 880,  y: 380, width: 180,  height: 18 },
      { x: 1100, y: 440, width: 140,  height: 18 },
      { x: 1300, y: 380, width: 200,  height: 18 },
      { x: 1540, y: 460, width: 140,  height: 18 },
      { x: 1720, y: 400, width: 160,  height: 18 },
      // Walls / barriers
      { x: 620,  y: 480, width: 18,   height: 100 }, // wall before first key zone
      { x: 1060, y: 400, width: 18,   height: 180 }, // wall between areas
    ],
    entities: [
      // First key on a platform
      {
        id: "relay-key",
        type: "key",
        x: 480, y: 365,
        label: "Relay Key",
        color: 0xffe066
      },
      // Second key - behind a lever
      {
        id: "bypass-key",
        type: "key",
        x: 1310, y: 345,
        label: "Bypass Key",
        color: 0xffe066
      },
      // Sign near start
      {
        id: "sign-start",
        type: "text_sign",
        x: 200, y: 545,
        message: "The signal is locked. Find the Relay Key and the Bypass Key to open the exit."
      },
      // Lever that opens a locked door in the middle
      {
        id: "junction-lever",
        type: "lever",
        x: 900, y: 345,
        label: "Junction Lever",
        linkedTo: ["mid-door"]
      },
      // Mid-area locked door
      {
        id: "mid-door",
        type: "door",
        x: 1060, y: 480,
        width: 42, height: 96,
        label: "Junction Gate",
        locked: true
      },
      // Exit door (requires both keys)
      {
        id: "exit-door",
        type: "door",
        x: 1870, y: 500,
        width: 42, height: 80,
        label: "EXIT",
        requiredKey: "relay-key",
        locked: true
      },
      // Clue sign near the lever
      {
        id: "sign-lever",
        type: "text_sign",
        x: 820, y: 540,
        message: "The junction accepts force. A lever nearby controls the gate."
      },
      // A crystal collectible (bonus)
      {
        id: "crystal-a",
        type: "crystal_shard",
        x: 700, y: 440,
        label: "Signal Fragment"
      }
    ],
    clueTexts: [
      { x: 40, y: 540, text: "WASD/Arrows: Move | Space: Jump | F: Interact" },
      { x: 1650, y: 540, text: "EXIT →" }
    ]
  };

  protected override checkObjectives() {
    const engine = this.engine;
    if (engine.hasItem("relay-key")) engine.completeObjective("get-key-a");
    if (engine.hasItem("bypass-key")) engine.completeObjective("get-key-b");
    if (engine.isSwitchActive("junction-lever")) engine.completeObjective("activate-lever");
    if (!this.entities.isLocked("exit-door")) engine.completeObjective("open-exit");

    if (engine.allObjectivesComplete()) this.onPuzzleComplete();
  }

  protected override onDoorEntered(doorId: string) {
    if (doorId === "exit-door") {
      // Both keys needed: relay-key was used to unlock, now use bypass-key too
      if (this.engine.hasItem("bypass-key")) {
        this.engine.completeObjective("open-exit");
        super.onDoorEntered(doorId);
      } else {
        this.notify("The second lock requires the Bypass Key.");
      }
    } else {
      super.onDoorEntered(doorId);
    }
  }
}
