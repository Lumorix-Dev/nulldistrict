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
    description: "A broken relay still carries a repeating Lumorix packet, but it only answers a correct signal sequence.",
    objective: "Solve the relay harmonic lock in District Entrance.",
    target: 1,
    rewardXp: 120,
    rewardSoftCurrency: 40,
    startsUnlocked: true,
    unlocksArea: "underground-sector-a"
  },
  {
    id: "collect-signal-fragments",
    title: "Recover 3 Evidence Fragments",
    chapter: "The First Signal",
    description: "Fragments record the district's signal scars. They are evidence, not crafting filler.",
    objective: "Recover 3 signal evidence fragments from the street ruins.",
    target: 3,
    rewardXp: 110,
    rewardSoftCurrency: 35,
    startsUnlocked: true
  },
  {
    id: "read-broken-terminal",
    title: "Decode the Broken Terminal",
    chapter: "The First Signal",
    description: "A terminal repeats a memory warning, but the sentence has been scrambled.",
    objective: "Solve the memory lock below Sector A.",
    target: 1,
    rewardXp: 90,
    rewardSoftCurrency: 30,
    startsUnlocked: true
  },
  {
    id: "extract-first-signal",
    title: "Extract the First Signal",
    chapter: "The First Signal",
    description: "A case only matters if the team brings proof back to Signal Haven.",
    objective: "Return to Signal Haven with evidence, terminal data and the Relay Core.",
    target: 1,
    rewardXp: 220,
    rewardSoftCurrency: 90,
    startsUnlocked: true
  },
  {
    id: "defeat-corrupted-scout",
    title: "Contain a Corrupted Scout",
    chapter: "The First Signal",
    description: "A patrol unit has learned to imitate living movement. Containment is optional field safety, not the case objective.",
    objective: "Stun or defeat a Corrupted Scout if your route is blocked.",
    target: 1,
    rewardXp: 40,
    rewardSoftCurrency: 0,
    startsUnlocked: true
  }
];

export function getQuestDefinition(questId: string) {
  return questDefinitions.find((quest) => quest.id === questId);
}
