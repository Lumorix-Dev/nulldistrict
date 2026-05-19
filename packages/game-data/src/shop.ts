import type { ShopProduct } from "@nulldistrict/shared";

export const shopProducts: ShopProduct[] = [
  {
    id: "prod_founder_pack",
    slug: "founder-pack-beta",
    title: "Founder Pack",
    description: "Founder title, profile banner, skin placeholder and premium currency. No gameplay power.",
    productType: "FOUNDER_PACK",
    priceCents: 1999,
    grantsPremium: 1200,
    cosmeticId: "founder-skin",
    enabled: true
  },
  {
    id: "prod_500_premium",
    slug: "premium-500-beta",
    title: "500 Null Credits",
    description: "Premium currency test bundle. Purchases stay disabled until Stripe is configured.",
    productType: "PREMIUM_CURRENCY",
    priceCents: 499,
    grantsPremium: 500,
    enabled: true
  },
  {
    id: "prod_relay_emote",
    slug: "relay-emote",
    title: "Relay Restore Emote",
    description: "Cosmetic emote only.",
    productType: "COSMETIC",
    priceCents: 0,
    premiumPrice: 300,
    cosmeticId: "relay-emote",
    enabled: true
  },
  {
    id: "prod_beta_battle_pass",
    slug: "first-signal-pass",
    title: "The First Signal Pass",
    description: "Cosmetics-only beta battle pass scaffold with free and premium tracks.",
    productType: "BATTLE_PASS",
    priceCents: 999,
    enabled: true
  }
];
