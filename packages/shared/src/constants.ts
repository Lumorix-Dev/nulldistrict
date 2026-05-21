export const PRODUCT_NAME = "Lumorix: Null District";
export const SAFE_WINDOWS_PRODUCT_NAME = "Lumorix Null District";
export const APP_IDENTIFIER = "com.lumorix.nulldistrict";
export const VERSION = "0.1.0-beta.7";
export const DEFAULT_SERVER_URL = "http://localhost:4000";
export const MAX_INSTANCE_PLAYERS = 8;
export const MIN_INSTANCE_PLAYERS = 4;
export const CHAT_WINDOW_MS = 10_000;
export const CHAT_MAX_MESSAGES_PER_WINDOW = 5;

export const AREA_IDS = [
  "signal-haven",
  "district-entrance",
  "underground-sector-a",
  "mirror-archive",
  "blackout-theater",
  "pvp-breach-zone"
] as const;

export const QUEST_IDS = [
  "enter-null-district",
  "restore-first-relay",
  "collect-signal-fragments",
  "extract-first-signal",
  "enter-mirror-archive",
  "scan-echo-residue",
  "synchronize-archive-nodes",
  "decode-mirror-archive",
  "recover-theater-reel",
  "extract-mirror-case",
  "defeat-corrupted-scout",
  "read-broken-terminal"
] as const;

export const RELEASE_CHANNELS = ["beta", "stable"] as const;
