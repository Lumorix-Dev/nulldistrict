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

export function createOfflineGameContext(): GameContext {
  return {
    token: "offline-solo",
    user: {
      id: "offline-user",
      username: "Operator",
      email: "offline@nulldistrict.local",
      role: "PLAYER",
      premiumCurrency: 0,
      softCurrency: 0,
      isBanned: false,
      createdAt: new Date(0).toISOString()
    },
    character: {
      id: "offline-character",
      name: "Operator",
      className: "Null Analyst",
      level: 1,
      xp: 0,
      skillPoints: 0,
      areaId: "signal-haven",
      createdAt: new Date(0).toISOString()
    },
    realtime: {} as RealtimeClient,
    api: {
      advanceQuest: async () => undefined,
      loadInventory: async () => undefined,
      loadQuests: async () => undefined
    }
  };
}
