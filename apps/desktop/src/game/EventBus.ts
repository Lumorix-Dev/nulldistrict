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
  // â”€â”€ Creative Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** A tile was placed or erased (own or remote). */
  "voidcraft:tile-placed": { x: number; y: number; layer: 0 | 1 | 2; tileId: string; playerId: string };
  /** Notifies HUD that selected block changed (from game â†’ HUD). */
  "voidcraft:selected-block-change": { blockId: string };
  /** Notifies HUD that the active layer changed. */
  "voidcraft:layer-change": { layer: 0 | 1 | 2 };
  /** Notifies HUD that the active tool changed. */
  "voidcraft:tool-change": { tool: string };
  /** World was saved to a slot. */
  "voidcraft:world-saved": { slot: number };
  /** World was loaded from a slot. */
  "voidcraft:world-loaded": { slot: number };
  /** HUD â†’ game: user selected a block from the palette. */
  "voidcraft:select-block": { blockId: string };
  /** HUD â†’ game: user selected a tool from the palette. */
  "voidcraft:select-tool": { tool: string };
  /** HUD â†’ game: user selected a layer from the palette. */
  "voidcraft:select-layer": { layer: 0 | 1 | 2 };
  /** HUD â†’ game: user clicked minimap to jump camera. */
  "voidcraft:minimap-click": { worldX: number; worldY: number };
  /** An achievement was just unlocked. */
  "voidcraft:achievement": { id: string; title: string; description: string; icon: string };
  /** Brush size changed in creative mode. */
  "voidcraft:brush-change": { size: number };
  /** Selection rectangle changed or cleared. */
  "voidcraft:selection-change": { active: boolean; width?: number; height?: number };
  /** Clipboard content changed. */
  "voidcraft:clipboard-change": { hasContent: boolean };
  // â”€â”€ Co-op Multiplayer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Remote player placed or erased a tile (via VoidCraftSync). */
  "voidcraft:remote-tile": { x: number; y: number; layer: 0 | 1 | 2; tileId: string; playerId: string };
  /** Remote player cursor moved. */
  "voidcraft:remote-cursor": { playerId: string; worldX: number; worldY: number; color: number };
  /** Remote player triggered a puzzle action. */
  "voidcraft:remote-puzzle": Record<string, unknown>;
  /** A remote player joined the VoidCraft session. */
  "voidcraft:player-joined": { playerId: string; playerName: string; color: number };
  /** A remote player left the VoidCraft session. */
  "voidcraft:player-left": { playerId: string };
  // â”€â”€ Puzzle / Level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Emitted when an escape room or puzzle level is completed. */
  "voidcraft:level-complete": { roomId: string; time: number; hints: number; deaths: number };
  /** Emitted when the level editor sends a definition to be tested. */
  "voidcraft:level-editor-test": { definition: any };
  /** FPS display toggled from settings. */
  "voidcraft:fps-toggle": { enabled: boolean };
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
