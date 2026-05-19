// =============================================================================
// Socket.IO server — auth middleware, event handlers, lifecycle wiring.
//
// One Socket.IO server is attached to the Fastify HTTP server. State is stored
// in Redis; the redis-adapter ensures broadcasts work across instances.
// =============================================================================

import { Server, Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import { createAdapter } from "@socket.io/redis-adapter";

import {
  RATE_LIMIT_SKIPS_PER_MIN,
  RATE_LIMIT_REPORTS_PER_HOUR,
  RATE_LIMIT_CHAT_PER_MIN,
  REPUTATION_QUARANTINE_THRESHOLD,
  ROOM_READY_TIMEOUT_MS,
  QueueJoinPayload,
  RoomSkipPayload,
  RoomReadyPayload,
  ChatMessagePayload,
  SignalSdpPayload,
  SignalIcePayload,
  ReportFlagPayload,
} from "@yuno/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Modality,
} from "@yuno/shared";

import { env } from "./env.js";
import { logger } from "./logger.js";
import { redis, pubClient, subClient } from "./redis.js";
import { verifyJwt } from "./auth.js";
import {
  addToQueue,
  removeFromQueue,
  removeUserFromAllQueues,
  startMatchmakerLoop,
  stopMatchmakerLoop,
  newEntryId,
  getQueueDepth,
  type QueueEntry,
} from "./matchmaker.js";
import {
  ActiveRoom,
  endRoom,
  getRoom,
  newRoomId,
  persistRoom,
  markRoomReady,
} from "./room.js";
import { rateLimit } from "./rate-limit.js";
import {
  mintTurnCredentials,
  persistReport,
  persistSessionStart,
  persistSessionEnd,
} from "./api-client.js";

// Tiny internal-API helper to fetch self-gender for users about to queue.
async function fetchProfile(
  userId: string,
): Promise<{ selfGender?: "female" | "male" | "prefer_not_to_say"; verifiedLabel?: "female" | "male" | "non-binary" } | null> {
  try {
    const res = await fetch(`${env.API_PUBLIC_URL}/internal/users/profile`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": env.INTERNAL_SECRET },
      body: JSON.stringify({ userIds: [userId] }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { users: Array<{ selfGender?: "female" | "male" | "prefer_not_to_say"; verifiedLabel?: "female" | "male" | "non-binary" }> };
    return json.users?.[0] ?? null;
  } catch {
    return null;
  }
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const COOLDOWN_LIMIT = 50;

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

// Type for any Fastify instance — we don't care about the http server variant
// for Socket.IO attachment (the underlying server works for both).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFastifyInstance = FastifyInstance<any, any, any, any, any>;

export async function attachSocketIO(app: AnyFastifyInstance): Promise<IO> {
  const io: IO = new Server(app.server, {
    path: "/socket.io",
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        try {
          const host = new URL(origin).hostname;
          if (
            host === "localhost" ||
            host === "127.0.0.1" ||
            host.endsWith(".trycloudflare.com") ||
            host.endsWith(".vercel.app") ||
            host.endsWith(".fly.dev") ||
            host.endsWith(".ngrok-free.app") ||
            env.WEB_PUBLIC_URL.split(",").map((s) => s.trim()).includes(origin)
          ) {
            return cb(null, true);
          }
        } catch {
          /* fall through */
        }
        cb(new Error(`CORS: ${origin}`), false);
      },
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    transports: ["websocket"],
    allowEIO3: false,
  });

  // Redis adapter so multiple signaling instances share rooms / broadcasts
  io.adapter(createAdapter(pubClient, subClient));

  // ---------------- Auth middleware ----------------
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as Record<string, string>)?.token;
      const fingerprint = (socket.handshake.auth as Record<string, string>)?.fingerprint ?? "";
      if (!token) return next(new Error("UNAUTHORIZED"));

      const claims = verifyJwt(token);
      // Hot-path ban check
      const banUntilRaw = await redis.get(`ban:${claims.sub}`);
      if (banUntilRaw) {
        const banUntil = Number(banUntilRaw);
        if (banUntil > Date.now()) return next(new Error("BANNED"));
      }

      // Determine shadow-ban (we read from the API once on connect; cached 60s)
      const shadowKey = `shadow:${claims.sub}`;
      let shadow = await redis.get(shadowKey);
      if (shadow === null) {
        // Safe default: not shadow banned. The API can publish to Redis when it
        // shadow-bans someone. (See REST API docs.)
        shadow = "0";
        await redis.set(shadowKey, "0", "EX", 60);
      }

      // Reputation cache: the API writes this whenever it changes; signaling
      // reads. Default 1000 if missing.
      const repRaw = await redis.get(`rep:${claims.sub}`);
      const reputationScore = repRaw ? Number(repRaw) : 1000;

      socket.data.userId = claims.sub;
      socket.data.kind = claims.kind;
      socket.data.premium = !!claims.premium;
      socket.data.verified = !!claims.verified;
      socket.data.shadowBanned = shadow === "1";
      socket.data.reputationScore = reputationScore;
      socket.data.region = ((socket.handshake.headers["x-region"] as string) || "auto").slice(0, 20);
      socket.data.country = ((socket.handshake.headers["x-country"] as string) || "").slice(0, 2);

      logger.info(
        {
          userId: claims.sub,
          kind: claims.kind,
          premium: claims.premium,
          verified: claims.verified,
          fingerprint: fingerprint.slice(0, 12),
        },
        "socket authenticated",
      );

      next();
    } catch (err) {
      logger.warn({ err }, "auth failed");
      next(new Error("UNAUTHORIZED"));
    }
  });

  // ---------------- Connection ----------------
  io.on("connection", (socket) => attachHandlers(io, socket));

  // ---------------- Matchmaker loop ----------------
  startMatchmakerLoop(async (a, b) => {
    await onPair(io, a, b);
  });

  return io;
}

