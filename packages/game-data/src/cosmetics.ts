import type { CosmeticSlot, Rarity } from "@nulldistrict/shared";

export interface CosmeticDefinition {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: Rarity;
  description: string;
}

export const cosmeticDefinitions: CosmeticDefinition[] = [
  {
    id: "founder-title",
    name: "Founder",
    slot: "title",
    rarity: "founder",
    description: "A profile title for early Null District supporters."
  },
  {
    id: "founder-banner",
    name: "First Signal Banner",
    slot: "banner",
    rarity: "founder",
    description: "A dark Lumorix banner with a fractured signal line."
  },
  {
    id: "founder-skin",
    name: "Signal-Bound Coat",
    slot: "skin",
    rarity: "founder",
    description: "A cosmetic coat with muted cyan relay markings."
  },
  {
    id: "relay-emote",
    name: "Restore Relay",
    slot: "emote",
    rarity: "rare",
    description: "A short cosmetic signal calibration emote."
  },
  {
    id: "null-pet-drone",
    name: "Null Mote Drone",
    slot: "pet",
    rarity: "epic",
    description: "A small companion drone that follows without granting power."
  }
];
