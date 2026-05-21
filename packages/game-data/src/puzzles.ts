import type { AreaId, QuestId } from "@nulldistrict/shared";

export interface PuzzleChoice {
  id: string;
  label: string;
  description: string;
}

export interface PuzzleDefinition {
  id: string;
  title: string;
  areaId: AreaId;
  interactableId: string;
  slots: number;
  prompt: string;
  clue: string;
  choices: PuzzleChoice[];
  solution: string[];
  questId: QuestId;
  storyFlag: { key: string; value: boolean };
  successMessage: string;
  successLines: string[];
  failureLine: string;
  rewardItemId?: string;
}

export const puzzleDefinitions: PuzzleDefinition[] = [
  {
    id: "first-relay-harmonics",
    title: "First Relay: Harmonic Lock",
    areaId: "district-entrance",
    interactableId: "first-relay",
    slots: 3,
    prompt: "Rebuild the corrupted handshake before the relay will open the route below.",
    clue: "The relay accepts light first, null second, echo last. Static is noise.",
    choices: [
      { id: "lux", label: "LUX", description: "A clean Lumorix pulse." },
      { id: "static", label: "STATIC", description: "Dead carrier noise." },
      { id: "null", label: "NULL", description: "The district's sealed carrier." },
      { id: "echo", label: "ECHO", description: "A returned memory packet." }
    ],
    solution: ["lux", "null", "echo"],
    questId: "restore-first-relay",
    storyFlag: { key: "restored_first_relay", value: true },
    successMessage: "Relay harmonics restored. Underground Sector A is now reachable.",
    successLines: [
      "The relay stops fighting your input.",
      "Three tones answer from below the street: LUX. NULL. ECHO.",
      "A buried access route unlocks. The district noticed."
    ],
    failureLine: "The relay rejects the pattern. One pulse is out of order."
  },
  {
    id: "broken-terminal-memory-lock",
    title: "Broken Terminal: Memory Lock",
    areaId: "underground-sector-a",
    interactableId: "broken-terminal-a",
    slots: 3,
    prompt: "Reconstruct the hidden sentence from the terminal's damaged memory cells.",
    clue: "The warning is not about you remembering the place. It is about what remembers you.",
    choices: [
      { id: "district", label: "DISTRICT", description: "A sealed city process." },
      { id: "forgets", label: "FORGETS", description: "A tempting lie." },
      { id: "remembers", label: "REMEMBERS", description: "The repeated verb." },
      { id: "lumorix", label: "LUMORIX", description: "The original signal owner." },
      { id: "you", label: "YOU", description: "The terminal's target." }
    ],
    solution: ["district", "remembers", "you"],
    questId: "read-broken-terminal",
    storyFlag: { key: "decoded_broken_terminal_a", value: true },
    successMessage: "Memory lock decoded. A terminal log was recovered.",
    successLines: [
      "The terminal stops glitching and prints one clean line:",
      "THE DISTRICT REMEMBERS YOU.",
      "A recovered log is added to your inventory."
    ],
    failureLine: "The terminal blanks out. The sentence is close, but the subject is wrong.",
    rewardItemId: "broken_terminal_log"
  },
  {
    id: "mirror-archive-cipher",
    title: "Mirror Archive: Route Cipher",
    areaId: "mirror-archive",
    interactableId: "mirror-cipher-terminal",
    slots: 4,
    prompt: "Name the copied route before the Archive overwrites the live path.",
    clue: "The copied route begins with the operator, returns as an echo, opens a door, then asks where it came from.",
    choices: [
      { id: "self", label: "SELF", description: "The operator entering the copied route." },
      { id: "echo", label: "ECHO", description: "The route after the archive repeats it." },
      { id: "door", label: "DOOR", description: "The threshold made from copied memory." },
      { id: "origin", label: "ORIGIN", description: "The place the copy cannot invent." },
      { id: "void", label: "VOID", description: "Dead space between two stable signals." }
    ],
    solution: ["self", "echo", "door", "origin"],
    questId: "decode-mirror-archive",
    storyFlag: { key: "decoded_mirror_archive", value: true },
    successMessage: "Mirror route decoded. The Blackout Theater pocket is now stable.",
    successLines: [
      "The Archive stops reflecting your last step.",
      "A new route appears in the dark: SELF. ECHO. DOOR. ORIGIN.",
      "Somewhere ahead, a theater projector starts running by itself."
    ],
    failureLine: "The Archive copies your mistake and closes the route."
  }
];

export function getPuzzleDefinition(puzzleId: string) {
  return puzzleDefinitions.find((puzzle) => puzzle.id === puzzleId);
}