export async function shutdownSocketIO(io: IO): Promise<void> {
  stopMatchmakerLoop();
  await new Promise<void>((resolve) => io.close(() => resolve()));
}

// -----------------------------------------------------------------------------
// Per-socket handlers
// -----------------------------------------------------------------------------

function attachHandlers(io: IO, socket: IOSocket): void {
  const userId = socket.data.userId;

  socket.emit("connected", {
    userId,
    rateLimit: {
      skipsPerMin: RATE_LIMIT_SKIPS_PER_MIN,
      reportsPerHour: RATE_LIMIT_REPORTS_PER_HOUR,
    },
    iceTtlSeconds: env.TURN_CRED_TTL,
  });

  // Track this socket on this instance for shutdown handling
  redis.sadd(`instance:${env.INSTANCE_ID}:sockets`, socket.id).catch(() => {});

  // ---- Queue join ----
  socket.on("queue:join", async (rawPayload, ack) => {
    try {
      const payload = QueueJoinPayload.parse(rawPayload);

      // Already in a room? Reject.
      if (socket.data.roomId) {
        return ack({ ok: false, error: "Already in a room" });
      }

      // We let BOTH free and premium users set a gender filter. Premium gets
      // unlimited use; free users hit a 18-second client-side auto-skip in the
      // chat UI. We still mark the entry server-side so we can enforce it
      // server-side later if needed.
      const filterIsActive = !!payload.filters?.gender && payload.filters.gender !== "any";

      // Verified-only filter remains premium-gated to avoid abuse.
      if (payload.filters?.verifiedOnly && !socket.data.premium) {
        if (payload.filters) payload.filters.verifiedOnly = undefined;
      }

      // Fetch self-declared gender from the API once per join (60s Redis cache).
      const profileCacheKey = `profile:${userId}`;
      let selfGender: "female" | "male" | "prefer_not_to_say" | undefined;
      let verifiedLabel: "female" | "male" | "non-binary" | undefined;
      const cached = await redis.get(profileCacheKey);
      if (cached) {
        const c = JSON.parse(cached);
        selfGender = c.selfGender;
        verifiedLabel = c.verifiedLabel;
      } else {
        const p = await fetchProfile(userId);
        if (p) {
          selfGender = p.selfGender;
          verifiedLabel = p.verifiedLabel;
          await redis.set(profileCacheKey, JSON.stringify({ selfGender, verifiedLabel }), "EX", 60);
        }
      }
      socket.data.verifiedLabel = verifiedLabel;

      const entry: QueueEntry = {
        entryId: newEntryId(),
        socketId: socket.id,
        userId,
        kind: socket.data.kind,
        premium: socket.data.premium,
        verified: socket.data.verified,
        verifiedLabel,
        selfGender,
        reputationScore: socket.data.reputationScore,
        region: payload.region || socket.data.region,
        country: socket.data.country,
        modality: payload.modality,
        interests: payload.interests.slice(0, socket.data.premium ? 5 : 1),
        filters: payload.filters,
        joinedAt: Date.now(),
        cooldownUserIds: [],
      };

      // Save a per-socket reference so we can clean up on disconnect
      const sd = socket.data as SocketData & {
        entryId?: string;
        entry?: QueueEntry;
        freeFilterActive?: boolean;
      };
      sd.entryId = entry.entryId;
      sd.entry = entry;
      sd.freeFilterActive = filterIsActive && !socket.data.premium;
      socket.data.inQueue = true;
      socket.data.modality = payload.modality;

      // Shadow-banned: pretend to queue, never match
      if (socket.data.shadowBanned) {
        ack({ ok: true, queuePosition: 0 });
        // Send fake-but-realistic waiting events
        const interval = setInterval(() => {
          if (!socket.connected) {
            clearInterval(interval);
            return;
          }
          socket.emit("queue:waiting", {
            position: 1,
            etaSeconds: 5 + Math.floor(Math.random() * 10),
            queueDepth: 50 + Math.floor(Math.random() * 200),
          });
        }, 4000);
        (socket.data as SocketData & { _shadowInterval?: NodeJS.Timeout })._shadowInterval = interval;
        return;
      }

      const { position } = await addToQueue(entry);

      const depth = await getQueueDepth(payload.modality);
      ack({ ok: true, queuePosition: position });
      socket.emit("queue:waiting", {
        position,
        etaSeconds: estimateEta(depth, position),
        queueDepth: depth,
      });
    } catch (err) {
      logger.warn({ err, userId }, "queue:join failed");
      ack({ ok: false, error: "Invalid queue:join payload" });
    }
  });

  // ---- Queue leave ----
  socket.on("queue:leave", async (ack) => {
    const sd = socket.data as SocketData & { entryId?: string; _shadowInterval?: NodeJS.Timeout };
    if (sd._shadowInterval) {
      clearInterval(sd._shadowInterval);
      sd._shadowInterval = undefined;
    }
    if (sd.entryId && socket.data.modality) {
      await removeFromQueue(sd.entryId, socket.data.modality);
    }
    socket.data.inQueue = false;
    ack({ ok: true });
  });

  // ---- Signaling forwarding ----
  socket.on("signal:offer", async (raw) => {
    try {
      const payload = SignalSdpPayload.parse(raw);
      await forwardToPeer(io, socket, payload.roomId, "signal:offer", payload);
    } catch (err) {
      logger.debug({ err }, "signal:offer dropped");
    }
  });

  socket.on("signal:answer", async (raw) => {
    try {
      const payload = SignalSdpPayload.parse(raw);
      await forwardToPeer(io, socket, payload.roomId, "signal:answer", payload);
    } catch (err) {
      logger.debug({ err }, "signal:answer dropped");
    }
  });

  socket.on("signal:ice-candidate", async (raw) => {
    try {
      const payload = SignalIcePayload.parse(raw);
      await forwardToPeer(io, socket, payload.roomId, "signal:ice-candidate", payload);
    } catch (err) {
      logger.debug({ err }, "signal:ice-candidate dropped");
    }
  });

  // ---- Room ready ----
  socket.on("room:ready", async (raw) => {
    try {
      const { roomId } = RoomReadyPayload.parse(raw);
      const room = await getRoom(roomId);
      if (!room || (room.userA !== socket.id && room.userB !== socket.id)) return;
      // Mark the room as having achieved peer connectivity. The teardown
      // timer in onPair() checks this flag and only kills rooms that never
      // got ready.
      await markRoomReady(roomId);
    } catch {
      /* ignore */
    }
  });

  // ---- Skip / leave ----
  socket.on("room:skip", async (raw, ack) => {
    try {
      const { roomId } = RoomSkipPayload.parse(raw);

      // Rate limit skips
      const rl = await rateLimit("skip", userId, RATE_LIMIT_SKIPS_PER_MIN, 60);
      if (!rl.allowed) {
        return ack({ ok: false, error: "Slow down — too many skips" });
      }

      await teardownRoom(io, roomId, "you_skip", { skipperUserId: userId });
      ack({ ok: true });
    } catch (err) {
      logger.warn({ err }, "room:skip failed");
      ack({ ok: false, error: "Invalid room:skip" });
    }
  });

  socket.on("room:leave", async (raw) => {
    try {
      const { roomId } = RoomReadyPayload.parse(raw);
      await teardownRoom(io, roomId, "you_skip", { skipperUserId: userId, leaving: true });
    } catch (err) {
      logger.debug({ err }, "room:leave dropped");
    }
  });

  // ---- Chat ----
  socket.on("chat:message", async (raw, ack) => {
    try {
      const payload = ChatMessagePayload.parse(raw);
      const rl = await rateLimit("chat", userId, RATE_LIMIT_CHAT_PER_MIN, 60);
      if (!rl.allowed) return ack({ ok: false, error: "Too many messages" });

      const ts = Date.now();
      await forwardToPeer(io, socket, payload.roomId, "chat:message", {
        roomId: payload.roomId,
        from: "peer",
        text: payload.text,
        ts,
      });
      ack({ ok: true, ts });
    } catch (err) {
      ack({ ok: false, error: "Invalid chat:message" });
    }
  });

  socket.on("chat:typing", async (raw) => {
    try {
      const payload = raw as { roomId: string; typing: boolean };
      if (!payload?.roomId) return;
      await forwardToPeer(io, socket, payload.roomId, "chat:typing", payload);
    } catch {
      /* ignore */
    }
  });

  // ---- Report ----
  socket.on("report:flag", async (raw, ack) => {
    try {
      const payload = ReportFlagPayload.parse(raw);
      const rl = await rateLimit("report", userId, RATE_LIMIT_REPORTS_PER_HOUR, 3600);
      if (!rl.allowed) return ack({ ok: false, error: "Too many reports" });

      const room = await getRoom(payload.roomId);
      if (!room || (room.userAId !== userId && room.userBId !== userId)) {
        return ack({ ok: false, error: "Not in that room" });
      }
      const reporteeId = room.userAId === userId ? room.userBId : room.userAId;

      const result = await persistReport({
        reporterId: userId,
        reporteeId,
        sessionId: payload.roomId,
        category: payload.category,
        evidenceFrameBase64: payload.evidenceFrameBase64,
      });

      if (!result) return ack({ ok: false, error: "Report failed" });
      ack({ ok: true, reportId: result.reportId });
    } catch (err) {
      logger.warn({ err }, "report:flag failed");
      ack({ ok: false, error: "Invalid report" });
    }
  });

  // ---- Heartbeat (for presence Hash refresh) ----
  socket.on("presence:heartbeat", async () => {
    await redis.expire(`presence:state:${userId}`, 600).catch(() => {});
  });

  // ---- Disconnect ----
  socket.on("disconnect", async (reason) => {
    logger.info({ userId, reason }, "socket disconnected");
    const sd = socket.data as SocketData & { entryId?: string; _shadowInterval?: NodeJS.Timeout };
    if (sd._shadowInterval) clearInterval(sd._shadowInterval);
    await removeUserFromAllQueues(userId, sd.entryId).catch(() => {});

    if (socket.data.roomId) {
      await teardownRoom(io, socket.data.roomId, "peer_left", { skipperUserId: userId });
    }

    await redis.srem(`instance:${env.INSTANCE_ID}:sockets`, socket.id).catch(() => {});
  });
}

