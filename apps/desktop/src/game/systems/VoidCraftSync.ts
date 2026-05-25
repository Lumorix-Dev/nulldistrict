import { gameBus } from '../EventBus';
import type { GameContext } from '../GameContext';

export type SyncEventType =
  | 'vc:tile'
  | 'vc:cursor'
  | 'vc:chat'
  | 'vc:puzzle'
  | 'vc:join'
  | 'vc:leave';

export interface VCTileEvent {
  type: 'vc:tile';
  x: number; y: number; layer: 0 | 1 | 2; tileId: string;
  playerId: string;
}

export interface VCCursorEvent {
  type: 'vc:cursor';
  worldX: number; worldY: number;
  playerId: string; color: number;
}

export interface VCChatEvent {
  type: 'vc:chat';
  message: string;
  playerId: string; playerName: string;
}

export interface VCPuzzleEvent {
  type: 'vc:puzzle';
  action: 'key-collected' | 'door-unlocked' | 'lever-flipped' | 'code-solved' | 'objective-complete';
  entityId?: string; objectiveId?: string;
  playerId: string;
}

export interface VCJoinEvent {
  type: 'vc:join';
  playerId: string; playerName: string; color: number;
}

export interface VCLeaveEvent {
  type: 'vc:leave';
  playerId: string;
}

export type VCSyncEvent = VCTileEvent | VCCursorEvent | VCChatEvent | VCPuzzleEvent | VCJoinEvent | VCLeaveEvent;

const PLAYER_COLORS = [0x9be7ff, 0x45f5c8, 0xff6eb4, 0xf1c84b] as const;

/** Minimal shape we need from a socket for custom voidcraft events. */
type UntypedSocket = {
  emit: (ev: string, data: unknown) => void;
  on: (ev: string, cb: (data: unknown) => void) => void;
} | null;

export class VoidCraftSync {
  private readonly context: GameContext;
  private readonly localPlayerId: string;
  private readonly localPlayerName: string;
  private remotePlayers = new Map<string, { color: number; name: string; cursorX: number; cursorY: number }>();
  private offs: Array<() => void> = [];
  private handlerSetup = false;

  constructor(context: GameContext) {
    this.context = context;
    this.localPlayerId = context.character.id;
    this.localPlayerName = context.character.name;
  }

  /** Call from CreativeScene.create() to start syncing tile placements. */
  attachToCreative(): void {
    const off = gameBus.on('voidcraft:tile-placed', (data) => {
      // Only broadcast tiles placed by the local player ('local' sentinel)
      if (data.playerId !== 'local') return;
      this.send({
        type: 'vc:tile',
        x: data.x, y: data.y,
        layer: data.layer,
        tileId: data.tileId,
        playerId: this.localPlayerId,
      });
    });
    this.offs.push(off);
    this.setupIncomingHandler();
    this.send({ type: 'vc:join', playerId: this.localPlayerId, playerName: this.localPlayerName, color: PLAYER_COLORS[0] });
  }

  /** Call from PuzzleScene.create() to sync puzzle state. */
  attachToPuzzle(): void {
    this.setupIncomingHandler();
  }

  /** Broadcast cursor position; throttled to 20 updates/s. */
  private lastCursorSend = 0;
  sendCursor(worldX: number, worldY: number): void {
    const now = Date.now();
    if (now - this.lastCursorSend < 50) return;
    this.lastCursorSend = now;
    this.send({ type: 'vc:cursor', worldX, worldY, playerId: this.localPlayerId, color: PLAYER_COLORS[0] });
  }

  /** Broadcast a puzzle action (key collected, lever flipped, etc.). */
  sendPuzzleAction(action: VCPuzzleEvent['action'], entityId?: string, objectiveId?: string): void {
    this.send({ type: 'vc:puzzle', action, entityId, objectiveId, playerId: this.localPlayerId });
  }

  getRemotePlayers(): Map<string, { color: number; name: string; cursorX: number; cursorY: number }> {
    return this.remotePlayers;
  }

  getPlayerColor(index: number): number {
    return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];
  }

  destroy(): void {
    this.send({ type: 'vc:leave', playerId: this.localPlayerId });
    for (const off of this.offs) off();
    this.offs = [];
  }

  private send(event: VCSyncEvent): void {
    try {
      const socket = this.context.realtime.socket as unknown as UntypedSocket;
      socket?.emit('voidcraft:sync', event);
    } catch {
      // Silently fail when offline
    }
  }

  private setupIncomingHandler(): void {
    if (this.handlerSetup) return;
    this.handlerSetup = true;
    try {
      const socket = this.context.realtime.socket as unknown as UntypedSocket;
      if (!socket) return;
      socket.on('voidcraft:sync', (raw: unknown) => {
        this.handleIncoming(raw as VCSyncEvent);
      });
      socket.on('voidcraft:catchup', (raw: unknown) => {
        const data = raw as {
          tilePatches?: Array<{ x: number; y: number; layer: number; tileId: string; playerId: string }>;
          players?: Array<{ playerId: string; color: number; name: string; worldX: number; worldY: number }>;
        };
        if (data.tilePatches) {
          for (const patch of data.tilePatches) {
            if (patch.playerId === this.localPlayerId) continue;
            const layer = patch.layer as 0 | 1 | 2;
            gameBus.emit('voidcraft:remote-tile', {
              x: patch.x, y: patch.y, layer,
              tileId: patch.tileId, playerId: patch.playerId,
            });
          }
        }
        if (data.players) {
          for (const p of data.players) {
            if (p.playerId === this.localPlayerId) continue;
            this.remotePlayers.set(p.playerId, {
              color: p.color,
              name: p.name,
              cursorX: p.worldX,
              cursorY: p.worldY,
            });
            gameBus.emit('voidcraft:player-joined', { playerId: p.playerId, playerName: p.name, color: p.color });
          }
        }
      });
    } catch {
      // Offline mode — no incoming events
    }
  }

  private handleIncoming(event: VCSyncEvent): void {
    if (event.playerId === this.localPlayerId) return;

    switch (event.type) {
      case 'vc:tile':
        gameBus.emit('voidcraft:remote-tile', {
          x: event.x, y: event.y, layer: event.layer,
          tileId: event.tileId, playerId: event.playerId,
        });
        break;

      case 'vc:cursor':
        this.remotePlayers.set(event.playerId, {
          color: event.color,
          name: this.remotePlayers.get(event.playerId)?.name ?? event.playerId,
          cursorX: event.worldX,
          cursorY: event.worldY,
        });
        gameBus.emit('voidcraft:remote-cursor', {
          playerId: event.playerId, worldX: event.worldX, worldY: event.worldY, color: event.color,
        });
        break;

      case 'vc:puzzle':
        gameBus.emit('voidcraft:remote-puzzle', event as unknown as Record<string, unknown>);
        break;

      case 'vc:join':
        this.remotePlayers.set(event.playerId, {
          color: event.color, name: event.playerName, cursorX: 0, cursorY: 0,
        });
        gameBus.emit('voidcraft:player-joined', {
          playerId: event.playerId, playerName: event.playerName, color: event.color,
        });
        break;

      case 'vc:leave':
        this.remotePlayers.delete(event.playerId);
        gameBus.emit('voidcraft:player-left', { playerId: event.playerId });
        break;
    }
  }
}
