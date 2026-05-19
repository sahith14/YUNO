// Fastify HTTP host for the signaling server. Mostly /healthz and the
// Socket.IO upgrade is attached to its underlying Node http server.

import "./load-env.js";

import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { attachSocketIO, shutdownSocketIO } from "./socket.js";
import { redis, pubClient, subClient } from "./redis.js";

async function main() {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.WEB_PUBLIC_URL.split(",").map((s) => s.trim()),
    credentials: true,
  });

  app.get("/healthz", async () => {
    const r = await redis.ping().catch(() => null);
    return { ok: r === "PONG", instance: env.INSTANCE_ID };
  });

  app.get("/metrics", async (req, reply) => {
    const sec = req.headers["x-internal-secret"];
    if (sec !== env.INTERNAL_SECRET) return reply.code(403).send({ ok: false });
    const queueDepth = {
      video: await redis.zcard("mm:queue:video"),
      audio: await redis.zcard("mm:queue:audio"),
      text: await redis.zcard("mm:queue:text"),
    };
    const activeRooms = await redis.hlen("rooms:active");
    return { queueDepth, activeRooms, instance: env.INSTANCE_ID };
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info({ port: env.PORT, host: env.HOST }, "signaling http listening");

  const io = await attachSocketIO(app);
  logger.info("socket.io attached");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    try {
      // Notify connected clients
      io.emit("system:notice", {
        severity: "info",
        message: "Server is updating, you'll reconnect automatically.",
      });
      await new Promise((r) => setTimeout(r, 500));
      await shutdownSocketIO(io);
      await app.close();
      await Promise.all([redis.quit(), pubClient.quit(), subClient.quit()]);
    } catch (err) {
      logger.error({ err }, "shutdown error");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "signaling boot failed");
  process.exit(1);
});
