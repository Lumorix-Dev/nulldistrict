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
    id: "relay_core",
    name: "Relay Core",
    description: "Quest component used to restore the First Relay.",
    type: "quest",
    rarity: "rare",
    iconKey: "icon-relay-core",
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
