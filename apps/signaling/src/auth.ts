// JWT verification for Socket.IO handshake. Sync to keep middleware fast.

import jwt from "jsonwebtoken";
import { env } from "./env.js";
import type { JwtClaims } from "@yuno/shared";

export function verifyJwt(token: string): JwtClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string") throw new Error("invalid token shape");
  // Minimal shape sanity checks
  const c = decoded as JwtClaims;
  if (!c.sub || !c.kind) throw new Error("invalid token claims");
  return c;
}
