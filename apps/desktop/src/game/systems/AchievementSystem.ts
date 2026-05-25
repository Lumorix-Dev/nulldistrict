import { gameBus } from "../EventBus";
import { CAMPAIGN_ROOM_ORDER } from "./SaveSystem";

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
  { id: "first-escape", title: "Escapist", description: "Complete your first room.", icon: "🚪", unlocked: false },
  { id: "all-rooms", title: "District Cleared", description: "Complete all five main campaign rooms.", icon: "🌒", unlocked: false },
  { id: "secret-room", title: "Null Witness", description: "Clear the hidden sixth room.", icon: "✶", unlocked: false },
  { id: "speed-run-1", title: "Fast Signal", description: "Clear Room 1 in under 60 seconds.", icon: "⚡", unlocked: false },
  { id: "speedster-2", title: "Quick Fingers", description: "Clear Room 2 in under 90 seconds.", icon: "⌛", unlocked: false },
  { id: "speed-run-5", title: "Core Runner", description: "Clear Room 5 in under 5 minutes.", icon: "🚀", unlocked: false },
  { id: "no-hints", title: "Purist", description: "Complete any room without using hints.", icon: "🧠", unlocked: false },
  { id: "no-death", title: "Deathless", description: "Complete any room without falling out of bounds.", icon: "🛡", unlocked: false },
  { id: "collector", title: "Fragment Hunter", description: "Collect 50 items across puzzle runs.", icon: "💎", unlocked: false },
  { id: "code-cracker", title: "Code Cracker", description: "Solve a code panel on the first try.", icon: "🔢", unlocked: false },
  { id: "mirror-master", title: "Mirror Master", description: "Solve the Room 3 lever order without a mistake.", icon: "🪞", unlocked: false },
  { id: "clockwork", title: "Clockwork", description: "Solve Room 4 on the first timed attempt.", icon: "⏱", unlocked: false },
  { id: "hint-seeker", title: "Hint Seeker", description: "Use three hints across all runs.", icon: "💡", unlocked: false },
  { id: "night-owl", title: "Night Owl", description: "Accumulate 30 minutes of total playtime.", icon: "🦉", unlocked: false },
  { id: "completionist", title: "Completionist", description: "Unlock every other achievement.", icon: "🏆", unlocked: false, secret: true }
];

const STORAGE_KEY = "voidcraft:achievements";

export class AchievementSystem {
  private achievements: Achievement[] = ACHIEVEMENTS.map((entry) => ({ ...entry }));
  private counters: Record<string, number> = {};
  private escapeRoomsCompleted = new Set<string>();
  private consecutiveUndos = 0;
  private readonly playTimeStart = Date.now();

  constructor() {
    this.load();
  }

  unlock(id: string): boolean {
    const achievement = this.achievements.find((entry) => entry.id === id);
    if (!achievement || achievement.unlocked) return false;

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    this.save();

    gameBus.emit("voidcraft:achievement", {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon
    });

    if (id !== "completionist") this.checkCompletionist();
    return true;
  }

  getProgress(): { unlocked: number; total: number } {
    const visible = this.achievements.filter((entry) => !entry.secret);
    return { unlocked: visible.filter((entry) => entry.unlocked).length, total: visible.length };
  }

  getAll(): Achievement[] {
    return [...this.achievements];
  }

  getUnlocked(): Achievement[] {
    return this.achievements.filter((entry) => entry.unlocked);
  }

  getCounter(counter: string): number {
    return this.counters[counter] ?? 0;
  }

  isUnlocked(id: string): boolean {
    return this.achievements.find((entry) => entry.id === id)?.unlocked ?? false;
  }

  increment(counter: string, amount = 1): number {
    this.counters[counter] = (this.counters[counter] ?? 0) + amount;
    this.save();
    return this.counters[counter]!;
  }

  checkPuzzleComplete(roomId: string, timeSeconds: number, hintsUsed: number, deaths: number): void {
    this.escapeRoomsCompleted.add(roomId);
    this.unlock("first-escape");
    if (CAMPAIGN_ROOM_ORDER.every((id) => this.escapeRoomsCompleted.has(id))) this.unlock("all-rooms");
    if (roomId === "escape-room-6") this.unlock("secret-room");
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

  checkWorldSaved(): void {}

  checkFloodFill(): void {}

  checkUndoUsed(): void {
    this.consecutiveUndos++;
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

  checkBlockPlaced(_blockType: string): void {}

  checkWorldGenerated(): void {}

  resetCounter(key: string): void {
    this.counters[key] = 0;
    this.save();
  }

  private checkCompletionist(): void {
    const visible = this.achievements.filter((entry) => !entry.secret);
    if (visible.every((entry) => entry.unlocked)) this.unlock("completionist");
  }

  private save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          achievements: this.achievements.map((entry) => ({
            id: entry.id,
            unlocked: entry.unlocked,
            unlockedAt: entry.unlockedAt
          })),
          counters: this.counters,
          rooms: [...this.escapeRoomsCompleted]
        })
      );
    } catch {
      // Ignore storage errors in desktop preview mode.
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as {
        achievements: Array<{ id: string; unlocked: boolean; unlockedAt?: number }>;
        counters: Record<string, number>;
        rooms: string[];
      };

      for (const entry of saved.achievements ?? []) {
        const local = this.achievements.find((achievement) => achievement.id === entry.id);
        if (!local) continue;
        local.unlocked = entry.unlocked;
        local.unlockedAt = entry.unlockedAt;
      }

      this.counters = saved.counters ?? {};
      this.escapeRoomsCompleted = new Set(saved.rooms ?? []);
    } catch {
      // Ignore corrupt achievement data and continue with defaults.
    }
  }
}

export const achievementSystem = new AchievementSystem();
