export interface SaveSlot {
  slot: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  playtime: number;
  completedRooms: string[];
  highScores: Record<string, number>;
  unlockedRooms: string[];
  campaignCompleted: boolean;
  lastSceneKey?: string;
  blockCount: number;
  worldTheme?: string;
}

const KEY_PREFIX = "voidcraft:save:";
const GLOBAL_KEY = "voidcraft:global";

export const CAMPAIGN_ROOM_ORDER = [
  "escape-room-1",
  "escape-room-2",
  "escape-room-3",
  "escape-room-4",
  "escape-room-5"
] as const;

export const BONUS_ROOM_ID = "escape-room-6";
export const ALL_ROOM_IDS = [...CAMPAIGN_ROOM_ORDER, BONUS_ROOM_ID] as const;

export const ROOM_LABELS: Record<string, string> = {
  "escape-room-1": "The Signal Lock",
  "escape-room-2": "The Code Chamber",
  "escape-room-3": "Mirror Maze",
  "escape-room-4": "The Clockwork",
  "escape-room-5": "The Void Core",
  "escape-room-6": "The Null Core"
};

export interface GlobalSave {
  totalPlaytime: number;
  lastPlayed: number;
  activeSlot: number | null;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    showFPS: boolean;
    pixelArt: boolean;
    particlesEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: GlobalSave["settings"] = {
  musicVolume: 0.4,
  sfxVolume: 0.7,
  showFPS: false,
  pixelArt: true,
  particlesEnabled: true
};

export class SaveSystem {
  static getSlot(slot: number): SaveSlot | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY_PREFIX + slot) ?? "null") as Partial<SaveSlot> | null;
      return parsed ? SaveSystem.normalizeSlot(slot, parsed) : null;
    } catch {
      return null;
    }
  }

  static saveSlot(slot: SaveSlot): void {
    const normalized = SaveSystem.normalizeSlot(slot.slot, { ...slot, updatedAt: Date.now() });
    localStorage.setItem(KEY_PREFIX + slot.slot, JSON.stringify(normalized));
  }

  static getAllSlots(): (SaveSlot | null)[] {
    return [1, 2, 3].map((n) => SaveSystem.getSlot(n));
  }

  static createSlot(slot: number, name: string, theme?: string): SaveSlot {
    const created: SaveSlot = {
      slot,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playtime: 0,
      completedRooms: [],
      highScores: {},
      unlockedRooms: [CAMPAIGN_ROOM_ORDER[0]],
      campaignCompleted: false,
      lastSceneKey: "PuzzleSelectScene",
      blockCount: 0,
      worldTheme: theme
    };
    SaveSystem.saveSlot(created);
    SaveSystem.setActiveSlot(slot);
    return created;
  }

  static deleteSlot(slot: number): void {
    localStorage.removeItem(KEY_PREFIX + slot);
    if (SaveSystem.getActiveSlotNumber() === slot) {
      SaveSystem.setActiveSlot(null);
    }
  }

  static updateHighScore(slot: number, roomId: string, seconds: number): void {
    const save = SaveSystem.getSlot(slot);
    if (!save) return;
    if (save.highScores[roomId] === undefined || seconds < save.highScores[roomId]!) {
      save.highScores[roomId] = seconds;
      SaveSystem.saveSlot(save);
    }
  }

  static markRoomComplete(slot: number, roomId: string): void {
    const save = SaveSystem.getSlot(slot);
    if (!save) return;
    if (!save.completedRooms.includes(roomId)) {
      save.completedRooms.push(roomId);
      SaveSystem.saveSlot(save);
    }
    SaveSystem.unlockRoom(slot, roomId);
  }

  static getGlobal(): GlobalSave {
    try {
      const saved = JSON.parse(localStorage.getItem(GLOBAL_KEY) ?? "{}") as Partial<GlobalSave>;
      return {
        totalPlaytime: saved.totalPlaytime ?? 0,
        lastPlayed: saved.lastPlayed ?? 0,
        activeSlot: saved.activeSlot ?? null,
        settings: { ...DEFAULT_SETTINGS, ...saved.settings }
      };
    } catch {
      return {
        totalPlaytime: 0,
        lastPlayed: 0,
        activeSlot: null,
        settings: { ...DEFAULT_SETTINGS }
      };
    }
  }

  static saveGlobal(global: GlobalSave): void {
    global.lastPlayed = Date.now();
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(global));
  }

  static updateSetting<K extends keyof GlobalSave["settings"]>(
    key: K,
    value: GlobalSave["settings"][K]
  ): void {
    const global = SaveSystem.getGlobal();
    global.settings[key] = value;
    SaveSystem.saveGlobal(global);
  }

  static getActiveSlotNumber(): number | null {
    return SaveSystem.getGlobal().activeSlot;
  }

  static getActiveSlot(): SaveSlot | null {
    const activeSlot = SaveSystem.getActiveSlotNumber();
    return activeSlot ? SaveSystem.getSlot(activeSlot) : null;
  }

  static setActiveSlot(slot: number | null): void {
    const global = SaveSystem.getGlobal();
    global.activeSlot = slot;
    SaveSystem.saveGlobal(global);
  }

  static setCurrentScene(sceneKey: string): void {
    const slot = SaveSystem.getActiveSlot();
    if (!slot) return;
    slot.lastSceneKey = sceneKey;
    SaveSystem.saveSlot(slot);
  }

  static addPlaytime(ms: number): void {
    if (ms <= 0) return;

    const global = SaveSystem.getGlobal();
    global.totalPlaytime += ms;
    SaveSystem.saveGlobal(global);

    const slot = SaveSystem.getActiveSlot();
    if (!slot) return;
    slot.playtime += ms;
    SaveSystem.saveSlot(slot);
  }

  static unlockRoom(slotNumber: number, roomId: string): void {
    const slot = SaveSystem.getSlot(slotNumber);
    if (!slot) return;

    if (!slot.unlockedRooms.includes(roomId)) {
      slot.unlockedRooms.push(roomId);
    }

    const roomIndex = CAMPAIGN_ROOM_ORDER.indexOf(roomId as (typeof CAMPAIGN_ROOM_ORDER)[number]);
    if (roomIndex >= 0 && roomIndex < CAMPAIGN_ROOM_ORDER.length - 1) {
      const nextRoom = CAMPAIGN_ROOM_ORDER[roomIndex + 1];
      if (nextRoom && !slot.unlockedRooms.includes(nextRoom)) {
        slot.unlockedRooms.push(nextRoom);
      }
    }

    const completedPrimaryCampaign = CAMPAIGN_ROOM_ORDER.every((id) => slot.completedRooms.includes(id));
    if (completedPrimaryCampaign) {
      slot.campaignCompleted = true;
      if (!slot.unlockedRooms.includes(BONUS_ROOM_ID)) {
        slot.unlockedRooms.push(BONUS_ROOM_ID);
      }
    }

    SaveSystem.saveSlot(slot);
  }

  static recordRoomCompletion(roomId: string, seconds: number): void {
    const activeSlot = SaveSystem.getActiveSlot();
    if (!activeSlot) return;

    if (!activeSlot.completedRooms.includes(roomId)) {
      activeSlot.completedRooms.push(roomId);
    }

    if (activeSlot.highScores[roomId] === undefined || seconds < activeSlot.highScores[roomId]!) {
      activeSlot.highScores[roomId] = seconds;
    }

    activeSlot.lastSceneKey = "PuzzleSelectScene";
    SaveSystem.saveSlot(activeSlot);
    SaveSystem.unlockRoom(activeSlot.slot, roomId);
  }

  static getBestTimeForRoom(roomId: string): number | undefined {
    let best: number | undefined;

    for (const slot of SaveSystem.getAllSlots()) {
      if (!slot) continue;
      const value = slot.highScores[roomId];
      if (value !== undefined && (best === undefined || value < best)) {
        best = value;
      }
    }

    return best;
  }

  static isRoomUnlocked(roomId: string, slot: SaveSlot | null = SaveSystem.getActiveSlot()): boolean {
    return !!slot?.unlockedRooms.includes(roomId);
  }

  private static normalizeSlot(slotNumber: number, slot: Partial<SaveSlot>): SaveSlot {
    const completedRooms = Array.isArray(slot.completedRooms) ? [...slot.completedRooms] : [];
    const unlockedRooms = SaveSystem.deriveUnlockedRooms(completedRooms, slot.unlockedRooms);

    return {
      slot: slotNumber,
      name: slot.name ?? `Case File ${slotNumber}`,
      createdAt: slot.createdAt ?? Date.now(),
      updatedAt: slot.updatedAt ?? Date.now(),
      playtime: slot.playtime ?? 0,
      completedRooms,
      highScores: slot.highScores ?? {},
      unlockedRooms,
      campaignCompleted: slot.campaignCompleted ?? CAMPAIGN_ROOM_ORDER.every((id) => completedRooms.includes(id)),
      lastSceneKey: slot.lastSceneKey ?? "PuzzleSelectScene",
      blockCount: slot.blockCount ?? 0,
      worldTheme: slot.worldTheme
    };
  }

  private static deriveUnlockedRooms(completedRooms: string[], storedUnlockedRooms?: string[]): string[] {
    const unlocked = new Set(storedUnlockedRooms ?? []);
    unlocked.add(CAMPAIGN_ROOM_ORDER[0]);

    for (const roomId of completedRooms) {
      unlocked.add(roomId);
      const roomIndex = CAMPAIGN_ROOM_ORDER.indexOf(roomId as (typeof CAMPAIGN_ROOM_ORDER)[number]);
      if (roomIndex >= 0 && roomIndex < CAMPAIGN_ROOM_ORDER.length - 1) {
        const nextRoom = CAMPAIGN_ROOM_ORDER[roomIndex + 1];
        if (nextRoom) unlocked.add(nextRoom);
      }
    }

    if (CAMPAIGN_ROOM_ORDER.every((id) => completedRooms.includes(id))) {
      unlocked.add(BONUS_ROOM_ID);
    }

    return [...unlocked];
  }
}
