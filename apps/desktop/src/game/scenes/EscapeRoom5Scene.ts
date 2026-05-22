import { PuzzleScene, type RoomDefinition } from "./PuzzleScene";

// The Void Core - Final level combining ALL mechanics:
// 1. Find 3 Core Shards (like crystals from level 3)
// 2. Activate 2 pressure plates to unlock access to the core room
// 3. Solve a 4-digit code: "0451" (clues scattered across the room)
// 4. Activate 3 levers in correct order: lever-alpha, lever-omega, lever-sigma
// 5. Use the Core Key (found in a chest) to unlock the Void Gate (exit)

export class EscapeRoom5Scene extends PuzzleScene {
  private readonly LEVER_ORDER = ["lever-alpha", "lever-omega", "lever-sigma"];
  private leverSequence: string[] = [];
  private leverSolved = false;
  private shardsCollected = 0;

  public constructor() {
    super("EscapeRoom5Scene");
  }

  public override create(): void { super.create(); }

  protected hints: string[] = [
    "Five sections: Shards → Power Plates → Code Panel → Levers → Vault. Take them in order.",
    "The void code is 0451. Look for clue signs scattered across the code room.",
    "The lever sequence is α → Ω → Σ. Wrong order resets the sequence.",
  ];

  protected definition: RoomDefinition = {
    id: "escape-room-5",
    title: "Level 5 — The Void Core",
    width: 3200,
    height: 864,
    bgColor: 0x030206,
    accentColor: 0x9b00ff,
    spawnX: 100,
    spawnY: 760,
    nextScene: "VoidCraftMenuScene",
    checkpoints: [
      { id: "cp1", x: 880,  y: 645 },
      { id: "cp2", x: 1580, y: 620 },
      { id: "cp3", x: 2280, y: 595 },
      { id: "cp4", x: 2920, y: 595 },
    ],
    objectives: [
      { id: "collect-core-shards", description: "Collect 3 Core Shards", completed: false },
      { id: "power-plates", description: "Activate both power plates", completed: false },
      { id: "crack-code", description: "Crack the Void Code", completed: false },
      { id: "solve-levers", description: "Solve the lever sequence", completed: false },
      { id: "get-core-key", description: "Retrieve the Core Key", completed: false },
      { id: "open-void-gate", description: "Open the Void Gate", completed: false }
    ],
    platforms: [
      { x: 0,    y: 800, width: 3200, height: 64 },
      // Section 1 - Shard Hunt
      { x: 80,   y: 680, width: 140, height: 18 },
      { x: 300,  y: 620, width: 120, height: 18 },
      { x: 500,  y: 680, width: 140, height: 18 },
      { x: 700,  y: 580, width: 120, height: 18 },
      // Section 2 - Power Plates
      { x: 880,  y: 640, width: 18,  height: 164 }, // wall
      { x: 940,  y: 680, width: 160, height: 18 },
      { x: 1160, y: 620, width: 140, height: 18 },
      { x: 1380, y: 680, width: 160, height: 18 },
      // Section 3 - Code Room
      { x: 1580, y: 640, width: 18,  height: 164 }, // wall
      { x: 1640, y: 660, width: 200, height: 18 },
      { x: 1900, y: 600, width: 160, height: 18 },
      { x: 2100, y: 660, width: 140, height: 18 },
      // Section 4 - Lever Chamber
      { x: 2280, y: 620, width: 18,  height: 184 }, // wall
      { x: 2340, y: 660, width: 160, height: 18 },
      { x: 2560, y: 600, width: 140, height: 18 },
      { x: 2740, y: 660, width: 140, height: 18 },
      // Section 5 - Vault
      { x: 2920, y: 620, width: 18,  height: 184 }, // wall
      { x: 2980, y: 660, width: 200, height: 18 },
    ],
    entities: [
      // ── Section 1: Core Shards ─────────────────────────────────────────
      {
        id: "core-shard-1",
        type: "crystal_shard",
        x: 300, y: 600,
        label: "Core Shard",
        color: 0x9b00ff
      },
      {
        id: "core-shard-2",
        type: "crystal_shard",
        x: 700, y: 560,
        label: "Core Shard",
        color: 0x9b00ff
      },
      {
        id: "sign-intro",
        type: "text_sign",
        x: 80, y: 760,
        message: "The Void Core has fractured. Five challenges await. Begin."
      },

      // ── Section 2: Power Plates ────────────────────────────────────────
      {
        id: "plate-north",
        type: "pressure_plate",
        x: 960, y: 796,
        label: "NORTH PLATE",
        linkedTo: ["plate-gate"]
      },
      {
        id: "plate-south",
        type: "pressure_plate",
        x: 1380, y: 796,
        label: "SOUTH PLATE",
        linkedTo: ["plate-gate"]
      },
      {
        id: "plate-gate",
        type: "door",
        x: 1580, y: 720,
        width: 42, height: 164,
        label: "POWER GATE",
        locked: true
      },
      // Third shard behind plates area
      {
        id: "core-shard-3",
        type: "crystal_shard",
        x: 1160, y: 600,
        label: "Core Shard",
        color: 0x9b00ff
      },
      {
        id: "sign-plates",
        type: "text_sign",
        x: 940, y: 750,
        message: "Two plates must bear weight simultaneously to unlock the gate."
      },

      // ── Section 3: Code Room ───────────────────────────────────────────
      // Code: 0451 — clues: 4 signs each reveal one digit
      {
        id: "sign-code-1",
        type: "text_sign",
        x: 1640, y: 620,
        message: "VOID LOG: The year the district was sealed → 0"
      },
      {
        id: "sign-code-2",
        type: "text_sign",
        x: 1900, y: 560,
        message: "DISTRICT ARCHIVE: Number of original relay nodes → 4"
      },
      {
        id: "sign-code-3",
        type: "text_sign",
        x: 2100, y: 620,
        message: "SIGNAL TRACE: Sector ID of the first breach → 5"
      },
      {
        id: "sign-code-4",
        type: "text_sign",
        x: 1760, y: 776,
        message: "CORE INDEX: Void Core sequence number → 1"
      },
      {
        id: "code-panel-void",
        type: "code_panel",
        x: 2100, y: 620,
        label: "VOID PANEL",
        code: "0451",
        linkedTo: ["code-gate"]
      },
      {
        id: "code-gate",
        type: "door",
        x: 2280, y: 720,
        width: 42, height: 184,
        label: "CODE GATE",
        locked: true
      },

      // ── Section 4: Lever Chamber ───────────────────────────────────────
      {
        id: "lever-alpha",
        type: "lever",
        x: 2400, y: 624,
        label: "α ALPHA",
        color: 0xff1a4b
      },
      {
        id: "lever-omega",
        type: "lever",
        x: 2560, y: 564,
        label: "Ω OMEGA",
        color: 0xffe066
      },
      {
        id: "lever-sigma",
        type: "lever",
        x: 2740, y: 624,
        label: "Σ SIGMA",
        color: 0x7df9ff
      },
      {
        id: "sign-levers",
        type: "text_sign",
        x: 2360, y: 760,
        message: "The void speaks first, ends last, resonates between. α → Ω → Σ"
      },
      {
        id: "lever-gate",
        type: "door",
        x: 2920, y: 720,
        width: 42, height: 184,
        label: "LEVER GATE",
        locked: true
      },

      // ── Section 5: Vault ───────────────────────────────────────────────
      {
        id: "core-chest",
        type: "chest",
        x: 3060, y: 760,
        label: "Core Vault",
        items: ["core-key"],
        message: "You found the Core Key!"
      },
      {
        id: "void-gate",
        type: "door",
        x: 3150, y: 760,
        width: 42, height: 104,
        label: "VOID GATE",
        requiredKey: "core-key",
        locked: true
      },
      {
        id: "sign-final",
        type: "text_sign",
        x: 2980, y: 700,
        message: "The void acknowledges you. Take the key. Leave this place."
      }
    ],
    clueTexts: [
      { x: 40, y: 764, text: "SECTION 1: Shards", color: "#9b00ff" },
      { x: 920, y: 764, text: "SECTION 2: Power", color: "#9b00ff" },
      { x: 1640, y: 764, text: "SECTION 3: Code", color: "#9b00ff" },
      { x: 2340, y: 764, text: "SECTION 4: Levers", color: "#9b00ff" },
      { x: 2980, y: 764, text: "SECTION 5: Vault", color: "#9b00ff" },
      { x: 3100, y: 750, text: "EXIT →", color: "#45f5c8" }
    ]
  };

