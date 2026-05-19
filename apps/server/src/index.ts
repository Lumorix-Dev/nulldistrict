import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/prisma.js";
import { createSocketServer } from "./realtime/socketServer.js";

const startedAt = new Date();
let getConnectedPlayers = () => 0;
const app = createApp({ prisma, startedAt, getConnectedPlayers: () => getConnectedPlayers() });
const server = http.createServer(app);
const { world } = createSocketServer(server, prisma);
getConnectedPlayers = () => world.getConnectedPlayers();

server.listen(env.SERVER_PORT, () => {
  logger.info({ port: env.SERVER_PORT }, "Lumorix: Null District server online");
});

const shutdown = async () => {
  logger.info("Shutting down Null District server");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
