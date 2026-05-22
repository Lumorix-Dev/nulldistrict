export interface PuzzleObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface PuzzleRoomState {
  roomId: string;
  inventory: string[];
  activatedSwitches: Set<string>;
  unlockedDoors: Set<string>;
  collectedItems: Set<string>;
  solvedPanels: Set<string>;
  objectives: PuzzleObjective[];
  startTime: number;
  completedAt?: number;
}

interface SerializedRoomState {
  roomId: string;
  inventory: string[];
  activatedSwitches: string[];
  unlockedDoors: string[];
  collectedItems: string[];
  solvedPanels: string[];
  objectives: PuzzleObjective[];
  startTime: number;
  completedAt?: number;
}

export class PuzzleEngine {
  private readonly state: PuzzleRoomState;

  constructor(roomId: string, objectives: PuzzleObjective[]) {
    this.state = {
      roomId,
      inventory: [],
      activatedSwitches: new Set(),
      unlockedDoors: new Set(),
      collectedItems: new Set(),
      solvedPanels: new Set(),
      objectives: objectives.map(o => ({ ...o, completed: false })),
      startTime: Date.now(),
    };
  }

  pickUp(itemId: string): void {
    if (!this.state.inventory.includes(itemId)) {
      this.state.inventory.push(itemId);
    }
    this.state.collectedItems.add(itemId);
  }

  hasItem(itemId: string): boolean {
    return this.state.inventory.includes(itemId);
  }

  removeItem(itemId: string): boolean {
    const idx = this.state.inventory.indexOf(itemId);
    if (idx === -1) return false;
    this.state.inventory.splice(idx, 1);
    return true;
  }

  get inventory(): string[] {
    return [...this.state.inventory];
  }

  activateSwitch(switchId: string): void {
    this.state.activatedSwitches.add(switchId);
  }

  isSwitchActive(switchId: string): boolean {
    return this.state.activatedSwitches.has(switchId);
  }

  tryUnlock(doorId: string, requiredKey: string): boolean {
    if (!this.hasItem(requiredKey)) return false;
    this.removeItem(requiredKey);
    this.state.unlockedDoors.add(doorId);
    return true;
  }

  isDoorUnlocked(doorId: string): boolean {
    return this.state.unlockedDoors.has(doorId);
  }

  forceUnlock(doorId: string): void {
    this.state.unlockedDoors.add(doorId);
  }

  tryCode(panelId: string, enteredCode: string, correctCode: string): boolean {
    if (enteredCode !== correctCode) return false;
    this.state.solvedPanels.add(panelId);
    return true;
  }

  isPanelSolved(panelId: string): boolean {
    return this.state.solvedPanels.has(panelId);
  }

  completeObjective(objectiveId: string): void {
    const obj = this.state.objectives.find(o => o.id === objectiveId);
    if (obj) obj.completed = true;
  }

  isObjectiveComplete(objectiveId: string): boolean {
    return this.state.objectives.find(o => o.id === objectiveId)?.completed ?? false;
  }

  allObjectivesComplete(): boolean {
    return this.state.objectives.length > 0 && this.state.objectives.every(o => o.completed);
  }

  getElapsedSeconds(): number {
    const end = this.state.completedAt ?? Date.now();
    return Math.floor((end - this.state.startTime) / 1000);
  }

  complete(): void {
    if (!this.state.completedAt) {
      this.state.completedAt = Date.now();
    }
  }

  serialize(): string {
    const serializable: SerializedRoomState = {
      roomId: this.state.roomId,
      inventory: [...this.state.inventory],
      activatedSwitches: [...this.state.activatedSwitches],
      unlockedDoors: [...this.state.unlockedDoors],
      collectedItems: [...this.state.collectedItems],
      solvedPanels: [...this.state.solvedPanels],
      objectives: this.state.objectives.map(o => ({ ...o })),
      startTime: this.state.startTime,
      completedAt: this.state.completedAt,
    };
    return JSON.stringify(serializable);
  }

  static deserialize(data: string): PuzzleRoomState {
    const parsed = JSON.parse(data) as SerializedRoomState;
    return {
      roomId: parsed.roomId,
      inventory: parsed.inventory,
      activatedSwitches: new Set(parsed.activatedSwitches),
      unlockedDoors: new Set(parsed.unlockedDoors),
      collectedItems: new Set(parsed.collectedItems),
      solvedPanels: new Set(parsed.solvedPanels),
      objectives: parsed.objectives,
      startTime: parsed.startTime,
      completedAt: parsed.completedAt,
    };
  }

  get roomState(): PuzzleRoomState {
    return this.state;
  }
}
