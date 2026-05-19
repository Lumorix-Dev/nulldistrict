import type { QuestId } from "@nulldistrict/shared";

export interface QuestDefinition {
  id: QuestId;
  title: string;
  chapter: string;
  description: string;
  objective: string;
  target: number;
  rewardXp: number;
  rewardSoftCurrency: number;
  startsUnlocked: boolean;
  unlocksArea?: string;
}

export const questDefinitions: QuestDefinition[] = [
  {
    id: "enter-null-district",
    title: "Enter the Null District",
    chapter: "The First Signal",
    description: "Wake at Signal Haven and cross into the sealed district edge.",
    objective: "Reach District Entrance.",
    target: 1,
    rewardXp: 75,
    rewardSoftCurrency: 25,
    startsUnlocked: true
  },
  {
    id: "restore-first-relay",
    title: "Restore the First Relay",
    chapter: "The First Signal",
    description: "A broken relay still carries a repeating Lumorix packet.",
    objective: "Restore the relay in District Entrance.",
    target: 1,
    rewardXp: 120,
    rewardSoftCurrency: 40,
    startsUnlocked: true,
    unlocksArea: "underground-sector-a"
  },
  {
    id: "collect-signal-fragments",
    title: "Collect 3 Signal Fragments",
    chapter: "The First Signal",
    description: "Fragments record the district's signal scars.",
    objective: "Collect signal fragments from the street ruins.",
    target: 3,
    rewardXp: 110,
    rewardSoftCurrency: 35,
    startsUnlocked: true
  },
  {
    id: "defeat-corrupted-scout",
    title: "Defeat the Corrupted Scout",
    chapter: "The First Signal",
    description: "A patrol unit has learned to imitate living movement.",
    objective: "Defeat a Corrupted Scout.",
    target: 1,
    rewardXp: 150,
    rewardSoftCurrency: 55,
    startsUnlocked: true
  },
  {
    id: "read-broken-terminal",
    title: "Read the Broken Terminal",
    chapter: "The First Signal",
    description: "A terminal repeats: The district remembers you.",
    objective: "Read the broken terminal below Sector A.",
    target: 1,
    rewardXp: 90,
    rewardSoftCurrency: 30,
    startsUnlocked: true
  }
];

export function getQuestDefinition(questId: string) {
  return questDefinitions.find((quest) => quest.id === questId);
}
