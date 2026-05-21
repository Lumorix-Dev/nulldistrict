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
  objectiveLabels: string[];
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
    objectiveLabels: ["Evidence", "Relay", "Terminal"],
    rewards: {
      xp: 220,
      softCurrency: 90
    }
  },
  {
    id: "mirror-archive",
    title: "Case 002: Mirror Archive",
    chapter: "The Mirror Archive",
    tagline: "Enter the archive, synchronize two operators, decode the mirror phrase and extract copied evidence.",
    extractionAreaId: "signal-haven",
    evidenceItemId: "echo_residue",
    evidenceRequired: 4,
    extractionItemId: "archive_key",
    rewardItemId: "mirror_casefile",
    requiredQuestIds: ["enter-mirror-archive", "scan-echo-residue", "synchronize-archive-nodes", "decode-mirror-archive", "recover-theater-reel"],
    extractionQuestId: "extract-mirror-case",
    objectiveLabels: ["Entry", "Residue", "Sync", "Cipher", "Reel"],
    rewards: {
      xp: 360,
      softCurrency: 140
    }
  }
];

export const firstSignalCase = caseDefinitions[0] as CaseDefinition;

export function getCaseDefinition(caseId: string) {
  return caseDefinitions.find((caseFile) => caseFile.id === caseId);
}
