import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";
import type { JwtClaims } from "@yuno/shared";

export interface SignArgs {
  userId: string;
  kind: "guest" | "user" | "admin";
  premium: boolean;
  verified: boolean;
}

export function signJwt(args: SignArgs): { token: string; expiresAt: string } {
  const ttl = args.kind === "guest" ? env.JWT_GUEST_TTL : env.JWT_USER_TTL;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const claims: JwtClaims = {
    sub: args.userId,
    kind: args.kind,
    premium: args.premium,
    verified: args.verified,
    jti: randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp,
  };
  const token = jwt.sign(claims, env.JWT_SECRET, { algorithm: "HS256" });
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyJwt(token: string): JwtClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string") throw new Error("invalid token");
  return decoded as JwtClaims;
}
