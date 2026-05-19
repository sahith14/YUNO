// Typed Socket.IO event contract. Both client and server import these.

import type { Modality, ReportCategory, MatchPeerInfo, IceServerConfig, QueueFilters } from "./types.js";

// Minimal local mirror of the DOM RTCIceCandidateInit so this file works
// in Node-only environments (signaling/api) without pulling in the DOM lib.
export interface IceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// =============================================================================
// CLIENT → SERVER
// =============================================================================

export interface ClientToServerEvents {
  "queue:join": (
    payload: {
      modality: Modality;
      interests: string[];
      filters?: QueueFilters;
      region: string;
    },
    ack: (res: { ok: true; queuePosition: number; etaSeconds?: number } | { ok: false; error: string }) => void,
  ) => void;

  "queue:leave": (ack: (res: { ok: true }) => void) => void;

  "signal:offer": (payload: { roomId: string; sdp: string }) => void;
  "signal:answer": (payload: { roomId: string; sdp: string }) => void;
  "signal:ice-candidate": (payload: { roomId: string; candidate: IceCandidateInit }) => void;

  "room:ready": (payload: { roomId: string }) => void;

  "room:skip": (
    payload: { roomId: string; reason?: "skip" | "issue" },
    ack: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;

  "room:leave": (payload: { roomId: string }) => void;

  "chat:message": (
    payload: { roomId: string; text: string },
    ack: (res: { ok: true; ts: number } | { ok: false; error: string }) => void,
  ) => void;

  "chat:typing": (payload: { roomId: string; typing: boolean }) => void;

  "report:flag": (
    payload: {
      roomId: string;
      category: ReportCategory;
      evidenceFrameBase64?: string;
    },
    ack: (res: { ok: true; reportId: string } | { ok: false; error: string }) => void,
  ) => void;

  "presence:heartbeat": () => void;
}

// =============================================================================
// SERVER → CLIENT
// =============================================================================

export interface ServerToClientEvents {
  connected: (payload: {
    userId: string;
    rateLimit: { skipsPerMin: number; reportsPerHour: number };
    iceTtlSeconds: number;
  }) => void;

  "queue:waiting": (payload: { position: number; etaSeconds: number; queueDepth: number }) => void;

  "match:found": (payload: {
    roomId: string;
    initiator: boolean;
    peer: MatchPeerInfo;
    matchedVia: string;
    iceServers: IceServerConfig[];
  }) => void;

  "signal:offer": (payload: { roomId: string; sdp: string }) => void;
  "signal:answer": (payload: { roomId: string; sdp: string }) => void;
  "signal:ice-candidate": (payload: { roomId: string; candidate: IceCandidateInit }) => void;

  "room:ended": (payload: {
    roomId: string;
    reason: "peer_skip" | "peer_left" | "you_skip" | "moderator" | "system" | "report";
    duration: number;
  }) => void;

  "chat:message": (payload: { roomId: string; from: "peer"; text: string; ts: number }) => void;
  "chat:typing": (payload: { roomId: string; typing: boolean }) => void;

  error: (payload: {
    code: "BANNED" | "SHADOW_BAN" | "RATE_LIMITED" | "INTERNAL" | "INVALID_INPUT" | "FORBIDDEN";
    message: string;
    until?: string;
  }) => void;

  "system:notice": (payload: { severity: "info" | "warning"; message: string }) => void;
}

// =============================================================================
// SOCKET.IO INTER-INSTANCE EVENTS (used by signaling internals)
// =============================================================================

export interface InterServerEvents {
  ping: () => void;
}

// Per-socket data carried server-side after auth.
export interface SocketData {
  userId: string;
  kind: "guest" | "user" | "admin";
  premium: boolean;
  verified: boolean;
  verifiedLabel?: "female" | "male" | "non-binary";
  shadowBanned: boolean;
  reputationScore: number;
  region: string;
  /** Currently joined room id, if any. */
  roomId?: string;
  /** Whether the user is currently in the matchmaking queue. */
  inQueue?: boolean;
  /** Modality of the current queue/room. */
  modality?: Modality;
  /** Country reported by IP geolocation (ISO-2). */
  country?: string;
}
