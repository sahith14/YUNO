// Sliding-window rate limiter using Redis.
// Uses a single counter with TTL — good enough for our limits.

import { redis } from "./redis.js";
import { REDIS_KEYS } from "@yuno/shared";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function rateLimit(
  kind: string,
  id: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = REDIS_KEYS.rate(kind, id);
  const tx = redis.multi();
  tx.incr(key);
  tx.expire(key, windowSeconds, "NX");
  tx.ttl(key);
  const results = await tx.exec();
  if (!results) return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };

  const count = (results[0]?.[1] as number) ?? 0;
  const ttl = (results[2]?.[1] as number) ?? windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds: ttl < 0 ? windowSeconds : ttl,
  };
}
