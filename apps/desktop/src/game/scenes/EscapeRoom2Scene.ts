import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";

// The hidden code is scattered across 4 signs as single digits.
// Players must read all 4 signs (in any order) and then enter the code at the panel.
// Code: 7 3 9 1  → "7391"
// Signs reveal: sign-a=7, sign-b=3, sign-c=9, sign-d=1
// Pressure plates must all be activated first to reveal the code panel.

export class EscapeRoom2Scene extends PuzzleScene {
  public constructor() {
    super("EscapeRoom2Scene");
  }

  protected hints: string[] = [
    "The digits for the code are scattered across 4 signs — read them all before entering the code.",
    "You need to step on both pressure plates to unlock the code panel. They are spread far apart.",
    "The code is 4 digits. Look for numbered signs to piece together the sequence.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-2",
    title: "Level 2 — The Code Chamber",
    width: 2240,
    height: 720,
    bgColor: 0x060410,
    accentColor: 0xd18cff,
    spawnX: 80,
    spawnY: 600,
    nextScene: "EscapeRoom3Scene",
    checkpoints: [
      { id: "cp1", x: 600,  y: 625 },
      { id: "cp2", x: 1220, y: 430 },
      { id: "cp3", x: 1840, y: 515 },
    ],
    objectives: [
      { id: "find-all-digits", description: "Find all 4 code digits", completed: false },
      { id: "activate-all-plates", description: "Activate all pressure plates", completed: false },
      { id: "enter-code", description: "Enter the correct code", completed: false },
      { id: "exit", description: "Reach the exit", completed: false }
    ],
    platforms: [
      // Ground
      { x: 0,    y: 656, width: 2240, height: 64 },
      // Platform network
      { x: 160,  y: 540, width: 130,  height: 18 },
      { x: 380,  y: 480, width: 140,  height: 18 },
      { x: 600,  y: 540, width: 120,  height: 18 },
      { x: 800,  y: 460, width: 160,  height: 18 },
      { x: 1020, y: 520, width: 140,  height: 18 },
      { x: 1220, y: 450, width: 120,  height: 18 },
      { x: 1400, y: 530, width: 160,  height: 18 },
      { x: 1620, y: 460, width: 140,  height: 18 },
      { x: 1840, y: 540, width: 160,  height: 18 },
      { x: 2040, y: 460, width: 160,  height: 18 },
      // Dividing walls
      { x: 740,  y: 560, width: 18,   height: 100 },
      { x: 1360, y: 540, width: 18,   height: 120 },
      { x: 1960, y: 480, width: 18,   height: 180 },
    ],
    entities: [
      // 4 pressure plates (scattered around level)
      {
        id: "plate-alpha",
        type: "pressure_plate",
        x: 240, y: 640,
        label: "α",
        linkedTo: []
      },
      {
        id: "plate-beta",
        type: "pressure_plate",
        x: 800, y: 636,
        label: "β",
        linkedTo: []
      },
      {
        id: "plate-gamma",
        type: "pressure_plate",
        x: 1400, y: 636,
        label: "γ",
        linkedTo: []
      },
      {
        id: "plate-delta",
        type: "pressure_plate",
        x: 1840, y: 636,
        label: "δ",
        linkedTo: []
      },
      // Code digits hidden as text signs
      {
        id: "sign-digit-a",
        type: "text_sign",
        x: 380, y: 440,
        message: "Corrupted log entry #1: FIRST DIGIT → 7"
      },
      {
        id: "sign-digit-b",
        type: "text_sign",
        x: 800, y: 420,
        message: "Relay node log #2: SECOND DIGIT → 3"
      },
      {
        id: "sign-digit-c",
        type: "text_sign",
        x: 1220, y: 410,
        message: "Archive fragment: THIRD DIGIT → 9"
      },
      {
        id: "sign-digit-d",
        type: "text_sign",
        x: 2040, y: 420,
        message: "Final broadcast: FOURTH DIGIT → 1"
      },
      // The code panel - only accessible after all plates activated
      {
        id: "code-panel",
        type: "code_panel",
        x: 1620, y: 420,
        label: "Code Panel",
        code: "7391",
        linkedTo: ["vault-door"]
      },
      // Hint sign near panel
      {
        id: "sign-panel-hint",
        type: "text_sign",
        x: 1500, y: 540,
        message: "Stand on all four pressure plates. Then enter the four-digit code."
      },
      // Vault door (opened by code panel)
      {
        id: "vault-door",
        type: "door",
        x: 1960, y: 560,
        width: 42, height: 96,
        label: "VAULT GATE",
        locked: true
      },
      // Exit portal
      {
        id: "exit-portal",
        type: "portal",
        x: 2180, y: 620,
        label: "EXIT",
        targetScene: "EscapeRoom3Scene"
      },
      // Collectible crystals on each platform
      {
        id: "crystal-1",
        type: "crystal_shard",
        x: 600, y: 520,
        label: "Code Shard"
      },
      {
        id: "crystal-2",
        type: "crystal_shard",
        x: 1020, y: 480,
        label: "Code Shard"
      }
    ],
    clueTexts: [
      { x: 40, y: 624, text: "Activate all pressure plates to power the code panel." },
      { x: 2100, y: 616, text: "EXIT →", color: "#45f5c8" }
    ]
  };

  private platesActivated = new Set<string>();
  private digitsFound = new Set<string>();

  protected override onEntityActivated(id: string, time: number) {
    super.onEntityActivated(id, time);
    if (id.startsWith("plate-")) {
      this.platesActivated.add(id);
      this.notify(`Plate ${id.split("-")[1]?.toUpperCase()} activated!`);
      this.checkObjectives();
    }
  }

  protected override tryInteract(time: number) {
    const entity = this.entities.getEntityAt(this.player.x, this.player.y, 80);
    if (entity?.def.id.startsWith("sign-digit-")) {
      this.digitsFound.add(entity.def.id);
    }
    // Only allow code panel if all plates active
    if (entity?.def.type === "code_panel") {
      if (this.platesActivated.size < 4) {
        this.notify("All four pressure plates must be active first!");
        return;
      }
    }
    super.tryInteract(time);
  }

  protected override checkObjectives() {
    if (this.digitsFound.size >= 4) this.engine.completeObjective("find-all-digits");
    if (this.platesActivated.size >= 4) this.engine.completeObjective("activate-all-plates");
    if (this.engine.isPanelSolved("code-panel")) this.engine.completeObjective("enter-code");
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