  private platesActiveCount = 0;
  private bothPlatesActive = false;

  protected override onEntityActivated(id: string, time: number) {
    if (id === "plate-north" || id === "plate-south") {
      // Count simultaneous active plates
      const northActive = this.entities.isActive("plate-north");
      const southActive = this.entities.isActive("plate-south");
      const count = (northActive ? 1 : 0) + (southActive ? 1 : 0);
      this.platesActiveCount = count;

      if (count >= 2 && !this.bothPlatesActive) {
        this.bothPlatesActive = true;
        this.engine.forceUnlock("plate-gate");
        this.entities.unlock("plate-gate");
        this.notify("Both power plates active — gate open!");
        this.engine.completeObjective("power-plates");
        this.checkObjectives();
      }
      return;
    }

    if (this.LEVER_ORDER.includes(id)) {
      this.handleLever(id);
      return;
    }

    super.onEntityActivated(id, time);
  }

  private handleLever(id: string) {
    if (this.leverSolved) { this.notify("Lever sequence already solved."); return; }

    this.leverSequence.push(id);
    const idx = this.leverSequence.length - 1;

    if (this.leverSequence[idx] !== this.LEVER_ORDER[idx]) {
      this.leverSequence = [];
      this.notify("Wrong sequence! Try again: α → Ω → Σ");
      return;
    }

    this.entities.activate(id);
    this.engine.activateSwitch(id);
    this.notify(`${id.replace("lever-", "").toUpperCase()} activated (${this.leverSequence.length}/3)`);

    if (this.leverSequence.length === 3) {
      this.leverSolved = true;
      this.engine.completeObjective("solve-levers");
      this.engine.forceUnlock("lever-gate");
      this.entities.unlock("lever-gate");
      this.notify("Lever sequence complete! Lever Gate open!");
      this.cameras.main.flash(400, 155, 0, 255);
      this.checkObjectives();
    }
  }

