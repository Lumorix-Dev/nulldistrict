import type {
  AuthResponse,
  CharacterSummary,
  CheckoutSessionResponse,
  InventoryEntry,
  PurchaseHistoryEntry,
  PublicUser,
  PuzzleSolveResponse,
  QuestProgressState,
  ServerStatus,
  ShopProduct
} from "@nulldistrict/shared";
import { DEFAULT_SERVER_URL } from "@nulldistrict/shared";

export const API_BASE_URL = import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL;

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  status: () => request<ServerStatus & { database: string }>("/api/status"),
  health: () => request<{ ok: boolean }>("/api/health"),
  register: (payload: { username: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { identifier: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) =>
    request<void>("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: (token: string) =>
    request<{ user: PublicUser; cosmetics: unknown[]; stats: unknown }>("/api/account/me", { token }),
  characters: (token: string) =>
    request<{ characters: CharacterSummary[] }>("/api/characters", { token }),
  createCharacter: (token: string, payload: { name: string; className: CharacterSummary["className"] }) =>
    request<{ character: CharacterSummary }>("/api/characters", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  inventory: (token: string) =>
    request<{ inventory: InventoryEntry[] }>("/api/inventory", { token }),
  useItem: (token: string, itemId: string) =>
    request<{ inventory: InventoryEntry[]; effect: { heal: number } }>("/api/inventory/use", {
      method: "POST",
      token,
      body: JSON.stringify({ itemId })
    }),
  solvePuzzle: (token: string, payload: { puzzleId: string; sequence: string[] }) =>
    request<PuzzleSolveResponse>("/api/puzzles/solve", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  quests: (token: string) =>
    request<{ quests: QuestProgressState[] }>("/api/quests", { token }),
  advanceQuest: (token: string, payload: { questId: string; amount?: number; storyFlag?: { key: string; value: boolean } }) =>
    request<{ quests: QuestProgressState[] }>("/api/quests/progress", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  shopProducts: () => request<{ products: ShopProduct[]; message?: string }>("/api/shop/products"),
  purchaseHistory: (token: string) =>
    request<{ purchases: PurchaseHistoryEntry[] }>("/api/shop/purchases", { token }),
  purchaseTest: (token: string, productSlug: string) =>
    request<{ balances: { soft: number; premium: number } }>("/api/shop/purchase-test", {
      method: "POST",
      token,
      body: JSON.stringify({ productSlug })
    }),
  createCheckoutSession: (token: string, productSlug: string) =>
    request<CheckoutSessionResponse>("/api/shop/stripe/create-checkout-session", {
      method: "POST",
      token,
      body: JSON.stringify({ productSlug })
    })
};
