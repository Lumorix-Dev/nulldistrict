import { gameBus } from "../EventBus";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
  unlocked: boolean;
  unlockedAt?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-block",   title: "First Block",    description: "Place your first block in Creative Mode",         icon: "🧱", unlocked: false },
  { id: "builder",       title: "Builder",        description: "Place 100 blocks",                                icon: "🏗️", unlocked: false },
  { id: "architect",     title: "Architect",      description: "Place 1000 blocks",                               icon: "🏛️", unlocked: false },
  { id: "first-escape",  title: "Escapist",       description: "Complete your first Escape Room",                 icon: "🔓", unlocked: false },
  { id: "all-rooms",     title: "Void Walker",    description: "Complete all 5 Escape Rooms",                     icon: "🌀", unlocked: false },
  { id: "speed-run-1",   title: "Speed Demon",    description: "Complete Level 1 in under 60 seconds",            icon: "⚡", unlocked: false },
  { id: "speed-run-5",   title: "Void Runner",    description: "Complete Level 5 in under 5 minutes",             icon: "🚀", unlocked: false },
  { id: "no-hints",      title: "Purist",         description: "Complete any level without using hints",          icon: "🧠", unlocked: false },
  { id: "collector",     title: "Collector",      description: "Collect 50 items across all puzzle runs",         icon: "💎", unlocked: false },
  { id: "world-saver",   title: "World Saver",    description: "Save a creative world",                           icon: "💾", unlocked: false },
  { id: "explorer",      title: "Explorer",       description: "Place blocks from all 5 block categories",        icon: "🔍", unlocked: false },
  { id: "flood-fill",    title: "Painter",        description: "Use the flood fill tool",                         icon: "🪣", unlocked: false },
  { id: "undo-master",   title: "Undo Master",    description: "Undo 10 actions in a row",                        icon: "↩️", unlocked: false },
  { id: "night-owl",     title: "Night Owl",      description: "Accumulate 30 minutes of total play time",        icon: "🦉", unlocked: false },
  { id: "code-cracker",  title: "Code Cracker",   description: "Enter the correct code on the first try",         icon: "🔢", unlocked: false },
  { id: "no-death",      title: "Deathless",      description: "Complete a level without falling out of bounds",  icon: "🛡️", unlocked: false },
  { id: "speedster-2",   title: "Quick Fingers",  description: "Complete Level 2 in under 90 seconds",            icon: "⚡", unlocked: false },
  { id: "mirror-master", title: "Mirror Master",  description: "Solve the lever pattern in Level 3 without a mistake", icon: "🪞", unlocked: false },
  { id: "clockwork",     title: "Clockwork",      description: "Sync all switches in Level 4 on the first attempt", icon: "⏱️", unlocked: false },
  { id: "hint-seeker",   title: "Hint Seeker",    description: "Use hints 3 or more times across all levels",     icon: "💡", unlocked: false },
  { id: "world-gen",     title: "World Creator",  description: "Generate a procedural world",                     icon: "🌍", unlocked: false },
  { id: "completionist", title: "Completionist",  description: "Unlock every other achievement",                  icon: "🏆", unlocked: false, secret: true },
];

const STORAGE_KEY = "voidcraft:achievements";

export class AchievementSystem {
  private achievements: Achievement[] = ACHIEVEMENTS.map(a => ({ ...a }));
  private counters: Record<string, number> = {};
  private escapeRoomsCompleted = new Set<string>();
  private consecutiveUndos = 0;
  private readonly playTimeStart = Date.now();

  constructor() {
    this.load();
  }

  /** Returns true if newly unlocked. */
  unlock(id: string): boolean {
    const achievement = this.achievements.find(a => a.id === id);
    if (!achievement || achievement.unlocked) return false;
    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    this.save();
    gameBus.emit("voidcraft:achievement", {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
    });
    // Check completionist after every unlock
    if (id !== "completionist") this.checkCompletionist();
    return true;
  }

  getProgress(): { unlocked: number; total: number } {
    const nonSecret = this.achievements.filter(a => !a.secret);
    return { unlocked: nonSecret.filter(a => a.unlocked).length, total: nonSecret.length };
  }

  private checkCompletionist(): void {
    const nonSecret = this.achievements.filter(a => !a.secret);
    if (nonSecret.every(a => a.unlocked)) this.unlock("completionist");
  }

