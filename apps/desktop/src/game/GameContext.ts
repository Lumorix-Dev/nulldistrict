import type { CharacterSummary, PublicUser } from "@nulldistrict/shared";
import type { RealtimeClient } from "./network/realtime";

export interface GameContext {
  token: string;
  user: PublicUser;
  character: CharacterSummary;
  realtime: RealtimeClient;
  api: {
    advanceQuest: (payload: { questId: string; amount?: number; storyFlag?: { key: string; value: boolean } }) => Promise<void>;
    loadInventory: () => Promise<void>;
    loadQuests: () => Promise<void>;
  };
}

export const GAME_CONTEXT_KEY = "nulldistrict.context";
