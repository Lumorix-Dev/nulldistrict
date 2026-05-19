export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  maxRank: number;
  gameplayOnly: boolean;
}

export const skillDefinitions: SkillDefinition[] = [
  {
    id: "longer-dash",
    name: "Longer Dash",
    description: "Dash travels slightly farther.",
    maxRank: 3,
    gameplayOnly: true
  },
  {
    id: "stamina-recovery",
    name: "Signal Breathing",
    description: "Energy recovers slightly faster.",
    maxRank: 3,
    gameplayOnly: true
  },
  {
    id: "health-increase",
    name: "Hard Reset",
    description: "Maximum health increases by a small amount.",
    maxRank: 3,
    gameplayOnly: true
  },
  {
    id: "basic-attack",
    name: "Breaker Pattern",
    description: "Basic attack damage improves through play only.",
    maxRank: 3,
    gameplayOnly: true
  },
  {
    id: "lore-detection",
    name: "Echo Sense",
    description: "Lore and terminals are detectable from farther away.",
    maxRank: 3,
    gameplayOnly: true
  }
];

export const battlePassDefinition = {
  id: "first-signal-pass",
  title: "The First Signal",
  freeTrack: ["relay-emote"],
  premiumTrack: ["founder-banner", "null-pet-drone"],
  cosmeticsOnly: true
};
