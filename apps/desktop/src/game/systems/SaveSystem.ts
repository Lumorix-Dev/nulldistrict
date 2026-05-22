export interface SaveSlot {
  slot: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  playtime: number; // ms
  completedRooms: string[];
  highScores: Record<string, number>; // roomId → best time in seconds
  blockCount: number;
  worldTheme?: string;
}

const KEY_PREFIX = 'voidcraft:save:';
const GLOBAL_KEY = 'voidcraft:global';

export interface GlobalSave {
  totalPlaytime: number;
  lastPlayed: number;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    showFPS: boolean;
    pixelArt: boolean;
    particlesEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: GlobalSave['settings'] = {
  musicVolume: 0.4,
  sfxVolume: 0.7,
  showFPS: false,
  pixelArt: true,
  particlesEnabled: true
};

export class SaveSystem {
  static getSlot(slot: number): SaveSlot | null {
    try {
      return JSON.parse(localStorage.getItem(KEY_PREFIX + slot) ?? 'null') as SaveSlot | null;
    } catch { return null; }
  }

  static saveSlot(slot: SaveSlot): void {
    slot.updatedAt = Date.now();
    localStorage.setItem(KEY_PREFIX + slot.slot, JSON.stringify(slot));
  }

  static getAllSlots(): (SaveSlot | null)[] {
    return [1, 2, 3].map(n => SaveSystem.getSlot(n));
  }

  static createSlot(slot: number, name: string, theme?: string): SaveSlot {
    const s: SaveSlot = {
      slot, name,
      createdAt: Date.now(), updatedAt: Date.now(),
      playtime: 0, completedRooms: [],
      highScores: {}, blockCount: 0, worldTheme: theme
    };
    SaveSystem.saveSlot(s);
    return s;
  }

  static deleteSlot(slot: number): void {
    localStorage.removeItem(KEY_PREFIX + slot);
  }

  static updateHighScore(slot: number, roomId: string, seconds: number): void {
    const s = SaveSystem.getSlot(slot);
    if (!s) return;
    if (s.highScores[roomId] === undefined || seconds < s.highScores[roomId]!) {
      s.highScores[roomId] = seconds;
      SaveSystem.saveSlot(s);
    }
  }

  static markRoomComplete(slot: number, roomId: string): void {
    const s = SaveSystem.getSlot(slot);
    if (!s) return;
    if (!s.completedRooms.includes(roomId)) {
      s.completedRooms.push(roomId);
      SaveSystem.saveSlot(s);
    }
  }

  static getGlobal(): GlobalSave {
    try {
      const saved = JSON.parse(localStorage.getItem(GLOBAL_KEY) ?? '{}') as Partial<GlobalSave>;
      return {
        totalPlaytime: saved.totalPlaytime ?? 0,
        lastPlayed: saved.lastPlayed ?? 0,
        settings: { ...DEFAULT_SETTINGS, ...saved.settings }
      };
    } catch {
      return { totalPlaytime: 0, lastPlayed: 0, settings: { ...DEFAULT_SETTINGS } };
    }
  }

  static saveGlobal(g: GlobalSave): void {
    g.lastPlayed = Date.now();
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(g));
  }

  static updateSetting<K extends keyof GlobalSave['settings']>(
    key: K,
    value: GlobalSave['settings'][K]
  ): void {
    const g = SaveSystem.getGlobal();
    g.settings[key] = value;
    SaveSystem.saveGlobal(g);
  }
}
