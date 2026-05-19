// ICE / TURN credential helpers, used by API (issuance) and clients (consumption).

import type { IceServerConfig } from "./types.js";

export interface BuildTurnCredentialsArgs {
  /** TURN host (e.g., "turn.yuno.app") */
  host: string;
  /** UDP/TCP port (default 3478) */
  port?: number;
  /** TLS port for TURNS (default 5349) */
  tlsPort?: number;
  /** Realm — used by Coturn but not in URLs */
  realm?: string;
  /** Shared secret matching Coturn's static-auth-secret */
  sharedSecret: string;
  /** User identity — included in TURN username for traceability */
  userId: string;
  /** Lifetime of credential in seconds */
  ttlSeconds: number;
  /** Optional list of public STUN URLs to include */
  stunUrls?: string[];
}

/**
 * Generates a time-limited TURN credential per the standard scheme:
 *   username = "<unix-expiry>:<userId>"
 *   credential = base64(HMAC_SHA1(sharedSecret, username))
 *
 * Coturn must be configured with `use-auth-secret` and `static-auth-secret = sharedSecret`.
 *
 * Works in Node (using built-in crypto) — DO NOT call from the browser.
 */
export async function buildTurnCredentials(
  args: BuildTurnCredentialsArgs,
): Promise<{ servers: IceServerConfig[]; ttlSeconds: number }> {
  const port = args.port ?? 3478;
  const tlsPort = args.tlsPort ?? 5349;
  const expiry = Math.floor(Date.now() / 1000) + args.ttlSeconds;
  const username = `${expiry}:${args.userId}`;

  // Use Node's crypto via dynamic import to keep this file environment-agnostic
  const { createHmac } = await import("node:crypto");
  const credential = createHmac("sha1", args.sharedSecret).update(username).digest("base64");

  const servers: IceServerConfig[] = [];

  // STUN servers (free)
  const stuns = args.stunUrls ?? ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];
  servers.push({ urls: stuns });

  // Add our own STUN endpoint on Coturn
  servers.push({ urls: [`stun:${args.host}:${port}`] });

  // TURN over UDP
  servers.push({
    urls: [`turn:${args.host}:${port}?transport=udp`],
    username,
    credential,
  });
  // TURN over TCP
  servers.push({
    urls: [`turn:${args.host}:${port}?transport=tcp`],
    username,
    credential,
  });
  // TURNS over TLS
  servers.push({
    urls: [`turns:${args.host}:${tlsPort}?transport=tcp`],
    username,
    credential,
  });

  return { servers, ttlSeconds: args.ttlSeconds };
}

/**
 * Default ICE config for clients in dev (no TURN, just public STUN).
 * Production clients should always fetch from /ice/credentials.
 */
export function publicStunFallback(extraUrls: string[] = []): IceServerConfig[] {
  return [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        ...extraUrls,
      ],
    },
  ];
}
