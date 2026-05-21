import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  AreaId,
  CoopSyncState,
  PlayerNetState,
  EnemyNetState,
  InventoryEntry,
  QuestProgressState
} from "@nulldistrict/shared";
import { API_BASE_URL } from "../../api/client";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class RealtimeClient extends EventTarget {
  public socket: GameSocket | null = null;
  public enemies = new Map<string, EnemyNetState>();
  public remotePlayers = new Map<string, PlayerNetState>();
  public connected = false;

  public connect(token: string) {
    if (this.socket?.connected) return this.socket;
    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    this.socket.on("connect", () => {
      this.connected = true;
      this.dispatch("status", { connected: true });
    });
    this.socket.on("disconnect", () => {
      this.connected = false;
      this.remotePlayers.clear();
      this.dispatch("status", { connected: false });
    });
    this.socket.on("instance:joined", (snapshot) => {
      this.enemies = new Map(snapshot.enemies.map((enemy) => [enemy.id, enemy]));
      this.remotePlayers = new Map(snapshot.players.map((player) => [player.characterId, player]));
      this.dispatch("snapshot", snapshot);
    });
    this.socket.on("player:joined", (player) => {
      this.remotePlayers.set(player.characterId, player);
      this.dispatch("players", [...this.remotePlayers.values()]);
    });
    this.socket.on("player:left", (payload) => {
      this.remotePlayers.delete(payload.characterId);
      this.dispatch("players", [...this.remotePlayers.values()]);
    });
    this.socket.on("player:state", (player) => {
      this.remotePlayers.set(player.characterId, player);
      this.dispatch("players", [...this.remotePlayers.values()]);
    });
    this.socket.on("enemy:state", (enemies) => {
      this.enemies = new Map(enemies.map((enemy) => [enemy.id, enemy]));
      this.dispatch("enemies", enemies);
    });
    this.socket.on("combat:damage", (event) => this.dispatch("damage", event));
    this.socket.on("combat:defeated", (event) => this.dispatch("defeated", event));
    this.socket.on("inventory:updated", (payload: { entries: InventoryEntry[] }) => this.dispatch("inventory", payload.entries));
    this.socket.on("quest:updated", (payload: QuestProgressState[]) => this.dispatch("quests", payload));
    this.socket.on("coop:sync-state", (payload: CoopSyncState) => this.dispatch("coop-sync", payload));
    this.socket.on("chat:message", (message) => this.dispatch("chat", message));
    this.socket.on("player:death-confirmed", (payload) => this.dispatch("death", payload));
    return this.socket;
  }

  public join(areaId: AreaId, characterId: string) {
    this.socket?.emit("instance:join", { areaId, characterId, instanceId: "beta-1" });
  }

  public leave() {
    this.socket?.emit("instance:leave");
  }

  public sendState(state: PlayerNetState) {
    this.socket?.emit("player:state", state);
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private dispatch(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
