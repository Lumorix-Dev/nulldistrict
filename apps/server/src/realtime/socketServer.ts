import type { Server as HttpServer } from "node:http";
import { Prisma, type PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import {
  chatMessageSchema,
  coopSyncNodeSchema,
  joinInstanceSchema,
  pickupSchema,
  playerNetStateSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  type VCSyncEvent,
  type VCTileEvent,
  type VCCursorEvent,
  type VCChatEvent,
  type VCPuzzleEvent,
  type VCJoinEvent,
  type VCLeaveEvent,
} from "@nulldistrict/shared";
import { corsOrigins } from "../config/env.js";
import { verifyAccessToken } from "../utils/security.js";
import { WorldState } from "./worldState.js";
import { voidcraftRooms } from "./voidcraftRooms.js";

export function createSocketServer(httpServer: HttpServer, prisma: PrismaClient) {
  const world = new WorldState(prisma);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== "string") throw new Error("Missing token");
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, username: true, role: true, isBanned: true, banReason: true }
      });
      if (!user || user.isBanned) throw new Error(user?.banReason ?? "Unauthorized");
      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.role = user.role;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("instance:join", async (raw) => {
      const parsed = joinInstanceSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit("instance:error", { message: "Invalid instance join request." });
        return;
      }

      const character = await prisma.character.findFirst({
        where: { id: parsed.data.characterId, userId: socket.data.userId },
        select: { id: true }
      });
      if (!character) {
        socket.emit("instance:error", { message: "Character does not belong to this account." });
        return;
      }

      if (socket.data.currentRoom) socket.leave(socket.data.currentRoom);
      world.leave(socket.data.currentRoom, socket.data.characterId);
      socket.data.characterId = parsed.data.characterId;

      const player = {
        userId: socket.data.userId,
        characterId: parsed.data.characterId,
        username: socket.data.username,
        areaId: parsed.data.areaId,
        x: 180,
        y: 500,
        vx: 0,
        vy: 0,
        facing: "right" as const,
        hp: 100,
        energy: 100,
        animation: "idle" as const,
        updatedAt: Date.now()
      };

      const instance = world.join(parsed.data.areaId, player, parsed.data.instanceId);
      await prisma.character.update({
        where: { id: parsed.data.characterId },
        data: { areaId: parsed.data.areaId }
      });
      socket.data.currentRoom = instance.room;
      socket.join(instance.room);
      socket.emit("instance:joined", world.getSnapshot(instance.room)!);
      socket.to(instance.room).emit("player:joined", player);
    });

    socket.on("instance:leave", () => {
      socket.leave(socket.data.currentRoom ?? "");
      world.leave(socket.data.currentRoom, socket.data.characterId);
      socket.data.currentRoom = undefined;
      socket.data.characterId = undefined;
    });

    socket.on("player:state", (raw) => {
      const parsed = playerNetStateSchema.safeParse(raw);
      if (!parsed.success || parsed.data.userId !== socket.data.userId) return;
      world.updatePlayer(socket.data.currentRoom, parsed.data);
      if (socket.data.currentRoom) socket.to(socket.data.currentRoom).emit("player:state", parsed.data);
    });

    socket.on("combat:attack", async (payload) => {
      const result = await world.attack(socket.data.currentRoom, socket.data.characterId, payload);
      if (!result || !socket.data.currentRoom) return;
      if (result.damage) io.to(socket.data.currentRoom).emit("combat:damage", result.damage);
      if (result.rewards) {
        io.to(socket.data.currentRoom).emit("combat:defeated", {
          targetId: payload.targetId,
          rewards: result.rewards
        });
        socket.emit("inventory:updated", { entries: await world.inventory(socket.data.userId) });
        socket.emit("quest:updated", await world.quests(socket.data.userId));
      }
    });

    socket.on("inventory:pickup", async (raw) => {
      const parsed = pickupSchema.safeParse(raw);
      if (!parsed.success) return;
      const entries = await world.pickup(socket.data.userId, socket.data.currentRoom, socket.data.characterId, parsed.data);
      if (!entries) return;
      socket.emit("inventory:updated", { entries });
      socket.emit("quest:updated", await world.quests(socket.data.userId));
    });

    socket.on("coop:sync-node", async (raw) => {
      const parsed = coopSyncNodeSchema.safeParse(raw);
      if (!parsed.success || !socket.data.currentRoom) return;
      const result = await world.syncNode(socket.data.userId, socket.data.currentRoom, socket.data.characterId, parsed.data);
      if (!result) return;

      io.to(socket.data.currentRoom).emit("coop:sync-state", result.state);
      if (!result.state.solved) return;

      const roomSockets = await io.in(socket.data.currentRoom).fetchSockets();
      await Promise.all(
        roomSockets
          .filter((participant) => result.updatedUserIds.includes(participant.data.userId))
          .map(async (participant) => {
            participant.emit("inventory:updated", { entries: await world.inventory(participant.data.userId) });
            participant.emit("quest:updated", await world.quests(participant.data.userId));
          })
      );
    });

    socket.on("quest:choice", async (payload) => {
      if (!socket.data.characterId) return;
      const character = await prisma.character.findFirst({
        where: { id: socket.data.characterId, userId: socket.data.userId }
      });
      if (!character) return;
      const flags = typeof character.storyFlags === "object" && character.storyFlags ? character.storyFlags : {};
      await prisma.character.update({
        where: { id: character.id },
        data: { storyFlags: { ...(flags as Record<string, unknown>), [payload.flag]: payload.value } as Prisma.InputJsonObject }
      });
    });

    socket.on("player:death", async () => {
      const lostSoftCurrency = await world.recordDeath(socket.data.userId);
      socket.emit("player:death-confirmed", { lostSoftCurrency, respawnAreaId: "signal-haven" });
    });

    socket.on("chat:send", (raw) => {
      const parsed = chatMessageSchema.safeParse(raw);
      if (!parsed.success || !socket.data.currentRoom) return;
      if (!world.canSendChat(socket.data.currentRoom, socket.data.userId)) {
        socket.emit("party:notice", { message: "Chat cooldown active." });
        return;
      }
      io.to(socket.data.currentRoom).emit(
        "chat:message",
        world.createChat(parsed.data.areaId, socket.data.userId, socket.data.username, parsed.data.message)
      );
    });

    socket.on("party:invite", (payload) => {
      socket.emit("party:notice", {
        message: `Party invite scaffold created for ${payload.username}. Full party matching lands after beta networking hardening.`
      });
    });

    // ─── VoidCraft Co-op ───────────────────────────────────────────────
    socket.on("voidcraft:sync", (raw: unknown) => {
      const event = raw as VCSyncEvent;
      if (!event || typeof event.type !== "string") return;

      const vcRoomId: string = event.roomId
        ?? `vc:${socket.data.characterId ?? socket.id}`;
      const mode: "creative" | "puzzle" =
        event.type === "vc:tile" ? "creative" : "puzzle";

      switch (event.type) {
        case "vc:join": {
          const joinEv = event as VCJoinEvent;
          voidcraftRooms.join(vcRoomId, socket.id, {
            userId: socket.data.userId,
            characterId: socket.data.characterId ?? socket.id,
            playerName: joinEv.playerName,
            color: joinEv.color,
          }, mode);
          socket.data.vcRoom = vcRoomId;
          socket.join(`vc:${vcRoomId}`);

          const room = voidcraftRooms.getRoom(vcRoomId);
          if (room) {
            socket.emit("voidcraft:catchup", {
              tilePatches: room.tilePatches,
              puzzleState: room.puzzleState,
              players: [...room.players.values()].map(p => ({
                playerId: p.characterId, playerName: p.playerName, color: p.color,
              })),
            });
          }
          socket.to(`vc:${vcRoomId}`).emit("voidcraft:sync", event);
          break;
        }

        case "vc:leave": {
          const leaveEv = event as VCLeaveEvent;
          if (socket.data.vcRoom) {
            voidcraftRooms.leave(socket.data.vcRoom, socket.id);
            socket.leave(`vc:${socket.data.vcRoom}`);
            socket.to(`vc:${socket.data.vcRoom}`).emit("voidcraft:sync", leaveEv);
            socket.data.vcRoom = undefined;
          }
          break;
        }

        case "vc:tile": {
          const tileEv = event as VCTileEvent;
          if (socket.data.vcRoom) {
            voidcraftRooms.recordTile(socket.data.vcRoom, {
              x: tileEv.x, y: tileEv.y, layer: tileEv.layer,
              tileId: tileEv.tileId, playerId: tileEv.playerId,
            });
          }
          socket.to(`vc:${vcRoomId}`).emit("voidcraft:sync", tileEv);
          break;
        }

        case "vc:cursor":
          socket.to(`vc:${vcRoomId}`).emit("voidcraft:sync", event);
          break;

        case "vc:puzzle": {
          const puzzleEv = event as VCPuzzleEvent;
          if (socket.data.vcRoom && puzzleEv.entityId) {
            voidcraftRooms.recordPuzzleState(socket.data.vcRoom, puzzleEv.entityId, { action: puzzleEv.action });
          }
          socket.to(`vc:${vcRoomId}`).emit("voidcraft:sync", puzzleEv);
          break;
        }

        case "vc:chat": {
          socket.to(`vc:${vcRoomId}`).emit("voidcraft:sync", event);
          break;
        }
      }
    });
    // ──────────────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      if (socket.data.currentRoom) {
        socket.to(socket.data.currentRoom).emit("player:left", {
          userId: socket.data.userId,
          characterId: socket.data.characterId ?? ""
        });
      }
      world.leave(socket.data.currentRoom, socket.data.characterId);
      // Clean up any active VoidCraft room
      if (socket.data.vcRoom) {
        voidcraftRooms.leave(socket.data.vcRoom, socket.id);
        socket.to(`vc:${socket.data.vcRoom}`).emit("voidcraft:sync", {
          type: "vc:leave",
          playerId: socket.data.characterId ?? socket.id,
        } as VCLeaveEvent);
      }
    });
  });

  setInterval(() => {
    world.tickEnemies(250);
    for (const room of io.sockets.adapter.rooms.keys()) {
      if (!room.includes(":")) continue;
      const snapshot = world.getSnapshot(room);
      if (snapshot) io.to(room).emit("enemy:state", snapshot.enemies);
    }
  }, 250).unref();

  // Sweep stale VoidCraft rooms every 10 minutes
  setInterval(() => voidcraftRooms.sweep(), 10 * 60 * 1000).unref();

  return { io, world };
}
