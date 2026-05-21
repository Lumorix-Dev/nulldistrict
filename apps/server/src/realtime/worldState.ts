import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {
  AreaId,
  ChatMessage,
  CoopSyncState,
  DamageEvent,
  EnemyNetState,
  PlayerNetState,
  QuestId,
} from "@nulldistrict/shared";
import { CHAT_MAX_MESSAGES_PER_WINDOW, CHAT_WINDOW_MS, MAX_INSTANCE_PLAYERS } from "@nulldistrict/shared";
import { areaDefinitions, getAreaDefinition } from "@nulldistrict/game-data";
import { advanceQuest, grantItem, listInventory, listQuestProgress } from "../utils/gameRewards.js";

interface InstanceState {
  id: string;
  areaId: AreaId;
  room: string;
  players: Map<string, PlayerNetState>;
  enemies: EnemyNetState[];
  enemyDirection: Map<string, 1 | -1>;
  syncNodes: Map<string, { nodeId: string; puzzleId: string; characterId: string; userId: string; until: number }>;
  chatWindows: Map<string, number[]>;
  createdAt: number;
}

type ActiveSyncNode = InstanceState["syncNodes"] extends Map<string, infer T> ? T : never;

function createEnemies(areaId: AreaId): EnemyNetState[] {
  const area = getAreaDefinition(areaId);
  return area.enemySpawns.map((spawn) => ({
    id: spawn.id,
    areaId,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    hp: spawn.hp,
    maxHp: spawn.hp,
    animation: "patrol"
  }));
}

export class WorldState {
  private readonly instances = new Map<string, InstanceState>();

  public constructor(private readonly prisma: PrismaClient) {}

  public getConnectedPlayers() {
    let count = 0;
    for (const instance of this.instances.values()) count += instance.players.size;
    return count;
  }

  public getOrCreateInstance(areaId: AreaId, requestedId = "beta-1") {
    const room = `${areaId}:${requestedId}`;
    const existing = this.instances.get(room);
    if (existing && existing.players.size < MAX_INSTANCE_PLAYERS) return existing;

    const id = existing ? `beta-${Date.now()}` : requestedId;
    const nextRoom = `${areaId}:${id}`;
    const instance: InstanceState = {
      id,
      areaId,
      room: nextRoom,
      players: new Map(),
      enemies: createEnemies(areaId),
      enemyDirection: new Map(createEnemies(areaId).map((enemy) => [enemy.id, 1 as const])),
      syncNodes: new Map(),
      chatWindows: new Map(),
      createdAt: Date.now()
    };
    this.instances.set(nextRoom, instance);
    return instance;
  }

  public join(areaId: AreaId, player: PlayerNetState, instanceId?: string) {
    const instance = this.getOrCreateInstance(areaId, instanceId);
    instance.players.set(player.characterId, player);
    return instance;
  }

  public leave(room: string | undefined, characterId: string | undefined) {
    if (!room || !characterId) return;
    const instance = this.instances.get(room);
    if (!instance) return;
    instance.players.delete(characterId);
    if (instance.players.size === 0 && Date.now() - instance.createdAt > 15_000) {
      this.instances.delete(room);
    }
  }

  public updatePlayer(room: string | undefined, player: PlayerNetState) {
    if (!room) return;
    const instance = this.instances.get(room);
    if (!instance) return;
    instance.players.set(player.characterId, {
      ...player,
      x: Math.round(player.x),
      y: Math.round(player.y),
      vx: Math.round(player.vx),
      vy: Math.round(player.vy),
      updatedAt: Date.now()
    });
  }

  public getSnapshot(room: string) {
    const instance = this.instances.get(room);
    if (!instance) return undefined;
    return {
      areaId: instance.areaId,
      instanceId: instance.id,
      players: [...instance.players.values()],
      enemies: instance.enemies,
      serverTime: Date.now()
    };
  }

  public tickEnemies(deltaMs: number) {
    for (const instance of this.instances.values()) {
      const area = getAreaDefinition(instance.areaId);
      for (const enemy of instance.enemies) {
        if (enemy.hp <= 0) continue;
        const spawn = area.enemySpawns.find((candidate) => candidate.id === enemy.id);
        if (!spawn) continue;

        const nearest = [...instance.players.values()].sort(
          (a, b) => Math.abs(a.x - enemy.x) - Math.abs(b.x - enemy.x)
        )[0];
        if (nearest && Math.abs(nearest.x - enemy.x) < 360 && Math.abs(nearest.y - enemy.y) < 180) {
          enemy.animation = "chase";
          enemy.x += Math.sign(nearest.x - enemy.x) * (deltaMs / 1000) * 72;
        } else {
          enemy.animation = "patrol";
          const direction = instance.enemyDirection.get(enemy.id) ?? 1;
          enemy.x += direction * (deltaMs / 1000) * 48;
          if (enemy.x > spawn.patrolMax) instance.enemyDirection.set(enemy.id, -1);
          if (enemy.x < spawn.patrolMin) instance.enemyDirection.set(enemy.id, 1);
        }
      }
    }
  }

