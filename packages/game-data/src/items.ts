import type { ItemType, Rarity } from "@nulldistrict/shared";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  iconKey: string;
  stackLimit: number;
}

export const itemDefinitions: ItemDefinition[] = [
  {
    id: "signal_fragment",
    name: "Signal Fragment",
    description: "A cold shard of corrupted Lumorix signal. It hums when terminals are nearby.",
    type: "material",
    rarity: "uncommon",
    iconKey: "icon-signal-fragment",
    stackLimit: 999
  },
  {
    id: "broken_terminal_log",
    name: "Broken Terminal Log",
    description: "Recovered text from a machine that should have gone silent years ago.",
    type: "lore",
    rarity: "rare",
    iconKey: "icon-terminal-log",
    stackLimit: 1
  },
  {
    id: "first_signal_casefile",
    name: "First Signal Casefile",
    description: "A sealed investigation file proving the first Null District route can be entered, decoded and survived.",
    type: "lore",
    rarity: "epic",
    iconKey: "icon-casefile",
    stackLimit: 1
  },
  {
    id: "relay_core",
    name: "Relay Core",
    description: "Quest component used to restore the First Relay.",
    type: "quest",
    rarity: "rare",
    iconKey: "icon-relay-core",
    stackLimit: 1
  },
  {
    id: "echo_residue",
    name: "Echo Residue",
    description: "A mirrored signal trace used as evidence in Archive anomalies.",
    type: "material",
    rarity: "rare",
    iconKey: "icon-echo-residue",
    stackLimit: 999
  },
  {
    id: "archive_key",
    name: "Archive Key",
    description: "A synchronized memory key created when two operators stabilize separated archive nodes.",
    type: "quest",
    rarity: "epic",
    iconKey: "icon-archive-key",
    stackLimit: 1
  },
  {
    id: "theater_reel",
    name: "Blackout Theater Reel",
    description: "A corrupted reel of district footage. It shows a street that has not been built yet.",
    type: "lore",
    rarity: "epic",
    iconKey: "icon-theater-reel",
    stackLimit: 1
  },
  {
    id: "mirror_casefile",
    name: "Mirror Archive Casefile",
    description: "A completed casefile proving the Archive can copy operators, routes and evidence states.",
    type: "lore",
    rarity: "epic",
    iconKey: "icon-mirror-casefile",
    stackLimit: 1
  },
  {
    id: "med_patch",
    name: "Med Patch",
    description: "Restores a small amount of health. Field issue, not marketplace power.",
    type: "consumable",
    rarity: "common",
    iconKey: "icon-med-patch",
    stackLimit: 10
  },
  {
    id: "founder_skin_token",
    name: "Founder Skin Token",
    description: "Cosmetic unlock placeholder for early supporters.",
    type: "cosmetic",
    rarity: "founder",
    iconKey: "icon-founder-token",
    stackLimit: 1
  }
];

export function getItemDefinition(itemId: string) {
  return itemDefinitions.find((item) => item.id === itemId);
}
