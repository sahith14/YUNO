// =============================================================================
// Matchmaker — pairs strangers from the queue.
//
// Approach: Redis Sorted Set per modality. Score = priority (lower = matched
// sooner). Members are entry IDs. Full entry data (interests, filters, region,
// etc) is stored in a Redis Hash keyed by entry ID. A single-instance
// "matchmaker tick" loop polls every QUEUE_TICK_MS and pairs eligible peers.
//
// Distributed correctness: only one instance should run the tick at a time.
// We use a Redis SETNX lease ("mm:tick:lock") with a short TTL — whichever
// instance holds the lease drives the loop; if it dies, another picks up.
//
// This implementation prioritizes simplicity + correctness over peak throughput.
// At 100k CCU it will need partitioning by region/modality across instances —
// that's a Phase 3 problem. For MVP / Phase 1 the single-tick design is
// straightforward to reason about.
// =============================================================================

import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
import { logger } from "./logger.js";
import { env } from "./env.js";
import {
  REDIS_KEYS,
  QUEUE_TICK_MS,
  QUEUE_MAX_WAIT_MS,
  REPUTATION_QUARANTINE_THRESHOLD,
} from "@yuno/shared";
import type { Modality, QueueFilters } from "@yuno/shared";

const TICK_LOCK_KEY = "mm:tick:lock";
const TICK_LOCK_TTL_MS = 1500;

const ENTRY_HASH = "mm:entries"; // Hash<entryId, JSON entry>

export interface QueueEntry {
  entryId: string;
  socketId: string;
  userId: string;
  kind: "guest" | "user" | "admin";
  premium: boolean;
  verified: boolean;
  verifiedLabel?: "female" | "male" | "non-binary";
  /** Self-declared gender (post-signup). Used for filter matching pre-verification. */
  selfGender?: "female" | "male" | "prefer_not_to_say";
  reputationScore: number;
  region: string;
  country?: string;
  modality: Modality;
  interests: string[];
  filters?: QueueFilters;
  joinedAt: number;
  /**
   * Set of userIds we should not be matched with (to avoid immediate re-match
   * with the same person right after a skip).
   */
  cooldownUserIds: string[];
}

function priorityOf(entry: QueueEntry): number {
  // Lower score = matched sooner.
  // Premium gets priority; older queue entries get priority by joinedAt;
  // shadow-banned in quarantine gets a much later score so they only match each
  // other.
  const base = entry.joinedAt;
  const premiumBoost = entry.premium ? -2_000 : 0;
  const verifiedBoost = entry.verified ? -500 : 0;
  const quarantine =
    entry.reputationScore < REPUTATION_QUARANTINE_THRESHOLD ? 1_000_000_000 : 0;
  return base + premiumBoost + verifiedBoost + quarantine;
}

function quarantineGroup(entry: QueueEntry): "quarantine" | "main" {
  return entry.reputationScore < REPUTATION_QUARANTINE_THRESHOLD ? "quarantine" : "main";
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function addToQueue(entry: QueueEntry): Promise<{ position: number }> {
  const queueKey = REDIS_KEYS.queue(entry.modality);
  const score = priorityOf(entry);

  const tx = redis.multi();
  tx.hset(ENTRY_HASH, entry.entryId, JSON.stringify(entry));
  tx.zadd(queueKey, score, entry.entryId);
  tx.set(REDIS_KEYS.userState(entry.userId), "queued", "EX", 600);
  await tx.exec();

  const position = await redis.zrank(queueKey, entry.entryId);
  return { position: (position ?? 0) + 1 };
}

export async function removeFromQueue(entryId: string, modality: Modality): Promise<void> {
  const queueKey = REDIS_KEYS.queue(modality);
  const tx = redis.multi();
  tx.zrem(queueKey, entryId);
  tx.hdel(ENTRY_HASH, entryId);
  await tx.exec();
}

export async function removeUserFromAllQueues(userId: string, entryId?: string): Promise<void> {
  // Remove specific entry by id (preferred); also clean state.
  if (entryId) {
    for (const mod of ["video", "audio", "text"] as const) {
      await redis.zrem(REDIS_KEYS.queue(mod), entryId);
    }
    await redis.hdel(ENTRY_HASH, entryId);
  }
  await redis.del(REDIS_KEYS.userState(userId));
}

export async function getQueueDepth(modality: Modality): Promise<number> {
  return redis.zcard(REDIS_KEYS.queue(modality));
}

// -----------------------------------------------------------------------------
// Matching tick
// -----------------------------------------------------------------------------

type OnMatchCallback = (a: QueueEntry, b: QueueEntry) => Promise<void>;

let tickHandle: NodeJS.Timeout | null = null;
let stopped = false;

export function startMatchmakerLoop(onMatch: OnMatchCallback): void {
  stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const got = await acquireLock();
      if (got) {
        try {
          for (const modality of ["video", "audio", "text"] as Modality[]) {
            await tickModality(modality, onMatch);
          }
        } finally {
          await releaseLock();
        }
      }
    } catch (err) {
      logger.error({ err }, "matchmaker tick error");
    } finally {
      if (!stopped) tickHandle = setTimeout(tick, QUEUE_TICK_MS);
    }
  };
  tickHandle = setTimeout(tick, QUEUE_TICK_MS);
  logger.info("matchmaker loop started");
}

export function stopMatchmakerLoop(): void {
  stopped = true;
  if (tickHandle) clearTimeout(tickHandle);
  tickHandle = null;
}