  /** Increments a named counter and returns the new value. */
  increment(counter: string, amount = 1): number {
    this.counters[counter] = (this.counters[counter] ?? 0) + amount;
    this.save();
    return this.counters[counter]!;
  }

  getCounter(counter: string): number {
    return this.counters[counter] ?? 0;
  }

  isUnlocked(id: string): boolean {
    return this.achievements.find(a => a.id === id)?.unlocked ?? false;
  }

  getAll(): Achievement[] {
    return [...this.achievements];
  }

  getUnlocked(): Achievement[] {
    return this.achievements.filter(a => a.unlocked);
  }

  // ── Domain checks ────────────────────────────────────────────────────────

  checkBlockPlaced(blockType: string): void {
    const total = this.increment("blocks-placed");
    if (total === 1) this.unlock("first-block");
    if (total >= 100) this.unlock("builder");
    if (total >= 1000) this.unlock("architect");

    // Track unique block types (proxy for categories)
    const catKey = `block-seen-${blockType}`;
    if (!this.counters[catKey]) {
      this.counters[catKey] = 1;
      this.save();
      const uniqueTypes = Object.keys(this.counters).filter(k => k.startsWith("block-seen-")).length;
      if (uniqueTypes >= 5) this.unlock("explorer");
    }
  }

  checkPuzzleComplete(roomId: string, timeSeconds: number, hintsUsed: number, deaths: number): void {
    this.escapeRoomsCompleted.add(roomId);
    this.unlock("first-escape");
    if (this.escapeRoomsCompleted.size >= 5) this.unlock("all-rooms");
    if (hintsUsed === 0) this.unlock("no-hints");
    if (deaths === 0) this.unlock("no-death");
    if (roomId === "escape-room-1" && timeSeconds < 60) this.unlock("speed-run-1");
    if (roomId === "escape-room-2" && timeSeconds < 90) this.unlock("speedster-2");
    if (roomId === "escape-room-5" && timeSeconds < 300) this.unlock("speed-run-5");
    this.checkPlayTime();
  }

  checkItemCollected(): void {
    const total = this.increment("items-collected");
    if (total >= 50) this.unlock("collector");
  }

  checkWorldSaved(): void {
    this.unlock("world-saver");
  }

  checkFloodFill(): void {
    this.unlock("flood-fill");
  }

  checkUndoUsed(): void {
    this.consecutiveUndos++;
    if (this.consecutiveUndos >= 10) this.unlock("undo-master");
  }

  resetConsecutiveUndos(): void {
    this.consecutiveUndos = 0;
  }

  checkPlayTime(): void {
    const mins = (Date.now() - this.playTimeStart) / 60000;
    if (mins >= 30) this.unlock("night-owl");
  }

  checkCodeFirstTry(isFirstTry: boolean): void {
    if (isFirstTry) this.unlock("code-cracker");
  }

  checkLeverOrder(perfect: boolean): void {
    if (perfect) this.unlock("mirror-master");
  }

  checkClockworkFirstTry(perfect: boolean): void {
    if (perfect) this.unlock("clockwork");
  }

  checkHintUsed(): void {
    const total = this.increment("hints-used");
    if (total >= 3) this.unlock("hint-seeker");
  }

  checkWorldGenerated(): void {
    this.unlock("world-gen");
  }

  resetCounter(key: string): void {
    this.counters[key] = 0;
    this.save();
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private save(): void {
    try {
      const data = {
        achievements: this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked, unlockedAt: a.unlockedAt })),
        counters: this.counters,
        rooms: [...this.escapeRoomsCompleted],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage unavailable */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        achievements: Array<{ id: string; unlocked: boolean; unlockedAt?: number }>;
        counters: Record<string, number>;
        rooms: string[];
      };
      for (const saved of data.achievements ?? []) {
        const local = this.achievements.find(a => a.id === saved.id);
        if (local) { local.unlocked = saved.unlocked; local.unlockedAt = saved.unlockedAt; }
      }
      this.counters = data.counters ?? {};
      this.escapeRoomsCompleted = new Set(data.rooms ?? []);
    } catch { /* corrupt data */ }
  }
}

export const achievementSystem = new AchievementSystem();
