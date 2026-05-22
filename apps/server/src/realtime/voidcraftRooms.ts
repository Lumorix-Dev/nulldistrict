/**
 * VoidCraft co-op room manager.
 * Lightweight — no Prisma, no persistence.
 * Rooms are ephemeral: they exist as long as at least one player is in them.
 */

export interface VCPlayer {
  userId: string;
  characterId: string;
  playerName: string;
  color: number;
  joinedAt: number;
}

export interface VCRoom {
  roomId: string;
  mode: 'creative' | 'puzzle';
  players: Map<string, VCPlayer>; // keyed by socketId
  createdAt: number;
  tilePatches: Array<{ x: number; y: number; layer: number; tileId: string; playerId: string }>; // last 500 tile ops for late joiners
  puzzleState: Record<string, unknown>; // last known puzzle state per entityId
}

const MAX_TILE_HISTORY = 500;
const MAX_ROOM_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

export class VoidCraftRooms {
  private rooms = new Map<string, VCRoom>();

  getOrCreate(roomId: string, mode: 'creative' | 'puzzle'): VCRoom {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId, mode,
        players: new Map(),
        createdAt: Date.now(),
        tilePatches: [],
        puzzleState: {},
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  join(roomId: string, socketId: string, player: Omit<VCPlayer, 'joinedAt'>, mode: 'creative' | 'puzzle'): VCRoom {
    const room = this.getOrCreate(roomId, mode);
    room.players.set(socketId, { ...player, joinedAt: Date.now() });
    return room;
  }

  leave(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.players.delete(socketId);
    if (room.players.size === 0) this.rooms.delete(roomId);
    return true;
  }

  getRoom(roomId: string): VCRoom | undefined {
    return this.rooms.get(roomId);
  }

  recordTile(roomId: string, patch: VCRoom['tilePatches'][0]): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.tilePatches.push(patch);
    if (room.tilePatches.length > MAX_TILE_HISTORY) room.tilePatches.shift();
  }

  recordPuzzleState(roomId: string, entityId: string, state: unknown): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.puzzleState[entityId] = state;
  }

  /** Call periodically to evict old empty-ish rooms */
  sweep(): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.players.size === 0 || now - room.createdAt > MAX_ROOM_AGE_MS) {
        this.rooms.delete(id);
      }
    }
  }

  getStats(): { roomCount: number; playerCount: number } {
    let playerCount = 0;
    for (const room of this.rooms.values()) playerCount += room.players.size;
    return { roomCount: this.rooms.size, playerCount };
  }
}

export const voidcraftRooms = new VoidCraftRooms();