async function acquireLock(): Promise<boolean> {
  const res = await redis.set(TICK_LOCK_KEY, env.INSTANCE_ID, "PX", TICK_LOCK_TTL_MS, "NX");
  return res === "OK";
}

async function releaseLock(): Promise<void> {
  // Lua script ensures we only delete our own lock
  const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
  await redis.eval(script, 1, TICK_LOCK_KEY, env.INSTANCE_ID).catch(() => {});
}

async function tickModality(modality: Modality, onMatch: OnMatchCallback): Promise<void> {
  const queueKey = REDIS_KEYS.queue(modality);

  // Pull up to 200 candidates per tick — bounded so we don't block the loop
  const ids = await redis.zrange(queueKey, 0, 199);
  if (ids.length < 2) return;

  // Fetch entries
  const raws = await redis.hmget(ENTRY_HASH, ...ids);
  const entries: QueueEntry[] = [];
  for (const r of raws) {
    if (!r) continue;
    try {
      entries.push(JSON.parse(r) as QueueEntry);
    } catch {
      // skip corrupt entry
    }
  }

  // Pair greedily. For each unpaired entry, find first compatible.
  const used = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i]!;
    if (used.has(a.entryId)) continue;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j]!;
      if (used.has(b.entryId)) continue;
      if (!isCompatible(a, b)) continue;

      used.add(a.entryId);
      used.add(b.entryId);

      // Remove both from queue atomically
      const tx = redis.multi();
      tx.zrem(queueKey, a.entryId, b.entryId);
      tx.hdel(ENTRY_HASH, a.entryId, b.entryId);
      tx.set(REDIS_KEYS.userState(a.userId), "in_call", "EX", 3600);
      tx.set(REDIS_KEYS.userState(b.userId), "in_call", "EX", 3600);
      await tx.exec();

      try {
        await onMatch(a, b);
      } catch (err) {
        logger.error({ err, a: a.userId, b: b.userId }, "onMatch failed");
        // Roll back state — re-queue both with cooldown
        await Promise.all([
          addToQueue({ ...a, joinedAt: Date.now() }),
          addToQueue({ ...b, joinedAt: Date.now() }),
        ]);
      }
      break;
    }
  }
}

// -----------------------------------------------------------------------------
// Compatibility check — the heart of matching policy.
// -----------------------------------------------------------------------------

function isCompatible(a: QueueEntry, b: QueueEntry): boolean {
  if (a.userId === b.userId) return false;
  if (a.modality !== b.modality) return false;
  if (quarantineGroup(a) !== quarantineGroup(b)) return false;

  // Cooldown — don't immediately re-pair
  if (a.cooldownUserIds.includes(b.userId)) return false;
  if (b.cooldownUserIds.includes(a.userId)) return false;

  // Verified-only filter (premium)
  if (a.filters?.verifiedOnly && !b.verified) return false;
  if (b.filters?.verifiedOnly && !a.verified) return false;

  // Gender preference (premium = unlimited; free = honored too but with a 18s
  // session timer enforced client-side; see chat page for that part).
  //
  // Resolution order for the OTHER user's gender:
  //   1. verifiedLabel  (only "female" | "male" | "non-binary" — ID-verified)
  //   2. selfGender     (only "female" | "male" — declared at signup; "prefer_not_to_say" matches nothing)
  //
  // If the requesting filter is "any" we ignore. If the other person hasn't
  // declared a gender or chose "prefer_not_to_say", they CANNOT match a
  // gender-filtered request — they only match other users with no gender filter.
  if (a.filters?.gender && a.filters.gender !== "any") {
    const bGender = effectiveGender(b);
    if (bGender !== a.filters.gender) return false;
  }
  if (b.filters?.gender && b.filters.gender !== "any") {
    const aGender = effectiveGender(a);
    if (aGender !== b.filters.gender) return false;
  }

  // Country filter (premium)
  if (a.filters?.countries?.length && !a.filters.countries.includes(b.country ?? "")) return false;
  if (b.filters?.countries?.length && !b.filters.countries.includes(a.country ?? "")) return false;

  // After a long wait, relax interest matching (don't want users stuck)
  const oldest = Math.min(a.joinedAt, b.joinedAt);
  const waitedMs = Date.now() - oldest;

  // If both have interests and they overlap, great. Otherwise allow random
  // matching after 5s — a perfect interest-tag match is a luxury, not a hard
  // requirement.
  const hasOverlap = a.interests.some((i) => b.interests.includes(i));
  if (!hasOverlap && a.interests.length > 0 && b.interests.length > 0 && waitedMs < 5000) {
    return false;
  }

  // After QUEUE_MAX_WAIT_MS, log a warning (not a blocker)
  if (waitedMs > QUEUE_MAX_WAIT_MS) {
    logger.warn({ waitedMs, a: a.userId, b: b.userId }, "matched after long wait");
  }

  return true;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function newEntryId(): string {
  return randomUUID();
}

/**
 * Resolve the gender that another user's filter should compare against.
 * Verified label wins; falls back to selfGender. "prefer_not_to_say" or
 * unset → null (not eligible for any gender-filtered match).
 */
function effectiveGender(e: QueueEntry): "female" | "male" | "non-binary" | null {
  if (e.verifiedLabel) return e.verifiedLabel;
  if (e.selfGender === "female" || e.selfGender === "male") return e.selfGender;
  return null;
}
