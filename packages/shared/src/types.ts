import type { AREA_IDS, QUEST_IDS, RELEASE_CHANNELS } from "./constants.js";

export type AreaId = (typeof AREA_IDS)[number];
export type QuestId = (typeof QUEST_IDS)[number];
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

export type AccountRole = "PLAYER" | "MODERATOR" | "ADMIN" | "DEVELOPER";
export type ItemType = "material" | "lore" | "cosmetic" | "consumable" | "quest";
export type CurrencyType = "SOFT" | "PREMIUM";
export type ShopProductType = "PREMIUM_CURRENCY" | "COSMETIC" | "BATTLE_PASS" | "FOUNDER_PACK";
export type CosmeticSlot = "skin" | "title" | "banner" | "emote" | "pet";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "founder";
export type PlayerClass = "Signal Runner" | "Relay Warden" | "Null Analyst";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: AccountRole;
  premiumCurrency: number;
  softCurrency: number;
  isBanned: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface CharacterSummary {
  id: string;
  name: string;
  className: PlayerClass;
  level: number;
  xp: number;
  skillPoints: number;
  areaId: AreaId;
  createdAt: string;
}

export interface InventoryEntry {
  id: string;
  itemId: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  iconKey: string;
}

export interface QuestProgressState {
  questId: QuestId;
  title: string;
  chapter: string;
  objective: string;
  current: number;
  target: number;
  rewardXp: number;
  rewardSoftCurrency: number;
  completed: boolean;
  claimedAt?: string | null;
}

export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  productType: ShopProductType;
  priceCents: number;
  premiumPrice?: number;
  grantsPremium?: number;
  cosmeticId?: string;
  enabled: boolean;
}

export interface PurchaseHistoryEntry {
  id: string;
  productTitle: string;
  productType: ShopProductType;
  provider: string;
  status: string;
  amountCents: number;
  premiumGranted: number;
  createdAt: string;
}

export interface CheckoutSessionResponse {
  url: string;
  purchaseId: string;
}

export interface PuzzleSolveResponse {
  solved: true;
  message: string;
  quests: QuestProgressState[];
  inventory: InventoryEntry[];
}

export interface RunExtractionResponse {
  extracted: true;
  caseId: string;
  caseTitle: string;
  rank: "C" | "B" | "A" | "S";
  recoveredEvidence: number;
  message: string;
  rewards: {
    xp: number;
    softCurrency: number;
    itemName?: string;
  };
  quests: QuestProgressState[];
  inventory: InventoryEntry[];
}

export interface CoopSyncState {
  puzzleId: string;
  activeNodes: string[];
  requiredNodes: number;
  solved: boolean;
  message: string;
}

export interface ServerStatus {
  online: boolean;
  message: string;
  build: string;
  releaseChannel: ReleaseChannel;
  connectedPlayers: number;
  startedAt: string;
  serverTime: string;
}

export interface PlayerNetState {
  userId: string;
  characterId: string;
  username: string;
  areaId: AreaId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: "left" | "right";
  hp: number;
  energy: number;
  animation: "idle" | "run" | "jump" | "fall" | "dash" | "attack" | "dead";
  updatedAt: number;
}

export interface EnemyNetState {
  id: string;
  areaId: AreaId;
  kind: "corrupted-scout" | "signal-wraith";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  animation: "idle" | "patrol" | "chase" | "attack" | "dead";
}

export interface DamageEvent {
  id: string;
  targetId: string;
  amount: number;
  x: number;
  y: number;
  kind: "melee" | "ability" | "enemy" | "pvp";
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  sentAt: string;
  areaId: AreaId;
}

export interface WorldSnapshot {
  areaId: AreaId;
  instanceId: string;
  players: PlayerNetState[];
  enemies: EnemyNetState[];
  serverTime: number;
}

export interface ClientToServerEvents {
  "instance:join": (payload: { areaId: AreaId; characterId: string; instanceId?: string }) => void;
  "instance:leave": () => void;
  "player:state": (payload: PlayerNetState) => void;
  "combat:attack": (payload: {
    attackId: string;
    areaId: AreaId;
    targetId: string;
    targetType: "enemy" | "player";
    kind: "melee" | "ability";
    x: number;
    y: number;
  }) => void;
  "inventory:pickup": (payload: { pickupId: string; areaId: AreaId; x: number; y: number }) => void;
  "player:death": (payload: { characterId: string; areaId: AreaId }) => void;
  "quest:choice": (payload: { questId: QuestId; flag: string; value: boolean }) => void;
  "coop:sync-node": (payload: { areaId: AreaId; nodeId: string; puzzleId: string }) => void;
  "chat:send": (payload: { areaId: AreaId; message: string }) => void;
  "party:invite": (payload: { username: string }) => void;
}

export interface ServerToClientEvents {
  "instance:joined": (snapshot: WorldSnapshot) => void;
  "instance:error": (payload: { message: string }) => void;
  "player:joined": (payload: PlayerNetState) => void;
  "player:left": (payload: { userId: string; characterId: string }) => void;
  "player:state": (payload: PlayerNetState) => void;
  "enemy:state": (payload: EnemyNetState[]) => void;
  "combat:damage": (payload: DamageEvent) => void;
  "combat:defeated": (payload: { targetId: string; rewards?: InventoryEntry[] }) => void;
  "inventory:updated": (payload: { entries: InventoryEntry[] }) => void;
  "quest:updated": (payload: QuestProgressState[]) => void;
  "coop:sync-state": (payload: CoopSyncState) => void;
  "player:death-confirmed": (payload: { lostSoftCurrency: number; respawnAreaId: AreaId }) => void;
  "chat:message": (payload: ChatMessage) => void;
  "party:notice": (payload: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  role: AccountRole;
  characterId?: string;
  currentRoom?: string;
}