  public async attack(room: string | undefined, attackerCharacterId: string | undefined, payload: {
    attackId: string;
    areaId: AreaId;
    targetId: string;
    targetType: "enemy" | "player";
    kind: "melee" | "ability";
    x: number;
    y: number;
  }) {
    if (!room || !attackerCharacterId) return undefined;
    const instance = this.instances.get(room);
    if (!instance || instance.areaId !== payload.areaId) return undefined;
    const attacker = instance.players.get(attackerCharacterId);
    if (!attacker) return undefined;

    if (payload.targetType === "player") {
      const area = areaDefinitions.find((candidate) => candidate.id === payload.areaId);
      if (!area?.pvpEnabled) return { damage: undefined, rewards: undefined };
      const target = [...instance.players.values()].find((player) => player.characterId === payload.targetId);
      if (!target) return undefined;
      const damage: DamageEvent = {
        id: randomUUID(),
        targetId: target.characterId,
        amount: payload.kind === "ability" ? 18 : 12,
        x: target.x,
        y: target.y - 40,
        kind: "pvp"
      };
      return { damage, rewards: undefined };
    }

    const enemy = instance.enemies.find((candidate) => candidate.id === payload.targetId);
    if (!enemy || enemy.hp <= 0) return undefined;

    const distance = Math.hypot(enemy.x - attacker.x, enemy.y - attacker.y);
    const allowed = payload.kind === "ability" ? distance < 640 : distance < 128;
    if (!allowed) return undefined;

    const amount = payload.kind === "ability" ? 34 : 24;
    enemy.hp = Math.max(0, enemy.hp - amount);
    enemy.animation = enemy.hp === 0 ? "dead" : "attack";

    const damage: DamageEvent = {
      id: randomUUID(),
      targetId: enemy.id,
      amount,
      x: enemy.x,
      y: enemy.y - 48,
      kind: payload.kind
    };

    if (enemy.hp === 0) {
      const xpReward = enemy.kind === "signal-wraith" ? 12 : 8;
      await this.prisma.$transaction(async (tx) => {
        await tx.playerStats.upsert({
          where: { userId: attacker.userId },
          create: { userId: attacker.userId, enemiesDefeated: 1, totalXp: xpReward },
          update: { enemiesDefeated: { increment: 1 }, totalXp: { increment: xpReward } }
        });
        const character = await tx.character.findFirst({
          where: { userId: attacker.userId, id: attacker.characterId },
          orderBy: { updatedAt: "desc" }
        });
        if (character) {
          const xp = character.xp + xpReward;
          const nextLevel = 1 + Math.floor(xp / 300);
          await tx.character.update({
            where: { id: character.id },
            data: {
              xp,
              level: Math.max(character.level, nextLevel),
              skillPoints: nextLevel > character.level ? { increment: nextLevel - character.level } : undefined
            }
          });
        }
      });

      const rewards = enemy.kind === "signal-wraith" ? await grantItem(this.prisma, attacker.userId, "med_patch", 1) : [];
      if (enemy.kind === "corrupted-scout") {
        await advanceQuest(this.prisma, attacker.userId, "defeat-corrupted-scout");
      }

      setTimeout(() => {
        enemy.hp = enemy.maxHp;
        enemy.animation = "patrol";
      }, 8_000);

      return { damage, rewards };
    }

    return { damage, rewards: undefined };
  }