  protected override tryInteract(time: number) {
    const entity = this.entities.getEntityAt(this.player.x, this.player.y, 80);

    if (entity?.def.id.startsWith("core-shard-") && !this.entities.isCollected(entity.def.id)) {
      super.tryInteract(time);
      this.shardsCollected++;
      this.notify(`Core Shard ${this.shardsCollected}/3 collected!`);
      if (this.shardsCollected >= 3) {
        this.engine.completeObjective("collect-core-shards");
      }
      this.checkObjectives();
      return;
    }

    if (entity?.def.type === "lever" && this.LEVER_ORDER.includes(entity.def.id)) {
      this.handleLever(entity.def.id);
      return;
    }

    super.tryInteract(time);
  }

  protected override checkObjectives() {
    if (this.shardsCollected >= 3) this.engine.completeObjective("collect-core-shards");
    if (this.engine.hasItem("core-key")) this.engine.completeObjective("get-core-key");
    if (this.engine.isPanelSolved("code-panel-void")) this.engine.completeObjective("crack-code");
    if (!this.entities.isLocked("void-gate")) this.engine.completeObjective("open-void-gate");

    if (this.engine.allObjectivesComplete()) this.onPuzzleComplete();
  }

  protected override onPuzzleComplete() {
    super.onPuzzleComplete();
    // Extra effect for final level
    this.cameras.main.flash(1200, 155, 0, 255);
  }
}
