CREATE TYPE "AccountRole" AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN', 'DEVELOPER');
CREATE TYPE "ItemType" AS ENUM ('material', 'lore', 'cosmetic', 'consumable', 'quest');
CREATE TYPE "CurrencyType" AS ENUM ('SOFT', 'PREMIUM');
CREATE TYPE "ShopProductType" AS ENUM ('PREMIUM_CURRENCY', 'COSMETIC', 'BATTLE_PASS', 'FOUNDER_PACK');
CREATE TYPE "CosmeticSlot" AS ENUM ('skin', 'title', 'banner', 'emote', 'pet');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "AccountRole" NOT NULL DEFAULT 'PLAYER',
  "premiumCurrency" INTEGER NOT NULL DEFAULT 0,
  "softCurrency" INTEGER NOT NULL DEFAULT 100,
  "isBanned" BOOLEAN NOT NULL DEFAULT false,
  "banReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessionToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "areaId" TEXT NOT NULL DEFAULT 'signal-haven',
  "level" INTEGER NOT NULL DEFAULT 1,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "skillPoints" INTEGER NOT NULL DEFAULT 0,
  "storyFlags" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "itemType" "ItemType" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemCatalog" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "itemType" "ItemType" NOT NULL,
  "rarity" TEXT NOT NULL,
  "iconKey" TEXT NOT NULL,
  "stackLimit" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cosmetic" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slot" "CosmeticSlot" NOT NULL,
  "rarity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Cosmetic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnedCosmetic" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cosmeticId" TEXT NOT NULL,
  "equipped" BOOLEAN NOT NULL DEFAULT false,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnedCosmetic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrencyBalance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CurrencyType" NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurrencyBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopProduct" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "productType" "ShopProductType" NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "premiumPrice" INTEGER,
  "grantsPremium" INTEGER,
  "cosmeticId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'test',
  "providerSessionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "premiumGranted" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattlePass" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT false,
  "cosmeticsOnly" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "BattlePass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattlePassProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "battlePassId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "premium" BOOLEAN NOT NULL DEFAULT false,
  "claimed" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattlePassProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quest" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "chapter" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "target" INTEGER NOT NULL,
  "rewardXp" INTEGER NOT NULL,
  "rewardSoftCurrency" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questId" TEXT NOT NULL,
  "current" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "claimedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoreFragment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fragmentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoreFragment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnlockedArea" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnlockedArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerStats" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "deaths" INTEGER NOT NULL DEFAULT 0,
  "enemiesDefeated" INTEGER NOT NULL DEFAULT 0,
  "pvpDefeats" INTEGER NOT NULL DEFAULT 0,
  "firstDeathAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sanction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "SessionToken_tokenHash_key" ON "SessionToken"("tokenHash");
CREATE UNIQUE INDEX "Character_userId_name_key" ON "Character"("userId", "name");
CREATE UNIQUE INDEX "InventoryItem_userId_itemId_key" ON "InventoryItem"("userId", "itemId");
CREATE UNIQUE INDEX "OwnedCosmetic_userId_cosmeticId_key" ON "OwnedCosmetic"("userId", "cosmeticId");
CREATE UNIQUE INDEX "CurrencyBalance_userId_type_key" ON "CurrencyBalance"("userId", "type");
CREATE UNIQUE INDEX "ShopProduct_slug_key" ON "ShopProduct"("slug");
CREATE UNIQUE INDEX "BattlePassProgress_userId_battlePassId_key" ON "BattlePassProgress"("userId", "battlePassId");
CREATE UNIQUE INDEX "QuestProgress_userId_questId_key" ON "QuestProgress"("userId", "questId");
CREATE UNIQUE INDEX "LoreFragment_userId_fragmentId_key" ON "LoreFragment"("userId", "fragmentId");
CREATE UNIQUE INDEX "UnlockedArea_userId_areaId_key" ON "UnlockedArea"("userId", "areaId");
CREATE UNIQUE INDEX "PlayerStats_userId_key" ON "PlayerStats"("userId");

ALTER TABLE "SessionToken" ADD CONSTRAINT "SessionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnedCosmetic" ADD CONSTRAINT "OwnedCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnedCosmetic" ADD CONSTRAINT "OwnedCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "Cosmetic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurrencyBalance" ADD CONSTRAINT "CurrencyBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BattlePassProgress" ADD CONSTRAINT "BattlePassProgress_battlePassId_fkey" FOREIGN KEY ("battlePassId") REFERENCES "BattlePass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoreFragment" ADD CONSTRAINT "LoreFragment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnlockedArea" ADD CONSTRAINT "UnlockedArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
