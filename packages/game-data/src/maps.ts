import type { AreaId } from "@nulldistrict/shared";

export interface RectDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractableDef {
  id: string;
  type: "npc" | "terminal" | "relay" | "transition" | "safe-point" | "pickup";
  x: number;
  y: number;
  label: string;
  targetArea?: AreaId;
  text?: string[];
  itemId?: string;
  questId?: string;
  puzzleId?: string;
  action?: "open-shop" | "extract-case" | "sync-node";
}

export interface EnemySpawnDef {
  id: string;
  kind: "corrupted-scout" | "signal-wraith";
  x: number;
  y: number;
  patrolMin: number;
  patrolMax: number;
  hp: number;
}

export interface AreaDefinition {
  id: AreaId;
  title: string;
  subtitle: string;
  pvpEnabled: boolean;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  safePoint: { x: number; y: number };
  background: string;
  platforms: RectDef[];
  interactables: InteractableDef[];
  enemySpawns: EnemySpawnDef[];
}

export const areaDefinitions: AreaDefinition[] = [
  {
    id: "signal-haven",
    title: "Signal Haven",
    subtitle: "A dim shelter at the district edge.",
    pvpEnabled: false,
    width: 2400,
    height: 720,
    spawn: { x: 180, y: 500 },
    safePoint: { x: 180, y: 500 },
    background: "haven",
    platforms: [
      { x: 0, y: 640, width: 2400, height: 80 },
      { x: 360, y: 530, width: 220, height: 22 },
      { x: 760, y: 470, width: 260, height: 22 },
      { x: 1180, y: 560, width: 320, height: 22 }
    ],
    interactables: [
      {
        id: "npc-warden-io",
        type: "npc",
        x: 260,
        y: 590,
        label: "Warden IO",
        text: [
          "You heard it too, then. The First Signal crossed the seal.",
          "Move east. Restore nothing unless you are ready for the district to answer."
        ]
      },
      {
        id: "case-extraction-gate",
        type: "terminal",
        x: 390,
        y: 588,
        label: "Extraction Gate",
        action: "extract-case",
        text: [
          "CASE EXTRACTION: waiting for proof.",
          "Return with fragments, decoded terminal data and the Relay Core."
        ]
      },
      {
        id: "haven-terminal",
        type: "terminal",
        x: 520,
        y: 488,
        label: "Shelter Terminal",
        questId: "enter-null-district",
        text: [
          "LUMORIX RELAY NET: offline.",
          "Unknown packet repeats: The district remembers you."
        ]
      },
      {
        id: "null-market-terminal",
        type: "terminal",
        x: 680,
        y: 428,
        label: "Null Market",
        action: "open-shop",
        text: [
          "Supporter cosmetics only.",
          "No premium item can make your tools stronger."
        ]
      },
      {
        id: "tutorial-med-patch",
        type: "pickup",
        x: 820,
        y: 426,
        label: "Med Patch",
        itemId: "med_patch"
      },
      {
        id: "to-district-entrance",
        type: "transition",
        x: 2180,
        y: 590,
        label: "District Entrance",
        targetArea: "district-entrance"
      }
    ],
    enemySpawns: []
  },
  {
    id: "district-entrance",
    title: "District Entrance",
    subtitle: "Broken streets under a sealed sky.",
    pvpEnabled: false,
    width: 3200,
    height: 820,
    spawn: { x: 180, y: 600 },
    safePoint: { x: 140, y: 600 },
    background: "entrance",
    platforms: [
      { x: 0, y: 740, width: 3200, height: 80 },
      { x: 480, y: 610, width: 280, height: 22 },
      { x: 910, y: 540, width: 260, height: 22 },
      { x: 1380, y: 630, width: 360, height: 22 },
      { x: 1940, y: 560, width: 380, height: 22 },
      { x: 2560, y: 640, width: 300, height: 22 }
    ],
    interactables: [
      {
        id: "first-relay",
        type: "relay",
        x: 1220,
        y: 694,
        label: "First Relay",
        questId: "restore-first-relay",
        puzzleId: "first-relay-harmonics",
        text: [
          "The relay is not broken. It is waiting for the right signal order.",
          "Three clean pulses can open the route below."
        ]
      },
      {
        id: "fragment-a",
        type: "pickup",
        x: 620,
        y: 566,
        label: "Evidence Fragment",
        itemId: "signal_fragment",
        questId: "collect-signal-fragments"
      },
      {
        id: "fragment-b",
        type: "pickup",
        x: 1500,
        y: 586,
        label: "Evidence Fragment",
        itemId: "signal_fragment",
        questId: "collect-signal-fragments"
      },
      {
        id: "street-med-patch",
        type: "pickup",
        x: 1040,
        y: 496,
        label: "Med Patch",
        itemId: "med_patch"
      },
      {
        id: "fragment-c",
        type: "pickup",
        x: 2060,
        y: 516,
        label: "Evidence Fragment",
        itemId: "signal_fragment",
        questId: "collect-signal-fragments"
      },
      {
        id: "to-hub",
        type: "transition",
        x: 80,
        y: 690,
        label: "Signal Haven",
        targetArea: "signal-haven"
      },
      {
        id: "to-sector-a",
        type: "transition",
        x: 3010,
        y: 690,
        label: "Underground Sector A",
        targetArea: "underground-sector-a"
      }
    ],
    enemySpawns: [
      {
        id: "corrupted-scout-1",
        kind: "corrupted-scout",
        x: 1780,
        y: 688,
        patrolMin: 1520,
        patrolMax: 2060,
        hp: 90
      },
      {
        id: "corrupted-scout-2",
        kind: "corrupted-scout",
        x: 2440,
        y: 690,
        patrolMin: 2200,
        patrolMax: 2780,
        hp: 110
      }
    ]
  },
  {
    id: "underground-sector-a",
    title: "Underground Sector A",
    subtitle: "Maintenance tunnels listening to themselves.",
    pvpEnabled: false,
    width: 2900,
    height: 880,
    spawn: { x: 180, y: 650 },
    safePoint: { x: 190, y: 650 },
    background: "sector-a",
    platforms: [
      { x: 0, y: 800, width: 2900, height: 80 },
      { x: 420, y: 685, width: 260, height: 22 },
      { x: 840, y: 590, width: 280, height: 22 },
      { x: 1370, y: 680, width: 300, height: 22 },
      { x: 2050, y: 610, width: 380, height: 22 }
    ],
    interactables: [
      {
        id: "broken-terminal-a",
        type: "terminal",
        x: 920,
        y: 548,
        label: "Broken Terminal",
        questId: "read-broken-terminal",
        puzzleId: "broken-terminal-memory-lock",
        text: [
          "LOG: Staff evacuation denied by command nobody recognizes.",
          "The readable memory cells are out of order."
        ]
      },
      {
        id: "sector-core",
        type: "pickup",
        x: 2230,
        y: 566,
        label: "Relay Core",
        itemId: "relay_core"
      },
      {
        id: "sector-med-patch",
        type: "pickup",
        x: 1450,
        y: 636,
        label: "Med Patch",
        itemId: "med_patch"
      },
      {
        id: "to-entrance",
        type: "transition",
        x: 80,
        y: 750,
        label: "District Entrance",
        targetArea: "district-entrance"
      },
      {
        id: "to-pvp",
        type: "transition",
        x: 2640,
        y: 750,
        label: "PvP Breach Zone",
        targetArea: "pvp-breach-zone"
      },
      {
        id: "to-mirror-archive",
        type: "transition",
        x: 2820,
        y: 750,
        label: "Mirror Archive",
        targetArea: "mirror-archive"
      }
    ],
    enemySpawns: [
      {
        id: "wraith-a",
        kind: "signal-wraith",
        x: 1600,
        y: 750,
        patrolMin: 1320,
        patrolMax: 1900,
        hp: 120
      },
      {
        id: "wraith-b",
        kind: "signal-wraith",
        x: 2340,
        y: 560,
        patrolMin: 2060,
        patrolMax: 2580,
        hp: 145
      }
    ]
  },
  {
    id: "mirror-archive",
    title: "Mirror Archive",
    subtitle: "A copied facility that remembers player routes.",
    pvpEnabled: false,
    width: 3800,
    height: 920,
    spawn: { x: 180, y: 690 },
    safePoint: { x: 160, y: 690 },
    background: "archive",
    platforms: [
      { x: 0, y: 840, width: 3800, height: 80 },
      { x: 360, y: 710, width: 260, height: 22 },
      { x: 760, y: 620, width: 300, height: 22 },
      { x: 1220, y: 700, width: 320, height: 22 },
      { x: 1740, y: 610, width: 340, height: 22 },
      { x: 2280, y: 700, width: 340, height: 22 },
      { x: 2920, y: 620, width: 360, height: 22 }
    ],
    interactables: [
      {
        id: "archive-entry-log",
        type: "terminal",
        x: 340,
        y: 668,
        label: "Archive Entry Log",
        questId: "enter-mirror-archive",
        text: [
          "ARCHIVE ROUTE: live copy detected.",
          "Your previous extraction created a second path. It is trying to replay you."
        ]
      },
      {
        id: "echo-residue-a",
        type: "pickup",
        x: 500,
        y: 666,
        label: "Echo Residue",
        itemId: "echo_residue",
        questId: "scan-echo-residue"
      },
      {
        id: "echo-residue-b",
        type: "pickup",
        x: 940,
        y: 576,
        label: "Echo Residue",
        itemId: "echo_residue",
        questId: "scan-echo-residue"
      },
      {
        id: "archive-sync-west",
        type: "relay",
        x: 1320,
        y: 654,
        label: "West Sync Node",
        action: "sync-node",
        puzzleId: "archive-twin-sync",
        text: [
          "WEST NODE: needs a second operator on the mirrored node.",
          "Hold both nodes in the same instance to create the Archive Key."
        ]
      },
      {
        id: "archive-sync-east",
        type: "relay",
        x: 2140,
        y: 654,
        label: "East Sync Node",
        action: "sync-node",
        puzzleId: "archive-twin-sync",
        text: [
          "EAST NODE: waiting for split operator confirmation.",
          "This lock is intentionally co-op first."
        ]
      },
      {
        id: "echo-residue-c",
        type: "pickup",
        x: 1880,
        y: 566,
        label: "Echo Residue",
        itemId: "echo_residue",
        questId: "scan-echo-residue"
      },
      {
        id: "mirror-cipher-terminal",
        type: "terminal",
        x: 2550,
        y: 654,
        label: "Mirror Cipher",
        questId: "decode-mirror-archive",
        puzzleId: "mirror-archive-cipher",
        text: [
          "The Archive projects four cells.",
          "Wrong order will copy the mistake into every route."
        ]
      },
      {
        id: "echo-residue-d",
        type: "pickup",
        x: 3040,
        y: 576,
        label: "Echo Residue",
        itemId: "echo_residue",
        questId: "scan-echo-residue"
      },
      {
        id: "to-sector-a-from-archive",
        type: "transition",
        x: 80,
        y: 790,
        label: "Underground Sector A",
        targetArea: "underground-sector-a"
      },
      {
        id: "to-blackout-theater",
        type: "transition",
        x: 3630,
        y: 790,
        label: "Blackout Theater",
        targetArea: "blackout-theater"
      }
    ],
    enemySpawns: [
      {
        id: "archive-wraith-a",
        kind: "signal-wraith",
        x: 1540,
        y: 792,
        patrolMin: 1180,
        patrolMax: 1900,
        hp: 125
      },
      {
        id: "archive-scout-b",
        kind: "corrupted-scout",
        x: 2760,
        y: 792,
        patrolMin: 2380,
        patrolMax: 3260,
        hp: 115
      }
    ]
  },
  {
    id: "blackout-theater",
    title: "Blackout Theater",
    subtitle: "A locked media pocket replaying district events that have not happened.",
    pvpEnabled: false,
    width: 3200,
    height: 860,
    spawn: { x: 180, y: 620 },
    safePoint: { x: 160, y: 620 },
    background: "theater",
    platforms: [
      { x: 0, y: 780, width: 3200, height: 80 },
      { x: 420, y: 660, width: 340, height: 22 },
      { x: 980, y: 590, width: 320, height: 22 },
      { x: 1540, y: 660, width: 380, height: 22 },
      { x: 2220, y: 600, width: 420, height: 22 }
    ],
    interactables: [
      {
        id: "theater-projector",
        type: "terminal",
        x: 1180,
        y: 548,
        label: "Blackout Projector",
        text: [
          "FRAME 018: Two operators stand on separated nodes.",
          "FRAME 019: One leaves. The copied operator remains."
        ]
      },
      {
        id: "theater-reel",
        type: "pickup",
        x: 2420,
        y: 556,
        label: "Blackout Reel",
        itemId: "theater_reel",
        questId: "recover-theater-reel"
      },
      {
        id: "to-mirror-archive-from-theater",
        type: "transition",
        x: 80,
        y: 730,
        label: "Mirror Archive",
        targetArea: "mirror-archive"
      }
    ],
    enemySpawns: [
      {
        id: "theater-wraith-a",
        kind: "signal-wraith",
        x: 1740,
        y: 728,
        patrolMin: 1360,
        patrolMax: 2240,
        hp: 155
      }
    ]
  },
  {
    id: "pvp-breach-zone",
    title: "PvP Breach Zone",
    subtitle: "A contained test breach. Player damage is enabled here only.",
    pvpEnabled: true,
    width: 2500,
    height: 740,
    spawn: { x: 180, y: 560 },
    safePoint: { x: 140, y: 560 },
    background: "pvp",
    platforms: [
      { x: 0, y: 660, width: 2500, height: 80 },
      { x: 460, y: 540, width: 320, height: 22 },
      { x: 1080, y: 470, width: 330, height: 22 },
      { x: 1720, y: 540, width: 320, height: 22 }
    ],
    interactables: [
      {
        id: "pvp-warning",
        type: "terminal",
        x: 320,
        y: 618,
        label: "Breach Warning",
        text: [
          "PvP test containment active.",
          "No premium item can increase combat power."
        ]
      },
      {
        id: "to-sector-a-from-pvp",
        type: "transition",
        x: 80,
        y: 610,
        label: "Underground Sector A",
        targetArea: "underground-sector-a"
      }
    ],
    enemySpawns: []
  }
];

export function getAreaDefinition(areaId: AreaId) {
  const area = areaDefinitions.find((candidate) => candidate.id === areaId);
  if (!area) {
    throw new Error(`Unknown area: ${areaId}`);
  }
  return area;
}
