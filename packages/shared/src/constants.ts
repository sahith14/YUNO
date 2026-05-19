// Shared constants used by all apps. Keep ENV-config in env files; this is for
// values that should never differ between environments.

// ----- Queue / matching -----
export const QUEUE_TICK_MS = 250;                  // matchmaker loop interval
export const QUEUE_MAX_WAIT_MS = 60_000;           // hard cap before retry suggestions
export const QUEUE_REPORT_RETRY_AFTER_MS = 15_000;
export const ROOM_READY_TIMEOUT_MS = 25_000;       // either peer must signal ready
export const ROOM_HEARTBEAT_MS = 25_000;

// ----- Rate limits (also enforced server-side via Redis) -----
export const RATE_LIMIT_SKIPS_PER_MIN = 30;
export const RATE_LIMIT_REPORTS_PER_HOUR = 10;
export const RATE_LIMIT_CHAT_PER_MIN = 60;
export const RATE_LIMIT_GUEST_AUTH_PER_HOUR = 20;

// ----- WebRTC -----
export const VIDEO_CONSTRAINTS_SD = {
  width: { ideal: 640, max: 854 },
  height: { ideal: 480, max: 480 },
  frameRate: { ideal: 24, max: 30 },
} as const;

export const VIDEO_CONSTRAINTS_HD = {
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 720 },
  frameRate: { ideal: 30, max: 30 },
} as const;

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
} as const;

export const VIDEO_BITRATE_SD_KBPS = 800;
export const VIDEO_BITRATE_HD_KBPS = 1500;
export const AUDIO_BITRATE_KBPS = 32;

// ----- Reputation -----
export const REPUTATION_DEFAULT = 1000;
export const REPUTATION_MIN = 0;
export const REPUTATION_MAX = 2000;
export const REPUTATION_QUARANTINE_THRESHOLD = 200;

// ----- Limits -----
export const INTERESTS_MAX_FREE = 1;
export const INTERESTS_MAX_PREMIUM = 5;
export const REPORT_NOTE_MAX_CHARS = 500;
export const CHAT_MESSAGE_MAX_CHARS = 500;
export const DISPLAY_HANDLE_MAX_CHARS = 24;

// ----- Redis keys (single source of truth so signaling and api can't drift) -----
export const REDIS_KEYS = {
  // matchmaking sorted set: score = priority, member = socketId
  queue: (modality: "video" | "audio" | "text") => `mm:queue:${modality}`,
  // hash of socketId → JSON queue entry
  queueEntries: "mm:entries",
  // user → current room id
  userRoom: (userId: string) => `presence:room:${userId}`,
  // user → state ("queued" | "in_call" | "idle")
  userState: (userId: string) => `presence:state:${userId}`,
  // active set of socket ids per app instance, used for graceful shutdown
  instanceSockets: (instanceId: string) => `instance:${instanceId}:sockets`,
  // rate limit counters
  rate: (kind: string, id: string) => `rl:${kind}:${id}`,
  // jwt deny-list (blacklisted tokens, by jti)
  jwtDeny: (jti: string) => `jwt:deny:${jti}`,
  // ban cache (mirrors users.ban_until for hot-path)
  banCache: (userId: string) => `ban:${userId}`,
  // reputation cache
  repCache: (userId: string) => `rep:${userId}`,
} as const;

// ----- Error codes -----
export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  BANNED: "BANNED",
  SHADOW_BAN: "SHADOW_BAN",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ----- Event names (mirrored in events.ts via TS types) -----
export const SOCKET_EVENTS = {
  // c→s
  QUEUE_JOIN: "queue:join",
  QUEUE_LEAVE: "queue:leave",
  SIGNAL_OFFER: "signal:offer",
  SIGNAL_ANSWER: "signal:answer",
  SIGNAL_ICE: "signal:ice-candidate",
  ROOM_READY: "room:ready",
  ROOM_SKIP: "room:skip",
  ROOM_LEAVE: "room:leave",
  CHAT_MESSAGE: "chat:message",
  CHAT_TYPING: "chat:typing",
  REPORT_FLAG: "report:flag",
  PRESENCE_HEARTBEAT: "presence:heartbeat",
  // s→c
  CONNECTED: "connected",
  QUEUE_WAITING: "queue:waiting",
  MATCH_FOUND: "match:found",
  ROOM_ENDED: "room:ended",
  ERROR: "error",
  SYSTEM_NOTICE: "system:notice",
} as const;
