import type { PrismaClient } from "@prisma/client";
import type { InventoryEntry, QuestProgressState, QuestId } from "@nulldistrict/shared";
import { getItemDefinition, getQuestDefinition, questDefinitions } from "@nulldistrict/game-data";

export async function listInventory(prisma: PrismaClient, userId: string): Promise<InventoryEntry[]> {
  const entries = await prisma.inventoryItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }
  });

  return entries.map((entry) => {
    const definition = getItemDefinition(entry.itemId);
    return {
      id: entry.id,
      itemId: entry.itemId,
      name: definition?.name ?? entry.itemId,
      description: definition?.description ?? "Unknown item.",
      type: entry.itemType as InventoryEntry["type"],
      quantity: entry.quantity,
      iconKey: definition?.iconKey ?? "icon-unknown"
    };
  });
}

export async function grantItem(
  prisma: PrismaClient,
  userId: string,
  itemId: string,
  quantity = 1
): Promise<InventoryEntry[]> {
  const definition = getItemDefinition(itemId);
  if (!definition) return listInventory(prisma, userId);

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: {
      userId,
      itemId,
      itemType: definition.type,
      quantity
    },
    update: {
      quantity: { increment: quantity }
    }
  });

  return listInventory(prisma, userId);
}

export async function ensureQuestRows(prisma: PrismaClient, userId: string) {
  await Promise.all(
    questDefinitions.map((quest) =>
      prisma.questProgress.upsert({
        where: { userId_questId: { userId, questId: quest.id } },
        create: {
          userId,
          questId: quest.id,
          current: 0,
          completed: false
        },
        update: {}
      })
    )
  );
}

export async function listQuestProgress(prisma: PrismaClient, userId: string): Promise<QuestProgressState[]> {
  await ensureQuestRows(prisma, userId);
  const progress = await prisma.questProgress.findMany({
    where: { userId },
    include: { quest: true },
    orderBy: { questId: "asc" }
  });

  return progress.map((entry) => ({
    questId: entry.questId as QuestId,
    title: entry.quest.title,
    current: entry.current,
    target: entry.quest.target,
    completed: entry.completed,
    claimedAt: entry.claimedAt?.toISOString() ?? null
  }));
}

export async function advanceQuest(
  prisma: PrismaClient,
  userId: string,
  questId: QuestId,
  amount = 1
): Promise<QuestProgressState[]> {
  const quest = getQuestDefinition(questId);
  if (!quest) return listQuestProgress(prisma, userId);

  const existing = await prisma.questProgress.upsert({
    where: { userId_questId: { userId, questId } },
    create: {
      userId,
      questId,
      current: 0,
      completed: false
    },
    update: {}
  });

  if (existing.completed) return listQuestProgress(prisma, userId);

  const nextCurrent = Math.min(quest.target, existing.current + amount);
  const completed = nextCurrent >= quest.target;
  const justCompleted = completed && !existing.completed;

  await prisma.$transaction(async (tx) => {
    await tx.questProgress.update({
      where: { id: existing.id },
      data: {
        current: nextCurrent,
        completed,
        claimedAt: justCompleted ? new Date() : existing.claimedAt
      }
    });

    if (justCompleted) {
      await tx.user.update({
        where: { id: userId },
        data: {
          softCurrency: { increment: quest.rewardSoftCurrency }
        }
      });

      const character = await tx.character.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
      if (character) {
        const xp = character.xp + quest.rewardXp;
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

      await tx.playerStats.upsert({
        where: { userId },
        create: { userId, totalXp: quest.rewardXp },
        update: { totalXp: { increment: quest.rewardXp } }
      });

      if (quest.unlocksArea) {
        await tx.unlockedArea.upsert({
          where: { userId_areaId: { userId, areaId: quest.unlocksArea } },
          create: { userId, areaId: quest.unlocksArea },
          update: {}
        });
      }

      if (questId === "read-broken-terminal") {
        await tx.loreFragment.upsert({
          where: { userId_fragmentId: { userId, fragmentId: "broken-terminal-a" } },
          create: {
            userId,
            fragmentId: "broken-terminal-a",
            title: "Broken Terminal A",
            body: "Staff evacuation denied by a command nobody recognizes. The district remembers you."
          },
          update: {}
        });
      }
    }
  });

  return listQuestProgress(prisma, userId);
}