  public async syncNode(
    userId: string,
    room: string | undefined,
    characterId: string | undefined,
    payload: { areaId: AreaId; nodeId: string; puzzleId: string }
  ): Promise<{ state: CoopSyncState; updatedUserIds: string[] } | undefined> {
    if (!room || !characterId) return undefined;
    const instance = this.instances.get(room);
    const player = instance?.players.get(characterId);
    if (!instance || !player || instance.areaId !== payload.areaId) return undefined;

    const area = getAreaDefinition(payload.areaId);
    const node = area.interactables.find(
      (entry) => entry.id === payload.nodeId && entry.action === "sync-node" && entry.puzzleId === payload.puzzleId
    );
    if (!node) return undefined;

    const distance = Math.hypot(player.x - node.x, player.y - node.y);
    if (distance > 180) return undefined;

    const now = Date.now();
    for (const [nodeId, active] of instance.syncNodes.entries()) {
      if (active.until <= now) instance.syncNodes.delete(nodeId);
    }

    instance.syncNodes.set(payload.nodeId, {
      nodeId: payload.nodeId,
      puzzleId: payload.puzzleId,
      characterId,
      userId,
      until: now + 20_000
    });

    const puzzleNodeIds = area.interactables
      .filter((entry) => entry.action === "sync-node" && entry.puzzleId === payload.puzzleId)
      .map((entry) => entry.id);
    const activeNodes = puzzleNodeIds
      .map((nodeId) => instance.syncNodes.get(nodeId))
      .filter((entry): entry is ActiveSyncNode => entry !== undefined && entry.until > now);
    const activeNodeIds = [...new Set(activeNodes.map((entry) => entry.nodeId))];
    const activeCharacters = new Set(activeNodes.map((entry) => entry.characterId));
    const requiredNodes = Math.min(2, puzzleNodeIds.length);
    const soloReroute = instance.players.size === 1 && activeNodeIds.length >= requiredNodes;
    const solved = activeNodeIds.length >= requiredNodes && (activeCharacters.size >= requiredNodes || soloReroute);

    let updatedUserIds: string[] = [];
    if (solved) {
      updatedUserIds = [...new Set([...instance.players.values()].map((participant) => participant.userId))];
      await Promise.all(
        updatedUserIds.map(async (participantUserId) => {
          await advanceQuest(this.prisma, participantUserId, "synchronize-archive-nodes");
          const existingKey = await this.prisma.inventoryItem.findUnique({
            where: { userId_itemId: { userId: participantUserId, itemId: "archive_key" } },
            select: { id: true }
          });
          if (!existingKey) await grantItem(this.prisma, participantUserId, "archive_key", 1);
        })
      );
    }

    return {
      state: {
        puzzleId: payload.puzzleId,
        activeNodes: activeNodeIds,
        requiredNodes,
        solved,
        message: solved
          ? "Twin sync accepted. Archive Key granted to this instance."
          : `${activeNodeIds.length}/${requiredNodes} sync nodes armed. A second operator or a fast solo reroute must arm the mirror node within 20 seconds.`
      },
      updatedUserIds
    };
  }

  public canSendChat(room: string, userId: string) {
    const instance = this.instances.get(room);
    if (!instance) return false;
    const now = Date.now();
    const messages = instance.chatWindows.get(userId)?.filter((time) => now - time < CHAT_WINDOW_MS) ?? [];
    if (messages.length >= CHAT_MAX_MESSAGES_PER_WINDOW) return false;
    messages.push(now);
    instance.chatWindows.set(userId, messages);
    return true;
  }

  public createChat(areaId: AreaId, userId: string, username: string, message: string): ChatMessage {
    return {
      id: randomUUID(),
      areaId,
      userId,
      username,
      message,
      sentAt: new Date().toISOString()
    };
  }

  public async pickup(
    userId: string,
    room: string | undefined,
    characterId: string | undefined,
    payload: { pickupId: string; areaId: AreaId; x: number; y: number }
  ) {
    if (!room || !characterId) return undefined;
    const instance = this.instances.get(room);
    const player = instance?.players.get(characterId);
    if (!instance || !player || instance.areaId !== payload.areaId) return undefined;

    const pickup = getAreaDefinition(payload.areaId).interactables.find(
      (entry) => entry.type === "pickup" && entry.id === payload.pickupId
    );
    if (!pickup) return undefined;

    const distance = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    if (distance > 180) return undefined;

    const itemId = pickup.itemId ?? "signal_fragment";
    const inventory = await grantItem(this.prisma, userId, itemId, 1);
    const questByPickupItem: Partial<Record<string, QuestId>> = {
      signal_fragment: "collect-signal-fragments",
      echo_residue: "scan-echo-residue",
      theater_reel: "recover-theater-reel"
    };
    const questId = questByPickupItem[itemId];
    if (questId) await advanceQuest(this.prisma, userId, questId);
    return inventory;
  }

  public async quests(userId: string) {
    return listQuestProgress(this.prisma, userId);
  }

  public async inventory(userId: string) {
    return listInventory(this.prisma, userId);
  }

  public async recordDeath(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { softCurrency: true } });
    const stats = await this.prisma.playerStats.findUnique({ where: { userId }, select: { firstDeathAt: true } });
    const lost = Math.min(10, user?.softCurrency ?? 0);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { softCurrency: { decrement: lost } }
      }),
      this.prisma.playerStats.upsert({
        where: { userId },
        create: { userId, deaths: 1, firstDeathAt: new Date() },
        update: { deaths: { increment: 1 }, firstDeathAt: stats?.firstDeathAt ?? new Date() }
      })
    ]);
    return lost;
  }
}
