import type { AreaId, InventoryEntry, QuestProgressState } from "@nulldistrict/shared";

export interface HudState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  abilityReady: boolean;
  meleeReady: boolean;
  areaId: AreaId;
  areaTitle: string;
  softCurrency: number;
}

export type GameEventMap = {
  "hud:update": HudState;
  "dialogue:open": { speaker: string; lines: string[] };
  "inventory:update": { inventory: InventoryEntry[] };
  "inventory:toggle": undefined;
  "quests:update": { quests: QuestProgressState[] };
  "pause:toggle": undefined;
  "death:show": { lostSoftCurrency: number };
  "chat:message": { username: string; message: string };
  "combat:notice": { title: string; body: string };
  "interact:prompt": { label: string; type: string } | null;
  "player:heal": { amount: number };
  "area:change": { areaId: AreaId };
  "shop:open": undefined;
};

type Handler<T> = (payload: T) => void;

class TypedBus {
  private readonly target = new EventTarget();

  emit<K extends keyof GameEventMap>(type: K, payload: GameEventMap[K]) {
    this.target.dispatchEvent(new CustomEvent(String(type), { detail: payload }));
  }

  on<K extends keyof GameEventMap>(type: K, handler: Handler<GameEventMap[K]>) {
    const listener = (event: Event) => handler((event as CustomEvent<GameEventMap[K]>).detail);
    this.target.addEventListener(String(type), listener);
    return () => this.target.removeEventListener(String(type), listener);
  }
}

export const gameBus = new TypedBus();
