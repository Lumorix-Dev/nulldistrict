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
  "puzzle:open": { puzzleId: string };
  "run:extract": undefined;
  "area:change": { areaId: AreaId };
  "shop:open": undefined;
  // ── Creative Mode ──────────────────────────────────────────────────────────
  /** A tile was placed or erased (own or remote). */
  "voidcraft:tile-placed": { x: number; y: number; layer: 0 | 1 | 2; tileId: string; playerId: string };
  /** Notifies HUD that selected block changed (from game → HUD). */
  "voidcraft:selected-block-change": { blockId: string };
  /** Notifies HUD that the active layer changed. */
  "voidcraft:layer-change": { layer: 0 | 1 | 2 };
  /** Notifies HUD that the active tool changed. */
  "voidcraft:tool-change": { tool: string };
  /** World was saved to a slot. */
  "voidcraft:world-saved": { slot: number };
  /** World was loaded from a slot. */
  "voidcraft:world-loaded": { slot: number };
  /** HUD → game: user selected a block from the palette. */
  "voidcraft:select-block": { blockId: string };
  /** HUD → game: user selected a tool from the palette. */
  "voidcraft:select-tool": { tool: string };
  /** HUD → game: user selected a layer from the palette. */
  "voidcraft:select-layer": { layer: 0 | 1 | 2 };
  /** HUD → game: user clicked minimap to jump camera. */
  "voidcraft:minimap-click": { worldX: number; worldY: number };
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
