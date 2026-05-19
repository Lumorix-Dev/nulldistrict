import { PrismaClient } from "@prisma/client";
import {
  battlePassDefinition,
  cosmeticDefinitions,
  itemDefinitions,
  questDefinitions,
  shopProducts
} from "@nulldistrict/game-data";

const prisma = new PrismaClient();

async function main() {
  for (const item of itemDefinitions) {
    await prisma.itemCatalog.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        itemType: item.type,
        rarity: item.rarity,
        iconKey: item.iconKey,
        stackLimit: item.stackLimit
      },
      update: {
        name: item.name,
        description: item.description,
        itemType: item.type,
        rarity: item.rarity,
        iconKey: item.iconKey,
        stackLimit: item.stackLimit,
        enabled: true
      }
    });
  }

  for (const cosmetic of cosmeticDefinitions) {
    await prisma.cosmetic.upsert({
      where: { id: cosmetic.id },
      create: {
        id: cosmetic.id,
        name: cosmetic.name,
        slot: cosmetic.slot,
        rarity: cosmetic.rarity,
        description: cosmetic.description
      },
      update: {
        name: cosmetic.name,
        slot: cosmetic.slot,
        rarity: cosmetic.rarity,
        description: cosmetic.description,
        enabled: true
      }
    });
  }

  for (const product of shopProducts) {
    await prisma.shopProduct.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        productType: product.productType,
        priceCents: product.priceCents,
        premiumPrice: product.premiumPrice,
        grantsPremium: product.grantsPremium,
        cosmeticId: product.cosmeticId,
        enabled: product.enabled
      },
      update: {
        slug: product.slug,
        title: product.title,
        description: product.description,
        productType: product.productType,
        priceCents: product.priceCents,
        premiumPrice: product.premiumPrice,
        grantsPremium: product.grantsPremium,
        cosmeticId: product.cosmeticId,
        enabled: product.enabled
      }
    });
  }

  for (const quest of questDefinitions) {
    await prisma.quest.upsert({
      where: { id: quest.id },
      create: {
        id: quest.id,
        title: quest.title,
        chapter: quest.chapter,
        description: quest.description,
        objective: quest.objective,
        target: quest.target,
        rewardXp: quest.rewardXp,
        rewardSoftCurrency: quest.rewardSoftCurrency
      },
      update: {
        title: quest.title,
        chapter: quest.chapter,
        description: quest.description,
        objective: quest.objective,
        target: quest.target,
        rewardXp: quest.rewardXp,
        rewardSoftCurrency: quest.rewardSoftCurrency,
        enabled: true
      }
    });
  }

  await prisma.battlePass.upsert({
    where: { id: battlePassDefinition.id },
    create: {
      id: battlePassDefinition.id,
      title: battlePassDefinition.title,
      season: "beta-1",
      active: true,
      cosmeticsOnly: true
    },
    update: {
      title: battlePassDefinition.title,
      season: "beta-1",
      active: true,
      cosmeticsOnly: true
    }
  });

  console.log("Seeded Null District beta data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
