// Centralized environment loading. Fail-fast on missing required vars.

import { randomUUID } from "node:crypto";

function need(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`${name} must be a number`);
  return n;
}

export const env = {
  PORT: num("SIGNALING_PORT", 4001),
  HOST: process.env.SIGNALING_HOST ?? "0.0.0.0",
  REDIS_URL: need("REDIS_URL", "redis://localhost:6379"),
  JWT_SECRET: need("JWT_SECRET", "dev-only-replace-me-with-64-bytes-of-random-data"),
  INTERNAL_SECRET: need("INTERNAL_SECRET", "change-me-internal-secret"),
  API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
  WEB_PUBLIC_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  TURN_HOST: process.env.TURN_HOST ?? "",
  TURN_PORT: num("TURN_PORT", 3478),
  TURN_TLS_PORT: num("TURN_TLS_PORT", 5349),
  TURN_REALM: process.env.TURN_REALM ?? "yuno.local",
  TURN_SHARED_SECRET: process.env.TURN_SHARED_SECRET ?? "",
  TURN_CRED_TTL: num("TURN_CRED_TTL", 3600),
  PUBLIC_STUN_URLS: (process.env.NEXT_PUBLIC_STUN_URLS ?? "stun:stun.l.google.com:19302")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  INSTANCE_ID: process.env.SIGNALING_INSTANCE_ID ?? `sig-${randomUUID().slice(0, 8)}`,
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
