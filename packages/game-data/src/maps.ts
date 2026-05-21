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
        text: [
          "The relay rejects the first attempt.",
          "A second touch opens a channel below the street."
        ]
      },
      {
        id: "fragment-a",
        type: "pickup",
        x: 620,
        y: 566,
        label: "Signal Fragment",
        itemId: "signal_fragment",
        questId: "collect-signal-fragments"
      },
      {
        id: "fragment-b",
        type: "pickup",
        x: 1500,
        y: 586,
        label: "Signal Fragment",
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
        label: "Signal Fragment",
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
        text: [
          "LOG: Staff evacuation denied by command nobody recognizes.",
          "MESSAGE: You are not the first version of you."
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
        x: 2730,
        y: 750,
        label: "PvP Breach Zone",
        targetArea: "pvp-breach-zone"
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
