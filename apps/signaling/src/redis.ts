// Two Redis connections: one for app data, one pair for the Socket.IO adapter
// (pub + sub). The redis-adapter requires duplicate connections for pub/sub.

import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

const baseOpts = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
} as const;

export const redis = new Redis(env.REDIS_URL, baseOpts);
export const pubClient = new Redis(env.REDIS_URL, baseOpts);
export const subClient = pubClient.duplicate();

for (const [name, c] of [
  ["redis", redis],
  ["pubClient", pubClient],
  ["subClient", subClient],
] as const) {
  c.on("error", (e: Error) => logger.error({ err: e, redis: name }, "redis error"));
  c.on("connect", () => logger.info({ redis: name }, "redis connected"));
}