// -----------------------------------------------------------------------------
// Pairing — called by matchmaker when two entries are matched
// -----------------------------------------------------------------------------

async function onPair(io: IO, a: QueueEntry, b: QueueEntry): Promise<void> {
  const sockA = io.sockets.sockets.get(a.socketId);
  const sockB = io.sockets.sockets.get(b.socketId);

  // If either socket is gone, abort and re-queue the survivor
  if (!sockA || !sockB) {
    if (sockA) await safeRequeue(io, sockA, a);
    if (sockB) await safeRequeue(io, sockB, b);
    return;
  }

  // Cross-instance forward via redis-adapter happens automatically; our access
  // to `sockets.get` only works on this instance. For cross-instance pairing we
  // would need to send the room metadata via Redis pub/sub. For MVP we accept
  // that pairs only form within the same instance most of the time, and rely
  // on the redis-adapter for ACK/forward of subsequent events.
  // (Hardened cross-instance pair routing is a Phase 2 enhancement.)

  const roomId = newRoomId();
  const initiatorSocketId = a.socketId; // arbitrary — A is initiator

  const sessionId = roomId;

  const room: ActiveRoom = {
    roomId,
    userA: a.socketId,
    userB: b.socketId,
    userAId: a.userId,
    userBId: b.userId,
    startedAt: Date.now(),
    initiator: initiatorSocketId,
    modality: a.modality,
    matchedVia:
      a.interests.find((i) => b.interests.includes(i))
        ? `interest:${a.interests.find((i) => b.interests.includes(i))}`
        : "random",
  };
  await persistRoom(room);

  await sockA.join(roomId);
  await sockB.join(roomId);
  sockA.data.roomId = roomId;
  sockB.data.roomId = roomId;

  // Mint TURN credentials (per-user)
  const [iceA, iceB] = await Promise.all([
    mintTurnCredentials(a.userId, a.region),
    mintTurnCredentials(b.userId, b.region),
  ]);

  const overlap = a.interests.filter((i) => b.interests.includes(i));

  sockA.emit("match:found", {
    roomId,
    initiator: true,
    peer: {
      userId: b.userId,
      country: b.country,
      verifiedLabel: b.verifiedLabel,
      verified: b.verified,
      interests: overlap,
    },
    matchedVia: room.matchedVia,
    iceServers: iceA?.iceServers ?? [{ urls: env.PUBLIC_STUN_URLS }],
  });

  sockB.emit("match:found", {
    roomId,
    initiator: false,
    peer: {
      userId: a.userId,
      country: a.country,
      verifiedLabel: a.verifiedLabel,
      verified: a.verified,
      interests: overlap,
    },
    matchedVia: room.matchedVia,
    iceServers: iceB?.iceServers ?? [{ urls: env.PUBLIC_STUN_URLS }],
  });

  // Persist session row in Postgres (via API)
  await persistSessionStart({
    sessionId,
    userAId: a.userId,
    userBId: b.userId,
    modality: a.modality,
    matchedVia: room.matchedVia,
  });

  // Auto-tear-down ONLY if neither peer signaled room:ready in time.
  // This is our "WebRTC failed to connect" safety net — it must NOT
  // tear down healthy long-lived sessions.
  setTimeout(async () => {
    const stillThere = await getRoom(roomId);
    if (!stillThere) return;
    if (stillThere.readyAt) return; // healthy session, leave alone
    logger.warn({ roomId }, "room not ready in time, tearing down");
    await teardownRoom(io, roomId, "system", { skipperUserId: "system" });
  }, ROOM_READY_TIMEOUT_MS);

  // -------------------------------------------------------------------------
  // FREE-FILTER 18-SECOND TIMER
  // If either peer joined with a non-"any" gender filter AND was NOT premium,
  // we enforce a server-side hard cap at 18s. This prevents free users from
  // farming the filter via client tampering. The timer fires only after
  // room:ready is observed (so we don't double-tear-down with the readiness
  // safety net above).
  // -------------------------------------------------------------------------
  const aFreeFilter = a.filters?.gender && a.filters.gender !== "any" && !a.premium;
  const bFreeFilter = b.filters?.gender && b.filters.gender !== "any" && !b.premium;
  if (aFreeFilter || bFreeFilter) {
    const startTime = Date.now();
    const FREE_FILTER_MS = 18_000;
    const checkInterval = setInterval(async () => {
      const r = await getRoom(roomId);
      if (!r) {
        clearInterval(checkInterval);
        return;
      }
      // Only count from when WebRTC actually connected
      const elapsed = r.readyAt ? Date.now() - r.readyAt : 0;
      if (elapsed >= FREE_FILTER_MS) {
        clearInterval(checkInterval);
        logger.info({ roomId, elapsed }, "free-filter cap hit, tearing down");
        await teardownRoom(io, roomId, "system", { skipperUserId: "system" });
      }
      // Don't loop forever
      if (Date.now() - startTime > 5 * 60_000) {
        clearInterval(checkInterval);
      }
    }, 500);
  }

  logger.info(
    { roomId, a: a.userId, b: b.userId, matchedVia: room.matchedVia },
    "pair created",
  );
}

