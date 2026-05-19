// Service-to-service helper to call the API server (e.g., to mint TURN
// credentials, persist reports). Uses an internal shared secret header so the
// API can trust signaling's calls without doing per-user auth round-trips.

import { env } from "./env.js";
import { logger } from "./logger.js";
import type { IceServerConfig } from "@yuno/shared";

async function postJson<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${env.API_PUBLIC_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": env.INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.warn({ path, status: res.status }, "api call failed");
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.error({ err, path }, "api call threw");
    return null;
  }
}

export async function mintTurnCredentials(
  userId: string,
  regionHint?: string,
): Promise<{ iceServers: IceServerConfig[]; ttlSeconds: number } | null> {
  return postJson("/internal/ice/mint", { userId, regionHint });
}

export async function persistReport(payload: {
  reporterId: string;
  reporteeId: string;
  sessionId: string;
  category: string;
  evidenceFrameBase64?: string;
}): Promise<{ reportId: string } | null> {
  return postJson("/internal/reports", payload);
}

export async function persistSessionStart(payload: {
  sessionId: string;
  userAId: string;
  userBId: string;
  modality: string;
  matchedVia: string;
}): Promise<void> {
  await postJson("/internal/sessions/start", payload);
}

export async function persistSessionEnd(payload: {
  sessionId: string;
  endedReason: string;
  iceRelayUsed?: boolean;
}): Promise<void> {
  await postJson("/internal/sessions/end", payload);
}
