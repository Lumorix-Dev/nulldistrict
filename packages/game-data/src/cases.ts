import type { QuestId } from "@nulldistrict/shared";

export interface CaseDefinition {
  id: string;
  title: string;
  chapter: string;
  tagline: string;
  extractionAreaId: string;
  evidenceItemId: string;
  evidenceRequired: number;
  extractionItemId: string;
  rewardItemId: string;
  requiredQuestIds: QuestId[];
  extractionQuestId: QuestId;
  rewards: {
    xp: number;
    softCurrency: number;
  };
}

export const caseDefinitions: CaseDefinition[] = [
  {
    id: "first-signal",
    title: "Case 001: The First Signal",
    chapter: "The First Signal",
    tagline: "Recover proof, decode the district, and extract before the signal learns your route.",
    extractionAreaId: "signal-haven",
    evidenceItemId: "signal_fragment",
    evidenceRequired: 3,
    extractionItemId: "relay_core",
    rewardItemId: "first_signal_casefile",
    requiredQuestIds: ["restore-first-relay", "collect-signal-fragments", "read-broken-terminal"],
    extractionQuestId: "extract-first-signal",
    rewards: {
      xp: 220,
      softCurrency: 90
    }
  }
];

export const firstSignalCase = caseDefinitions[0] as CaseDefinition;

export function getCaseDefinition(caseId: string) {
  return caseDefinitions.find((caseFile) => caseFile.id === caseId);
}