async function safeRequeue(_io: IO, _socket: IOSocket, entry: QueueEntry): Promise<void> {
  await addToQueue({ ...entry, joinedAt: Date.now() }).catch(() => {});
}

// -----------------------------------------------------------------------------
// Forwarding helper
// -----------------------------------------------------------------------------

async function forwardToPeer(
  io: IO,
  fromSocket: IOSocket,
  roomId: string,
  event: keyof ServerToClientEvents,
  payload: unknown,
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;
  // Drop unauthorized signaling
  if (room.userA !== fromSocket.id && room.userB !== fromSocket.id) return;

  const peerSocketId = room.userA === fromSocket.id ? room.userB : room.userA;
  // io.to(peerSocketId) works across instances thanks to redis-adapter
  io.to(peerSocketId).emit(event as keyof ServerToClientEvents, payload as never);
}

// -----------------------------------------------------------------------------
// Teardown
// -----------------------------------------------------------------------------

async function teardownRoom(
  io: IO,
  roomId: string,
  reason: "you_skip" | "peer_skip" | "peer_left" | "moderator" | "system" | "report",
  ctx: { skipperUserId: string; leaving?: boolean },
): Promise<void> {
  const room = await endRoom(roomId);
  if (!room) return;

  const duration = Math.floor((Date.now() - room.startedAt) / 1000);

  for (const sid of [room.userA, room.userB]) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;

    const isSkipper = s.data.userId === ctx.skipperUserId;
    const reasonForThisSocket: typeof reason =
      reason === "you_skip"
        ? isSkipper
          ? "you_skip"
          : "peer_skip"
        : reason === "peer_left" && isSkipper
        ? "peer_left"
        : reason;

    s.emit("room:ended", { roomId, reason: reasonForThisSocket, duration });
    s.leave(roomId);
    s.data.roomId = undefined;

    // Mutual cooldown: skipped peers should not re-match for a few minutes
    const sd = s.data as SocketData & { entry?: QueueEntry };
    if (sd.entry) {
      const otherUserId = s.data.userId === room.userAId ? room.userBId : room.userAId;
      sd.entry = {
        ...sd.entry,
        cooldownUserIds: [otherUserId, ...(sd.entry.cooldownUserIds ?? [])].slice(0, COOLDOWN_LIMIT),
      };
    }
  }

  await persistSessionEnd({
    sessionId: roomId,
    endedReason: reason,
    iceRelayUsed: false, // TODO: poll WebRTC stats client-side and report back
  });

  logger.info({ roomId, reason, duration }, "room torn down");
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function estimateEta(queueDepth: number, position: number): number {
  // crude heuristic: ~2 pairs/sec at low load, scale with depth
  const pairsPerSec = Math.max(2, Math.min(20, queueDepth / 5));
  return Math.max(1, Math.ceil(position / pairsPerSec));
}
